import { api } from "@/server/http";
import { ingest } from "@/server/services";
import { HttpError, sourceIdentity } from "@/server/auth";
import {
  reportInputSchema,
  validateMedia,
  validateMediaBytes,
} from "@/lib/validation";
export const maxDuration = 120;
export const POST = api(async (request) => {
  const form = await request.formData();
  const raw = Object.fromEntries(
    [
      "text",
      "locationHint",
      "locationPlaceId",
      "sourceType",
      "observedAt",
      "notes",
      "origin",
      "inputType",
    ].map((k) => [k, form.get(k) || undefined]),
  );
  if (typeof raw.observedAt === "string") {
    if (!Number.isFinite(Date.parse(raw.observedAt)))
      throw new HttpError("Enter a valid observation time.");
    raw.observedAt = new Date(raw.observedAt).toISOString();
  }
  const input = reportInputSchema.parse(raw);
  const value = form.get("media");
  let file = value instanceof File && value.size ? value : undefined;
  if (file) {
    const type = validateMedia(file, input.inputType);
    const bytes = await file.arrayBuffer();
    validateMediaBytes(new Uint8Array(bytes), type);
    file = new File([bytes], file.name, { type });
  }
  if (input.inputType !== "text" && !file && input.text.trim().length < 10)
    throw new HttpError(
      "Attach media or enter a manual description of at least 10 characters.",
    );
  return ingest(input, await sourceIdentity(), file);
}, 8);
