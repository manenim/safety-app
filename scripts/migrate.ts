import { config } from "dotenv";
import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required to apply migrations.");
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    ssl: "require",
    onnotice: () => undefined,
  });
  try {
    const directory = join(process.cwd(), "db", "migrations");
    const names = (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of names) {
      const source = await readFile(join(directory, name), "utf8");
      await sql.begin(async (transaction) => {
        await transaction`select pg_advisory_xact_lock(1936287596)`;
        await transaction.unsafe(source);
      });
      console.log(`Applied ${name}.`);
    }
    console.log(
      "Database migrations complete. Private storage bucket configured.",
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}
main().catch((error) => {
  // Connection errors may include credentials/hosts; never echo their messages.
  const code =
    typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
      ? ` (${error.code})`
      : "";
  console.error(
    `Migration failed${code}. Check DATABASE_URL, database reachability, and migration permissions. No credentials were logged.`,
  );
  process.exitCode = 1;
});
