from fastapi import APIRouter, HTTPException
from logging_config import get_logger

from data.asl_data import (
    ALL_PRACTICE_SIGNS, VOCABULARY_BY_ID,
    ALL_PRACTICE_LETTERS, ALPHABET_BY_ID,
    ALPHABET_TOPICS
)
from models.schemas import GestureVerificationRequest, GestureVerificationResponse, GestureMatch
from services.supabase_store import get_store


router = APIRouter(prefix="/api/gesture", tags=["gesture"])
logger = get_logger("handspeak.routes.gesture")
store = get_store()
ALPHABET_LABELS = {entry["label"].upper() for entry in ALL_PRACTICE_LETTERS}


# ── Alphabet Endpoints ──────────────────────────────────────────────────────

@router.get("/alphabet")
def get_alphabet():
    """Get all ASL alphabet letters."""
    return ALL_PRACTICE_LETTERS


@router.get("/alphabet/topics")
def get_alphabet_topics():
    """Get alphabet learning topics organized by chapters."""
    return ALPHABET_TOPICS


@router.get("/letter/{letter_id}")
def get_letter(letter_id: str):
    """Get a specific letter by ID."""
    letter = ALPHABET_BY_ID.get(letter_id.lower())
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    return letter


# ── Words/Vocabulary Endpoints ──────────────────────────────────────────────

@router.get("/words")
def get_words():
    """Get all vocabulary words."""
    return ALL_PRACTICE_SIGNS


@router.get("/word/{word_id}")
def get_word(word_id: str):
    """Get a specific word by ID."""
    word = VOCABULARY_BY_ID.get(word_id.lower())
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return word


# ── Gesture Verification (Separated Static/Dynamic) ───────────────────────

def _extract_frames(body: GestureVerificationRequest) -> list[str]:
    frames = body.frames or ([body.image] if body.image else [])
    if not frames:
        raise HTTPException(status_code=400, detail="At least one frame or image is required")
    return frames


def _record_verification(body: GestureVerificationRequest, result: GestureVerificationResponse) -> None:
    try:
        store.record_gesture_verification(
            user_id=body.user_id,
            target_word=body.target_word,
            model_type=body.model_type,
            threshold=body.threshold,
            is_match=result.is_match,
            similarity=result.similarity,
            target_similarity=result.target_similarity,
            top_matches=[match.model_dump() for match in result.top_matches],
            frames=body.frames,
            image_data=body.image,
            request_payload=body.model_dump(),
            response_payload=result.model_dump(),
        )
    except Exception:
        logger.exception("verification_log_failed target=%s model_type=%s", body.target_word, body.model_type)


def _build_response(target: str, result: dict) -> GestureVerificationResponse:
    raw_top_matches = result.get("top_matches", [])
    normalized_top_matches = []
    for match in raw_top_matches:
        if isinstance(match, dict):
            if "word" in match and "similarity" in match:
                normalized_top_matches.append(
                    GestureMatch(word=str(match["word"]), similarity=float(match["similarity"]))
                )
                continue
            if "label" in match and "confidence" in match:
                normalized_top_matches.append(
                    GestureMatch(word=str(match["label"]), similarity=float(match["confidence"]))
                )

    return GestureVerificationResponse(
        target_word=result.get("target_label") or result.get("target_word", target),
        best_match=result.get("predicted") or result.get("best_match", "UNKNOWN"),
        similarity=result.get("similarity", result.get("confidence", 0.0)),
        target_similarity=result.get("target_similarity", result.get("confidence", 0.0)),
        threshold=result["threshold"],
        is_match=result["is_match"],
        top_matches=normalized_top_matches,
        message=result.get("message", ""),
    )


def _verify_static_internal(body: GestureVerificationRequest) -> GestureVerificationResponse:
    if body.debug_override_word:
        expected = (body.target_word or "").strip().upper()
        override = body.debug_override_word.strip().upper()
        is_match = (override == expected)
        res = GestureVerificationResponse(
            target_word=expected,
            threshold=body.threshold,
            is_match=is_match,
            similarity=0.99 if is_match else 0.1,
            target_similarity=0.99 if is_match else 0.1,
            best_match=override if not is_match else expected,
            top_matches=[]
        )
        _record_verification(body, res)
        return res

    from services.static_gesture_service import (
        get_static_service,
        get_static_service_status,
        start_static_service_warmup,
    )

    target = (body.target_word or "").strip().upper()
    if not target:
        raise HTTPException(status_code=400, detail="target_word is required")
    if len(target) != 1 or target not in ALPHABET_LABELS:
        raise HTTPException(status_code=400, detail="Static verification requires a single ASL letter target")

    frames = _extract_frames(body)
    logger.info("verify_static_received target=%s frames=%s threshold=%.3f", target, len(frames), body.threshold)

    try:
        service = get_static_service(wait=False)
    except RuntimeError as error:
        start_static_service_warmup()
        status = get_static_service_status()
        if status["initializing"]:
            raise HTTPException(status_code=503, detail="Static model is loading. Please try again in a few seconds.")
        raise HTTPException(status_code=503, detail=f"Static model unavailable: {error}")

    threshold = min(max(body.threshold, 0.50), 0.95)
    try:
        result = service.verify(target_label=target, frame_data=frames, threshold=threshold, top_k=body.top_k)
    except KeyError:
        raise HTTPException(status_code=404, detail="Target letter not found in static model")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.exception("verify_static_error target=%s", target)
        raise HTTPException(status_code=500, detail=f"Static verification failed: {error}")

    response_payload = _build_response(target, result)
    logger.info(
        "verify_static_result target=%s best=%s match=%s sim=%.4f",
        response_payload.target_word,
        response_payload.best_match,
        response_payload.is_match,
        response_payload.similarity,
    )
    _record_verification(body, response_payload)
    return response_payload


def _verify_dynamic_internal(body: GestureVerificationRequest) -> GestureVerificationResponse:
    if body.debug_override_word:
        expected = (body.target_word or "").strip().upper()
        override = body.debug_override_word.strip().upper()
        is_match = (override == expected)
        res = GestureVerificationResponse(
            target_word=expected,
            threshold=body.threshold,
            is_match=is_match,
            similarity=0.99,
            target_similarity=0.99 if is_match else 0.1,
            best_match=override,
            top_matches=[]
        )
        return res

    from services.gesture_recognition import (
        get_dynamic_service,
        get_dynamic_service_status,
        start_dynamic_service_warmup,
    )

    target = (body.target_word or "").strip().upper()
    if not target:
        raise HTTPException(status_code=400, detail="target_word is required")

    frames = _extract_frames(body)
    logger.info("verify_dynamic_received target=%s frames=%s threshold=%.3f", target, len(frames), body.threshold)

    try:
        service = get_dynamic_service(wait=False)
    except RuntimeError as error:
        start_dynamic_service_warmup()
        status = get_dynamic_service_status()
        if status["initializing"]:
            raise HTTPException(status_code=503, detail="Dynamic model is loading. Please try again in a few seconds.")
        raise HTTPException(status_code=503, detail=f"Dynamic model unavailable: {error}")

    threshold = min(max(body.threshold, 0.30), 0.45)
    try:
        result = service.verify(target_word=target, frame_data=frames, top_k=body.top_k, threshold=threshold)
    except KeyError:
        raise HTTPException(status_code=404, detail="Target word not found in dynamic model vocabulary")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.exception("verify_dynamic_error target=%s", target)
        raise HTTPException(status_code=500, detail=f"Dynamic verification failed: {error}")

    response_payload = _build_response(target, result)
    logger.info(
        "verify_dynamic_result target=%s best=%s match=%s sim=%.4f",
        response_payload.target_word,
        response_payload.best_match,
        response_payload.is_match,
        response_payload.similarity,
    )
    _record_verification(body, response_payload)
    return response_payload


@router.get("/status/static")
def get_static_status():
    from services.static_gesture_service import get_static_service_status, start_static_service_warmup

    started = start_static_service_warmup()
    status = get_static_service_status()
    logger.info("static_status warmup_started=%s status=%s", started, status)
    return status


@router.get("/status/dynamic")
def get_dynamic_status():
    from services.gesture_recognition import get_dynamic_service_status, start_dynamic_service_warmup

    started = start_dynamic_service_warmup()
    status = get_dynamic_service_status()
    logger.info("dynamic_status warmup_started=%s status=%s", started, status)
    return status


@router.get("/status")
def get_gesture_status():
    return {
        "static": get_static_status(),
        "dynamic": get_dynamic_status(),
    }


@router.post("/verify/static", response_model=GestureVerificationResponse)
def verify_static_gesture(body: GestureVerificationRequest):
    return _verify_static_internal(body)


@router.post("/verify/dynamic", response_model=GestureVerificationResponse)
def verify_dynamic_gesture(body: GestureVerificationRequest):
    return _verify_dynamic_internal(body)


@router.post("/verify", response_model=GestureVerificationResponse)
def verify_gesture(body: GestureVerificationRequest):
    """
    Backward-compatible endpoint.
    Uses explicit model_type when provided, otherwise auto-routes by target shape.
    """
    target = (body.target_word or "").strip().upper()
    logger.info("verify_compat_received target=%s model_type=%s", target, body.model_type)

    if body.model_type == "static":
        return _verify_static_internal(body)
    if body.model_type == "dynamic":
        return _verify_dynamic_internal(body)

    if len(target) == 1 and target in ALPHABET_LABELS:
        return _verify_static_internal(body)
    return _verify_dynamic_internal(body)