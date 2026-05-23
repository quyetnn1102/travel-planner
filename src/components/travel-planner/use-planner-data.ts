"use client";

import useSWR from "swr";
import { travelApi, type CurrentUser } from "@/lib/api";
import type { Trip } from "@/lib/travel";
import type { TemplateSummary } from "./types";

export function usePlannerData() {
  const user = useSWR<CurrentUser | null>("travel-planner:current-user", travelApi.getCurrentUser);
  const templates = useSWR<TemplateSummary[]>("travel-planner:templates", travelApi.listTemplates);
  const trips = useSWR<Trip[]>(user.data ? "travel-planner:trips" : null, travelApi.listTrips);

  return {
    currentUser: user.data ?? null,
    templates: templates.data ?? [],
    trips: trips.data ?? [],
    isLoading: user.isLoading || templates.isLoading || Boolean(user.data && trips.isLoading),
    error: user.error ?? templates.error ?? trips.error ?? null,
    mutateTrips: trips.mutate,
    mutateTemplates: templates.mutate,
  };
}
