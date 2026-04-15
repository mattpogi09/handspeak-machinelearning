/*
  Static ASL data for the frontend.
  Mirrors the backend data so the UI can render instantly,
  while the API is the source of truth.
*/

const ALL_SIGNS = [
  'TV', 'after', 'airplane', 'all', 'alligator', 'animal', 'another', 'any',
  'apple', 'arm', 'aunt', 'awake', 'backyard', 'bad', 'balloon', 'bath',
  'because', 'bed', 'bedroom', 'bee', 'before', 'beside', 'better', 'bird',
  'black', 'blow', 'blue', 'boat', 'book', 'boy', 'brother', 'brown', 'bug',
  'bye', 'callonphone', 'can', 'car', 'carrot', 'cat', 'cereal', 'chair',
  'cheek', 'child', 'chin', 'chocolate', 'clean', 'close', 'closet', 'cloud',
  'clown', 'cow', 'cowboy', 'cry', 'cut', 'cute', 'dad', 'dance', 'dirty',
  'dog', 'doll', 'donkey', 'down', 'drawer', 'drink', 'drop', 'dry', 'dryer',
  'duck', 'ear', 'elephant', 'empty', 'every', 'eye', 'face', 'fall', 'farm',
  'fast', 'feet', 'find', 'fine', 'finger', 'finish', 'fireman', 'first',
  'fish', 'flag', 'flower', 'food', 'for', 'frenchfries', 'frog', 'garbage',
  'gift', 'giraffe', 'girl', 'give', 'glasswindow', 'go', 'goose', 'grandma',
  'grandpa', 'grass', 'green', 'gum', 'hair', 'happy', 'hat', 'hate', 'have',
  'haveto', 'head', 'hear', 'helicopter', 'hello', 'hen', 'hesheit', 'hide',
  'high', 'home', 'horse', 'hot', 'hungry', 'icecream', 'if', 'into',
  'jacket', 'jeans', 'jump', 'kiss', 'kitty', 'lamp', 'later', 'like',
  'lion', 'lips', 'listen', 'look', 'loud', 'mad', 'make', 'man', 'many',
  'milk', 'minemy', 'mitten', 'mom', 'moon', 'morning', 'mouse', 'mouth',
  'nap', 'napkin', 'night', 'no', 'noisy', 'nose', 'not', 'now', 'nuts',
  'old', 'on', 'open', 'orange', 'outside', 'owie', 'owl', 'pajamas', 'pen',
  'pencil', 'penny', 'person', 'pig', 'pizza', 'please', 'police', 'pool',
  'potty', 'pretend', 'pretty', 'puppy', 'puzzle', 'quiet', 'radio', 'rain',
  'read', 'red', 'refrigerator', 'ride', 'room', 'sad', 'same', 'say',
  'scissors', 'see', 'shhh', 'shirt', 'shoe', 'shower', 'sick', 'sleep',
  'sleepy', 'smile', 'snack', 'snow', 'stairs', 'stay', 'sticky', 'store',
  'story', 'stuck', 'sun', 'table', 'talk', 'taste', 'thankyou', 'that',
  'there', 'think', 'thirsty', 'tiger', 'time', 'tomorrow', 'tongue',
  'tooth', 'toothbrush', 'touch', 'toy', 'tree', 'uncle', 'underwear', 'up',
  'vacuum', 'wait', 'wake', 'water', 'wet', 'weus', 'where', 'white', 'who',
  'why', 'will', 'wolf', 'yellow', 'yes', 'yesterday', 'yourself', 'yucky',
  'zebra', 'zipper',
];

const TOPIC_ICONS = ['👋', '👨‍👩‍👧‍👦', '🎨', '🍎', '🐾', '🧩', '📚', '🚀', '🌤️', '🎯'];

const WORDS_PER_ISLAND = 20;

const humanizeWord = (word) => {
  const lower = String(word || '').toLowerCase();
  if (lower === 'thankyou') return 'THANK YOU';
  if (lower === 'callonphone') return 'CALL ON PHONE';
  if (lower === 'glasswindow') return 'GLASS WINDOW';
  if (lower === 'frenchfries') return 'FRENCH FRIES';
  if (lower === 'toothbrush') return 'TOOTH BRUSH';
  if (lower === 'hesheit') return 'HE/SHE/IT';
  if (lower === 'weus') return 'WE/US';
  if (lower === 'minemy') return 'MINE/MY';
  return String(word);
};

const buildWordEntry = (word, index, islandId) => {
  const label = humanizeWord(word);
  return {
    id: word.toLowerCase(),
    label,
    type: 'word',
    description: `Practice the ASL sign for ${label}.`,
    tip: 'Keep your hand centered and clearly visible in the frame.',
    diagramUrl: null,
    order: index + 1,
    chapterId: islandId,
  };
};

// ── Alphabet Signs ─────────────────────────────────────────────
// Match backend model: A-Y, excluding J (motion sign, not static)
export const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I",
  "K", "L", "M", "N", "O", "P", "Q", "R",
  "S", "T", "U", "V", "W", "X", "Y"
].map((letter, index) => ({
  id: letter.toLowerCase(),
  label: letter,
  type: "alphabet",
  order: index + 1,
  description: `Form the letter '${letter}' with your hand`,
  tip: "Ensure your hand is clearly visible in the frame.",
  diagramUrl: null,
  modelType: "static",
}));

// ── Alphabet Topics (for study) ───────────────────────────────
export const ALPHABET_TOPICS = Array.from({ length: Math.ceil(ALPHABET.length / 6) }, (_, chapterIdx) => {
  const sliceStart = chapterIdx * 6;
  const letters = ALPHABET.slice(sliceStart, sliceStart + 6);
  
  return {
    id: `alphabet-chapter-${chapterIdx + 1}`,
    title: `Alphabet ${chapterIdx + 1}`,
    order: chapterIdx + 1,
    icon: "🔤",
    type: "alphabet",
    phrases: letters.map((letter) => ({
      id: letter.id,
      label: letter.label,
      description: letter.description,
      tip: letter.tip,
      letter: letter.label,
      modelType: "static",
    })),
  };
});

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
  ...Array.from({ length: Math.ceil(ALL_SIGNS.length / WORDS_PER_ISLAND) }, (_, islandIndex) => {
    const sliceStart = islandIndex * WORDS_PER_ISLAND;
    const words = ALL_SIGNS.slice(sliceStart, sliceStart + WORDS_PER_ISLAND);
    const islandId = `chapter-${islandIndex + 1}`;

    return {
      id: islandId,
      title: `Chapter ${islandIndex + 1}`,
      order: islandIndex + 1,
      icon: TOPIC_ICONS[islandIndex % TOPIC_ICONS.length],
      phrases: words.map((word, wordIndex) => {
        const entry = buildWordEntry(word, sliceStart + wordIndex, islandId);
        return {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          tip: entry.tip,
          word: word,
          modelType: "dynamic",
        };
      }),
    };
  }),
];
