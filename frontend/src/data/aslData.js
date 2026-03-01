/*
  Static ASL data for the frontend.
  Mirrors the backend data so the UI can render instantly,
  while the API is the source of truth.
*/

// ── Alphabet Signs ─────────────────────────────────────────────
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
  id: letter,
  label: letter,
  type: "alphabet",
  description: `Form the letter '${letter}' with your hand`,
  tip: "Ensure your hand is clearly visible in the frame.",
  diagramUrl: null,
}));

// ── Number Signs ───────────────────────────────────────────────
export const NUMBERS = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  label: String(i),
  type: "number",
  description: `Form the number '${i}' with your hand`,
  tip: "Keep your hand steady and clearly visible.",
  diagramUrl: null,
}));

// ── Study Topics ───────────────────────────────────────────────
export const STUDY_TOPICS = [
  {
    id: "greetings",
    title: "Greetings",
    order: 1,
    icon: "👋",
    phrases: [
      { id: "hello", label: "Hello", description: "Form the sign 'Hello' with your hand", tip: "Ensure your hand is clearly visible in the frame." },
      { id: "goodbye", label: "Goodbye", description: "Wave goodbye with an open hand", tip: "Move your hand smoothly." },
      { id: "thank_you", label: "Thank You", description: "Touch your chin and move hand forward", tip: "Start from your chin." },
      { id: "please", label: "Please", description: "Rub your chest in a circular motion", tip: "Use your dominant hand." },
      { id: "sorry", label: "Sorry", description: "Make a fist and rub it in a circle on your chest", tip: "Express sincerity with your face." },
    ],
  },
  {
    id: "family",
    title: "Family",
    order: 2,
    icon: "👨‍👩‍👧‍👦",
    phrases: [
      { id: "mother", label: "Mother", description: "Tap your chin with your thumb (open hand)", tip: "Keep fingers spread." },
      { id: "father", label: "Father", description: "Tap your forehead with your thumb (open hand)", tip: "Keep fingers spread." },
      { id: "sister", label: "Sister", description: "Trace jaw then bring hands together", tip: "Smile while signing!" },
      { id: "brother", label: "Brother", description: "Touch forehead then bring hands together", tip: "Keep your movements clear." },
      { id: "baby", label: "Baby", description: "Rock your arms as if cradling a baby", tip: "Gentle rocking motion." },
    ],
  },
  {
    id: "colors",
    title: "Colors",
    order: 3,
    icon: "🎨",
    phrases: [
      { id: "red", label: "Red", description: "Drag finger down from your lip", tip: "Use your index finger." },
      { id: "blue", label: "Blue", description: "Twist the letter B in the air", tip: "Shake your hand slightly." },
      { id: "green", label: "Green", description: "Twist the letter G in the air", tip: "Flick your wrist." },
      { id: "yellow", label: "Yellow", description: "Shake the letter Y hand", tip: "Twist at the wrist." },
      { id: "black", label: "Black", description: "Drag your index finger across your forehead", tip: "One smooth motion." },
    ],
  },
  {
    id: "food",
    title: "Food",
    order: 4,
    icon: "🍎",
    phrases: [
      { id: "eat", label: "Eat", description: "Bring flattened fingers to your mouth", tip: "Tap your lips." },
      { id: "drink", label: "Drink", description: "Mime holding a cup and tipping it", tip: "Tilt your hand." },
      { id: "water", label: "Water", description: "Tap your chin with a W hand", tip: "Use three fingers." },
      { id: "milk", label: "Milk", description: "Squeeze your fist as if milking a cow", tip: "Open and close your fist." },
      { id: "apple", label: "Apple", description: "Twist your fist on your cheek", tip: "Use your knuckle." },
    ],
  },
  {
    id: "animals",
    title: "Animals",
    order: 5,
    icon: "🐾",
    phrases: [
      { id: "cat", label: "Cat", description: "Pinch near your cheek and pull away (whiskers)", tip: "Both hands for whiskers." },
      { id: "dog", label: "Dog", description: "Snap your fingers or pat your leg", tip: "Snap once." },
      { id: "fish", label: "Fish", description: "Wiggle your flat hand forward like a swimming fish", tip: "Keep palm sideways." },
      { id: "bird", label: "Bird", description: "Open and close finger and thumb near your mouth (beak)", tip: "Use index and thumb." },
      { id: "turtle", label: "Turtle", description: "Cover one fist with the other and wiggle your thumb", tip: "Thumb peeks out like a head." },
    ],
  },
];
