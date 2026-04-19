import { fetchJson } from '../../lib/api';

export function normalizePracticeEntry(entry, fallbackType) {
  const id = String(entry.id || '').trim();
  const label = String(entry.label || '').trim();
  const type = entry.type || fallbackType;

  return {
    ...entry,
    id,
    label,
    type,
    description: entry.description || (type === 'alphabet'
      ? `Form the letter '${label}' with your hand.`
      : `Form the number '${label}' with your hand.`),
    tip: entry.tip || 'Keep your hand centered and clearly visible.',
  };
}

export async function loadPracticeSigns() {
  const [alphabet, numbers] = await Promise.all([
    fetchJson('/api/practice/alphabet'),
    fetchJson('/api/practice/numbers'),
  ]);

  return {
    alphabet: Array.isArray(alphabet) ? alphabet.map((entry) => normalizePracticeEntry(entry, 'alphabet')) : [],
    numbers: Array.isArray(numbers) ? numbers.map((entry) => normalizePracticeEntry(entry, 'number')) : [],
  };
}
