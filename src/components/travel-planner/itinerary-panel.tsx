import { useState } from "react";
import type { Activity, ItineraryDay, TimeBlock, Trip } from "@/lib/travel";
import { formatCurrency, formatDate, timeBlocks } from "@/lib/travel";
import type { AiSearchPlace } from "@/lib/ai-recommendations";
import type { Locale } from "@/lib/i18n";
import { getTimeBlockLabel, uiText } from "@/lib/i18n";
import type { ActivityDraft } from "./types";
import { emptyActivityDraft } from "./defaults";
import { activityToDraft, MiniButton } from "./shared-ui";

export function SearchPlacesSection({
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
  const text = uiText[locale];

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
          placeholder={text.searchPlacesPlaceholder}
        />
        <button
          type="button"
          onClick={() => onSearch(query)}
          disabled={isSearching || !query.trim()}
          className="rounded-lg bg-[#17211b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSearching ? text.searching : text.searchPlaces}
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

export function PlaceCard({
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
                {locale === "vi" ? day.title : `Day ${day.dayNumber}`} - {formatDate(day.date)}
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

export function ItineraryPanel({
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
  const isVietnamese = locale === "vi";

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
            <span className="block text-sm font-bold">{isVietnamese ? day.title : `Day ${day.dayNumber}`}</span>
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
                    {activities.length} {isVietnamese ? "mục" : "items"}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      locale={locale}
                      onUpdate={(draft) => onUpdateActivity(activeDay.id, activity.id, draft)}
                      onDelete={() => onDeleteActivity(activeDay.id, activity.id)}
                      onMoveUp={() => onMoveActivity(activeDay.id, activity.id, -1)}
                      onMoveDown={() => onMoveActivity(activeDay.id, activity.id, 1)}
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-[#d4c9b5] px-3 py-6 text-center text-sm font-medium text-[#776f61]">
                    {isVietnamese ? "Chưa có hoạt động" : "No activities yet"}
                  </p>
                )}
                <ActivityForm locale={locale} onSubmit={(draft) => onAddActivity(activeDay.id, block.value, draft)} />
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function ActivityCard({
  activity,
  locale,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  activity: Activity;
  locale: Locale;
  onUpdate: (draft: ActivityDraft) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isVietnamese = locale === "vi";

  if (isEditing) {
    return (
      <ActivityForm
        locale={locale}
        initialDraft={activityToDraft(activity)}
        submitLabel={isVietnamese ? "Lưu" : "Save"}
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
            {[activity.startTime, activity.endTime].filter(Boolean).join(" - ") ||
              (isVietnamese ? "Chưa có giờ" : "No time set")}
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
          {isVietnamese ? "Sửa" : "Edit"}
        </button>
        <button type="button" onClick={onDelete} className="text-xs font-bold text-[#a63f22]">
          {isVietnamese ? "Xóa" : "Delete"}
        </button>
      </div>
    </article>
  );
}

export function ActivityForm({
  locale,
  initialDraft,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  locale: Locale;
  initialDraft?: ActivityDraft;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (draft: ActivityDraft) => void;
}) {
  const [draft, setDraft] = useState<ActivityDraft>(initialDraft ?? emptyActivityDraft);
  const isVietnamese = locale === "vi";
  const actionLabel = submitLabel ?? (isVietnamese ? "Thêm" : "Add");

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
          placeholder={isVietnamese ? "Tên hoạt động" : "Activity name"}
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
          placeholder={isVietnamese ? "Địa điểm / khu vực" : "Place / area"}
        />
        <input
          type="number"
          min={0}
          value={draft.estimatedCost}
          onChange={(event) => setDraft({ ...draft, estimatedCost: Number(event.target.value) })}
          className="input"
          placeholder={isVietnamese ? "Chi phí" : "Cost"}
        />
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          className="input min-h-16 resize-none"
          placeholder={isVietnamese ? "Ghi chú" : "Notes"}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#d4c9b5] px-3 py-2 text-xs font-bold">
            {isVietnamese ? "Hủy" : "Cancel"}
          </button>
        ) : null}
        <button type="submit" className="rounded-lg bg-[#315f45] px-3 py-2 text-xs font-bold text-white">
          {actionLabel}
        </button>
      </div>
    </form>
  );
}

