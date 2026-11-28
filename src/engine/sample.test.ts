import { expect, it } from 'vitest';
import { check } from './index';
import { SAMPLE_DRAFT } from './fixtures/sample';

// The made-up robotics story used by the preview and the store screenshot.
// It's written to show a spread of rules. If a rule change alters this list,
// make sure the preview still shows a good mix before updating it.
it('sample draft: shows a spread of rules', () => {
  const found = check(SAMPLE_DRAFT).map((i) => `${i.ruleId} | ${i.original} -> ${i.replacement ?? '(flag)'}`);
  expect(found).toEqual([
    'house.room-number | Room 112 -> (flag)',
    'house.weekday-with-date | Saturday,  -> ',
    'ap.date-ordinal | Nov. 15th -> Nov. 15',
    'house.more-than | Over  -> More than ',
    'ap.times | 6:00 pm -> 6 p.m.',
    'house.noon-midnight | 12 p.m. -> noon.',
    'house.fillers | , um,  ->  ',
    'house.grade-names | Junior -> junior',
    'house.honorifics | Mr. Theo -> (flag)',
    'house.says | says -> said',
    'ap.state-names | Calif. -> California.',
    'house.school-name | Burlingame High School -> Burlingame',
    'house.said-order |  said senior Maya Brooks ->  senior Maya Brooks said',
    'house.more-than | over  -> more than ',
    'house.website | web site -> website',
  ]);
});

it('sample draft: leaves correct writing alone', () => {
  const originals = check(SAMPLE_DRAFT).map((i) => i.original);
  expect(originals).not.toContain('towards'); // word choice inside a quote stays
  expect(originals.join(' ')).not.toMatch(/really/); // "really, really" is not a stutter
  expect(originals).not.toContain('9 a.m.');
});
