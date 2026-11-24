import { expect, it } from 'vitest';
import { check } from './index';
import { JAZZ_DRAFT } from './fixtures/jazz';

// A real draft: every flag here was checked by hand. A new flag means either a
// real catch (add it) or a false alarm (fix the rule).
it('jazz draft: finds the real issues and nothing else', () => {
  const found = check(JAZZ_DRAFT).map((i) => `${i.ruleId} | ${i.original} -> ${i.replacement ?? '(flag)'}`);
  expect(found).toEqual([
    'ap.time-no-ampm | 8:30 -> (flag)',
    'ap.times | 6pm. -> 6 p.m.',
    'house.more-than | over  -> more than ',
    'ap.ellipsis | … ->  ... ',
    'house.school-name | Burlingame High School -> Burlingame',
    'ap.ellipsis | … ->  ... ',
    'ap.ellipsis | … ->  ... ',
  ]);
});
