export const HUMANIZED_WORDS = {
  THANKYOU: 'THANK YOU',
};

export function humanizeWord(word) {
  if (!word) return '';
  return HUMANIZED_WORDS[word.toUpperCase()] || word.toUpperCase();
}

export function normalizeWordEntry(entry, index = 0) {
  const rawWord = entry.word || entry.label || entry.id || '';
  const word = rawWord.toString().toUpperCase();
  const id = entry.id || word.toLowerCase();
  const label = entry.label || humanizeWord(word);

  return {
    ...entry,
    id,
    word,
    label,
    order: entry.order ?? index + 1,
    chapter_id: entry.chapter_id || `chapter-${Math.floor(index / 20) + 1}`,
    description: entry.description || `Practice the ASL sign for ${label}.`,
    tip: entry.tip || 'Keep your hand centered and clearly visible in the frame.',
  };
}

export function groupWordsByChapter(words, chapterSize = 20) {
  const grouped = [];

  words.forEach((word, index) => {
    const chapterIndex = Math.floor(index / chapterSize);
    if (!grouped[chapterIndex]) {
      grouped[chapterIndex] = {
        id: `chapter-${chapterIndex + 1}`,
        title: `Chapter ${chapterIndex + 1}`,
        order: chapterIndex + 1,
        words: [],
      };
    }

    grouped[chapterIndex].words.push(word);
  });

  return grouped;
}

export function findWordIndex(words, wordId) {
  return words.findIndex((word) => word.id === wordId || word.word.toLowerCase() === wordId);
}

export function getNextWord(words, currentWordId) {
  const currentIndex = findWordIndex(words, currentWordId);
  if (currentIndex < 0) return words[0] || null;
  return words[currentIndex + 1] || null;
}

export function getPreviousWord(words, currentWordId) {
  const currentIndex = findWordIndex(words, currentWordId);
  if (currentIndex <= 0) return null;
  return words[currentIndex - 1] || null;
}