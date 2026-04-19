"""Rich display metadata for every island served by /api/study/islands.

build_islands() merges this with ALPHABET_TOPICS / STUDY_TOPICS from
asl_data.py and adds a dedicated 'greetings' conversation island.
The frontend should fetch /api/study/islands and cache the result —
nothing island-related should be hardcoded in the frontend anymore.
"""

from __future__ import annotations
from typing import Any

XP_PER_LEVEL = 10
XP_PER_ALPHABET_LEVEL = 5

# ── Dedicated conversation islands ────────────────────────────────────────────
# These are not derived from asl_data.py — they are thematic conversation worlds.
CONVERSATION_ISLANDS: list[dict[str, Any]] = [
    {
        "id": "greetings",
        "title": "Greetings & Openers",
        "icon": "🤝",
        "type": "conversation",
        "situations": [
            {
                "emoji": "🏫",
                "label": "School",
                "description": "You're in a classroom asking for help or greeting teachers."
            },
            {
                "emoji": "🛒",
                "label": "Store",
                "description": "You're shopping and need assistance or are paying at the register."
            },
            {
                "emoji": "🚌",
                "label": "Commute",
                "description": "You're on public transportation engaging in small talk."
            },
            {
                "emoji": "👋",
                "label": "First Meeting",
                "description": "You're meeting someone for the first time."
            },
            {
                "emoji": "🆘",
                "label": "Help Request",
                "description": "You need urgent assistance or clarification."
            }
        ],
        "difficulty": "Beginner",
        "difficulty_rank": 0,
        "has_learn": False,
        "has_drill": False,
        "has_converse": True,
        "intro": {
            "title": "Greetings Island",
            "story": "Every great voyage begins with a wave! On Greetings Island you learn foundational conversational signs that open doors and start real exchanges.",
            "description": "Master your first set of essential ASL conversation signs and build confidence before moving deeper into the voyage.",
            "objective": "Complete a full Reply Quest chain to prove you can hold a basic ASL greeting.",
            "hint": "Keep your hand clearly centered in frame and use smooth, deliberate movements.",
        },
        "theme": {
            "sky": "linear-gradient(180deg,#8fd3ff 0%,#4fb4ff 100%)",
            "island": "linear-gradient(180deg,#ffd36f 0%,#ffb347 100%)",
        },
        "levels": [],
    },
]

# ── Per-chapter metadata overrides ────────────────────────────────────────────
# Keys match IDs produced by asl_data.py ('alphabet-chapter-N', 'chapter-N').
_CHAPTER_META: dict[str, dict[str, Any]] = {
    # Alphabet chapters
    "alphabet-chapter-1": {
        "difficulty": "Easy",
        "hint": "Hold each letter steady for 1-2 seconds. Clear finger and hand positioning is key!",
        "theme": {"sky": "linear-gradient(180deg,#e0c3fc 0%,#8ec5fc 100%)", "island": "linear-gradient(180deg,#ffd89b 0%,#19547b 100%)"},
    },
    "alphabet-chapter-2": {
        "difficulty": "Easy",
        "hint": "Practice transitioning cleanly between letters. Smooth motion matters.",
        "theme": {"sky": "linear-gradient(180deg,#d4f8e8 0%,#79dbb7 100%)", "island": "linear-gradient(180deg,#ffe1a8 0%,#d4a44c 100%)"},
    },
    "alphabet-chapter-3": {
        "difficulty": "Easy",
        "hint": "Letters here involve subtle wrist angles — go slow and hold firm.",
        "theme": {"sky": "linear-gradient(180deg,#c3d9fc 0%,#7baee8 100%)", "island": "linear-gradient(180deg,#ffcb80 0%,#f59f4b 100%)"},
    },
    "alphabet-chapter-4": {
        "difficulty": "Easy",
        "hint": "Final alphabet chapter! Stay relaxed — tension causes blurry signs.",
        "theme": {"sky": "linear-gradient(180deg,#fde8c8 0%,#f5b670 100%)", "island": "linear-gradient(180deg,#c8f3c8 0%,#5db85d 100%)"},
    },
    # Vocabulary chapters
    "chapter-1": {
        "title": "Everyday Basics",
        "icon": "🌟",
        "difficulty": "Easy",
        "story": "Begin your vocabulary journey with the most common everyday signs. These are the building blocks of real conversation.",
        "hint": "Keep your hand clearly centered in frame and use smooth, deliberate movements.",
        "theme": {"sky": "linear-gradient(180deg,#95c7ff 0%,#3f86d9 100%)", "island": "linear-gradient(180deg,#ffcb80 0%,#f59f4b 100%)"},
    },
    "chapter-2": {
        "title": "Actions & Feelings",
        "icon": "💬",
        "difficulty": "Easy",
        "story": "Expand your signing with action words and emotional expressions that come up in every real conversation.",
        "hint": "Action signs often have a flowing motion — let your arm move naturally.",
        "theme": {"sky": "linear-gradient(180deg,#c9f7d9 0%,#74d6ae 100%)", "island": "linear-gradient(180deg,#c8b6a6 0%,#9c7f66 100%)"},
    },
    "chapter-3": {
        "title": "People & Places",
        "icon": "👥",
        "difficulty": "Medium",
        "story": "Learn the signs for people, family roles, and common places. These connect you to the people around you.",
        "hint": "Family signs are often near the face — chin area for female, forehead for male.",
        "theme": {"sky": "linear-gradient(180deg,#ceb9ff 0%,#8f74ff 100%)", "island": "linear-gradient(180deg,#8aa7ff 0%,#5867df 100%)"},
    },
    "chapter-4": {
        "title": "Nature & Animals",
        "icon": "🌿",
        "difficulty": "Medium",
        "story": "Explore the natural world through ASL. These expressive signs are vivid and memorable.",
        "hint": "Animal signs often mimic the creature's most distinctive feature — be expressive!",
        "theme": {"sky": "linear-gradient(180deg,#9be7df 0%,#3bb8a8 100%)", "island": "linear-gradient(180deg,#5f8f8a 0%,#3a6661 100%)"},
    },
    "chapter-5": {
        "title": "Home & Objects",
        "icon": "🏠",
        "difficulty": "Medium",
        "story": "Signs for objects around the home — from furniture to food. Practical vocab for daily life.",
        "hint": "Object signs often mimic how you use or interact with the item.",
        "theme": {"sky": "linear-gradient(180deg,#ffe6b8 0%,#ffb16d 100%)", "island": "linear-gradient(180deg,#ff8a65 0%,#e96d4e 100%)"},
    },
}

_DEFAULT_THEMES = [
    {"sky": "linear-gradient(180deg,#a8edea 0%,#5ab9b9 100%)", "island": "linear-gradient(180deg,#fdc830 0%,#f37335 100%)"},
    {"sky": "linear-gradient(180deg,#e0e0e0 0%,#8fb3cc 100%)", "island": "linear-gradient(180deg,#d4b896 0%,#a07850 100%)"},
    {"sky": "linear-gradient(180deg,#d4e9ff 0%,#6b9fcf 100%)", "island": "linear-gradient(180deg,#c9e265 0%,#7db53c 100%)"},
    {"sky": "linear-gradient(180deg,#f8e1f4 0%,#c67bce 100%)", "island": "linear-gradient(180deg,#ffd6a5 0%,#ffab6e 100%)"},
    {"sky": "linear-gradient(180deg,#d4edda 0%,#74c69d 100%)", "island": "linear-gradient(180deg,#ffecd2 0%,#fcb69f 100%)"},
]
_DEFAULT_ICONS = ["📚", "🎯", "🧩", "🚀", "🌈", "💡", "🎨", "🌊", "⭐", "🎭"]


def _build_alphabet_island(topic: dict, order: int) -> dict[str, Any]:
    meta = _CHAPTER_META.get(topic["id"], {})
    chapter_num = order
    return {
        "id": topic["id"],
        "title": topic["title"],
        "order": order,
        "icon": topic.get("icon", "🔤"),
        "type": "alphabet",
        "difficulty": meta.get("difficulty", "Easy"),
        "difficulty_rank": 1,
        "has_learn": True,
        "has_drill": False,
        "has_converse": False,
        "intro": {
            "title": f"Alphabet Chapter {chapter_num}",
            "story": f"Master the foundational ASL alphabet letters in Chapter {chapter_num}. Each letter builds toward fluent signing.",
            "description": f"Learn and practice the ASL letters in this chapter.",
            "objective": f"Complete all letter levels in Alphabet Chapter {chapter_num}.",
            "hint": meta.get("hint", "Hold each letter steady for 1-2 seconds. Clear finger positioning is key!"),
        },
        "theme": meta.get("theme", _DEFAULT_THEMES[order % len(_DEFAULT_THEMES)]),
        "levels": [
            {
                "id": f"{topic['id']}::{p['id']}",
                "phrase_id": p["id"],
                "order": i + 1,
                "type": "letter",
                "label": p["label"],
                "description": p["description"],
                "tip": p["tip"],
                "reward_xp": XP_PER_ALPHABET_LEVEL,
            }
            for i, p in enumerate(topic["phrases"])
        ],
    }


def _build_vocab_island(topic: dict, order: int, idx: int) -> dict[str, Any]:
    meta = _CHAPTER_META.get(topic["id"], {})
    title = meta.get("title", topic["title"])
    icon = meta.get("icon", _DEFAULT_ICONS[idx % len(_DEFAULT_ICONS)])
    difficulty = meta.get("difficulty", "Medium")
    difficulty_rank = {"Easy": 1, "Medium": 2, "Hard": 3}.get(difficulty, 2)
    levels = [
        {
            "id": f"{topic['id']}::{p['id']}",
            "phrase_id": p["id"],
            "order": i + 1,
            "type": "word",
            "label": p["label"],
            "description": p["description"],
            "tip": p["tip"],
            "reward_xp": XP_PER_LEVEL,
        }
        for i, p in enumerate(topic["phrases"])
    ]
    return {
        "id": topic["id"],
        "title": title,
        "order": order,
        "icon": icon,
        "type": "vocabulary",
        "difficulty": difficulty,
        "difficulty_rank": difficulty_rank,
        "has_learn": True,
        "has_drill": True,
        "has_converse": False,
        "intro": {
            "title": f"{title} Island",
            "story": meta.get("story", f"Learn and master essential signs in {title} on this island."),
            "description": f"Practice these signs and build your vocabulary for {title.lower()}.",
            "objective": f"Complete all levels.",
            "hint": meta.get("hint", "Keep your hand centered and clearly visible in the frame."),
        },
        "theme": meta.get("theme", _DEFAULT_THEMES[idx % len(_DEFAULT_THEMES)]),
        "levels": levels,
    }


def build_islands() -> list[dict[str, Any]]:
    """Return the full ordered island list: alphabet -> conversation(greetings) -> vocabulary."""
    from data.asl_data import ALPHABET_TOPICS, STUDY_TOPICS

    result: list[dict[str, Any]] = []

    base_order = 1
    for idx, topic in enumerate(ALPHABET_TOPICS):
        result.append(_build_alphabet_island(topic, base_order + idx))

    base_order += len(ALPHABET_TOPICS)
    for idx, island in enumerate(CONVERSATION_ISLANDS):
        island_copy = island.copy()
        island_copy["order"] = base_order + idx
        result.append(island_copy)

    base_order += len(CONVERSATION_ISLANDS)
    for idx, topic in enumerate(STUDY_TOPICS):
        result.append(_build_vocab_island(topic, base_order + idx, idx))

    return result
