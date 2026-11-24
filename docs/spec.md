# Buzzword — Spec (v2)

Nov. 23, 2026 · @Jason Lu · Revised from v1 after checking the rules against the AP Stylebook (58th edition) and The B style guide.

Supporting docs: `ap-rule-notes.md` (AP check), `the-b-style-guide.md` (house guide), `house-rule-map.md` (house guide → rules).

## Overview

Buzzword is a style helper for The Burlingame B: a Google Docs add-on that flags AP style and The B house-style errors in drafts, so stories are clean before they reach editors or WordPress.

**Problem:** Style fixes (dates, numbers, titles, quotes and attribution, house terms) are the most repeated edits on the copy desk. Spell checkers and Grammarly don't know AP or The B's rules, and checking by hand slows down publishing.

**Goals**

- Catch common, clear-cut AP and house-style errors with few false alarms (target: 90%+ of flags are real errors).
- One-click fixes as normal Google Docs suggestions, with a short reason for each rule.
- An "AP-ready" count that shows when a draft has no issues left.
- House style comes first: The B's rules override AP where they differ, and the EIC can change them without a code release.

**Non-goals (v1):** grammar and spelling, fact-checking, rewriting for tone. Also no AI or LLM features: Buzzword runs on rules only (decided Nov. 23, 2026).

**Rule priority:** The B style guide → AP Stylebook. Where the guide is silent, AP applies.

## Users and workflows

| User | What they do | What they need |
| --- | --- | --- |
| Reporter | Writes the draft in the Article Draft template | Suggestions with a short reason for each rule, so they learn the style |
| Section / copy editor | Edits drafts before they reach the online editor | A list of every issue; safe fixes as suggestions they can accept in bulk |
| Online editor | Uploads and does final checks before publishing | Drafts arrive already clean, so the final check before WordPress is faster |
| Adviser / EIC | Sets house style | A way to add, turn off, or change house rules for the whole staff |

**Main flow**

1. Reporter writes in the Article Draft template and opens **Extensions → Buzzword**.
2. They click **Check whole story**, or select some text first and click **Check selection**.
3. Buzzword creates a normal Google Docs suggestion for every safe fix. The sidebar lists each issue with a one-line reason, including the flags that need a human.
4. The reporter (or an editor later) accepts or rejects suggestions with Docs' own buttons, and handles sidebar-only flags by hand.
5. At zero issues the sidebar shows **AP-ready**, and the draft goes to editors, then into WordPress.

## What gets scanned

Every draft uses the same template, so **Check whole story** checks only the story body:

| Template part | Scanned? |
| --- | --- |
| Header table (Title, Byline, Page Designer, Page Number, Word Count) | No (headline checks come in Phase 2) |
| Photos table (album link, photos, credits, captions) | No (caption checks come in Phase 2) |
| "Article Draft" heading + instruction line | No |
| **Story body** | **Yes** |
| "Otter link + Notes" and everything after it | **Never.** It holds links and each source's grade, gender and ethnicity |

Buzzword finds the body by looking for the "Article Draft" and "Otter link + Notes" headings. If it can't find them (not using the template), it scans the whole doc and says so in the sidebar.

**Check selection** checks exactly the selected text, wherever it is. If nothing is selected, the button is grayed out.

## Quotes policy

Based on AP's quotations entry, with The B's choices on top:

- **Formatting rules apply inside quotes:** dates, times, numbers, money, abbreviations (`$3`, `St.`, `Gov.`).
- **Word-choice rules skip quotes:** a speaker's `towards` stays `towards`. Each rule has an `inQuotes` setting.
- **Spelling-only fixes apply in quotes:** `okay` → `OK`, `e-mail` → `email`.
- **Filler words** (`um`, `uh`, `umm`, `uhh`): removed in quotes as a house rule. AP allows this only by replacing them with an ellipsis. *(Open question: delete outright or use an ellipsis.)* Filler `like` and repeated words are sidebar-only (`I would say that that was` is correct English).
- **Written quotes** (letters, posts, statements) keep the writer's own style. Buzzword can't tell spoken from written, so the sidebar notes this when a quote is changed.

## Scope

| Feature | MVP | Phase 2 | Later |
| --- | --- | --- | --- |
| Google Docs add-on with a sidebar | Yes | | |
| Pattern rules: AP pack + house pack | Yes | | |
| Check whole story / Check selection | Yes | | |
| Fixes as Docs suggestions | Yes | | |
| Sidebar issue list with one-line reason | Yes | | |
| AP-ready count | Yes | | |
| Suggestion tracking (duplicate prevention + accept/reject data) | Yes | | |
| House rules | JSON pack | Shared Google Sheet the EIC edits | |
| Structural context rules (references, quotes, sentences) | | Yes | |
| Learn mode | | Yes | |
| Headline and caption checks | | Yes | |
| Highlights instead of suggestions | Only if suggestions fail | | |
| Auto-check while the sidebar is open | | | Yes |
| Trained false-flag filter | | | Yes (once enough accept/reject data exists) |

## Rule engine

Rules live in JSON rule packs, not in code. There are two packs:

- **`ap`**: AP Stylebook rules.
- **`house`**: The B rules. A house rule with the same `overrides` id **replaces** the AP rule (for example, house `midnight` replaces AP's midnight caution).

The house pack ships bundled in the MVP, so changes need a push. In Phase 2 it moves to a Google Sheet the EIC edits without a release.

**Each rule has:** `id`, `pack`, `category`, `tier`, `pattern` (regex or word list), optional `context` checks, `fix` (a template; named functions only for a small built-in set like number-to-words), `safe` (true = becomes a Docs suggestion), `inQuotes` (`apply` | `skip`), `severity`, `reason` (one line, our own words), `why` (2–3 lines with an example), `apTopic` (plain-text label like "times"), `overrides` (optional), and `tests` (should-flag and should-not-flag examples).

**The engine is pure code:** `(text, options) → [{start, end, ruleId, replacement}]`. It doesn't call Apps Script, so the same code runs in Vitest and in the add-on. A separate layer maps those offsets to Docs positions.

**Overlapping matches:** when two rules match overlapping text (`12:00 PM` matches both times and noon), the longest match wins, then the rule with the higher `priority`.

### Detection tiers

Rules find, context decides:

| Tier | What it handles | How | Output | When |
| --- | --- | --- | --- | --- |
| 1. Pattern | Errors that are always wrong | Regex and word lists | Suggestions | MVP |
| 2. Structural | Rules that need position or history: first or second reference, inside quotes, sentence start, the word after a number | Code that tracks names and quotes as it scans, plus compromise.js for sentences and names | Mostly suggestions | Phase 2 |
| 3. Filter | Hides likely false alarms on noisy rules | Small trained classifier | Hides flags | Later, after a semester of data |

### MVP rule catalog: AP pack

Corrected against the 58th edition (details in `ap-rule-notes.md`):

| # | Rule | Wrong | Right | Note |
| --- | --- | --- | --- | --- |
| 1 | Months with dates | October 5 | Oct. 5 | Only Jan., Feb., Aug., Sept., Oct., Nov., Dec. (longer than five letters). Not with a month alone or month + year |
| 2 | Months never shortened | Mar. 3 / Sep. 5 | March 3 / Sept. 5 | |
| 3 | No date ordinals | Oct. 5th | Oct. 5 | Must not flag `27th Annual` |
| 4 | Percent | *see open question* | | `45 percent` vs. `45%` (EIC decides). Never change a percentage at the start of a sentence; spell it out |
| 5 | Times | 3:00 PM, 6pm | 3 p.m., 6 p.m. | Colon only with minutes |
| 6 | State names in text | Burlingame, CA / Calif. | Burlingame, California | *See open question about dropping the state for local places* |
| 7 | Money | 5 dollars | $5 | `5 cents` stays |
| 8 | Addresses | 123 Main Street / 12 Oak Rd. | 123 Main St. / 12 Oak Road | Only Ave., Blvd., St. are shortened, and only with a number |
| 9 | Word list | okay, towards, e-mail, health care, asylum-seeker | OK, toward, email, healthcare, asylum seeker | `towards` skips quotes; `e-book` keeps its hyphen |
| 10 | Ellipsis | musician…You | musician ... You | Spaces around three periods |

**Sidebar-only AP flags (MVP):** time with no a.m./p.m. (`starts at 8:30`), redundant times (`10 a.m. this morning`), `gonna`/`wanna` in quotes, an ellipsis at the start or end of a quote.

### MVP rule catalog: house pack

Safe rules from The B guide (full list and tests in `house-rule-map.md`):

| Rule | Wrong | Right |
| --- | --- | --- |
| Grade names | 10th graders | sophomores |
| Vice principal | assistant principal, vice-principal | vice principal |
| Adviser | advisor | adviser |
| Website / site URL | web site, theburlingameb.org | website, TheBurlingameB.org |
| One space | `said.  The` | `said. The` |
| Punctuation inside quotes | `great”.` | `great.”` |
| Speech verbs | `,” Smith explained.` | `,” Smith said.` |
| Speech order | `,” said Lee.` | `,” Lee said.` (short subjects only; long titles exempt) |
| JV / varsity | J.V., junior varsity, Varsity | JV, varsity |
| Coach titles | Head Coach Dan Ariola | head coach Dan Ariola |
| Blue Devils | Blue Devil's | Blue Devils |
| Decades | 1960's | 1960s |
| UCSC | UCSC | UC Santa Cruz |
| More than | over 20 games | more than 20 games |
| Noon / midnight | 12 p.m., 12 noon, 12 a.m. | noon, midnight (overrides AP's midnight caution) |
| Weekday with date | Tuesday, Sept. 5 | Sept. 5 |
| Fillers in quotes | `um`, `uh` | removed *(see open question)* |

**Sidebar-only house flags (MVP):** Mr./Mrs./Ms., exclamation marks, PR/SB, boys/girls + sport, a sentence starting with a numeral, `says` after a quote, room-number format, `Dr.`, `Burlingame High School`/`BHS`.

### Phase 2: structural rules

First/second reference (full name → last name; family members → first name), ASB first reference, UC second-reference names, numbers under 10 (with exceptions for ages, units and scores like `7-6`), ages in figures, mascots only after the school is named, one quote per paragraph, officer titles, class-name capitalization, leaving out the year for dates within 12 months, serial comma.

### Not planned: rules that depend on meaning

Formal title vs. job description, team/band as `it`, past tense, song titles in quotes, backing into quotes, buildings or districts doing things, since/because. These need an understanding of the sentence that pattern and structural rules can't give, and Buzzword has **no LLM pass** (rules only). Where a pattern catches part of one safely, it can become a sidebar flag; the rest stays with editors.

## ML plan

The goal is collecting data, not training a model up front.

1. **Find the most common fixes (Colab):** pair each Google Docs draft with its published WordPress story, diff them (Python `difflib`), sort the edits into style fixes vs. other edits, and count which fixes editors make most. Build those rules first.
2. **Score each rule:** run the engine on the same stories. Report precision **and how often each rule fired**, since a rule that fired 4 times has an unreliable precision number. Below 90% → fix the rule or drop it.
3. **Collect labels in production:** suggestion tracking (see Architecture) records whether each suggestion was accepted or rejected. Each accepted one is a "real error" label and each rejected one is a "false flag" label, with no extra work for staff.
4. **Later: trained false-flag filter.** Once a noisy rule has a few hundred labeled examples (about a semester of use), train logistic regression in Colab to hide likely false alarms. Try a small fine-tuned transformer (run in the sidebar with transformers.js) only if that isn't enough.

## UX and UI

- **Sidebar** (Extensions → Buzzword): **Check whole story**, **Check selection**, Fix / Learn toggle (Learn mode in Phase 2), and issue counts by category.
- **Suggestions:** each safe fix appears as a normal Google Docs suggestion, credited to the person who ran Buzzword.
- **Issue card:** wrong → right, one-line reason, and "Why?" (a short explanation with an example, written by us). Clicking a card selects that text in the doc. Cards show the rule's pack (AP or The B).
- **Sidebar-only cards** for flags that need a human.
- **AP-ready banner:** "0 issues — ready to send to editors." Pending Buzzword suggestions count as open issues.
- **Speed:** a full check of a 1,500-word story in about 2–3 seconds.

## Modes: Fix and Learn (Phase 2)

A toggle at the top of the sidebar switches modes. It's saved per person, and the EIC can turn Learn mode on by default for new staff.

| | Fix mode | Learn mode |
| --- | --- | --- |
| Who it's for | Editors on deadline | Reporters learning the style |
| What happens | Safe fixes become suggestions in bulk | Each flag shows the rule and a mini quiz before its suggestion is created |
| Tracks progress | No | Yes, rules passed per person |

**Learn mode flow:** the writer clicks a flag → the card explains the rule with one example → a 2-question quiz (multiple choice + "rewrite in our style") → **Pass:** the suggestion is created. **Miss:** the card shows the right answer and why, then asks one new question. After passing a rule 3 times, it's marked learned and goes back to bulk suggestions for that person.

- **Question bank:** a JSON file per rule with 5+ questions written by us, using examples from The B guide where possible. Templates swap in random months, times and amounts.
- **Checking typed answers:** normalize spaces and quotes, compare to the expected answer, and run the rule engine on the answer. If a rule still fires, its hint is shown.
- **Deadline escape:** a "Skip quiz, just fix" link, so Learn mode never blocks publishing.
- **Progress:** stored in Apps Script user properties.

## Architecture and tech stack

**How a check runs**

1. Read the document with the advanced Docs service (`Docs.Documents.get`), which gives every piece of text its position in the document. (`DocumentApp` positions don't match the positions `batchUpdate` uses, so don't mix them.)
2. Find the story body (or the selection), and collect its text along with each piece's starting position.
3. Run the rule engine on that text and map each result back to document positions.
4. Skip any range that already has a pending Buzzword suggestion.
5. Send all safe fixes as suggestions in **one** `batchUpdate` call, **ordered from the end of the doc backward** so earlier edits don't shift later positions. (Google added suggestion support to the Docs API in Sept. 2026.)
6. Save each suggestion's ID, rule ID and original text in **document properties**, so the record stays with the doc.
7. On the next check, compare saved suggestions to the doc: new text present = accepted; suggestion gone and old text still there = rejected. Update the counts and labels.
8. **Backup only if needed:** if suggestions can't be created, fall back to highlights in a distinctive color plus a Fix button. Only highlights Buzzword added are ever cleared.

Google Docs doesn't let add-ons act while you type, so checks run when you click a button (auto-check comes later).

| Part | Choice |
| --- | --- |
| Add-on type | Google Docs editor add-on (Apps Script) |
| Language | TypeScript, bundled with esbuild into one Apps Script file (clasp 3 no longer compiles TypeScript) |
| Dev tools | VS Code + clasp |
| Sidebar UI | HtmlService (HTML/CSS/JS) |
| Reading + suggestions | Advanced Docs service. If it doesn't support suggestion requests yet, call the Docs API through `UrlFetchApp` with `ScriptApp.getOAuthToken()` |
| NLP | None in MVP; compromise.js for structural rules |
| Rule packs | `ap` + `house` JSON bundled; house pack moves to a shared Sheet in Phase 2 |
| Storage | User properties (settings, Learn progress); document properties (suggestion tracking) |
| Tests | Vitest for rules (local); a test Google Doc built from real drafts for the add-on |

## Privacy, accuracy and testing

- **Privacy:** the add-on runs in Apps Script inside each reporter's Google account. Story text is sent only to Google's own Docs API, so it never leaves Google. The Notes section (source demographics) is never scanned or sent anywhere.
- **Permissions:** the open document plus the sidebar. Suggestions may need the broader `documents` permission instead of `documents.currentonly`. Test this in week 1 and request the smallest one that works.
- **Accuracy target:** 90%+ of flags are real errors. Any rule under 80% in testing is turned off or moved to sidebar-only.
- **Test set:** 50 past Burlingame B stories (Google Docs draft + published version). The editors' changes become the answer key.
- **Unit tests:** every rule has at least 3 should-flag and **10+ should-not-flag** examples, taken from real drafts where possible. From the jazz festival draft: `27th Annual` (not a date ordinal), `that that` (not a stutter), `eight years` (correctly spelled out), `6pm` (should flag), `musician…You` (should flag).
- **AP check:** every AP rule was checked against the 58th edition on Nov. 23, 2026 (`ap-rule-notes.md`). The Stylebook trial ends around Dec. 23, so any remaining lookups should happen before then. Reasons are written in our own words, with no AP entry links.
- **Feedback loop:** a "report false flag" button saves the sentence and rule ID for editors to review. Rejected suggestions are counted automatically.

## Coming soon

| Phase | Feature | What it adds |
| --- | --- | --- |
| 2 | Structural rules | First/second reference, numbers under 10, ages, ASB/UC references, serial comma, class names |
| 2 | Learn mode | Quizzes and progress |
| 2 | House-style Sheet | The EIC edits house rules in a shared Google Sheet |
| 2 | Headline and caption checks | Headline style; captions with full names, present tense, nothing copied from the headline |
| 3 | Auto-check | Re-checks every ~30 seconds while the sidebar is open |
| 3 | Trained false-flag filter | Hides likely false alarms on noisy rules, trained on accept/reject data |
| 3 | Staff stats | Which errors each section makes most, to guide copy-desk training |
| 4 | WordPress final check | Chrome extension that runs the same rules in SNO |
| 4 | Share with other schools | Public AP rule pack + a blank house pack template for other student newsrooms |

## Milestones

| Week | Deliverable |
| --- | --- |
| 1 | Add-on shell: sidebar opens in a test Doc; read the doc with `Documents.get`; create **one** suggestion; confirm the smallest permission that works |
| 2 | Rule engine (pure TS) + AP pack with Vitest tests, using the jazz draft cases |
| 3 | House pack + Check whole story / Check selection + scanning only the story body |
| 4 | Sidebar issue list, AP-ready count, suggestion tracking (duplicates + accept/reject) |
| 5 | Colab test on 50 past stories (precision + how often each rule fires); pilot with 3–5 reporters |
| 6 | Release to staff; start Phase 2 structural rules |

## Open questions

- [ ] **Percent:** `45 percent` (The B guide) or `45%` (AP since 2019)? The guide calls the word form AP style, which is out of date.
- [ ] **Filler words in quotes:** delete outright (house) or replace with an ellipsis (AP)?
- [ ] **Local state names:** `Burlingame, CA` → `Burlingame, California` (AP) or just `Burlingame`?
- [ ] **School name:** should `Burlingame High School graduate` become `Burlingame graduate`?
- [ ] **`Dr.`:** medical doctors only (guide) or AP's wider list (dentists, vets, optometrists...)?
- [ ] Does the advanced Docs service support suggestion requests yet, or do we call the API through `UrlFetchApp`? (Week 1 test.)
- [ ] Will the school's Workspace admin allow a private add-on, and approve the `documents` permission?
- [ ] Where do captions go in the Photos table, and in what format? (Needed for Phase 2 caption checks.)
