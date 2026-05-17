import type { CostCategory, TimeBlock, TravelStyle } from "@/lib/travel";

export type PublicActivity = {
  timeBlock: TimeBlock;
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  estimatedCost: number;
  notes: string;
  sortOrder: number;
};

export type PublicItineraryDay = {
  dayNumber: number;
  date: string;
  title: string;
  activities: PublicActivity[];
};

export type PublicCostItem = {
  category: CostCategory;
  name: string;
  amount: number;
  quantity: number;
};

export type PublicChecklistItem = {
  title: string;
  isDone: boolean;
  category: string;
};

export type PublicTrip = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  travelStyles: TravelStyle[];
  itineraryDays: PublicItineraryDay[];
  costItems: PublicCostItem[];
  checklistItems: PublicChecklistItem[];
};
