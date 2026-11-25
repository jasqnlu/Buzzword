# Buzzword website: context

Context for building the public website for **Buzzword**, a Chrome extension made by a student on The Burlingame B (Burlingame High School's student newspaper). The site is mainly here so the Chrome Web Store listing and Google's OAuth consent screen have a public **homepage** and **privacy policy** URL.

## What Buzzword is
- A Chrome extension that checks Google Docs story drafts against **AP style** and **The Burlingame B's house style**.
- The reporter opens a draft and clicks the bee button. Fixes that are always safe (dates, times, numbers, states) are added as normal Google Docs suggestions to accept or reject. Anything that needs a person's judgment shows up as a card in the panel with a short "Why?" explanation.
- It can check the whole story or only the selected text. Uses rules only, **no AI**.
- It only checks the story body of The B's "Article Draft" template, between the "Article Draft" heading and the "Otter link + Notes" section. It never reads or changes the header table or source notes.
- Suggestions someone rejects aren't suggested again.
- Audience: staff of The Burlingame B. Listed on the Chrome Web Store as **Unlisted** (only people with the link can find it).
- Source code: https://github.com/jasqnlu/Buzzword
- Chrome Web Store item ID: `djdagkcdbdfonpfhhabflpdedgemkdnp`
  (store link: `https://chromewebstore.google.com/detail/djdagkcdbdfonpfhhabflpdedgemkdnp`, which works after the item is published)

## Pages the site needs
1. **Home** (`/`): what Buzzword does, a screenshot, an "Add to Chrome" button linking to the store, and a link to the privacy policy.
2. **Privacy policy** (`/privacy`): the text at the bottom of this file. It must stay at a **stable public URL**, because the Web Store listing and the OAuth consent screen link to it. Don't move or rename it later.
3. **Support**: a short section or page pointing to https://github.com/jasqnlu/Buzzword/issues. Do **not** publish a personal email.

Optional: a "How to use" section (open a draft, click the bee, check whole story or selection, accept or reject suggestions, then check again).

## Facts the site must get right
The Web Store reviewers compare the site, the store's Privacy tab and the code, so these must match exactly:
- Text is checked **in the browser**. It's sent **only to Google's Docs API**. There is **no Buzzword server**, no analytics and no selling or sharing of data.
- Saved in browser storage: settings, the document ID, suggestion IDs, **hashes** of rejected or ignored flags, and accept/reject counts per rule. **Never document text.**
- Permissions: `identity` (Google sign-in), `storage`, `clipboardRead` (Check selection fallback, only on click), `clipboardWrite` ("Show in doc" copies the phrase), host `docs.googleapis.com`, content script on `docs.google.com/document/*`.
- Google scope: `https://www.googleapis.com/auth/documents`.
- If the site itself adds analytics or tracking, the privacy policy must say so. The easiest choice is **no analytics**.

## Brand
- Colors: B red `#e0262d`, honey `#f5b301`, black `#111`, white.
- Fonts (Google Fonts): **Libre Franklin** (UI, headings, weights 600/800/900) and **Source Serif 4** (body and story text).
- Mascot: **Buzz the bee**, holding a fountain pen with a red "B" badge. Friendly, newsroom-y, a little playful: honeycomb, dotted flight paths.
- Assets to copy from the Buzzword repo:
  - `assets/buzz-icon.svg`, `assets/buzz-icon-512.png`: the icon (Buzz on a red circle)
  - `src/sidebar/mascot.ts` (`MASCOT_SVG`) and `src/sidebar/bee.css`: the full mascot SVG and its colors
  - `assets/burlingame-b-logo.jpg`: The B's logo
  - Store art (generated, not in git, so regenerate with `npm run build && node scripts/store-assets.mjs`, or ask for copies):
    `release/store-assets/screenshot-1280x800.png`, `promo-honey-440x280.png`
- The tone is plain and friendly. Write like a student newsroom tool, not a startup.

## Rules
- **No real names** of students or staff in examples or screenshots. Use made-up names (for example, "junior Sam Ortega" or "Director of Music Dana Whitfield").
- **Don't quote or copy the AP Stylebook.** Describe rules in your own words and don't link to AP pages, because the subscription is temporary.
- Don't call Buzzword official AP software or suggest AP endorses it.

## Hosting
- **GitHub Pages** is free and simple: a public repo, with Settings → Pages → deploy from `main`. The URL will look like `https://jasqnlu.github.io/<repo>/` (or `https://jasqnlu.github.io/` if the repo is named `jasqnlu.github.io`).
- A plain static site (HTML and CSS, or a small static generator) is enough. No backend.
- Later, if the OAuth app is published (not Testing), Google asks for the homepage and privacy URLs and may need you to **verify ownership of the site's domain** in Google Search Console. A `jasqnlu.github.io` user site can be verified with an HTML file. A custom domain also works.
- After the site is live, update in the Buzzword project: the Web Store listing (Homepage URL, Privacy policy URL), the OAuth Branding page (homepage, privacy policy) and `PRIVACY.md`'s link.

---

## Privacy policy text (use on /privacy)

### Buzzword privacy policy

*Effective Nov. 24, 2026*

Buzzword is a Chrome extension that checks Google Docs drafts against AP style and The Burlingame B's house style. It was made for the staff of The Burlingame B.

#### What Buzzword reads

When you click **Check whole story** or **Check selection**, Buzzword reads the text of the Google Doc you have open through the Google Docs API. If Google Docs doesn't show Buzzword your selection, **Check selection** reads the text you just copied, and only when you click the button.

#### Where your text goes

- Buzzword checks the text **inside your browser**, using rules only (no AI).
- The text is sent to **only one place: Google's Docs API**, to add suggestions to the same document.
- Buzzword has **no server of its own**. It never sends your text, your name or your email anywhere else, and it does not sell or share any data.
- The panel loads its fonts from Google Fonts. That request does not include any document text.

#### What Buzzword saves

Buzzword saves these in your browser's extension storage:

- Your Buzzword settings.
- For each document you check: the document's ID, the IDs of suggestions Buzzword made, and short **hashes** of the flags you rejected or ignored, so they aren't suggested again. A hash cannot be turned back into your text.
- Counts of how many suggestions were accepted or rejected for each rule.

Buzzword never saves the text of your documents. To delete everything Buzzword has saved, remove the extension from Chrome.

#### Google sign-in

Buzzword uses Chrome's Google sign-in to get permission to read and suggest edits to your Google Docs (the `documents` scope). Chrome keeps the sign-in token, and Buzzword only uses it to call the Google Docs API.

Buzzword's use of information received from Google APIs follows the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

#### Clipboard

**Show in doc** copies the flagged phrase so you can find it with Find (Cmd+F or Ctrl+F). **Check selection** may read the text you copied, as described above. Buzzword uses the clipboard only when you click one of these buttons.

#### Changes and contact

If this policy changes, the new version will be posted here with a new date. For questions, open an issue at https://github.com/jasqnlu/Buzzword/issues.
