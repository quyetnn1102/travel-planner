import {
  Activity,
  ChecklistItem,
  CostCategory as AppCostCategory,
  CostItem,
  ItineraryDay,
  TimeBlock as AppTimeBlock,
  TravelStyle as AppTravelStyle,
  Trip,
  TripDraft,
  calculateCostSummary,
  costCategories,
  createDefaultChecklist,
  createId,
  createItineraryDays,
  createTripFromDraft,
  makeShareToken,
  timeBlocks,
  travelStyles,
} from "@/lib/travel";
import {
  CostCategory as DbCostCategoryEnum,
  TimeBlock as DbTimeBlockEnum,
  TravelStyle as DbTravelStyleEnum,
} from "@prisma/client";
import { isRecord, toNumber, toStringValue } from "@/server/api-response";
import type { CurrentUser } from "@/server/auth";
import { requireCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";

type DbActivity = {
  id: string;
  itineraryDayId: string;
  timeBlock: DbTimeBlockEnum;
  title: string;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  address: string | null;
  estimatedCost: unknown;
  notes: string | null;
  sortOrder: number;
};

type DbItineraryDay = {
  id: string;
  tripId: string;
  dayNumber: number;
  date: Date;
  title: string | null;
  activities: DbActivity[];
};

type DbCostItem = {
  id: string;
  tripId: string;
  category: DbCostCategoryEnum;
  name: string;
  amount: unknown;
  quantity: number;
  notes: string | null;
};

type DbChecklistItem = {
  id: string;
  tripId: string;
  title: string;
  isDone: boolean;
  category: string | null;
  sortOrder: number;
};

type DbTripShare = {
  shareToken: string;
  isEnabled: boolean;
};

type DbTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  adultCount: number;
  childCount: number;
  budgetAmount: unknown;
  currency: string;
  travelStyle: DbTravelStyleEnum[];
  notes: string | null;
  updatedAt: Date;
  itineraryDays: DbItineraryDay[];
  costItems: DbCostItem[];
  checklistItems: DbChecklistItem[];
  share: DbTripShare | null;
};

type ActivityInput = {
  timeBlock?: AppTimeBlock;
  title?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  address?: string;
  estimatedCost?: number;
  notes?: string;
};

type CostInput = {
  category?: AppCostCategory;
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

const tripInclude = {
  itineraryDays: {
    include: {
      activities: {
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
    },
    orderBy: { dayNumber: "asc" as const },
  },
  costItems: {
    orderBy: { createdAt: "asc" as const },
  },
  checklistItems: {
    orderBy: { sortOrder: "asc" as const },
  },
  share: true,
};

const styleToDb: Record<AppTravelStyle, DbTravelStyleEnum> = {
  resort: "RESORT",
  food: "FOOD",
  shopping: "SHOPPING",
  "check-in": "CHECK_IN",
  family: "FAMILY",
  budget: "BUDGET",
  luxury: "LUXURY",
};

const styleFromDb: Record<DbTravelStyleEnum, AppTravelStyle> = {
  RESORT: "resort",
  FOOD: "food",
  SHOPPING: "shopping",
  CHECK_IN: "check-in",
  FAMILY: "family",
  BUDGET: "budget",
  LUXURY: "luxury",
};

const timeBlockToDb: Record<AppTimeBlock, DbTimeBlockEnum> = {
  morning: "MORNING",
  noon: "NOON",
  afternoon: "AFTERNOON",
  evening: "EVENING",
};

const timeBlockFromDb: Record<DbTimeBlockEnum, AppTimeBlock> = {
  MORNING: "morning",
  NOON: "noon",
  AFTERNOON: "afternoon",
  EVENING: "evening",
};

const costCategoryToDb: Record<AppCostCategory, DbCostCategoryEnum> = {
  flight: "FLIGHT",
  hotel: "HOTEL",
  food: "FOOD",
  "local-transport": "LOCAL_TRANSPORT",
  ticket: "TICKET",
  shopping: "SHOPPING",
  other: "OTHER",
};

const costCategoryFromDb: Record<DbCostCategoryEnum, AppCostCategory> = {
  FLIGHT: "flight",
  HOTEL: "hotel",
  FOOD: "food",
  LOCAL_TRANSPORT: "local-transport",
  TICKET: "ticket",
  SHOPPING: "shopping",
  OTHER: "other",
};

export async function listTrips() {
  const userId = await getScopedUserId();
  const trips = await prisma.trip.findMany({
    where: { userId },
    include: tripInclude,
    orderBy: { updatedAt: "desc" },
  });

  return trips.map(mapTrip);
}

export async function getTrip(tripId: string) {
  const userId = await getScopedUserId();
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: tripInclude,
  });

  return trip ? mapTrip(trip) : null;
}

export async function createTrip(input: unknown) {
  const userId = await getScopedUserId();
  const draft = parseTripDraft(input);
  const trip = createTripFromDraft(draft);
  const created = await prisma.trip.create({
    data: tripCreateData(trip, userId),
    include: tripInclude,
  });

  return mapTrip(created);
}

export async function updateTrip(tripId: string, input: unknown) {
  const trip = await getTrip(tripId);

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

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: {
        title: nextTrip.title,
        destination: nextTrip.destination,
        startDate: toDate(nextTrip.startDate),
        endDate: toDate(nextTrip.endDate),
        adultCount: nextTrip.adultCount,
        childCount: nextTrip.childCount,
        budgetAmount: nextTrip.budgetAmount,
        travelStyle: nextTrip.travelStyles.map((style) => styleToDb[style]),
        notes: nextTrip.notes,
      },
    });

    if (shouldRebuildDays) {
      const dayIds = nextTrip.itineraryDays.map((day) => day.id);
      await tx.itineraryDay.deleteMany({
        where: {
          tripId,
          id: { notIn: dayIds },
        },
      });

      for (const day of nextTrip.itineraryDays) {
        await tx.itineraryDay.upsert({
          where: { id: day.id },
          update: {
            dayNumber: day.dayNumber,
            date: toDate(day.date),
            title: day.title,
          },
          create: {
            id: day.id,
            tripId,
            dayNumber: day.dayNumber,
            date: toDate(day.date),
            title: day.title,
          },
        });
      }
    }
  });

  return getTrip(tripId);
}

export async function deleteTrip(tripId: string) {
  const userId = await getScopedUserId();
  const deleted = await prisma.trip.deleteMany({
    where: { id: tripId, userId },
  });

  return deleted.count > 0;
}

export async function getItinerary(tripId: string) {
  return (await getTrip(tripId))?.itineraryDays ?? null;
}

export async function addActivity(dayId: string, input: unknown) {
  const userId = await getScopedUserId();
  const day = await prisma.itineraryDay.findFirst({
    where: { id: dayId, trip: { userId } },
  });

  if (!day) {
    return null;
  }

  const payload = parseActivityInput(input);

  if (!payload.title?.trim()) {
    throw new Error("Activity title is required.");
  }

  const timeBlock = payload.timeBlock ?? "morning";
  const sortOrder = await prisma.activity.count({
    where: { itineraryDayId: dayId, timeBlock: timeBlockToDb[timeBlock] },
  });
  const activity = await prisma.activity.create({
    data: {
      id: createId("activity"),
      itineraryDayId: dayId,
      timeBlock: timeBlockToDb[timeBlock],
      title: payload.title.trim(),
      startTime: toTime(payload.startTime),
      endTime: toTime(payload.endTime),
      locationName: payload.locationName ?? "",
      address: payload.address ?? "",
      estimatedCost: Math.max(0, payload.estimatedCost ?? 0),
      notes: payload.notes ?? "",
      sortOrder,
    },
  });

  await touchTrip(day.tripId);
  return mapActivity(activity);
}

export async function addActivitiesToDays(items: Array<{ dayId: string; input: unknown }>) {
  if (items.length === 0) {
    return [];
  }

  const userId = await getScopedUserId();
  const dayIds = Array.from(new Set(items.map((item) => item.dayId)));
  const days = await prisma.itineraryDay.findMany({
    where: { id: { in: dayIds }, trip: { userId } },
  });
  const daysById = new Map(days.map((day) => [day.id, day]));

  if (daysById.size !== dayIds.length) {
    return null;
  }

  const payloads = items.map((item) => {
    const payload = parseActivityInput(item.input);

    if (!payload.title?.trim()) {
      throw new Error("Activity title is required.");
    }

    return {
      day: daysById.get(item.dayId),
      payload,
      timeBlock: payload.timeBlock ?? "morning",
    };
  });

  const existingActivities = await prisma.activity.findMany({
    where: { itineraryDayId: { in: dayIds } },
    select: { itineraryDayId: true, timeBlock: true },
  });
  const sortOrders = new Map<string, number>();

  for (const activity of existingActivities) {
    const sortKey = `${activity.itineraryDayId}:${activity.timeBlock}`;
    sortOrders.set(sortKey, (sortOrders.get(sortKey) ?? 0) + 1);
  }

  const createItems = payloads.map((item) => {
    if (!item.day) {
      throw new Error("Itinerary day not found.");
    }

    const dbTimeBlock = timeBlockToDb[item.timeBlock];
    const sortKey = `${item.day.id}:${dbTimeBlock}`;
    const sortOrder = sortOrders.get(sortKey) ?? 0;
    sortOrders.set(sortKey, sortOrder + 1);

    return {
      day: item.day,
      data: {
        id: createId("activity"),
        itineraryDayId: item.day.id,
        timeBlock: dbTimeBlock,
        title: item.payload.title?.trim() ?? "",
        startTime: toTime(item.payload.startTime),
        endTime: toTime(item.payload.endTime),
        locationName: item.payload.locationName ?? "",
        address: item.payload.address ?? "",
        estimatedCost: Math.max(0, item.payload.estimatedCost ?? 0),
        notes: item.payload.notes ?? "",
        sortOrder,
      },
    };
  });

  const created = await prisma.$transaction(async (tx) => {
    const activities = [];

    for (const item of createItems) {
      activities.push(await tx.activity.create({ data: item.data }));
    }

    for (const tripId of new Set(createItems.map((item) => item.day.tripId))) {
      await tx.trip.update({
        where: { id: tripId },
        data: { updatedAt: new Date() },
      });
    }

    return activities;
  });

  return created.map(mapActivity);
}

export async function patchActivity(activityId: string, input: unknown) {
  const userId = await getScopedUserId();
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, itineraryDay: { trip: { userId } } },
    include: { itineraryDay: true },
  });

  if (!activity) {
    return null;
  }

  const payload = parseActivityInput(input);
  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      timeBlock: timeBlockToDb[payload.timeBlock ?? timeBlockFromDb[activity.timeBlock]],
      title: payload.title?.trim() || activity.title,
      startTime: typeof payload.startTime === "undefined" ? activity.startTime : toTime(payload.startTime),
      endTime: typeof payload.endTime === "undefined" ? activity.endTime : toTime(payload.endTime),
      locationName: payload.locationName ?? activity.locationName,
      address: payload.address ?? activity.address,
      estimatedCost: Math.max(0, payload.estimatedCost ?? Number(activity.estimatedCost)),
      notes: payload.notes ?? activity.notes,
    },
  });

  await touchTrip(activity.itineraryDay.tripId);
  return mapActivity(updated);
}

export async function deleteActivity(activityId: string) {
  const userId = await getScopedUserId();
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, itineraryDay: { trip: { userId } } },
    include: { itineraryDay: true },
  });

  if (!activity) {
    return false;
  }

  await prisma.activity.delete({ where: { id: activityId } });
  await touchTrip(activity.itineraryDay.tripId);
  return true;
}

export async function reorderActivities(dayId: string, input: unknown) {
  const userId = await getScopedUserId();
  const day = await prisma.itineraryDay.findFirst({
    where: { id: dayId, trip: { userId } },
    include: { activities: true },
  });

  if (!day || !isRecord(input) || !Array.isArray(input.activityIds)) {
    return null;
  }

  const order = new Map(input.activityIds.map((activityId, index) => [String(activityId), index]));
  await prisma.$transaction(
    day.activities
      .filter((activity) => order.has(activity.id))
      .map((activity) =>
        prisma.activity.update({
          where: { id: activity.id },
          data: { sortOrder: order.get(activity.id) ?? activity.sortOrder },
        }),
      ),
  );

  await touchTrip(day.tripId);
  const activities = await prisma.activity.findMany({
    where: { itineraryDayId: dayId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return activities.map(mapActivity);
}

export async function listCosts(tripId: string) {
  return (await getTrip(tripId))?.costItems ?? null;
}

export async function addCost(tripId: string, input: unknown) {
  const trip = await getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = parseCostInput(input);

  if (!payload.name?.trim()) {
    throw new Error("Cost name is required.");
  }

  const cost = await prisma.costItem.create({
    data: {
      id: createId("cost"),
      tripId,
      category: costCategoryToDb[payload.category ?? "other"],
      name: payload.name.trim(),
      amount: Math.max(0, payload.amount ?? 0),
      quantity: Math.max(1, payload.quantity ?? 1),
      notes: payload.notes ?? "",
    },
  });

  await touchTrip(tripId);
  return mapCostItem(cost);
}

export async function patchCost(costId: string, input: unknown) {
  const userId = await getScopedUserId();
  const cost = await prisma.costItem.findFirst({
    where: { id: costId, trip: { userId } },
  });

  if (!cost) {
    return null;
  }

  const payload = parseCostInput(input);
  const updated = await prisma.costItem.update({
    where: { id: costId },
    data: {
      category: costCategoryToDb[payload.category ?? costCategoryFromDb[cost.category]],
      name: payload.name?.trim() || cost.name,
      amount: Math.max(0, payload.amount ?? Number(cost.amount)),
      quantity: Math.max(1, payload.quantity ?? cost.quantity),
      notes: payload.notes ?? cost.notes,
    },
  });

  await touchTrip(cost.tripId);
  return mapCostItem(updated);
}

export async function deleteCost(costId: string) {
  const userId = await getScopedUserId();
  const cost = await prisma.costItem.findFirst({
    where: { id: costId, trip: { userId } },
  });

  if (!cost) {
    return false;
  }

  await prisma.costItem.delete({ where: { id: costId } });
  await touchTrip(cost.tripId);
  return true;
}

export async function getCostSummary(tripId: string) {
  const trip = await getTrip(tripId);
  return trip ? calculateCostSummary(trip) : null;
}

export async function listChecklist(tripId: string) {
  return (await getTrip(tripId))?.checklistItems ?? null;
}

export async function addChecklistItem(tripId: string, input: unknown) {
  const trip = await getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = parseChecklistInput(input);

  if (!payload.title?.trim()) {
    throw new Error("Checklist title is required.");
  }

  const item = await prisma.checklistItem.create({
    data: {
      id: createId("check"),
      tripId,
      title: payload.title.trim(),
      isDone: payload.isDone ?? false,
      category: payload.category ?? "Custom",
      sortOrder: trip.checklistItems.length,
    },
  });

  await touchTrip(tripId);
  return mapChecklistItem(item);
}

export async function patchChecklistItem(itemId: string, input: unknown) {
  const userId = await getScopedUserId();
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, trip: { userId } },
  });

  if (!item) {
    return null;
  }

  const payload = parseChecklistInput(input);
  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      title: payload.title?.trim() || item.title,
      isDone: payload.isDone ?? item.isDone,
      category: payload.category ?? item.category,
    },
  });

  await touchTrip(item.tripId);
  return mapChecklistItem(updated);
}

export async function deleteChecklistItem(itemId: string) {
  const userId = await getScopedUserId();
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, trip: { userId } },
  });

  if (!item) {
    return false;
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });
  await touchTrip(item.tripId);
  return true;
}

export async function enableShare(tripId: string) {
  const trip = await getTrip(tripId);

  if (!trip) {
    return null;
  }

  const existing = await prisma.tripShare.findFirst({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });
  const share = existing
    ? await prisma.tripShare.update({ where: { id: existing.id }, data: { isEnabled: true } })
    : await prisma.tripShare.create({
        data: {
          tripId,
          shareToken: makeShareToken(),
          isEnabled: true,
        },
      });

  await touchTrip(tripId);
  return { token: share.shareToken, isEnabled: share.isEnabled };
}

export async function patchShare(tripId: string, input: unknown) {
  const trip = await getTrip(tripId);

  if (!trip) {
    return null;
  }

  const payload = isRecord(input) ? input : {};
  const existing = await prisma.tripShare.findFirst({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });
  const share = existing
    ? await prisma.tripShare.update({
        where: { id: existing.id },
        data: { isEnabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : existing.isEnabled },
      })
    : await prisma.tripShare.create({
        data: {
          tripId,
          shareToken: makeShareToken(),
          isEnabled: typeof payload.isEnabled === "boolean" ? payload.isEnabled : true,
        },
      });

  await touchTrip(tripId);
  return { token: share.shareToken, isEnabled: share.isEnabled };
}

export async function getSharedTrip(shareToken: string) {
  const share = await prisma.tripShare.findFirst({
    where: {
      shareToken,
      isEnabled: true,
    },
    include: {
      trip: {
        include: tripInclude,
      },
    },
  });

  return share ? mapTrip(share.trip) : null;
}

async function getScopedUserId() {
  const user = await requireCurrentUser();
  await ensureUser(user);
  return user.id;
}

async function ensureUser(user: CurrentUser) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      name: user.name ?? undefined,
      email: user.email ?? undefined,
    },
    create: {
      id: user.id,
      name: user.name ?? "Demo Traveler",
      email: user.email ?? `${user.id}@travel-planner.local`,
    },
  });
}

async function touchTrip(tripId: string) {
  await prisma.trip.update({
    where: { id: tripId },
    data: { updatedAt: new Date() },
  });
}

function tripCreateData(trip: Trip, userId: string) {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: toDate(trip.startDate),
    endDate: toDate(trip.endDate),
    adultCount: trip.adultCount,
    childCount: trip.childCount,
    budgetAmount: trip.budgetAmount,
    currency: "VND",
    travelStyle: trip.travelStyles.map((style) => styleToDb[style]),
    notes: trip.notes,
    userId,
    itineraryDays: {
      create: trip.itineraryDays.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        date: toDate(day.date),
        title: day.title,
      })),
    },
    checklistItems: {
      create: createDefaultChecklist(trip.id).map((item) => ({
        id: item.id,
        title: item.title,
        isDone: item.isDone,
        category: item.category,
        sortOrder: item.sortOrder,
      })),
    },
  };
}

function mapTrip(trip: DbTrip): Trip {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: toDateString(trip.startDate),
    endDate: toDateString(trip.endDate),
    adultCount: trip.adultCount,
    childCount: trip.childCount,
    budgetAmount: Number(trip.budgetAmount),
    currency: "VND",
    travelStyles: trip.travelStyle.map((style) => styleFromDb[style]).filter(Boolean),
    notes: trip.notes ?? "",
    itineraryDays: trip.itineraryDays.map(mapItineraryDay),
    costItems: trip.costItems.map(mapCostItem),
    checklistItems: trip.checklistItems.map(mapChecklistItem),
    share: trip.share ? { token: trip.share.shareToken, isEnabled: trip.share.isEnabled } : null,
    updatedAt: trip.updatedAt.toISOString(),
  };
}

function mapItineraryDay(day: DbItineraryDay): ItineraryDay {
  return {
    id: day.id,
    tripId: day.tripId,
    dayNumber: day.dayNumber,
    date: toDateString(day.date),
    title: day.title ?? `Day ${day.dayNumber}`,
    activities: day.activities.map(mapActivity),
  };
}

function mapActivity(activity: DbActivity): Activity {
  return {
    id: activity.id,
    itineraryDayId: activity.itineraryDayId,
    timeBlock: timeBlockFromDb[activity.timeBlock] ?? "morning",
    title: activity.title,
    startTime: toTimeString(activity.startTime),
    endTime: toTimeString(activity.endTime),
    locationName: activity.locationName ?? "",
    address: activity.address ?? "",
    estimatedCost: Number(activity.estimatedCost ?? 0),
    notes: activity.notes ?? "",
    sortOrder: activity.sortOrder,
  };
}

function mapCostItem(item: DbCostItem): CostItem {
  return {
    id: item.id,
    tripId: item.tripId,
    category: costCategoryFromDb[item.category] ?? "other",
    name: item.name,
    amount: Number(item.amount),
    quantity: item.quantity,
    notes: item.notes ?? "",
  };
}

function mapChecklistItem(item: DbChecklistItem): ChecklistItem {
  return {
    id: item.id,
    tripId: item.tripId,
    title: item.title,
    isDone: item.isDone,
    category: item.category ?? "",
    sortOrder: item.sortOrder,
  };
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

function parseTravelStyles(input: unknown, fallback: AppTravelStyle[]) {
  const validStyles = new Set(travelStyles.map((style) => style.value));

  if (!Array.isArray(input)) {
    return fallback;
  }

  return input.filter((style): style is AppTravelStyle => validStyles.has(style as AppTravelStyle));
}

function parseActivityInput(input: unknown): ActivityInput {
  const payload = isRecord(input) ? input : {};
  const validBlocks = new Set(timeBlocks.map((block) => block.value));
  const timeBlock = validBlocks.has(payload.timeBlock as AppTimeBlock)
    ? (payload.timeBlock as AppTimeBlock)
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
  const category = validCategories.has(payload.category as AppCostCategory)
    ? (payload.category as AppCostCategory)
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

function mergeItineraryDaysByDate(trip: Trip, startDate: string, endDate: string) {
  const existingByDate = new Map(trip.itineraryDays.map((day) => [day.date, day]));

  return createItineraryDays(trip.id, startDate, endDate).map((day) => {
    const existing = existingByDate.get(day.date);
    return existing ? { ...existing, dayNumber: day.dayNumber, title: day.title } : day;
  });
}

function toDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTime(time?: string) {
  return time ? new Date(`1970-01-01T${time}:00.000Z`) : null;
}

function toTimeString(time: Date | null) {
  return time ? time.toISOString().slice(11, 16) : "";
}
