import type { TextContext } from './types';

const OPEN_QUOTES = new Set(['“', '"']);
const CLOSE_QUOTES = new Set(['”', '"']);

/**
 * Finds direct-quote spans. Quotes never cross a paragraph break, which also
 * stops one unmatched quote from flipping the rest of the story.
 * Straight quotes: an opening " follows a space, a paragraph start or an
 * opening bracket; anything else is treated as closing.
 */
export function findQuoteSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let openAt = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      openAt = -1;
      continue;
    }
    if (openAt < 0) {
      if (ch === '“' || (ch === '"' && (i === 0 || /[\s(\[—–-]/.test(text[i - 1])))) {
        openAt = i;
      }
    } else if (ch === '”' || ch === '"') {
      spans.push([openAt, i + 1]);
      openAt = -1;
    }
  }
  return spans;
}

export function createContext(text: string): TextContext {
  const spans = findQuoteSpans(text);

  const inQuote = (offset: number): boolean => {
    for (const [s, e] of spans) {
      if (offset > s && offset < e) return true;
      if (s > offset) break;
    }
    return false;
  };

  const isSentenceStart = (offset: number): boolean => {
    let i = offset - 1;
    // Skip an opening quote or bracket directly before the word.
    while (i >= 0 && (OPEN_QUOTES.has(text[i]) || text[i] === '(' || text[i] === '‘' || text[i] === "'")) i--;
    if (i < 0) return true;
    if (text[i] === '\n') return true;
    if (!/\s/.test(text[i])) return false;
    while (i >= 0 && /[ \t]/.test(text[i])) i--;
    if (i < 0 || text[i] === '\n') return true;
    // Skip closing quotes after the end punctuation: ...done.” Next
    while (i >= 0 && (CLOSE_QUOTES.has(text[i]) || text[i] === '’' || text[i] === ')')) i--;
    return i >= 0 && /[.!?]/.test(text[i]) && !endsWithAbbreviation(text, i);
  };

  const endsSentence = (end: number): boolean => {
    const rest = text.slice(end);
    return /^(\s*\n|\s*$|[”"’)]*\s+[A-Z“"])/.test(rest);
  };

  return { text, inQuote, isSentenceStart, endsSentence };
}

// A period that ends a common abbreviation does not end the sentence.
const ABBREVIATIONS = /(?:^|[\s(])(?:Mr|Mrs|Ms|Dr|St|Ave|Blvd|Jan|Feb|Aug|Sept|Oct|Nov|Dec|Gov|Sen|Rep|Lt|Gen|Col|Sgt|No|vs|a\.m|p\.m|[A-Z])\.$/;

function endsWithAbbreviation(text: string, periodIndex: number): boolean {
  if (text[periodIndex] !== '.') return false;
  const before = text.slice(Math.max(0, periodIndex - 8), periodIndex + 1);
  return ABBREVIATIONS.test(before);
}
