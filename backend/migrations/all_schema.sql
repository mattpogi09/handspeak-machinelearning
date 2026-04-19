-- HandSpeak fresh migration for Supabase Postgres
-- Run this in the Supabase SQL editor or your SQL client.
-- This acts like migrate:fresh + seed for the current backend schema.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop all tables if they exist to start fresh
DROP TABLE IF EXISTS island_mastery CASCADE;
DROP TABLE IF EXISTS conversation_chain_sessions CASCADE;
DROP TABLE IF EXISTS conversation_attempts CASCADE;
DROP TABLE IF EXISTS conversation_sessions CASCADE;
DROP TABLE IF EXISTS gesture_verifications CASCADE;
DROP TABLE IF EXISTS study_progress CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- 1. App Users
CREATE TABLE app_users (
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

-- 2. Study Progress
CREATE TABLE study_progress (
    user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Gesture Verifications
CREATE TABLE gesture_verifications (
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

-- 4. Conversation Sessions
CREATE TABLE conversation_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    island_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    prompt_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT conversation_sessions_status_chk
        CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX conversation_sessions_user_idx
    ON conversation_sessions (user_id);

CREATE INDEX conversation_sessions_user_island_idx
    ON conversation_sessions (user_id, island_id);

-- 5. Conversation Attempts (Includes Phase 2 response types)
CREATE TABLE conversation_attempts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    prompt_id TEXT NOT NULL,
    expected_word TEXT NOT NULL,
    matched_word TEXT,
    is_correct BOOLEAN NOT NULL,
    confidence NUMERIC(8, 6),
    response_type_expected TEXT,
    response_type_actual TEXT,
    type_correct BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conversation_attempts_session_idx
    ON conversation_attempts (session_id);

CREATE INDEX conversation_attempts_user_idx
    ON conversation_attempts (user_id);

-- 6. Conversation Chain Sessions (Phase 3)
CREATE TABLE conversation_chain_sessions (
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

CREATE INDEX chain_sessions_user_idx
    ON conversation_chain_sessions (user_id);

CREATE INDEX chain_sessions_user_island_idx
    ON conversation_chain_sessions (user_id, island_id);

-- 7. Island Mastery (Phase 4)
CREATE TABLE island_mastery (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    island_id TEXT NOT NULL,
    
    -- Four-axis mastery model (Scores out of 100)
    comprehension_score INT NOT NULL DEFAULT 0,
    accuracy_score INT NOT NULL DEFAULT 0,
    timing_score INT NOT NULL DEFAULT 0,
    repair_score INT NOT NULL DEFAULT 0,
    
    -- State and Completion
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, island_id)
);

CREATE INDEX island_mastery_user_idx ON island_mastery(user_id);

-- Trigger to auto-update updated_at for Mastery
CREATE OR REPLACE FUNCTION update_mastery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mastery ON island_mastery;
CREATE TRIGGER trigger_update_mastery
BEFORE UPDATE ON island_mastery
FOR EACH ROW EXECUTE PROCEDURE update_mastery_timestamp();

-- 8. Seed Data
INSERT INTO app_users (email, password_hash)
VALUES (
    'earlkian8@gmail.com',
    crypt('Password-12345', gen_salt('bf', 12))
);

INSERT INTO study_progress (user_id, progress)
SELECT id, '{}'::jsonb
FROM app_users
WHERE email = 'earlkian8@gmail.com';

COMMIT;
