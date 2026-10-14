/* Self-test logika AyoOlahraga. Jalankan: npm test (atau npx tsx scripts/selftest.ts)
   Menguji alur yang dilaporkan rusak: tracking -> simpan -> muncul di Feed. */
import {
  calcSplits,
  classifyGps,
  formatDist,
  formatPace,
  formatTime,
  haversineM,
  isImpossibleJump,
  routeHash,
  toGpx,
  totalDistanceM,
} from "../src/lib/geo";
import {
  buildActivity,
  calcPRs,
  loadActivities,
  logWorkoutActivity,
  saveActivities,
  sportLabel,
} from "../src/lib/store";
import { calcCalories, loadDiets, loadWorkouts } from "../src/lib/guides";
import { activityText, waShareUrl } from "../src/lib/share";
import { coverTiles, fitZoom, mercPx, viewOrigin } from "../src/lib/slippy";
import { layoutRoute, layoutRouteMerc } from "../src/lib/shareCard";
import { MOVE_IDS, jointsOf, poseAngles } from "../src/components/MoveArt";
import {
  buildProgram,
  clearProgram,
  isAllDone,
  loadLog,
  loadProgram,
  markLogged,
  saveProgram,
  tasksFor,
  toggleTask,
} from "../src/lib/program";
import {
  currentUser,
  deleteUser,
  listUsers,
  login,
  logout,
  register,
  setPassword,
  updateUser,
} from "../src/lib/auth";

// ---- stub localStorage (aplikasi aslinya jalan di browser) ----
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;

let pass = 0;
function ok(cond: boolean, name: string, extra?: unknown): void {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    console.error(`FAIL ${name}`, extra ?? "");
    process.exitCode = 1;
  }
}

/* ---------- geo ---------- */
ok(Math.abs(haversineM({ lat: -6.2, lng: 106.8, t: 0, acc: 5 }, { lat: -6.19, lng: 106.8, t: 1000, acc: 5 }) - 1112) < 5, "haversine 0.01° ≈ 1112 m");

const base = Date.now();
const line = Array.from({ length: 11 }, (_, i) => ({
  lat: -6.2 + i * 0.001,
  lng: 106.8,
  t: base + i * 60_000,
  acc: 8,
}));
const dLine = totalDistanceM(line);
const withPaused = [...line.slice(0, 5), { ...line[5], paused: true }, ...line.slice(6)];
ok(totalDistanceM(withPaused) < dLine, "titik paused tidak dihitung");
const withGap = [...line.slice(0, 5), { ...line[5], gap: true }, ...line.slice(6)];
ok(totalDistanceM(withGap) < dLine, "titik gap tidak dihitung");

ok(formatDist(500) === "500 m" && formatDist(2500) === "2.50 km", "formatDist");
ok(formatPace(5000, 1800) === `6'00"`, "formatPace 5K/30mnt", formatPace(5000, 1800));
ok(formatTime(3661) === "1:01:01" && formatTime(125) === "2:05", "formatTime");

// simulasi lari 2 km dalam 12 menit -> 2 split @ ~360 dtk
const run2k: { lat: number; lng: number; t: number; acc: number }[] = [];
for (let i = 0; i <= 40; i++) {
  run2k.push({ lat: -6.2 + i * 0.00045, lng: 106.8, t: base + i * 18_000, acc: 8 });
}
const splits = calcSplits(run2k);
ok(splits.length === 2 && Math.abs(splits[0].paceSec - 360) < 30, "calcSplits 2 km", splits);
ok(routeHash(run2k) === routeHash(run2k), "routeHash deterministik");
ok(routeHash(run2k) !== routeHash([...run2k].reverse()), "routeHash beda rute beda hash");
ok(toGpx("Tes", run2k.slice(0, 2)).includes("<trkpt"), "toGpx berisi trkpt");

// filter GPS: titik bagus lolos, drift diam dibuang, darurat coarse saat starving
ok(classifyGps(null, 1000, 8, null, null) === "good", "gps bagus diterima");
ok(classifyGps(0, 60_000, 8, 0.2, 2) === "drop", "drift diam dibuang (jitter clamp)");
ok(classifyGps(0, 60_000, 8, 2.5, 30) === "good", "gerak nyata tidak kena clamp");
ok(classifyGps(0, 60_000, 80, 1.5, 40) === "coarse", "akurasi 80 starving 60 dtk -> coarse");
ok(classifyGps(55_000, 60_000, 80, 1.5, 40) === "drop", "akurasi 80 tapi baru 5 dtk -> drop");
ok(classifyGps(null, 1000, 150, null, null) === "drop", "akurasi >100 dibuang");
ok(classifyGps(null, 1000, NaN, null, null) === "drop", "akurasi invalid dibuang");
ok(isImpossibleJump(200, 1) === true, "lompatan 200 m/dtk mustahil");
ok(isImpossibleJump(10, 2) === false, "10 m/2 dtk wajar");

/* ---------- store: alur tracking -> simpan -> feed ---------- */
const seeded = loadActivities();
ok(seeded.length === 2, "seed awal 2 aktivitas contoh");

// tiru hasil tracker 1 menit: 60 titik, total ~600 m
const now = Date.now();
const pts = Array.from({ length: 60 }, (_, i) => ({
  lat: -6.2 + i * 0.00001,
  lng: 106.8 + i * 0.00001,
  t: now - 60_000 + i * 1000,
  acc: 8,
}));
const act = buildActivity("king", "run", "Tes 1 Menit", now - 60_000, now, pts, "friends", "tes");
ok(act.distanceM > 50, "buildActivity menghitung jarak", act.distanceM);
ok(act.durationSec === 60 && act.movingSec === 60, "buildActivity durasi 60 dtk");
ok(act.splits.length === 0, "di bawah 1 km belum ada split");
ok(act.routeHash.length > 0 && act.kudos.length === 0, "routeHash + kudos kosong");

saveActivities([act, ...seeded]);
const reloaded = loadActivities();
ok(reloaded.some((a) => a.id === act.id), "aktivitas tersimpan & bisa dimuat ulang");

// sesi super pendek (1 titik GPS, 1 detik) tetap valid dan layak feed — tanpa buang otomatis
const tiny = buildActivity("king", "run", "Tes 1 Detik", now - 1000, now, [pts[0]], "friends");
ok(tiny.distanceM === 0 && tiny.durationSec === 1 && tiny.points.length === 1, "aktivitas 1 detik tetap valid");
saveActivities([tiny, ...reloaded]);
ok(loadActivities().some((a) => a.id === tiny.id), "aktivitas 1 detik ikut tersimpan");

// tiru normalisasi milik-siapa di App.tsx (case-insensitive)
const uname = "king";
const view = reloaded.map((a) => ({
  ...a,
  mine: a.owner.toLowerCase() === uname || a.owner.toLowerCase() === "king",
}));
const mineFeed = view.filter((a) => a.mine);
const allFeed = view.filter((a) => a.privacy !== "private" || a.mine);
ok(mineFeed.some((a) => a.id === act.id), "hasil tracking muncul di filter Punyaku");
ok(allFeed.some((a) => a.id === act.id), "hasil tracking muncul di filter Semua");

const w = logWorkoutActivity("king", "Push Up Pemula", 10, "selesai");
ok(w.sport === "workout" && w.distanceM === 0 && w.points.length === 0, "logWorkout tanpa GPS");
ok(sportLabel("workout") === "Latihan" && sportLabel("run") === "Lari", "sportLabel");

// berbagi WA: teks ringkas + URL wa.me valid
const shareTxt = activityText(act, "https://ayo.example");
ok(
  shareTxt.includes("Tes 1 Menit") && shareTxt.includes("king") && shareTxt.includes("https://ayo.example"),
  "teks berbagi memuat judul, pemilik, tautan",
  shareTxt,
);
const waUrl = waShareUrl(shareTxt);
ok(
  waUrl.startsWith("https://wa.me/?text=") && decodeURIComponent(waUrl.slice("https://wa.me/?text=".length)) === shareTxt,
  "URL wa.me roundtrip utuh",
);

// layout kartu berbagi: proporsional di dalam kanvas + padding
ok(layoutRoute([], 960, 560, 70) === null, "rute kosong -> null");
ok(layoutRoute([{ lat: -6.2, lng: 106.8, t: 0, acc: 5 }], 960, 560, 70)?.[0].x === 480, "satu titik di tengah");
const fit = layoutRoute(run2k, 960, 560, 70);
ok(
  !!fit &&
    fit.length === run2k.length &&
    fit.every((p) => p.x >= 70 - 1 && p.x <= 960 - 70 + 1 && p.y >= 70 - 1 && p.y <= 560 - 70 + 1),
  "semua titik di dalam padding",
);
ok(!!fit && fit[0].y > fit[fit.length - 1].y, "arah utara tetap di atas");

// matematika peta OSM: Jakarta z15 -> tile yang benar, cakupan pas, proyeksi di kanvas
const jkt = mercPx(-6.2, 106.8, 15);
ok(Math.floor(jkt.x / 256) === 26105 && Math.floor(jkt.y / 256) === 16949, "tile Jakarta z15", jkt);
const b2k = {
  minLat: Math.min(...run2k.map((p) => p.lat)),
  maxLat: Math.max(...run2k.map((p) => p.lat)),
  minLng: Math.min(...run2k.map((p) => p.lng)),
  maxLng: Math.max(...run2k.map((p) => p.lng)),
};
const z2k = fitZoom(b2k, 960, 560, 60);
ok(z2k >= 10 && z2k <= 18, "fitZoom wajar untuk rute 2 km", z2k);
const tiles2k = coverTiles(b2k, z2k);
ok(tiles2k.length >= 1 && tiles2k.length <= 30, "jumlah tile wajar", tiles2k.length);
const org = viewOrigin(b2k, z2k, 960, 560);
const mercPts = layoutRouteMerc(run2k, { canvas: null as never, z: z2k, ox: org.ox, oy: org.oy });
ok(
  mercPts.length === run2k.length &&
    mercPts.every((p) => p.x >= -1 && p.x <= 961 && p.y >= -1 && p.y <= 561),
  "rute mercator pas di panel peta",
);

// PR: 5K 30 mnt vs 5K 25 mnt -> yang tercepat menang (titik rapat biar presisi)
const mk = (id: string, distM: number, secs: number, start: number) => {
  const n = 501;
  const p = Array.from({ length: n }, (_, i) => ({
    lat: -6.2 + (i / (n - 1)) * (distM / 111320),
    lng: 106.8,
    t: start + (i / (n - 1)) * secs * 1000,
    acc: 8,
  }));
  return buildActivity("king", "run", id, start, start + secs * 1000, p, "friends");
};
const prs = calcPRs([mk("lambat", 5050, 1800, now - 200_000), mk("cepat", 5050, 1500, now - 100_000)]);
const pr5k = prs.find((p) => p.label === "5K");
ok(!!pr5k && Math.abs(pr5k.paceSec - 300) < 20, "calcPRs ambil pace tercepat", prs);

/* ---------- guides ---------- */
ok(loadWorkouts().length >= 6, "seed >= 6 panduan latihan");
ok(loadDiets().length >= 4, "seed >= 4 panduan diet");
for (const g of loadWorkouts()) {
  ok(Array.isArray(g.moves) && g.moves.length > 0 && g.moves.every((m) => MOVE_IDS.includes(m)), `panduan ${g.id} punya ilustrasi valid`, g.moves);
}
const cal = calcCalories(79, 170, 25, true, 1.375);
ok(cal.bmr === 1733 && cal.tdee === 2382 && cal.cut === 1882, "kalkulator kalori 79kg", cal);

/* ---------- program harian ---------- */
const prog = buildProgram({ weightKg: 79, heightCm: 161, age: 23, male: true, goal: "diet" });
ok(prog.targetKcal === 1819 && prog.proteinMin === 126 && prog.proteinMax === 158, "program diet: target + protein", prog);
const progPostur = buildProgram({ weightKg: 79, heightCm: 161, age: 23, male: true, goal: "postur" });
ok(progPostur.targetKcal === 2319, "program postur: maintenance", progPostur);

const monday = new Date(2026, 9, 12); // Senin
const sunday = new Date(2026, 9, 11); // Minggu
const tMon = tasksFor(prog, monday);
const tMon2 = tasksFor(prog, monday);
ok(JSON.stringify(tMon) === JSON.stringify(tMon2), "tugas deterministik per tanggal");
ok(tMon.some((t) => t.id === "strength") && tMon.some((t) => t.id === "walk30"), "senin diet: strength + jalan");
const tSun = tasksFor(prog, sunday);
ok(tSun.some((t) => t.id === "walk20") && !tSun.some((t) => t.id === "strength"), "minggu: jalan santai tanpa strength");
const tPos = tasksFor(progPostur, monday);
ok(tPos.some((t) => t.id === "circuit") && tPos.some((t) => t.id === "habit-sit"), "postur: sirkuit + kebiasaan duduk");

saveProgram("u1", prog);
ok(loadProgram("u1")?.targetKcal === 1819, "program tersimpan & dimuat");
let lg = loadLog("u1", monday);
ok(lg.done.length === 0 && lg.logged === false, "log hari baru kosong");
for (const t of tMon) lg = toggleTask("u1", t.id, monday);
ok(isAllDone(tMon, lg) === true, "semua tugas selesai terdeteksi");
lg = markLogged("u1", monday);
ok(loadLog("u1", monday).logged === true, "status catat-feed tersimpan");
const nextDay = loadLog("u1", new Date(2026, 9, 13));
ok(nextDay.done.length === 0 && nextDay.logged === false, "hari baru reset otomatis");
clearProgram("u1");
ok(loadProgram("u1") === null, "program bisa dihentikan");

// geometri ilustrasi: semua sendi di dalam kanvas, panjang segmen terjaga
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
for (const id of MOVE_IDS) {
  for (const ph of [0, 0.5, 1]) {
    const pose = poseAngles(id, ph);
    ok(pose !== null, `pose ${id} ada`);
    if (!pose) continue;
    const j = jointsOf(pose);
    const pts = [j.hip, j.shoulder, j.head, j.elbow, j.hand, j.knee, j.foot];
    ok(
      pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -30 && p.x <= 210 && p.y >= -35 && p.y <= 195),
      `sendi ${id}@${ph} di dalam kanvas`,
      j,
    );
    ok(
      Math.abs(dist(j.hip, j.shoulder) - 40) < 0.6 &&
        Math.abs(dist(j.shoulder, j.elbow) - 24) < 0.6 &&
        Math.abs(dist(j.elbow, j.hand) - 22) < 0.6 &&
        Math.abs(dist(j.hip, j.knee) - 30) < 0.6 &&
        Math.abs(dist(j.knee, j.foot) - 30) < 0.6,
      `panjang segmen ${id}@${ph} terjaga`,
    );
  }
}
// tugas program hanya memakai id ilustrasi yang ada
for (const d of [new Date(2026, 9, 12), new Date(2026, 9, 11)]) {
  for (const t of [...tasksFor(prog, d), ...tasksFor(progPostur, d)]) {
    ok(t.moves.every((m) => MOVE_IDS.includes(m)), `tugas ${t.id} ilustrasi valid`, t.moves);
  }
}

/* ---------- auth ---------- */
const users0 = listUsers();
ok(users0.some((u) => u.username === "admin" && u.role === "admin"), "admin bawaan ada");

const r1 = await register("king", "King", "rahasia123");
ok(r1.ok && !!r1.user, "register berhasil");
ok((await register("king", "King Lagi", "xxxxxx")).ok === false, "username duplikat ditolak");
ok((await register("budi", "Budi", "123")).ok === false, "password pendek ditolak");
ok((await login("king", "salah")).ok === false, "password salah ditolak");
ok((await login("tidakada", "apapun")).ok === false, "username asing ditolak");
const r2 = await login("king", "rahasia123");
ok(r2.ok && currentUser()?.username === "king", "login + sesi berjalan");
updateUser(r2.user!.id, { weightKg: 79 });
ok(currentUser()?.weightKg === 79, "update profil tersimpan");
await setPassword(r2.user!.id, "baru4567");
logout();
ok(currentUser() === null, "logout menghapus sesi");
ok((await login("king", "baru4567")).ok === true, "login dengan password baru");
const del = deleteUser(r2.user!.id);
ok(!del.some((u) => u.username === "king"), "hapus user");

console.log(`\n${pass} asersi lolos${process.exitCode ? " (ADA YANG GAGAL)" : ""}.`);
