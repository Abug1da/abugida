// Railway infrastructure as code. Not applied on push: run `railway config plan`, then
// `railway config apply`, from a directory linked to the Railway project (`railway link`).
// Anything set only in the dashboard (a domain, a renamed service) shows up as drift here, so
// make changes in this file instead.
import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const web = service("web", {
    source: github("Abug1da/abugida", { branch: "main" }),
    build: "bun run build",
    start: "bun run start",
    // Runs after the build and before traffic moves over; a failure stops the deploy.
    // Migrate, then seed (seeding does nothing once any lesson exists, so it's safe every deploy).
    preDeploy: "bun run db:deploy",
    deploy: { preDeployTimeoutSeconds: 120 },
    healthcheck: "/api/health",
    // Custom domains (theabugida.org, www.theabugida.org) can't be registered from this file; they
    // were added with `railway domain <name> --service web`. www redirects to the apex in next.config.ts.
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      // Set these once with `railway variables` or the dashboard; preserve() keeps them on apply.
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
    },
  });

  return project("abugida", { resources: [web, db] });
});
