"""Conversation prompt seed content for Reply Quest (Phase 1).

Every prompt's expected_word and acceptable_words must exist in
model/words.txt so the dynamic gesture model can recognize them.
"""

from __future__ import annotations

from typing import Any

from data.asl_data import VOCABULARY_BY_ID


GREETINGS_ISLAND_ID = "greetings"


GREETINGS_PROMPTS: list[dict[str, Any]] = [
    {
        "id": "greet-1",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 1,
        "situation": "first_meeting",
        "prompt_text": "An NPC waves and signs HELLO to you. Reply with a greeting.",
        "expected_word": "hello",
        "acceptable_words": ["hello"],
        "intent_tag": "greet-open",
        "response_type": "greet-open",
        "coaching_tip": "Open palm near the forehead, then move outward like a salute.",
    },
    {
        "id": "greet-2",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 2,
        "situation": "school",
        "prompt_text": "A friend signs GOOD MORNING. Reply with MORNING.",
        "expected_word": "morning",
        "acceptable_words": ["morning"],
        "intent_tag": "greet-open",
        "response_type": "greet-open",
        "coaching_tip": "Non-dominant arm horizontal, dominant arm rises like a sunrise.",
    },
    {
        "id": "greet-3",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 3,        "situation": "commute",        "prompt_text": "Someone asks HOW ARE YOU? You feel great today — reply.",
        "expected_word": "fine",
        "acceptable_words": ["fine", "happy"],
        "intent_tag": "confirm",
        "response_type": "confirm",
        "coaching_tip": "Open hand, thumb to chest, move outward.",
    },
    {
        "id": "greet-4",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 4,        "situation": "school",        "prompt_text": "They ask HOW ARE YOU? You feel down — reply honestly.",
        "expected_word": "sad",
        "acceptable_words": ["sad"],
        "intent_tag": "react",
        "response_type": "react",
        "coaching_tip": "Both hands, palms toward face, drift downward with a soft expression.",
    },
    {
        "id": "greet-5",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 5,
        "situation": "store",
        "prompt_text": "A friend just gave you a gift. How do you respond politely?",
        "expected_word": "thankyou",
        "acceptable_words": ["thankyou"],
        "intent_tag": "gratitude",
        "response_type": "gratitude",
        "coaching_tip": "Fingertips touch chin, then move forward toward the person.",
    },
    {
        "id": "greet-6",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 6,
        "situation": "school",
        "prompt_text": "A classmate waves goodbye as they leave. Return the farewell.",
        "expected_word": "bye",
        "acceptable_words": ["bye", "later"],
        "intent_tag": "greet-close",
        "response_type": "greet-close",
        "coaching_tip": "Simple wave — open hand, fingers flexing together.",
    },
    {
        "id": "greet-7",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 7,
        "situation": "school",
        "prompt_text": "You'll see a friend after school. Tell them you'll see them LATER.",
        "expected_word": "later",
        "acceptable_words": ["later", "bye"],
        "intent_tag": "greet-close",
        "response_type": "greet-close",
        "coaching_tip": "L-hand, rotate forward on the palm.",
    },
    {
        "id": "greet-8",
        "island_id": GREETINGS_ISLAND_ID,
        "order": 8,        "situation": "store",        "prompt_text": "A friend asks WANT ICE CREAM? You do — reply.",
        "expected_word": "yes",
        "acceptable_words": ["yes"],
        "intent_tag": "confirm",
        "response_type": "confirm",
        "coaching_tip": "Fist nodding up and down like a head nodding yes.",
    },
]


def _validate_prompts_against_vocab() -> None:
    """Fail fast at import time if a prompt references a word the model cannot recognize."""
    missing: list[str] = []
    for prompt in GREETINGS_PROMPTS:
        words = {prompt["expected_word"], *prompt.get("acceptable_words", [])}
        for word in words:
            if word.lower() not in VOCABULARY_BY_ID:
                missing.append(f"{prompt['id']}:{word}")
    if missing:
        raise RuntimeError(
            "conversation_prompts references vocabulary not present in model/words.txt: "
            + ", ".join(missing)
        )


_validate_prompts_against_vocab()


PROMPTS_BY_ISLAND: dict[str, list[dict[str, Any]]] = {
    GREETINGS_ISLAND_ID: GREETINGS_PROMPTS,
}


def get_prompts_for_island(island_id: str) -> list[dict[str, Any]]:
    return list(PROMPTS_BY_ISLAND.get(island_id, []))


def get_prompt(island_id: str, prompt_id: str) -> dict[str, Any] | None:
    for prompt in PROMPTS_BY_ISLAND.get(island_id, []):
        if prompt["id"] == prompt_id:
            return prompt
    return None
