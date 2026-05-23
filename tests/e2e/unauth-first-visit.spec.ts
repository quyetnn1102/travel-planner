import { expect, test } from "@playwright/test";

test("signed-out first visit stays public and routes private actions to sign-in", async ({ page }) => {
  let tripsCalled = false;
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null }),
    }),
  );
  await page.route("**/api/templates", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "tokyo-family",
            title: "Tokyo family plan",
            destination: "Tokyo",
            durationDays: 5,
            adultCount: 2,
            childCount: 1,
            budgetAmount: 30000000,
            currency: "VND",
            travelStyle: ["FAMILY"],
            summary: "A family template.",
            suggestedArea: "Shinjuku",
            coverImageUrl: null,
            dayCount: 5,
            createdAt: "2026-05-23T00:00:00.000Z",
            updatedAt: "2026-05-23T00:00:00.000Z",
          },
        ],
      }),
    }),
  );
  await page.route("**/api/trips", (route) => {
    tripsCalled = true;
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication is required." } }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("link", { name: /đăng nhập|sign in/i }).first()).toBeVisible();
  await expect(page.getByText("Tokyo family plan")).toBeVisible();
  expect(tripsCalled).toBe(false);
  expect(consoleErrors.some((message) => message.includes("401"))).toBe(false);

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /use/i }).click();
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2F|\/signin\?callbackUrl=\//);

  await expect(page.getByText(/google|sign in/i).first()).toBeVisible();
});

test("authenticated dashboard renders loading and empty states", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user_1",
          name: "Demo User",
          email: "demo@example.com",
          authMode: "authjs",
        },
      }),
    }),
  );
  await page.route("**/api/templates", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    }),
  );
  await page.route("**/api/trips", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto("/");

  await expect(page.getByText(/đang đồng bộ|syncing/i)).toBeVisible();
  await expect(page.getByText(/0\s+kế hoạch|0\s+plans/i)).toBeVisible();
});

test("authenticated dashboard renders trip fetch errors", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user_1",
          name: "Demo User",
          email: "demo@example.com",
          authMode: "authjs",
        },
      }),
    }),
  );
  await page.route("**/api/templates", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    }),
  );
  await page.route("**/api/trips", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "Trips unavailable" } }),
    }),
  );

  await page.goto("/");

  await expect(page.getByText("Trips unavailable")).toBeVisible();
});
