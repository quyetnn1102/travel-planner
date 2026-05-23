import type {
  Activity,
  ChecklistItem,
  CostItem,
  CostSummary,
  TimeBlock,
  Trip,
  TripDraft,
  TripShare,
} from "@/lib/travel";
import type { PublicTrip } from "@/lib/public-trip";
import type { AiRecommendationsResponse, AiSearchPlacesResponse, AiTripPreviewResponse } from "@/lib/ai-recommendations";
import type { TripTemplate } from "@/lib/trip-templates";

type ApiResult<T> = {
  data: T;
};

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

type ActivityPayload = {
  timeBlock?: TimeBlock;
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  estimatedCost: number;
  notes: string;
};

type CostPayload = {
  category?: CostItem["category"];
  name?: string;
  amount?: number;
  quantity?: number;
  notes?: string;
};

type ChecklistPayload = {
  title?: string;
  isDone?: boolean;
  category?: string;
};

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  authMode: "authjs" | "development-stub";
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as ApiResult<T> | ApiError | null;

  if (!response.ok || !payload || !("data" in payload)) {
    const message = payload && "error" in payload ? payload.error?.message : undefined;
    const code = payload && "error" in payload ? payload.error?.code : undefined;
    throw new ApiRequestError(
      message ?? "Could not save changes. Please try again.",
      response.status,
      code,
    );
  }

  return payload.data;
}

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export const travelApi = {
  getCurrentUser: () => request<CurrentUser | null>("/api/auth/me"),
  listTrips: () => request<Trip[]>("/api/trips"),
  getTrip: (tripId: string) => request<Trip>(`/api/trips/${tripId}`),
  createTrip: (draft: TripDraft) =>
    request<Trip>("/api/trips", {
      method: "POST",
      body: jsonBody(draft),
    }),
  updateTrip: (tripId: string, draft: TripDraft) =>
    request<Trip>(`/api/trips/${tripId}`, {
      method: "PATCH",
      body: jsonBody(draft),
    }),
  deleteTrip: (tripId: string) =>
    request<{ deleted: boolean }>(`/api/trips/${tripId}`, {
      method: "DELETE",
    }),
  addActivity: (dayId: string, payload: ActivityPayload) =>
    request<Activity>(`/api/itinerary-days/${dayId}/activities`, {
      method: "POST",
      body: jsonBody(payload),
    }),
  updateActivity: (activityId: string, payload: ActivityPayload) =>
    request<Activity>(`/api/activities/${activityId}`, {
      method: "PATCH",
      body: jsonBody(payload),
    }),
  deleteActivity: (activityId: string) =>
    request<{ deleted: boolean }>(`/api/activities/${activityId}`, {
      method: "DELETE",
    }),
  reorderActivities: (dayId: string, activityIds: string[]) =>
    request<Activity[]>(`/api/itinerary-days/${dayId}/activities/reorder`, {
      method: "PATCH",
      body: jsonBody({ activityIds }),
    }),
  addCost: (tripId: string, payload: CostPayload) =>
    request<CostItem>(`/api/trips/${tripId}/costs`, {
      method: "POST",
      body: jsonBody(payload),
    }),
  updateCost: (costId: string, payload: CostPayload) =>
    request<CostItem>(`/api/costs/${costId}`, {
      method: "PATCH",
      body: jsonBody(payload),
    }),
  deleteCost: (costId: string) =>
    request<{ deleted: boolean }>(`/api/costs/${costId}`, {
      method: "DELETE",
    }),
  getCostSummary: (tripId: string) => request<CostSummary>(`/api/trips/${tripId}/cost-summary`),
  addChecklistItem: (tripId: string, payload: ChecklistPayload) =>
    request<ChecklistItem>(`/api/trips/${tripId}/checklist`, {
      method: "POST",
      body: jsonBody(payload),
    }),
  updateChecklistItem: (itemId: string, payload: ChecklistPayload) =>
    request<ChecklistItem>(`/api/checklist/${itemId}`, {
      method: "PATCH",
      body: jsonBody(payload),
    }),
  deleteChecklistItem: (itemId: string) =>
    request<{ deleted: boolean }>(`/api/checklist/${itemId}`, {
      method: "DELETE",
    }),
  enableShare: (tripId: string) =>
    request<TripShare>(`/api/trips/${tripId}/share`, {
      method: "POST",
    }),
  updateShare: (tripId: string, isEnabled: boolean) =>
    request<TripShare>(`/api/trips/${tripId}/share`, {
      method: "PATCH",
      body: jsonBody({ isEnabled }),
    }),
  getSharedTrip: (shareToken: string) => request<PublicTrip>(`/api/shared/${shareToken}`),
  getAiRecommendations: (tripId: string) =>
    request<AiRecommendationsResponse>("/api/ai/recommendations", {
      method: "POST",
      body: jsonBody({ tripId }),
    }),
  generateItinerary: (tripId: string) =>
    request<{ added: Array<{ dayNumber: number; title: string; timeBlock: string }> }>(
      "/api/ai/generate-itinerary",
      { method: "POST", body: jsonBody({ tripId }) },
    ),
  searchPlaces: (tripId: string, query: string) =>
    request<AiSearchPlacesResponse>("/api/ai/search-places", {
      method: "POST",
      body: jsonBody({ tripId, query }),
    }),
  previewTrip: (draft: TripDraft) =>
    request<AiTripPreviewResponse>("/api/ai/preview-trip", {
      method: "POST",
      body: jsonBody({ draft }),
    }),
  listTemplates: () => request<Array<Omit<TripTemplate, "days" | "costItems" | "checklistItems"> & { dayCount: number }>>("/api/templates"),
  getTemplate: (templateId: string) => request<TripTemplate>(`/api/templates/${templateId}`),
  useTemplate: (templateId: string, startDate?: string) =>
    request<{ tripId: string }>(`/api/templates/${templateId}/use`, {
      method: "POST",
      body: jsonBody({ startDate }),
    }),
};
