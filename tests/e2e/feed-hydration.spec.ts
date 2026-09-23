import { test, expect } from "@playwright/test";

test("feed hydrates with a consistent loading state and refresh recovers", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  const refreshMarkup = html.match(
    /<button\b[^>]*aria-label="Refresh feed"[^>]*>/,
  )?.[0];
  expect(refreshMarkup).toContain('disabled=""');

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  let release = () => {};
  await page.route("**/api/incidents", async (route) => {
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: { incidents: [], demoMode: false } });
  });

  const initialRequest = page.waitForRequest("**/api/incidents");
  await page.goto("/");
  await initialRequest;
  const refresh = page.getByRole("button", { name: "Refresh feed" });
  await expect(refresh).toBeDisabled();
  release();
  await expect(refresh).toBeEnabled();

  const refreshRequest = page.waitForRequest("**/api/incidents");
  await refresh.click();
  await refreshRequest;
  await expect(refresh).toBeDisabled();
  release();
  await expect(refresh).toBeEnabled();
  expect(errors).toEqual([]);
});
