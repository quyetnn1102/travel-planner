"use client";

import { useEffect, useState } from "react";
import type { PublicTrip } from "@/lib/public-trip";
import {
  costCategories,
  formatCurrency,
  formatDate,
  timeBlocks,
} from "@/lib/travel";
import { travelApi } from "@/lib/api";

export function SharedTripPage({ shareToken }: { shareToken: string }) {
  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    travelApi
      .getSharedTrip(shareToken)
      .then((sharedTrip) => {
        if (isMounted) {
          setTrip(sharedTrip);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Không thể mở link chia sẻ.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-6 text-[#17211b]">
        <p className="text-sm font-bold text-[#6d675c]">Đang tải...</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-6 text-center text-[#17211b]">
        <div className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-8 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#756f65]">Shared Trip</p>
          <h1 className="mt-2 text-3xl font-extrabold">Link không khả dụng</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#6d675c]">
            {errorMessage || "Chuyến đi có thể đã tắt chia sẻ hoặc token không đúng."}
          </p>
        </div>
      </main>
    );
  }

  const summary = calculatePublicCostSummary(trip);

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#17211b]">
      <div className="mx-auto max-w-6xl px-5 py-7">
        <header
          className="overflow-hidden rounded-lg bg-[#17211b] bg-cover bg-center text-white"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(23,33,27,0.92), rgba(23,33,27,0.62), rgba(23,33,27,0.18)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80)",
          }}
        >
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-white/75">{trip.destination}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight">{trip.title}</h1>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <ReadOnlyMetric label="Thời gian" value={`${trip.itineraryDays.length} ngày`} />
              <ReadOnlyMetric label="Số người" value={`${trip.adultCount + trip.childCount} người`} />
              <ReadOnlyMetric label="Tổng chi phí" value={formatCurrency(summary.total)} />
              <ReadOnlyMetric label="Theo người" value={formatCurrency(summary.perPerson)} />
            </div>
          </div>
        </header>

        <section className="py-7">
          <h2 className="text-2xl font-extrabold">Lịch trình</h2>
          <div className="mt-4 space-y-4">
            {trip.itineraryDays.map((day) => (
              <article key={`${day.date}-${day.dayNumber}`} className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-[#eee5d3] pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold">{day.title}</h3>
                  <p className="text-sm font-semibold text-[#6d675c]">{formatDate(day.date)}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {timeBlocks.map((block) => {
                    const activities = day.activities
                      .filter((activity) => activity.timeBlock === block.value)
                      .sort((first, second) => first.sortOrder - second.sortOrder);

                    return (
                      <div key={block.value} className="rounded-lg bg-white p-3">
                        <h4 className="text-sm font-bold">{block.label}</h4>
                        <div className="mt-3 space-y-2">
                          {activities.length > 0 ? (
                            activities.map((activity) => (
                                <div key={`${activity.timeBlock}-${activity.title}-${activity.sortOrder}`} className="rounded-lg border border-[#eee5d3] bg-[#fffdf8] p-3">
                                <p className="text-sm font-bold">{activity.title}</p>
                                <p className="mt-1 text-xs font-semibold text-[#756f65]">
                                  {[activity.startTime, activity.endTime].filter(Boolean).join(" - ") || "Chưa có giờ"}
                                </p>
                                {activity.locationName ? (
                                  <p className="mt-2 text-xs font-semibold text-[#315f45]">{activity.locationName}</p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm font-medium text-[#8a8173]">Chưa có hoạt động</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t border-[#e3dac8] py-7 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold">Chi phí</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
              {trip.costItems.length > 0 ? (
                trip.costItems.map((item) => (
                  <div
                    key={`${item.category}-${item.name}`}
                    className="flex items-center justify-between gap-4 border-b border-[#eee5d3] px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="mt-1 text-xs font-semibold text-[#6d675c]">{getCostCategoryLabel(item.category)}</p>
                    </div>
                    <p className="text-sm font-bold">{formatCurrency(item.amount * item.quantity)}</p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm font-medium text-[#776f61]">Chưa có chi phí.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold">Checklist</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
              {trip.checklistItems.map((item) => (
                <div
                  key={`${item.category}-${item.title}`}
                  className="flex items-center gap-3 border-b border-[#eee5d3] px-4 py-3 last:border-b-0"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold ${
                      item.isDone ? "border-[#315f45] bg-[#315f45] text-white" : "border-[#d4c9b5] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <p className={`text-sm font-semibold ${item.isDone ? "text-[#999185] line-through" : ""}`}>
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/16 bg-white/12 px-4 py-3">
      <p className="text-xs font-bold uppercase text-white/68">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

function getCostCategoryLabel(category: string) {
  return costCategories.find((item) => item.value === category)?.label ?? category;
}

function calculatePublicCostSummary(trip: PublicTrip) {
  const total = trip.costItems.reduce((sum, item) => sum + item.amount * Math.max(1, item.quantity), 0);
  const travelerCount = Math.max(1, trip.adultCount + trip.childCount);

  return {
    total,
    perPerson: Math.round(total / travelerCount),
  };
}
