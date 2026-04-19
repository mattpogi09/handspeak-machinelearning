from fastapi import APIRouter, HTTPException, Body
from data.asl_data import STUDY_TOPICS, ALL_STUDY_PHRASES, ALPHABET_TOPICS
from models.schemas import ProgressUpdate
from services.supabase_store import get_store

router = APIRouter(prefix="/api/study", tags=["study"])

store = get_store()


def _empty_progress(user_id: int) -> dict:
    return {
        "user_id": user_id,
        "version": 2,
        "islands": {},
        "unlockedIslandIds": [],
        "totalXp": 0,
        "completed_topics": [],
        "completed_phrases": [],
        "xp": 0,
        "level": 1,
        "conversation": {"islands": {}},
    }


def _ensure_conversation_block(progress: dict) -> dict:
    """Guarantee the `conversation` block is present so the frontend never sees a missing key."""
    if not isinstance(progress, dict):
        return progress
    conversation = progress.get("conversation")
    if not isinstance(conversation, dict):
        conversation = {}
    if not isinstance(conversation.get("islands"), dict):
        conversation["islands"] = {}
    progress["conversation"] = conversation
    return progress


@router.get("/islands")
def get_islands():
    """Get the full ordered island list with metadata — the canonical source for the frontend."""
    from data.island_metadata import build_islands
    return build_islands()


@router.get("/topics")
def get_topics():
    """Get both vocabulary topics and alphabet topics for study."""
    # Combine word topics and alphabet topics
    all_topics = STUDY_TOPICS + ALPHABET_TOPICS
    return all_topics


@router.get("/topics/words")
def get_word_topics():
    """Get only vocabulary/word study topics."""
    return STUDY_TOPICS


@router.get("/topics/alphabet")
def get_alphabet_topics():
    """Get only alphabet study topics."""
    return ALPHABET_TOPICS


@router.get("/topic/{topic_id}")
def get_topic(topic_id: str):
    """Get a specific study topic (word or alphabet)."""
    all_topics = STUDY_TOPICS + ALPHABET_TOPICS
    for t in all_topics:
        if t["id"] == topic_id:
            return t
    raise HTTPException(status_code=404, detail="Topic not found")


@router.get("/phrase/{phrase_id}")
def get_phrase(phrase_id: str):
    """Get a specific phrase (word or letter)."""
    for p in ALL_STUDY_PHRASES:
        if p["id"] == phrase_id or p.get("word_id") == phrase_id or p.get("letter_id") == phrase_id:
            return p
    raise HTTPException(status_code=404, detail="Phrase not found")


@router.get("/progress/{user_id}")
def get_progress(user_id: int):
    """Get user's learning progress."""
    try:
        progress = store.get_or_create_progress(user_id)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    if not progress:
        progress = _empty_progress(user_id)
        try:
            store.save_progress(user_id, progress)
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
    return _ensure_conversation_block(progress)


@router.post("/progress/{user_id}")
def update_progress(user_id: int, payload: dict = Body(default_factory=dict)):
    """Update user's learning progress."""
    if "progress" in payload and isinstance(payload["progress"], dict):
        try:
            return store.save_progress(user_id, payload["progress"])
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    if "version" in payload or "islands" in payload or "completed_phrases" in payload:
        try:
            return store.save_progress(user_id, payload)
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    if {"chapter_id", "word_id"}.issubset(payload.keys()):
        try:
            progress = store.get_or_create_progress(user_id) or _empty_progress(user_id)
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        prog = dict(progress)
        word_id = str(payload["word_id"])

        is_letter = any(
            word_id.lower() == phrase["id"]
            for topic in ALPHABET_TOPICS
            for phrase in topic.get("phrases", [])
        )

        completed_phrases = list(prog.get("completed_phrases", []))
        if word_id not in completed_phrases:
            completed_phrases.append(word_id)
            prog["completed_phrases"] = completed_phrases
            prog["xp"] = int(prog.get("xp", 0)) + (5 if is_letter else 10)

        prog["level"] = 1 + int(prog.get("xp", 0)) // 50
        try:
            return store.save_progress(user_id, prog)
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    raise HTTPException(status_code=400, detail="Invalid progress payload")
