"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  TimeBlock,
  Trip,
  TripDraft,
  calculateCostSummary,
} from "@/lib/travel";
import { ApiRequestError, travelApi } from "@/lib/api";
import type { AiRecommendation, AiSearchPlace, AiTripPreview } from "@/lib/ai-recommendations";
import { Locale, uiText } from "@/lib/i18n";
import { BookingPanel, SharePanel } from "@/components/travel-planner/booking-sharing";
import { ChecklistPanel } from "@/components/travel-planner/checklist-panel";
import { CostPanel } from "@/components/travel-planner/cost-panel";
import { emptyTripDraft } from "@/components/travel-planner/defaults";
import { ItineraryPanel } from "@/components/travel-planner/itinerary-panel";
import { EmptyState, GuestDashboardState, LoadingState } from "@/components/travel-planner/planner-states";
import { TopNavigation } from "@/components/travel-planner/top-navigation";
import { TemplateStarterPanel, TripDraftForm, TripPreviewPanel } from "@/components/travel-planner/trip-creation";
import { AiRecommendationsPanel, Tabs, TripEditPanel, TripListCard, TripOverview } from "@/components/travel-planner/trip-list";
import type { ActivityDraft, CostDraft, Tab } from "@/components/travel-planner/types";
import { usePlannerData } from "@/components/travel-planner/use-planner-data";

const destinationImages = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
];

export function TravelPlannerApp() {
  const [localTrips, setLocalTrips] = useState<Trip[] | null>(null);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [activeDayId, setActiveDayId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("itinerary");
  const [tripDraft, setTripDraft] = useState<TripDraft>(emptyTripDraft);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
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
  const text = uiText[locale];
  const plannerData = usePlannerData();
  const isLoadingTrips = plannerData.isLoading;
  const currentUser = plannerData.currentUser;
  const templates = plannerData.templates;
  const trips = localTrips ?? plannerData.trips;
  const loadStatusMessage =
    plannerData.error && !isUnauthorizedError(plannerData.error)
      ? plannerData.error instanceof Error
        ? plannerData.error.message
        : uiText.vi.loadError
      : null;
  const visibleStatusMessage = statusMessage ?? loadStatusMessage;

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

  function commitTrips(nextTrips: Trip[]) {
    setLocalTrips(nextTrips);
    void plannerData.mutateTrips(nextTrips, { revalidate: false });
  }

  function updateTrips(updater: (currentTrips: Trip[]) => Trip[]) {
    commitTrips(updater(trips));
  }

  function replaceTrip(nextTrip: Trip) {
    updateTrips((currentTrips) => currentTrips.map((trip) => (trip.id === nextTrip.id ? nextTrip : trip)));
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
      if (isUnauthorizedError(error)) {
        redirectToSignIn();
        return;
      }

      setStatusMessage(error instanceof Error ? error.message : text.saveError);
    }
  }

  function handleFormPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handlePreviewTrip(tripDraft);
  }

  async function handlePreviewTrip(draft: TripDraft) {
    if (!currentUser) {
      redirectToSignIn();
      return;
    }

    setStatusMessage(null);
    setIsGeneratingPreview(true);

    try {
      const result = await travelApi.previewTrip(draft);
      setTripPreview(result.preview);
      setIsPreviewing(true);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        redirectToSignIn();
        return;
      }

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
      updateTrips((currentTrips) => [trip, ...currentTrips]);
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
    if (!currentUser) {
      redirectToSignIn();
      return;
    }

    void runMutation(async () => {
      const result = await travelApi.useTemplate(templateId);
      const trip = await travelApi.getTrip(result.tripId);
      updateTrips((currentTrips) => [trip, ...currentTrips.filter((item) => item.id !== trip.id)]);
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
      commitTrips(nextTrips);

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
      if (isUnauthorizedError(error)) {
        redirectToSignIn();
        return;
      }

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
      <TopNavigation locale={locale} currentUser={currentUser} onLocaleChange={setLocale} />

      {isLoadingTrips || visibleStatusMessage ? (
        <section className="mx-auto max-w-[1480px] px-4 pb-2 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[#ddd5c4] bg-[#fffdf8] px-4 py-3 text-sm font-bold text-[#61594a] shadow-sm">
            {isLoadingTrips ? text.syncing : visibleStatusMessage}
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
                locale={locale}
                onAdd={addChecklist}
                onUpdate={updateChecklist}
                onToggle={toggleChecklist}
                onDelete={deleteChecklist}
              />
            ) : null}

            {activeTab === "booking" ? <BookingPanel trip={selectedTrip} locale={locale} /> : null}

            {activeTab === "share" ? <SharePanel trip={selectedTrip} locale={locale} onToggle={toggleShare} /> : null}
          </section>
        ) : currentUser ? (
          <EmptyState locale={locale} />
        ) : (
          <GuestDashboardState locale={locale} />
        )}
      </section>
    </main>
  );
}

function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function redirectToSignIn() {
  window.location.assign(`/signin?callbackUrl=${encodeURIComponent("/")}`);
}
