/**
 * Exercise name matching. People (and Claude) name lifts inconsistently: "DB Row",
 * "dumbbell rows", "Row - Dumbbell". Names are compared by a normalized key, and unknown names
 * are matched against existing exercises by similarity.
 */

/** Common gym abbreviations, expanded before comparing. Keys are single lowercase tokens. */
const ABBREVIATIONS: Record<string, string> = {
  db: 'dumbbell',
  dbs: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ez: 'ez bar',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  rdls: 'romanian deadlift',
  sldl: 'stiff leg deadlift',
  bp: 'bench press',
  bw: 'bodyweight',
  inc: 'incline',
  dec: 'decline',
  ext: 'extension',
  lat: 'lat',
  pulldown: 'pulldown',
  pullup: 'pull up',
  pullups: 'pull up',
  chinup: 'chin up',
  chinups: 'chin up',
  pushup: 'push up',
  pushups: 'push up',
};

/** Words that end in "s" but aren't plurals. */
const NOT_PLURAL = new Set(['press', 'triceps', 'biceps', 'abs', 'glutes', 'lats', 'calves']);

function singular(token: string): string {
  if (token.length <= 3 || NOT_PLURAL.has(token) || token.endsWith('ss')) return token;
  // presses → press, crunches → crunch, boxes → box
  if (/(ss|sh|ch|x|z)es$/.test(token)) return token.slice(0, -2);
  return token.endsWith('s') ? token.slice(0, -1) : token;
}

/** Lowercase words with punctuation removed, abbreviations expanded and plurals singularized. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .flatMap((token) => (ABBREVIATIONS[token] ?? token).split(' '))
    .map(singular);
}

/** The key stored as `nameKey`: "DB Rows" and "dumbbell row" both give "dumbbell row". */
export function nameKey(name: string): string {
  return nameTokens(name).join(' ');
}

/** Same words in any order: "Row - Dumbbell" matches "dumbbell row". */
function orderFreeKey(name: string): string {
  return [...nameTokens(name)].sort().join(' ');
}

/** True when two names refer to the same exercise. */
export function sameExerciseName(a: string, b: string): boolean {
  return nameKey(a) === nameKey(b) || orderFreeKey(a) === orderFreeKey(b);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

/**
 * 0..1: how alike two exercise names are, combining shared words (order-free) with spelling
 * distance (catches typos like "benhc press").
 */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(nameTokens(a));
  const tokensB = new Set(nameTokens(b));
  const shared = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  const wordScore = union === 0 ? 0 : shared / union;

  const keyA = orderFreeKey(a);
  const keyB = orderFreeKey(b);
  const longest = Math.max(keyA.length, keyB.length);
  const spellingScore = longest === 0 ? 0 : 1 - levenshtein(keyA, keyB) / longest;

  return Math.round(Math.max(wordScore, spellingScore) * 100) / 100;
}

/** Similarity at or above this counts as "did you mean …?". */
export const SIMILAR_THRESHOLD = 0.5;
