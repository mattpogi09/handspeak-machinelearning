from pydantic import BaseModel, EmailStr
from typing import Optional, List


# ── Auth ────────────────────────────────────────────────────────────
class UserSignUp(BaseModel):
    email: str
    password: str


class UserSignIn(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    nickname: str


class UserOut(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None


# ── Progress ────────────────────────────────────────────────────────
class ProgressUpdate(BaseModel):
    topic_id: str
    phrase_id: str
    completed: bool = True


class UserProgress(BaseModel):
    user_id: int
    completed_topics: List[str] = []
    current_topic: Optional[str] = None
    completed_phrases: List[str] = []
    level: int = 1
    xp: int = 0
