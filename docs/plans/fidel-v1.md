# Fidel v1: lesson data, learner flow, and the admin

Status: agreed 2026-11-26 after a council review (Claude Opus, Gemini 4 Neon).

Goal: a learner can sign up, work through the Fidel lessons in order, and have progress saved; Daniel (content lead, not a coder) can edit those lessons without code. Fidel first; Conversation and Numbers come later and are out of scope here except where noted.

Settled already: Next.js 16 + Postgres/Drizzle + Better Auth on Railway; custom `/admin` instead of a CMS; lessons have draft/published status; Practice and Test questions are generated from the lesson's characters by the quiz engine from the `content-engine` branch; no version history, rich text, or handwriting in v1; nightly `pg_dump` backups to R2 before real learner or editor data exists.

## Data (Postgres, Drizzle)

Course content (seeded from the old JSON, then edited in `/admin`):

| Table | Columns | Notes |
| --- | --- | --- |
| `fidel_family` | `id` (the 1st-order fidel, e.g. ሀ), `position` (row in the ፊደል ገበታ) | 33 rows. The consonant only matters when seeding romanizations, so it isn't stored. ቨ (34th) is an open content question. |
| `character` | `id` (the fidel, e.g. ሁ), `family_id`, `order` (1–7, as learners count), `romanization`, `audio_url` (nullable) | ~231 rows; unique `(family_id, order)`, check `order between 1 and 7`. Romanization is per character and editable, seeded with BGN/PCGN, so the notation decision is a data edit. Audio is stored once per character and reused by every lesson; it starts as the legacy Cloudinary URLs and moves to R2. The ported engine uses 1–7 throughout (it used 0–6). |
| `contrast_group` | `id`, `family_ids` (text[]) | Look-alike and same-sound rows. Seed-only in v1. |
| `lesson` | `id` (slug, immutable after creation), `module` ('fidel'), `position`, `title`, `status` (draft/published), `intro_video_id`, `intro_transcript`, `updated_at`, `updated_by` | Index `(module, status, position)`; no unique index on `position` (it would break swapping two lessons). The pass mark is one constant, 70%. |
| `lesson_character` | `lesson_id`, `character_id`, `position` | Primary key `(lesson_id, character_id)`, unique `character_id`: each character belongs to exactly one lesson. A draft that holds characters hides them from learners; the editor warns about that. |

Learner data (all `user_id` foreign keys cascade on delete):

| Table | Columns | Notes |
| --- | --- | --- |
| `character_progress` | `user_id`, `character_id`, `attempts`, `correct`, `streak`, `last_seen` | Primary key `(user_id, character_id)`. Picks review items. |
| `lesson_result` | `user_id`, `lesson_id`, `best_score`, `attempts`, `completed_at`, `last_played` | Primary key `(user_id, lesson_id)`. Unlocks read `completed_at is not null`, set the first time a Test scores ≥ 70%, so changing the pass mark later never re-locks anyone. |
| `test_session` | `id`, `user_id`, `lesson_id`, `state` (jsonb: the engine's session, with the lesson's character IDs as of the start), `created_at`, `finished_at` | Tests only. Partial unique index on `user_id where finished_at is null`: starting a Test replaces any open one, which caps abandoned rows. Grading a mid-session lesson edit uses the snapshot, not the current lesson. |

Admin role: `role` declared through Better Auth's `user.additionalFields` (`input: false`, default `learner`) and `auth-schema.ts` regenerated with the CLI, not hand-edited. Granted only by `bun run admin:grant <email>`. Not Better Auth's admin plugin. Every `/admin` page and server action checks the role on the server.

## Course validation

One `validateCourse()` over the whole published course, run inside the transaction of every change that can affect it: publish, unpublish, move, editing a published lesson, and editing a romanization. Rules: a published lesson has characters; every character is in at most one lesson; every published lesson can produce four distinct options (romanization edits can break this for lessons Daniel never opened). Drafts are validated when published, not on every save. The engine's pool of earlier lessons (for review items and distractors) only includes published lessons.

## Learner flow

- `/lessons`: published Fidel lessons in order, each locked / available / complete. Guided mode only in v1.
- `/lessons/[id]`: the server checks the lesson is published and unlocked for this user (admins excepted, for preview) before rendering it or starting a Test. Four steps on one page:
  - Intro: YouTube embed plus transcript (skipped if empty).
  - Learn: one card per character (fidel, romanization, play audio).
  - Practice: runs entirely in the browser. The server builds the questions with answers (using progress to pick review items); nothing is written.
  - Test: one server action per answer. Questions go to the browser without answers; options are sent as opaque indices, never character IDs. The action accepts only the question at the head of the queue and rejects finished sessions. Finishing happens in one transaction guarded by `finished_at is null`, so a double submit can't count twice. The result screen shows the score and, on a pass, unlocks the next lesson.
- Engine rules carried over: recognize / produce / contrast questions, four options, a miss is re-asked once, only the first try counts.
- Answer-key farming isn't worth defending against (the key is the alphabet, and cheating only unlocks lessons for the cheater), so no extra rate limits.
- Frontend stays minimal (shadcn on the placeholder theme); the designer restyles later.

## Admin v1 (`/admin`, Fidel only)

- Lessons: list with status and position; move up/down; create (slug fixed at creation); publish/unpublish. No delete in v1.
- Lesson editor: title, intro video (paste any YouTube link; it's parsed into the video ID), transcript (plain text), the characters it teaches (a ፊደል ገበታ grid; characters owned by another lesson are greyed out and labelled with it).
- Characters: the full ፊደል ገበታ grid; edit romanization (step 3). Audio upload waits for R2 (step 4: presigned upload, audio types only, size-capped).
- Preview: admins can open any lesson, including drafts; preview never writes progress or creates sessions.

## Order of work

1. Schema and migrations (they already run before every deploy via Railway's pre-deploy step). Seed script that only inserts missing rows and never overwrites edits. `admin:grant`. Port the engine and its tests to 1–7. GitHub Actions workflow (lint, typecheck, tests, build). Backups: R2 bucket, nightly `pg_dump` cron service, failure alert, one restore test, all before step 2 ships, because pushes to `main` deploy and learner data becomes real then.
2. Learner flow: lesson list, lesson page, client-side Practice, server-graded Test, progress and unlocks.
3. Admin: lesson list, lesson editor, romanization editing, preview.
4. Audio: R2 bucket on a custom subdomain (not `r2.dev`), character audio upload, copying the legacy Cloudinary audio over. Daniel gets admin access after step 3, since backups already exist.

## Open content questions (for Daniel, not blocking the build)

- Notation: BGN/PCGN (seeded) or IPA. Changing it later is a data edit.
- ቨ as a 34th family: not included; no legacy audio for it.
- Freeform mode (browse any lesson): left out of v1; could be a per-user toggle later.
- Lesson split for the "remaining families": seeded as the September split (lessons 5–8).
