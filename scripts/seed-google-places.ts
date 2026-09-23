import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { demoPlaces } from "../src/domain/demo-places";
import { createPlaceSeed, replaceSeededData } from "../src/domain/place-seed";
import { createPresentationSeed } from "../src/domain/presentation-seed";
import type { Store } from "../src/domain/types";
config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");
const presentation = process.argv.includes("--presentation");
const detailsSchema = z.object({
  location: z.object({
    latitude: z.number().min(8.8).max(9.3),
    longitude: z.number().min(7.1).max(7.7),
  }),
});
async function main() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is required.");
  const places = [];
  for (const place of presentation ? demoPlaces.slice(0, 1) : demoPlaces) {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}`,
      {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!response.ok)
      throw new Error(
        "A Google place could not be resolved. No database changes were made.",
      );
    const { location } = detailsSchema.parse(await response.json());
    places.push({
      ...place,
      location: {
        raw: place.label,
        normalizedLabel: place.label,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  }
  const seed = presentation
    ? createPresentationSeed(places[0])
    : createPlaceSeed(places);
  const directory = join(process.cwd(), ".data", "seed-backups");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(
      directory,
      presentation
        ? "prepared-presentation-seed.json"
        : "prepared-google-seed.json",
    ),
    JSON.stringify(seed, null, 2),
    { mode: 0o600 },
  );
  console.log(
    `Prepared ${seed.reports.length} fictional reports at ${seed.incidents.length} Google Places.`,
  );
  if (!apply) {
    console.log(
      "Preview only. Use --apply to replace the old database fixtures.",
    );
    return;
  }
  const db = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await db.rpc("signalcheck_read_store");
    if ((error || !data?.store) && attempt < 7) continue;
    if (error || !data?.store)
      throw new Error(
        "Database snapshot could not be read. No seed changes were made.",
      );
    const current = data.store as Store;
    const replacement = replaceSeededData(current, seed);
    const backup = join(
      directory,
      `before-google-seed-${Date.now()}-${attempt}.json`,
    );
    await writeFile(backup, JSON.stringify(current), { mode: 0o600 });
    const { data: committed, error: commitError } = await db.rpc(
      "signalcheck_commit_store",
      { expected_version: data.version, next_store: replacement },
    );
    if (commitError)
      throw new Error(
        "Database commit failed; the pre-change backup is retained.",
      );
    if (committed === true) {
      console.log(
        JSON.stringify({
          replacedSeedReports: seed.reports.length,
          preservedSubmittedReports:
            replacement.reports.length - seed.reports.length,
          mappedDemoIncidents: seed.incidents.length,
          backup,
        }),
      );
      return;
    }
  }
  throw new Error("Concurrent database changes prevented seed replacement.");
}
main().catch((error) => {
  console.error(
    error instanceof Error && !error.message.includes("fetch")
      ? error.message
      : "Seed preparation failed. Check network and API configuration. No credentials were logged.",
  );
  process.exitCode = 1;
});
