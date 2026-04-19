"""Multi-turn conversation chain definitions — Phase 3.

A chain is an ordered sequence of 3-6 turns forming a coherent exchange.
Unlike flat sessions, chains advance after each turn regardless of
correctness (max_attempts_per_turn enforced per turn).

All expected_word / acceptable_words must exist in model/words.txt.
"""

from __future__ import annotations

from typing import Any

from data.asl_data import VOCABULARY_BY_ID

MAX_ATTEMPTS_PER_TURN = 2

GREETINGS_CHAINS: list[dict[str, Any]] = [
    {
        "id": "greetings-first-meeting",
        "island_id": "greetings",
        "title": "First Meeting",
        "situation": "first_meeting",
        "description": "A 4-turn exchange — hello, how you're doing, a thank you, then goodbye.",
        "max_attempts_per_turn": MAX_ATTEMPTS_PER_TURN,
        "turns": [
            {
                "turn_index": 0,
                "npc_line": "A stranger walks up and waves. They sign HELLO to you.",
                "expected_word": "hello",
                "acceptable_words": ["hello"],
                "response_type": "greet-open",
                "coaching_tip": "Open palm near the forehead, then move outward like a salute.",
            },
            {
                "turn_index": 1,
                "npc_line": "They smile and sign HOW ARE YOU? You feel great today.",
                "expected_word": "fine",
                "acceptable_words": ["fine", "happy"],
                "response_type": "confirm",
                "coaching_tip": "Open hand, thumb to chest, move outward.",
            },
            {
                "turn_index": 2,
                "npc_line": "They say it was nice meeting you and sign THANK YOU.",
                "expected_word": "thankyou",
                "acceptable_words": ["thankyou"],
                "response_type": "gratitude",
                "coaching_tip": "Fingertips touch chin, then move forward toward the person.",
            },
            {
                "turn_index": 3,
                "npc_line": "They wave and sign GOODBYE as they head off.",
                "expected_word": "bye",
                "acceptable_words": ["bye", "later"],
                "response_type": "greet-close",
                "coaching_tip": "Simple wave — open hand, fingers flexing together.",
            },
        ],
    },
    {
        "id": "greetings-morning-checkin",
        "island_id": "greetings",
        "title": "Morning Check-in",
        "situation": "school",
        "description": "A quick 3-turn morning greeting — honest about how you're feeling.",
        "max_attempts_per_turn": MAX_ATTEMPTS_PER_TURN,
        "turns": [
            {
                "turn_index": 0,
                "npc_line": "A classmate arrives early and signs GOOD MORNING.",
                "expected_word": "morning",
                "acceptable_words": ["morning"],
                "response_type": "greet-open",
                "coaching_tip": "Non-dominant arm horizontal, dominant arm rises like a sunrise.",
            },
            {
                "turn_index": 1,
                "npc_line": "They ask HOW ARE YOU? You're feeling a bit down today.",
                "expected_word": "sad",
                "acceptable_words": ["sad"],
                "response_type": "react",
                "coaching_tip": "Both hands, palms toward face, drift downward with a soft expression.",
            },
            {
                "turn_index": 2,
                "npc_line": "They nod sympathetically and sign GOODBYE as class begins.",
                "expected_word": "bye",
                "acceptable_words": ["bye", "later"],
                "response_type": "greet-close",
                "coaching_tip": "Simple wave — open hand, fingers flexing together.",
            },
        ],
    },
]

CHAINS_BY_ISLAND: dict[str, list[dict[str, Any]]] = {
    "greetings": GREETINGS_CHAINS,
}

CHAINS_BY_ID: dict[str, dict[str, Any]] = {
    chain["id"]: chain
    for chains in CHAINS_BY_ISLAND.values()
    for chain in chains
}


def _validate_chains() -> None:
    missing: list[str] = []
    for chain in CHAINS_BY_ID.values():
        for turn in chain["turns"]:
            for word in {turn["expected_word"], *turn.get("acceptable_words", [])}:
                if word.lower() not in VOCABULARY_BY_ID:
                    missing.append(f"{chain['id']}:turn{turn['turn_index']}:{word}")
    if missing:
        raise RuntimeError(
            "conversation_chains references vocabulary not in model/words.txt: "
            + ", ".join(missing)
        )


_validate_chains()


def get_chains_for_island(island_id: str) -> list[dict[str, Any]]:
    return list(CHAINS_BY_ISLAND.get(island_id, []))


def get_chain(chain_id: str) -> dict[str, Any] | None:
    return CHAINS_BY_ID.get(chain_id)
