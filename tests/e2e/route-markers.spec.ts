import { test, expect } from "@playwright/test";

test("route endpoints and populated demo reports fit mobile and narrow result columns", async ({
  page,
  request,
}) => {
  const { incidents } = await (await request.get("/api/incidents")).json();
  const incident = incidents.find((item: { isDemo?: boolean }) => item.isDemo);
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { demoMode: false } }),
  );
  await page.route("**/api/route-check", (route) => {
    return route.fulfill({
      json: {
        state: "impacted",
        summary: "Evidence near this route.",
        origin: "Airport Road, Lugbe, Federal Capital Territory, Nigeria",
        destination:
          "4 Madiana Close, off Dar-Es-Salam Street, Wuse 2, Abuja, Nigeria",
        geometry: [
          [7.36, 8.97],
          [7.47, 9.07],
        ],
        distanceMeters: 21350,
        durationSeconds: 1255,
        incidents: [{ incident, distanceMeters: 20 }],
        alternatives: [],
        unlocatedCount: 0,
      },
    });
  });
  await page.goto("/routes");
  await page
    .getByRole("combobox", { name: "Starting point", exact: true })
    .fill("Airport Road, Lugbe");
  await page
    .getByRole("combobox", { name: "Destination", exact: true })
    .fill("Wuse, Abuja");
  await expect(
    page.getByRole("checkbox", { name: /Include demo reports/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check route", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Signals near this route" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demo scenarios included", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".map-endpoint-key")).toContainText("Start");
  await expect(page.locator(".map-endpoint-key")).toContainText("Destination");
  for (const width of [390, 795, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
