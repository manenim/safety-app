import { test, expect } from "@playwright/test";
const suggestions = [
  { id: "ikeja", label: "Ikeja, Lagos, Nigeria" },
  { id: "ikoyi", label: "Ikoyi, Lagos, Nigeria" },
];

test("route locations offer keyboard and pointer selection and preserve swap", async ({
  page,
}) => {
  let requests = 0;
  const routeRequests: Record<string, string>[] = [];
  await page.route("**/api/route-check", (route) => {
    routeRequests.push(route.request().postDataJSON());
    return route.fulfill({
      status: 503,
      json: { error: "Test route unavailable" },
    });
  });
  await page.route("**/api/locations/suggest?*", (route) => {
    requests++;
    return route.fulfill({ json: { suggestions } });
  });
  await page.goto("/routes");
  const from = page.getByRole("combobox", {
    name: "Starting point",
    exact: true,
  });
  await expect(from).toBeVisible();
  await from.fill("Ik");
  await from.fill("Ikej");
  await expect(
    page.getByRole("option", { name: suggestions[0].label, exact: true }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await from.press("ArrowDown");
  await from.press("Enter");
  await expect(from).toHaveValue(suggestions[0].label);
  await expect(page.getByRole("listbox")).not.toBeVisible();
  const to = page.getByRole("combobox", { name: "Destination", exact: true });
  await to.fill("Ikoy");
  await page
    .getByRole("option", { name: suggestions[1].label, exact: true })
    .click();
  await page.getByRole("button", { name: "Swap locations" }).click();
  await expect(from).toHaveValue(suggestions[1].label);
  await expect(to).toHaveValue(suggestions[0].label);
  await page.getByRole("button", { name: "Check route", exact: true }).click();
  await expect.poll(() => routeRequests.length).toBe(1);
  expect(routeRequests[0]).toMatchObject({
    originPlaceId: "ikoyi",
    destinationPlaceId: "ikeja",
  });
  await from.fill("Lugbe, Abuja");
  await from.press("Escape");
  await page.getByRole("button", { name: "Check route", exact: true }).click();
  await expect.poll(() => routeRequests.length).toBe(2);
  expect(routeRequests[1]).not.toHaveProperty("originPlaceId");
  expect(routeRequests[1].destinationPlaceId).toBe("ikeja");
});

test("report location suggestions reset with the saved form", async ({
  page,
}) => {
  await page.route("**/api/locations/suggest?*", (route) =>
    route.fulfill({ json: { suggestions } }),
  );
  await page.goto("/report");
  const location = page.getByRole("combobox", {
    name: "Location or nearby landmark",
    exact: true,
  });
  await location.fill("Ikej");
  await page
    .getByRole("option", { name: suggestions[0].label, exact: true })
    .click();
  await page
    .getByLabel("What happened?")
    .fill("Vehicles are turning back at this junction.");
  await page
    .getByRole("combobox", { name: "Source type", exact: true })
    .selectOption("eyewitness");
  const submission = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/reports") && request.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  const submitted = (await submission).postData() || "";
  expect(submitted).toContain('name="locationPlaceId"\r\n\r\nikeja');
  const modal = page.getByRole("dialog", { name: "Report saved", exact: true });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(location).toHaveValue("");
  await location.fill("A different landmark");
  await location.press("Escape");
  await page
    .getByLabel("What happened?")
    .fill("Another road has a fallen tree blocking traffic.");
  await page
    .getByRole("combobox", { name: "Source type", exact: true })
    .selectOption("eyewitness");
  const nextSubmission = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/reports") && request.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  expect((await nextSubmission).postData()).not.toContain(
    'name="locationPlaceId"',
  );
  await expect(modal).toBeVisible();
});

test("unavailable suggestions keep manual location entry usable", async ({
  page,
}) => {
  await page.route("**/api/locations/suggest?*", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: "Suggestions are unavailable. You can still enter a location.",
      },
    }),
  );
  await page.goto("/routes");
  const from = page.getByRole("combobox", {
    name: "Starting point",
    exact: true,
  });
  await from.fill("My local landmark");
  await expect(
    page.getByRole("status").filter({ hasText: "You can still enter" }),
  ).toBeVisible();
  await expect(from).toHaveValue("My local landmark");
  await from.press("Escape");
  await expect(page.getByRole("listbox")).not.toBeVisible();
});
