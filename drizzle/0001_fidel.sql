CREATE TABLE "character" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"order" integer NOT NULL,
	"romanization" text NOT NULL,
	"audio_url" text,
	CONSTRAINT "character_family_order" UNIQUE("family_id","order"),
	CONSTRAINT "character_order_range" CHECK ("character"."order" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "character_progress" (
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_seen" timestamp NOT NULL,
	CONSTRAINT "character_progress_user_id_character_id_pk" PRIMARY KEY("user_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "contrast_group" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contrast_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"family_ids" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fidel_family" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "fidel_family_position_unique" UNIQUE("position")
);
--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" text PRIMARY KEY NOT NULL,
	"module" text DEFAULT 'fidel' NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"intro_video_id" text,
	"intro_transcript" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "lesson_character" (
	"lesson_id" text NOT NULL,
	"character_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "lesson_character_lesson_id_character_id_pk" PRIMARY KEY("lesson_id","character_id"),
	CONSTRAINT "lesson_character_character_id_unique" UNIQUE("character_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_result" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"best_score" real NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"last_played" timestamp NOT NULL,
	CONSTRAINT "lesson_result_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "test_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'learner';--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_family_id_fidel_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."fidel_family"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_progress" ADD CONSTRAINT "character_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_progress" ADD CONSTRAINT "character_progress_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_character" ADD CONSTRAINT "lesson_character_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_character" ADD CONSTRAINT "lesson_character_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_result" ADD CONSTRAINT "lesson_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_result" ADD CONSTRAINT "lesson_result_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_session" ADD CONSTRAINT "test_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_session" ADD CONSTRAINT "test_session_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_module_status_position_idx" ON "lesson" USING btree ("module","status","position");--> statement-breakpoint
CREATE UNIQUE INDEX "test_session_one_open_per_user" ON "test_session" USING btree ("user_id") WHERE "test_session"."finished_at" is null;