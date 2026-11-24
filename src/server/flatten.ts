// Turns a Docs API document (read with SUGGESTIONS_INLINE) into plain text the
// rule engine can read, plus a map from text offsets back to document indexes.
// Pure code: no Apps Script calls, so it's tested with Vitest.
//
// Docs API indexes count UTF-16 code units, the same as JavaScript strings, so
// an offset inside a text run maps to `run.startIndex + offset` exactly.

/** Stands in for anything the rules must not read across: images, pending suggestions. */
export const BREAK = '\uFFFC';

// Minimal shapes of the Docs API JSON we use.
export interface DocsTextRun {
  content?: string;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
}
export interface DocsParagraphElement { startIndex?: number; endIndex?: number; textRun?: DocsTextRun }
export interface DocsParagraph { elements?: DocsParagraphElement[] }
export interface DocsTableCell { content?: DocsStructuralElement[] }
export interface DocsTable { tableRows?: Array<{ tableCells?: DocsTableCell[] }> }
export interface DocsStructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: DocsParagraph;
  table?: DocsTable;
}
export interface DocsDocument {
  documentId?: string;
  revisionId?: string;
  body?: { content?: DocsStructuralElement[] };
  namedRanges?: Record<string, { namedRanges?: Array<{ ranges?: Array<{ startIndex?: number; endIndex?: number }> }> }>;
}

interface Segment { textStart: number; docStart: number; length: number }

export interface FlatText {
  text: string;
  segments: Segment[];
  /** Map [start, end) in text to document indexes, or null if it crosses a break or gap. */
  toDoc(start: number, end: number): { docStart: number; docEnd: number } | null;
  /** Every suggestion id present in the document (pending suggestions). */
  suggestionIds: Set<string>;
  foundTemplate: boolean;
}

export interface FlattenOptions {
  /** story = only the article body of the template; selection = only [range]. */
  mode: 'story' | 'selection';
  range?: { startIndex: number; endIndex: number };
}

const paragraphText = (p: DocsParagraph) => (p.elements ?? []).map((e) => e.textRun?.content ?? '').join('');

/** Where the story body starts and ends in the Article Draft template. */
export function findStoryRegion(doc: DocsDocument): { start: number; end: number; found: boolean } {
  const content = doc.body?.content ?? [];
  const docEnd = content.length ? content[content.length - 1].endIndex ?? 0 : 0;
  let start = -1;
  let end = docEnd;
  for (const el of content) {
    if (!el.paragraph) continue;
    const t = paragraphText(el.paragraph).trim();
    if (start < 0 && /^Write your article here/i.test(t)) start = el.endIndex ?? 0;
    else if (/^Otter link/i.test(t)) {
      end = el.startIndex ?? docEnd;
      if (start >= 0) break;
    }
  }
  return { start: Math.max(start, 0), end, found: start >= 0 };
}

export function flattenDocument(doc: DocsDocument, options: FlattenOptions): FlatText {
  const parts: string[] = [];
  const segments: Segment[] = [];
  const suggestionIds = new Set<string>();
  let length = 0;

  let lo: number;
  let hi: number;
  let foundTemplate = true;
  if (options.mode === 'selection' && options.range) {
    lo = options.range.startIndex;
    hi = options.range.endIndex;
  } else {
    const region = findStoryRegion(doc);
    lo = region.start;
    hi = region.end;
    foundTemplate = region.found;
  }

  const push = (s: string, docStart?: number) => {
    if (!s) return;
    if (docStart !== undefined) segments.push({ textStart: length, docStart, length: s.length });
    parts.push(s);
    length += s.length;
  };

  const walk = (elements: DocsStructuralElement[], inTable: boolean) => {
    for (const el of elements) {
      if (el.table) {
        // Story mode skips tables (header, photos); captions get their own checks later.
        if (options.mode === 'story' && !inTable) {
          collectIds(el);
          continue;
        }
        for (const row of el.table.tableRows ?? []) {
          for (const cell of row.tableCells ?? []) walk(cell.content ?? [], true);
        }
        continue;
      }
      if (!el.paragraph) continue;
      for (const pe of el.paragraph.elements ?? []) {
        const run = pe.textRun;
        const s = pe.startIndex ?? 0;
        const e = pe.endIndex ?? s;
        const pending = [...(run?.suggestedInsertionIds ?? []), ...(run?.suggestedDeletionIds ?? [])];
        pending.forEach((id) => suggestionIds.add(id));
        if (e <= lo || s >= hi) continue;
        if (!run?.content || pending.length) {
          push(BREAK);
          continue;
        }
        const from = Math.max(lo, s) - s;
        const to = Math.min(hi, e) - s;
        push(run.content.slice(from, to), s + from);
      }
    }
  };

  const collectIds = (el: DocsStructuralElement) => {
    for (const row of el.table?.tableRows ?? []) {
      for (const cell of row.tableCells ?? []) {
        for (const c of cell.content ?? []) {
          for (const pe of c.paragraph?.elements ?? []) {
            [...(pe.textRun?.suggestedInsertionIds ?? []), ...(pe.textRun?.suggestedDeletionIds ?? [])].forEach((id) => suggestionIds.add(id));
          }
          if (c.table) collectIds(c);
        }
      }
    }
  };

  walk(doc.body?.content ?? [], false);
  const text = parts.join('');

  const locate = (offset: number): number | null => {
    // Segments are sorted by textStart; binary search.
    let a = 0;
    let b = segments.length - 1;
    while (a <= b) {
      const mid = (a + b) >> 1;
      const seg = segments[mid];
      if (offset < seg.textStart) b = mid - 1;
      else if (offset >= seg.textStart + seg.length) a = mid + 1;
      else return seg.docStart + (offset - seg.textStart);
    }
    return null;
  };

  const toDoc = (start: number, end: number) => {
    if (end <= start) return null;
    if (text.slice(start, end).includes(BREAK)) return null;
    const docStart = locate(start);
    const last = locate(end - 1);
    if (docStart === null || last === null) return null;
    const docEnd = last + 1;
    // A gap (skipped element) between the ends would make the lengths disagree.
    if (docEnd - docStart !== end - start) return null;
    return { docStart, docEnd };
  };

  return { text, segments, toDoc, suggestionIds, foundTemplate };
}

/** Count words the way a reporter would (for the sidebar's word count). */
export function countWords(text: string): number {
  return (text.replace(new RegExp(BREAK, 'g'), ' ').match(/[A-Za-z0-9’']+/g) ?? []).length;
}

/** The document's text between two indexes (body and tables), for checking a range is unchanged. */
export function textAt(doc: DocsDocument, start: number, end: number): string {
  let out = '';
  const visit = (content: DocsStructuralElement[] | undefined) => {
    for (const el of content ?? []) {
      for (const pe of el.paragraph?.elements ?? []) {
        const s = pe.startIndex ?? 0;
        const e = pe.endIndex ?? s;
        if (e <= start || s >= end || !pe.textRun?.content) continue;
        out += pe.textRun.content.slice(Math.max(start, s) - s, Math.min(end, e) - s);
      }
      for (const row of el.table?.tableRows ?? []) for (const cell of row.tableCells ?? []) visit(cell.content);
    }
  };
  visit(doc.body?.content);
  return out;
}

/**
 * Find text the reporter selected (as copied from the page) in the document.
 * Copied text may differ in line breaks and spaces, so each line is matched in order.
 * Returns the document range from the first line's start to the last line's end.
 */
export function findTextRange(doc: DocsDocument, selected: string): { startIndex: number; endIndex: number } | null {
  const content = doc.body?.content ?? [];
  const docEnd = content.length ? content[content.length - 1].endIndex ?? 1 : 1;
  const flat = flattenDocument(doc, { mode: 'selection', range: { startIndex: 0, endIndex: docEnd } });
  const norm = (s: string) => s.replace(/[ \t ]+/g, ' ');
  const text = norm(flat.text);
  const lines = norm(selected).split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  // Replacing runs of spaces changes lengths; only exact-length text maps cleanly, so require it.
  if (text.length !== flat.text.length) return null;
  let from = 0;
  let start = -1;
  let end = -1;
  for (const line of lines) {
    const at = text.indexOf(line, from);
    if (at < 0) return null;
    if (start < 0) start = at;
    end = at + line.length;
    from = end;
  }
  const a = flat.toDoc(start, start + 1);
  const b = flat.toDoc(end - 1, end);
  if (!a || !b) return null;
  return { startIndex: a.docStart, endIndex: b.docEnd };
}
