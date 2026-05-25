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

test("english locale translates itinerary controls", async ({ page }) => {
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
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "trip_1",
            title: "Bangkok family plan",
            destination: "Bangkok, Thailand",
            startDate: "2026-06-18",
            endDate: "2026-06-21",
            adultCount: 2,
            childCount: 1,
            budgetAmount: 30000000,
            currency: "VND",
            travelStyles: ["family"],
            notes: "",
            updatedAt: "2026-05-25T00:00:00.000Z",
            share: null,
            itineraryDays: [
              {
                id: "day_1",
                tripId: "trip_1",
                dayNumber: 1,
                date: "2026-06-18",
                title: "Ngay 1",
                activities: [
                  {
                    id: "activity_1",
                    itineraryDayId: "day_1",
                    timeBlock: "afternoon",
                    title: "Arrival and Siam",
                    startTime: "",
                    endTime: "",
                    locationName: "Bangkok, Thailand",
                    address: "",
                    estimatedCost: 0,
                    notes: "Check in, Siam Paragon or CentralWorld, dinner.",
                    sortOrder: 0,
                  },
                ],
              },
              {
                id: "day_2",
                tripId: "trip_1",
                dayNumber: 2,
                date: "2026-06-19",
                title: "Ngay 2",
                activities: [],
              },
            ],
            costItems: [],
            checklistItems: [],
          },
        ],
      }),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await expect(page.getByRole("button", { name: /Day 1/i })).toBeVisible();
  await expect(page.getByText("No activities yet").first()).toBeVisible();
  await expect(page.getByText("No time set")).toBeVisible();
  await expect(page.getByPlaceholder("Activity name").first()).toBeVisible();
  await expect(page.getByPlaceholder("Place / area").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(page.locator("#planner").getByRole("button", { name: "Delete", exact: true })).toBeVisible();
});
