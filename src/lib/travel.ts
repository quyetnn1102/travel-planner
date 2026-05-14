export const TRAVEL_APP_STORAGE_KEY = "travel-planner-mvp-v2";

export const travelStyles = [
  { value: "resort", label: "Nghỉ dưỡng" },
  { value: "food", label: "Ẩm thực" },
  { value: "shopping", label: "Mua sắm" },
  { value: "check-in", label: "Check-in" },
  { value: "family", label: "Gia đình" },
  { value: "budget", label: "Tiết kiệm" },
  { value: "luxury", label: "Sang trọng" },
] as const;

export const timeBlocks = [
  { value: "morning", label: "Sáng" },
  { value: "noon", label: "Trưa" },
  { value: "afternoon", label: "Chiều" },
  { value: "evening", label: "Tối" },
] as const;

export const costCategories = [
  { value: "flight", label: "Vé máy bay / phương tiện chính" },
  { value: "hotel", label: "Khách sạn" },
  { value: "food", label: "Ăn uống" },
  { value: "local-transport", label: "Di chuyển nội địa" },
  { value: "ticket", label: "Vé tham quan" },
  { value: "shopping", label: "Mua sắm" },
  { value: "other", label: "Chi phí khác" },
] as const;

export type TravelStyle = (typeof travelStyles)[number]["value"];
export type TimeBlock = (typeof timeBlocks)[number]["value"];
export type CostCategory = (typeof costCategories)[number]["value"];

export type Activity = {
  id: string;
  itineraryDayId: string;
  timeBlock: TimeBlock;
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  estimatedCost: number;
  notes: string;
  sortOrder: number;
};

export type ItineraryDay = {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  title: string;
  activities: Activity[];
};

export type CostItem = {
  id: string;
  tripId: string;
  category: CostCategory;
  name: string;
  amount: number;
  quantity: number;
  notes: string;
};

export type ChecklistItem = {
  id: string;
  tripId: string;
  title: string;
  isDone: boolean;
  category: string;
  sortOrder: number;
};

export type TripShare = {
  token: string;
  isEnabled: boolean;
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  budgetAmount: number;
  currency: "VND";
  travelStyles: TravelStyle[];
  notes: string;
  itineraryDays: ItineraryDay[];
  costItems: CostItem[];
  checklistItems: ChecklistItem[];
  share: TripShare | null;
  updatedAt: string;
};

export type TripDraft = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  budgetAmount: number;
  travelStyles: TravelStyle[];
  notes: string;
};

export type CostSummary = {
  total: number;
  travelerCount: number;
  perPerson: number;
  budgetDelta: number;
  isOverBudget: boolean;
};

const defaultChecklistTitles = [
  "Hộ chiếu / căn cước",
  "Visa nếu cần",
  "Vé máy bay / vé tàu",
  "Booking khách sạn",
  "Bảo hiểm du lịch",
  "SIM / eSIM / roaming",
  "Đổi tiền",
  "Thuốc cá nhân",
  "Sạc điện thoại / pin dự phòng",
  "Quần áo phù hợp thời tiết",
];

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addDays(dateString: string, days: number) {
  const { year, monthIndex, day } = parseDateParts(dateString);
  const date = new Date(Date.UTC(year, monthIndex, day + days));
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

export function getTripDuration(startDate: string, endDate: string) {
  const start = parseDateUtc(startDate);
  const end = parseDateUtc(endDate);
  const diff = end - start;
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

export function createItineraryDays(tripId: string, startDate: string, endDate: string) {
  const duration = getTripDuration(startDate, endDate);

  return Array.from({ length: duration }, (_, index): ItineraryDay => {
    const dayNumber = index + 1;

    return {
      id: createId("day"),
      tripId,
      dayNumber,
      date: addDays(startDate, index),
      title: `Ngày ${dayNumber}`,
      activities: [],
    };
  });
}

export function createDefaultChecklist(tripId: string) {
  return defaultChecklistTitles.map(
    (title, index): ChecklistItem => ({
      id: createId("check"),
      tripId,
      title,
      isDone: false,
      category: "Chuẩn bị",
      sortOrder: index,
    }),
  );
}

export function createTripFromDraft(draft: TripDraft): Trip {
  const tripId = createId("trip");
  const startDate = draft.startDate;
  const endDate = draft.endDate < draft.startDate ? draft.startDate : draft.endDate;

  return {
    id: tripId,
    title: draft.title.trim() || "Chuyến đi mới",
    destination: draft.destination.trim() || "Chưa chọn điểm đến",
    startDate,
    endDate,
    adultCount: Math.max(1, draft.adultCount),
    childCount: Math.max(0, draft.childCount),
    budgetAmount: Math.max(0, draft.budgetAmount),
    currency: "VND",
    travelStyles: draft.travelStyles,
    notes: draft.notes.trim(),
    itineraryDays: createItineraryDays(tripId, startDate, endDate),
    costItems: [],
    checklistItems: createDefaultChecklist(tripId),
    share: null,
    updatedAt: new Date().toISOString(),
  };
}

export function calculateCostSummary(trip: Trip): CostSummary {
  const total = trip.costItems.reduce(
    (sum, item) => sum + item.amount * Math.max(1, item.quantity),
    0,
  );
  const travelerCount = Math.max(1, trip.adultCount + trip.childCount);
  const perPerson = Math.round(total / travelerCount);
  const budgetDelta = trip.budgetAmount - total;

  return {
    total,
    travelerCount,
    perPerson,
    budgetDelta,
    isOverBudget: budgetDelta < 0,
  };
}

export function formatCurrency(amount: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string) {
  const date = new Date(parseDateUtc(dateString));
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${weekdays[date.getUTCDay()]}, ${day}/${month}/${date.getUTCFullYear()}`;
}

function parseDateParts(dateString: string) {
  const [year = 1970, month = 1, day = 1] = dateString.split("-").map(Number);

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

function parseDateUtc(dateString: string) {
  const { year, monthIndex, day } = parseDateParts(dateString);

  return Date.UTC(year, monthIndex, day);
}

export function makeShareToken() {
  const first = createId("share").replace("share_", "");
  const second = Math.random().toString(36).slice(2, 14);
  return `${first}${second}`.replaceAll("-", "");
}

const tokyoTripId = "trip_tokyo_seed";
const seoulTripId = "trip_seoul_seed";

export const seedTrips: Trip[] = [
  {
    id: tokyoTripId,
    title: "Tokyo gia đình 6N5Đ",
    destination: "Tokyo, Nhật Bản",
    startDate: "2026-10-15",
    endDate: "2026-10-20",
    adultCount: 2,
    childCount: 1,
    budgetAmount: 60_000_000,
    currency: "VND",
    travelStyles: ["family", "food", "shopping"],
    notes: "Ưu tiên lịch trình nhẹ, gần ga tàu và có một ngày Disneyland.",
    itineraryDays: [
      {
        id: "day_tokyo_1",
        tripId: tokyoTripId,
        dayNumber: 1,
        date: "2026-10-15",
        title: "Ngày 1",
        activities: [
          {
            id: "activity_tokyo_1",
            itineraryDayId: "day_tokyo_1",
            timeBlock: "afternoon",
            title: "Nhận phòng ở Shinjuku",
            startTime: "15:00",
            endTime: "16:00",
            locationName: "Shinjuku",
            address: "Khu vực gần ga Shinjuku",
            estimatedCost: 0,
            notes: "Kiểm tra hành lý, mua thẻ IC nếu cần.",
            sortOrder: 0,
          },
          {
            id: "activity_tokyo_2",
            itineraryDayId: "day_tokyo_1",
            timeBlock: "evening",
            title: "Ăn tối và đi dạo Omoide Yokocho",
            startTime: "18:30",
            endTime: "20:30",
            locationName: "Omoide Yokocho",
            address: "Shinjuku",
            estimatedCost: 1_200_000,
            notes: "Chọn quán phù hợp trẻ em, tránh khung giờ quá đông.",
            sortOrder: 0,
          },
        ],
      },
      ...createItineraryDays(tokyoTripId, "2026-10-16", "2026-10-20").map((day, index) => ({
        ...day,
        id: `day_tokyo_${index + 2}`,
        dayNumber: index + 2,
        title: `Ngày ${index + 2}`,
      })),
    ],
    costItems: [
      {
        id: "cost_tokyo_1",
        tripId: tokyoTripId,
        category: "flight",
        name: "Vé máy bay khứ hồi",
        amount: 22_000_000,
        quantity: 1,
        notes: "Giá cho cả gia đình.",
      },
      {
        id: "cost_tokyo_2",
        tripId: tokyoTripId,
        category: "hotel",
        name: "Khách sạn Shinjuku 5 đêm",
        amount: 18_500_000,
        quantity: 1,
        notes: "Phòng gia đình gần ga.",
      },
    ],
    checklistItems: createDefaultChecklist(tokyoTripId).map((item, index) => ({
      ...item,
      isDone: index < 3,
    })),
    share: {
      token: "tokyo-family-demo",
      isEnabled: true,
    },
    updatedAt: "2026-05-13T00:00:00.000Z",
  },
  {
    id: seoulTripId,
    title: "Seoul mùa thu 5N4Đ",
    destination: "Seoul, Hàn Quốc",
    startDate: "2026-11-03",
    endDate: "2026-11-07",
    adultCount: 4,
    childCount: 0,
    budgetAmount: 48_000_000,
    currency: "VND",
    travelStyles: ["check-in", "food", "budget"],
    notes: "Nhóm bạn ưu tiên ăn uống, shopping và các điểm dễ đi tàu điện.",
    itineraryDays: createItineraryDays(seoulTripId, "2026-11-03", "2026-11-07"),
    costItems: [],
    checklistItems: createDefaultChecklist(seoulTripId),
    share: null,
    updatedAt: "2026-05-13T00:00:00.000Z",
  },
];
