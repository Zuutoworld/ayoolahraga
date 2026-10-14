export interface TrackPoint {
  lat: number;
  lng: number;
  t: number; // epoch ms
  acc: number; // accuracy meters
  paused?: boolean;
  gap?: boolean;
  coarse?: boolean; // akurasi 50-100 m, direkam darurat saat sinyal lama hilang
  mock?: boolean;
}

export interface Split {
  km: number;
  paceSec: number; // sec per km
  durationSec: number;
}

export function haversineM(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Jarak total meter, skip point paused & gap. */
export function totalDistanceM(points: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const q = points[i - 1];
    if (p.paused || q.paused || p.gap) continue;
    d += haversineM(q, p);
  }
  return d;
}

/** Klasifikasi titik GPS baru. pure function agar bisa di-unit-test. */
export type GpsVerdict = "good" | "coarse" | "drop";
export function classifyGps(
  prevKeptT: number | null,
  t: number,
  acc: number,
  speedMps: number | null,
  distFromPrevM: number | null,
): GpsVerdict {
  if (!Number.isFinite(acc)) return "drop";
  if (acc <= 50) {
    // jitter clamp: nyaris diam + geser di bawah setengah akurasi = drift, bukan gerak
    if (
      distFromPrevM !== null &&
      speedMps !== null &&
      speedMps < 1 &&
      distFromPrevM < Math.max(4, acc * 0.5)
    ) {
      return "drop";
    }
    return "good";
  }
  // 50-100 m: terima darurat kalau sudah >15 dtk tanpa titik bagus (kota/gang sempit).
  // Tanpa ini garis jadi lurus karena titik yang tersisa terlalu jarang (bug foto 1).
  if (acc <= 100 && (prevKeptT === null || t - prevKeptT > 15_000)) return "coarse";
  return "drop";
}

/** Lompatan mustahil (>54 km/jam untuk lari/sepeda santai) = glitch GPS. */
export function isImpossibleJump(distM: number, dtSec: number): boolean {
  return dtSec >= 1 && distM / dtSec > 15;
}

export function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatPace(distM: number, durSec: number): string {
  if (distM < 50 || durSec < 5) return "-'--\"";
  const perKm = durSec / (distM / 1000);
  const m = Math.floor(perKm / 60);
  const s = Math.floor(perKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

export function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Splits per 1km dari points (pakai jarak kumulatif). */
export function calcSplits(points: TrackPoint[]): Split[] {
  const splits: Split[] = [];
  let acc = 0;
  let kmStart = points.length > 0 ? points[0].t : 0;
  let kmIdx = 1;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const q = points[i - 1];
    if (p.paused || q.paused || p.gap) {
      kmStart += p.t - q.t; // jangan hitung waktu gap/paused ke pace
      continue;
    }
    acc += haversineM(q, p);
    if (acc >= 1000) {
      const dur = (p.t - kmStart) / 1000;
      splits.push({ km: kmIdx, paceSec: dur, durationSec: dur });
      kmIdx++;
      acc = 0;
      kmStart = p.t;
    }
  }
  return splits;
}

/** Hash rute sederhana buat leaderboard teman (grid 100m + jarak). */
export function routeHash(points: TrackPoint[]): string {
  if (points.length === 0) return "empty";
  const g = (n: number) => Math.round(n * 1000) / 1000;
  const a = points[0];
  const b = points[points.length - 1];
  const d = Math.round(totalDistanceM(points) / 500);
  return `${g(a.lat)},${g(a.lng)}-${g(b.lat)},${g(b.lng)}-${d}`;
}

export function toGpx(name: string, points: TrackPoint[]): string {
  const trk = points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AyoOlahraga" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk><name>${name.replace(/[<>&]/g, "")}</name><trkseg>\n${trk}\n  </trkseg></trk></gpx>`;
}
