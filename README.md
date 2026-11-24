# Buzzword

AP and house-style checker for **The Burlingame B**, as a Google Docs add-on.
Click **Check whole story** (or select text and click **Check selection**). Buzzword adds normal Google Docs suggestions for safe fixes and lists everything that needs a person in the sidebar. Rules only, no AI.

- Spec: [`docs/spec.md`](docs/spec.md)
- AP rules, checked against the 58th edition: [`docs/ap-rule-notes.md`](docs/ap-rule-notes.md)
- The B style guide and how it maps to rules: [`docs/the-b-style-guide.md`](docs/the-b-style-guide.md), [`docs/house-rule-map.md`](docs/house-rule-map.md)

## Project layout

| Path | What it is |
| --- | --- |
| `src/engine/` | The rule engine. Pure TypeScript, no Google calls. `rules/ap.ts` and `rules/house.ts` are the two rule packs. |
| `src/server/` | Apps Script code. `flatten.ts` and `plan.ts` are pure (tested). `main.ts` talks to Google Docs. |
| `src/sidebar/` | The sidebar UI and Buzz the bee (`mascot.ts`). |
| `preview/` | A local preview with a fake doc, running the real engine on the jazz festival draft. |
| `dist/` | Build output that gets pushed to Apps Script. Don't edit. |

## Commands

```sh
npm test            # run the rule and planning tests
npm run build       # build dist/ and preview/index.html
npm run typecheck
npm run push        # build, then push dist/ to Apps Script with clasp
```

**Preview without Google:** run `npm run build`, then serve the folder (`cd preview && python3 -m http.server 4178`) and open http://127.0.0.1:4178/. Click **Check whole story**, then use **Accept all**, **Reject all** or each suggestion's ✓ and ✕, and check again.

## Trying it in Google Docs (first time)

1. Make sure the Apps Script API is on at https://script.google.com/home/usersettings and you've run `clasp login`.
2. Make a test Google Doc from the Article Draft template and paste in a story. Copy the doc's ID from its URL (`docs.google.com/document/d/<ID>/edit`).
3. Create an Apps Script project attached to that doc:
   ```sh
   clasp create --parentId <DOC_ID> --title "Buzzword" --rootDir dist
   ```
4. `npm run push`
5. Reload the doc. Open **Extensions → Buzzword → Open Buzzword**. The first time, Google asks you to approve permissions.

## Adding or changing a rule

1. Add the rule to `src/engine/rules/ap.ts` or `src/engine/rules/house.ts`, and to that file's rule list at the bottom.
2. Set `safe: true` only if the fix is always right. Otherwise set `safe: false` and the rule shows as a sidebar card.
3. Set `inQuotes`: `apply` for formatting (dates, numbers), `skip` for word choice, `only` for quote-only rules.
4. Write the `reason` and `why` in our own words (never copy the AP Stylebook).
5. Add should-fix and should-not-flag cases to `src/engine/rules.test.ts`, using real sentences from drafts when you can. Run `npm test`.
