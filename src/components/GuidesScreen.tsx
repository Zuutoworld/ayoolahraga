import { useState } from "react";
import {
  CAT_LABEL,
  calcCalories,
  loadDiets,
  loadWorkouts,
  saveDiets,
  saveWorkouts,
  uid,
} from "../lib/guides";
import { useToast } from "../lib/toast";
import ProgramScreen from "./ProgramScreen";
import type { DietGuide, WorkoutGuide } from "../lib/guides";
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
  const [tab, setTab] = useState<"workout" | "diet" | "calc" | "program">("workout");
  const [workouts, setWorkouts] = useState<WorkoutGuide[]>(() => loadWorkouts());
  const [diets, setDiets] = useState<DietGuide[]>(() => loadDiets());
  const [cat, setCat] = useState<string>("semua");
  const [openW, setOpenW] = useState<string | null>(null);
  const [openD, setOpenD] = useState<string | null>(null);
  const [editW, setEditW] = useState<WorkoutGuide | null>(null);
  const [editD, setEditD] = useState<DietGuide | null>(null);
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
  const persistD = (list: DietGuide[]) => {
    setDiets(list);
    saveDiets(list);
  };

  const shownW = workouts.filter((x) => cat === "semua" || x.category === cat);

  return (
    <div>
      <div className="row">
        <button className={tab === "workout" ? "btn primary" : "btn"} onClick={() => setTab("workout")}>Latihan</button>
        <button className={tab === "diet" ? "btn primary" : "btn"} onClick={() => setTab("diet")}>Diet</button>
        <button className={tab === "calc" ? "btn primary" : "btn"} onClick={() => setTab("calc")}>Kalkulator</button>
        <button className={tab === "program" ? "btn primary" : "btn"} onClick={() => setTab("program")}>Program</button>
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
                setEditW({ id: uid(), title: "", category: "strength", level: "pemula", durationMin: 10, caloriesEst: 60, desc: "", steps: [], tips: [] })
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

      {tab === "diet" && (
        <div>
          <div className="card">
            {typeof user.weightKg === "number" && user.weightKg > 0 ? (
              <>
                <b>Target personal: turun dari berat {user.weightKg} kg</b>
                <p className="muted">Patokan: defisit sekitar 500 kkal per hari setara turun ±0.5 kg per minggu. Jaga protein tinggi, hentikan minuman manis, dan cukupkan tidur.</p>
              </>
            ) : (
              <>
                <b>Target personal belum bisa dihitung</b>
                <p className="muted">Isi berat badan di tab Kalkulator (atau di Profil) agar panduan diet menyesuaikan dengan badan Anda, bukan angka orang lain.</p>
              </>
            )}
          </div>
          {isAdmin && (
            <button
              className="btn"
              onClick={() => setEditD({ id: uid(), title: "", goal: "turun", calories: 1800, proteinG: 120, desc: "", menus: [], rules: [] })}
            >
              + Tambah Panduan Diet
            </button>
          )}
          {editD && (
            <DietForm
              init={editD}
              onCancel={() => setEditD(null)}
              onSave={(g) => {
                const list = diets.some((x) => x.id === g.id)
                  ? diets.map((x) => (x.id === g.id ? g : x))
                  : [g, ...diets];
                persistD(list);
                setEditD(null);
                toast("Panduan diet tersimpan.");
              }}
            />
          )}
          {diets.map((d) => (
            <div key={d.id} className="card">
              <div className="feed-head">
                <b>{d.title}</b>
                <span className="muted">{d.calories} kkal • protein {d.proteinG}g</span>
              </div>
              <p>{d.desc}</p>
              {openD === d.id && (
                <div>
                  {d.menus.map((m, i) => (
                    <div key={i} className="split"><span><b>{m.meal}</b><br />{m.items}</span></div>
                  ))}
                  <h4>Aturan main</h4>
                  <ul>{d.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              <div className="row">
                <button className="btn" onClick={() => setOpenD(openD === d.id ? null : d.id)}>
                  {openD === d.id ? "Tutup" : "Lihat Menu"}
                </button>
                {isAdmin && (
                  <>
                    <button className="btn" onClick={() => setEditD(d)}>Edit</button>
                    <button
                      className="btn danger"
                      onClick={() => {
                        if (!confirm(`Hapus panduan "${d.title}"?`)) return;
                        persistD(diets.filter((x) => x.id !== d.id));
                        toast("Panduan diet dihapus.");
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
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            if (!f.title.trim()) { toast("Judul panduan wajib diisi."); return; }
            onSave({ ...f, steps: steps.split("\n").map((s) => s.trim()).filter(Boolean), tips: tips.split("\n").map((s) => s.trim()).filter(Boolean) });
          }}
        >
          Simpan
        </button>
        <button className="btn" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}

function DietForm({ init, onSave, onCancel }: { init: DietGuide; onSave: (g: DietGuide) => void; onCancel: () => void }) {
  const [f, setF] = useState(init);
  const [menus, setMenus] = useState(init.menus.map((m) => `${m.meal} | ${m.items}`).join("\n"));
  const [rules, setRules] = useState(init.rules.join("\n"));
  const toast = useToast();
  return (
    <div className="card">
      <h3>Panduan diet</h3>
      <label>Judul<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <div className="grid2">
        <label>Goal
          <select value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value as DietGuide["goal"] })}>
            <option value="turun">Turun BB</option>
            <option value="jaga">Jaga BB</option>
            <option value="naik">Naik BB</option>
          </select>
        </label>
        <label>Kalori<input type="number" value={f.calories} onChange={(e) => setF({ ...f, calories: Number(e.target.value) })} /></label>
        <label>Protein (g)<input type="number" value={f.proteinG} onChange={(e) => setF({ ...f, proteinG: Number(e.target.value) })} /></label>
      </div>
      <label>Deskripsi<textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
      <label>Menu (format: Waktu | isi, 1 baris = 1 menu)<textarea rows={4} value={menus} onChange={(e) => setMenus(e.target.value)} /></label>
      <label>Aturan (1 baris = 1 aturan)<textarea rows={3} value={rules} onChange={(e) => setRules(e.target.value)} /></label>
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            if (!f.title.trim()) { toast("Judul panduan wajib diisi."); return; }
            onSave({
              ...f,
              menus: menus.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => {
                const [meal, ...rest] = s.split("|");
                return { meal: meal.trim() || "Menu", items: rest.join("|").trim() || s };
              }),
              rules: rules.split("\n").map((s) => s.trim()).filter(Boolean),
            });
          }}
        >
          Simpan
        </button>
        <button className="btn" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}
