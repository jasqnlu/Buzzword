// Core types for the Buzzword rule engine.
// The engine is pure: it never calls Apps Script, so the same code runs in
// Vitest, in the browser preview, and inside the add-on.

export type Pack = 'ap' | 'house';

/** Where a rule may fire relative to direct quotes. */
export type QuoteMode =
  | 'apply' // everywhere (formatting rules: dates, times, money...)
  | 'skip' // only outside quotes (word-choice rules: towards -> toward)
  | 'only'; // only inside quotes (filler words)

export type Category =
  | 'Dates'
  | 'Times'
  | 'Numbers'
  | 'Places'
  | 'Words'
  | 'Punctuation'
  | 'Quotes'
  | 'People'
  | 'Sports';

export interface Settings {
  /** The B guide says "45 percent"; AP (since 2019) says "45%". */
  percentStyle: 'word' | 'symbol';
  /** House style deletes fillers; AP replaces them with an ellipsis. */
  fillerStyle: 'delete' | 'ellipsis';
}

export const DEFAULT_SETTINGS: Settings = {
  percentStyle: 'word',
  fillerStyle: 'delete',
};

/** What a rule reports before the engine adds rule metadata. */
export interface Hit {
  start: number;
  end: number;
  /** Replacement text. Omit for sidebar-only flags with no single right fix. */
  replacement?: string;
  /** Override the rule's id (one matcher can report several related rules). */
  ruleId?: string;
  /** Extra hint for sidebar-only flags, e.g. "Add a.m. or p.m." */
  hint?: string;
}

export interface RuleInfo {
  id: string;
  pack: Pack;
  category: Category;
  /** Short name shown on the card. */
  title: string;
  /** true = becomes a Google Docs suggestion; false = sidebar card only. */
  safe: boolean;
  inQuotes: QuoteMode;
  /** One line, our own words. */
  reason: string;
  /** Two or three lines with an example, shown under "Why?". */
  why: string;
  /** Higher wins when two matches overlap with the same length. */
  priority?: number;
}

export interface Rule extends RuleInfo {
  find(ctx: TextContext, settings: Settings): Hit[];
  /** Extra rules reported by this matcher (via Hit.ruleId). */
  related?: RuleInfo[];
}

export interface Issue {
  ruleId: string;
  pack: Pack;
  category: Category;
  title: string;
  safe: boolean;
  reason: string;
  why: string;
  start: number;
  end: number;
  original: string;
  replacement: string | null;
  hint?: string;
  inQuote: boolean;
}

/** Read-only helpers about the text, computed once per check. */
export interface TextContext {
  text: string;
  /** Is this offset inside a direct quote? */
  inQuote(offset: number): boolean;
  /** Does a sentence start at this offset (ignoring an opening quote)? */
  isSentenceStart(offset: number): boolean;
  /** Is the text right after `end` the end of a sentence (or paragraph)? */
  endsSentence(end: number): boolean;
}
