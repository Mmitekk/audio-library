/**
 * Russian morphological stemmer
 *
 * Core approach:
 *   1. Handle беглые (fleeting) vowels: ветер → ветр, день → ден, сон → сн
 *   2. Strip known Russian endings (adjective, verb, noun)
 *   3. Ensure minimum stem length of 3 chars
 */
export function russianStem(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;

  // ─── Step 1: Fleeting vowels (беглые гласные) ───
  // In Russian some nouns have a vowel that appears in nominative but drops in oblique cases:
  //   ветер → ветра,   сон → сна,   день → дня,   огонь → огня
  // Pattern: C + е/ё + C(end)  →  strip the fleeting vowel
  w = w.replace(/([а-яёа-яё])(е|ё)([бвгджзклмнпрстфхцчшщ])$/i, '$1$3');

  // ─── Step 2: Adjective endings (longest first) ───
  w = w.replace(/(?:его|ому|ыми|ими)$/i, '');
  w = w.replace(/(?:ая|яя|ое|ее|ые|ие|ой|ей|ий|ый|ою|ею|ую|ого|ому|ым|им|ых|их)$/i, '');

  // ─── Step 3: Verb / participle endings ───
  w = w.replace(
    /(?:вшись|вши|ется|утся|имся|ются|овались|евались|овать|евать|ивать|оваться|еваться|иваться|уется|ется|атся|им|ишь|ит|ите|ем|ешь|ет|ют|ут|ул|ула|уло|ули|лся|лась|лось|лись|ена|ено|ены|ана|ано|аны|гся|ться|ясь|вший|вшая|вшее|вшие|овый|овая|овое|овые|иному|иными|оном)$/i,
    ''
  );

  // ─── Step 4: Noun endings (longest first) ───
  w = w.replace(
    /(?:ами|ями|ость|остью|остями|ствие|ствием|ствиями|ением|ениями|тель|теля|телем|телей|телями|телях|ейка|ейке|ейку|ейкой|ейком|ёнок|ёнка|ёнку|ёнком|очка|очку|очкой|очке|ечка|ечку|ечкой|ечке|ичка|ичку|ичкой|ичке|ушка|ушку|ушкой|ушке|юшка|юшку|юшкой|юшке|ышка|ышку|ышкой|ышке|онька|оньку|онькой|оньке|ник|ника|нику|ником|никах|чик|чика|чику|чиком|щика|щику|щиком|ов|ев|ёв|ей|ам|ям|ах|ях|ом|ем|ём|а|о|у|е|и|ы|ь|ю|я)$/i,
    ''
  );

  // Ensure minimum 3 characters
  if (w.length < 3) return word.toLowerCase().trim();

  return w;
}

/**
 * Generate multiple stem variants for a word, to improve recall.
 * Returns the main stem plus optional "shortened" variants.
 */
function stemVariants(word: string): string[] {
  const main = russianStem(word);
  const variants = [main];

  // Also produce a variant without the last consonant (for fuzzy matching)
  // e.g. "ветер" → main "ветр" → also try "вет"
  if (main.length >= 4) {
    const trimmed = main.slice(0, -1);
    if (trimmed.length >= 3) {
      variants.push(trimmed);
    }
  }

  return variants;
}

/**
 * Check if a query matches a text using Russian stemming.
 * Uses AND logic: ALL query words must match.
 */
export function stemMatch(query: string, text: string): boolean {
  if (!query.trim()) return false;

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const textWords = text
    .toLowerCase()
    .split(/[\s_\-./()\\[\]]+/)
    .filter((w) => w.length > 0);

  const queryVariants = queryWords.map(stemVariants);
  const textVariants = textWords.map(stemVariants);

  // Direct substring check on raw text
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  for (const qVars of queryVariants) {
    let matched = false;

    // Direct substring on raw text
    if (textLower.includes(queryLower)) {
      continue;
    }

    // Stem-based matching
    for (const qv of qVars) {
      if (qv.length < 3) continue;

      for (const tVars of textVariants) {
        for (const tv of tVars) {
          if (tv.includes(qv)) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (matched) break;
    }

    if (!matched) return false;
  }

  return true;
}

/**
 * Highlight matching parts in text
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const textWords = text.split(/(\s+)/);

  const result = textWords.map((word) => {
    const trimmed = word.trim();
    if (!trimmed) return word;

    for (const qw of queryWords) {
      const variants = stemVariants(qw);
      const wordVariants = stemVariants(trimmed);

      // Direct substring
      if (trimmed.toLowerCase().includes(qw.toLowerCase())) {
        return `<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">${word}</mark>`;
      }

      // Stem match
      for (const sv of variants) {
        if (sv.length < 3) continue;
        for (const wv of wordVariants) {
          if (wv.includes(sv)) {
            return `<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">${word}</mark>`;
          }
        }
      }
    }
    return word;
  });

  return result.join('');
}
