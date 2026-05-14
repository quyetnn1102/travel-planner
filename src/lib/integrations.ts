import type { Trip } from "@/lib/travel";

export type PartnerLink = {
  id: "agoda" | "booking";
  name: string;
  category: "hotel";
  href: string;
  trackingConfigured: boolean;
  note: string;
};

function appendOptionalParam(params: URLSearchParams, key: string, value?: string) {
  if (value?.trim()) {
    params.set(key, value.trim());
  }
}

function baseDestination(destination: string) {
  return destination.trim() || "Tokyo";
}

export function buildPartnerLinks(trip: Trip): PartnerLink[] {
  const travelerCount = Math.max(1, trip.adultCount + trip.childCount);
  const bookingAid = process.env.NEXT_PUBLIC_BOOKING_AID;
  const agodaCid = process.env.NEXT_PUBLIC_AGODA_CID;

  const bookingParams = new URLSearchParams({
    ss: baseDestination(trip.destination),
    checkin: trip.startDate,
    checkout: trip.endDate,
    group_adults: String(Math.max(1, trip.adultCount)),
    group_children: String(Math.max(0, trip.childCount)),
    no_rooms: "1",
  });
  appendOptionalParam(bookingParams, "aid", bookingAid);

  const agodaParams = new URLSearchParams({
    text: baseDestination(trip.destination),
    checkIn: trip.startDate,
    checkOut: trip.endDate,
    rooms: "1",
    adults: String(travelerCount),
    children: String(Math.max(0, trip.childCount)),
  });
  appendOptionalParam(agodaParams, "cid", agodaCid);

  return [
    {
      id: "booking",
      name: "Booking.com",
      category: "hotel",
      href: `https://www.booking.com/searchresults.html?${bookingParams.toString()}`,
      trackingConfigured: Boolean(bookingAid),
      note: "Demand API / affiliate deep links require Booking.com partner approval.",
    },
    {
      id: "agoda",
      name: "Agoda",
      category: "hotel",
      href: `https://www.agoda.com/search?${agodaParams.toString()}`,
      trackingConfigured: Boolean(agodaCid),
      note: "Agoda API / affiliate tracking requires partner credentials and certification.",
    },
  ];
}
