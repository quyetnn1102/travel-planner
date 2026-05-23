import type { CostCategory, TravelStyle } from "@/lib/travel";
import type { TripTemplate } from "@/lib/trip-templates";

export type Tab = "itinerary" | "costs" | "checklist" | "booking" | "share";

export type ActivityDraft = {
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  estimatedCost: number;
  notes: string;
};

export type CostDraft = {
  category: CostCategory;
  name: string;
  amount: number;
  quantity: number;
  notes: string;
};

export type TemplateSummary = Omit<TripTemplate, "days" | "costItems" | "checklistItems"> & { dayCount: number };

export type StyleChangeHandler = (style: TravelStyle) => void;
