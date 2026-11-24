# House rule map: The B style guide → Buzzword rules

Source: `the-b-style-guide.md`. AP details: `ap-rule-notes.md`.
**House rules win over AP** (the guide says AP applies only where it doesn't specify a rule).

Tiers: **Safe** = pattern rule, automatic suggestion OK · **Sidebar** = flag only, a human decides · **Context** = later context rule · **LLM** = later optional LLM pass · **Out** = not a text rule, or out of scope

---

## ⚠️ Where the guide disagrees with current AP (decide before coding)

| Topic | The B guide | Current AP (checked Nov. 23) | Recommendation |
|---|---|---|---|
| **Percent** | Word: `16 percent`, never `%`. The guide says this *is* AP style. | `%` sign since **2019**. | The guide is out of date, not a deliberate choice. **EIC must pick.** This flips MVP rule 4's direction. |
| **over / more than** | `more than` with numbers | `over` is fine (since 2014) | Keep the house rule: it's an explicit choice, and an easy safe rule. |
| **Midnight** | 12 a.m. → `midnight` | Avoid `midnight` when the day is unclear | House wins, so `12 a.m. → midnight` becomes **safe** again. |
| **Year in dates** | Omit if within 12 months of publication | Omit if in the current year | House wins. Context rule (needs the publish date). |
| **Dr.** | Medical doctors only | Medical, dental, optometry, osteopathic, podiatry and veterinary doctors | Minor. Follow AP, or confirm with the EIC. |

Agrees with AP (verified): `adviser`, `website`, `email`, contractions, no serial comma, a.m./p.m., ages, month abbreviations. Nice memory aid from the guide: *abbreviate months longer than five letters*. That gives exactly AP's list.

---

## Safe pattern rules (strong MVP candidates)

These are cheap, almost always wrong when they match, and they come up a lot in student drafts.

| id | Wrong → Right | Notes |
|---|---|---|
| `house.grade-names` | `10th grader(s)` → `sophomore(s)`; 11th → junior; 12th → senior; 9th → freshman | Also lowercase `Sophomore/Junior/Senior` mid-sentence, **except** before an officer title (`Sophomore Vice President`) |
| `house.vice-principal` | `assistant principal`, `vice-principal` → `vice principal` | Capitalizing before a name is Context (formal-title question) |
| `house.website-email` | `web site`, `Web site`, `e-mail` → `website`, `email` | Merges with AP rule 10 |
| `house.site-url` | `theburlingameb.org` (any case) → `TheBurlingameB.org` | |
| `house.adviser` | `advisor` → `adviser` | |
| `house.one-space` | two or more spaces after a period → one | Formatting rule |
| `house.punct-inside-quotes` | `”,` → `,”`  ·  `”.` → `.”` | |
| `house.said-verbs` | `,” Smith explained.` → `,” Smith said.` (retorted, explained, replied, blurted, noted, confirmed, smiled, lamented, stated, exclaimed...) | Only right after a closing quote |
| `house.said-order` | `,” said Lee.` → `,” Lee said.` | Only when the subject is 1–3 words or a class year + name. Long titles are exempt, so longer subjects go to Sidebar |
| `house.jv` | `junior varsity`, `J.V.` → `JV` | |
| `house.varsity-lower` | `Varsity` mid-sentence → `varsity` | |
| `house.coach-lower` | `Head Coach`, `Coach`, `Assistant Coach` before a name → lowercase | Not at the start of a sentence |
| `house.blue-devils` | `Blue Devil's`, `blue devils`, `devils` → `Blue Devils` / `Devils` | |
| `house.decade-apostrophe` | `1960's` → `1960s`; `'90's` → `'90s` | Acronym plurals (`UC's`) go to Sidebar, since they might be possessive |
| `house.ucsc` | `UCSC` → `UC Santa Cruz` | |
| `house.more-than` | `over 20` → `more than 20` (over + figure) | Test against sports scores (`a 3-2 win over Aragon` has no figure after `over`) |
| `house.midnight-noon` | `12 a.m.` → `midnight`, `12 p.m.` → `noon`, `12 noon` → `noon` | Replaces AP rule 6 |
| `house.weekday-with-date` | `Tuesday, Sept. 5` → `Sept. 5` | Drop the weekday |

## Sidebar flags (Buzzword spots it, a human fixes it)

- `Mr.` / `Mrs.` / `Ms.` before a name → use the full name first, then the last name.
- Exclamation marks outside quotes (no exclamation marks).
- `PR`, `SB` → `personal record`, `season best` (PR can also mean public relations, so a human checks).
- `boy's` / `girl's` / `boys` / `girls` + a sport → `men's` / `women's`.
- Sentence starting with a numeral (except years). The fix needs the number spelled out. Could become Safe for simple numbers later.
- `says` after a quote → `said` (features are exempt, and Buzzword can't tell which kind of story it is).
- Room numbers not in `A112` form (`Room A-112`, `room 112`).
- `Dr.` before a name (check that the person is a medical doctor).
- Contractions outside quotes (noisy; maybe off by default).
- `Burlingame High School` / `BHS` → `Burlingame`. Probably Safe, but `Burlingame High School graduate` reads oddly as `Burlingame graduate`, so check with the EIC.

## Context rules (later, need first/second-reference tracking)

- Full name on first reference, then last name only. Family members: first name after the first reference.
- `ASB`: `Associated Student Body (ASB)` first, then `ASB`.
- UC names: `UC Davis` → `UCD`, `UCSB`, `UCSD` on second reference; `UC Berkeley` → `Berkeley` or `Cal`; UCLA always; no abbreviation for Irvine, Riverside or Merced.
- Officer titles: capitalized before a name (`ASB Vice President`), lowercase as a description.
- Class names: lowercase subjects (`math`, `biology`) unless it's a language or a full special-class name (`AP Statistics`, `ROP Desktop Publishing`).
- Team or band as `it`, not `their`/`them`.
- Other schools' mascots only after the school is named, and capitalized.
- One quote per paragraph; new speaker = new paragraph.
- Ages always in figures (except at the start of a sentence).
- Composition titles in quotes (jazz draft: song titles).

## LLM pass (later, optional)

- Past tense only (features are exempt).
- Backing into quotes ("When asked about..., Brown said...").
- Buildings or districts doing things ("DJUSD plans...").
- since/because, who/that, affect/effect, its/it's, your/you're, their/there. These are grammar, a spec non-goal, but the guide lists them as common mistakes. Worth reconsidering for v2.
- Quotes used only for facts.

## Out of scope for text rules

- **Flush-left alignment**: possible later as a Docs *formatting* check (paragraph alignment), not a text rule.
- **Captions**: full names, present tense, no repeating the headline. These belong to the Phase 2 caption checks.
- **Read the sports section for your sport**: a training reminder, not a rule.

---

## Effect on the MVP

The spec's MVP is 10 AP rules. The guide adds about 18 safe rules that are cheaper than most AP rules and fire more often in student drafts (said-verbs, punctuation inside quotes, grade names, double spaces). Suggested MVP: the AP rules that survived the check, plus the safe house rules above. The architecture already supports this with two rule packs, `ap` and `house`. Where both packs have a rule for the same thing, the `house` rule replaces the `ap` one (percent, midnight).
