from typing import Any

SITUATIONS: dict[str, dict[str, str]] = {
    "school": {
        "emoji": "🏫", 
        "label": "School", 
        "description": "You're in a classroom asking for help or greeting teachers."
    },
    "store": {
        "emoji": "🛒", 
        "label": "Store", 
        "description": "You're shopping and need assistance or are paying at the register."
    },
    "commute": {
        "emoji": "🚌", 
        "label": "Commute", 
        "description": "You're on public transportation engaging in small talk."
    },
    "first_meeting": {
        "emoji": "👋", 
        "label": "First Meeting", 
        "description": "You're meeting someone for the first time."
    },
    "help_request": {
        "emoji": "🆘", 
        "label": "Help Request", 
        "description": "You need urgent assistance or clarification."
    }
}

# Example of banned words per situation (to enforce formality)
CONTEXT_BANNED_WORDS: dict[str, list[str]] = {
    "school": ["whatsup", "hey"],
    "first_meeting": ["whatsup", "hey"],
    "help_request": ["whatsup", "hey", "later", "bye"],
    "store": ["whatsup"]
}
