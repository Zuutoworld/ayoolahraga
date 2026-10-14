import { formatDate, formatDist, formatPace, formatSpeed, formatTime } from "./geo";
import type { Activity } from "./store";

/** Ringkasan aktivitas untuk dibagikan. base diinjeksikan agar bisa di-unit-test di Node. */
export function activityText(a: Activity, base: string): string {
  const speed = a.sport === "motor" ? formatSpeed(a.distanceM, a.movingSec) : `${formatPace(a.distanceM, a.movingSec)}/km`;
  return [
    `${a.title} — ${a.owner}`,
    `AyoOlahraga: ${formatDist(a.distanceM)} • ${formatTime(a.movingSec)} • ${speed}`,
    formatDate(a.startedAt),
    `Lihat di aplikasi: ${base}`,
  ].join("\n");
}

export function waShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function openWaShare(text: string): void {
  window.open(waShareUrl(text), "_blank", "noopener");
}
