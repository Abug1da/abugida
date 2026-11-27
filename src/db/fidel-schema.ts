import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Course content: seeded once by scripts/seed.ts, then edited in /admin. See docs/plans/fidel-v1.md.

export const fidelFamily = pgTable("fidel_family", {
  id: text("id").primaryKey(), // the 1st-order fidel, e.g. ሀ
  position: integer("position").notNull().unique(), // row in the ፊደል ገበታ
});

export const character = pgTable(
  "character",
  {
    id: text("id").primaryKey(), // the fidel itself, e.g. ሁ
    familyId: text("family_id")
      .notNull()
      .references(() => fidelFamily.id),
    order: integer("order").notNull(), // 1–7, as learners count
    romanization: text("romanization").notNull(),
    audioUrl: text("audio_url"),
  },
  (t) => [unique("character_family_order").on(t.familyId, t.order), check("character_order_range", sql`${t.order} between 1 and 7`)],
);

export const contrastGroup = pgTable("contrast_group", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  familyIds: text("family_ids").array().notNull(),
});

export const lesson = pgTable(
  "lesson",
  {
    id: text("id").primaryKey(), // slug; fixed once created, since progress points at it
    module: text("module").notNull().default("fidel"),
    position: integer("position").notNull(), // not unique, so two lessons can swap places
    title: text("title").notNull(),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    introVideoId: text("intro_video_id"),
    introTranscript: text("intro_transcript"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("lesson_module_status_position_idx").on(t.module, t.status, t.position)],
);

export const lessonCharacter = pgTable(
  "lesson_character",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .unique() // each character is taught in exactly one lesson
      .references(() => character.id),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.characterId] })],
);

// Learner data.

export const characterProgress = pgTable(
  "character_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => character.id),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    lastSeen: timestamp("last_seen").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.characterId] })],
);

export const lessonResult = pgTable(
  "lesson_result",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id),
    bestScore: real("best_score").notNull(),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at"), // first passing Test; unlocks the next lesson
    lastPlayed: timestamp("last_played").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const testSession = pgTable(
  "test_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lesson.id),
    state: jsonb("state").notNull(), // the engine's Session, including the answer key; never sent to the browser
    createdAt: timestamp("created_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  // One open Test per learner: starting another replaces it.
  (t) => [uniqueIndex("test_session_one_open_per_user").on(t.userId).where(sql`${t.finishedAt} is null`)],
);
