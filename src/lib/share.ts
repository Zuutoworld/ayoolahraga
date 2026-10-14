import { formatDate, formatDist, formatPace, formatTime } from "./geo";
import type { Activity } from "./store";

/** Ringkasan aktivitas untuk dibagikan. base diinjeksikan agar bisa di-unit-test di Node. */
export function activityText(a: Activity, base: string): string {
  return [
    `${a.title} — ${a.owner}`,
    `AyoOlahraga: ${formatDist(a.distanceM)} • ${formatTime(a.movingSec)} • pace ${formatPace(a.distanceM, a.movingSec)}/km`,
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
