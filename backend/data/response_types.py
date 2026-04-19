"""Response type taxonomy for Phase 2 — response-behavior scoring.

Maps vocabulary words to intent categories and generates type-aware
mismatch feedback so learners understand *why* a response is wrong,
not just that it is wrong.
"""

from __future__ import annotations

RESPONSE_TYPES: dict[str, dict[str, str]] = {
    "greet-open": {
        "label": "Greeting opener",
        "description": "An opening greeting sign — how you start a conversation.",
    },
    "greet-close": {
        "label": "Farewell",
        "description": "A closing or farewell sign — how you end a conversation.",
    },
    "confirm": {
        "label": "Confirmation",
        "description": "Affirming, agreeing, or answering how you are.",
    },
    "deny": {
        "label": "Denial",
        "description": "Refusing, disagreeing, or saying no.",
    },
    "clarify": {
        "label": "Clarification",
        "description": "Asking the other person to clarify or repeat.",
    },
    "ask-back": {
        "label": "Ask-back",
        "description": "Asking a follow-up question to keep the exchange going.",
    },
    "repair": {
        "label": "Repair",
        "description": "Pausing or resetting after a misunderstanding.",
    },
    "react": {
        "label": "Emotional reaction",
        "description": "Expressing a feeling or emotional state.",
    },
    "gratitude": {
        "label": "Gratitude",
        "description": "Thanking or showing appreciation.",
    },
}

WORD_TO_RESPONSE_TYPE: dict[str, str] = {
    # Greeting openers
    "hello": "greet-open",
    "morning": "greet-open",
    "afternoon": "greet-open",
    "evening": "greet-open",
    "hi": "greet-open",
    # Farewells
    "bye": "greet-close",
    "later": "greet-close",
    "goodbye": "greet-close",
    # Confirmations
    "yes": "confirm",
    "fine": "confirm",
    "happy": "confirm",
    "good": "confirm",
    "okay": "confirm",
    # Denials
    "no": "deny",
    "sorry": "deny",
    # Clarification
    "say": "clarify",
    "listen": "clarify",
    # Ask-back (follow-up questions)
    "who": "ask-back",
    "where": "ask-back",
    "why": "ask-back",
    # Repair / reset
    "wait": "repair",
    # Emotional reactions
    "sad": "react",
    "angry": "react",
    "surprise": "react",
    "scared": "react",
    "excited": "react",
    # Gratitude
    "thankyou": "gratitude",
    "please": "gratitude",
    "welcome": "gratitude",
}

# Mismatch matrix: (expected_type, actual_type) → human-readable explanation
_MISMATCH_MESSAGES: dict[tuple[str, str], str] = {
    ("greet-open", "greet-close"): (
        "That sign closes a conversation — but this is a greeting moment. Open with HELLO or MORNING."
    ),
    ("greet-open", "confirm"): (
        "That looks like agreement, but the NPC is saying hello — respond with a greeting like HELLO or MORNING."
    ),
    ("greet-open", "deny"): (
        "That sign expresses refusal — for a greeting, try HELLO or MORNING instead."
    ),
    ("greet-open", "react"): (
        "That's an emotional reaction — for an opening greeting, try HELLO or MORNING."
    ),
    ("greet-open", "gratitude"): (
        "That expresses thanks — but the right response here is a greeting like HELLO or MORNING."
    ),
    ("greet-close", "greet-open"): (
        "That's an opening greeting — but here you're wrapping up. Try BYE or LATER."
    ),
    ("greet-close", "confirm"): (
        "That looks like agreement — this moment calls for a farewell. Try BYE or LATER."
    ),
    ("greet-close", "deny"): (
        "That sign is a refusal — to close the conversation, sign BYE or LATER."
    ),
    ("greet-close", "react"): (
        "That's an emotional reaction — for a farewell, try BYE or LATER."
    ),
    ("greet-close", "gratitude"): (
        "That's a thanks — the right response here is a closing sign like BYE or LATER."
    ),
    ("confirm", "greet-open"): (
        "That's a greeting sign — but the NPC asked how you are. Reply with FINE, HAPPY, or YES."
    ),
    ("confirm", "greet-close"): (
        "That's a farewell — but they asked how you feel. Try FINE or HAPPY."
    ),
    ("confirm", "deny"): (
        "That's a denial — to confirm or answer 'how are you', try FINE, HAPPY, or YES."
    ),
    ("confirm", "react"): (
        "That's an emotional reaction. To answer 'how are you', use a confirmation like FINE, HAPPY, or YES."
    ),
    ("confirm", "gratitude"): (
        "That's gratitude — the expected response here is a confirmation like FINE or YES."
    ),
    ("deny", "greet-open"): (
        "That's a greeting — the prompt calls for a denial or refusal. Try NO or SORRY."
    ),
    ("deny", "greet-close"): (
        "That's a farewell — try NO or SORRY to express disagreement."
    ),
    ("deny", "confirm"): (
        "That's an agreement — but here you should express denial or refusal. Try NO."
    ),
    ("deny", "react"): (
        "That's an emotional reaction — for a refusal, try NO."
    ),
    ("deny", "gratitude"): (
        "That's gratitude — for a denial, try NO."
    ),
    ("react", "greet-open"): (
        "That's a greeting — but the NPC asked how you feel. Express your emotion — try SAD if you're feeling down."
    ),
    ("react", "greet-close"): (
        "That's a farewell — the NPC wants your emotional state. Try SAD."
    ),
    ("react", "confirm"): (
        "That's an agreement sign. The context asks for an emotional reaction — try SAD to show how you really feel."
    ),
    ("react", "deny"): (
        "That's a denial — the prompt wants an emotional reaction like SAD."
    ),
    ("react", "gratitude"): (
        "That's gratitude — show your emotion instead, like SAD."
    ),
    ("gratitude", "greet-open"): (
        "That's a greeting — the situation calls for thanks. Try THANK YOU."
    ),
    ("gratitude", "greet-close"): (
        "That's a farewell — the right response here is gratitude. Try THANK YOU."
    ),
    ("gratitude", "confirm"): (
        "That looks like agreement — but the context calls for gratitude. Try THANK YOU."
    ),
    ("gratitude", "deny"): (
        "That's a refusal — the right response is to say THANK YOU."
    ),
    ("gratitude", "react"): (
        "That's an emotional reaction — what's needed here is gratitude. Try THANK YOU."
    ),
}

_EXPECTED_TYPE_HINTS: dict[str, str] = {
    "clarify": "This is a clarification moment — ask them to repeat or clarify. Try: {words}.",
    "ask-back": "This is a follow-up question — ask back with WHO, WHERE, or WHY. Try: {words}.",
    "repair": "This is a repair moment — pause or reset the exchange. Try: {words}.",
}


def classify_word(word: str) -> str | None:
    """Return the response type for a given vocabulary word, or None if unknown."""
    if not word:
        return None
    return WORD_TO_RESPONSE_TYPE.get(word.strip().lower())


def get_mismatch_feedback(
    expected_type: str,
    actual_type: str | None,
    acceptable_words: list[str],
) -> str:
    """Return a type-mismatch explanation, falling back to a generic message."""
    if actual_type and (expected_type, actual_type) in _MISMATCH_MESSAGES:
        return _MISMATCH_MESSAGES[(expected_type, actual_type)]

    expected_info = RESPONSE_TYPES.get(expected_type, {})
    words_str = " or ".join(w.upper() for w in (acceptable_words or [])[:3])
    if expected_type in _EXPECTED_TYPE_HINTS:
        hint = _EXPECTED_TYPE_HINTS[expected_type]
        return hint.format(words=words_str or "the expected sign")
    return (
        f"Wrong response type. Expected a {expected_info.get('label', expected_type).lower()}. "
        f"Try signing: {words_str or 'the expected sign'}."
    )
