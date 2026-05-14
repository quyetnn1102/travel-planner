import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCostSummary,
  createDefaultChecklist,
  createItineraryDays,
  createTripFromDraft,
} from "../src/lib/travel.ts";

test("creates one itinerary day for each inclusive date in range", () => {
  const days = createItineraryDays("trip_test", "2026-10-01", "2026-10-05");

  assert.equal(days.length, 5);
  assert.deepEqual(
    days.map((day) => day.date),
    ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
  );
});

test("normalizes an invalid end date to the start date", () => {
  const trip = createTripFromDraft({
    title: "Test",
    destination: "Tokyo",
    startDate: "2026-10-05",
    endDate: "2026-10-01",
    adultCount: 2,
    childCount: 1,
    budgetAmount: 10_000_000,
    travelStyles: ["family"],
    notes: "",
  });

  assert.equal(trip.endDate, "2026-10-05");
  assert.equal(trip.itineraryDays.length, 1);
});

test("calculates total, per-person cost, and budget delta", () => {
  const trip = createTripFromDraft({
    title: "Budget test",
    destination: "Seoul",
    startDate: "2026-11-01",
    endDate: "2026-11-02",
    adultCount: 2,
    childCount: 2,
    budgetAmount: 20_000_000,
    travelStyles: ["food"],
    notes: "",
  });

  trip.costItems = [
    {
      id: "cost_1",
      tripId: trip.id,
      category: "hotel",
      name: "Hotel",
      amount: 3_000_000,
      quantity: 2,
      notes: "",
    },
    {
      id: "cost_2",
      tripId: trip.id,
      category: "food",
      name: "Food",
      amount: 2_000_000,
      quantity: 1,
      notes: "",
    },
  ];

  const summary = calculateCostSummary(trip);

  assert.equal(summary.total, 8_000_000);
  assert.equal(summary.perPerson, 2_000_000);
  assert.equal(summary.budgetDelta, 12_000_000);
  assert.equal(summary.isOverBudget, false);
});

test("default checklist contains the expected MVP preparation items", () => {
  const checklist = createDefaultChecklist("trip_test");

  assert.equal(checklist.length, 10);
  assert.equal(checklist[0].title, "Hộ chiếu / căn cước");
  assert.equal(checklist.every((item) => item.isDone === false), true);
});
