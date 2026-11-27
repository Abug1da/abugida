// The only way to make someone an admin: bun run admin:grant <email> [--revoke]
// The person must have signed up first. Against production: railway run bun run admin:grant <email>
import { eq } from "drizzle-orm";
import { user } from "../src/db/schema";
import { scriptDb } from "./env";

const [email, flag] = process.argv.slice(2);
if (!email || (flag && flag !== "--revoke")) {
  console.error("usage: bun run admin:grant <email> [--revoke]");
  process.exit(1);
}
const role = flag === "--revoke" ? "learner" : "admin";
const updated = await scriptDb()
  .update(user)
  .set({ role })
  .where(eq(user.email, email.toLowerCase()))
  .returning({ email: user.email });
if (!updated.length) {
  console.error(`no account for ${email}; they need to sign up first`);
  process.exit(1);
}
console.log(`${updated[0].email} is now ${role === "admin" ? "an admin" : "a learner"}`);
process.exit(0);
