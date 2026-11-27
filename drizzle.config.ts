import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into ./drizzle; wrangler applies them to D1 (see package.json db:* scripts).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
