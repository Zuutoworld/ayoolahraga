import { calcCalories } from "./guides";

export type ProgramGoal = "diet" | "postur";

export interface ProgramTask {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  kcal: number;
  kind: "gerak" | "makan" | "pulih";
  moves: string[]; // id ilustrasi gerakan (lihat MoveArt)
}

export interface Program {
  weightKg: number;
  heightCm: number;
  age: number;
  male: boolean;
  goal: ProgramGoal;
  targetKcal: number;
  proteinMin: number;
  proteinMax: number;
  createdAt: number;
}

export interface DayLog {
  date: string; // YYYY-MM-DD lokal
  done: string[];
  logged: boolean; // sudah dicatat ke Feed hari ini
}

export const GOAL_LABEL: Record<ProgramGoal, string> = {
  diet: "Turun Berat Badan",
  postur: "Perbaiki Postur Tubuh",
};

const keyP = (uid: string) => `ayo_program_${uid}`;
const keyL = (uid: string) => `ayo_program_log_${uid}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function todayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function buildProgram(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  male: boolean;
  goal: ProgramGoal;
}): Program {
  const { tdee, cut } = calcCalories(input.weightKg, input.heightCm, input.age, input.male, 1.375);
  return {
    ...input,
    targetKcal: input.goal === "diet" ? cut : tdee,
    proteinMin: Math.round(input.weightKg * 1.6),
    proteinMax: Math.round(input.weightKg * 2),
    createdAt: Date.now(),
  };
}

const WALK30: ProgramTask = {
  id: "walk30",
  title: "Jalan Cepat 30 Menit",
  detail: "5 menit santai, 20 menit jalan cepat (masih bisa bicara kalimat pendek), 5 menit pendinginan. Target 7000–9000 langkah hari ini.",
  minutes: 30,
  kcal: 140,
  kind: "gerak",
  moves: ["walk"],
};

const STRENGTH: ProgramTask = {
  id: "strength",
  title: "Latihan Beban Tubuh 20 Menit",
  detail: "Squat 3x12, push up lutut 3x8, glute bridge 3x12, plank 3x30 detik, mountain climber 2x20. Istirahat 60 detik antar set.",
  minutes: 20,
  kcal: 150,
  kind: "gerak",
  moves: ["squat", "pushup-knee", "glute-bridge", "plank", "climber"],
};

const CORE: ProgramTask = {
  id: "core",
  title: "Latihan Core 12 Menit",
  detail: "Crunch 3x12, sit up 3x10, russian twist 3x12 (6+6), plank 3x30 detik. Buang napas saat mengangkat.",
  minutes: 12,
  kcal: 70,
  kind: "gerak",
  moves: ["crunch", "situp", "twist", "plank"],
};

const CIRCUIT_A: ProgramTask = {
  id: "circuit",
  title: "Sirkuit Postur A — 15 Menit",
  detail: "Chin tuck 2x12, wall angel 2x10, thoracic extension di kursi 2x10, dead bug 2x8 per sisi, glute bridge 2x12, plank 3x30 detik.",
  minutes: 15,
  kcal: 60,
  kind: "gerak",
  moves: ["chin-tuck", "wall-angel", "thoracic", "deadbug", "glute-bridge", "plank"],
};

const CIRCUIT_B: ProgramTask = {
  id: "circuit",
  title: "Sirkuit Postur B — 15 Menit",
  detail: "Bird dog 2x8 per sisi, side plank 2x20 detik per sisi, hip flexor stretch 2x30 detik per sisi, doorway chest stretch 2x30 detik, squat 2x12.",
  minutes: 15,
  kcal: 60,
  kind: "gerak",
  moves: ["birddog", "side-plank", "hip-stretch", "chest-stretch", "squat"],
};

/** Daftar tugas hari itu. Deterministik dari tanggal: reset otomatis tiap hari. */
export function tasksFor(p: Program, date: Date = new Date()): ProgramTask[] {
  const day = date.getDay(); // 0 = Minggu
  if (p.goal === "diet") {
    const tasks: ProgramTask[] = [];
    if (day === 0) {
      tasks.push({ ...WALK30, id: "walk20", title: "Jalan Santai 20 Menit", minutes: 20, kcal: 90, moves: ["walk"] });
    } else {
      tasks.push(WALK30);
    }
    if (day === 1 || day === 3 || day === 5) tasks.push(STRENGTH);
    if (day === 2 || day === 4 || day === 6) tasks.push(CORE);
    tasks.push(
      {
        id: "eat-target",
        title: `Makan Sesuai Target ±${p.targetKcal} kkal`,
        detail: "3x makan utama + 1 snack. Piring: setengah sayur, seperempat protein, seperempat karbohidrat.",
        minutes: 0,
        kcal: 0,
        kind: "makan",
        moves: [],
      },
      {
        id: "eat-protein",
        title: `Protein ${p.proteinMin}–${p.proteinMax} g Hari Ini`,
        detail: "Tiap waktu makan wajib ada protein: telur, ayam, ikan, tempe, tahu, atau susu.",
        minutes: 0,
        kcal: 0,
        kind: "makan",
        moves: [],
      },
      {
        id: "eat-drink",
        title: "Tanpa Minuman Manis",
        detail: "Hanya air putih, teh tawar, atau kopi hitam tanpa gula seharian.",
        minutes: 0,
        kcal: 0,
        kind: "makan",
        moves: [],
      },
      {
        id: "sleep",
        title: "Tidur 7–8 Jam",
        detail: "Mati lampu tepat waktu. Kurang tidur menaikkan nafsu makan keesokan harinya.",
        minutes: 0,
        kcal: 0,
        kind: "pulih",
        moves: [],
      },
    );
    return tasks;
  }
  // postur: sirkuit bergantian A/B tiap tanggal ganjil/genap + jalan + kebiasaan
  const tasks: ProgramTask[] = [date.getDate() % 2 === 1 ? CIRCUIT_A : CIRCUIT_B];
  tasks.push(
    { ...WALK30, id: "walk20", title: "Jalan 20–30 Menit", minutes: 25, kcal: 110, moves: ["walk"] },
    {
      id: "habit-sit",
      title: "Duduk Tegak Tiap Jam",
      detail: "Bahu rileks, layar sejajar mata, kaki menapak. Berdiri dan jalan 2 menit tiap jam duduk.",
      minutes: 0,
      kcal: 0,
      kind: "pulih",
      moves: [],
    },
    {
      id: "habit-protein",
      title: `Protein ${p.proteinMin}–${p.proteinMax} g Hari Ini`,
      detail: "Protein cukup menjaga otot penegak postur: telur, ayam, ikan, tempe, tahu.",
      minutes: 0,
      kcal: 0,
      kind: "makan",
      moves: [],
    },
    {
      id: "habit-water",
      title: "Air 2–2.5 Liter",
      detail: "Siapkan botol di meja. Dehidrasi mempercepat lelah otot punggung.",
      minutes: 0,
      kcal: 0,
      kind: "makan",
      moves: [],
    },
    {
      id: "sleep",
      title: "Tidur 7–8 Jam",
      detail: "Otot dan sendi pulih saat tidur. Kasur tidak terlalu empuk, bantal tidak terlalu tinggi.",
      minutes: 0,
      kcal: 0,
      kind: "pulih",
      moves: [],
    },
  );
  return tasks;
}

export function loadProgram(uid: string): Program | null {
  return read<Program>(keyP(uid));
}

export function saveProgram(uid: string, p: Program): void {
  localStorage.setItem(keyP(uid), JSON.stringify(p));
}

export function clearProgram(uid: string): void {
  localStorage.removeItem(keyP(uid));
  localStorage.removeItem(keyL(uid));
}

export function loadLog(uid: string, date: Date = new Date()): DayLog {
  const cur = read<DayLog>(keyL(uid));
  const today = todayKey(date);
  if (cur && cur.date === today) return cur;
  return { date: today, done: [], logged: false };
}

function writeLog(uid: string, log: DayLog): DayLog {
  localStorage.setItem(keyL(uid), JSON.stringify(log));
  return log;
}

export function toggleTask(uid: string, taskId: string, date: Date = new Date()): DayLog {
  const log = loadLog(uid, date);
  const done = log.done.includes(taskId) ? log.done.filter((d) => d !== taskId) : [...log.done, taskId];
  return writeLog(uid, { ...log, done });
}

export function markLogged(uid: string, date: Date = new Date()): DayLog {
  const log = loadLog(uid, date);
  return writeLog(uid, { ...log, logged: true });
}

export function isAllDone(tasks: ProgramTask[], log: DayLog): boolean {
  return tasks.length > 0 && tasks.every((t) => log.done.includes(t.id));
}
