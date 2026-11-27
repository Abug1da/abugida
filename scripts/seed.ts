// Seeds the starting Fidel course (families, characters, contrast groups, the nine lessons) into
// an empty database. Runs in Railway's pre-deploy step after migrations, so it must be safe to run
// on every deploy: once any lesson exists, the database belongs to the editors and this does nothing.
import { count } from "drizzle-orm";
import { character, contrastGroup, fidelFamily, lesson, lessonCharacter } from "../src/db/schema";
import { validateCourse } from "../src/lib/fidel/content";
import { seedContent, seedContrasts, seedFamilies } from "../src/lib/fidel/seed/index";
import { scriptDb } from "./env";

const db = scriptDb();
const [{ n }] = await db.select({ n: count() }).from(lesson);
if (n > 0) {
  console.log(`seed: ${n} lessons already exist, leaving content alone`);
  process.exit(0);
}

const content = seedContent();
const problems = validateCourse(content);
if (problems.length) throw new Error(`seed content is invalid:\n${problems.join("\n")}`);

await db.transaction(async (tx) => {
  await tx.insert(fidelFamily).values(seedFamilies.map((f, position) => ({ id: f.id, position }))).onConflictDoNothing();
  await tx
    .insert(character)
    .values(
      Object.values(content.characters).map((c) => ({
        id: c.id,
        familyId: c.family,
        order: c.order,
        romanization: c.romanization,
        audioUrl: c.audioUrl,
      })),
    )
    .onConflictDoNothing();
  const [{ groups }] = await tx.select({ groups: count() }).from(contrastGroup);
  if (groups === 0) await tx.insert(contrastGroup).values(seedContrasts.map((familyIds) => ({ familyIds })));
  await tx.insert(lesson).values(
    content.lessons.map((l) => ({ id: l.id, module: "fidel", position: l.position, title: l.title, status: l.status })),
  );
  await tx.insert(lessonCharacter).values(
    content.lessons.flatMap((l) => l.characterIds.map((characterId, position) => ({ lessonId: l.id, characterId, position }))),
  );
});
console.log(`seed: added ${Object.keys(content.characters).length} characters and ${content.lessons.length} lessons`);
process.exit(0);
