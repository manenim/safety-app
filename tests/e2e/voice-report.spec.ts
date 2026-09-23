import { test, expect } from "@playwright/test";

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("browser voice recording can be previewed, submitted, and cleared", async ({
  page,
}) => {
  await page.goto("/report?type=audio");
  await page.getByRole("combobox", { name: "Source type", exact: true }).selectOption("eyewitness");
  await page
    .getByLabel("Add context (optional)")
    .fill("I saw traffic moving slowly near Market Junction.");
  await page.getByRole("button", { name: "Record a voice report" }).click();
  const stop = page.getByRole("button", { name: /Stop recording/ });
  await expect(stop).toBeVisible();
  // Capture a short sample from Chromium's synthetic audio device.
  await page.waitForTimeout(1100);
  await stop.click();
  await expect(page.getByLabel("Preview voice note")).toBeVisible();
  await expect(page.getByLabel("Preview voice note")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Report saved", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Preview voice note")).toHaveCount(0);
});

test("invalid voice upload gives an actionable error and preserves the attachment", async ({
  page,
}) => {
  await page.goto("/report?type=audio");
  await page.getByRole("combobox", { name: "Source type", exact: true }).selectOption("eyewitness");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "voice.webm",
      mimeType: "audio/webm",
      buffer: Buffer.from("invalid webm"),
    });
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "This recording could not be read",
  );
  await expect(page.getByLabel("Preview voice note")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
