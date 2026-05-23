import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { ApiRequestError, travelApi } from "../src/lib/api.ts";
import { loadTravelPlannerData } from "../src/lib/travel-planner-data.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("API client exposes structured errors from failed responses", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );

  await assert.rejects(
    travelApi.listTrips(),
    (error) =>
      error instanceof ApiRequestError &&
      error.status === 401 &&
      error.code === "UNAUTHORIZED" &&
      error.message === "Authentication is required.",
  );
});

test("initial planner load does not request private trips for signed-out users", async () => {
  let tripCalls = 0;

  const result = await loadTravelPlannerData({
    getCurrentUser: async () => null,
    listTemplates: async () => [],
    listTrips: async () => {
      tripCalls += 1;
      return [];
    },
  });

  assert.equal(tripCalls, 0);
  assert.equal(result.user, null);
  assert.deepEqual(result.trips, []);
});

test("initial planner load requests trips after a user is known", async () => {
  let tripCalls = 0;

  const result = await loadTravelPlannerData({
    getCurrentUser: async () => ({
      id: "user_1",
      name: "Demo User",
      email: "demo@example.com",
      authMode: "authjs",
    }),
    listTemplates: async () => [],
    listTrips: async () => {
      tripCalls += 1;
      return [];
    },
  });

  assert.equal(tripCalls, 1);
  assert.equal(result.user?.id, "user_1");
  assert.deepEqual(result.trips, []);
});
