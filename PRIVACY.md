# Buzzword privacy policy

*Effective Nov. 24, 2026*

Buzzword is a Chrome extension that checks Google Docs drafts against AP style and The Burlingame B's house style. It was made for the staff of The Burlingame B.

## What Buzzword reads

When you click **Check whole story** or **Check selection**, Buzzword reads the text of the Google Doc you have open through the Google Docs API. If Google Docs doesn't show Buzzword your selection, **Check selection** reads the text you just copied, and only when you click the button.

## Where your text goes

- Buzzword checks the text **inside your browser**, using rules only (no AI).
- The text is sent to **only one place: Google's Docs API**, to add suggestions to the same document.
- Buzzword has **no server of its own**. It never sends your text, your name or your email anywhere else, and it does not sell or share any data.
- The panel loads its fonts from Google Fonts. That request does not include any document text.

## What Buzzword saves

Buzzword saves these in your browser's extension storage:

- Your Buzzword settings.
- For each document you check: the document's ID, the IDs of suggestions Buzzword made, and short **hashes** of the flags you rejected or ignored, so they aren't suggested again. A hash cannot be turned back into your text.
- Counts of how many suggestions were accepted or rejected for each rule.

Buzzword never saves the text of your documents. To delete everything Buzzword has saved, remove the extension from Chrome.

## Google sign-in

Buzzword uses Chrome's Google sign-in to get permission to read and suggest edits to your Google Docs (the `documents` scope). Chrome keeps the sign-in token, and Buzzword only uses it to call the Google Docs API.

Buzzword's use of information received from Google APIs follows the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Clipboard

**Show in doc** copies the flagged phrase so you can find it with Find (Cmd+F or Ctrl+F). **Check selection** may read the text you copied, as described above. Buzzword uses the clipboard only when you click one of these buttons.

## Changes and contact

If this policy changes, the new version will be posted here with a new date. For questions, open an issue at https://github.com/jasqnlu/Buzzword/issues.
