import { config } from "dotenv";
import postgres from "postgres";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createSeed } from "../src/domain/seed";
import type { Store } from "../src/domain/types";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
async function main() {
  const seed = createSeed();
  if (process.env.SIGNALCHECK_DEMO_MODE === "true") {
    const directory =
      process.env.SIGNALCHECK_DATA_DIR || join(process.cwd(), ".data");
    await mkdir(directory, { recursive: true });
    // An explicit demo seed resets fictional local data. Live seeding merges.
    const temporary = join(directory, `seed-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(seed), { mode: 0o600 });
    await rename(temporary, join(directory, "store.json"));
    console.log(
      "Seeded explicit local demo: 6 fictional incidents and 26 reports.",
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for live seeding.");
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    ssl: "require",
    onnotice: () => undefined,
  });
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const [row] =
        await sql`select public.signalcheck_read_store() as snapshot`;
      const { version, store } = row.snapshot as {
        version: number;
        store: Store;
      };
      for (const key of Object.keys(seed) as Array<keyof Store>) {
        const seededIds = new Set(seed[key].map((item) => item.id));
        // Retain user reports and all non-seed records.
        (store[key] as Array<{ id: string }>) = [
          ...store[key].filter((item) => !seededIds.has(item.id)),
          ...seed[key],
        ];
      }
      const [result] =
        await sql`select public.signalcheck_commit_store(${version}, ${sql.json(store)}) as committed`;
      if (result.committed) {
        console.log(
          "Seeded live database: 6 fictional incidents and 26 reports; other records preserved.",
        );
        return;
      }
    }
    throw new Error("Concurrent writes prevented seeding.");
  } finally {
    await sql.end({ timeout: 2 });
  }
}
main().catch((error) => {
  const code =
    typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
      ? ` (${error.code})`
      : "";
  console.error(
    `Seed failed${code}. Run migrations and check DATABASE_URL and database reachability. No credentials were logged.`,
  );
  process.exitCode = 1;
});
