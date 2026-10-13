export interface WorkoutGuide {
  id: string;
  title: string;
  category: "strength" | "core" | "cardio" | "fullbody";
  level: "pemula" | "menengah" | "lanjutan";
  durationMin: number;
  caloriesEst: number;
  desc: string;
  steps: string[];
  tips: string[];
}

export interface DietMenu {
  meal: string;
  items: string;
}

export interface DietGuide {
  id: string;
  title: string;
  goal: "turun" | "naik" | "jaga";
  calories: number;
  proteinG: number;
  desc: string;
  menus: DietMenu[];
  rules: string[];
}

const K_W = "ayo_workouts_v2";
const K_D = "ayo_diets_v2";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, val: unknown): void {
  localStorage.setItem(key, JSON.stringify(val));
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const CAT_LABEL: Record<WorkoutGuide["category"], string> = {
  strength: "Kekuatan",
  core: "Perut / Core",
  cardio: "Kardio",
  fullbody: "Full Body",
};

export function loadWorkouts(): WorkoutGuide[] {
  const cur = read<WorkoutGuide[]>(K_W);
  if (cur && cur.length > 0) return cur;
  const seed: WorkoutGuide[] = [
    {
      id: "w-pushup",
      title: "Push Up Pemula",
      category: "strength",
      level: "pemula",
      durationMin: 10,
      caloriesEst: 60,
      desc: "Progresi aman dari dinding sampai lutut. Cocok buat mulai dari nol.",
      steps: [
        "Pemanasan: arm circle + jumping jack ringan 2 menit.",
        "Wall push up 3 set x 12 repetisi, istirahat 60 detik.",
        "Incline push up (tangan di meja/kursi) 3 set x 10 repetisi.",
        "Knee push up 3 set x 8 repetisi, jaga badan lurus dari lutut ke kepala.",
        "Pendinginan: chest stretch 2 menit.",
      ],
      tips: [
        "Turunkan dada sampai hampir menyentuh lantai, siku 45 derajat dari badan.",
        "Jika bahu sakit, naikkan posisi tangan (semakin tinggi semakin ringan).",
        "Naik ke level berikutnya jika 3x8 knee push up sudah terasa ringan.",
      ],
    },
    {
      id: "w-situp",
      title: "Sit Up & Core",
      category: "core",
      level: "pemula",
      durationMin: 12,
      caloriesEst: 70,
      desc: "Latihan perut + pinggang tanpa alat. Jangan tarik leher.",
      steps: [
        "Pemanasan: jalan di tempat 2 menit.",
        "Crunch 3 set x 12 repetisi, tempelkan punggung bawah ke lantai.",
        "Sit up 3 set x 10 repetisi, kaki ditekuk.",
        "Russian twist 3 set x 12 (6 kiri + 6 kanan).",
        "Plank 3 x 20-30 detik.",
      ],
      tips: [
        "Buang napas saat mengangkat badan, tarik napas saat turun.",
        "Berhenti jika pinggang bawah terasa nyeri tajam, ganti dengan gerakan dead bug.",
      ],
    },
    {
      id: "w-squat",
      title: "Squat & Kaki",
      category: "strength",
      level: "pemula",
      durationMin: 12,
      caloriesEst: 80,
      desc: "Kaki kuat = lari lebih enak. Fokus form dulu sebelum tambah repetisi.",
      steps: [
        "Pemanasan: leg swing + bodyweight squat ringan 2 menit.",
        "Bodyweight squat 3 set x 12, lutut sejajar ujung kaki.",
        "Glute bridge 3 set x 12, tahan 1 detik di atas.",
        "Lunge 3 set x 8 per kaki, berpegangan pada tembok jika belum stabil.",
        "Calf raise 3 set x 15.",
      ],
      tips: [
        "Berat di tumit, dada tegak, pandang depan.",
        "Lutut jangan masuk ke dalam (valgus), dorong keluar sedikit.",
      ],
    },
    {
      id: "w-plank",
      title: "Plank Challenge 7 Hari",
      category: "core",
      level: "menengah",
      durationMin: 8,
      caloriesEst: 50,
      desc: "Naikkan durasi plank sedikit tiap hari. Core stabil, postur rapi.",
      steps: [
        "Hari 1-2: plank 3 x 20 detik.",
        "Hari 3-4: plank 3 x 30 detik + side plank 2 x 15 detik per sisi.",
        "Hari 5-6: plank 3 x 45 detik + shoulder tap 2 x 10.",
        "Hari 7: tes maksimal 1x, catat waktu sebagai aktivitas.",
      ],
      tips: ["Kencangkan perut dan bokong, jangan turunkan pinggul.", "Bernapas normal, jangan tahan napas."],
    },
    {
      id: "w-walk",
      title: "Jalan Cepat 30 Menit",
      category: "cardio",
      level: "pemula",
      durationMin: 30,
      caloriesEst: 140,
      desc: "Bakar kalori yang ramah untuk semua level: low impact, bisa dilakukan tiap hari.",
      steps: [
        "5 menit jalan santai sebagai pemanasan.",
        "20 menit jalan cepat (masih bisa ngomong tapi ngos-ngosan).",
        "5 menit jalan santai + stretching betis dan paha.",
      ],
      tips: ["Target 7000-9000 langkah per hari.", "Naikkan ke interval jog 1 menit tiap 4 menit jalan setelah jalan cepat terasa ringan."],
    },
    {
      id: "w-fullbody",
      title: "Full Body Tanpa Alat 20 Menit",
      category: "fullbody",
      level: "menengah",
      durationMin: 20,
      caloriesEst: 150,
      desc: "Satu ronde 40 detik kerja + 20 detik istirahat, ulang 2 ronde.",
      steps: [
        "Jumping jack, squat, push up lutut, mountain climber, glute bridge, plank.",
        "Ronde 1: tiap gerakan 40 detik, istirahat 20 detik.",
        "Istirahat air 2 menit.",
        "Ronde 2: ulangi semua gerakan.",
      ],
      tips: ["Dahulukan teknik yang benar, kecepatan belakangan.", "Minum sebelum haus, berhenti jika pusing."],
    },
  ];
  write(K_W, seed);
  return seed;
}

export function saveWorkouts(list: WorkoutGuide[]): void {
  write(K_W, list);
}

export function loadDiets(): DietGuide[] {
  const cur = read<DietGuide[]>(K_D);
  if (cur && cur.length > 0) return cur;
  const seed: DietGuide[] = [
    {
      id: "d-defisit",
      title: "Defisit Kalori Aman (Turun BB)",
      goal: "turun",
      calories: 1800,
      proteinG: 130,
      desc: "Untuk target turun 0.5 kg per minggu: makan sekitar 500 kkal di bawah kebutuhan harian, protein tinggi agar kenyang dan massa otot aman.",
      menus: [
        { meal: "Aturan piring", items: "Setengah piring sayur, seperempat protein (ayam/telur/ikan/tempe 100-150g), seperempat karbohidrat (nasi 100-150g matang)." },
        { meal: "Jadwal", items: "3x makan utama + 1 snack. Makan malam maksimal jam 8, hindari ngemil tengah malam." },
      ],
      rules: [
        "Protein 1.6-2 g per kg berat badan, bagi ke setiap waktu makan.",
        "Minum 2.5-3 liter air per hari; rasa lapar seringkali sebenarnya haus.",
        "Gorengan maksimal 2x seminggu, ganti dengan rebus, panggang, atau air-fryer.",
        "Batasi minuman manis: ganti dengan air putih, teh tawar, atau kopi hitam tanpa gula.",
        "Tidur 7-8 jam; kurang tidur meningkatkan nafsu makan keesokan harinya.",
        "Timbang seminggu sekali (pagi hari), bukan setiap hari.",
      ],
    },
    {
      id: "d-1800",
      title: "Contoh Menu 1800 kkal",
      goal: "turun",
      calories: 1800,
      proteinG: 130,
      desc: "Contoh menu sehari yang mudah dimasak dengan bahan pasar.",
      menus: [
        { meal: "Sarapan (~450)", items: "Oatmeal 50g + susu low-fat 200ml + 1 telur rebus + 1 buah pisang." },
        { meal: "Makan siang (~600)", items: "Nasi 150g matang + dada ayam 120g + sayur sop/capcay 200g + tahu 50g." },
        { meal: "Snack (~200)", items: "1 buah apel + yogurt plain 100g / kacang rebus segenggam." },
        { meal: "Makan malam (~550)", items: "Nasi 100g + ikan 120g + tumis kangkung/bayam + tempe 50g." },
      ],
      rules: ["Menumis maksimal 1 sdm minyak per porsi.", "Sambal boleh, batasi kerupuk selama defisit."],
    },
    {
      id: "d-1500",
      title: "Contoh Menu 1500 kkal (Agresif)",
      goal: "turun",
      calories: 1500,
      proteinG: 120,
      desc: "Untuk hari santai tanpa olahraga. Jangan dipakai setiap hari jika badan lemas, naikkan ke 1800 kkal.",
      menus: [
        { meal: "Sarapan (~350)", items: "2 telur rebus + roti gandum 2 lembar + timun/tomat." },
        { meal: "Makan siang (~550)", items: "Nasi 100g + dada ayam 120g + sayur bening 250g." },
        { meal: "Snack (~150)", items: "Pepaya/semangka 200g." },
        { meal: "Makan malam (~450)", items: "Tanpa nasi: ikan/ayam 150g + sayur 250g + tahu/tempe 50g." },
      ],
      rules: ["Wajib 2.5 L air; tambah elektrolit jika pusing.", "Berhenti dan konsultasi ke dokter jika pusing berkepanjangan."],
    },
    {
      id: "d-jaga",
      title: "Pola Jaga BB (Maintenance)",
      goal: "jaga",
      calories: 2200,
      proteinG: 120,
      desc: "Digunakan setelah target tercapai agar berat badan tidak naik kembali.",
      menus: [{ meal: "Prinsip", items: "80% makan bersih seperti biasa, 20% bebas (1-2x makanan favorit seminggu)." }],
      rules: ["Tetap timbang seminggu sekali; jika naik 2 kg, kembali defisit selama 2 minggu.", "Olahraga minimal 150 menit per minggu."],
    },
  ];
  write(K_D, seed);
  return seed;
}

export function saveDiets(list: DietGuide[]): void {
  write(K_D, list);
}

/** Mifflin-St Jeor. activity: 1.2 jarang gerak - 1.9 sangat aktif. */
export function calcCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  male: boolean,
  activity: number,
): { bmr: number; tdee: number; cut: number } {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (male ? 5 : -161);
  const tdee = bmr * activity;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), cut: Math.round(tdee - 500) };
}
