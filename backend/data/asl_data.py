"""
Static ASL dataset — alphabets, numbers, and phrases.
Replace with real model data / DB queries later.
"""

# ── Alphabet signs (A-Z) ────────────────────────────────────────────
ALPHABET_SIGNS = [
    {
        "id": letter,
        "label": letter,
        "type": "alphabet",
        "description": f"Form the letter '{letter}' with your hand",
        "tip": "Ensure your hand is clearly visible in the frame.",
        "diagram_url": None,  # placeholder — add real image URLs later
    }
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
]

# ── Number signs (0-9) ──────────────────────────────────────────────
NUMBER_SIGNS = [
    {
        "id": str(n),
        "label": str(n),
        "type": "number",
        "description": f"Form the number '{n}' with your hand",
        "tip": "Keep your hand steady and clearly visible.",
        "diagram_url": None,
    }
    for n in range(10)
]

# ── Study topics with phrases ───────────────────────────────────────
STUDY_TOPICS = [
    {
        "id": "greetings",
        "title": "Greetings",
        "order": 1,
        "phrases": [
            {"id": "hello", "label": "Hello", "description": "Form the letter 'Hello' with your hand",
             "tip": "Ensure your hand is clearly visible in the frame.", "diagram_url": None},
            {"id": "goodbye", "label": "Goodbye", "description": "Wave goodbye with an open hand",
             "tip": "Move your hand smoothly.", "diagram_url": None},
            {"id": "thank_you", "label": "Thank You", "description": "Touch your chin and move hand forward",
             "tip": "Start from your chin.", "diagram_url": None},
            {"id": "please", "label": "Please", "description": "Rub your chest in a circular motion",
             "tip": "Use your dominant hand.", "diagram_url": None},
            {"id": "sorry", "label": "Sorry", "description": "Make a fist and rub it in a circle on your chest",
             "tip": "Express sincerity with your face.", "diagram_url": None},
        ],
    },
    {
        "id": "family",
        "title": "Family",
        "order": 2,
        "phrases": [
            {"id": "mother", "label": "Mother", "description": "Tap your chin with your thumb (open hand)",
             "tip": "Keep fingers spread.", "diagram_url": None},
            {"id": "father", "label": "Father", "description": "Tap your forehead with your thumb (open hand)",
             "tip": "Keep fingers spread.", "diagram_url": None},
            {"id": "sister", "label": "Sister", "description": "Trace jaw then bring hands together",
             "tip": "Smile while signing!", "diagram_url": None},
            {"id": "brother", "label": "Brother", "description": "Touch forehead then bring hands together",
             "tip": "Keep your movements clear.", "diagram_url": None},
            {"id": "baby", "label": "Baby", "description": "Rock your arms as if cradling a baby",
             "tip": "Gentle rocking motion.", "diagram_url": None},
        ],
    },
    {
        "id": "colors",
        "title": "Colors",
        "order": 3,
        "phrases": [
            {"id": "red", "label": "Red", "description": "Drag finger down from your lip",
             "tip": "Use your index finger.", "diagram_url": None},
            {"id": "blue", "label": "Blue", "description": "Twist the letter B in the air",
             "tip": "Shake your hand slightly.", "diagram_url": None},
            {"id": "green", "label": "Green", "description": "Twist the letter G in the air",
             "tip": "Flick your wrist.", "diagram_url": None},
            {"id": "yellow", "label": "Yellow", "description": "Shake the letter Y hand",
             "tip": "Twist at the wrist.", "diagram_url": None},
            {"id": "black", "label": "Black", "description": "Drag your index finger across your forehead",
             "tip": "One smooth motion.", "diagram_url": None},
        ],
    },
    {
        "id": "food",
        "title": "Food",
        "order": 4,
        "phrases": [
            {"id": "eat", "label": "Eat", "description": "Bring flattened fingers to your mouth",
             "tip": "Tap your lips.", "diagram_url": None},
            {"id": "drink", "label": "Drink", "description": "Mime holding a cup and tipping it",
             "tip": "Tilt your hand.", "diagram_url": None},
            {"id": "water", "label": "Water", "description": "Tap your chin with a W hand",
             "tip": "Use three fingers.", "diagram_url": None},
            {"id": "milk", "label": "Milk", "description": "Squeeze your fist as if milking a cow",
             "tip": "Open and close your fist.", "diagram_url": None},
            {"id": "apple", "label": "Apple", "description": "Twist your fist on your cheek",
             "tip": "Use your knuckle.", "diagram_url": None},
        ],
    },
    {
        "id": "animals",
        "title": "Animals",
        "order": 5,
        "phrases": [
            {"id": "cat", "label": "Cat", "description": "Pinch near your cheek and pull away (whiskers)",
             "tip": "Both hands for whiskers.", "diagram_url": None},
            {"id": "dog", "label": "Dog", "description": "Snap your fingers or pat your leg",
             "tip": "Snap once.", "diagram_url": None},
            {"id": "fish", "label": "Fish", "description": "Wiggle your flat hand forward like a swimming fish",
             "tip": "Keep palm sideways.", "diagram_url": None},
            {"id": "bird", "label": "Bird", "description": "Open and close finger and thumb near your mouth (beak)",
             "tip": "Use index and thumb.", "diagram_url": None},
            {"id": "turtle", "label": "Turtle", "description": "Cover one fist with the other and wiggle your thumb",
             "tip": "Thumb peeks out like a head.", "diagram_url": None},
        ],
    },
]

# ── Helper for flat list of all signs ───────────────────────────────
ALL_PRACTICE_SIGNS = ALPHABET_SIGNS + NUMBER_SIGNS

ALL_STUDY_PHRASES = []
for topic in STUDY_TOPICS:
    for phrase in topic["phrases"]:
        ALL_STUDY_PHRASES.append({**phrase, "topic_id": topic["id"], "topic_title": topic["title"]})
