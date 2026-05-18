import type { TimeBlock } from "@/lib/travel";

export type AiRecommendation = {
  title: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

export type AiRecommendationsResponse = {
  recommendations: AiRecommendation[];
};

export type AiSearchPlace = {
  name: string;
  description: string;
  locationName: string;
  suggestedTimeBlock: TimeBlock;
  estimatedCost: number;
};

export type AiSearchPlacesResponse = {
  places: AiSearchPlace[];
};

export type AiPreviewActivity = {
  title: string;
  timeBlock: TimeBlock;
  locationName: string;
  notes: string;
};

export type AiDayPreview = {
  dayNumber: number;
  date: string;
  summary: string;
  activities: AiPreviewActivity[];
};

export type AiTripPreview = {
  suggestedTitle: string;
  destinationDescription: string;
  itineraryPreview: AiDayPreview[];
};

export type AiTripPreviewResponse = {
  preview: AiTripPreview;
};
