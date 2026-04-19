"""Conversation routes — Phases 1/2/3.

Delegates all gesture inference to the existing dynamic model path.
Phase 1: flat prompt sessions (Reply Quest).
Phase 2: response-type-aware scoring.
Phase 3: multi-turn conversation chains with coherence scoring.
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

from data.conversation_chains import get_chain, get_chains_for_island
from data.conversation_prompts import (
    get_prompt,
    get_prompts_for_island,
)
from data.response_types import (
    RESPONSE_TYPES,
    classify_word,
    get_mismatch_feedback,
)
from logging_config import get_logger
from models.schemas import GestureVerificationRequest
from routes.gesture import _verify_dynamic_internal
from services.supabase_store import get_store


router = APIRouter(prefix="/api/conversation", tags=["conversation"])
logger = get_logger("handspeak.routes.conversation")
store = get_store()


REPLY_QUEST_THRESHOLD = 0.40
REPLY_QUEST_TOP_K = 5


class SessionStartPayload(BaseModel):
    user_id: int
    island_id: str


class SessionSubmitPayload(BaseModel):
    session_id: int
    prompt_id: str
    user_id: Optional[int] = None
    frames: list[str] = Field(default_factory=list)


def _public_prompt(prompt: dict[str, Any]) -> dict[str, Any]:
    """Strip internal-only fields before returning a prompt to the frontend."""
    response_type = prompt.get("response_type")
    type_info = RESPONSE_TYPES.get(response_type, {}) if response_type else {}
    return {
        "id": prompt["id"],
        "island_id": prompt["island_id"],
        "order": prompt.get("order"),
        "prompt_text": prompt["prompt_text"],
        "expected_word": prompt["expected_word"],
        "acceptable_words": prompt.get("acceptable_words", [prompt["expected_word"]]),
        "intent_tag": prompt.get("intent_tag"),
        "response_type": response_type,
        "response_type_label": type_info.get("label"),
        "coaching_tip": prompt.get("coaching_tip"),
    }


def _score_attempt(prompt: dict[str, Any], verification: Any) -> dict[str, Any]:
    """Map a gesture verification result + prompt into a scored attempt + feedback."""
    acceptable = {w.lower() for w in prompt.get("acceptable_words", [prompt["expected_word"]])}
    best_match = (verification.best_match or "").strip().lower()
    target_similarity = float(verification.target_similarity or 0.0)
    best_similarity = float(verification.similarity or 0.0)

    is_correct = bool(verification.is_match) and best_match in acceptable

    # Phase 2: response type scoring
    response_type_expected = prompt.get("response_type")
    response_type_actual = classify_word(best_match) if best_match else None
    type_correct: bool | None = None
    if response_type_expected is not None:
        type_correct = response_type_actual == response_type_expected

    # Build feedback — type-mismatch message takes priority over generic wrong-word
    if is_correct:
        feedback_text = (
            f"Nice reply! You signed {verification.best_match.upper()} "
            f"(confidence {best_similarity:.2f})."
        )
    elif response_type_expected and type_correct is False:
        feedback_text = get_mismatch_feedback(
            response_type_expected,
            response_type_actual,
            prompt.get("acceptable_words", [prompt["expected_word"]]),
        )
    elif best_match and best_match != prompt["expected_word"].lower():
        feedback_text = (
            f"Right type of response — just the wrong word. "
            f"The model read {verification.best_match.upper()}, "
            f"but you need {prompt['expected_word'].upper()}."
        )
    else:
        feedback_text = (
            f"Try again. Aim for {prompt['expected_word'].upper()} — "
            f"{prompt.get('coaching_tip', 'hold the sign steady and centered.')}"
        )

    expected_info = RESPONSE_TYPES.get(response_type_expected, {}) if response_type_expected else {}
    actual_info = RESPONSE_TYPES.get(response_type_actual, {}) if response_type_actual else {}

    response_type_breakdown = {
        "expected_type": response_type_expected,
        "expected_type_label": expected_info.get("label"),
        "actual_type": response_type_actual,
        "actual_type_label": actual_info.get("label") if response_type_actual else None,
        "type_correct": type_correct,
        "explanation": feedback_text if (type_correct is False) else None,
    }

    return {
        "is_correct": is_correct,
        "matched_word": verification.best_match,
        "confidence": best_similarity,
        "target_confidence": target_similarity,
        "feedback_text": feedback_text,
        "top_matches": [match.model_dump() for match in verification.top_matches],
        "response_type_breakdown": response_type_breakdown,
        # expose flat fields for store call
        "_response_type_expected": response_type_expected,
        "_response_type_actual": response_type_actual,
        "_type_correct": type_correct,
    }


@router.get("/islands/{island_id}/prompts")
def list_prompts(island_id: str):
    prompts = get_prompts_for_island(island_id)
    if not prompts:
        raise HTTPException(status_code=404, detail=f"No prompts for island '{island_id}'")
    return [_public_prompt(p) for p in prompts]


@router.post("/session/start")
def start_session(payload: SessionStartPayload):
    prompts = get_prompts_for_island(payload.island_id)
    if not prompts:
        raise HTTPException(status_code=404, detail=f"No prompts for island '{payload.island_id}'")

    prompt_ids = [p["id"] for p in prompts]
    try:
        session = store.create_conversation_session(
            user_id=payload.user_id,
            island_id=payload.island_id,
            prompt_ids=prompt_ids,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    logger.info(
        "conversation_session_started user=%s island=%s session=%s prompts=%s",
        payload.user_id, payload.island_id, session["id"], len(prompt_ids),
    )

    return {
        "session_id": int(session["id"]),
        "island_id": session["island_id"],
        "status": session["status"],
        "prompts": [_public_prompt(p) for p in prompts],
    }


@router.post("/session/submit")
def submit_attempt(payload: SessionSubmitPayload):
    session = store.get_conversation_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation session not found")

    island_id = session["island_id"]
    prompt = get_prompt(island_id, payload.prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found for this island")

    if not payload.frames:
        raise HTTPException(status_code=400, detail="At least one frame is required")

    verify_request = GestureVerificationRequest(
        target_word=prompt["expected_word"],
        frames=payload.frames,
        model_type="dynamic",
        top_k=REPLY_QUEST_TOP_K,
        threshold=REPLY_QUEST_THRESHOLD,
        user_id=payload.user_id,
    )
    verification = _verify_dynamic_internal(verify_request)
    scored = _score_attempt(prompt, verification)

    try:
        store.append_conversation_attempt(
            session_id=payload.session_id,
            user_id=payload.user_id,
            prompt_id=payload.prompt_id,
            expected_word=prompt["expected_word"],
            matched_word=scored["matched_word"],
            is_correct=scored["is_correct"],
            confidence=scored["confidence"],
            response_type_expected=scored["_response_type_expected"],
            response_type_actual=scored["_response_type_actual"],
            type_correct=scored["_type_correct"],
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    total_prompts = len(session.get("prompt_ids") or [])
    attempts_so_far = len(session.get("attempts") or []) + 1
    correct_prompt_ids = {
        att["prompt_id"] for att in (session.get("attempts") or []) if att.get("is_correct")
    }
    if scored["is_correct"]:
        correct_prompt_ids.add(payload.prompt_id)

    session_completed = len(correct_prompt_ids) >= total_prompts and total_prompts > 0

    if session_completed:
        summary = {
            "total_prompts": total_prompts,
            "correct_prompts": len(correct_prompt_ids),
            "attempts_taken": attempts_so_far,
            "accuracy": len(correct_prompt_ids) / max(total_prompts, 1),
        }
        store.complete_conversation_session(payload.session_id, summary)

    if payload.user_id is not None:
        try:
            store.update_user_conversation_progress(
                user_id=payload.user_id,
                island_id=island_id,
                attempt_is_correct=scored["is_correct"],
                session_completed=session_completed,
                last_session_id=payload.session_id,
            )
        except RuntimeError:
            logger.exception("progress_update_failed user=%s session=%s", payload.user_id, payload.session_id)

    next_prompt_id = None
    if not session_completed:
        for prompt_id in session.get("prompt_ids") or []:
            if prompt_id not in correct_prompt_ids:
                next_prompt_id = prompt_id
                break

    return {
        "session_id": payload.session_id,
        "prompt_id": payload.prompt_id,
        "is_correct": scored["is_correct"],
        "matched_word": scored["matched_word"],
        "confidence": scored["confidence"],
        "feedback_text": scored["feedback_text"],
        "top_matches": scored["top_matches"],
        "response_type_breakdown": scored["response_type_breakdown"],
        "session_completed": session_completed,
        "next_prompt_id": next_prompt_id,
        "correct_count": len(correct_prompt_ids),
        "total_count": total_prompts,
    }


@router.get("/session/{session_id}")
def get_session(session_id: int):
    session = store.get_conversation_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation session not found")

    island_id = session["island_id"]
    prompts_by_id = {p["id"]: p for p in get_prompts_for_island(island_id)}

    hydrated_prompts = []
    for prompt_id in session.get("prompt_ids") or []:
        prompt = prompts_by_id.get(prompt_id)
        if prompt:
            hydrated_prompts.append(_public_prompt(prompt))

    session["prompts"] = hydrated_prompts
    return session


# ── Phase 3: Multi-turn chain endpoints ──────────────────────────────────────

# Valid (prev_type, curr_type) transitions that are conversationally coherent
_VALID_TRANSITIONS: set[tuple[str, str]] = {
    ("greet-open", "confirm"),
    ("greet-open", "react"),
    ("greet-open", "greet-close"),
    ("confirm", "gratitude"),
    ("confirm", "greet-close"),
    ("confirm", "react"),
    ("react", "gratitude"),
    ("react", "greet-close"),
    ("gratitude", "greet-close"),
    ("gratitude", "confirm"),
    ("deny", "greet-close"),
}


def _compute_coherence(transcript: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute per-turn and overall coherence from a completed chain transcript."""
    n = len(transcript)
    if n == 0:
        return {"coherence_score": 0.0, "type_accuracy": 0.0, "word_accuracy": 0.0, "per_turn_scores": []}

    type_scores: list[float] = []
    word_scores: list[float] = []
    transition_scores: list[float] = []
    per_turn: list[dict[str, Any]] = []

    for i, entry in enumerate(transcript):
        wc = bool(entry.get("is_correct"))
        tc = entry.get("type_correct")
        type_score = 1.0 if tc else 0.0
        word_score = 1.0 if wc else 0.0

        transition_score = 1.0  # first turn always valid
        if i > 0:
            prev_type = transcript[i - 1].get("response_type")
            curr_type = entry.get("response_type")
            if prev_type and curr_type:
                transition_score = 1.0 if (prev_type, curr_type) in _VALID_TRANSITIONS else 0.5

        type_scores.append(type_score)
        word_scores.append(word_score)
        transition_scores.append(transition_score)
        per_turn.append({
            "turn_index": entry.get("turn_index", i),
            "word_correct": wc,
            "type_correct": tc,
            "turn_coherence": round(0.6 * type_score + 0.4 * transition_score, 2),
        })

    type_accuracy = sum(type_scores) / n
    word_accuracy = sum(word_scores) / n
    transition_accuracy = sum(transition_scores) / n
    coherence_score = round(0.6 * type_accuracy + 0.4 * transition_accuracy, 2)

    return {
        "coherence_score": coherence_score,
        "type_accuracy": round(type_accuracy, 2),
        "word_accuracy": round(word_accuracy, 2),
        "per_turn_scores": per_turn,
    }


def _public_chain(chain: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": chain["id"],
        "island_id": chain["island_id"],
        "title": chain["title"],
        "description": chain["description"],
        "turns_count": len(chain["turns"]),
        "max_attempts_per_turn": chain.get("max_attempts_per_turn", 2),
    }


class ChainStartPayload(BaseModel):
    user_id: int
    island_id: str
    chain_id: str


class ChainSubmitPayload(BaseModel):
    chain_session_id: int
    turn_index: int
    user_id: Optional[int] = None
    frames: list[str] = Field(default_factory=list)


@router.get("/islands/{island_id}/chains")
def list_chains(island_id: str):
    chains = get_chains_for_island(island_id)
    if not chains:
        raise HTTPException(status_code=404, detail=f"No chains for island '{island_id}'")
    return [_public_chain(c) for c in chains]


@router.post("/chain/start")
def start_chain(payload: ChainStartPayload):
    chain = get_chain(payload.chain_id)
    if not chain or chain["island_id"] != payload.island_id:
        raise HTTPException(status_code=404, detail="Chain not found for this island")

    try:
        session = store.create_chain_session(
            user_id=payload.user_id,
            island_id=payload.island_id,
            chain_id=payload.chain_id,
            turns_snapshot=chain["turns"],
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    first_turn = chain["turns"][0]
    logger.info(
        "chain_session_started user=%s chain=%s session=%s",
        payload.user_id, payload.chain_id, session["id"],
    )

    return {
        "chain_session_id": int(session["id"]),
        "chain_id": chain["id"],
        "title": chain["title"],
        "description": chain["description"],
        "turns_count": len(chain["turns"]),
        "max_attempts_per_turn": chain.get("max_attempts_per_turn", 2),
        "current_turn": 0,
        "turns_snapshot": session.get("turns_snapshot") or chain["turns"],
        "current_turn_data": first_turn,
    }


@router.post("/chain/submit")
def submit_chain_turn(payload: ChainSubmitPayload):
    session = store.get_chain_session(payload.chain_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chain session not found")
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Chain session is already completed")

    turns_snapshot: list[dict[str, Any]] = session.get("turns_snapshot") or []
    total_turns = len(turns_snapshot)

    if payload.turn_index >= total_turns:
        raise HTTPException(status_code=400, detail="turn_index out of range")

    turn = turns_snapshot[payload.turn_index]
    chain = get_chain(session["chain_id"])
    max_attempts = (chain or {}).get("max_attempts_per_turn", 2)

    # Count prior attempts on this turn from transcript
    transcript: list[dict[str, Any]] = session.get("transcript") or []
    prior_attempts_this_turn = sum(
        1 for t in transcript if t.get("turn_index") == payload.turn_index
    )
    if prior_attempts_this_turn >= max_attempts:
        raise HTTPException(status_code=400, detail="Maximum attempts for this turn already used")

    if not payload.frames:
        raise HTTPException(status_code=400, detail="At least one frame is required")

    verify_request = GestureVerificationRequest(
        target_word=turn["expected_word"],
        frames=payload.frames,
        model_type="dynamic",
        top_k=REPLY_QUEST_TOP_K,
        threshold=REPLY_QUEST_THRESHOLD,
        user_id=payload.user_id,
    )
    verification = _verify_dynamic_internal(verify_request)

    # Reuse Phase 2 scoring (prompt dict has same shape as turn dict for scoring)
    scored = _score_attempt(turn, verification)

    attempt_number = prior_attempts_this_turn + 1
    is_last_attempt = attempt_number >= max_attempts
    should_advance = scored["is_correct"] or is_last_attempt

    turn_entry: dict[str, Any] = {
        "turn_index": payload.turn_index,
        "npc_line": turn["npc_line"],
        "expected_word": turn["expected_word"],
        "response_type": turn.get("response_type"),
        "matched_word": scored["matched_word"],
        "is_correct": scored["is_correct"],
        "type_correct": scored["_type_correct"],
        "confidence": scored["confidence"],
        "attempt_number": attempt_number,
        "feedback_text": scored["feedback_text"],
        "response_type_breakdown": scored["response_type_breakdown"],
    }

    next_turn_index = payload.turn_index + (1 if should_advance else 0)
    is_chain_complete = should_advance and next_turn_index >= total_turns

    # Build full transcript for coherence calculation
    # Include prior turns plus this one (only the final attempt per turn)
    final_transcript: list[dict[str, Any]] = []
    seen_turns: set[int] = set()
    for t in reversed(transcript):
        ti = t.get("turn_index", -1)
        if ti not in seen_turns:
            seen_turns.add(ti)
            final_transcript.insert(0, t)
    if should_advance:
        final_transcript.append(turn_entry)

    coherence = _compute_coherence(final_transcript) if is_chain_complete else _compute_coherence(final_transcript)

    chain_summary = None
    if is_chain_complete:
        correct_turns = sum(1 for t in final_transcript if t.get("is_correct"))
        chain_summary = {
            "chain_id": session["chain_id"],
            "total_turns": total_turns,
            "correct_turns": correct_turns,
            **coherence,
        }

    try:
        updated = store.advance_chain_turn(
            chain_session_id=payload.chain_session_id,
            turn_entry=turn_entry,
            next_turn_index=next_turn_index,
            is_complete=is_chain_complete,
        )
        if is_chain_complete and chain_summary:
            store.complete_chain_session(payload.chain_session_id, chain_summary)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    if payload.user_id is not None:
        try:
            store.update_user_conversation_progress(
                user_id=payload.user_id,
                island_id=session["island_id"],
                attempt_is_correct=scored["is_correct"],
                session_completed=is_chain_complete,
                last_session_id=payload.chain_session_id,
            )
        except RuntimeError:
            logger.exception(
                "progress_update_failed user=%s chain_session=%s",
                payload.user_id,
                payload.chain_session_id,
            )

    next_turn_data = None
    if should_advance and not is_chain_complete and next_turn_index < total_turns:
        next_turn_data = turns_snapshot[next_turn_index]

    return {
        "chain_session_id": payload.chain_session_id,
        "turn_index": payload.turn_index,
        "is_correct": scored["is_correct"],
        "matched_word": scored["matched_word"],
        "confidence": scored["confidence"],
        "feedback_text": scored["feedback_text"],
        "response_type_breakdown": scored["response_type_breakdown"],
        "coherence_so_far": coherence,
        "attempt_number": attempt_number,
        "attempts_remaining": max(0, max_attempts - attempt_number),
        "should_advance": should_advance,
        "is_chain_complete": is_chain_complete,
        "next_turn_index": next_turn_index if should_advance else payload.turn_index,
        "next_turn_data": next_turn_data,
        "chain_summary": chain_summary,
    }


@router.get("/chain/{chain_session_id}")
def get_chain_session(chain_session_id: int):
    session = store.get_chain_session(chain_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chain session not found")
    return session
