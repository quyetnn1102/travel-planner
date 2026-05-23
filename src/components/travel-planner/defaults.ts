import type { ActivityDraft, CostDraft } from "./types";
import type { TripDraft } from "@/lib/travel";

export const emptyTripDraft: TripDraft = {
  title: "",
  destination: "",
  startDate: "2026-10-01",
  endDate: "2026-10-05",
  adultCount: 2,
  childCount: 0,
  budgetAmount: 30_000_000,
  travelStyles: ["family"],
  notes: "",
};

export const emptyActivityDraft: ActivityDraft = {
  title: "",
  startTime: "",
  endTime: "",
  locationName: "",
  address: "",
  estimatedCost: 0,
  notes: "",
};

export const emptyCostDraft: CostDraft = {
  category: "hotel",
  name: "",
  amount: 0,
  quantity: 1,
  notes: "",
};
