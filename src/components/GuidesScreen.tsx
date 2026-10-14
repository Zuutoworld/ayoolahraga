import { useState } from "react";
import {
  CAT_LABEL,
  calcCalories,
  loadWorkouts,
  saveWorkouts,
  uid,
} from "../lib/guides";
import { useToast } from "../lib/toast";
import ProgramScreen from "./ProgramScreen";
import { MoveGallery } from "./MoveArt";
import type { WorkoutGuide } from "../lib/guides";
import type { User } from "../lib/auth";

const LEVELS: WorkoutGuide["level"][] = ["pemula", "menengah", "lanjutan"];
const CATS: WorkoutGuide["category"][] = ["strength", "core", "cardio", "fullbody"];

export default function GuidesScreen({
  isAdmin,
  user,
  onUserPatch,
  onLogWorkout,
  onLogProgram,
}: {
  isAdmin: boolean;
  user: User;
  onUserPatch: (p: Partial<User>) => void;
  onLogWorkout: (g: WorkoutGuide) => void;
  onLogProgram: (minutes: number, title: string, desc: string) => void;
}) {
  const [tab, setTab] = useState<"workout" | "calc" | "program">("workout");
  const [workouts, setWorkouts] = useState<WorkoutGuide[]>(() => loadWorkouts());
  const [cat, setCat] = useState<string>("semua");
  const [openW, setOpenW] = useState<string | null>(null);
  const [editW, setEditW] = useState<WorkoutGuide | null>(null);
  const toast = useToast();

  // kalkulator (tanpa angka default: tiap orang beda badan)
  const [w, setW] = useState<number | "">(user.weightKg ?? "");
  const [h, setH] = useState<number | "">(user.heightCm ?? "");
  const [age, setAge] = useState<number | "">(user.age ?? "");
  const [male, setMale] = useState(true);
  const [act, setAct] = useState(1.375);
  const calcValid =
    typeof w === "number" && w > 0 && typeof h === "number" && h > 0 && typeof age === "number" && age > 0;
  const calc = calcValid ? calcCalories(w as number, h as number, age as number, male, act) : null;
  const bmi = calcValid ? (w as number) / ((h as number) / 100) ** 2 : null;

  const persistW = (list: WorkoutGuide[]) => {
    setWorkouts(list);
    saveWorkouts(list);
  };

  const shownW = workouts.filter((x) => cat === "semua" || x.category === cat);

  return (
    <div>
      <div className="row">
        <button className={tab === "workout" ? "btn primary" : "btn"} onClick={() => setTab("workout")}>Latihan</button>
        <button className={tab === "program" ? "btn primary" : "btn"} onClick={() => setTab("program")}>Program</button>
        <button className={tab === "calc" ? "btn primary" : "btn"} onClick={() => setTab("calc")}>Kalkulator</button>
      </div>

      {tab === "program" && (
        <ProgramScreen user={user} onUserPatch={onUserPatch} onLogProgram={onLogProgram} />
      )}

      {tab === "workout" && (
        <div>
          <div className="card soft">
            <b>Mulai dari mana?</b>
            <p className="muted">Baru mulai: Jalan Cepat 30 Menit 3x seminggu + Push Up Pemula 2x seminggu. Sudah rutin: tambah Full Body 20 Menit. Selesaikan panduan lalu tekan Tandai Selesai agar tercatat di Feed.</p>
          </div>
          <div className="row">
            {["semua", ...CATS].map((c) => (
              <button key={c} className={cat === c ? "btn primary" : "btn"} onClick={() => setCat(c)}>
                {c === "semua" ? "Semua" : CAT_LABEL[c as WorkoutGuide["category"]]}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              className="btn"
              onClick={() =>
                setEditW({ id: uid(), title: "", category: "strength", level: "pemula", durationMin: 10, caloriesEst: 60, desc: "", steps: [], tips: [], moves: [] })
              }
            >
              + Tambah Panduan
            </button>
          )}
          {editW && (
            <WorkoutForm
              init={editW}
              onCancel={() => setEditW(null)}
              onSave={(g) => {
                const list = workouts.some((x) => x.id === g.id)
                  ? workouts.map((x) => (x.id === g.id ? g : x))
                  : [g, ...workouts];
                persistW(list);
                setEditW(null);
                toast("Panduan latihan tersimpan.");
              }}
            />
          )}
          {shownW.map((g) => (
            <div key={g.id} className="card">
              <div className="feed-head">
                <b>{g.title}</b>
                <span className="muted">{CAT_LABEL[g.category]} • {g.level}</span>
              </div>
              <p className="muted">{g.durationMin} mnt • ±{g.caloriesEst} kkal</p>
              <p>{g.desc}</p>
              {openW === g.id && (
                <div>
                  <h4>Langkah</h4>
                  <ol>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  <h4>Tips form</h4>
                  <ul>{g.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  <MoveGallery moves={g.moves ?? []} />
                </div>
              )}
              <div className="row">
                <button className="btn" onClick={() => setOpenW(openW === g.id ? null : g.id)}>
                  {openW === g.id ? "Tutup" : "Lihat Detail"}
                </button>
                <button className="btn primary" onClick={() => onLogWorkout(g)}>Tandai Selesai</button>
                {isAdmin && (
                  <>
                    <button className="btn" onClick={() => setEditW(g)}>Edit</button>
                    <button
                      className="btn danger"
                      onClick={() => {
                        if (!confirm(`Hapus panduan "${g.title}"?`)) return;
                        persistW(workouts.filter((x) => x.id !== g.id));
                        toast("Panduan latihan dihapus.");
                      }}
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "calc" && (
        <div className="card">
          <h2>Kalkulator Kalori</h2>
          <p className="muted">Isi data badan Anda sendiri. Tidak ada angka default karena tiap orang berbeda.</p>
          <div className="grid2">
            <label>BB (kg)<input type="number" placeholder="Contoh 70" value={w} onChange={(e) => setW(e.target.value === "" ? "" : Number(e.target.value))} /></label>
            <label>TB (cm)<input type="number" placeholder="Contoh 170" value={h} onChange={(e) => setH(e.target.value === "" ? "" : Number(e.target.value))} /></label>
            <label>Umur<input type="number" placeholder="Contoh 25" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} /></label>
            <label>Jenis kelamin
              <select value={male ? "l" : "p"} onChange={(e) => setMale(e.target.value === "l")}>
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </label>
          </div>
          <label>Aktivitas
            <select value={act} onChange={(e) => setAct(Number(e.target.value))}>
              <option value={1.2}>Jarang gerak (kantoran)</option>
              <option value={1.375}>Ringan (1-3x olahraga/minggu)</option>
              <option value={1.55}>Sedang (3-5x/minggu)</option>
              <option value={1.725}>Berat (6-7x/minggu)</option>
            </select>
          </label>
          {calc && bmi !== null ? (
            <>
              <div className="stats-grid">
                <div><span>BMI</span><b>{bmi.toFixed(1)}</b></div>
                <div><span>Kebutuhan</span><b>{calc.tdee}</b></div>
                <div><span>Target diet</span><b>{calc.cut}</b></div>
              </div>
              <p className="muted">
                {bmi >= 25
                  ? `BMI ${bmi.toFixed(1)} termasuk kategori berlebih. Pertahankan defisit kalori dan olahraga rutin.`
                  : `BMI ${bmi.toFixed(1)} sudah baik. Fokus menjaga pola makan dan menambah massa otot.`} Konsumsi
                sekitar {calc.cut} kkal per hari untuk menurunkan ±0.5 kg per minggu, dengan protein
                sekitar {Math.round((w as number) * 1.6)}–{Math.round((w as number) * 2)} g per hari.
              </p>
            </>
          ) : (
            <p className="muted">Lengkapi BB, TB, dan umur untuk melihat hasil perhitungan.</p>
          )}
          <button
            className="btn primary"
            disabled={!calcValid}
            onClick={() => {
              if (!calcValid) return;
              onUserPatch({ weightKg: w as number, heightCm: h as number, age: age as number });
              toast(`Profil tersimpan: ${w} kg, ${h} cm, ${age} tahun. Lihat datanya di tab Profil.`);
            }}
          >
            Simpan ke Profil
          </button>
        </div>
      )}
    </div>
  );
}

function WorkoutForm({ init, onSave, onCancel }: { init: WorkoutGuide; onSave: (g: WorkoutGuide) => void; onCancel: () => void }) {
  const [f, setF] = useState(init);
  const [steps, setSteps] = useState(init.steps.join("\n"));
  const [tips, setTips] = useState(init.tips.join("\n"));
  const [moves, setMoves] = useState((init.moves ?? []).join(", "));
  const toast = useToast();
  return (
    <div className="card">
      <h3>Form panduan latihan</h3>
      <label>Judul<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <div className="grid2">
        <label>Kategori
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as WorkoutGuide["category"] })}>
            {CATS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
        </label>
        <label>Level
          <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as WorkoutGuide["level"] })}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>Durasi (mnt)<input type="number" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} /></label>
        <label>Kalori (kkal)<input type="number" value={f.caloriesEst} onChange={(e) => setF({ ...f, caloriesEst: Number(e.target.value) })} /></label>
      </div>
      <label>Deskripsi<textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
      <label>Langkah (1 baris = 1 langkah)<textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} /></label>
      <label>Tips (1 baris = 1 tips)<textarea rows={3} value={tips} onChange={(e) => setTips(e.target.value)} /></label>
      <label>Ilustrasi gerakan (id dipisah koma, mis. squat, plank, walk)<input value={moves} onChange={(e) => setMoves(e.target.value)} placeholder="squat, plank" /></label>
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            if (!f.title.trim()) { toast("Judul panduan wajib diisi."); return; }
            onSave({ ...f, steps: steps.split("\n").map((s) => s.trim()).filter(Boolean), tips: tips.split("\n").map((s) => s.trim()).filter(Boolean), moves: moves.split(",").map((s) => s.trim()).filter(Boolean) });
          }}
        >
          Simpan
        </button>
        <button className="btn" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}
