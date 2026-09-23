import "server-only";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getEnv } from "../lib/env";
import { createSeed } from "../domain/seed";
import type { Store } from "../domain/types";

// Queue survives development hot reloads. Live writes use a database version lock
// as well, so concurrent server instances cannot overwrite one another.
const runtime = globalThis as typeof globalThis & {
  signalcheckQueue?: Promise<unknown>;
};
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = (runtime.signalcheckQueue || Promise.resolve()).then(work, work);
  runtime.signalcheckQueue = next.catch(() => undefined);
  return next;
}
function directory() {
  return process.env.SIGNALCHECK_DATA_DIR || join(process.cwd(), ".data");
}
function client() {
  const env = getEnv();
  if (!env.supabaseUrl || !env.supabaseKey)
    throw new Error("Supabase server configuration is required.");
  return createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function saveLocal(store: Store) {
  await mkdir(directory(), { recursive: true });
  const temporary = join(directory(), `store-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(store), { mode: 0o600 });
  await rename(temporary, join(directory(), "store.json"));
}
async function readLocal(): Promise<Store> {
  try {
    return JSON.parse(
      await readFile(join(directory(), "store.json"), "utf8"),
    ) as Store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new Error(
        "Demo data could not be read. Restore .data/store.json or seed demo data again.",
      );
    const store = createSeed();
    await saveLocal(store);
    return store;
  }
}
async function snapshot(): Promise<{ version: number; store: Store }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error, status } = await client().rpc(
      "signalcheck_read_store",
    );
    if (!error && data?.store) return data;
    // Reading a snapshot is safe to retry. Never blindly replay a commit whose
    // response was lost: the write might already have succeeded.
    const transient =
      status === 0 ||
      status >= 500 ||
      (error?.code === "" &&
        /fetch failed|network|timeout/i.test(error.message));
    if (!transient || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
  throw new Error(
    "Database read failed. Verify Supabase configuration and run npm run db:migrate.",
  );
}
export async function readStore(): Promise<Store> {
  return getEnv().demoMode ? serialized(readLocal) : (await snapshot()).store;
}
/** The callback must be deterministic and have no external side effects: a
 * conflicting live write retries it against the newest database snapshot. */
export async function mutateStore<T>(
  fn: (store: Store) => T | Promise<T>,
): Promise<T> {
  return serialized(async () => {
    if (getEnv().demoMode) {
      const store = await readLocal();
      const result = await fn(store);
      await saveLocal(store);
      return result;
    }
    const db = client();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { version, store } = await snapshot();
      const result = await fn(store);
      const { data, error } = await db.rpc("signalcheck_commit_store", {
        expected_version: version,
        next_store: store,
      });
      if (error)
        throw new Error(
          "Database write failed. No partial changes were saved.",
        );
      if (data === true) return result;
    }
    throw new Error("The evidence changed during this request. Please retry.");
  });
}
const allowedMedia = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "video/webm",
]);
export async function uploadMedia(file: File): Promise<string> {
  const type = file.type.split(";")[0];
  if (
    !allowedMedia.has(type) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error(
      "Upload a supported image or audio file between 1 byte and 10 MB.",
    );
  const path = `${randomUUID()}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (getEnv().demoMode) {
    await mkdir(join(directory(), "media"), { recursive: true });
    await writeFile(join(directory(), "media", path), bytes, { mode: 0o600 });
    await writeFile(
      join(directory(), "media", `${path}.json`),
      JSON.stringify({ type }),
      { mode: 0o600 },
    );
  } else {
    const { error } = await client()
      .storage.from("report-media")
      .upload(path, bytes, { contentType: type, upsert: false });
    if (error)
      throw new Error(
        "Media upload failed. Check the private report-media storage bucket.",
      );
  }
  return path;
}
export async function downloadMedia(
  path: string,
): Promise<{ data: Uint8Array; type: string }> {
  if (!/^[a-f0-9-]{36}$/.test(path))
    throw new Error("Invalid media reference.");
  if (getEnv().demoMode) {
    const [data, metadata] = await Promise.all([
      readFile(join(directory(), "media", path)),
      readFile(join(directory(), "media", `${path}.json`), "utf8"),
    ]);
    return { data: new Uint8Array(data), type: JSON.parse(metadata).type };
  }
  const { data, error } = await client()
    .storage.from("report-media")
    .download(path);
  if (error || !data) throw new Error("Media is unavailable.");
  return { data: new Uint8Array(await data.arrayBuffer()), type: data.type };
}
