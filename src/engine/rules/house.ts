// The B house-style rules, from docs/the-b-style-guide.md.
// House rules win over AP where they differ.

import type { Hit, Rule } from '../types';
import { MONTH_ALIASES, WEEKDAYS, capitalize, changed, fixPeriods, matchCase, regexHits } from './helpers';

const hit = (m: RegExpExecArray, extra: Partial<Hit> = {}): Hit => ({ start: m.index, end: m.index + m[0].length, ...extra });

// ---------------------------------------------------------------------------
// People and school terms
// ---------------------------------------------------------------------------

const GRADE: Record<string, [string, string]> = {
  '9': ['freshman', 'freshmen'], '10': ['sophomore', 'sophomores'], '11': ['junior', 'juniors'], '12': ['senior', 'seniors'],
  ninth: ['freshman', 'freshmen'], tenth: ['sophomore', 'sophomores'], eleventh: ['junior', 'juniors'], twelfth: ['senior', 'seniors'],
};

// Words after a capitalized class year that make it a title or event name, not a mistake.
const CLASS_YEAR_KEEP = /^\s+(Class|Vice|President|Secretary|Treasurer|Representative|Rep\.?|Night|Ball|Prom|Ditch|Sunrise|Assassin|Day|Week|Olympics|Breakfast|Picnic|Retreat|Trip|Varsity|Formal|Semi|Spirit)\b/;

export const houseGrades: Rule = {
  id: 'house.grade-names', pack: 'house', category: 'People', title: 'Class year',
  safe: true, inQuotes: 'apply',
  reason: 'Use freshman, sophomore, junior or senior, lowercase.',
  why: 'Write sophomore Maya Chen, not 10th grader Maya Chen or Sophomore Maya Chen. Capitalize only in officer titles: Sophomore Vice President.',
  find(ctx) {
    const numbered = regexHits(ctx, /\b(9|10|11|12|[Nn]inth|[Tt]enth|[Ee]leventh|[Tt]welfth)(?:th)?[- \u00a0]grader(s?)\b/g, (m) => {
      const forms = GRADE[m[1].toLowerCase()];
      const word = forms[m[2] ? 1 : 0];
      return changed(m.index, m[0], ctx.isSentenceStart(m.index) ? capitalize(word) : word);
    });
    const capitalized = regexHits(ctx, /\b(Freshman|Freshmen|Sophomores?|Juniors?|Seniors?)\b/g, (m) => {
      if (ctx.isSentenceStart(m.index)) return null;
      if (CLASS_YEAR_KEEP.test(ctx.text.slice(m.index + m[0].length, m.index + m[0].length + 24))) return null;
      return changed(m.index, m[0], m[0].toLowerCase());
    });
    return [...numbered, ...capitalized];
  },
};

export const houseVicePrincipal: Rule = {
  id: 'house.vice-principal', pack: 'house', category: 'People', title: 'Vice principal',
  safe: true, inQuotes: 'apply',
  reason: 'Burlingame has vice principals: two words, no hyphen, lowercase.',
  why: 'Not assistant principal, vice-principal or Vice Principal.',
  find(ctx) {
    return regexHits(ctx, /\b(?:[Aa]ssistant[ \u00a0]+[Pp]rincipal|[Vv]ice-[Pp]rincipal|Vice[ \u00a0]+Principal)(s?)\b/g, (m) => {
      const word = `vice principal${m[1]}`;
      return changed(m.index, m[0], ctx.isSentenceStart(m.index) ? capitalize(word) : word);
    });
  },
};

export const houseAdviser: Rule = {
  id: 'house.adviser', pack: 'house', category: 'Words', title: 'Adviser',
  safe: true, inQuotes: 'apply',
  reason: 'It’s spelled adviser, not advisor.', why: 'Both The B and AP use adviser.',
  find(ctx) {
    return regexHits(ctx, /\b([Aa])dvisor(s?)\b/g, (m) => changed(m.index, m[0], `${m[1]}dviser${m[2]}`));
  },
};

export const houseWebsite: Rule = {
  id: 'house.website', pack: 'house', category: 'Words', title: 'Website',
  safe: true, inQuotes: 'apply',
  reason: 'Website is one lowercase word.', why: 'Write website, not web site or Web site. Our own site is TheBurlingameB.org.',
  find(ctx) {
    return [
      ...regexHits(ctx, /\b[Ww]eb[ \u00a0]site(s?)\b/g, (m) =>
        changed(m.index, m[0], (ctx.isSentenceStart(m.index) ? 'Website' : 'website') + m[1])),
      ...regexHits(ctx, /\b[Tt]he[Bb]urlingame[Bb]\.(?:org|ORG)\b/g, (m) => changed(m.index, m[0], 'TheBurlingameB.org')),
    ];
  },
};

export const houseUCSC: Rule = {
  id: 'house.ucsc', pack: 'house', category: 'Places', title: 'UC Santa Cruz',
  safe: true, inQuotes: 'skip',
  reason: 'Readers don’t know “UCSC,” so write UC Santa Cruz.', why: 'The B never shortens UC Santa Cruz.',
  find(ctx) {
    return regexHits(ctx, /\bUCSC\b/g, (m) => hit(m, { replacement: 'UC Santa Cruz' }));
  },
};

export const houseHonorifics: Rule = {
  id: 'house.honorifics', pack: 'house', category: 'People', title: 'No Mr. or Mrs.',
  safe: false, inQuotes: 'skip',
  reason: 'Use the full name first, then the last name. No Mr., Mrs. or Ms.',
  why: 'First reference: journalism teacher Kelly Wilkerson. After that: Wilkerson.',
  find(ctx) {
    return regexHits(ctx, /\b(?:Mr|Mrs|Ms|Miss)\.?[ \u00a0]+[A-Z][a-z]+/g, (m) => hit(m, { hint: 'Use the full name, or just the last name' }));
  },
};

export const houseDoctor: Rule = {
  id: 'house.doctor', pack: 'house', category: 'People', title: 'Dr. is for medical doctors',
  safe: false, inQuotes: 'skip',
  reason: 'Use Dr. only on first reference, and only for medical doctors.',
  why: 'Someone with a Ph.D. is not “Dr.” in The B. On later references, use just the last name.',
  find(ctx) {
    return regexHits(ctx, /(?<!\d[ \u00a0][A-Z][a-z]+[ \u00a0])\bDr\.[ \u00a0]+[A-Z][a-z]+/g, (m) => hit(m));
  },
};

export const houseSchoolName: Rule = {
  id: 'house.school-name', pack: 'house', category: 'Places', title: 'Just “Burlingame”',
  safe: false, inQuotes: 'skip',
  reason: 'Call the school Burlingame in print and online.',
  why: 'Write Burlingame, not Burlingame High School or BHS.',
  find(ctx) {
    return regexHits(ctx, /\b(?:Burlingame[ \u00a0]+High(?:[ \u00a0]+School)?|BHS)\b/g, (m) => hit(m, { replacement: 'Burlingame' }));
  },
};

export const houseRoom: Rule = {
  id: 'house.room-number', pack: 'house', category: 'Places', title: 'Room number',
  safe: false, inQuotes: 'skip',
  reason: 'Write rooms as the building letter and number, like A112.',
  why: 'Write A112, not Room A-112 or room 112.',
  find(ctx) {
    return regexHits(ctx, /\b[Rr]oom[ \u00a0]+([A-Za-z])?-?(\d{2,3})\b/g, (m) => {
      const [, letter, num] = m;
      return letter ? hit(m, { replacement: `${letter.toUpperCase()}${num}` }) : hit(m, { hint: 'Add the building letter, like A112' });
    });
  },
};

// ---------------------------------------------------------------------------
// Sports
// ---------------------------------------------------------------------------

export const houseJV: Rule = {
  id: 'house.jv', pack: 'house', category: 'Sports', title: 'JV and varsity',
  safe: true, inQuotes: 'apply',
  reason: 'Write JV, and keep varsity lowercase.',
  why: 'Not junior varsity or J.V. Varsity is never capitalized unless it starts a sentence.',
  find(ctx) {
    return [
      ...regexHits(ctx, /\b[Jj]unior[ \u00a0]+[Vv]arsity\b|\bJ\.V\.|\b[Jj]v\b/g, (m) => {
        if (m[0] === 'JV') return null;
        return fixPeriods(ctx, hit(m, { replacement: 'JV' }));
      }),
      ...regexHits(ctx, /\bVarsity\b/g, (m) => (ctx.isSentenceStart(m.index) ? null : hit(m, { replacement: 'varsity' }))),
    ];
  },
};

export const houseCoach: Rule = {
  id: 'house.coach-lower', pack: 'house', category: 'Sports', title: 'Coach is lowercase',
  safe: true, inQuotes: 'apply',
  reason: 'Coach titles are always lowercase, even before a name.',
  why: 'Write baseball head coach Dan Ariola, not baseball Head Coach Dan Ariola.',
  find(ctx) {
    return regexHits(ctx, /\b(Head[ \u00a0]+Coach|Assistant[ \u00a0]+Coach|Head[ \u00a0]+coach|Assistant[ \u00a0]+coach|Coach)(?=[ \u00a0]+[A-Z][a-z])/g, (m) => {
      const lower = m[0].toLowerCase();
      const fixed = ctx.isSentenceStart(m.index) ? capitalize(lower) : lower;
      return changed(m.index, m[0], fixed);
    });
  },
};

export const houseBlueDevils: Rule = {
  id: 'house.blue-devils', pack: 'house', category: 'Sports', title: 'Blue Devils',
  safe: true, inQuotes: 'apply',
  reason: 'Blue Devils is capitalized, with no apostrophe for the plural.',
  why: 'Write the Blue Devils won, not the Blue Devil’s won or the blue devils won.',
  find(ctx) {
    return [
      ...regexHits(ctx, /\b[Bb]lue[ \u00a0]+[Dd]evil['’]s\b/g, (m) => hit(m, { replacement: 'Blue Devils' })),
      ...regexHits(ctx, /\b(?:blue[ \u00a0]+devils|blue[ \u00a0]+Devils|Blue[ \u00a0]+devils)\b/g, (m) => hit(m, { replacement: 'Blue Devils' })),
    ];
  },
};

const SPORTS = 'basketball|soccer|volleyball|tennis|golf|water[ \\u00a0]polo|swim(?:ming)?|cross[ \\u00a0]country|track|lacrosse|wrestling|badminton|softball|baseball|field[ \\u00a0]hockey|flag[ \\u00a0]football|football|diving|team|teams|varsity|JV';
export const houseMensWomens: Rule = {
  id: 'house.mens-womens', pack: 'house', category: 'Sports', title: 'Men’s and women’s',
  safe: true, inQuotes: 'skip',
  reason: 'Teams are men’s and women’s, not boys and girls.',
  why: 'Write women’s soccer, not girls soccer. Don’t forget the apostrophe.',
  find(ctx) {
    const re = new RegExp(`\\b([Bb]oys|[Gg]irls|[Bb]oy['’]s|[Gg]irl['’]s|[Bb]oys['’]|[Gg]irls['’])(?=[ \\u00a0]+(?:${SPORTS})\\b)`, 'g');
    return regexHits(ctx, re, (m) => {
      const women = /^[Gg]/.test(m[1]);
      return hit(m, { replacement: matchCase(m[1], women ? 'women’s' : 'men’s') });
    });
  },
};

export const houseRecords: Rule = {
  id: 'house.pr-sb', pack: 'house', category: 'Sports', title: 'Spell out PR and SB',
  safe: false, inQuotes: 'skip',
  reason: 'Write personal record or season best, not PR or SB.',
  why: 'Readers outside the sport don’t know the shorthand.',
  find(ctx) {
    return regexHits(ctx, /\b(PRs?|SBs?)\b/g, (m) =>
      hit(m, { replacement: m[1].startsWith('PR') ? (m[1].endsWith('s') ? 'personal records' : 'personal record') : (m[1].endsWith('s') ? 'season bests' : 'season best') }));
  },
};

// ---------------------------------------------------------------------------
// Quotes and attribution
// ---------------------------------------------------------------------------

const SAID_VERBS = 'explained|retorted|replied|blurted|noted|confirmed|smiled|lamented|stated|exclaimed|commented|remarked|shared|mentioned|answered|responded|claimed|admitted|laughed|joked|insisted|expressed|elaborated|recalled|emphasized|announced|chuckled|giggled|sighed';

const saysInfo = {
  id: 'house.says', pack: 'house' as const, category: 'Quotes' as const, title: '“Said,” not “says”',
  safe: false, inQuotes: 'skip' as const,
  reason: 'News stories use said. Says is only for present-tense features.',
  why: 'Most stories are in past tense: “It was close,” Brooks said. Keep says only if the whole piece is a present-tense feature.',
};

export const houseSaidVerbs: Rule = {
  id: 'house.said-verbs', pack: 'house', category: 'Quotes', title: 'Use “said”',
  safe: true, inQuotes: 'skip', priority: 1,
  reason: 'Said is always right. Words like explained or noted add opinion.',
  why: 'Write “It’s due Friday,” Brown said, not “It’s due Friday,” Brown explained.',
  related: [saysInfo],
  find(ctx) {
    const re = new RegExp(`([,?!—–-][”"])[ \\u00a0]+([^.”"“\\n]{1,60}?)[ \\u00a0]+(${SAID_VERBS}|says)(?=[.,;])`, 'g');
    const after = new RegExp(`([,?!—–-][”"])[ \\u00a0]+(${SAID_VERBS}|says)(?=[ \\u00a0]+[a-zA-Z])`, 'g');
    const toHit = (m: RegExpExecArray, verb: string) => {
      const start = m.index + m[0].length - verb.length;
      if (verb === 'says') return { start, end: start + verb.length, replacement: 'said', ruleId: saysInfo.id };
      return { start, end: start + verb.length, replacement: 'said' };
    };
    return [
      ...regexHits(ctx, re, (m) => toHit(m, m[3])),
      ...regexHits(ctx, after, (m) => toHit(m, m[2])),
    ];
  },
};

// Subjects short enough to swap: optional class year or "<department> teacher", then 1–3 capitalized names.
const SPEAKER = `((?:(?:freshman|sophomore|junior|senior|[a-z]+[ \\u00a0]+(?:teacher|coach)|teacher|coach|adviser|counselor|principal|vice[ \\u00a0]principal)[ \\u00a0]+)?[A-Z][A-Za-z'’-]+(?:[ \\u00a0]+[A-Z][A-Za-z'’-]+){0,2})`;

export const houseSaidOrder: Rule = {
  id: 'house.said-order', pack: 'house', category: 'Quotes', title: '“Name said”',
  safe: true, inQuotes: 'skip', priority: 2,
  reason: 'After a quote, put the name before said.',
  why: 'Write “I love people,” Lee said, not said Lee. Only a very long title can come first: said Queen of All Things Rad Kacey Hsu.',
  find(ctx) {
    const re = new RegExp(`([,?!—–-][”"])[ \\u00a0]+(said|says)[ \\u00a0]+${SPEAKER}(?=[.,;])`, 'g');
    return regexHits(ctx, re, (m) => {
      const start = m.index + m[1].length;
      const end = m.index + m[0].length;
      const speech = ctx.text.slice(start, end);
      const lead = speech.match(/^[ \u00a0]+/)![0];
      return { start, end, replacement: `${lead}${m[3]} said` };
    });
  },
};

export const housePunctInsideQuotes: Rule = {
  id: 'house.punct-inside-quotes', pack: 'house', category: 'Punctuation', title: 'Comma inside quotes',
  safe: true, inQuotes: 'apply',
  reason: 'Commas and periods go inside the closing quotation mark.',
  why: 'Write “great,” she said, not “great”, she said.',
  find(ctx) {
    return regexHits(ctx, /(?<=[A-Za-z0-9!?])(”|")([.,])/g, (m) => hit(m, { replacement: `${m[2]}${m[1]}` }));
  },
};

export const houseFillers: Rule = {
  id: 'house.fillers', pack: 'house', category: 'Quotes', title: 'Filler word',
  safe: true, inQuotes: 'only',
  reason: 'Take out um and uh when quoting someone.',
  why: 'Filler sounds from interview recordings make quotes hard to read. Removing them doesn’t change what the person said.',
  find(ctx, settings) {
    const re = /(,[ \u00a0]*)?\b([Uu]+[mh]+|[Uu]hm+|[Ee]rm+|[Hh]mm+)\b(,|\.\.\.|…)?([ \u00a0]*)/g;
    return regexHits(ctx, re, (m) => {
      const [all, lead, , trail, space] = m;
      const start = m.index;
      const end = start + all.length;
      if (settings.fillerStyle === 'ellipsis') return { start, end, replacement: lead ? ' ... ' : '... ' };
      const next = ctx.text[end] ?? '';
      const startsSentence = ctx.isSentenceStart(start);
      if (startsSentence && /[a-z]/.test(next)) {
        // "Um, so we" -> "So we": take the next letter too so it can be capitalized.
        return { start, end: end + 1, replacement: next.toUpperCase() };
      }
      if (lead && (trail || space)) return { start, end, replacement: ' ' };
      if (lead) return { start, end, replacement: '' };
      if (!space && /[”"]/.test(next)) {
        // "...because, um" + closing quote: drop the filler and the space before it.
        const backTo = /[ \u00a0]$/.test(ctx.text.slice(0, start)) ? start - 1 : start;
        return { start: backTo, end, replacement: '' };
      }
      return { start, end, replacement: '' };
    });
  },
};

export const houseStutter: Rule = {
  id: 'house.stutter', pack: 'house', category: 'Quotes', title: 'Stutter in quote',
  safe: false, inQuotes: 'only',
  reason: 'This looks like a stutter from the recording.',
  why: '“I-I think” or “the the the” can usually be cleaned up. Some repeats are real English, like “that that,” so check before changing.',
  find(ctx) {
    return [
      ...regexHits(ctx, /\b([A-Za-z]{1,4})-\1\b/gi, (m) => {
        if (/^(so|no|bye|ha|tut|boo|uh|oh|hush|pom|tom)$/i.test(m[1])) return null;
        return hit(m, { replacement: m[1] });
      }),
      ...regexHits(ctx, /\b(\w+)(?:[ \u00a0]+\1\b){2,}/gi, (m) => hit(m, { replacement: m[1] })),
    ];
  },
};

// ---------------------------------------------------------------------------
// Numbers and dates
// ---------------------------------------------------------------------------

export const houseMoreThan: Rule = {
  id: 'house.more-than', pack: 'house', category: 'Numbers', title: '“More than” with numbers',
  safe: true, inQuotes: 'skip',
  reason: 'Use more than, not over, with numbers.',
  why: 'Write the team won more than 20 games. Over is for places: the ball flew over the fence.',
  find(ctx) {
    return regexHits(ctx, /\b([Oo])ver[ \u00a0]+(?=\$?\d|(?:two|three|four|five|six|seven|eight|nine|ten|a dozen|a hundred|a thousand)\b)(?!\d+[-–]\d)/g, (m) =>
      hit(m, { replacement: `${m[1] === 'O' ? 'M' : 'm'}ore than ` }));
  },
};

const monthNames = Object.keys(MONTH_ALIASES).join('|');
export const houseWeekdayDate: Rule = {
  id: 'house.weekday-with-date', pack: 'house', category: 'Dates', title: 'Day and date together',
  safe: true, inQuotes: 'skip',
  reason: 'Don’t use a day of the week with a date.',
  why: 'Write on Sept. 5, not on Tuesday, Sept. 5.',
  find(ctx) {
    const re = new RegExp(`\\b(${WEEKDAYS.join('|')}),?[ \\u00a0]+(?=(?:${monthNames})\\.?[ \\u00a0]+\\d)`, 'g');
    return regexHits(ctx, re, (m) => hit(m, { replacement: '' }));
  },
};

export const houseDecades: Rule = {
  id: 'house.decades', pack: 'house', category: 'Numbers', title: 'No apostrophe in plurals',
  safe: true, inQuotes: 'apply',
  reason: 'Apostrophes show possession, not plurals.',
  why: 'Write the 1960s and the ’90s, not the 1960’s.',
  find(ctx) {
    return regexHits(ctx, /(?<!\w)(\d{3}0|['’]\d0)['’]s\b/g, (m) => hit(m, { replacement: `${m[1].replace("'", '’')}s` }));
  },
};

export const houseAcronymPlural: Rule = {
  id: 'house.acronym-plural', pack: 'house', category: 'Punctuation', title: 'Plural or possessive?',
  safe: false, inQuotes: 'skip',
  reason: 'If this means more than one, drop the apostrophe.',
  why: 'Write he visited many UCs. Keep the apostrophe only for possession: the ASB’s budget.',
  find(ctx) {
    return regexHits(ctx, /\b([A-Z]{2,})['’]s\b/g, (m) => hit(m, { replacement: `${m[1]}s` }));
  },
};

const NUMBER_START_SAFE = /^(?:1[89]\d\d|20\d\d)(?![\d,.%])/;
export const houseNumeralStart: Rule = {
  id: 'house.numeral-start', pack: 'house', category: 'Numbers', title: 'Number starts a sentence',
  safe: false, inQuotes: 'skip',
  reason: 'Don’t start a sentence with a figure, except a year.',
  why: 'Write Thirty teachers went, or rewrite: The meeting drew 30 teachers. Years are the exception: 2001 was …',
  find(ctx) {
    return regexHits(ctx, /\b\d[\d,.]*%?/g, (m) => {
      if (!ctx.isSentenceStart(m.index)) return null;
      if (NUMBER_START_SAFE.test(ctx.text.slice(m.index))) return null;
      return hit(m, { hint: 'Spell it out or rewrite the sentence' });
    });
  },
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const houseOneSpace: Rule = {
  id: 'house.one-space', pack: 'house', category: 'Punctuation', title: 'One space',
  safe: true, inQuotes: 'apply',
  reason: 'Use one space after a period, and between words.',
  why: 'Two spaces after a period is a typewriter habit. The B uses one.',
  find(ctx) {
    return regexHits(ctx, /(?<=\S)[ \u00a0]{2,}(?=\S)/g, (m) => hit(m, { replacement: ' ' }));
  },
};

export const houseExclamation: Rule = {
  id: 'house.exclamation', pack: 'house', category: 'Punctuation', title: 'No exclamation marks',
  safe: false, inQuotes: 'skip',
  reason: 'The B doesn’t use exclamation marks in stories.',
  why: 'Let the facts carry the excitement. A period works.',
  find(ctx) {
    return regexHits(ctx, /!+/g, (m) => hit(m, { replacement: '.' }));
  },
};

export const HOUSE_RULES: Rule[] = [
  houseGrades, houseVicePrincipal, houseAdviser, houseWebsite, houseUCSC, houseHonorifics, houseDoctor,
  houseSchoolName, houseRoom, houseJV, houseCoach, houseBlueDevils, houseMensWomens, houseRecords,
  houseSaidVerbs, houseSaidOrder, housePunctInsideQuotes, houseFillers, houseStutter, houseMoreThan,
  houseWeekdayDate, houseDecades, houseAcronymPlural, houseNumeralStart, houseOneSpace, houseExclamation,
];
