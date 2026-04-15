"""Vocabulary helpers backed by model/words.txt."""

from __future__ import annotations

from pathlib import Path
import runpy
from typing import Any


MODEL_DIR = Path(__file__).resolve().parents[2] / "model"
WORDS_FILE = MODEL_DIR / "words.txt"
CHAPTER_SIZE = 20


def _load_words() -> list[str]:
    namespace = runpy.run_path(str(WORDS_FILE))
    raw_words = (
        namespace.get("ALL_SIGNS")
        or namespace.get("CONVERSATIONAL_100")
        or namespace.get("WORDS")
        or []
    )
    words: list[str] = []
    seen: set[str] = set()

    for raw_word in raw_words:
        word = str(raw_word).strip()
        key = word.lower()
        if word and key not in seen:
            words.append(word)
            seen.add(key)

    return words


def _humanize(word: str) -> str:
    lowered = word.lower()
    if lowered == "thankyou":
        return "THANK YOU"
    if lowered == "callonphone":
        return "CALL ON PHONE"
    if lowered == "glasswindow":
        return "GLASS WINDOW"
    if lowered == "frenchfries":
        return "FRENCH FRIES"
    if lowered == "toothbrush":
        return "TOOTH BRUSH"
    if lowered == "hesheit":
        return "HE/SHE/IT"
    if lowered == "weus":
        return "WE/US"
    if lowered == "minemy":
        return "MINE/MY"
    return word


def _chunk(items: list[Any], size: int) -> list[list[Any]]:
    return [items[index:index + size] for index in range(0, len(items), size)]


VOCABULARY_WORDS = _load_words()

VOCABULARY_ENTRIES = [
    {
        "id": word.lower(),
        "label": _humanize(word),
        "word": word,
        "order": index + 1,
        "chapter_id": f"chapter-{index // CHAPTER_SIZE + 1}",
        "description": f"Practice the ASL sign for {_humanize(word)}.",
        "tip": "Keep your hand centered and clearly visible in the frame.",
    }
    for index, word in enumerate(VOCABULARY_WORDS)
]

VOCABULARY_BY_ID = {entry["id"]: entry for entry in VOCABULARY_ENTRIES}

STUDY_TOPICS = []
for index, chunk in enumerate(_chunk(VOCABULARY_ENTRIES, CHAPTER_SIZE)):
    chapter_id = f"chapter-{index + 1}"
    title = f"Chapter {index + 1}"
    STUDY_TOPICS.append(
        {
            "id": chapter_id,
            "title": title,
            "order": index + 1,
            "icon": "📘",
            "phrases": [
                {
                    "id": entry["id"],
                    "word_id": entry["id"],
                    "label": entry["label"],
                    "description": entry["description"],
                    "tip": entry["tip"],
                    "order": entry["order"],
                }
                for entry in chunk
            ],
        }
    )

ALL_STUDY_PHRASES = []
for topic in STUDY_TOPICS:
    for phrase in topic["phrases"]:
        ALL_STUDY_PHRASES.append({**phrase, "topic_id": topic["id"], "topic_title": topic["title"]})


# ── Letter Data (Static Model) ──────────────────────────────────────────────────
# ASL letters recognized by the static model
ALPHABET_LETTERS = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I",
    "K", "L", "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W", "X", "Y"
]

ALPHABET_ENTRIES = [
    {
        "id": letter.lower(),
        "label": letter,
        "letter": letter,
        "order": index + 1,
        "chapter_id": f"alphabet-chapter-{(index // 6) + 1}",
        "description": f"Learn the ASL sign for the letter '{letter}'.",
        "tip": "Make sure your hand is clearly visible and centered in the frame.",
        "model_type": "static",
    }
    for index, letter in enumerate(ALPHABET_LETTERS)
]

ALPHABET_BY_ID = {entry["id"]: entry for entry in ALPHABET_ENTRIES}

# Alphabet study topics (6 letters per chapter)
ALPHABET_TOPICS = []
for index, chunk in enumerate(_chunk(ALPHABET_ENTRIES, 6)):
    chapter_id = f"alphabet-chapter-{index + 1}"
    title = f"Alphabet {index + 1}"
    ALPHABET_TOPICS.append(
        {
            "id": chapter_id,
            "title": title,
            "order": index + 1,
            "icon": "🔤",
            "type": "alphabet",
            "phrases": [
                {
                    "id": entry["id"],
                    "letter_id": entry["id"],
                    "label": entry["label"],
                    "description": entry["description"],
                    "tip": entry["tip"],
                    "order": entry["order"],
                    "model_type": "static",
                }
                for entry in chunk
            ],
        }
    )

# ── Combined Data ────────────────────────────────────────────────────────────────
ALL_PRACTICE_SIGNS = VOCABULARY_ENTRIES
ALL_PRACTICE_LETTERS = ALPHABET_ENTRIES
ALL_PRACTICE_ITEMS = ALL_PRACTICE_LETTERS + ALL_PRACTICE_SIGNS
