from fastapi import APIRouter, HTTPException
from data.asl_data import (
    ALL_PRACTICE_SIGNS, VOCABULARY_BY_ID,
    ALL_PRACTICE_LETTERS, ALPHABET_BY_ID
)
from services.supabase_store import get_store

router = APIRouter(prefix="/api/practice", tags=["practice"])
store = get_store()


@router.get("/alphabet")
def get_alphabet():
    """Get all ASL alphabet letters for practice."""
    return store.get_practice_signs("alphabet")


@router.get("/numbers")
def get_numbers():
    """Get all ASL numbers for practice."""
    return store.get_practice_signs("number")


@router.get("/all")
def get_all_practice():
    """Get all practice items (letters and words combined)."""
    return ALL_PRACTICE_LETTERS + ALL_PRACTICE_SIGNS


@router.get("/words")
def get_words():
    """Get all vocabulary words for practice."""
    return ALL_PRACTICE_SIGNS


@router.get("/sign/{sign_id}")
def get_sign(sign_id: str):
    """Get a specific sign (letter or word) by ID."""
    # Try word first
    word = VOCABULARY_BY_ID.get(sign_id.lower())
    if word:
        return word
    
    # Try letter
    letter = ALPHABET_BY_ID.get(sign_id.lower())
    if letter:
        return letter
    
    raise HTTPException(status_code=404, detail="Sign not found")


@router.get("/letter/{letter_id}")
def get_letter(letter_id: str):
    """Get a specific letter by ID."""
    letter = ALPHABET_BY_ID.get(letter_id.lower())
    if letter:
        return letter
    raise HTTPException(status_code=404, detail="Letter not found")


@router.get("/word/{word_id}")
def get_word(word_id: str):
    """Get a specific word by ID."""
    word = VOCABULARY_BY_ID.get(word_id.lower())
    if word:
        return word
    raise HTTPException(status_code=404, detail="Word not found")
