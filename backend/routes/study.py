from fastapi import APIRouter, HTTPException
from data.asl_data import STUDY_TOPICS, ALL_STUDY_PHRASES, ALPHABET_TOPICS
from models.schemas import ProgressUpdate

router = APIRouter(prefix="/api/study", tags=["study"])

# In-memory progress store (replace with DB later)
_user_progress: dict = {}


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
    return _user_progress.get(user_id, {
        "user_id": user_id,
        "completed_chapters": [],
        "current_chapter": STUDY_TOPICS[0]["id"] if STUDY_TOPICS else None,
        "completed_words": [],
        "completed_letters": [],
        "level": 1,
        "xp": 0,
    })


@router.post("/progress/{user_id}")
def update_progress(user_id: int, body: ProgressUpdate):
    """Update user's learning progress."""
    if user_id not in _user_progress:
        _user_progress[user_id] = {
            "user_id": user_id,
            "completed_chapters": [],
            "current_chapter": STUDY_TOPICS[0]["id"] if STUDY_TOPICS else None,
            "completed_words": [],
            "completed_letters": [],
            "level": 1,
            "xp": 0,
        }
    
    prog = _user_progress[user_id]
    word_id = body.word_id
    
    # Track whether it's a letter or word
    is_letter = word_id.lower() in [e["id"] for e in ALPHABET_TOPICS] or \
                any(p["id"] == word_id for topic in ALPHABET_TOPICS for p in topic.get("phrases", []))
    
    # Add to appropriate list
    if is_letter:
        if word_id not in prog.get("completed_letters", []):
            prog.setdefault("completed_letters", []).append(word_id)
            prog["xp"] += 5
    else:
        if word_id not in prog["completed_words"]:
            prog["completed_words"].append(word_id)
            prog["xp"] += 10
    
    prog["level"] = 1 + prog["xp"] // 50

    # Check if entire chapter is done
    all_topics = STUDY_TOPICS + ALPHABET_TOPICS
    for t in all_topics:
        if t["id"] == body.chapter_id:
            topic_item_ids = [p["id"] for p in t["phrases"]]
            if all(item_id in prog["completed_words"] or item_id in prog.get("completed_letters", []) 
                   for item_id in topic_item_ids):
                if body.chapter_id not in prog["completed_chapters"]:
                    prog["completed_chapters"].append(body.chapter_id)
                    prog["xp"] += 50  # Bonus for completing a chapter
            break

    return prog
