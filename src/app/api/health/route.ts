import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// Railway's healthcheck: only report healthy once the database answers.
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
