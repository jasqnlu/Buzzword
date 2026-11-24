import type { Hit, TextContext } from '../types';

/** Run a global regex over the text and turn matches into hits. */
export function regexHits(
  ctx: TextContext,
  re: RegExp,
  toHit: (m: RegExpExecArray) => Hit | Hit[] | null | undefined,
): Hit[] {
  if (!re.global) throw new Error(`Rule regex must be global: ${re}`);
  const hits: Hit[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ctx.text))) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    const out = toHit(m);
    if (Array.isArray(out)) hits.push(...out);
    else if (out) hits.push(out);
  }
  return hits;
}

/** Give the replacement the same leading capital as the original. */
export function matchCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  const o = original.trimStart()[0];
  if (o && o === o.toUpperCase() && o !== o.toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Handles the sentence-ending period around abbreviations.
 * - "123 Main Street." -> "123 Main St." (don't double the period)
 * - "Fresno, Calif. Then" -> "Fresno, California. Then" (keep the sentence's period)
 */
export function fixPeriods(ctx: TextContext, hit: Hit): Hit {
  if (hit.replacement === undefined) return hit;
  const original = ctx.text.slice(hit.start, hit.end);
  let { end, replacement } = hit;
  if (replacement.endsWith('.') && ctx.text[end] === '.') {
    end += 1; // swallow the sentence's period into the abbreviation's
  } else if (original.endsWith('.') && !replacement.endsWith('.') && ctx.endsSentence(hit.end)) {
    replacement += '.';
  }
  return { ...hit, end, replacement };
}

/** A hit that only changes text if the replacement differs. */
export function changed(start: number, original: string, replacement: string, extra: Partial<Hit> = {}): Hit | null {
  if (original === replacement) return null;
  return { start, end: start + original.length, replacement, ...extra };
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** AP form of a month next to a specific date. Only names longer than five letters shorten. */
export const MONTH_WITH_DATE: Record<string, string> = {
  January: 'Jan.', February: 'Feb.', March: 'March', April: 'April', May: 'May', June: 'June',
  July: 'July', August: 'Aug.', September: 'Sept.', October: 'Oct.', November: 'Nov.', December: 'Dec.',
};

/** Every way a month gets written in drafts, mapped to the full name. */
export const MONTH_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const m of MONTHS) {
    map[m] = m;
    map[m.slice(0, 3)] = m;
  }
  map.Sept = 'September';
  map.Jun = 'June';
  map.Jul = 'July';
  return map;
})();

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SMALL_NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
];

export const ORDINAL_WORDS: Record<string, string> = {
  '1st': 'First', '2nd': 'Second', '3rd': 'Third', '4th': 'Fourth', '5th': 'Fifth',
  '6th': 'Sixth', '7th': 'Seventh', '8th': 'Eighth', '9th': 'Ninth',
};
