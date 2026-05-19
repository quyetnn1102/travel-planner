import * as memoryStore from "@/server/memory-travel-store";
import type * as prismaStore from "@/server/prisma-travel-store";

type StoreModule = typeof memoryStore | typeof prismaStore;

async function activeStore(): Promise<StoreModule> {
  if (getRuntimeDatabaseUrl()) {
    return import("@/server/prisma-travel-store");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("A database URL is required in production.");
  }

  return memoryStore;
}

function getRuntimeDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRE_SQL_POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRE_SQL_POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL_NON_POOLING ??
    ""
  );
}

export async function listTrips() {
  return (await activeStore()).listTrips();
}

export async function getTrip(tripId: string) {
  return (await activeStore()).getTrip(tripId);
}

export async function createTrip(input: unknown) {
  return (await activeStore()).createTrip(input);
}

export async function updateTrip(tripId: string, input: unknown) {
  return (await activeStore()).updateTrip(tripId, input);
}

export async function deleteTrip(tripId: string) {
  return (await activeStore()).deleteTrip(tripId);
}

export async function getItinerary(tripId: string) {
  return (await activeStore()).getItinerary(tripId);
}

export async function addActivity(dayId: string, input: unknown) {
  return (await activeStore()).addActivity(dayId, input);
}

export async function addActivitiesToDays(items: Array<{ dayId: string; input: unknown }>) {
  return (await activeStore()).addActivitiesToDays(items);
}

export async function patchActivity(activityId: string, input: unknown) {
  return (await activeStore()).patchActivity(activityId, input);
}

export async function deleteActivity(activityId: string) {
  return (await activeStore()).deleteActivity(activityId);
}

export async function reorderActivities(dayId: string, input: unknown) {
  return (await activeStore()).reorderActivities(dayId, input);
}

export async function listCosts(tripId: string) {
  return (await activeStore()).listCosts(tripId);
}

export async function addCost(tripId: string, input: unknown) {
  return (await activeStore()).addCost(tripId, input);
}

export async function patchCost(costId: string, input: unknown) {
  return (await activeStore()).patchCost(costId, input);
}

export async function deleteCost(costId: string) {
  return (await activeStore()).deleteCost(costId);
}

export async function getCostSummary(tripId: string) {
  return (await activeStore()).getCostSummary(tripId);
}

export async function listChecklist(tripId: string) {
  return (await activeStore()).listChecklist(tripId);
}

export async function addChecklistItem(tripId: string, input: unknown) {
  return (await activeStore()).addChecklistItem(tripId, input);
}

export async function patchChecklistItem(itemId: string, input: unknown) {
  return (await activeStore()).patchChecklistItem(itemId, input);
}

export async function deleteChecklistItem(itemId: string) {
  return (await activeStore()).deleteChecklistItem(itemId);
}

export async function enableShare(tripId: string) {
  return (await activeStore()).enableShare(tripId);
}

export async function patchShare(tripId: string, input: unknown) {
  return (await activeStore()).patchShare(tripId, input);
}

export async function getSharedTrip(shareToken: string) {
  return (await activeStore()).getSharedTrip(shareToken);
}
