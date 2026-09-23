import { test, expect, type Page } from "@playwright/test";

async function fillReport(page: Page) {
  await page.goto("/report");
  await page
    .getByLabel("What happened?")
    .fill(
      "I saw vehicles turning back at Market Junction. Police were directing traffic.",
    );
  await page
    .getByLabel("Location or nearby landmark")
    .fill("Market Junction, Lagos");
  await page.getByLabel("Time observed").fill("2026-09-23T08:44");
  await page
    .getByRole("combobox", { name: "Source type", exact: true })
    .selectOption("eyewitness");
  await page.getByText("Add source details or notes (optional)").click();
  await page
    .getByLabel("Original source or channel (optional)")
    .fill("Personal observation");
  await page
    .getByLabel("Reporter notes (optional)")
    .fill("I saw this firsthand.");
}

test("saved reports clear the form and open a dismissible evidence modal", async ({
  page,
}) => {
  await fillReport(page);
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Report saved", exact: true });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("heading", { name: "Extracted claims", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("What happened?")).toHaveValue("");
  await expect(page.getByLabel("Location or nearby landmark")).toHaveValue("");
  await expect(page.getByLabel("Time observed")).toHaveValue("");
  await expect(page.locator("select[name=sourceType]")).toHaveValue("");
  await expect(
    page.getByLabel("Original source or channel (optional)"),
  ).toHaveValue("");
  await expect(page.getByLabel("Reporter notes (optional)")).toHaveValue("");
  await expect(
    modal.getByRole("heading", { name: "Report saved", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await modal.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit report", exact: true }),
  ).toBeFocused();
});

test("mobile evidence modal supports Escape and back to feed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillReport(page);
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Report saved", exact: true });
  await expect(modal).toBeVisible();
  const box = await modal.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await fillReport(page);
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await modal.getByRole("link", { name: "Back to feed", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
});

test("failed submissions keep the report and do not open the success modal", async ({
  page,
}) => {
  await page.route("**/api/reports", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unable to save. Please retry." }),
    }),
  );
  await fillReport(page);
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Unable to save" }),
  ).toBeVisible();
  await expect(page.getByLabel("What happened?")).toHaveValue(
    /vehicles turning back/,
  );
  await expect(page.getByLabel("Location or nearby landmark")).toHaveValue(
    "Market Junction, Lagos",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("saved photo reports clear the attachment", async ({ page }) => {
  await page.goto("/report?type=image");
  await page
    .getByLabel("Add context (optional)")
    .fill("Vehicles are turning back near Market Junction.");
  await page
    .getByRole("combobox", { name: "Source type", exact: true })
    .selectOption("eyewitness");
  await page.getByLabel("Upload an image", { exact: true }).setInputFiles({
    name: "report-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Report saved", exact: true });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Upload an image", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Add context (optional)")).toHaveValue("");
  await expect(page.getByText(/report-photo\.png/)).not.toBeVisible();
});

test("saved but unanalyzed reports show retry errors inside the modal", async ({
  page,
}) => {
  await page.route("**/api/reports", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report: {
          id: "pending-report",
          analysisStatus: "failed",
          normalized: null,
          analysisError: "Analysis unavailable.",
        },
        incident: null,
      }),
    }),
  );
  await page.route("**/api/reports/pending-report/retry", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Analysis is still unavailable. Try again.",
      }),
    }),
  );
  await fillReport(page);
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Report saved", exact: true });
  await expect(modal).toContainText(
    "Your report is stored, but analysis is failed",
  );
  await expect(page.getByLabel("What happened?")).toHaveValue("");
  await modal
    .getByRole("button", { name: "Retry analysis", exact: true })
    .click();
  await expect(
    modal.getByRole("alert").filter({ hasText: "still unavailable" }),
  ).toBeVisible();
});
