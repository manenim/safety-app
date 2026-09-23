import { z } from "zod";
import { sourceTypes } from "@/domain/types";
import { mediaMimeType } from "./media";
export class MediaValidationError extends Error {}
export const reportInputSchema = z
  .object({
    text: z.string().max(12000).default(""),
    locationHint: z.string().max(250).default(""),
    locationPlaceId: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .max(300)
      .optional(),
    sourceType: z.enum(sourceTypes).default("anonymous/unknown"),
    observedAt: z.string().datetime().nullable().default(null),
    notes: z.string().max(1500).default(""),
    origin: z.string().max(150).default(""),
    inputType: z.enum(["text", "audio", "image", "screenshot"]).default("text"),
  })
  .superRefine((v, ctx) => {
    if (v.locationPlaceId && !v.locationHint.trim())
      ctx.addIssue({
        code: "custom",
        path: ["locationHint"],
        message: "Choose a location or clear the selected place.",
      });
    if (v.inputType === "text" && v.text.trim().length < 10)
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Describe the observation in at least 10 characters.",
      });
    if (v.observedAt && Date.parse(v.observedAt) > Date.now() + 300000)
      ctx.addIssue({
        code: "custom",
        path: ["observedAt"],
        message: "Observation time cannot be in the future.",
      });
  });
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export const audioTypes = [
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
];
export function validateMedia(file: File, inputType: string) {
  const type = mediaMimeType(file);
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new MediaValidationError("Upload a file between 1 byte and 10 MB.");
  if (!(inputType === "audio" ? audioTypes : imageTypes).includes(type))
    throw new MediaValidationError(
      "Unsupported media format. Use JPG, PNG, WebP, MP3, WAV, M4A, OGG or WebM.",
    );
  return type;
}
export function validateMediaBytes(data: Uint8Array, type: string) {
  const text = (start: number, end: number) =>
    Buffer.from(data.slice(start, end)).toString("ascii");
  const valid =
    type === "image/jpeg"
      ? data[0] === 255 && data[1] === 216 && data[2] === 255
      : type === "image/png"
        ? data[0] === 137 && text(1, 4) === "PNG"
        : type === "image/webp"
          ? text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
          : type.includes("wav")
            ? text(0, 4) === "RIFF" && text(8, 12) === "WAVE"
            : type.includes("ogg")
              ? text(0, 4) === "OggS"
              : type.includes("webm")
                ? data[0] === 0x1a &&
                  data[1] === 0x45 &&
                  data[2] === 0xdf &&
                  data[3] === 0xa3
                : type.includes("mp4") || type.includes("m4a")
                  ? text(4, 8) === "ftyp"
                  : text(0, 3) === "ID3" ||
                    (data[0] === 255 && (data[1] & 0xe0) === 0xe0);
  if (!valid)
    throw new MediaValidationError(
      type.startsWith("image/")
        ? "File contents do not match the selected image format. Upload a JPG, PNG or WebP image."
        : "This recording could not be read as its selected format. Record it again or upload an MP3, WAV, M4A, OGG or WebM file.",
    );
}
export const alertSchema = z.object({
  incidentId: z.string().uuid(),
  format: z.enum([
    "short alert",
    "SMS-style alert",
    "WhatsApp-style message",
    "radio announcement",
    "push notification",
    "community briefing",
    "short",
    "sms",
    "whatsapp",
    "radio",
    "push",
    "briefing",
  ]),
  language: z.string().min(2).max(50),
  audience: z.string().max(150).default("Residents"),
  length: z.string().max(80).default("brief"),
});
