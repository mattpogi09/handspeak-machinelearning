from pydantic import BaseModel, EmailStr
from pydantic import Field
from typing import Optional, List, Literal


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
    chapter_id: str
    word_id: str
    completed: bool = True


class UserProgress(BaseModel):
    user_id: int
    completed_chapters: List[str] = Field(default_factory=list)
    current_chapter: Optional[str] = None
    completed_words: List[str] = Field(default_factory=list)
    level: int = 1
    xp: int = 0


# ── Vocabulary / Gesture Verification ───────────────────────────────
class VocabularyWord(BaseModel):
    id: str
    label: str
    order: int
    chapter_id: Optional[str] = None
    description: Optional[str] = None
    tip: Optional[str] = None


class GestureVerificationRequest(BaseModel):
    target_word: str
    frames: List[str] = Field(default_factory=list)
    image: Optional[str] = None
    model_type: Literal["auto", "static", "dynamic"] = "auto"
    top_k: int = 5
    threshold: float = 0.72


class GestureMatch(BaseModel):
    word: str
    similarity: float


class GestureVerificationResponse(BaseModel):
    target_word: str
    best_match: str
    similarity: float
    target_similarity: float
    threshold: float
    is_match: bool
    top_matches: List[GestureMatch] = Field(default_factory=list)
    message: Optional[str] = None


class AlphabetVerificationResponse(BaseModel):
    target_letter: str
    predicted_letter: str
    confidence: float
    threshold: float
    is_match: bool
    top_matches: List[GestureMatch] = Field(default_factory=list)
    message: Optional[str] = None
