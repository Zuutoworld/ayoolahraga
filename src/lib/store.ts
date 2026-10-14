import { calcSplits, routeHash, totalDistanceM } from "./geo";
import type { Split, TrackPoint } from "./geo";

export type Sport = "run" | "ride" | "walk" | "workout" | "motor";
export type Privacy = "friends" | "private" | "public";

export interface Comment {
  id: string;
  user: string;
  text: string;
  at: number;
}

export interface Activity {
  id: string;
  owner: string; // nama pemilik
  mine: boolean;
  sport: Sport;
  title: string;
  desc?: string;
  startedAt: number;
  durationSec: number;
  movingSec: number;
  distanceM: number;
  points: TrackPoint[];
  splits: Split[];
  routeHash: string;
  privacy: Privacy;
  kudos: string[]; // nama yg kudos
  comments: Comment[];
  createdAt: number;
}

export interface Friend {
  id: string;
  name: string;
}

const K_ACT = "ayo_activities_v1";
const K_PROFILE = "ayo_profile_v1";
const K_FRIENDS = "ayo_friends_v1";
const K_DRAFT = "ayo_draft_v1";

export function sportLabel(s: Sport): string {
  if (s === "run") return "Lari";
  if (s === "ride") return "Sepeda";
  if (s === "workout") return "Latihan";
  if (s === "motor") return "Motor";
  return "Jalan";
}

/** Batas kecepatan wajar per olahraga (m/detik) untuk filter glitch GPS. */
export function maxSpeedFor(sport: Sport): number {
  if (sport === "motor") return 55; // ~198 km/jam
  if (sport === "ride") return 25; // ~90 km/jam
  if (sport === "walk") return 8;
  return 15; // lari & lainnya ~54 km/jam
}

/** Ambang auto-pause per olahraga (m/detik). */
export function pauseSpeedFor(sport: Sport): number {
  if (sport === "motor") return 1.5; // macet/lampu merah tetap kehitung berhenti
  return 0.5;
}
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage penuh -> abaikan, app tetap jalan offline di memori
  }
}

export function loadActivities(): Activity[] {
  const list = read<Activity[]>(K_ACT, []);
  if (list.length > 0) return list.sort((a, b) => b.startedAt - a.startedAt);
  const seeded = seed();
  write(K_ACT, seeded);
  return seeded;
}

export function saveActivities(list: Activity[]): void {
  write(K_ACT, list);
}

export function loadName(): string {
  return read<string>(K_PROFILE, "King");
}

export function saveName(name: string): void {
  write(K_PROFILE, name);
}

export function loadFriends(): Friend[] {
  return read<Friend[]>(K_FRIENDS, []);
}

export function saveFriends(f: Friend[]): void {
  write(K_FRIENDS, f);
}

export interface Draft {
  sport: Sport;
  startedAt: number;
  points: TrackPoint[];
  pausedTotalMs: number;
}

export function saveDraft(d: Draft | null): void {
  if (!d) localStorage.removeItem(K_DRAFT);
  else write(K_DRAFT, d);
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(K_DRAFT);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d.points || d.points.length === 0) return null;
    return d;
  } catch {
    return null;
  }
}

export function buildActivity(
  owner: string,
  sport: Sport,
  title: string,
  startedAt: number,
  endedAt: number,
  points: TrackPoint[],
  privacy: Privacy,
  desc?: string,
): Activity {
  const durationSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));
  const pausedMs = pausedMsTotal(points);
  const movingSec = Math.max(1, Math.round((endedAt - startedAt - pausedMs) / 1000));
  const distanceM = totalDistanceM(points);
  return {
    id: uid(),
    owner,
    mine: true,
    sport,
    title: title.trim() || defaultTitle(sport, startedAt),
    desc,
    startedAt,
    durationSec,
    movingSec,
    distanceM,
    points,
    splits: calcSplits(points),
    routeHash: routeHash(points),
    privacy,
    kudos: [],
    comments: [],
    createdAt: Date.now(),
  };
}

/** Catat latihan tanpa GPS (push up, sit up, dll) sebagai aktivitas. */
export function logWorkoutActivity(
  owner: string,
  title: string,
  durationMin: number,
  desc?: string,
): Activity {
  const now = Date.now();
  const dur = Math.max(1, Math.round(durationMin * 60));
  return {
    id: uid(),
    owner,
    mine: true,
    sport: "workout",
    title: title.trim() || defaultTitle("workout", now),
    desc,
    startedAt: now - dur * 1000,
    durationSec: dur,
    movingSec: dur,
    distanceM: 0,
    points: [],
    splits: [],
    routeHash: "workout",
    privacy: "friends",
    kudos: [],
    comments: [],
    createdAt: now,
  };
}

function pausedMsTotal(points: TrackPoint[]): number {
  let ms = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].paused) ms += points[i].t - points[i - 1].t;
  }
  return ms;
}

function defaultTitle(sport: Sport, at: number): string {
  const label = sportLabel(sport);
  const day = new Date(at).toLocaleDateString("id-ID", { weekday: "long" });
  const tod = new Date(at).getHours() < 11 ? "Pagi" : new Date(at).getHours() < 16 ? "Siang" : "Sore";
  return `${label} ${tod} - ${day}`;
}

/** Best pace per label dari aktivitas milik sendiri. */
export function calcPRs(mine: Activity[]): { label: string; paceSec: number; actId: string }[] {
  const out: { label: string; paceSec: number; actId: string }[] = [];
  const labels = [1, 5, 10];
  for (const km of labels) {
    let best: { paceSec: number; actId: string } | null = null;
    for (const a of mine) {
      if (a.distanceM < km * 1000 - 50) continue;
      // pace rata-rata km pertama s.d. km target dari splits
      const seg = a.splits.slice(0, km);
      if (seg.length < km) continue;
      const avg = seg.reduce((s, x) => s + x.paceSec, 0) / km;
      if (!best || avg < best.paceSec) best = { paceSec: avg, actId: a.id };
    }
    if (best) out.push({ label: `${km}K`, paceSec: best.paceSec, actId: best.actId });
  }
  return out;
}

function seed(): Activity[] {
  const now = Date.now();
  const mk = (i: number, lat: number, lng: number, km: number, min: number): Activity => {
    const pts: TrackPoint[] = [];
    const n = 60;
    for (let k = 0; k <= n; k++) {
      pts.push({
        lat: lat + (k / n) * 0.02 * (i === 0 ? 1 : -1),
        lng: lng + (k / n) * 0.015,
        t: now - 86400000 * (i + 1) + (k / n) * min * 60000,
        acc: 8,
      });
    }
    const dist = km * 1000;
    return {
      id: uid() + i,
      owner: i === 0 ? "Anda (Contoh)" : "Teman (Contoh)",
      mine: i === 0,
      sport: "run",
      title: i === 0 ? "Lari Pagi - Contoh" : "Lari Santai Bareng",
      startedAt: now - 86400000 * (i + 1),
      durationSec: min * 60,
      movingSec: min * 60,
      distanceM: dist,
      points: pts,
      splits: calcSplits(pts),
      routeHash: routeHash(pts),
      privacy: "friends",
      kudos: i === 1 ? ["Anda (Contoh)"] : [],
      comments: [],
      createdAt: now - 86400000 * (i + 1),
    };
  };
  return [mk(0, -6.2, 106.8, 5, 30), mk(1, -6.21, 106.81, 3, 20)];
}
