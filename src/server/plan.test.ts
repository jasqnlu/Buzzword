import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../engine/types';
import { BREAK, findTextRange, flattenDocument, textAt, type DocsDocument, type DocsStructuralElement } from './flatten';
import { EMPTY_STORE, buildSuggestRequests, collectSuggestionIds, finishCheck, planCheck } from './plan';

/** Build a Docs API-shaped document. Each item is a paragraph (string or runs) or a table of paragraphs. */
type Run = string | { text: string; ins?: string; del?: string };
type Item = Run[] | string | { table: string[] };

function makeDoc(items: Item[]): DocsDocument {
  let index = 1; // Docs bodies start at 1 (index 0 is the section break)
  const paragraph = (runs: Run[]): DocsStructuralElement => {
    const start = index;
    const elements = runs.map((r) => {
      const run = typeof r === 'string' ? { text: r } : r;
      const s = index;
      index += run.text.length;
      return {
        startIndex: s,
        endIndex: index,
        textRun: {
          content: run.text,
          ...(run.ins ? { suggestedInsertionIds: [run.ins] } : {}),
          ...(run.del ? { suggestedDeletionIds: [run.del] } : {}),
        },
      };
    });
    return { startIndex: start, endIndex: index, paragraph: { elements } };
  };
  const content: DocsStructuralElement[] = items.map((item) => {
    if (typeof item === 'string') return paragraph([item + '\n']);
    if (Array.isArray(item)) return paragraph(item);
    const start = index;
    index += 1; // table start
    const cells = item.table.map((t) => ({ content: [paragraph([t + '\n'])] }));
    index += 1; // table end
    return { startIndex: start, endIndex: index, table: { tableRows: [{ tableCells: cells }] } };
  });
  return { documentId: 'doc1', revisionId: 'rev1', body: { content } };
}

const TEMPLATE = (story: Item[]): DocsDocument =>
  makeDoc([
    'Article Draft',
    { table: ['Title: Jazz on Oct. 5th', 'Byline: Jordan Lee'] },
    'Article Draft',
    'Write your article here, do not indent and press enter instead.',
    ...story,
    'Otter link + Notes',
    'Notes: interview at 3:00 PM with source, grade 10.',
  ]);

describe('flattenDocument', () => {
  it('reads only the story body of the template', () => {
    const flat = flattenDocument(TEMPLATE(['The show runs until 6pm.', 'Second paragraph.']), { mode: 'story' });
    expect(flat.foundTemplate).toBe(true);
    expect(flat.text).toBe('The show runs until 6pm.\nSecond paragraph.\n');
  });

  it('falls back to the whole doc (minus tables) without the template', () => {
    const flat = flattenDocument(makeDoc(['Just a story at 6pm.', { table: ['cell'] }]), { mode: 'story' });
    expect(flat.foundTemplate).toBe(false);
    expect(flat.text).toBe('Just a story at 6pm.\n');
  });

  it('maps text offsets back to exact document indexes', () => {
    const doc = TEMPLATE(['The show runs until 6pm.']);
    const flat = flattenDocument(doc, { mode: 'story' });
    const at = flat.text.indexOf('6pm');
    const pos = flat.toDoc(at, at + 3)!;
    // Find the same text in the raw doc to compare.
    const para = doc.body!.content!.find((c) => c.paragraph?.elements?.[0].textRun?.content?.startsWith('The show'))!;
    expect(pos.docStart).toBe(para.startIndex! + 'The show runs until '.length);
    expect(pos.docEnd - pos.docStart).toBe(3);
  });

  it('treats pending suggestions as breaks and records their ids', () => {
    const doc = TEMPLATE([['Doors open at ', { text: '3:00 PM', del: 'suggest.a' }, { text: '3 p.m.', ins: 'suggest.a' }, ' today.\n']]);
    const flat = flattenDocument(doc, { mode: 'story' });
    expect(flat.text).toBe(`Doors open at ${BREAK}${BREAK} today.\n`);
    expect(flat.suggestionIds.has('suggest.a')).toBe(true);
    expect(flat.toDoc(13, 16)).toBeNull(); // crosses a break
  });

  it('selection mode reads exactly the selected range, including partial runs', () => {
    const doc = makeDoc(['Before. The game is October 5. After.']);
    const start = 1 + 'Before. '.length;
    const end = start + 'The game is October 5.'.length;
    const flat = flattenDocument(doc, { mode: 'selection', range: { startIndex: start, endIndex: end } });
    expect(flat.text).toBe('The game is October 5.');
  });
});

describe('planCheck', () => {
  it('turns safe issues into suggestions and the rest into flags', () => {
    const plan = planCheck(TEMPLATE(['It starts at 8:30 and ends at 6pm.']), {
      mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE,
    });
    expect(plan.toSuggest.map((c) => c.ruleId)).toEqual(['ap.times']);
    expect(plan.flags.map((c) => c.ruleId)).toEqual(['ap.time-no-ampm']);
    // Header table and notes were not checked.
    expect([...plan.toSuggest, ...plan.flags].some((c) => c.original.includes('3:00'))).toBe(false);
  });

  it('builds requests from the end of the doc backward: insert after, then delete', () => {
    const { requests, owners } = buildSuggestRequests([
      { docStart: 10, docEnd: 13, replacement: 'Oct.' } as never,
      { docStart: 40, docEnd: 43, replacement: '6 p.m.' } as never,
      { docStart: 60, docEnd: 63, replacement: '' } as never,
    ]);
    expect(requests).toEqual([
      { deleteContentRange: { range: { startIndex: 60, endIndex: 63 } } },
      { insertText: { text: '6 p.m.', location: { index: 43 } } },
      { deleteContentRange: { range: { startIndex: 40, endIndex: 43 } } },
      { insertText: { text: 'Oct.', location: { index: 13 } } },
      { deleteContentRange: { range: { startIndex: 10, endIndex: 13 } } },
    ]);
    expect(owners).toEqual([2, 1, 1, 0, 0]);
  });

  it('records created suggestion ids and counts open issues', () => {
    const plan = planCheck(TEMPLATE(['It ends at 6pm. It starts at 8:30.']), {
      mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE,
    });
    const ids = collectSuggestionIds(
      { suggestionResponses: plan.requests.map(() => ({ createdSuggestionIds: ['suggest.x'] })) },
      plan.owners, plan.toSuggest.length,
    );
    const { result, store } = finishCheck(plan, ids, 'story', new Date(0));
    expect(result.suggested).toHaveLength(1);
    expect(result.flags).toHaveLength(1);
    expect(result.openCount).toBe(2);
    expect(store.tracked).toEqual([{ i: ['suggest.x'], f: result.suggested[0].fp, r: 'ap.times' }]);
  });

  it('lists fixes as cards when Docs returns no suggestion ids', () => {
    const plan = planCheck(TEMPLATE(['It ends at 6pm.']), { mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE });
    const { result } = finishCheck(plan, [[]], 'story', new Date(0));
    expect(result.suggested).toHaveLength(0);
    expect(result.flags[0].ruleId).toBe('ap.times');
    expect(result.warning).toBeDefined();
  });

  it('learns accepted and rejected suggestions on the next check', () => {
    const first = planCheck(TEMPLATE(['It ends at 6pm.', 'Call at 7pm.']), { mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE });
    const ids = [['s.one'], ['s.two']];
    const { store } = finishCheck(first, ids, 'story', new Date(0));
    expect(store.tracked).toHaveLength(2);

    // Next check: "6pm" was accepted (now 6 p.m.), "7pm" was rejected (still 7pm). No suggestions remain.
    const second = planCheck(TEMPLATE(['It ends at 6 p.m.', 'Call at 7pm.']), { mode: 'story', settings: DEFAULT_SETTINGS, store });
    expect(second.resolved).toEqual({ accepted: 1, rejected: 1 });
    expect(second.store.stats['ap.times']).toEqual({ a: 1, r: 1 });
    // A rejected fix is never suggested again.
    expect(second.toSuggest).toHaveLength(0);
  });

  it('keeps suggestions that are still pending', () => {
    const first = planCheck(TEMPLATE(['It ends at 6pm.']), { mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE });
    const { store } = finishCheck(first, [['s.one']], 'story', new Date(0));
    const second = planCheck(
      TEMPLATE([['It ends at ', { text: '6pm', del: 's.one' }, { text: '6 p.m.', ins: 's.one' }, '.\n']]),
      { mode: 'story', settings: DEFAULT_SETTINGS, store },
    );
    expect(second.pendingEarlier).toBe(1);
    expect(second.toSuggest).toHaveLength(0);
  });

  it('respects ignored flags', () => {
    const doc = TEMPLATE(['It starts at 8:30.']);
    const first = planCheck(doc, { mode: 'story', settings: DEFAULT_SETTINGS, store: EMPTY_STORE });
    const store = { ...EMPTY_STORE, ignored: [first.flags[0].fp] };
    expect(planCheck(doc, { mode: 'story', settings: DEFAULT_SETTINGS, store }).flags).toHaveLength(0);
  });
});

describe('findTextRange (extension selection)', () => {
  const doc = TEMPLATE(['First paragraph here.', 'The game is October 5 at 6pm.', 'Last one.']);

  it('finds a selection inside one paragraph', () => {
    const r = findTextRange(doc, 'October 5 at 6pm')!;
    expect(textAt(doc, r.startIndex, r.endIndex)).toBe('October 5 at 6pm');
  });

  it('finds a selection across paragraphs, whatever the copied line breaks', () => {
    const r = findTextRange(doc, 'here.\n\nThe game is')!;
    expect(textAt(doc, r.startIndex, r.endIndex)).toBe('here.\nThe game is');
  });

  it('returns null for text that is not in the doc', () => {
    expect(findTextRange(doc, 'not in this story')).toBeNull();
  });
});
