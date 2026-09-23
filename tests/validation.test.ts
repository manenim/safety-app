import { it, expect } from "vitest";
import {
  reportInputSchema,
  validateMedia,
  validateMediaBytes,
} from "../src/lib/validation";
it("rejects empty text and future timestamps", () => {
  expect(reportInputSchema.safeParse({ text: "" }).success).toBe(false);
  expect(
    reportInputSchema.safeParse({
      text: "I saw a blocked road",
      observedAt: "2099-01-01T00:00:00.000Z",
    }).success,
  ).toBe(false);
});
it("limits files and rejects disguised image data", () => {
  expect(() =>
    validateMedia(
      new File(["a"], "file.exe", { type: "application/octet-stream" }),
      "image",
    ),
  ).toThrow();
  expect(() =>
    validateMediaBytes(new Uint8Array([1, 2, 3]), "image/png"),
  ).toThrow();
});

it("recognizes a voice note when the browser omits its MIME type", () => {
  const file = new File(
    [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])],
    "voice.webm",
  );
  expect(validateMedia(file, "audio")).toBe("audio/webm");
});
