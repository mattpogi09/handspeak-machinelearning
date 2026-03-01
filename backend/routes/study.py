from fastapi import APIRouter
from data.asl_data import STUDY_TOPICS, ALL_STUDY_PHRASES
from models.schemas import ProgressUpdate

router = APIRouter(prefix="/api/study", tags=["study"])

# In-memory progress store (replace with DB later)
_user_progress: dict = {}


@router.get("/topics")
def get_topics():
    return STUDY_TOPICS


@router.get("/topic/{topic_id}")
def get_topic(topic_id: str):
    for t in STUDY_TOPICS:
        if t["id"] == topic_id:
            return t
    return {"error": "Topic not found"}


@router.get("/phrase/{phrase_id}")
def get_phrase(phrase_id: str):
    for p in ALL_STUDY_PHRASES:
        if p["id"] == phrase_id:
            return p
    return {"error": "Phrase not found"}


@router.get("/progress/{user_id}")
def get_progress(user_id: int):
    return _user_progress.get(user_id, {
        "user_id": user_id,
        "completed_topics": [],
        "current_topic": "greetings",
        "completed_phrases": [],
        "level": 1,
        "xp": 0,
    })


@router.post("/progress/{user_id}")
def update_progress(user_id: int, body: ProgressUpdate):
    if user_id not in _user_progress:
        _user_progress[user_id] = {
            "user_id": user_id,
            "completed_topics": [],
            "current_topic": "greetings",
            "completed_phrases": [],
            "level": 1,
            "xp": 0,
        }
    prog = _user_progress[user_id]
    if body.phrase_id not in prog["completed_phrases"]:
        prog["completed_phrases"].append(body.phrase_id)
        prog["xp"] += 10
        prog["level"] = 1 + prog["xp"] // 50

    # Check if entire topic is done
    for t in STUDY_TOPICS:
        if t["id"] == body.topic_id:
            topic_phrase_ids = [p["id"] for p in t["phrases"]]
            if all(pid in prog["completed_phrases"] for pid in topic_phrase_ids):
                if body.topic_id not in prog["completed_topics"]:
                    prog["completed_topics"].append(body.topic_id)
            break

    return prog
