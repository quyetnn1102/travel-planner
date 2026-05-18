import type { CostCategory, TimeBlock, TravelStyle, TripDraft } from "@/lib/travel";

export type TripTemplateActivity = {
  title: string;
  timeBlock: TimeBlock;
  locationName: string;
  estimatedCost: number;
  notes: string;
};

export type TripTemplateDay = {
  dayNumber: number;
  title: string;
  summary: string;
  activities: TripTemplateActivity[];
};

export type TripTemplateCostItem = {
  category: CostCategory;
  name: string;
  amount: number;
  quantity: number;
  notes: string;
};

export type TripTemplateChecklistItem = {
  title: string;
  category: string;
};

export type TripTemplate = {
  id: string;
  title: string;
  destination: string;
  durationDays: number;
  adultCount: number;
  childCount: number;
  budgetAmount: number;
  travelStyles: TravelStyle[];
  summary: string;
  suggestedArea: string;
  coverImageUrl: string;
  days: TripTemplateDay[];
  costItems: TripTemplateCostItem[];
  checklistItems: TripTemplateChecklistItem[];
};

export const tripTemplates: TripTemplate[] = [
  createTemplate("tokyo-family-6d5n", "Tokyo family 6D5N", "Tokyo, Japan", 6, 60_000_000, ["family", "food", "shopping"], "Balanced Tokyo plan for families with a child, including Disneyland, food, and light shopping.", "Ueno, Shinjuku, or Tokyo Station", [
    ["Arrival and easy dinner", "Hotel check-in, neighborhood walk, simple dinner near the station."],
    ["Old Tokyo and skyline", "Asakusa, Nakamise shopping street, Tokyo Skytree area."],
    ["Disney day", "Full day at Tokyo Disneyland or DisneySea."],
    ["Shibuya and Harajuku", "Youth culture, shopping, photo spots, and family-friendly cafes."],
    ["Ueno and shopping", "Park, museum option, Ameyoko shopping, local food."],
    ["Airport return", "Pack, light breakfast, airport transfer."],
  ]),
  createTemplate("seoul-autumn-5d4n", "Seoul autumn 5D4N", "Seoul, South Korea", 5, 42_000_000, ["food", "shopping", "check-in"], "Autumn Seoul plan for food, shopping, palaces, and photo spots.", "Myeongdong or Hongdae", [
    ["Arrival and Myeongdong", "Check in, street food, light shopping."],
    ["Palace day", "Gyeongbokgung, Bukchon Hanok Village, Insadong."],
    ["Hongdae and cafes", "Trendy streets, cafes, local food."],
    ["Starfield and Gangnam", "Library, shopping mall, relaxed dinner."],
    ["Namsan and return", "N Seoul Tower or last shopping before airport."],
  ]),
  createTemplate("singapore-family-4d3n", "Singapore family 4D3N", "Singapore", 4, 48_000_000, ["family", "food"], "Compact Singapore family plan with Sentosa, Marina Bay, and Jewel Changi.", "Bugis, City Hall, or Orchard", [
    ["Arrival and Marina Bay", "Hotel check-in, Merlion, Marina Bay evening walk."],
    ["Gardens and museum", "Gardens by the Bay, ArtScience Museum, hawker dinner."],
    ["Sentosa day", "Universal Studios or SEA Aquarium, beach walk."],
    ["Jewel Changi", "Last shopping, Jewel Changi, airport return."],
  ]),
  createTemplate("bangkok-food-shopping-4d3n", "Bangkok food and shopping 4D3N", "Bangkok, Thailand", 4, 30_000_000, ["food", "shopping", "budget"], "Easy Bangkok trip focused on malls, street food, and markets.", "Siam, Pratunam, or Sukhumvit", [
    ["Arrival and Siam", "Check in, Siam Paragon or CentralWorld, dinner."],
    ["Temple and river", "Grand Palace area, Wat Arun, riverside dinner."],
    ["Shopping day", "Platinum, Big C, night market."],
    ["Cafe and return", "Cafe stop, massage, airport transfer."],
  ]),
  createTemplate("da-nang-hoi-an-4d3n", "Da Nang - Hoi An 4D3N", "Da Nang, Vietnam", 4, 18_000_000, ["resort", "family", "food"], "Relaxed central Vietnam trip with beach time, Hoi An, and local food.", "My Khe Beach or Hoi An Ancient Town", [
    ["Arrival and beach", "Check in, My Khe Beach, seafood dinner."],
    ["Ba Na or Son Tra", "Choose Ba Na Hills or Son Tra Peninsula, evening cafe."],
    ["Hoi An day", "Ancient town, lantern evening, local dishes."],
    ["Relax and return", "Brunch, market stop, airport transfer."],
  ]),
];

export function templateToDraft(template: TripTemplate, startDate: string): TripDraft {
  return {
    title: template.title,
    destination: template.destination,
    startDate,
    endDate: addDays(startDate, template.durationDays - 1),
    adultCount: template.adultCount,
    childCount: template.childCount,
    budgetAmount: template.budgetAmount,
    travelStyles: template.travelStyles,
    notes: template.summary,
  };
}

function createTemplate(
  id: string,
  title: string,
  destination: string,
  durationDays: number,
  budgetAmount: number,
  travelStyles: TravelStyle[],
  summary: string,
  suggestedArea: string,
  daySummaries: Array<[string, string]>,
): TripTemplate {
  return {
    id,
    title,
    destination,
    durationDays,
    adultCount: 2,
    childCount: travelStyles.includes("family") ? 1 : 0,
    budgetAmount,
    travelStyles,
    summary,
    suggestedArea,
    coverImageUrl: "",
    days: daySummaries.map(([dayTitle, daySummary], index) => ({
      dayNumber: index + 1,
      title: dayTitle,
      summary: daySummary,
      activities: [
        {
          title: dayTitle,
          timeBlock: index === 0 ? "afternoon" : "morning",
          locationName: destination,
          estimatedCost: 0,
          notes: daySummary,
        },
      ],
    })),
    costItems: [
      { category: "hotel", name: "Hotel estimate", amount: Math.round(budgetAmount * 0.35), quantity: 1, notes: "Template estimate." },
      { category: "food", name: "Food estimate", amount: Math.round(budgetAmount * 0.2), quantity: 1, notes: "Template estimate." },
      { category: "local-transport", name: "Local transport", amount: Math.round(budgetAmount * 0.1), quantity: 1, notes: "Template estimate." },
    ],
    checklistItems: [
      { title: "Passport / ID", category: "Preparation" },
      { title: "Travel insurance", category: "Preparation" },
      { title: "SIM / eSIM", category: "Connectivity" },
      { title: "Hotel booking", category: "Booking" },
    ],
  };
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
