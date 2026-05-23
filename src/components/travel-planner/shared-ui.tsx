import type { Activity, TravelStyle } from "@/lib/travel";
import type { ActivityDraft } from "./types";

export function Metric({
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

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase text-[#756f65]">{label}</span>
      {children}
    </label>
  );
}

export function MiniButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-[#d4c9b5] bg-white px-2 py-1 text-xs font-bold text-[#6d675c]">
      {label}
    </button>
  );
}


export function activityToDraft(activity: Activity): ActivityDraft {
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

export function toggleStyle(styles: TravelStyle[], style: TravelStyle) {
  return styles.includes(style) ? styles.filter((item) => item !== style) : [...styles, style];
}
