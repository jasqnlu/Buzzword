// AP Stylebook rules, checked against the 58th edition on Nov. 23, 2026.
// See docs/ap-rule-notes.md. Reasons are written in our own words.

import type { Hit, Rule, RuleInfo } from '../types';
import {
  MONTH_ALIASES, MONTH_WITH_DATE, ORDINAL_WORDS,
  changed, fixPeriods, matchCase, regexHits,
} from './helpers';

// ---------------------------------------------------------------------------
// Dates: months, ordinals, month + year
// ---------------------------------------------------------------------------

const monthNames = Object.keys(MONTH_ALIASES).sort((a, b) => b.length - a.length).join('|');
const DATE_RE = new RegExp(
  `\\b(${monthNames})(\\.?)(,?)(\\s+)(\\d{4}|\\d{1,2})(st|nd|rd|th)?\\b(?![\\d:%])`,
  'g',
);

const dateOrdinal: RuleInfo = {
  id: 'ap.date-ordinal', pack: 'ap', category: 'Dates', title: 'No “th” on dates',
  safe: true, inQuotes: 'apply',
  reason: 'Dates use the plain number, without st, nd, rd or th.',
  why: 'Write Oct. 5, not Oct. 5th. The ending is only for ordinals that aren’t dates, like “27th annual.”',
};
const monthSpelled: RuleInfo = {
  id: 'ap.month-spelled', pack: 'ap', category: 'Dates', title: 'Spell out this month',
  safe: true, inQuotes: 'apply',
  reason: 'March, April, May, June and July are never shortened.',
  why: 'Only months longer than five letters get shortened with a date. So it’s March 3 and June 12, but Sept. 5. September is shortened to Sept., not Sep.',
};
const monthYear: RuleInfo = {
  id: 'ap.month-year', pack: 'ap', category: 'Dates', title: 'Month with a year',
  safe: true, inQuotes: 'apply',
  reason: 'With only a year, spell out the month and skip the comma.',
  why: 'Write October 2026, not Oct. 2026 or October, 2026. Months are shortened only when a specific day follows.',
};

export const apMonths: Rule = {
  id: 'ap.month-abbrev', pack: 'ap', category: 'Dates', title: 'Shorten the month',
  safe: true, inQuotes: 'apply', priority: 2,
  reason: 'Months longer than five letters are shortened before a date.',
  why: 'Jan., Feb., Aug., Sept., Oct., Nov. and Dec. are shortened when a specific day follows: Oct. 5. With no day, spell it out: October 2026.',
  related: [dateOrdinal, monthSpelled, monthYear],
  find(ctx) {
    return regexHits(ctx, DATE_RE, (m) => {
      const [all, written, , comma, space, num, ordinal] = m;
      const full = MONTH_ALIASES[written];
      if (!full) return null;
      if (num.length === 4) {
        const yr = Number(num);
        if (yr < 1800 || yr > 2200) return null;
        return changed(m.index, all, `${full} ${num}`, { ruleId: monthYear.id });
      }
      const day = Number(num);
      if (day < 1 || day > 31 || comma) return null;
      // "May" and "March" are also ordinary words; only treat them as months with a capital.
      const fixed = `${MONTH_WITH_DATE[full]}${space.includes('\n') ? ' ' : space}${day}`;
      let ruleId = 'ap.month-abbrev';
      if (ordinal) ruleId = dateOrdinal.id;
      else if (MONTH_WITH_DATE[full] === full) ruleId = monthSpelled.id;
      return changed(m.index, all, fixed, { ruleId });
    });
  },
};

// ---------------------------------------------------------------------------
// Percent
// ---------------------------------------------------------------------------

export const apPercent: Rule = {
  id: 'ap.percent', pack: 'ap', category: 'Numbers', title: 'Percent',
  safe: true, inQuotes: 'apply',
  reason: 'Write percentages one consistent way.',
  why: 'The B’s guide uses the word: 45 percent. (AP switched to the % sign in 2019. Your editor can change this in settings.) At the start of a sentence, spell out both: Forty-five percent.',
  find(ctx, settings) {
    if (settings.percentStyle === 'word') {
      return [
        ...regexHits(ctx, /(\d[\d,]*(?:\.\d+)?)[ \u00a0]?%/g, (m) =>
          changed(m.index, m[0], `${m[1]} percent`)),
        ...regexHits(ctx, /\b([Pp])er cent\b/g, (m) => changed(m.index, m[0], `${m[1]}ercent`)),
      ];
    }
    return regexHits(ctx, /(\d[\d,]*(?:\.\d+)?)[ \u00a0]?(?:percent|per cent)\b/g, (m) => {
      if (ctx.isSentenceStart(m.index)) return null; // spell out instead; the numeral-start rule flags it
      return changed(m.index, m[0], `${m[1]}%`);
    });
  },
};

// ---------------------------------------------------------------------------
// Times, noon and midnight
// ---------------------------------------------------------------------------

const noonMidnight: RuleInfo = {
  id: 'house.noon-midnight', pack: 'house', category: 'Times', title: 'Noon and midnight',
  safe: true, inQuotes: 'apply',
  reason: 'Write noon and midnight instead of 12 p.m. and 12 a.m.',
  why: 'Many readers mix up 12 a.m. and 12 p.m. Never put a 12 in front: “noon,” not “12 noon.”',
};

export const apTimes: Rule = {
  id: 'ap.times', pack: 'ap', category: 'Times', title: 'Time of day',
  safe: true, inQuotes: 'apply', priority: 2,
  reason: 'Times use figures and lowercase a.m. or p.m. with periods; skip “:00.”',
  why: 'Write 3 p.m., not 3:00 PM or 3pm. Add minutes only when there are some: 3:30 p.m.',
  related: [noonMidnight],
  find(ctx) {
    const hits = regexHits(
      ctx,
      /\b(\d{1,2})(?::(\d{2}))?[ \u00a0]*([AaPp])\.?[ \u00a0]?[Mm]\b\.?/g,
      (m) => {
        const hour = Number(m[1]);
        const min = m[2];
        if (hour < 1 || hour > 12 || (min && Number(min) > 59)) return null;
        const half = m[3].toLowerCase() === 'a' ? 'a.m.' : 'p.m.';
        if (hour === 12 && (!min || min === '00')) {
          const word = half === 'p.m.' ? 'noon' : 'midnight';
          return fixPeriods(ctx, { start: m.index, end: m.index + m[0].length, replacement: word, ruleId: noonMidnight.id });
        }
        const fixed = `${hour}${min && min !== '00' ? `:${min}` : ''} ${half}`;
        return changed(m.index, m[0], fixed);
      },
    );
    hits.push(
      ...regexHits(ctx, /\b12(?::00)?[ \u00a0]+(noon|midnight)\b/gi, (m) =>
        ({ start: m.index, end: m.index + m[0].length, replacement: m[1].toLowerCase(), ruleId: noonMidnight.id })),
    );
    return hits;
  },
};

export const apTimeNoHalf: Rule = {
  id: 'ap.time-no-ampm', pack: 'ap', category: 'Times', title: 'Morning or evening?',
  safe: false, inQuotes: 'skip',
  reason: 'This time doesn’t say a.m. or p.m.',
  why: 'Readers can’t tell 8:30 in the morning from 8:30 at night. Add a.m. or p.m.: 8:30 a.m.',
  find(ctx) {
    return regexHits(ctx, /\b(\d{1,2}):(\d{2})\b(?!\.\d|[\d:]|\s*(?:[AaPp]\.?\s?[Mm]\b|o’clock|o'clock|(?:-|–|to)\s*\d))/g, (m) => {
      if (Number(m[1]) > 12 || Number(m[2]) > 59) return null;
      return { start: m.index, end: m.index + m[0].length, hint: 'Add a.m. or p.m.' };
    });
  },
};

export const apTimeRedundant: Rule = {
  id: 'ap.time-redundant', pack: 'ap', category: 'Times', title: 'Says the time twice',
  safe: false, inQuotes: 'skip',
  reason: 'a.m. and p.m. already say morning or night.',
  why: '“10 a.m. this morning” says morning twice. Write 10 a.m., or 10 a.m. Monday if the day matters.',
  find(ctx) {
    return regexHits(
      ctx,
      /\b(\d{1,2}(?::\d{2})? [ap]\.m\.)( this morning| this afternoon| this evening| tonight| in the morning| in the afternoon| in the evening| at night)\b/g,
      (m) => ({ start: m.index, end: m.index + m[0].length, replacement: m[1] }),
    );
  },
};

// ---------------------------------------------------------------------------
// State names
// ---------------------------------------------------------------------------

const AP_STATE_ABBR: Record<string, string> = {
  'Ala.': 'Alabama', 'Ariz.': 'Arizona', 'Ark.': 'Arkansas', 'Calif.': 'California', 'Colo.': 'Colorado',
  'Conn.': 'Connecticut', 'Del.': 'Delaware', 'Fla.': 'Florida', 'Ga.': 'Georgia', 'Ill.': 'Illinois',
  'Ind.': 'Indiana', 'Kan.': 'Kansas', 'Ky.': 'Kentucky', 'La.': 'Louisiana', 'Md.': 'Maryland',
  'Mass.': 'Massachusetts', 'Mich.': 'Michigan', 'Minn.': 'Minnesota', 'Miss.': 'Mississippi',
  'Mo.': 'Missouri', 'Mont.': 'Montana', 'Neb.': 'Nebraska', 'Nev.': 'Nevada', 'N.H.': 'New Hampshire',
  'N.J.': 'New Jersey', 'N.M.': 'New Mexico', 'N.Y.': 'New York', 'N.C.': 'North Carolina',
  'N.D.': 'North Dakota', 'Okla.': 'Oklahoma', 'Ore.': 'Oregon', 'Pa.': 'Pennsylvania',
  'R.I.': 'Rhode Island', 'S.C.': 'South Carolina', 'S.D.': 'South Dakota', 'Tenn.': 'Tennessee',
  'Vt.': 'Vermont', 'Va.': 'Virginia', 'Wash.': 'Washington', 'W.Va.': 'West Virginia',
  'Wis.': 'Wisconsin', 'Wyo.': 'Wyoming',
};

// Postal codes. IN, OR, ME, OK, HI and DE are left out: they're ordinary words too.
const POSTAL: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', FL: 'Florida', GA: 'Georgia', ID: 'Idaho', IL: 'Illinois', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const STATE_LOOKUP: Record<string, string> = { ...POSTAL, ...AP_STATE_ABBR };
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stateAlt = Object.keys(STATE_LOOKUP).sort((a, b) => b.length - a.length).map(escapeRe).join('|');
const STATE_RE = new RegExp(
  `\\b([A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2}),[ \\u00a0]+(${stateAlt})(?=[\\s,;:)”"]|\\.(?![A-Za-z])|$)`,
  'g',
);

export const apStates: Rule = {
  id: 'ap.state-names', pack: 'ap', category: 'Places', title: 'Spell out the state',
  safe: true, inQuotes: 'apply',
  reason: 'In story text, spell out state names after a city.',
  why: 'Write Burlingame, California, not Burlingame, CA or Burlingame, Calif. Abbreviations are only for lists, tables and photo credits.',
  find(ctx) {
    return regexHits(ctx, STATE_RE, (m) => {
      const abbr = m[2];
      const start = m.index + m[0].length - abbr.length;
      return fixPeriods(ctx, { start, end: start + abbr.length, replacement: STATE_LOOKUP[abbr] });
    });
  },
};

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export const apMoney: Rule = {
  id: 'ap.money', pack: 'ap', category: 'Numbers', title: 'Money',
  safe: true, inQuotes: 'apply',
  reason: 'Use the $ sign and figures for dollar amounts.',
  why: 'Write $5, not 5 dollars. Amounts under a dollar use the word: 5 cents. Big amounts: $4.35 million.',
  find(ctx) {
    return [
      ...regexHits(ctx, /\$?(\d[\d,]*(?:\.\d+)?)((?:[ \u00a0]+(?:million|billion|trillion))?)[ \u00a0]+dollars?\b/g, (m) =>
        changed(m.index, m[0], `$${m[1]}${m[2]}`)),
      ...regexHits(ctx, /\$0?\.(\d{2})\b(?![\d,])/g, (m) => {
        const cents = Number(m[1]);
        return cents > 0 ? changed(m.index, m[0], `${cents} cents`) : null;
      }),
    ];
  },
};

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const ABBREVIATE: Record<string, string> = { Street: 'St.', Avenue: 'Ave.', Boulevard: 'Blvd.', St: 'St.', Ave: 'Ave.', Blvd: 'Blvd.' };
const SPELL_OUT: Record<string, string> = {
  Rd: 'Road', Dr: 'Drive', Ln: 'Lane', Ct: 'Court', Cir: 'Circle', Pl: 'Place', Ter: 'Terrace', Pkwy: 'Parkway',
  Road: 'Road', Drive: 'Drive', Lane: 'Lane', Court: 'Court', Circle: 'Circle', Place: 'Place', Terrace: 'Terrace', Parkway: 'Parkway', Way: 'Way',
};
const COMPASS: Record<string, string> = { North: 'N.', South: 'S.', East: 'E.', West: 'W.', N: 'N.', S: 'S.', E: 'E.', W: 'W.' };

const ADDRESS_RE = /\b(\d{1,6})[ \u00a0]+(?:(North|South|East|West|[NSEW])\.?[ \u00a0]+)?(\d{1,3}(?:st|nd|rd|th)|[A-Z][a-z]+(?:[ \u00a0][A-Z][a-z]+){0,2})[ \u00a0]+(Street|Avenue|Boulevard|Road|Drive|Lane|Court|Circle|Place|Terrace|Parkway|Way|St|Ave|Blvd|Rd|Dr|Ln|Ct|Cir|Pl|Ter|Pkwy)(\.?)(?![A-Za-z])/g;

export const apAddresses: Rule = {
  id: 'ap.addresses', pack: 'ap', category: 'Places', title: 'Street address',
  safe: true, inQuotes: 'apply',
  reason: 'With a house number, shorten only St., Ave. and Blvd.; spell out Road, Drive and the rest.',
  why: 'Write 123 Main St. and 12 Oak Road. Without a number, spell it out: Main Street. Street names First through Ninth are spelled out: 7 Fifth Ave.',
  find(ctx) {
    const numbered = regexHits(ctx, ADDRESS_RE, (m) => {
      const [matched, num, compass, name, suffix, dot] = m;
      // A period after a full word ("Circle.") ends the sentence; it isn't part of the address.
      const all = dot && suffix.length > 4 ? matched.slice(0, -1) : matched;
      const street = ORDINAL_WORDS[name] ?? name;
      const kind = ABBREVIATE[suffix] ?? SPELL_OUT[suffix];
      const dir = compass ? `${COMPASS[compass]} ` : '';
      const fixed = `${num} ${dir}${street} ${kind}`;
      if (fixed === all) return null;
      return fixPeriods(ctx, { start: m.index, end: m.index + all.length, replacement: fixed });
    });
    const unnumbered = regexHits(ctx, /\b([A-Z][a-z]+(?:[ \u00a0][A-Z][a-z]+)?)[ \u00a0]+(Ave|Blvd)\.(?!\s*\d)/g, (m) => {
      if (/\d+[ \u00a0]+(?:[NSEW]\.[ \u00a0]+)?$/.test(ctx.text.slice(Math.max(0, m.index - 12), m.index))) return null;
      const start = m.index + m[0].length - m[2].length - 1;
      const word = m[2] === 'Ave' ? 'Avenue' : 'Boulevard';
      return fixPeriods(ctx, { start, end: start + m[2].length + 1, replacement: word });
    });
    return [...numbered, ...unnumbered];
  },
};

// ---------------------------------------------------------------------------
// Word list
// ---------------------------------------------------------------------------

interface WordEntry { re: RegExp; to: (m: RegExpExecArray) => string }

function wordRule(info: Omit<RuleInfo, 'safe'> & { safe?: boolean }, entries: WordEntry[]): Rule {
  return {
    safe: true,
    ...info,
    find(ctx) {
      return entries.flatMap((e) =>
        regexHits(ctx, e.re, (m) => changed(m.index, m[0], matchCase(m[0], e.to(m)))));
    },
  };
}

export const apOK = wordRule(
  { id: 'ap.ok', pack: 'ap', category: 'Words', title: 'OK', inQuotes: 'apply',
    reason: 'Write OK, not okay.', why: 'AP spells it OK, OK’d, OK’ing and OKs.' },
  [{ re: /\b[Oo]kay\b/g, to: () => 'OK' }, { re: /\b[Oo]kayed\b/g, to: () => 'OK’d' }],
);

export const apToward = wordRule(
  { id: 'ap.toward', pack: 'ap', category: 'Words', title: 'Toward', inQuotes: 'skip',
    reason: 'Write toward, not towards.', why: 'AP uses toward. Inside a quote, keep the speaker’s own word.' },
  [{ re: /\b[Tt]owards\b/g, to: () => 'toward' }],
);

export const apEmail = wordRule(
  { id: 'ap.email', pack: 'ap', category: 'Words', title: 'Email', inQuotes: 'apply',
    reason: 'Email has no hyphen.', why: 'Write email. Other e- words keep the hyphen: e-book, e-reader.' },
  [{ re: /\b[Ee]-mail(s|ed|ing)?\b/g, to: (m) => `email${m[1] ?? ''}` }],
);

export const apHealthcare = wordRule(
  { id: 'ap.healthcare', pack: 'ap', category: 'Words', title: 'Healthcare', inQuotes: 'apply',
    reason: 'Healthcare is one word.', why: 'AP made healthcare one word in its 58th edition.' },
  [{ re: /\b[Hh]ealth[ -]care\b/g, to: () => 'healthcare' }],
);

export const apAsylum = wordRule(
  { id: 'ap.asylum-seeker', pack: 'ap', category: 'Words', title: 'Asylum seeker', inQuotes: 'apply',
    reason: 'Asylum seeker has no hyphen.', why: 'AP dropped the hyphen in its 58th edition: asylum seeker.' },
  [{ re: /\b[Aa]sylum-seeker(s?)\b/g, to: (m) => `asylum seeker${m[1]}` }],
);

// ---------------------------------------------------------------------------
// Ellipsis
// ---------------------------------------------------------------------------

export const apEllipsis: Rule = {
  id: 'ap.ellipsis', pack: 'ap', category: 'Punctuation', title: 'Ellipsis spacing',
  safe: true, inQuotes: 'apply',
  reason: 'An ellipsis is three periods with a space on each side.',
  why: 'Treat ... like a word: musician ... You. Type three periods instead of the single … character.',
  find(ctx) {
    return regexHits(ctx, /[ \t\u00a0]*(?:…|(?<!\.)\.\.\.(?!\.))[ \t\u00a0]*/g, (m) => {
      const before = ctx.text[m.index - 1];
      const after = ctx.text[m.index + m[0].length];
      const atStart = before === undefined || before === '\n' || before === '“' || before === '"';
      const atEnd = after === undefined || after === '\n' || after === '”' || (after === '"' && before !== ' ');
      const fixed = atStart ? '... ' : atEnd ? ' ...' : ' ... ';
      return changed(m.index, m[0], fixed);
    });
  },
};

export const apQuoteEllipsis: Rule = {
  id: 'ap.quote-ellipsis-edge', pack: 'ap', category: 'Quotes', title: 'Ellipsis at quote edge',
  safe: false, inQuotes: 'apply',
  reason: 'Don’t start or end a direct quote with an ellipsis.',
  why: 'Just start the quote where the words you’re using begin, and end it where they end.',
  find(ctx) {
    return regexHits(ctx, /“\s*(?:…|\.\.\.)|(?:…|\.\.\.)\s*[,.]?”/g, (m) => ({ start: m.index, end: m.index + m[0].length }));
  },
};

export const apSlang: Rule = {
  id: 'ap.slang-spelling', pack: 'ap', category: 'Quotes', title: 'Spoken spelling in quote',
  safe: false, inQuotes: 'only',
  reason: 'Don’t spell out how someone pronounced a word unless they meant it for emphasis.',
  why: 'Write “going to,” not “gonna,” unless the speaker was clearly stressing it.',
  find(ctx) {
    const full: Record<string, string> = { gonna: 'going to', wanna: 'want to', gotta: 'got to', kinda: 'kind of', sorta: 'sort of' };
    return regexHits(ctx, /\b(gonna|wanna|gotta|kinda|sorta)\b/gi, (m): Hit => ({
      start: m.index, end: m.index + m[0].length, replacement: matchCase(m[0], full[m[1].toLowerCase()]),
    }));
  },
};

export const AP_RULES: Rule[] = [
  apMonths, apPercent, apTimes, apTimeNoHalf, apTimeRedundant, apStates, apMoney, apAddresses,
  apOK, apToward, apEmail, apHealthcare, apAsylum, apEllipsis, apQuoteEllipsis, apSlang,
];
