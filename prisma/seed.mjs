import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // Seed can also run in hosted environments where DATABASE_URL is already set.
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const devUser = {
  id: "dev-user",
  name: "Demo Traveler",
  email: "demo@travel-planner.local",
};

const tripId = "trip_seed_da_nang";
const dayId = "day_seed_da_nang_1";

await prisma.$transaction(async (tx) => {
  await tx.user.upsert({
    where: { id: devUser.id },
    update: {
      name: devUser.name,
      email: devUser.email,
    },
    create: devUser,
  });

  await tx.trip.upsert({
    where: { id: tripId },
    update: {
      title: "Da Nang family trip",
      destination: "Da Nang, Vietnam",
      budgetAmount: 25000000,
      travelStyle: ["FAMILY", "FOOD", "BUDGET"],
      notes: "Seed trip for local development.",
      userId: devUser.id,
    },
    create: {
      id: tripId,
      title: "Da Nang family trip",
      destination: "Da Nang, Vietnam",
      startDate: new Date("2026-08-10T00:00:00.000Z"),
      endDate: new Date("2026-08-13T00:00:00.000Z"),
      adultCount: 2,
      childCount: 1,
      budgetAmount: 25000000,
      currency: "VND",
      travelStyle: ["FAMILY", "FOOD", "BUDGET"],
      notes: "Seed trip for local development.",
      userId: devUser.id,
      itineraryDays: {
        create: [
          {
            id: dayId,
            dayNumber: 1,
            date: new Date("2026-08-10T00:00:00.000Z"),
            title: "Day 1",
            activities: {
              create: [
                {
                  id: "activity_seed_da_nang_1",
                  timeBlock: "AFTERNOON",
                  title: "Hotel check-in",
                  startTime: new Date("1970-01-01T15:00:00.000Z"),
                  endTime: new Date("1970-01-01T16:00:00.000Z"),
                  locationName: "My Khe Beach",
                  address: "Da Nang",
                  estimatedCost: 0,
                  notes: "Use this as a starter itinerary item.",
                  sortOrder: 0,
                },
              ],
            },
          },
        ],
      },
      checklistItems: {
        create: [
          {
            id: "check_seed_da_nang_1",
            title: "Passport or ID",
            category: "Preparation",
            sortOrder: 0,
          },
          {
            id: "check_seed_da_nang_2",
            title: "Hotel booking",
            category: "Preparation",
            sortOrder: 1,
          },
        ],
      },
      costItems: {
        create: [
          {
            id: "cost_seed_da_nang_1",
            category: "HOTEL",
            name: "Hotel estimate",
            amount: 6000000,
            quantity: 1,
            notes: "Starter estimate.",
          },
        ],
      },
    },
  });
});

await prisma.$disconnect();
