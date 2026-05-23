import type { CurrentUser } from "./api.ts";
import { travelApi } from "./api.ts";
import type { Trip } from "./travel.ts";
import type { TripTemplate } from "./trip-templates.ts";

export type TemplateSummary = Omit<TripTemplate, "days" | "costItems" | "checklistItems"> & {
  dayCount: number;
};

export type TravelPlannerData = {
  user: CurrentUser | null;
  templates: TemplateSummary[];
  trips: Trip[];
};

type TravelPlannerDataClient = {
  getCurrentUser: () => Promise<CurrentUser | null>;
  listTemplates: () => Promise<TemplateSummary[]>;
  listTrips: () => Promise<Trip[]>;
};

export async function loadTravelPlannerData(
  client: TravelPlannerDataClient = travelApi,
): Promise<TravelPlannerData> {
  const [user, templates] = await Promise.all([client.getCurrentUser(), client.listTemplates()]);

  if (!user) {
    return {
      user: null,
      templates,
      trips: [],
    };
  }

  return {
    user,
    templates,
    trips: await client.listTrips(),
  };
}
