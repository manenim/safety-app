import { test, expect } from "@playwright/test";
test("resident submits report, inspects claims, and asks evidence-grounded question", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /Road disruption at Market Junction/ })
      .first(),
  ).toBeVisible({ timeout: 20000 });
  await page.goto("/report");
  await page
    .getByLabel("What happened?")
    .fill(
      "I just passed Market Junction. Vehicles are turning back and police are around. I heard gunmen were seen but I did not see any gunmen.",
    );
  await page
    .getByLabel("Location or nearby landmark")
    .fill("Market Junction, Lagos");
  await page
    .getByRole("combobox", { name: "Source type", exact: true })
    .selectOption("eyewitness");
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Report saved" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Extracted claims" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View incident evidence" }).click();
  await page.waitForURL(/\/incidents\//);
  await expect(
    page.getByRole("heading", {
      name: /Road disruption at Market Junction/,
      level: 1,
    }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Why this status/).first()).toBeVisible();
  await page.goto("/ask");
  await page
    .getByLabel("Your question")
    .fill("What happened near Market Junction?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Evidence-based answer" }),
  ).toBeVisible();
  await expect(
    page.getByText("Evidence summary", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /fictional|demo response|demonstration scenario/i,
  );
});
test("coordinator actions require login and generate a draft", async ({
  page,
  request,
}) => {
  const blocked = await request.post("/api/alerts/generate", { data: {} });
  expect(blocked.status()).toBe(401);
  await page.goto("/command-center");
  await page
    .getByRole("button", { name: /Open coordinator workspace/i })
    .click();
  await page
    .getByLabel("Incident focus")
    .selectOption("00000001-0000-4000-8000-000000000001");
  await page
    .getByRole("button", { name: "Generate situation brief", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Situation brief", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "What changed?", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What changed?", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Alert Drafts/ }).click();
  await page
    .getByLabel("Target incident")
    .selectOption("00000001-0000-4000-8000-000000000001");
  await page
    .getByRole("button", { name: "Generate alert", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Alert draft" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Coordinator access" }),
  ).toBeVisible();
});
test("mobile feed stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /Road disruption at Market Junction/ })
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("timeline filters, contextual Ask, and media composer work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".incident-card").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Filter signals", exact: true })
    .click();
  await page
    .getByLabel("Search incidents or locations", { exact: true })
    .fill("Waterfront");
  await expect(page.locator(".incident-card")).toHaveCount(1);
  await expect(page.locator(".incident-card")).toContainText("waterfront");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".incident-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Close filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Emerging", exact: true }).click();
  await expect(page.locator(".incident-card")).toHaveCount(1);
  await page
    .locator(".incident-card")
    .getByRole("link", { name: "Ask", exact: true })
    .click();
  await expect(page).toHaveURL(/ask\?incidentId=/);
  await expect(page.locator(".context-chip")).toContainText("Central Bridge");
  await page.goto("/report?type=image");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByLabel("Upload an image", { exact: true }),
  ).toBeVisible();
});

test("all main screens fit narrow mobile and tablet viewports", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/report",
      "/ask",
      "/routes",
      "/command-center",
      "/incidents/00000001-0000-4000-8000-000000000001",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible({ timeout: 20000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      await expect(
        page
          .getByRole("link", { name: "SignalCheck home", exact: true })
          .filter({ visible: true }),
      ).toHaveCount(1);
    }
  }
});
