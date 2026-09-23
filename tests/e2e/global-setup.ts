import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSeed } from "../../src/domain/seed";

export default async function setup() {
  // Evidence expires with time. Refresh only the isolated browser-test dataset
  // so status assertions do not depend on when a previous test run seeded it.
  const directory = join(process.cwd(), ".data", "e2e");
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, "seed.tmp");
  await writeFile(temporary, JSON.stringify(createSeed()), { mode: 0o600 });
  await rename(temporary, join(directory, "store.json"));
}
