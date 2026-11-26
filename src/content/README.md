# Course content

Everything a learner studies lives in this folder. Edit the JSON, open a PR, then run `npm run seed` to publish it to Firestore.

| File | What it holds |
|---|---|
| `families.json` | The 33 rows of the ፊደል ገበታ in traditional order: first-order fidel + BGN/PCGN consonant, plus `first` / `sixth` where the table differs from the regular pattern (ሀ ሐ ኀ → hā, አ → ā/i, ዐ → ‘ā/‘i). The 7 orders of each row are generated from Unicode, so only the first order is listed. |
| `lessons.json` | Lessons in course order (see below). |
| `contrasts.json` | Groups of rows that look alike (ሰ/ሸ …) or sound the same (ሀ/ሐ/ኀ/ኸ …). The contrast drill shows a fidel and asks which of these rows it comes from. |
| `audio.json` | Pronunciation audio per character (speaker "Yoni", carried over from the legacy app). |

Romanization follows the [BGN/PCGN 1967 table](https://assets.publishing.service.gov.uk/media/634e71ebe90e0731a800892a/ROMANIZATION_OF_AMHARIC_22.pdf): consonant + `e u ī a ē (none) o`. The 6th order is written as the bare consonant (the table allows with or without `i`). Apostrophes are `’`, but `‘` for ዐ.

## Lessons

Two kinds, one JSON object per lesson:

```jsonc
// fidel: which gebeta rows, and which orders (counted 1–7 like learners do; omit for all seven)
{ "id": "fidel-01", "title": "Ejectives I", "kind": "fidel", "families": ["ጠ", "ቀ", "ጨ"], "orders": [1, 2, 3, 4, 5, 7] }

// vocabulary: phrases; audience is "m" / "f" / "group" when the form depends on who you address
{ "id": "conversation-01", "title": "…", "kind": "vocabulary", "vocabulary": [
  { "english": "What is your name?", "amharic": "ስምህ ማን ነው?", "transliteration": "simih man new?", "audience": "m", "note": "…" }
]}
```

Current plan, from the Notion *All Fidel System & Families* page and the Aug 31 meeting: fidel first, in sound-class batches (ejectives, glottal ጉሮሮ, tongue ልሳን, then the rest), 6th order held back to its own lesson. After that come the Conversation Pieces, copied word for word from Notion. Reordering is only an edit to this file.

Each character may be taught in only one lesson. `index.ts` rejects that, along with duplicate or unknown families, bad or repeated orders, fidel fields on vocabulary lessons (and the reverse), missing vocabulary text, empty lessons and duplicate IDs. The tests also check that every lesson can produce four distinct options. `npm run seed` runs the tests first, so these mistakes never reach learners.

## Workflow

```sh
npm test                       # validates content + engine
npm run try-lesson             # play the next lesson in the terminal
npm run try-lesson -- 10 --audio
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run seed            # runs tests first
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run seed -- --prune # required if Firestore has docs removed from the JSON (deletes them)
```

## Needs review before launch

Nothing here has been checked by a content reviewer yet. Check against Leslau's *Concise Amharic Dictionary* and the BGN/PCGN Amharic table:

- [ ] **Notation**: BGN/PCGN (owner's brief, now implemented and checked against the table) vs IPA (leaning in Aug 31 meeting). Romanization is `VOWELS` in `index.ts` + `families.json`.
- [ ] **Vocabulary transliteration**: copied as written in Notion (`selam`, `q’enih`, `t’Ana`), which is neither BGN/PCGN nor IPA.
- [ ] **Order names** (ግእዝ … ሣብዕ): not stored yet. Spelling needs confirming first.
- [ ] **ቨ (v)**: row 34 in the BGN/PCGN table, and the Aug 31 meeting said "34 base houses". Not included yet, and there is no legacy audio for it.
- [ ] **Remaining-families split** (lessons 5–8): gebeta order in chunks. Notion only defines "remaining families" as one batch.
- [ ] **Contrast groups** in `contrasts.json`: rows derived by adding a mark (ሰ→ሸ, ተ→ቸ …) plus same-sound rows. Add other look-alikes that native materials drill.
- [ ] **Audio**: the legacy recordings have known problems (Aug 31: a wrong letter, uneven levels), and a re-record is planned. The ቢ and ዠ-row files were stored under misspelled names (`bee`, `ž…`) and were remapped to `bi`/`zh…`.
