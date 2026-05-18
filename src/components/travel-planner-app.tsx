"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChecklistItem,
  CostCategory,
  CostItem,
  ItineraryDay,
  TimeBlock,
  TravelStyle,
  Trip,
  TripDraft,
  calculateCostSummary,
  costCategories,
  formatCurrency,
  formatDate,
  timeBlocks,
  travelStyles,
} from "@/lib/travel";
import { travelApi } from "@/lib/api";
import type { AiRecommendation, AiSearchPlace, AiTripPreview } from "@/lib/ai-recommendations";
import type { TripTemplate } from "@/lib/trip-templates";
import { buildPartnerLinks } from "@/lib/integrations";
import {
  Locale,
  getCostCategoryLabel,
  getTimeBlockLabel,
  getTravelStyleLabel,
  localeOptions,
  uiText,
} from "@/lib/i18n";

type Tab = "itinerary" | "costs" | "checklist" | "booking" | "share";

type ActivityDraft = {
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  estimatedCost: number;
  notes: string;
};

type CostDraft = {
  category: CostCategory;
  name: string;
  amount: number;
  quantity: number;
  notes: string;
};

const destinationImages = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
];

const emptyTripDraft: TripDraft = {
  title: "",
  destination: "",
  startDate: "2026-10-01",
  endDate: "2026-10-05",
  adultCount: 2,
  childCount: 0,
  budgetAmount: 30_000_000,
  travelStyles: ["family"],
  notes: "",
};

const emptyActivityDraft: ActivityDraft = {
  title: "",
  startTime: "",
  endTime: "",
  locationName: "",
  address: "",
  estimatedCost: 0,
  notes: "",
};

const emptyCostDraft: CostDraft = {
  category: "hotel",
  name: "",
  amount: 0,
  quantity: 1,
  notes: "",
};

export function TravelPlannerApp() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [activeDayId, setActiveDayId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("itinerary");
  const [tripDraft, setTripDraft] = useState<TripDraft>(emptyTripDraft);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [aiRecommendationsByTrip, setAiRecommendationsByTrip] = useState<{
    tripId: string;
    recommendations: AiRecommendation[];
  } | null>(null);
  const [generatingRecommendationsForTripId, setGeneratingRecommendationsForTripId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("vi");
  const [searchResults, setSearchResults] = useState<AiSearchPlace[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [tripPreview, setTripPreview] = useState<AiTripPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [templates, setTemplates] = useState<Array<Omit<TripTemplate, "days" | "costItems" | "checklistItems"> & { dayCount: number }>>([]);
  const text = uiText[locale];

  useEffect(() => {
    let isMounted = true;

    Promise.all([travelApi.listTrips(), travelApi.listTemplates()])
      .then(([loadedTrips, loadedTemplates]) => {
        if (!isMounted) {
          return;
        }

        setTrips(loadedTrips);
        setTemplates(loadedTemplates);
        setSelectedTripId(loadedTrips[0]?.id ?? "");
        setActiveDayId(loadedTrips[0]?.itineraryDays[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : uiText.vi.loadError);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTrips(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  );

  const activeDay = useMemo(
    () =>
      selectedTrip?.itineraryDays.find((day) => day.id === activeDayId) ??
      selectedTrip?.itineraryDays[0] ??
      null,
    [activeDayId, selectedTrip],
  );

  const summary = selectedTrip ? calculateCostSummary(selectedTrip) : null;
  const completedChecklist = selectedTrip?.checklistItems.filter((item) => item.isDone).length ?? 0;
  const aiRecommendations =
    aiRecommendationsByTrip && selectedTrip && aiRecommendationsByTrip.tripId === selectedTrip.id
      ? aiRecommendationsByTrip.recommendations
      : [];
  const isGeneratingRecommendations = generatingRecommendationsForTripId === selectedTrip?.id;

  function replaceTrip(nextTrip: Trip) {
    setTrips((currentTrips) => currentTrips.map((trip) => (trip.id === nextTrip.id ? nextTrip : trip)));
    setActiveDayId((currentDayId) =>
      nextTrip.itineraryDays.some((day) => day.id === currentDayId)
        ? currentDayId
        : (nextTrip.itineraryDays[0]?.id ?? ""),
    );
  }

  async function refreshTrip(tripId: string) {
    const trip = await travelApi.getTrip(tripId);
    replaceTrip(trip);
    return trip;
  }

  async function runMutation(operation: () => Promise<void>) {
    setStatusMessage(null);

    try {
      await operation();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : text.saveError);
    }
  }

  function handleFormPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handlePreviewTrip(tripDraft);
  }

  async function handlePreviewTrip(draft: TripDraft) {
    setStatusMessage(null);
    setIsGeneratingPreview(true);

    try {
      const result = await travelApi.previewTrip(draft);
      setTripPreview(result.preview);
      setIsPreviewing(true);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  async function confirmTrip(editedTitle: string) {
    if (!tripPreview) {
      return;
    }

    void runMutation(async () => {
      const trip = await travelApi.createTrip({
        ...tripDraft,
        title: editedTitle.trim() || tripPreview.suggestedTitle,
      });
      setTrips((currentTrips) => [trip, ...currentTrips]);
      setSelectedTripId(trip.id);
      setActiveDayId(trip.itineraryDays[0]?.id ?? "");
      setActiveTab("itinerary");
      setTripDraft(emptyTripDraft);

      for (const previewDay of tripPreview.itineraryPreview) {
        const day = trip.itineraryDays.find((d) => d.dayNumber === previewDay.dayNumber);
        if (!day) {
          continue;
        }

        for (const activity of previewDay.activities) {
          await travelApi.addActivity(day.id, {
            title: activity.title,
            timeBlock: activity.timeBlock,
            startTime: "",
            endTime: "",
            locationName: activity.locationName ?? "",
            address: "",
            estimatedCost: 0,
            notes: activity.notes ?? "",
          });
        }
      }

      await refreshTrip(trip.id);
      setTripPreview(null);
      setIsPreviewing(false);
    });
  }

  function previewCancel() {
    setTripPreview(null);
    setIsPreviewing(false);
  }

  function useTemplate(templateId: string) {
    void runMutation(async () => {
      const result = await travelApi.useTemplate(templateId);
      const trip = await travelApi.getTrip(result.tripId);
      setTrips((currentTrips) => [trip, ...currentTrips.filter((item) => item.id !== trip.id)]);
      setSelectedTripId(trip.id);
      setActiveDayId(trip.itineraryDays[0]?.id ?? "");
      setActiveTab("itinerary");
      setIsPreviewing(false);
      setTripPreview(null);
    });
  }

  function deleteTrip(tripId: string) {
    void runMutation(async () => {
      await travelApi.deleteTrip(tripId);
      const nextTrips = trips.filter((trip) => trip.id !== tripId);
      setTrips(nextTrips);

      if (selectedTripId === tripId) {
        setSelectedTripId(nextTrips[0]?.id ?? "");
        setActiveDayId(nextTrips[0]?.itineraryDays[0]?.id ?? "");
      }
    });
  }

  function saveTripDetails(draft: TripDraft) {
    if (!selectedTrip) {
      return;
    }

    const safeEndDate = draft.endDate < draft.startDate ? draft.startDate : draft.endDate;

    void runMutation(async () => {
      const trip = await travelApi.updateTrip(selectedTrip.id, { ...draft, endDate: safeEndDate });
      replaceTrip(trip);
      setIsEditingTrip(false);
    });
  }

  function addActivity(dayId: string, timeBlock: TimeBlock, draft: ActivityDraft) {
    if (!selectedTrip || !draft.title.trim()) {
      return;
    }

    void runMutation(async () => {
      await travelApi.addActivity(dayId, {
        ...draft,
        timeBlock,
        title: draft.title.trim(),
        locationName: draft.locationName.trim(),
        address: draft.address.trim(),
        estimatedCost: Math.max(0, draft.estimatedCost),
        notes: draft.notes.trim(),
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  function updateActivity(_dayId: string, activityId: string, draft: ActivityDraft) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.updateActivity(activityId, {
        ...draft,
        title: draft.title.trim(),
        locationName: draft.locationName.trim(),
        address: draft.address.trim(),
        estimatedCost: Math.max(0, draft.estimatedCost),
        notes: draft.notes.trim(),
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  function deleteActivity(_dayId: string, activityId: string) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.deleteActivity(activityId);
      await refreshTrip(selectedTrip.id);
    });
  }

  function moveActivity(dayId: string, activityId: string, direction: -1 | 1) {
    if (!selectedTrip) {
      return;
    }

    const day = selectedTrip.itineraryDays.find((item) => item.id === dayId);
    const activity = day?.activities.find((item) => item.id === activityId);

    if (!day || !activity) {
      return;
    }

    const activitiesInBlock = day.activities
      .filter((item) => item.timeBlock === activity.timeBlock)
      .sort((first, second) => first.sortOrder - second.sortOrder);
    const currentIndex = activitiesInBlock.findIndex((item) => item.id === activityId);
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= activitiesInBlock.length) {
      return;
    }

    const swapped = [...activitiesInBlock];
    [swapped[currentIndex], swapped[targetIndex]] = [swapped[targetIndex], swapped[currentIndex]];

    void runMutation(async () => {
      await travelApi.reorderActivities(
        dayId,
        swapped.map((item) => item.id),
      );
      await refreshTrip(selectedTrip.id);
    });
  }

  function addCost(draft: CostDraft) {
    if (!selectedTrip || !draft.name.trim()) {
      return;
    }

    void runMutation(async () => {
      await travelApi.addCost(selectedTrip.id, {
        category: draft.category,
        name: draft.name.trim(),
        amount: Math.max(0, draft.amount),
        quantity: Math.max(1, draft.quantity),
        notes: draft.notes.trim(),
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  function updateCost(costId: string, name: string, amount: number) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.updateCost(costId, {
        name: name.trim(),
        amount: Math.max(0, amount),
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  function deleteCost(costId: string) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.deleteCost(costId);
      await refreshTrip(selectedTrip.id);
    });
  }

  function addChecklist(title: string) {
    if (!selectedTrip || !title.trim()) {
      return;
    }

    void runMutation(async () => {
      await travelApi.addChecklistItem(selectedTrip.id, {
        title: title.trim(),
        isDone: false,
        category: "Tự tạo",
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  function updateChecklist(itemId: string, title: string) {
    if (!selectedTrip || !title.trim()) {
      return;
    }

    void runMutation(async () => {
      await travelApi.updateChecklistItem(itemId, { title: title.trim() });
      await refreshTrip(selectedTrip.id);
    });
  }

  function toggleChecklist(itemId: string) {
    if (!selectedTrip) {
      return;
    }

    const item = selectedTrip.checklistItems.find((checklistItem) => checklistItem.id === itemId);

    if (!item) {
      return;
    }

    void runMutation(async () => {
      await travelApi.updateChecklistItem(itemId, { isDone: !item.isDone });
      await refreshTrip(selectedTrip.id);
    });
  }

  function deleteChecklist(itemId: string) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.deleteChecklistItem(itemId);
      await refreshTrip(selectedTrip.id);
    });
  }

  function toggleShare() {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      if (selectedTrip.share?.isEnabled) {
        await travelApi.updateShare(selectedTrip.id, false);
      } else {
        await travelApi.enableShare(selectedTrip.id);
      }

      await refreshTrip(selectedTrip.id);
    });
  }

  function generateRecommendations() {
    if (!selectedTrip) {
      return;
    }

    const tripId = selectedTrip.id;
    setGeneratingRecommendationsForTripId(tripId);
    void runMutation(async () => {
      const result = await travelApi.getAiRecommendations(tripId);
      setAiRecommendationsByTrip({ tripId, recommendations: result.recommendations });
    }).finally(() => {
      setGeneratingRecommendationsForTripId((currentTripId) => (currentTripId === tripId ? null : currentTripId));
    });
  }

  function addRecommendationAsActivity(
    dayId: string,
    timeBlock: TimeBlock,
    recommendation: AiRecommendation,
  ) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.addActivity(dayId, {
        title: recommendation.title,
        timeBlock,
        startTime: "",
        endTime: "",
        locationName: "",
        address: "",
        estimatedCost: 0,
        notes: recommendation.rationale,
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  async function searchPlacesHandler(query: string) {
    if (!selectedTrip || !query.trim()) {
      return;
    }

    setIsSearchingPlaces(true);

    try {
      const result = await travelApi.searchPlaces(selectedTrip.id, query.trim());
      setSearchResults(result.places);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : text.saveError);
      setSearchResults([]);
    } finally {
      setIsSearchingPlaces(false);
    }
  }

  function addSearchedPlace(dayId: string, timeBlock: TimeBlock, place: AiSearchPlace) {
    if (!selectedTrip) {
      return;
    }

    void runMutation(async () => {
      await travelApi.addActivity(dayId, {
        title: place.name,
        timeBlock,
        startTime: "",
        endTime: "",
        locationName: place.locationName,
        address: "",
        estimatedCost: place.estimatedCost,
        notes: place.description,
      });
      await refreshTrip(selectedTrip.id);
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#17211b]">
      <TopNavigation locale={locale} onLocaleChange={setLocale} />

      {isLoadingTrips || statusMessage ? (
        <section className="mx-auto max-w-[1480px] px-4 pb-2 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[#ddd5c4] bg-[#fffdf8] px-4 py-3 text-sm font-bold text-[#61594a] shadow-sm">
            {isLoadingTrips ? text.syncing : statusMessage}
          </div>
        </section>
      ) : null}

      <section
        className="mx-auto max-w-[1480px] px-4 pb-5 pt-3 sm:px-6 lg:px-8"
        aria-label={text.createTripTitle}
      >
        <div
          className="grid min-h-[430px] overflow-hidden rounded-lg bg-[#16211b] bg-cover bg-center lg:grid-cols-[minmax(0,1fr)_430px]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(15,25,20,0.86), rgba(15,25,20,0.58) 46%, rgba(15,25,20,0.2)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80)",
          }}
        >
          <div className="flex flex-col justify-between p-5 text-white sm:p-8 lg:p-10">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] sm:text-5xl lg:text-6xl">
                {text.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/82">
                {text.heroSubtitle}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-sm font-semibold">
              {["Tokyo gia đình", "Seoul mùa thu", "Singapore 4N3Đ", "Đà Nẵng nghỉ dưỡng"].map(
                (item) => (
                  <span key={item} className="rounded-full bg-white/16 px-4 py-2 text-white backdrop-blur">
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          {isPreviewing && tripPreview ? (
            <TripPreviewPanel
              draft={tripDraft}
              preview={tripPreview}
              locale={locale}
              onConfirm={confirmTrip}
              onCancel={previewCancel}
            />
          ) : (
            <div className="space-y-4">
              <TemplateStarterPanel templates={templates} locale={locale} onUseTemplate={useTemplate} />
              <TripDraftForm draft={tripDraft} locale={locale} onDraftChange={setTripDraft} onSubmit={handleFormPreview} isLoading={isGeneratingPreview} />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5">
          <section className="rounded-lg border border-[#ddd5c4] bg-[#fffdf8] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{text.yourTrips}</h2>
              <span className="rounded-full bg-[#e8f2df] px-3 py-1 text-xs font-bold text-[#315f45]">
                {trips.length} {text.plans}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {trips.map((trip, index) => (
                <TripListCard
                  key={trip.id}
                  trip={trip}
                  image={destinationImages[index % destinationImages.length]}
                  locale={locale}
                  selected={trip.id === selectedTrip?.id}
                  onSelect={() => {
                    setSelectedTripId(trip.id);
                    setActiveDayId(trip.itineraryDays[0]?.id ?? "");
                    setIsEditingTrip(false);
                    setSearchResults([]);
                  }}
                />
              ))}
            </div>
          </section>
        </aside>

        {isLoadingTrips ? (
          <LoadingState locale={locale} />
        ) : selectedTrip && summary ? (
          <section className="min-w-0 space-y-5">
            <TripOverview
              trip={selectedTrip}
              summary={summary}
              completedChecklist={completedChecklist}
              locale={locale}
              onEdit={() => setIsEditingTrip((value) => !value)}
              onDelete={() => deleteTrip(selectedTrip.id)}
            />

            {isEditingTrip ? (
              <TripEditPanel
                trip={selectedTrip}
                locale={locale}
                onCancel={() => setIsEditingTrip(false)}
                onSave={saveTripDetails}
              />
            ) : null}

            <Tabs activeTab={activeTab} locale={locale} onChange={setActiveTab} />

            <AiRecommendationsPanel
              recommendations={aiRecommendations}
              isLoading={isGeneratingRecommendations}
              locale={locale}
              onGenerate={generateRecommendations}
              itineraryDays={selectedTrip?.itineraryDays ?? []}
              onAddAsActivity={addRecommendationAsActivity}
            />

            {activeTab === "itinerary" && activeDay ? (
              <ItineraryPanel
                trip={selectedTrip}
                activeDay={activeDay}
                activeDayId={activeDay.id}
                onSelectDay={setActiveDayId}
                onAddActivity={addActivity}
                onUpdateActivity={updateActivity}
                onDeleteActivity={deleteActivity}
                onMoveActivity={moveActivity}
                locale={locale}
                searchResults={searchResults}
                isSearchingPlaces={isSearchingPlaces}
                onSearchPlaces={searchPlacesHandler}
                onAddPlace={addSearchedPlace}
              />
            ) : null}

            {activeTab === "costs" ? (
              <CostPanel
                trip={selectedTrip}
                summary={summary}
                onAdd={addCost}
                onUpdate={updateCost}
                onDelete={deleteCost}
                locale={locale}
              />
            ) : null}

            {activeTab === "checklist" ? (
              <ChecklistPanel
                trip={selectedTrip}
                onAdd={addChecklist}
                onUpdate={updateChecklist}
                onToggle={toggleChecklist}
                onDelete={deleteChecklist}
              />
            ) : null}

            {activeTab === "booking" ? <BookingPanel trip={selectedTrip} locale={locale} /> : null}

            {activeTab === "share" ? <SharePanel trip={selectedTrip} onToggle={toggleShare} /> : null}
          </section>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function TopNavigation({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const text = uiText[locale];

  return (
    <header className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#17211b] text-sm font-bold text-white">
          TP
        </div>
        <div>
          <p className="text-base font-extrabold leading-5">Lữ Trình</p>
          <p className="text-xs font-semibold text-[#6d6a60]">{text.navTagline}</p>
        </div>
      </div>
      <nav className="flex items-center gap-3 text-sm font-semibold text-[#615f57]">
        <div className="hidden items-center gap-5 md:flex">
          <a href="#planner">{text.navItinerary}</a>
          <a href="#budget">{text.navBudget}</a>
          <a href="#booking">{text.tabs.booking}</a>
          <a href="#share">{text.navShare}</a>
        </div>
        <div className="flex rounded-full border border-[#d8cfbd] bg-[#fffdf8] p-1">
          {localeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onLocaleChange(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                locale === option.value ? "bg-[#17211b] text-white" : "text-[#6d675c]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Link
          href="/api/auth/signin"
          className="rounded-full border border-[#17211b] bg-[#17211b] px-4 py-2 text-xs font-extrabold text-white"
        >
          {locale === "vi" ? "Đăng nhập" : "Sign in"}
        </Link>
      </nav>
    </header>
  );
}

function TemplateStarterPanel({
  templates,
  locale,
  onUseTemplate,
}: {
  templates: Array<Omit<TripTemplate, "days" | "costItems" | "checklistItems"> & { dayCount: number }>;
  locale: Locale;
  onUseTemplate: (templateId: string) => void;
}) {
  if (templates.length === 0) {
    return null;
  }

  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-white/16 bg-white/12 p-4 text-white backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-white/70">
            {isVietnamese ? "Mẫu có sẵn" : "Ready templates"}
          </p>
          <h2 className="mt-1 text-lg font-extrabold">
            {isVietnamese ? "Bắt đầu từ lịch trình mẫu" : "Start from a proven plan"}
          </h2>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {templates.slice(0, 4).map((template) => (
          <article key={template.id} className="rounded-lg bg-white/12 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold">{template.title}</h3>
                <p className="mt-1 text-xs font-semibold text-white/72">
                  {template.destination} · {template.durationDays} {isVietnamese ? "ngày" : "days"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(template.id)}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-extrabold text-[#17211b]"
              >
                {isVietnamese ? "Dùng mẫu" : "Use"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TripDraftForm({
  draft,
  locale,
  onDraftChange,
  onSubmit,
  isLoading,
}: {
  draft: TripDraft;
  locale: Locale;
  onDraftChange: (draft: TripDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}) {
  const text = uiText[locale];

  return (
    <form onSubmit={onSubmit} className="m-4 rounded-lg bg-white p-4 shadow-2xl sm:m-6 sm:p-5 lg:m-8">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-[#7d776b]">{text.quickCreate}</p>
        <h2 className="mt-1 text-2xl font-bold">{text.createTripTitle}</h2>
      </div>

      <div className="grid gap-3">
        <Field label={text.tripName}>
          <input
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            className="input"
            placeholder="Tokyo gia đình 6N5Đ"
          />
        </Field>
        <Field label={text.destination}>
          <input
            value={draft.destination}
            onChange={(event) => onDraftChange({ ...draft, destination: event.target.value })}
            className="input"
            placeholder="Tokyo, Nhật Bản"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={text.startDate}>
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => onDraftChange({ ...draft, startDate: event.target.value })}
              className="input"
            />
          </Field>
          <Field label={text.endDate}>
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => onDraftChange({ ...draft, endDate: event.target.value })}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={text.adults}>
            <input
              type="number"
              min={1}
              value={draft.adultCount}
              onChange={(event) => onDraftChange({ ...draft, adultCount: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label={text.children}>
            <input
              type="number"
              min={0}
              value={draft.childCount}
              onChange={(event) => onDraftChange({ ...draft, childCount: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label={text.budget}>
            <input
              type="number"
              min={0}
              step={500000}
              value={draft.budgetAmount}
              onChange={(event) => onDraftChange({ ...draft, budgetAmount: Number(event.target.value) })}
              className="input"
            />
          </Field>
        </div>
        <StylePicker
          locale={locale}
          selectedStyles={draft.travelStyles}
          onChange={(style) => onDraftChange({ ...draft, travelStyles: toggleStyle(draft.travelStyles, style) })}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full rounded-lg bg-[#17211b] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (locale === "vi" ? "AI đang tạo gợi ý..." : "AI generating preview...") : text.createItinerary}
      </button>
    </form>
  );
}

function TripListCard({
  trip,
  image,
  locale,
  selected,
  onSelect,
}: {
  trip: Trip;
  image: string;
  locale: Locale;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = calculateCostSummary(trip);
  const text = uiText[locale];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-lg border bg-white text-left transition ${
        selected ? "border-[#17211b] shadow-md" : "border-[#e3dac8] hover:border-[#9e9789]"
      }`}
    >
      <div
        className="h-24 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.22)), url(${image})` }}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{trip.title}</p>
            <p className="mt-1 text-xs font-semibold text-[#69665d]">{trip.destination}</p>
          </div>
          <span className="rounded-full bg-[#f1eadb] px-2 py-1 text-xs font-bold text-[#574f42]">
            {trip.itineraryDays.length} {text.days}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#69665d]">
          <span>{formatDate(trip.startDate)}</span>
          <span>{formatCurrency(summary.total)}</span>
        </div>
      </div>
    </button>
  );
}

function TripOverview({
  trip,
  summary,
  completedChecklist,
  locale,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  summary: ReturnType<typeof calculateCostSummary>;
  completedChecklist: number;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const text = uiText[locale];

  return (
    <section
      className="overflow-hidden rounded-lg bg-[#17211b] bg-cover bg-center text-white shadow-sm"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(23,33,27,0.92), rgba(23,33,27,0.72), rgba(23,33,27,0.24)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80)",
      }}
    >
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/78">{trip.destination}</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{trip.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
              {trip.notes || text.notesEmpty}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trip.travelStyles.map((style) => (
                <span key={style} className="rounded-full bg-white/16 px-3 py-1.5 text-xs font-bold text-white">
                  {getTravelStyleLabel(style, locale)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#17211b]">
              {text.edit}
            </button>
            <button type="button" onClick={onDelete} className="rounded-lg bg-[#fee8df] px-4 py-2 text-sm font-bold text-[#9b3519]">
              {text.delete}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric label={text.time} value={`${trip.itineraryDays.length} ${text.days}`} dark />
          <Metric label={text.travelerCount} value={`${trip.adultCount + trip.childCount} ${text.people}`} dark />
          <Metric label={text.cost} value={formatCurrency(summary.total)} dark />
          <Metric label={text.checklist} value={`${completedChecklist}/${trip.checklistItems.length}`} dark />
        </div>
      </div>
    </section>
  );
}

function TripEditPanel({
  trip,
  locale,
  onCancel,
  onSave,
}: {
  trip: Trip;
  locale: Locale;
  onCancel: () => void;
  onSave: (draft: TripDraft) => void;
}) {
  const [draft, setDraft] = useState<TripDraft>({
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    adultCount: trip.adultCount,
    childCount: trip.childCount,
    budgetAmount: trip.budgetAmount,
    travelStyles: trip.travelStyles,
    notes: trip.notes,
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
      className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Tên chuyến đi">
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="input" />
        </Field>
        <Field label="Điểm đến">
          <input
            value={draft.destination}
            onChange={(event) => setDraft({ ...draft, destination: event.target.value })}
            className="input"
          />
        </Field>
        <Field label="Bắt đầu">
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
            className="input"
          />
        </Field>
        <Field label="Kết thúc">
          <input
            type="date"
            value={draft.endDate}
            onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            className="input"
          />
        </Field>
        <Field label="Người lớn">
          <input
            type="number"
            min={1}
            value={draft.adultCount}
            onChange={(event) => setDraft({ ...draft, adultCount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label="Trẻ em">
          <input
            type="number"
            min={0}
            value={draft.childCount}
            onChange={(event) => setDraft({ ...draft, childCount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label="Ngân sách VND">
          <input
            type="number"
            min={0}
            value={draft.budgetAmount}
            onChange={(event) => setDraft({ ...draft, budgetAmount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label="Ghi chú">
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            className="input min-h-20 resize-none"
          />
        </Field>
      </div>
      <div className="mt-4">
        <StylePicker
          locale={locale}
          selectedStyles={draft.travelStyles}
          onChange={(style) => setDraft({ ...draft, travelStyles: toggleStyle(draft.travelStyles, style) })}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#cfc5b1] bg-white px-4 py-2 text-sm font-bold">
          Hủy
        </button>
        <button type="submit" className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white">
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
}

function Tabs({ activeTab, locale, onChange }: { activeTab: Tab; locale: Locale; onChange: (tab: Tab) => void }) {
  const text = uiText[locale];
  const tabs: Array<[Tab, string]> = [
    ["itinerary", text.tabs.itinerary],
    ["costs", text.tabs.costs],
    ["checklist", text.tabs.checklist],
    ["booking", text.tabs.booking],
    ["share", text.tabs.share],
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-2 shadow-sm">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            activeTab === value ? "bg-[#17211b] text-white" : "text-[#625d51] hover:bg-[#f1eadb]"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function AiRecommendationsPanel({
  recommendations,
  isLoading,
  locale,
  onGenerate,
  itineraryDays,
  onAddAsActivity,
}: {
  recommendations: AiRecommendation[];
  isLoading: boolean;
  locale: Locale;
  onGenerate: () => void;
  itineraryDays: ItineraryDay[];
  onAddAsActivity: (dayId: string, timeBlock: TimeBlock, recommendation: AiRecommendation) => void;
}) {
  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-[#d8cfbd] bg-[#fffdf8] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#756f65]">
            {isVietnamese ? "AI gợi ý" : "AI recommendations"}
          </p>
          <h3 className="mt-1 text-lg font-extrabold">
            {isVietnamese ? "Nhận gợi ý tối ưu lịch trình" : "Get trip optimization ideas"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (isVietnamese ? "Đang tạo..." : "Generating...") : isVietnamese ? "Tạo gợi ý" : "Generate"}
        </button>
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => (
            <RecommendationCard
              key={`${item.priority}-${item.title}`}
              recommendation={item}
              itineraryDays={itineraryDays}
              locale={locale}
              onAddAsActivity={onAddAsActivity}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecommendationCard({
  recommendation,
  itineraryDays,
  locale,
  onAddAsActivity,
}: {
  recommendation: AiRecommendation;
  itineraryDays: ItineraryDay[];
  locale: Locale;
  onAddAsActivity: (dayId: string, timeBlock: TimeBlock, recommendation: AiRecommendation) => void;
}) {
  const [selectedDayId, setSelectedDayId] = useState(itineraryDays[0]?.id ?? "");

  return (
    <article className="rounded-lg border border-[#eee5d3] bg-white p-3">
      <span className="rounded-full bg-[#f1eadb] px-2 py-1 text-[11px] font-bold uppercase text-[#574f42]">
        {recommendation.priority}
      </span>
      <h4 className="mt-3 text-sm font-extrabold text-[#17211b]">{recommendation.title}</h4>
      <p className="mt-2 text-sm leading-5 text-[#615f57]">{recommendation.rationale}</p>

      {itineraryDays.length > 0 ? (
        <div className="mt-3 border-t border-[#eee5d3] pt-3">
          <label className="mb-2 block text-xs font-bold uppercase text-[#756f65]">
            {locale === "vi" ? "Chọn ngày" : "Select day"}
          </label>
          <select
            value={selectedDayId}
            onChange={(event) => setSelectedDayId(event.target.value)}
            className="input mb-2"
          >
            {itineraryDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.title} — {formatDate(day.date)}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {timeBlocks.map((block) => (
              <button
                key={block.value}
                type="button"
                onClick={() => onAddAsActivity(selectedDayId, block.value, recommendation)}
                className="flex-1 rounded-md bg-[#f1eadb] px-2 py-1.5 text-[11px] font-bold text-[#574f42] transition hover:bg-[#315f45] hover:text-white"
              >
                {getTimeBlockLabel(block.value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SearchPlacesSection({
  searchResults,
  isSearching,
  itineraryDays,
  locale,
  onSearch,
  onAddPlace,
}: {
  searchResults: AiSearchPlace[];
  isSearching: boolean;
  itineraryDays: ItineraryDay[];
  locale: Locale;
  onSearch: (query: string) => void;
  onAddPlace: (dayId: string, timeBlock: TimeBlock, place: AiSearchPlace) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedDayId, setSelectedDayId] = useState(itineraryDays[0]?.id ?? "");
  const isVietnamese = locale === "vi";

  return (
    <section className="rounded-lg border border-[#d8cfbd] bg-[#fffdf8] p-4 shadow-sm">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch(query);
            }
          }}
          className="input flex-1"
          placeholder={isVietnamese ? "Vd: đền chùa, ramen ngon, hoạt động gia đình..." : "E.g.: temples, best ramen, family activities..."}
        />
        <button
          type="button"
          onClick={() => onSearch(query)}
          disabled={isSearching || !query.trim()}
          className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSearching ? (isVietnamese ? "Đang tìm..." : "Searching...") : isVietnamese ? "Tìm địa điểm" : "Search places"}
        </button>
      </div>

      {searchResults.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((place, index) => (
            <PlaceCard
              key={`${place.name}-${index}`}
              place={place}
              itineraryDays={itineraryDays}
              selectedDayId={selectedDayId}
              locale={locale}
              onDayChange={setSelectedDayId}
              onAddPlace={onAddPlace}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PlaceCard({
  place,
  itineraryDays,
  selectedDayId,
  locale,
  onDayChange,
  onAddPlace,
}: {
  place: AiSearchPlace;
  itineraryDays: ItineraryDay[];
  selectedDayId: string;
  locale: Locale;
  onDayChange: (dayId: string) => void;
  onAddPlace: (dayId: string, timeBlock: TimeBlock, place: AiSearchPlace) => void;
}) {
  return (
    <article className="rounded-lg border border-[#eee5d3] bg-white p-3">
      <h4 className="text-sm font-extrabold text-[#17211b]">{place.name}</h4>
      <p className="mt-1 text-xs leading-5 text-[#615f57]">{place.description}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-[#6d675c]">
        <span className="rounded-full bg-[#f1eadb] px-2 py-0.5">{place.locationName}</span>
        {place.estimatedCost > 0 ? (
          <span className="rounded-full bg-[#f1eadb] px-2 py-0.5">{formatCurrency(place.estimatedCost)}</span>
        ) : null}
      </div>

      {itineraryDays.length > 0 ? (
        <div className="mt-3 border-t border-[#eee5d3] pt-3">
          <select
            value={selectedDayId}
            onChange={(event) => onDayChange(event.target.value)}
            className="input mb-2"
          >
            {itineraryDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.title} — {formatDate(day.date)}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {timeBlocks.map((block) => (
              <button
                key={block.value}
                type="button"
                onClick={() => onAddPlace(selectedDayId, block.value, place)}
                className="flex-1 rounded-md bg-[#f1eadb] px-2 py-1.5 text-[11px] font-bold text-[#574f42] transition hover:bg-[#315f45] hover:text-white"
              >
                {getTimeBlockLabel(block.value, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function TripPreviewPanel({
  draft,
  preview,
  locale,
  onConfirm,
  onCancel,
}: {
  draft: TripDraft;
  preview: AiTripPreview;
  locale: Locale;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(preview.suggestedTitle);
  const text = uiText[locale];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(title);
      }}
      className="m-4 max-h-[calc(100vh-14rem)] overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:m-6 sm:p-5 lg:m-8"
    >
      <p className="text-xs font-bold uppercase text-[#7d776b]">{text.previewTitle}</p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.previewEditTitleLabel}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.destination}</span>
          <p className="text-sm font-semibold">{draft.destination}</p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{text.previewDestinationAbout}</span>
          <p className="text-sm leading-5 text-[#615f57]">{preview.destinationDescription}</p>
        </label>

        <div>
          <p className="mb-2 text-xs font-bold uppercase text-[#756f65]">{text.previewItinerary}</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {preview.itineraryPreview.map((day) => (
              <div key={day.dayNumber} className="rounded-lg border border-[#eee5d3] bg-[#fcf9f4] p-3">
                <p className="text-sm font-bold">
                  {`Ngày ${day.dayNumber}`} — {formatDate(day.date)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#615f57]">{day.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {day.activities.map((activity, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#f1eadb] px-2 py-0.5 text-[10px] font-bold text-[#574f42]"
                    >
                      {getTimeBlockLabel(activity.timeBlock, locale)}: {activity.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[#6d675c]">
          <span>
            {draft.startDate} - {draft.endDate}
          </span>
          <span>
            {draft.adultCount + draft.childCount} {locale === "vi" ? "người" : "people"}
          </span>
          <span>{formatCurrency(draft.budgetAmount)}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[#cfc5b1] px-4 py-3 text-sm font-bold"
        >
          {text.previewBack}
        </button>
        <button type="submit" className="flex-1 rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
          {text.previewConfirm}
        </button>
      </div>
    </form>
  );
}

function ItineraryPanel({
  trip,
  activeDay,
  activeDayId,
  locale,
  onSelectDay,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onMoveActivity,
  searchResults,
  isSearchingPlaces,
  onSearchPlaces,
  onAddPlace,
}: {
  trip: Trip;
  activeDay: Trip["itineraryDays"][number];
  activeDayId: string;
  locale: Locale;
  onSelectDay: (dayId: string) => void;
  onAddActivity: (dayId: string, block: TimeBlock, draft: ActivityDraft) => void;
  onUpdateActivity: (dayId: string, activityId: string, draft: ActivityDraft) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onMoveActivity: (dayId: string, activityId: string, direction: -1 | 1) => void;
  searchResults: AiSearchPlace[];
  isSearchingPlaces: boolean;
  onSearchPlaces: (query: string) => void;
  onAddPlace: (dayId: string, timeBlock: TimeBlock, place: AiSearchPlace) => void;
}) {
  return (
    <section id="planner" className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {trip.itineraryDays.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelectDay(day.id)}
            className={`min-w-36 rounded-lg border px-4 py-3 text-left transition ${
              activeDayId === day.id ? "border-[#17211b] bg-[#17211b] text-white" : "border-[#e3dac8] bg-[#fffdf8]"
            }`}
          >
            <span className="block text-sm font-bold">{day.title}</span>
            <span className={`mt-1 block text-xs font-semibold ${activeDayId === day.id ? "text-white/72" : "text-[#6d6a60]"}`}>
              {formatDate(day.date)}
            </span>
          </button>
        ))}
      </div>

      <SearchPlacesSection
        searchResults={searchResults}
        isSearching={isSearchingPlaces}
        itineraryDays={trip.itineraryDays}
        locale={locale}
        onSearch={onSearchPlaces}
        onAddPlace={onAddPlace}
      />

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        {timeBlocks.map((block) => {
          const activities = activeDay.activities
            .filter((activity) => activity.timeBlock === block.value)
            .sort((first, second) => first.sortOrder - second.sortOrder);

          return (
            <section key={block.value} className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
              <div className="border-b border-[#eee5d3] px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">{getTimeBlockLabel(block.value, locale)}</h3>
                  <span className="rounded-full bg-[#f1eadb] px-2 py-1 text-xs font-bold text-[#61594a]">
                    {activities.length} mục
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onUpdate={(draft) => onUpdateActivity(activeDay.id, activity.id, draft)}
                      onDelete={() => onDeleteActivity(activeDay.id, activity.id)}
                      onMoveUp={() => onMoveActivity(activeDay.id, activity.id, -1)}
                      onMoveDown={() => onMoveActivity(activeDay.id, activity.id, 1)}
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-[#d4c9b5] px-3 py-6 text-center text-sm font-medium text-[#776f61]">
                    Chưa có hoạt động
                  </p>
                )}
                <ActivityForm onSubmit={(draft) => onAddActivity(activeDay.id, block.value, draft)} />
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ActivityCard({
  activity,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  activity: Activity;
  onUpdate: (draft: ActivityDraft) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ActivityForm
        initialDraft={activityToDraft(activity)}
        submitLabel="Lưu"
        onCancel={() => setIsEditing(false)}
        onSubmit={(draft) => {
          onUpdate(draft);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <article className="rounded-lg border border-[#eee5d3] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold leading-5">{activity.title}</h4>
          <p className="mt-1 text-xs font-semibold text-[#756f65]">
            {[activity.startTime, activity.endTime].filter(Boolean).join(" - ") || "Chưa có giờ"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <MiniButton label="↑" onClick={onMoveUp} />
          <MiniButton label="↓" onClick={onMoveDown} />
        </div>
      </div>
      {activity.locationName ? <p className="mt-3 text-sm font-semibold text-[#315f45]">{activity.locationName}</p> : null}
      {activity.estimatedCost > 0 ? (
        <p className="mt-2 text-xs font-bold text-[#756f65]">{formatCurrency(activity.estimatedCost)}</p>
      ) : null}
      {activity.notes ? <p className="mt-2 text-xs leading-5 text-[#6b665d]">{activity.notes}</p> : null}
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#315f45]">
          Sửa
        </button>
        <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
          Xóa
        </button>
      </div>
    </article>
  );
}

function ActivityForm({
  initialDraft,
  submitLabel = "Thêm",
  onCancel,
  onSubmit,
}: {
  initialDraft?: ActivityDraft;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (draft: ActivityDraft) => void;
}) {
  const [draft, setDraft] = useState<ActivityDraft>(initialDraft ?? emptyActivityDraft);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
        setDraft(emptyActivityDraft);
      }}
      className="rounded-lg border border-[#eee5d3] bg-white p-3"
    >
      <div className="space-y-2">
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="input"
          placeholder="Tên hoạt động"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            value={draft.startTime}
            onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
            className="input"
          />
          <input
            type="time"
            value={draft.endTime}
            onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
            className="input"
          />
        </div>
        <input
          value={draft.locationName}
          onChange={(event) => setDraft({ ...draft, locationName: event.target.value })}
          className="input"
          placeholder="Địa điểm / khu vực"
        />
        <input
          type="number"
          min={0}
          value={draft.estimatedCost}
          onChange={(event) => setDraft({ ...draft, estimatedCost: Number(event.target.value) })}
          className="input"
          placeholder="Chi phí"
        />
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          className="input min-h-16 resize-none"
          placeholder="Ghi chú"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#d4c9b5] px-3 py-2 text-xs font-bold">
            Hủy
          </button>
        ) : null}
        <button type="submit" className="rounded-lg bg-[#315f45] px-3 py-2 text-xs font-bold text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CostPanel({
  trip,
  summary,
  locale,
  onAdd,
  onUpdate,
  onDelete,
}: {
  trip: Trip;
  summary: ReturnType<typeof calculateCostSummary>;
  locale: Locale;
  onAdd: (draft: CostDraft) => void;
  onUpdate: (costId: string, name: string, amount: number) => void;
  onDelete: (costId: string) => void;
}) {
  const [draft, setDraft] = useState<CostDraft>(emptyCostDraft);

  return (
    <section id="budget" className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm">
        <h3 className="text-lg font-bold">Thêm chi phí</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(draft);
            setDraft(emptyCostDraft);
          }}
          className="mt-4 space-y-3"
        >
          <Field label="Nhóm chi phí">
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as CostCategory })} className="input">
              {costCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {getCostCategoryLabel(category.value, locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tên chi phí">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="input"
              placeholder="Khách sạn, vé máy bay..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền">
              <input
                type="number"
                min={0}
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
                className="input"
              />
            </Field>
            <Field label="Số lượng">
              <input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Ghi chú">
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              className="input min-h-20 resize-none"
            />
          </Field>
          <button type="submit" className="w-full rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
            Thêm chi phí
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Tổng chi phí" value={formatCurrency(summary.total)} />
          <Metric label="Theo người" value={formatCurrency(summary.perPerson)} />
          <Metric
            label="So với ngân sách"
            value={formatCurrency(summary.budgetDelta)}
            tone={summary.isOverBudget ? "warning" : "default"}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] gap-3 border-b border-[#eee5d3] bg-[#f1eadb] px-4 py-3 text-xs font-bold uppercase text-[#6b6253]">
            <span>Chi phí</span>
            <span>Nhóm</span>
            <span className="text-right">Tổng</span>
            <span />
          </div>
          {trip.costItems.length > 0 ? (
            trip.costItems.map((item) => (
              <CostRow key={item.id} item={item} locale={locale} onUpdate={onUpdate} onDelete={() => onDelete(item.id)} />
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm font-medium text-[#776f61]">Chưa có chi phí.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CostRow({
  item,
  locale,
  onUpdate,
  onDelete,
}: {
  item: CostItem;
  locale: Locale;
  onUpdate: (costId: string, name: string, amount: number) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);

  if (isEditing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onUpdate(item.id, name, amount);
          setIsEditing(false);
        }}
        className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] items-center gap-3 border-b border-[#eee5d3] px-4 py-3"
      >
        <input value={name} onChange={(event) => setName(event.target.value)} className="input" />
        <span className="text-sm font-semibold text-[#6d675c]">{getCostCategoryLabel(item.category, locale)}</span>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="input text-right"
        />
        <button type="submit" className="text-right text-xs font-bold text-[#315f45]">
          Lưu
        </button>
      </form>
    );
  }

  return (
    <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.45fr] items-center gap-3 border-b border-[#eee5d3] px-4 py-3 text-sm last:border-b-0">
      <div>
        <p className="font-bold">{item.name}</p>
        {item.notes ? <p className="mt-1 text-xs text-[#776f61]">{item.notes}</p> : null}
      </div>
      <span className="font-semibold text-[#6d675c]">{getCostCategoryLabel(item.category, locale)}</span>
      <span className="text-right font-bold">{formatCurrency(item.amount * item.quantity)}</span>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#315f45]">
          Sửa
        </button>
        <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
          Xóa
        </button>
      </div>
    </div>
  );
}

function ChecklistPanel({
  trip,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}: {
  trip: Trip;
  onAdd: (title: string) => void;
  onUpdate: (itemId: string, title: string) => void;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const doneCount = trip.checklistItems.filter((item) => item.isDone).length;
  const progress = Math.round((doneCount / Math.max(1, trip.checklistItems.length)) * 100);

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-4 shadow-sm">
        <h3 className="text-lg font-bold">Tiến độ chuẩn bị</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{progress}%</span>
            <span className="font-semibold text-[#6d675c]">
              {doneCount}/{trip.checklistItems.length} mục
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eadfcb]">
            <div className="h-full rounded-full bg-[#315f45]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(title);
            setTitle("");
          }}
          className="mt-5 space-y-3"
        >
          <Field label="Checklist mới">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input"
              placeholder="Thêm mục cần chuẩn bị"
            />
          </Field>
          <button type="submit" className="w-full rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white">
            Thêm checklist
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e3dac8] bg-[#fffdf8] shadow-sm">
        {trip.checklistItems.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
            onUpdate={(nextTitle) => onUpdate(item.id, nextTitle)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ChecklistRow({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onUpdate: (title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  return (
    <div className="flex items-center gap-3 border-b border-[#eee5d3] px-4 py-3 last:border-b-0">
      <input type="checkbox" checked={item.isDone} onChange={onToggle} className="h-5 w-5 accent-[#315f45]" />
      {isEditing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onUpdate(title);
            setIsEditing(false);
          }}
          className="flex min-w-0 flex-1 gap-2"
        >
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" />
          <button type="submit" className="rounded-lg bg-[#17211b] px-3 py-2 text-xs font-bold text-white">
            Lưu
          </button>
        </form>
      ) : (
        <p className={`min-w-0 flex-1 text-sm font-semibold ${item.isDone ? "text-[#999185] line-through" : ""}`}>
          {item.title}
        </p>
      )}
      <button type="button" onClick={() => setIsEditing((value) => !value)} className="text-xs font-bold text-[#315f45]">
        Sửa
      </button>
      <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
        Xóa
      </button>
    </div>
  );
}

function BookingPanel({ trip, locale }: { trip: Trip; locale: Locale }) {
  const text = uiText[locale].booking;
  const partnerLinks = buildPartnerLinks(trip);

  return (
    <section id="booking" className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#756f65]">{text.hotelSearch}</p>
          <h3 className="mt-1 text-xl font-bold">{text.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d675c]">{text.subtitle}</p>
        </div>
        <span className="rounded-full bg-[#f1eadb] px-3 py-1 text-xs font-bold text-[#61594a]">
          {trip.startDate} - {trip.endDate}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {partnerLinks.map((partner) => (
          <article key={partner.id} className="rounded-lg border border-[#eee5d3] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-extrabold">{partner.name}</h4>
                <p className="mt-1 text-xs font-bold uppercase text-[#756f65]">
                  {partner.trackingConfigured ? text.configured : text.notConfigured}
                </p>
              </div>
              <span className="rounded-full bg-[#e8f2df] px-3 py-1 text-xs font-bold text-[#315f45]">
                {trip.adultCount + trip.childCount} {uiText[locale].people}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6d675c]">{partner.note}</p>
            <a
              href={partner.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-[#17211b] px-4 py-3 text-sm font-bold text-white"
            >
              {text.open}
            </a>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-[#756f65]">{text.disclosure}</p>
    </section>
  );
}

function SharePanel({ trip, onToggle }: { trip: Trip; onToggle: () => void }) {
  const [copyStatus, setCopyStatus] = useState("");
  const shareUrl = trip.share ? `/shared/${trip.share.token}` : "";

  return (
    <section id="share" className="max-w-3xl rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold">Link chia sẻ chỉ xem</h3>
          <p className="mt-2 text-sm leading-6 text-[#6d675c]">
            Người nhận link có thể xem lịch trình, chi phí và checklist. Thông tin cá nhân không hiển thị trên trang công khai.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-lg px-4 py-3 text-sm font-bold ${
            trip.share?.isEnabled ? "bg-[#fee8df] text-[#9b3519]" : "bg-[#17211b] text-white"
          }`}
        >
          {trip.share?.isEnabled ? "Tắt link" : "Bật link"}
        </button>
      </div>

      {trip.share ? (
        <div className="mt-5 rounded-lg border border-[#eee5d3] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#756f65]">
            Trạng thái: {trip.share.isEnabled ? "đang bật" : "đang tắt"}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={shareUrl} className="input flex-1" />
            <button
              type="button"
              disabled={!trip.share.isEnabled}
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                setCopyStatus("Đã copy link");
              }}
              className="rounded-lg bg-[#315f45] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          {copyStatus ? <p className="mt-2 text-sm font-bold text-[#315f45]">{copyStatus}</p> : null}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-[#d4c9b5] px-4 py-6 text-center text-sm font-semibold text-[#776f61]">
          Chưa tạo link chia sẻ.
        </p>
      )}
    </section>
  );
}

function StylePicker({
  locale,
  selectedStyles,
  onChange,
}: {
  locale: Locale;
  selectedStyles: TravelStyle[];
  onChange: (style: TravelStyle) => void;
}) {
  const text = uiText[locale];

  return (
    <fieldset>
      <legend className="mb-2 block text-xs font-bold uppercase text-[#756f65]">{text.travelStyle}</legend>
      <div className="flex flex-wrap gap-2">
        {travelStyles.map((style) => {
          const selected = selectedStyles.includes(style.value);

          return (
            <button
              key={style.value}
              type="button"
              onClick={() => onChange(style.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                selected ? "border-[#17211b] bg-[#17211b] text-white" : "border-[#d4c9b5] bg-[#fffdf8] text-[#6d675c]"
              }`}
            >
              {getTravelStyleLabel(style.value, locale)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Metric({
  label,
  value,
  tone = "default",
  dark = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
  dark?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${dark ? "border-white/16 bg-white/12" : "border-[#e3dac8] bg-[#fffdf8]"}`}>
      <p className={`text-xs font-bold uppercase ${dark ? "text-white/68" : "text-[#756f65]"}`}>{label}</p>
      <p className={`mt-2 text-lg font-extrabold ${tone === "warning" ? "text-[#b44625]" : dark ? "text-white" : "text-[#17211b]"}`}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{label}</span>
      {children}
    </label>
  );
}

function MiniButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-[#d4c9b5] bg-white px-2 py-1 text-xs font-bold text-[#6d675c]">
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">Chưa có chuyến đi</h2>
      <p className="mt-2 text-sm font-medium text-[#6d675c]">Tạo chuyến đi đầu tiên từ khung tìm kiếm phía trên.</p>
    </section>
  );
}

function LoadingState({ locale }: { locale: Locale }) {
  const text = uiText[locale];

  return (
    <section className="rounded-lg border border-[#e3dac8] bg-[#fffdf8] p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold">{text.loadingTitle}</h2>
      <p className="mt-2 text-sm font-medium text-[#6d675c]">{text.loadingBody}</p>
    </section>
  );
}

function toggleStyle(styles: TravelStyle[], style: TravelStyle) {
  return styles.includes(style) ? styles.filter((item) => item !== style) : [...styles, style];
}

function activityToDraft(activity: Activity): ActivityDraft {
  return {
    title: activity.title,
    startTime: activity.startTime,
    endTime: activity.endTime,
    locationName: activity.locationName,
    address: activity.address,
    estimatedCost: activity.estimatedCost,
    notes: activity.notes,
  };
}
