from __future__ import annotations
"""Database persistence layer for HandSpeak backend.

This module centralizes Supabase Postgres reads/writes used by auth, study,
and gesture-verification logging routes.
"""

from functools import lru_cache
from threading import Lock
from typing import Any
import os

import bcrypt
from psycopg import connect
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row
from psycopg.types.json import Json

from logging_config import get_logger


logger = get_logger("handspeak.services.supabase_store")
MAX_BCRYPT_PASSWORD_BYTES = 72


def _validate_password_length(password: str) -> None:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError(
            f"Password must be at most {MAX_BCRYPT_PASSWORD_BYTES} bytes in UTF-8."
        )


def _hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


class SupabaseStore:
    """Small repository wrapper around psycopg for app persistence."""

    def __init__(self, db_url: str) -> None:
        self.db_url = db_url.strip()
        self._schema_ready = False
        self._schema_lock = Lock()

    def _connect(self):
        if not self.db_url:
            raise RuntimeError("DB_URL is not configured")

        connect_timeout = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
        sslmode = os.getenv("DB_SSLMODE", "require")

        return connect(
            self.db_url,
            row_factory=dict_row,
            connect_timeout=connect_timeout,
            sslmode=sslmode,
        )

    def ensure_schema(self) -> None:
        """Create required tables when they do not exist."""
        if self._schema_ready:
            return

        with self._schema_lock:
            if self._schema_ready:
                return

            schema_sql = """
            CREATE TABLE IF NOT EXISTS app_users (
                id BIGSERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                middle_name TEXT,
                last_name TEXT,
                nickname TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS study_progress (
                user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
                progress JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS gesture_verifications (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
                target_word TEXT,
                model_type TEXT NOT NULL,
                threshold NUMERIC(5, 3),
                is_match BOOLEAN NOT NULL,
                similarity NUMERIC(8, 6),
                target_similarity NUMERIC(8, 6),
                top_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
                frames JSONB NOT NULL DEFAULT '[]'::jsonb,
                image_data TEXT,
                request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS conversation_sessions (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                island_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'in_progress',
                prompt_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                summary JSONB NOT NULL DEFAULT '{}'::jsonb,
                started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            );

            CREATE INDEX IF NOT EXISTS conversation_sessions_user_idx
                ON conversation_sessions(user_id);

            CREATE TABLE IF NOT EXISTS conversation_attempts (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
                user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
                prompt_id TEXT NOT NULL,
                expected_word TEXT NOT NULL,
                matched_word TEXT,
                is_correct BOOLEAN NOT NULL,
                confidence NUMERIC(8, 6),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS conversation_attempts_session_idx
                ON conversation_attempts(session_id);

            CREATE TABLE IF NOT EXISTS practice_signs (
                kind TEXT NOT NULL,
                sign_id TEXT NOT NULL,
                order_index INT NOT NULL,
                payload JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (kind, sign_id)
            );

            CREATE INDEX IF NOT EXISTS practice_signs_kind_order_idx
                ON practice_signs(kind, order_index);

            -- Phase 2: response type columns (idempotent)
            ALTER TABLE conversation_attempts
                ADD COLUMN IF NOT EXISTS response_type_expected TEXT;
            ALTER TABLE conversation_attempts
                ADD COLUMN IF NOT EXISTS response_type_actual TEXT;
            ALTER TABLE conversation_attempts
                ADD COLUMN IF NOT EXISTS type_correct BOOLEAN;

            -- Phase 3: multi-turn chain sessions
            CREATE TABLE IF NOT EXISTS conversation_chain_sessions (
                id              BIGSERIAL   PRIMARY KEY,
                user_id         BIGINT      NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                island_id       TEXT        NOT NULL,
                chain_id        TEXT        NOT NULL,
                status          TEXT        NOT NULL DEFAULT 'in_progress',
                current_turn    INT         NOT NULL DEFAULT 0,
                turns_snapshot  JSONB       NOT NULL DEFAULT '[]'::jsonb,
                transcript      JSONB       NOT NULL DEFAULT '[]'::jsonb,
                summary         JSONB       NOT NULL DEFAULT '{}'::jsonb,
                started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at    TIMESTAMPTZ,
                CONSTRAINT chain_sessions_status_chk
                    CHECK (status IN ('in_progress', 'completed', 'abandoned'))
            );

            CREATE INDEX IF NOT EXISTS chain_sessions_user_idx
                ON conversation_chain_sessions (user_id);
            """

            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(schema_sql)
                    self._seed_practice_signs(cursor)
                connection.commit()

            self._schema_ready = True
            logger.info("database_schema_ready")

    def _fetchone(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        self.ensure_schema()
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                row = cursor.fetchone()
                connection.commit()
                return row

    def _fetchall(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        self.ensure_schema()
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                rows = cursor.fetchall()
                connection.commit()
                return rows

    def _execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        self.ensure_schema()
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                connection.commit()

    def _seed_practice_signs(self, cursor) -> None:
        from data.asl_data import ALL_PRACTICE_LETTERS

        number_payloads = [
            {
                "kind": "number",
                "sign_id": str(value),
                "order_index": value,
                "payload": {
                    "id": str(value),
                    "label": str(value),
                    "type": "number",
                    "description": f"Form the number '{value}' with your hand.",
                    "tip": "Keep your hand steady and clearly visible.",
                    "diagramUrl": None,
                },
            }
            for value in range(10)
        ]
        alphabet_payloads = [
            {
                "kind": "alphabet",
                "sign_id": entry["id"],
                "order_index": int(entry.get("order", index + 1)),
                "payload": {
                    **entry,
                    "type": "alphabet",
                },
            }
            for index, entry in enumerate(ALL_PRACTICE_LETTERS)
        ]

        for row in alphabet_payloads + number_payloads:
            cursor.execute(
                """
                INSERT INTO practice_signs (kind, sign_id, order_index, payload, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (kind, sign_id)
                DO UPDATE SET order_index = EXCLUDED.order_index,
                              payload = EXCLUDED.payload,
                              updated_at = NOW()
                """,
                (row["kind"], row["sign_id"], row["order_index"], Json(row["payload"])),
            )

    @staticmethod
    def _format_user(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None

        profile_complete = all([row.get("first_name"), row.get("last_name"), row.get("nickname")])
        return {
            "id": int(row["id"]),
            "email": row["email"],
            "first_name": row.get("first_name"),
            "middle_name": row.get("middle_name"),
            "last_name": row.get("last_name"),
            "nickname": row.get("nickname"),
            "profile_complete": profile_complete,
        }

    def create_user(self, email: str, password: str) -> dict[str, Any]:
        _validate_password_length(password)
        password_hash = _hash_password(password)
        query = """
            INSERT INTO app_users (email, password_hash)
            VALUES (%s, %s)
            RETURNING id, email, first_name, middle_name, last_name, nickname
        """

        try:
            row = self._fetchone(query, (email.strip().lower(), password_hash))
        except UniqueViolation as error:
            raise ValueError("Email already registered") from error

        return self._format_user(row)  # type: ignore[return-value]

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        query = """
            SELECT id, email, first_name, middle_name, last_name, nickname, password_hash
            FROM app_users
            WHERE email = %s
        """
        return self._fetchone(query, (email.strip().lower(),))

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        query = """
            SELECT id, email, first_name, middle_name, last_name, nickname, password_hash
            FROM app_users
            WHERE id = %s
        """
        return self._fetchone(query, (user_id,))

    def verify_credentials(self, email: str, password: str) -> dict[str, Any] | None:
        row = self.get_user_by_email(email)
        if not row:
            return None

        if not _verify_password(password, row["password_hash"]):
            return None

        return self._format_user(row)

    def update_profile(self, user_id: int, profile: dict[str, Any]) -> dict[str, Any]:
        query = """
            UPDATE app_users
            SET first_name = %s,
                middle_name = %s,
                last_name = %s,
                nickname = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, email, first_name, middle_name, last_name, nickname
        """
        row = self._fetchone(
            query,
            (
                profile.get("first_name"),
                profile.get("middle_name") or "",
                profile.get("last_name"),
                profile.get("nickname"),
                user_id,
            ),
        )
        if not row:
            raise LookupError("User not found")

        return self._format_user(row)  # type: ignore[return-value]

    def get_or_create_progress(self, user_id: int) -> dict[str, Any]:
        row = self._fetchone(
            "SELECT progress FROM study_progress WHERE user_id = %s",
            (user_id,),
        )
        if row:
            return row["progress"] or {}

        empty_progress: dict[str, Any] = {}
        self.save_progress(user_id, empty_progress)
        return empty_progress

    def save_progress(self, user_id: int, progress: dict[str, Any]) -> dict[str, Any]:
        query = """
            INSERT INTO study_progress (user_id, progress, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET progress = EXCLUDED.progress,
                          updated_at = NOW()
            RETURNING progress
        """
        row = self._fetchone(query, (user_id, Json(progress)))
        return row["progress"] if row else progress

    def get_practice_signs(self, kind: str) -> list[dict[str, Any]]:
        rows = self._fetchall(
            """
            SELECT payload
            FROM practice_signs
            WHERE kind = %s
            ORDER BY order_index ASC, sign_id ASC
            """,
            (kind,),
        )
        return [dict(row["payload"]) for row in rows]

    # ── Conversation sessions (Phase 1 Reply Quest) ──────────────────────
    def create_conversation_session(
        self,
        *,
        user_id: int,
        island_id: str,
        prompt_ids: list[str],
    ) -> dict[str, Any]:
        query = """
            INSERT INTO conversation_sessions (user_id, island_id, prompt_ids)
            VALUES (%s, %s, %s)
            RETURNING id, user_id, island_id, status, prompt_ids, summary, started_at, completed_at
        """
        row = self._fetchone(query, (user_id, island_id, Json(prompt_ids)))
        if not row:
            raise RuntimeError("Failed to create conversation session")
        return dict(row)

    def append_conversation_attempt(
        self,
        *,
        session_id: int,
        user_id: int | None,
        prompt_id: str,
        expected_word: str,
        matched_word: str | None,
        is_correct: bool,
        confidence: float | None,
        response_type_expected: str | None = None,
        response_type_actual: str | None = None,
        type_correct: bool | None = None,
    ) -> dict[str, Any]:
        query = """
            INSERT INTO conversation_attempts (
                session_id, user_id, prompt_id, expected_word,
                matched_word, is_correct, confidence,
                response_type_expected, response_type_actual, type_correct
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, session_id, prompt_id, expected_word, matched_word,
                      is_correct, confidence,
                      response_type_expected, response_type_actual, type_correct,
                      created_at
        """
        row = self._fetchone(
            query,
            (
                session_id, user_id, prompt_id, expected_word, matched_word,
                is_correct, confidence,
                response_type_expected, response_type_actual, type_correct,
            ),
        )
        if not row:
            raise RuntimeError("Failed to record conversation attempt")
        return dict(row)

    def get_conversation_session(self, session_id: int) -> dict[str, Any] | None:
        self.ensure_schema()
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, island_id, status, prompt_ids, summary,
                           started_at, completed_at
                    FROM conversation_sessions
                    WHERE id = %s
                    """,
                    (session_id,),
                )
                session_row = cursor.fetchone()
                if not session_row:
                    return None

                cursor.execute(
                    """
                    SELECT id, prompt_id, expected_word, matched_word,
                           is_correct, confidence,
                           response_type_expected, response_type_actual, type_correct,
                           created_at
                    FROM conversation_attempts
                    WHERE session_id = %s
                    ORDER BY id ASC
                    """,
                    (session_id,),
                )
                attempt_rows = cursor.fetchall()
                connection.commit()

        session = dict(session_row)
        session["attempts"] = [dict(row) for row in attempt_rows]
        return session

    def complete_conversation_session(
        self,
        session_id: int,
        summary: dict[str, Any],
    ) -> None:
        query = """
            UPDATE conversation_sessions
            SET status = 'completed',
                summary = %s,
                completed_at = NOW()
            WHERE id = %s
        """
        self._execute(query, (Json(summary), session_id))

    def update_user_conversation_progress(
        self,
        user_id: int,
        island_id: str,
        attempt_is_correct: bool,
        session_completed: bool,
        last_session_id: int | None,
    ) -> dict[str, Any]:
        """Merge per-island conversation counters into study_progress.progress JSONB."""
        progress = self.get_or_create_progress(user_id) or {}
        conversation = dict(progress.get("conversation") or {})
        islands = dict(conversation.get("islands") or {})
        island_state = dict(islands.get(island_id) or {})

        island_state["prompts_attempted"] = int(island_state.get("prompts_attempted", 0)) + 1
        if attempt_is_correct:
            island_state["prompts_correct"] = int(island_state.get("prompts_correct", 0)) + 1
        if session_completed:
            island_state["sessions_completed"] = int(island_state.get("sessions_completed", 0)) + 1
        if last_session_id is not None:
            island_state["last_session_id"] = int(last_session_id)

        islands[island_id] = island_state
        conversation["islands"] = islands
        progress = {**progress, "conversation": conversation}
        return self.save_progress(user_id, progress)

    # ── Multi-turn chain sessions (Phase 3) ──────────────────────────────
    def create_chain_session(
        self,
        *,
        user_id: int,
        island_id: str,
        chain_id: str,
        turns_snapshot: list[dict[str, Any]],
    ) -> dict[str, Any]:
        query = """
            INSERT INTO conversation_chain_sessions
                (user_id, island_id, chain_id, turns_snapshot)
            VALUES (%s, %s, %s, %s)
            RETURNING id, user_id, island_id, chain_id, status,
                      current_turn, turns_snapshot, transcript, summary,
                      started_at, completed_at
        """
        row = self._fetchone(query, (user_id, island_id, chain_id, Json(turns_snapshot)))
        if not row:
            raise RuntimeError("Failed to create chain session")
        return dict(row)

    def get_chain_session(self, chain_session_id: int) -> dict[str, Any] | None:
        row = self._fetchone(
            """
            SELECT id, user_id, island_id, chain_id, status,
                   current_turn, turns_snapshot, transcript, summary,
                   started_at, completed_at
            FROM conversation_chain_sessions
            WHERE id = %s
            """,
            (chain_session_id,),
        )
        return dict(row) if row else None

    def advance_chain_turn(
        self,
        chain_session_id: int,
        turn_entry: dict[str, Any],
        next_turn_index: int,
        is_complete: bool,
    ) -> dict[str, Any]:
        """Append a completed turn to transcript and advance current_turn."""
        new_status = "completed" if is_complete else "in_progress"
        query = """
            UPDATE conversation_chain_sessions
            SET transcript    = transcript || %s::jsonb,
                current_turn  = %s,
                status        = %s,
                completed_at  = CASE WHEN %s THEN NOW() ELSE completed_at END
            WHERE id = %s
            RETURNING id, current_turn, status, transcript, turns_snapshot, summary
        """
        import json as _json
        row = self._fetchone(
            query,
            (
                _json.dumps([turn_entry]),
                next_turn_index,
                new_status,
                is_complete,
                chain_session_id,
            ),
        )
        if not row:
            raise RuntimeError("Failed to advance chain turn")
        return dict(row)

    def complete_chain_session(
        self,
        chain_session_id: int,
        summary: dict[str, Any],
    ) -> None:
        self._execute(
            """
            UPDATE conversation_chain_sessions
            SET status = 'completed', summary = %s, completed_at = NOW()
            WHERE id = %s
            """,
            (Json(summary), chain_session_id),
        )

    def record_gesture_verification(
        self,
        *,
        user_id: int | None,
        target_word: str | None,
        model_type: str,
        threshold: float | None,
        is_match: bool,
        similarity: float | None,
        target_similarity: float | None,
        top_matches: list[dict[str, Any]],
        frames: list[str],
        image_data: str | None,
        request_payload: dict[str, Any],
        response_payload: dict[str, Any],
    ) -> None:
        query = """
            INSERT INTO gesture_verifications (
                user_id,
                target_word,
                model_type,
                threshold,
                is_match,
                similarity,
                target_similarity,
                top_matches,
                frames,
                image_data,
                request_payload,
                response_payload
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        self._execute(
            query,
            (
                user_id,
                target_word,
                model_type,
                threshold,
                is_match,
                similarity,
                target_similarity,
                Json(top_matches),
                Json(frames),
                image_data,
                Json(request_payload),
                Json(response_payload),
            ),
        )


@lru_cache(maxsize=1)
def get_store() -> SupabaseStore:
    """Return a process-level singleton store instance."""
    return SupabaseStore(os.getenv("DB_URL", ""))
