import type { CostCategory, TimeBlock, TravelStyle } from "@/lib/travel";

export type Locale = "vi" | "en";

export const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export const uiText = {
  vi: {
    navTagline: "Kế hoạch du lịch cho người Việt",
    navItinerary: "Lịch trình",
    navBudget: "Ngân sách",
    navShare: "Chia sẻ",
    heroTitle: "Lập lịch trình du lịch rõ ràng, nhẹ nhàng và dễ chia sẻ",
    heroSubtitle:
      "Tạo chuyến đi theo ngày, gom hoạt động theo buổi, theo dõi ngân sách và checklist chuẩn bị trong một không gian tập trung.",
    quickCreate: "Tạo nhanh",
    createTripTitle: "Tạo chuyến đi mới",
    tripName: "Tên chuyến đi",
    destination: "Điểm đến",
    startDate: "Bắt đầu",
    endDate: "Kết thúc",
    adults: "Người lớn",
    children: "Trẻ em",
    budget: "Ngân sách",
    travelStyle: "Phong cách",
    createItinerary: "Tạo lịch trình",
    yourTrips: "Chuyến đi của bạn",
    plans: "kế hoạch",
    days: "ngày",
    people: "người",
    travelerCount: "Số người",
    time: "Thời gian",
    cost: "Chi phí",
    checklist: "Checklist",
    edit: "Sửa thông tin",
    delete: "Xóa",
    notesEmpty: "Chưa có ghi chú cho chuyến đi này.",
    loadingTitle: "Đang tải kế hoạch",
    loadingBody: "Ứng dụng đang lấy dữ liệu từ API.",
    emptyTitle: "Chưa có chuyến đi",
    emptyBody: "Tạo chuyến đi đầu tiên từ khung tìm kiếm phía trên.",
    syncing: "Đang đồng bộ dữ liệu chuyến đi...",
    saveError: "Không thể lưu thay đổi. Vui lòng thử lại.",
    loadError: "Không thể tải danh sách chuyến đi.",
    tabs: {
      itinerary: "Lịch trình",
      costs: "Chi phí",
      checklist: "Checklist",
      booking: "Đặt dịch vụ",
      share: "Chia sẻ",
    },
    booking: {
      title: "Đặt khách sạn và dịch vụ",
      subtitle:
        "Mở tìm kiếm trên các nền tảng đối tác với điểm đến, ngày đi và số khách của chuyến này. Thêm affiliate ID trong môi trường deploy để bật tracking.",
      configured: "Đã cấu hình tracking",
      notConfigured: "Chưa cấu hình tracking",
      open: "Mở tìm kiếm",
      disclosure: "Bạn sẽ rời khỏi ứng dụng để hoàn tất đặt chỗ trên nền tảng đối tác.",
      hotelSearch: "Tìm khách sạn",
    },
    searchPlaces: "Tìm địa điểm",
    searchPlacesPlaceholder: "Vd: đền chùa, ramen ngon, hoạt động gia đình...",
    searching: "Đang tìm...",
    searchResults: "Kết quả tìm kiếm",
    addToTrip: "Thêm vào chuyến đi",
    noSearchResults: "Không tìm thấy địa điểm phù hợp.",
    previewTitle: "Xem trước chuyến đi",
    previewDestinationAbout: "Về điểm đến",
    previewItinerary: "Lịch trình gợi ý",
    previewGenerating: "AI đang tạo gợi ý...",
    previewConfirm: "Xác nhận tạo chuyến đi",
    previewBack: "Quay lại chỉnh sửa",
    previewEditTitleLabel: "Tên chuyến đi (có thể sửa)",
  },
  en: {
    navTagline: "Travel planning for Vietnamese travelers",
    navItinerary: "Itinerary",
    navBudget: "Budget",
    navShare: "Share",
    heroTitle: "Plan clear, calm, shareable trips",
    heroSubtitle:
      "Create day-by-day plans, organize activities by time block, track budget, and keep preparation checklists in one focused workspace.",
    quickCreate: "Quick create",
    createTripTitle: "Create a new trip",
    tripName: "Trip name",
    destination: "Destination",
    startDate: "Start",
    endDate: "End",
    adults: "Adults",
    children: "Children",
    budget: "Budget",
    travelStyle: "Travel style",
    createItinerary: "Create itinerary",
    yourTrips: "Your trips",
    plans: "plans",
    days: "days",
    people: "people",
    travelerCount: "Travelers",
    time: "Duration",
    cost: "Cost",
    checklist: "Checklist",
    edit: "Edit details",
    delete: "Delete",
    notesEmpty: "No trip notes yet.",
    loadingTitle: "Loading plans",
    loadingBody: "The app is loading trip data from the API.",
    emptyTitle: "No trips yet",
    emptyBody: "Create your first trip from the form above.",
    syncing: "Syncing trip data...",
    saveError: "Could not save changes. Please try again.",
    loadError: "Could not load trips.",
    tabs: {
      itinerary: "Itinerary",
      costs: "Costs",
      checklist: "Checklist",
      booking: "Booking",
      share: "Share",
    },
    booking: {
      title: "Book hotels and services",
      subtitle:
        "Open partner searches with this trip's destination, dates, and travelers. Add affiliate IDs in the deployment environment to enable tracking.",
      configured: "Tracking configured",
      notConfigured: "Tracking not configured",
      open: "Open search",
      disclosure: "You will leave this app to complete booking on the partner platform.",
      hotelSearch: "Hotel search",
    },
    searchPlaces: "Search places",
    searchPlacesPlaceholder: "E.g.: temples, best ramen, family activities...",
    searching: "Searching...",
    searchResults: "Search results",
    addToTrip: "Add to trip",
    noSearchResults: "No matching places found.",
    previewTitle: "Trip preview",
    previewDestinationAbout: "About the destination",
    previewItinerary: "Suggested itinerary",
    previewGenerating: "AI is generating preview...",
    previewConfirm: "Confirm & create trip",
    previewBack: "Back to edit",
    previewEditTitleLabel: "Trip title (editable)",
  },
} as const;

const travelStyleLabels: Record<Locale, Record<TravelStyle, string>> = {
  vi: {
    resort: "Nghỉ dưỡng",
    food: "Ẩm thực",
    shopping: "Mua sắm",
    "check-in": "Check-in",
    family: "Gia đình",
    budget: "Tiết kiệm",
    luxury: "Sang trọng",
  },
  en: {
    resort: "Resort",
    food: "Food",
    shopping: "Shopping",
    "check-in": "Photo spots",
    family: "Family",
    budget: "Budget",
    luxury: "Luxury",
  },
};

const timeBlockLabels: Record<Locale, Record<TimeBlock, string>> = {
  vi: {
    morning: "Sáng",
    noon: "Trưa",
    afternoon: "Chiều",
    evening: "Tối",
  },
  en: {
    morning: "Morning",
    noon: "Noon",
    afternoon: "Afternoon",
    evening: "Evening",
  },
};

const costCategoryLabels: Record<Locale, Record<CostCategory, string>> = {
  vi: {
    flight: "Vé máy bay / phương tiện chính",
    hotel: "Khách sạn",
    food: "Ăn uống",
    "local-transport": "Di chuyển nội địa",
    ticket: "Vé tham quan",
    shopping: "Mua sắm",
    other: "Chi phí khác",
  },
  en: {
    flight: "Flights / main transport",
    hotel: "Hotel",
    food: "Food",
    "local-transport": "Local transport",
    ticket: "Tickets",
    shopping: "Shopping",
    other: "Other",
  },
};

export function getTravelStyleLabel(style: TravelStyle, locale: Locale) {
  return travelStyleLabels[locale][style] ?? style;
}

export function getTimeBlockLabel(block: TimeBlock, locale: Locale) {
  return timeBlockLabels[locale][block] ?? block;
}

export function getCostCategoryLabel(category: CostCategory, locale: Locale) {
  return costCategoryLabels[locale][category] ?? category;
}
