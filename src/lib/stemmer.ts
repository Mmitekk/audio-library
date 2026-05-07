/**
 * Russian morphological stemmer - simple suffix stripping approach
 * Removes common Russian endings to get the stem of a word
 */
export function russianStem(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 2) return w;

  // Remove typical Russian noun/adjective endings (longest first to avoid partial matches)
  w = w.replace(/(?:ими|ыми|ениями|аниями|ятиями|ствием|ствиями|остями|ествами|еньями|еньем|ениями|оями|оями|елями|елями)$/i, '');
  w = w.replace(/(?:ая|яя|ое|ее|ые|ие|ого|ому|ым|им|ого|ому|ыми|ими|ой|ей|ий|ый|ый|ою|ею|ою|ую|а|о|у|е|и|ы|ь|ю|я)$/i, '');

  // Remove verb endings
  w = w.replace(/(?:емся|уетесь|иваются|аются|овались|евались|овались|ивались|овать|евать|ивать|оваться|еваться|иваться|уется|уется|ется|ется|ются|ются|атся|атся|им|ишь|ит|ите|ем|ешь|ет|ют|ут|ул|ула|уло|ули|лся|лась|лось|лись|ен|ена|ено|ены|ан|ана|ано|аны|гся|ться|ного|ному|ным|ными|ном|вший|вшая|вшее|вшие|вой|вого|вому|вым|вими|вом)$/i, '');

  // Remove more common suffixes
  w = w.replace(/(?:ость|ость|ость|ость|ствие|ствие|ствие|ствие|тель|тель|тель|тель|очек|ек|ик|ок|ечк|ичк|ушк|юшк|ышк|к|нк|енк|инк|оньк|оньк|ель|ель|арь|яр|тель|тель|ник|чик|щик|лов|тель)$/i, '');

  // Ensure we have at least 2 characters
  if (w.length < 2) return word.toLowerCase().trim();

  return w;
}

/**
 * Check if a query matches a text using Russian stemming
 * Returns true if any stem from query matches any stem from text
 */
export function stemMatch(query: string, text: string): boolean {
  if (!query.trim()) return false;

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const textWords = text.toLowerCase().split(/[\s_\-./()\\[\]]+/).filter(w => w.length > 0);

  const queryStems = queryWords.map(russianStem).filter(s => s.length > 0);
  const textStems = textWords.map(russianStem).filter(s => s.length > 0);

  for (const qs of queryStems) {
    for (const ts of textStems) {
      if (ts.includes(qs) || qs.includes(ts)) {
        return true;
      }
    }
  }

  // Also check direct substring match
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  if (textLower.includes(queryLower)) return true;

  return false;
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
      if (wordStem.includes(stem) || stem.includes(wordStem) || trimmed.toLowerCase().includes(qw.toLowerCase())) {
        return `<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">${word}</mark>`;
      }
    }
    return word;
  });

  return result.join('');
}
