from fastapi import APIRouter
from data.asl_data import ALPHABET_SIGNS, NUMBER_SIGNS, ALL_PRACTICE_SIGNS

router = APIRouter(prefix="/api/practice", tags=["practice"])


@router.get("/alphabet")
def get_alphabet():
    return ALPHABET_SIGNS


@router.get("/numbers")
def get_numbers():
    return NUMBER_SIGNS


@router.get("/all")
def get_all_practice():
    return ALL_PRACTICE_SIGNS


@router.get("/sign/{sign_id}")
def get_sign(sign_id: str):
    for s in ALL_PRACTICE_SIGNS:
        if s["id"] == sign_id.upper():
            return s
    return {"error": "Sign not found"}
