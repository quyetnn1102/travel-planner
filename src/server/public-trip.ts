import type { Trip } from "@/lib/travel";
import type { PublicTrip } from "@/lib/public-trip";

export function toPublicTripDto(trip: Trip): PublicTrip {
  return {
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    adultCount: trip.adultCount,
    childCount: trip.childCount,
    travelStyles: trip.travelStyles,
    itineraryDays: trip.itineraryDays.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      activities: day.activities.map((activity) => ({
        timeBlock: activity.timeBlock,
        title: activity.title,
        startTime: activity.startTime,
        endTime: activity.endTime,
        locationName: activity.locationName,
        estimatedCost: activity.estimatedCost,
        notes: activity.notes,
        sortOrder: activity.sortOrder,
      })),
    })),
    costItems: trip.costItems.map((item) => ({
      category: item.category,
      name: item.name,
      amount: item.amount,
      quantity: item.quantity,
    })),
    checklistItems: trip.checklistItems.map((item) => ({
      title: item.title,
      isDone: item.isDone,
      category: item.category,
    })),
  };
}
