# AP rule notes for Buzzword

Checked against AP Stylebook Online (58th edition), Nov. 23, 2026, during the free trial.
Written in our own words, not AP's. Don't paste Stylebook text here.

Legend: ✅ the spec rule is right · ⚠️ the spec rule needs a change · 🆕 a new rule or test case

---

## MVP rules

### 1–2. Months (`months`, `dates`) ✅
- Only **Jan., Feb., Aug., Sept., Oct., Nov., Dec.** are abbreviated, and only with a specific day. March, April, May, June and July are never abbreviated.
- Spell out the month when it stands alone or has only a year: `January 2016`, not `Jan. 2016`.
- Month + year: **no comma** between them (`January 2016`). Month + day + year: put commas around the year (`Feb. 14, 2025, was...`).
- Fix template: `Sept.`, not `Sep.`. The three-letter forms without periods are for tables only.
- 🆕 Tests: `October 2026` → no flag · `Sep. 5` → `Sept. 5` · `Mar. 3` → `March 3`.

### 3. No date ordinals (`dates`) ✅
- Date numbers never take st/nd/rd/th.
- 🆕 Must **not** flag ordinals that aren't dates: `27th Annual CSM Jazz Festival`, `the 10th third-grader`.

### 4. Percent (`percent, percentage, percentage points`) ⚠️
- Use `%` right after the number with no space: `45%`.
- Under 1%: leading zero (`0.6%`).
- ⚠️ **At the start of a sentence, spell out both the number and the word**: `Eighty-nine percent of...`. So `45 percent` at the start of a sentence must **not** become `45%`. The rule needs a sentence-start check.
- `zero percent` stays spelled out.
- `percentage` (no number) is correct and shouldn't be flagged.

### 5. Times (`times`, `a.m., p.m.`) ✅ with additions
- Use figures, lowercase `a.m.`/`p.m.` with periods. Use a colon only when there are minutes: `3 p.m.`, `3:30 p.m.`
- So `3:00 PM` → `3 p.m.`; `6pm` → `6 p.m.`; `6 PM` → `6 p.m.`
- 🆕 Ranges are fine as `9-11 a.m.` and `9 a.m. to 5 p.m.`
- 🆕 Sidebar-only flag for redundancy: `10 a.m. this morning`, `10 p.m. tonight`.
- `4 o'clock` is allowed. Don't flag it.
- 🆕 From the jazz draft: `starts at 8:30` has no a.m./p.m. Flag in the sidebar only (Buzzword can't guess which).

### 6. Noon / midnight (`noon`, `midnight`) ⚠️ **spec was partly wrong**
- `noon`: never put 12 in front. `12 noon` → `noon`; `12 p.m.` → `noon` (safe).
- ⚠️ `midnight`: AP now says to **avoid `midnight` when the day could be unclear** and to write `11:59 p.m. Thursday` or `12:01 a.m. Friday` instead. So `12 a.m.` → `midnight` is **not** a safe automatic fix. Make `12 a.m.` / `midnight` a sidebar-only flag.

### 7. State names (`state names`) ✅ with a local twist
- In body text, spell out state names, alone or after a city: `Burlingame, California`.
- No state is needed if it's the same as the dateline. A student paper usually has no dateline, but for local stories naming the state may be unnecessary. House-style question for the EIC: `Burlingame, CA` → `Burlingame` or `Burlingame, California`?
- Abbreviations are OK in lists, tables, and **credit lines** (photo credits), so don't run this rule on the Photos table.
- 🆕 Also catch the older abbreviations in body text: `Calif.` → `California`.

### 8. Money (`dollars`, `cents`) ✅
- `$` + figures: `5 dollars` → `$5`. Casual uses with no figure stay as words ("give me a dollar").
- Under a dollar: `5 cents` (spelled-out word, figure number). `$0.05` → `5 cents` is a candidate rule.
- Millions: `$4.35 million`, no hyphen even before a noun (`$300 billion budget`). At most two decimal places.

### 9. Addresses (`addresses`) ⚠️ **broader than the spec**
- Only **Ave., Blvd., St.** are abbreviated, and only with a house number: `123 Main St.`
- Without a number, spell them out: `Main Street`.
- ⚠️ All other street words (Road, Drive, Lane, Terrace, Circle, Alley...) are **always spelled out**, so `123 Oak Rd.` → `123 Oak Road`. This is the reverse fix, and it's also safe.
- Numbered streets: First through Ninth spelled out, 10th and up in figures: `7 Fifth Ave.`, `100 21st St.`
- Compass points abbreviated only with a number: `222 E. 42nd St.`, but `East 42nd Street`.

### 10. Word list ✅ with additions
- `okay` → `OK` (`OK'd`, `OK'ing`, `OKs`)
- `towards` → `toward`
- `e-mail` → `email`. ⚠️ But other e- words **keep** the hyphen: `e-book`, `e-reader`, `e-commerce`. The rule must match `e-mail` only.
- 🆕 New in the 58th edition: **`healthcare` is now one word** (`health care` → `healthcare`).
- 🆕 New in the 58th edition: `asylum-seeker` → `asylum seeker` (no hyphen).

### 🆕 11. Ellipsis (`ellipsis` in Punctuation)
- Three periods, spaced like a word: one space before and after. `musician…You` → `musician ... You`
- If the text before it is a complete sentence, it ends with its own period, then a space, then the ellipsis.
- MVP-safe part: replace the single `…` character and fix the spacing. The complete-sentence period needs context, so keep it sidebar-only.
- Never start or end a direct quote with an ellipsis. That's a candidate sidebar flag.

---

## ⚠️ Quotes: AP disagrees with part of our plan

AP's quotations entry says:
- **Formatting rules DO apply inside quotes** when quoting *spoken* words: numbers, abbreviations, money, titles (`No. 1`, `St.`, `Gov.`, `$3`). So rules 1–9 run inside quotes. ✅
- **Word choice must NOT be changed in quotes.** AP's own example says not to change a speaker's `towards` to `toward`. So rule 10's `towards` must **skip quoted text**. `okay` → `OK` and `e-mail` → `email` are spelling and formatting, so they can still apply. (We should confirm this distinction.)
- **Written** quotes (from a letter, post, or statement) keep the writer's own style. Buzzword can't tell spoken from written, so this needs a human.
- **Filler words:** AP says small slips *may* be removed, but **only by replacing them with an ellipsis**, and with great care. Deleting `um`/`uh` outright is a **house-style choice that differs from AP**. The EIC should decide this knowingly.
- `gonna`/`wanna`: AP says don't use these spellings unless the speaker meant them for emphasis. Sidebar-only flag.
- AP no longer uses `(sic)`. Paraphrase instead.

---

## Later context rules (checked now so they're ready)

- **Numbers** (`numerals`): spell out one through nine, figures for 10 and up. Ages and units of measure always use figures (`5-year-old`). Time spans spell out one through nine (`eight years` ✅, `a six-year plan`). Spell out any number that starts a sentence (except years). From the jazz draft: `3 adjudicators` → `three adjudicators`.
- **Serial comma** (`comma`): no comma before and/or in a simple series. Keep it only if leaving it out would cause confusion. Jazz draft: `Ratings Scuffle Shuffle, Curveball, and Madrid` → drop the last comma.
- **Composition titles**: put song, album, book and movie titles in quotes. Capitalize everything except articles and prepositions/conjunctions of three letters or fewer (unless they come first or last). Jazz draft: song titles need quotes.
- **Titles** (`titles`): capitalize *formal* titles directly before a name. Lowercase *occupational* descriptions. Lowercase titles set off by commas or used without a name. Jazz draft: `CSM Jazz Festival Host Rob Delgado` → `host`. `Director of Music Dana Whitfield` depends on whether the school treats it as a formal title.
- **Grades** (`grade, grader`): no hyphen in most cases: `fourth grade student`, `first grader` (2019 change).
- **Millions** (`millions, billions, trillions`): `1.5 million`, not `1 1/2 million`. Keep the word in both halves of a range (`$2 million to $4 million`).
- **Years** (`years`): leave out the year for dates in the current year. Include it, with commas, for other years.
