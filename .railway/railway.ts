// Railway infrastructure as code. Not applied on push: run `railway config plan`, then
// `railway config apply`, from a directory linked to the Railway project (`railway link`).
import { defineRailway, postgres, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const web = service("web", {
    build: "bun run build",
    start: "bun run start",
    // Runs after the build and before traffic moves over; a failure stops the deploy.
    preDeploy: "bun run db:migrate",
    healthcheck: "/api/health",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      // Set these in the Railway dashboard; preserve() keeps whatever is there.
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
    },
  });

  return project("abugida", { resources: [web, db] });
});
