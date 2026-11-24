import { describe, expect, it } from 'vitest';
import { check, fixAll, RULE_INFO } from './index';
import type { Settings } from './types';

const ids = (text: string, settings?: Partial<Settings>) => check(text, { settings }).map((i) => i.ruleId);

/** [input, expected after all safe fixes] */
type Fix = [string, string];

function fixes(name: string, cases: Fix[], settings?: Partial<Settings>) {
  describe(name, () => {
    it.each(cases)('%s', (input, expected) => {
      expect(fixAll(input, { settings })).toBe(expected);
    });
  });
}

/** Text that must come back unchanged and unflagged by the given rule. */
function clean(name: string, ruleId: string, cases: string[], settings?: Partial<Settings>) {
  describe(`${name} (should not flag)`, () => {
    it.each(cases)('%s', (input) => {
      expect(ids(input, settings)).not.toContain(ruleId);
    });
  });
}

/** Sidebar-only flags: reported, but never changed automatically. */
function flags(name: string, ruleId: string, cases: string[]) {
  describe(`${name} (sidebar flag)`, () => {
    it.each(cases)('%s', (input) => {
      const issue = check(input).find((i) => i.ruleId === ruleId);
      expect(issue, `expected ${ruleId}`).toBeDefined();
      expect(issue!.safe).toBe(false);
    });
  });
}

// ---------------------------------------------------------------- AP: dates

fixes('months', [
  ['The game is October 5.', 'The game is Oct. 5.'],
  ['It starts on September 12, 2027, in the gym.', 'It starts on Sept. 12, 2027, in the gym.'],
  ['Applications close Mar. 3.', 'Applications close March 3.'],
  ['The dance is Sep. 5.', 'The dance is Sept. 5.'],
  ['The meeting is Jan 9.', 'The meeting is Jan. 9.'],
  ['It was Oct. 2026 when it opened.', 'It was October 2026 when it opened.'],
  ['It was October, 2026 when it opened.', 'It was October 2026 when it opened.'],
  ['Finals start Dec. 5th.', 'Finals start Dec. 5.'],
  ['Prom is May 3rd.', 'Prom is May 3.'],
  ['On August 21st we left.', 'On Aug. 21 we left.'],
]);
clean('months', 'ap.month-abbrev', ['It was a cold October.', 'October 2026 was cold.', 'Oct. 5 is the date.', 'March 3 is the date.']);
clean('ordinals that aren’t dates', 'ap.date-ordinal', [
  'The 27th Annual CSM Jazz Festival showcases 19 different performances.',
  'She was the 10th third-grader to join.',
]);
clean('May the verb', 'ap.month-spelled', ['Students may 5 times retake it.', 'They may go.']);

// ---------------------------------------------------------------- AP: numbers

fixes('percent (house: word)', [
  ['About 45% of students voted.', 'About 45 percent of students voted.'],
  ['Turnout rose 3.5 % this year.', 'Turnout rose 3.5 percent this year.'],
  ['It grew 10 per cent.', 'It grew 10 percent.'],
]);
fixes('percent (AP: symbol)', [
  ['About 45 percent of students voted.', 'About 45% of students voted.'],
], { percentStyle: 'symbol' });
clean('percent at sentence start (AP mode)', 'ap.percent', ['45 percent of students voted.'], { percentStyle: 'symbol' });

fixes('money', [
  ['Tickets cost 5 dollars.', 'Tickets cost $5.'],
  ['The club raised $500 dollars.', 'The club raised $500.'],
  ['The bond is 4.35 million dollars.', 'The bond is $4.35 million.'],
  ['Candy costs $0.50 each.', 'Candy costs 50 cents each.'],
]);
clean('money', 'ap.money', ['Tickets cost $5.', 'It costs 5 cents.', 'Dollars are flowing.']);

// ---------------------------------------------------------------- AP: times

fixes('times', [
  ['The first performance starts at 8:30 a.m., and performances run until 6pm.', 'The first performance starts at 8:30 a.m., and performances run until 6 p.m.'],
  ['Doors open at 3:00 PM.', 'Doors open at 3 p.m.'],
  ['Doors open at 3:30 PM today.', 'Doors open at 3:30 p.m. today.'],
  ['It ends at 9 AM sharp.', 'It ends at 9 a.m. sharp.'],
  ['Lunch is at 12 p.m. on Friday.', 'Lunch is at noon on Friday.'],
  ['Lunch is at 12:00 PM.', 'Lunch is at noon.'],
  ['The lock-in ends at 12 a.m.', 'The lock-in ends at midnight.'],
  ['Meet at 12 noon.', 'Meet at noon.'],
]);
clean('times', 'ap.times', ['It starts at 3 p.m. and ends at 4:30 p.m.', 'It ran 9 a.m. to 5 p.m.', 'I am 5 feet tall.']);
flags('time with no a.m./p.m.', 'ap.time-no-ampm', ['The first performance starts at 8:30, and runs late.']);
clean('time with no a.m./p.m.', 'ap.time-no-ampm', ['It starts at 8:30 a.m.', 'It ran 9:30-11 a.m.', 'Her mile time was 5:32.4 on Friday.']);
flags('redundant time', 'ap.time-redundant', ['The rally is at 10 a.m. this morning.']);

// ---------------------------------------------------------------- AP: places

fixes('state names', [
  ['She moved to Fresno, CA last year.', 'She moved to Fresno, California last year.'],
  ['She moved to Fresno, Calif., last year.', 'She moved to Fresno, California, last year.'],
  ['He lives in Portland, Ore. He likes it.', 'He lives in Portland, Oregon. He likes it.'],
  ['The trip went to Austin, TX.', 'The trip went to Austin, Texas.'],
]);
clean('state names', 'ap.state-names', ['Thanks, OK, we will.', 'Burlingame, California, is close.', 'He said, IN THE END, it worked.']);

fixes('addresses', [
  ['The shop is at 123 Main Street.', 'The shop is at 123 Main St.'],
  ['The shop is at 123 Main Street in town.', 'The shop is at 123 Main St. in town.'],
  ['It is at 12 Oak Rd. near the park.', 'It is at 12 Oak Road near the park.'],
  ['It is at 12 Oak Rd.', 'It is at 12 Oak Road.'],
  ['The office is at 7 5th Avenue.', 'The office is at 7 Fifth Ave.'],
  ['Go to 222 East 42nd Street.', 'Go to 222 E. 42nd St.'],
  ['Parking is on El Camino Real and Howard Ave. today.', 'Parking is on El Camino Real and Howard Avenue today.'],
]);
clean('addresses', 'ap.addresses', ['The shop is on Main Street.', 'The shop is at 123 Main St.', 'They visited St. Louis.', 'It is at 9 Morningside Circle.']);

// ---------------------------------------------------------------- AP: words and punctuation

fixes('word list', [
  ['That is okay with us.', 'That is OK with us.'],
  ['Okay, the plan changed.', 'OK, the plan changed.'],
  ['They walked towards the gym.', 'They walked toward the gym.'],
  ['Send an e-mail to the editor.', 'Send an email to the editor.'],
  ['Health care costs rose.', 'Healthcare costs rose.'],
  ['The asylum-seekers arrived.', 'The asylum seekers arrived.'],
]);
clean('towards inside a quote', 'ap.toward', ['“We moved towards the goal,” Brooks said.']);
clean('e-book keeps its hyphen', 'ap.email', ['She read an e-book.']);

fixes('ellipsis', [
  ['“Having a perspective of jazz performance is quite essential as a musician…You can compare yourself,” Delgado said.',
   '“Having a perspective of jazz performance is quite essential as a musician ... You can compare yourself,” Delgado said.'],
  ['It was long...but fun.', 'It was long ... but fun.'],
]);
clean('ellipsis', 'ap.ellipsis', ['It was long ... but fun.', 'It was long. ... But fun.']);

// ---------------------------------------------------------------- House: people

fixes('class years', [
  ['The 10th graders won.', 'The sophomores won.'],
  ['Every 12th grader voted.', 'Every senior voted.'],
  ['Ninth graders arrive first.', 'Freshmen arrive first.'],
  ['The award went to Junior Sam Ortega.', 'The award went to junior Sam Ortega.'],
]);
clean('class years', 'house.grade-names', [
  'Sophomore Vice President Ana Ruiz spoke.',
  'Tickets for Senior Night sold out.',
  'Seniors voted first.',
  'junior Sam Ortega said',
]);

fixes('vice principal, adviser, website', [
  ['The assistant principal spoke.', 'The vice principal spoke.'],
  ['Ask the vice-principal.', 'Ask the vice principal.'],
  ['Our advisor approved it.', 'Our adviser approved it.'],
  ['Check the web site.', 'Check the website.'],
  ['Visit theburlingameb.org today.', 'Visit TheBurlingameB.org today.'],
  ['They toured UCSC.', 'They toured UC Santa Cruz.'],
]);
flags('Mr. and Mrs.', 'house.honorifics', ['Mr. Smith teaches math.']);
flags('school name', 'house.school-name', ['Burlingame High School graduate Alex Moreno performed.']);
flags('room number', 'house.room-number', ['The club meets in Room A-112.']);

// ---------------------------------------------------------------- House: sports

fixes('sports', [
  ['The junior varsity team won.', 'The JV team won.'],
  ['The J.V. team won.', 'The JV team won.'],
  ['She made the Varsity team.', 'She made the varsity team.'],
  ['“We were ready,” baseball Head Coach Dan Ariola said.', '“We were ready,” baseball head coach Dan Ariola said.'],
  ['The Blue Devil’s won again.', 'The Blue Devils won again.'],
  ['The blue devils won again.', 'The Blue Devils won again.'],
  ['The girls soccer team won.', 'The women’s soccer team won.'],
  ['The boys basketball team lost.', 'The men’s basketball team lost.'],
]);
flags('PR and SB', 'house.pr-sb', ['She set a PR in the mile.']);

// ---------------------------------------------------------------- House: quotes

fixes('said', [
  ['“I hate the world,” said Lee.', '“I hate the world,” Lee said.'],
  ['“I love people,” said senior Will Bodendorfer.', '“I love people,” senior Will Bodendorfer said.'],
  ['“I am failing everybody,” said journalism teacher Kelly Wilkerson.', '“I am failing everybody,” journalism teacher Kelly Wilkerson said.'],
  ['“It’s due Friday,” Brown explained.', '“It’s due Friday,” Brown said.'],
  ['“We won,” junior Sam Ortega noted.', '“We won,” junior Sam Ortega said.'],
  ['“It was great”, she said.', '“It was great,” she said.'],
  ['He called it “devastating”.', 'He called it “devastating.”'],
]);
clean('long title may come first', 'house.said-order', ['“I love people,” said Queen of All Things Rad Kacey Hsu.']);
clean('said inside a quote', 'house.said-verbs', ['“She explained it twice,” Brooks said.']);
flags('says', 'house.says', ['“It’s a big deal,” Brooks says.']);

fixes('fillers in quotes', [
  ['“Um, so we practiced a lot,” Brooks said.', '“So we practiced a lot,” Brooks said.'],
  ['“I think, um, we did well,” Brooks said.', '“I think we did well,” Brooks said.'],
  ['“It was uh really fun,” Brooks said.', '“It was really fun,” Brooks said.'],
]);
fixes('fillers as ellipsis (AP)', [
  ['“I think, um, we did well,” Brooks said.', '“I think ... we did well,” Brooks said.'],
], { fillerStyle: 'ellipsis' });
clean('filler outside quotes is left alone', 'house.fillers', ['The um-brella stand broke.', 'Uh, this is narration.']);
clean('“that that” is real English', 'house.stutter', ['“I would say that that was one of our best performances,” junior Sam Ortega said.']);
flags('stutter', 'house.stutter', ['“I-I didn’t know,” Brooks said.']);

// ---------------------------------------------------------------- House: numbers, dates, formatting

fixes('numbers and dates', [
  ['The team won over 20 games.', 'The team won more than 20 games.'],
  ['The meeting is on Tuesday, Sept. 5.', 'The meeting is on Sept. 5.'],
  ['She lived in the 1960’s.', 'She lived in the 1960s.'],
  ['It was a hit in the ’90’s.', 'It was a hit in the ’90s.'],
  ['The game ended.  Then we left.', 'The game ended. Then we left.'],
]);
clean('over without a number', 'house.more-than', ['They won 3-2 over Aragon.', 'The ball flew over the fence.']);
flags('numeral starts a sentence', 'house.numeral-start', ['The vote was close. 30 teachers went.']);
clean('year may start a sentence', 'house.numeral-start', ['2001 was the year it changed.', 'The 27th Annual CSM Jazz Festival is here.']);
flags('exclamation', 'house.exclamation', ['We won the title!']);
clean('exclamation inside a quote', 'house.exclamation', ['“We won!” Brooks said.']);

// ---------------------------------------------------------------- Engine behavior

describe('engine', () => {
  it('every reported rule id has metadata', () => {
    const sample = 'On Tuesday, October 5th at 3:00 PM, 45% of the 10th graders e-mailed Mr. Smith in Fresno, CA!';
    for (const issue of check(sample)) expect(RULE_INFO[issue.ruleId]).toBeDefined();
  });

  it('safe fixes never overlap', () => {
    const issues = check('Lunch is at 12:00 PM on October 5th, 2026.').filter((i) => i.safe);
    const sorted = [...issues].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].start).toBeGreaterThanOrEqual(sorted[i - 1].end);
  });

  it('cleans the jazz festival paragraph without touching correct text', () => {
    const before = 'The first performance starts at 8:30, and performances run until 6pm. Burlingame has returned to this festival for all eight years Director of Music Dana Whitfield has worked at Burlingame.';
    expect(fixAll(before)).toBe(before.replace('6pm.', '6 p.m.'));
    expect(ids(before)).toContain('ap.time-no-ampm');
  });
});
