import {
  Activity,
  ChecklistItem,
  CostCategory,
  CostItem,
  TimeBlock,
  TravelStyle,
  Trip,
  TripDraft,
  calculateCostSummary,
  costCategories,
  createId,
  createItineraryDays,
  createTripFromDraft,
  makeShareToken,
  seedTrips,
  timeBlocks,
  travelStyles,
} from "@/lib/travel";
import { isRecord, toNumber, toStringValue } from "@/server/api-response";

type StoreState = {
  trips: Trip[];
};

type ActivityInput = {
  timeBlock?: TimeBlock;
  title?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  address?: string;
  estimatedCost?: number;
  notes?: string;
};

type CostInput = {
  category?: CostCategory;
  name?: string;
  amount?: number;
  quantity?: number;
  notes?: string;
};

type ChecklistInput = {
  title?: string;
  isDone?: boolean;
  category?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __travelPlannerStore?: StoreState;
};

const store = globalStore.__travelPlannerStore ?? {
  trips: seedTrips,
};

globalStore.__travelPlannerStore = store;

export function listTrips() {
  return store.trips;
}

export function getTrip(tripId: string) {
  return store.trips.find((trip) => trip.id === tripId) ?? null;
}

export function createTrip(input: unknown) {
  const draft = parseTripDraft(input);
  const trip = createTripFromDraft(draft);
  store.trips = [trip, ...store.trips];
  return trip;
}

export function updateTrip(tripId: string, input: unknown) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const patch = isRecord(input) ? input : {};
  const startDate = toStringValue(patch.startDate, trip.startDate);
  const requestedEndDate = toStringValue(patch.endDate, trip.endDate);
  const endDate = requestedEndDate < startDate ? startDate : requestedEndDate;
  const shouldRebuildDays = startDate !== trip.startDate || endDate !== trip.endDate;
  const nextTrip: Trip = {
    ...trip,
    title: toStringValue(patch.title, trip.title).trim() || trip.title,
    destination: toStringValue(patch.destination, trip.destination).trim() || trip.destination,
    startDate,
    endDate,
    adultCount: Math.max(1, toNumber(patch.adultCount, trip.adultCount)),
    childCount: Math.max(0, toNumber(patch.childCount, trip.childCount)),
    budgetAmount: Math.max(0, toNumber(patch.budgetAmount, trip.budgetAmount)),
    travelStyles: parseTravelStyles(patch.travelStyles, trip.travelStyles),
    notes: toStringValue(patch.notes, trip.notes),
    itineraryDays: shouldRebuildDays ? mergeItineraryDaysByDate(trip, startDate, endDate) : trip.itineraryDays,
    updatedAt: new Date().toISOString(),
  };

  replaceTrip(nextTrip);
  return nextTrip;
}

export function deleteTrip(tripId: string) {
  const previousLength = store.trips.length;
  store.trips = store.trips.filter((trip) => trip.id !== tripId);
  return store.trips.length !== previousLength;
}

export function getItinerary(tripId: string) {
  return getTrip(tripId)?.itineraryDays ?? null;
}

export function addActivity(dayId: string, input: unknown) {
  const location = findDay(dayId);

  if (!location) {
    return null;
  }

  const payload = parseActivityInput(input);

  if (!payload.title?.trim()) {
    throw new Error("Activity title is required.");
  }

  const timeBlock = payload.timeBlock ?? "morning";
  const sortOrder = location.day.activities.filter((activity) => activity.timeBlock === timeBlock).length;
  const activity: Activity = {
    id: createId("activity"),
    itineraryDayId: dayId,
    timeBlock,
    title: payload.title.trim(),
    startTime: payload.startTime ?? "",
    endTime: payload.endTime ?? "",
    locationName: payload.locationName ?? "",
    address: payload.address ?? "",
    estimatedCost: Math.max(0, payload.estimatedCost ?? 0),
    notes: payload.notes ?? "",
    sortOrder,
  };

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    itineraryDays: trip.itineraryDays.map((day) =>
      day.id === dayId ? { ...day, activities: [...day.activities, activity] } : day,
    ),
  }));

  return activity;
}

export function addActivitiesToDays(items: Array<{ dayId: string; input: unknown }>) {
  const prepared = items.map((item) => {
    const location = findDay(item.dayId);

    if (!location) {
      return null;
    }

    const payload = parseActivityInput(item.input);

    if (!payload.title?.trim()) {
      throw new Error("Activity title is required.");
    }

    return {
      location,
      payload,
      timeBlock: payload.timeBlock ?? "morning",
    };
  });

  if (prepared.some((item) => item === null)) {
    return null;
  }

  const sortOrders = new Map<string, number>();

  for (const item of prepared) {
    if (!item) {
      continue;
    }

    const sortKey = `${item.location.day.id}:${item.timeBlock}`;

    if (!sortOrders.has(sortKey)) {
      sortOrders.set(
        sortKey,
        item.location.day.activities.filter((activity) => activity.timeBlock === item.timeBlock).length,
      );
    }
  }

  const activities = prepared.map((item) => {
    if (!item) {
      throw new Error("Itinerary day not found.");
    }

    const sortKey = `${item.location.day.id}:${item.timeBlock}`;
    const sortOrder = sortOrders.get(sortKey) ?? 0;
    sortOrders.set(sortKey, sortOrder + 1);

    return {
      tripId: item.location.trip.id,
      dayId: item.location.day.id,
      activity: createActivity(item.location.day.id, item.payload, item.timeBlock, sortOrder),
    };
  });

  for (const group of groupActivitiesByTrip(activities)) {
    mutateTrip(group.tripId, (trip) => ({
      ...trip,
      itineraryDays: trip.itineraryDays.map((day) => {
        const dayActivities = group.activities.filter((item) => item.dayId === day.id);

        return dayActivities.length > 0
          ? { ...day, activities: [...day.activities, ...dayActivities.map((item) => item.activity)] }
          : day;
      }),
    }));
  }

  return activities.map((item) => item.activity);
}

export function patchActivity(activityId: string, input: unknown) {
  const location = findActivity(activityId);

  if (!location) {
    return null;
  }

  const payload = parseActivityInput(input);
  const nextActivity: Activity = {
    ...location.activity,
    timeBlock: payload.timeBlock ?? location.activity.timeBlock,
    title: payload.title?.trim() || location.activity.title,
    startTime: payload.startTime ?? location.activity.startTime,
    endTime: payload.endTime ?? location.activity.endTime,
    locationName: payload.locationName ?? location.activity.locationName,
    address: payload.address ?? location.activity.address,
    estimatedCost: Math.max(0, payload.estimatedCost ?? location.activity.estimatedCost),
    notes: payload.notes ?? location.activity.notes,
  };

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    itineraryDays: trip.itineraryDays.map((day) =>
      day.id === location.day.id
        ? {
            ...day,
            activities: day.activities.map((activity) =>
              activity.id === activityId ? nextActivity : activity,
            ),
          }
        : day,
    ),
  }));

  return nextActivity;
}

export function deleteActivity(activityId: string) {
  const location = findActivity(activityId);

  if (!location) {
    return false;
  }

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    itineraryDays: trip.itineraryDays.map((day) =>
      day.id === location.day.id
        ? { ...day, activities: day.activities.filter((activity) => activity.id !== activityId) }
        : day,
    ),
  }));

  return true;
}

export function reorderActivities(dayId: string, input: unknown) {
  const location = findDay(dayId);

  if (!location || !isRecord(input) || !Array.isArray(input.activityIds)) {
    return null;
  }

  const order = new Map(input.activityIds.map((activityId, index) => [String(activityId), index]));
  const nextDay = {
    ...location.day,
    activities: location.day.activities.map((activity) =>
      order.has(activity.id) ? { ...activity, sortOrder: order.get(activity.id) ?? activity.sortOrder } : activity,
    ),
  };

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    itineraryDays: trip.itineraryDays.map((day) => (day.id === dayId ? nextDay : day)),
  }));

  return nextDay.activities;
}

export function listCosts(tripId: string) {
  return getTrip(tripId)?.costItems ?? null;
}

export function addCost(tripId: string, input: unknown) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = parseCostInput(input);

  if (!payload.name?.trim()) {
    throw new Error("Cost name is required.");
  }

  const costItem: CostItem = {
    id: createId("cost"),
    tripId,
    category: payload.category ?? "other",
    name: payload.name.trim(),
    amount: Math.max(0, payload.amount ?? 0),
    quantity: Math.max(1, payload.quantity ?? 1),
    notes: payload.notes ?? "",
  };

  mutateTrip(tripId, (currentTrip) => ({
    ...currentTrip,
    costItems: [...currentTrip.costItems, costItem],
  }));

  return costItem;
}

export function patchCost(costId: string, input: unknown) {
  const location = findCost(costId);

  if (!location) {
    return null;
  }

  const payload = parseCostInput(input);
  const nextItem: CostItem = {
    ...location.costItem,
    category: payload.category ?? location.costItem.category,
    name: payload.name?.trim() || location.costItem.name,
    amount: Math.max(0, payload.amount ?? location.costItem.amount),
    quantity: Math.max(1, payload.quantity ?? location.costItem.quantity),
    notes: payload.notes ?? location.costItem.notes,
  };

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    costItems: trip.costItems.map((item) => (item.id === costId ? nextItem : item)),
  }));

  return nextItem;
}

export function deleteCost(costId: string) {
  const location = findCost(costId);

  if (!location) {
    return false;
  }

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    costItems: trip.costItems.filter((item) => item.id !== costId),
  }));

  return true;
}

export function getCostSummary(tripId: string) {
  const trip = getTrip(tripId);
  return trip ? calculateCostSummary(trip) : null;
}

export function listChecklist(tripId: string) {
  return getTrip(tripId)?.checklistItems ?? null;
}

export function addChecklistItem(tripId: string, input: unknown) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = parseChecklistInput(input);

  if (!payload.title?.trim()) {
    throw new Error("Checklist title is required.");
  }

  const item: ChecklistItem = {
    id: createId("check"),
    tripId,
    title: payload.title.trim(),
    isDone: payload.isDone ?? false,
    category: payload.category ?? "Tự tạo",
    sortOrder: trip.checklistItems.length,
  };

  mutateTrip(tripId, (currentTrip) => ({
    ...currentTrip,
    checklistItems: [...currentTrip.checklistItems, item],
  }));

  return item;
}

export function patchChecklistItem(itemId: string, input: unknown) {
  const location = findChecklistItem(itemId);

  if (!location) {
    return null;
  }

  const payload = parseChecklistInput(input);
  const nextItem: ChecklistItem = {
    ...location.checklistItem,
    title: payload.title?.trim() || location.checklistItem.title,
    isDone: payload.isDone ?? location.checklistItem.isDone,
    category: payload.category ?? location.checklistItem.category,
  };

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    checklistItems: trip.checklistItems.map((item) => (item.id === itemId ? nextItem : item)),
  }));

  return nextItem;
}

export function deleteChecklistItem(itemId: string) {
  const location = findChecklistItem(itemId);

  if (!location) {
    return false;
  }

  mutateTrip(location.trip.id, (trip) => ({
    ...trip,
    checklistItems: trip.checklistItems.filter((item) => item.id !== itemId),
  }));

  return true;
}

export function enableShare(tripId: string) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const share = trip.share ?? {
    token: makeShareToken(),
    isEnabled: true,
  };

  const nextShare = {
    ...share,
    isEnabled: true,
  };

  mutateTrip(tripId, (currentTrip) => ({ ...currentTrip, share: nextShare }));
  return nextShare;
}

export function patchShare(tripId: string, input: unknown) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = isRecord(input) ? input : {};
  const share = trip.share ?? {
    token: makeShareToken(),
    isEnabled: true,
  };
  const nextShare = {
    ...share,
    isEnabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : share.isEnabled,
  };

  mutateTrip(tripId, (currentTrip) => ({ ...currentTrip, share: nextShare }));
  return nextShare;
}

export function getSharedTrip(shareToken: string) {
  return store.trips.find((trip) => trip.share?.token === shareToken && trip.share.isEnabled) ?? null;
}

function mutateTrip(tripId: string, updater: (trip: Trip) => Trip) {
  const trip = getTrip(tripId);

  if (!trip) {
    return null;
  }

  const nextTrip = {
    ...updater(trip),
    updatedAt: new Date().toISOString(),
  };

  replaceTrip(nextTrip);
  return nextTrip;
}

function replaceTrip(nextTrip: Trip) {
  store.trips = store.trips.map((trip) => (trip.id === nextTrip.id ? nextTrip : trip));
}

function parseTripDraft(input: unknown): TripDraft {
  const payload = isRecord(input) ? input : {};

  return {
    title: toStringValue(payload.title, ""),
    destination: toStringValue(payload.destination, ""),
    startDate: toStringValue(payload.startDate, new Date().toISOString().slice(0, 10)),
    endDate: toStringValue(payload.endDate, new Date().toISOString().slice(0, 10)),
    adultCount: Math.max(1, toNumber(payload.adultCount, 1)),
    childCount: Math.max(0, toNumber(payload.childCount, 0)),
    budgetAmount: Math.max(0, toNumber(payload.budgetAmount, 0)),
    travelStyles: parseTravelStyles(payload.travelStyles, []),
    notes: toStringValue(payload.notes, ""),
  };
}

function parseTravelStyles(input: unknown, fallback: TravelStyle[]) {
  const validStyles = new Set(travelStyles.map((style) => style.value));

  if (!Array.isArray(input)) {
    return fallback;
  }

  return input.filter((style): style is TravelStyle => validStyles.has(style as TravelStyle));
}

function parseActivityInput(input: unknown): ActivityInput {
  const payload = isRecord(input) ? input : {};
  const validBlocks = new Set(timeBlocks.map((block) => block.value));
  const timeBlock = validBlocks.has(payload.timeBlock as TimeBlock)
    ? (payload.timeBlock as TimeBlock)
    : undefined;

  return {
    timeBlock,
    title: toStringValue(payload.title, undefined),
    startTime: toStringValue(payload.startTime, undefined),
    endTime: toStringValue(payload.endTime, undefined),
    locationName: toStringValue(payload.locationName, undefined),
    address: toStringValue(payload.address, undefined),
    estimatedCost: typeof payload.estimatedCost === "undefined" ? undefined : toNumber(payload.estimatedCost),
    notes: toStringValue(payload.notes, undefined),
  };
}

function parseCostInput(input: unknown): CostInput {
  const payload = isRecord(input) ? input : {};
  const validCategories = new Set(costCategories.map((category) => category.value));
  const category = validCategories.has(payload.category as CostCategory)
    ? (payload.category as CostCategory)
    : undefined;

  return {
    category,
    name: toStringValue(payload.name, undefined),
    amount: typeof payload.amount === "undefined" ? undefined : toNumber(payload.amount),
    quantity: typeof payload.quantity === "undefined" ? undefined : toNumber(payload.quantity),
    notes: toStringValue(payload.notes, undefined),
  };
}

function parseChecklistInput(input: unknown): ChecklistInput {
  const payload = isRecord(input) ? input : {};

  return {
    title: toStringValue(payload.title, undefined),
    isDone: typeof payload.isDone === "boolean" ? payload.isDone : undefined,
    category: toStringValue(payload.category, undefined),
  };
}

function createActivity(dayId: string, payload: ActivityInput, timeBlock: TimeBlock, sortOrder: number): Activity {
  return {
    id: createId("activity"),
    itineraryDayId: dayId,
    timeBlock,
    title: payload.title?.trim() ?? "",
    startTime: payload.startTime ?? "",
    endTime: payload.endTime ?? "",
    locationName: payload.locationName ?? "",
    address: payload.address ?? "",
    estimatedCost: Math.max(0, payload.estimatedCost ?? 0),
    notes: payload.notes ?? "",
    sortOrder,
  };
}

function groupActivitiesByTrip(
  activities: Array<{ tripId: string; dayId: string; activity: Activity }>,
) {
  const groups = new Map<string, Array<{ dayId: string; activity: Activity }>>();

  for (const item of activities) {
    groups.set(item.tripId, [...(groups.get(item.tripId) ?? []), { dayId: item.dayId, activity: item.activity }]);
  }

  return Array.from(groups, ([tripId, groupActivities]) => ({ tripId, activities: groupActivities }));
}

function findDay(dayId: string) {
  for (const trip of store.trips) {
    const day = trip.itineraryDays.find((item) => item.id === dayId);

    if (day) {
      return { trip, day };
    }
  }

  return null;
}

function findActivity(activityId: string) {
  for (const trip of store.trips) {
    for (const day of trip.itineraryDays) {
      const activity = day.activities.find((item) => item.id === activityId);

      if (activity) {
        return { trip, day, activity };
      }
    }
  }

  return null;
}

function findCost(costId: string) {
  for (const trip of store.trips) {
    const costItem = trip.costItems.find((item) => item.id === costId);

    if (costItem) {
      return { trip, costItem };
    }
  }

  return null;
}

function findChecklistItem(itemId: string) {
  for (const trip of store.trips) {
    const checklistItem = trip.checklistItems.find((item) => item.id === itemId);

    if (checklistItem) {
      return { trip, checklistItem };
    }
  }

  return null;
}

function mergeItineraryDaysByDate(trip: Trip, startDate: string, endDate: string) {
  const existingByDate = new Map(trip.itineraryDays.map((day) => [day.date, day]));

  return createItineraryDays(trip.id, startDate, endDate).map((day) => {
    const existing = existingByDate.get(day.date);
    return existing ? { ...existing, dayNumber: day.dayNumber, title: day.title } : day;
  });
}
