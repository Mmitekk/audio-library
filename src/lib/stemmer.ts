/**
 * Russian morphological stemmer - conservative suffix stripping approach
 * Removes common Russian endings to get the stem of a word.
 * Kept conservative to avoid over-matching (e.g. "ветер" should not match "вечер").
 */
export function russianStem(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;

  // Remove typical Russian adjective endings (longest first)
  w = w.replace(/(?:его|ому|ыми|ими|его|ому|ому|ыми|ими)$/i, '');
  // Remove adjective/possessive endings
  w = w.replace(/(?:ая|яя|ое|ее|ые|ие|ой|ей|ий|ый|ый|ою|ею|ую|ого|ому|ым|им|ых|их|ою)$/i, '');

  // Remove verb endings (participles, gerunds, conjugations)
  w = w.replace(/(?:вшись|вши|ем|ешь|ет|ем|ете|ет|им|ишь|ит|ите|ят|ют|уют|ат|ют|ул|ула|уло|ули|лся|лась|лось|лись|ен|ена|ено|ены|ан|ана|ано|аны|гся|ться|ясь|вший|вшая|вшее|вшие|овый|овая|овое|овые|ового|овой|овому|овыми|овом|ин|ина|ину|иной|иной|иную|иного|иному|иными|ином|он|она|оно|оных|оному|онами|оном|ень|еня|енью|енем|еньем|ья|ью|ье|ьё|ьего|ьему|ьими|ьём)$/i, '');

  // Remove noun endings (longest first, more conservative)
  w = w.replace(/(?:ами|ями|ость|остью|остями|ствие|ствием|ствиями|ением|ениями|ениями|тель|теля|телем|телей|телем|телями|телях|ейка|ейке|ейку|ейкой|ейком|ёнок|ёнка|ёнку|ёнком|очка|очку|очкой|очке|ечка|ечку|ечкой|ечке|ичка|ичку|ичкой|ичке|ушка|ушку|ушкой|ушке|юшка|юшку|юшкой|юшке|ышка|ышку|ышкой|ышке|онька|оньку|онькой|оньке|ник|ника|нику|ником|никах|чик|чика|чику|чиком|чиках|щик|щика|щику|щиком|щиках|ов|ев|ёв|ов|ей|ин|ин|ам|ям|ах|ях|ом|ем|ём|а|о|у|е|и|ы|ь|ю|я)$/i, '');

  // Ensure we have at least 3 characters for meaningful matching
  if (w.length < 3) return word.toLowerCase().trim();

  return w;
}

/**
 * Check if a query matches a text using Russian stemming
 * Returns true if ALL query stems are found in the text stems (AND logic).
 * A match means: the text stem STARTS WITH or CONTAINS the query stem as a substring,
 * but the query stem must be at least 3 chars long to avoid false positives.
 */
export function stemMatch(query: string, text: string): boolean {
  if (!query.trim()) return false;

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const textWords = text.toLowerCase().split(/[\s_\-./()\\[\]]+/).filter(w => w.length > 0);

  const queryStems = queryWords.map(russianStem).filter(s => s.length > 0);
  const textStems = textWords.map(russianStem).filter(s => s.length > 0);

  // ALL query words must match (AND logic)
  for (const qs of queryStems) {
    let matched = false;

    // Direct substring check first
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    if (textLower.includes(queryLower)) {
      continue; // This query word matched
    }

    for (const ts of textStems) {
      // Text stem must contain the query stem (query is more specific)
      // but query stem must be at least 3 chars to avoid false positives
      if (qs.length >= 3 && ts.includes(qs)) {
        matched = true;
        break;
      }
      // Also allow exact match for short stems
      if (ts === qs) {
        matched = true;
        break;
      }
      // Allow if text stem starts with query stem AND query stem is substantial
      if (qs.length >= 4 && ts.startsWith(qs)) {
        matched = true;
        break;
      }
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

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const textWords = text.split(/(\s+)/);

  const result = textWords.map(word => {
    const trimmed = word.trim();
    if (!trimmed) return word;

    for (const qw of queryWords) {
      const stem = russianStem(qw);
      const wordStem = russianStem(trimmed);
      if (
        (stem.length >= 3 && wordStem.includes(stem)) ||
        wordStem === stem ||
        (stem.length >= 4 && wordStem.startsWith(stem)) ||
        trimmed.toLowerCase().includes(qw.toLowerCase())
      ) {
        return `<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">${word}</mark>`;
      }
    }
    return word;
  });

  return result.join('');
}
