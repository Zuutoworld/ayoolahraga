import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  GOAL_LABEL,
  buildProgram,
  clearProgram,
  isAllDone,
  loadLog,
  loadProgram,
  markLogged,
  saveProgram,
  tasksFor,
  toggleTask,
} from "../lib/program";
import type { DayLog, Program, ProgramGoal } from "../lib/program";
import { useToast } from "../lib/toast";
import type { User } from "../lib/auth";

const KIND_LABEL = { gerak: "Gerak", makan: "Nutrisi", pulih: "Pemulihan" } as const;

function fmtToday(): string {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

export default function ProgramScreen({
  user,
  onUserPatch,
  onLogProgram,
}: {
  user: User;
  onUserPatch: (p: Partial<User>) => void;
  onLogProgram: (minutes: number, title: string, desc: string) => void;
}) {
  const [program, setProgram] = useState<Program | null>(() => loadProgram(user.id));
  const [log, setLog] = useState<DayLog>(() => loadLog(user.id));
  const [editing, setEditing] = useState(false);
  const [bw, setBw] = useState<number | "">(user.weightKg ?? "");
  const [bh, setBh] = useState<number | "">(user.heightCm ?? "");
  const [bAge, setBAge] = useState<number | "">(user.age ?? "");
  const [male, setMale] = useState(true);
  const [goal, setGoal] = useState<ProgramGoal>("diet");
  const toast = useToast();

  useEffect(() => {
    setProgram(loadProgram(user.id));
    setLog(loadLog(user.id));
    setEditing(false);
    setBw(user.weightKg ?? "");
    setBh(user.heightCm ?? "");
    setBAge(user.age ?? "");
  }, [user]);

  const num =
    (set: (x: number | "") => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      set(e.target.value === "" ? "" : Number(e.target.value));
    };

  // ---- setup ----
  if (!program || editing) {
    const valid =
      typeof bw === "number" && bw > 0 && typeof bh === "number" && bh > 0 && typeof bAge === "number" && bAge > 0;
    return (
      <div className="card">
        <h2>{program ? "Ubah Program Harian" : "Buat Program Harian"}</h2>
        <p className="muted">Isi data badan dan pilih target. Aplikasi menyusun menu latihan + pola makan harian yang reset otomatis tiap hari.</p>
        <div className="grid2">
          <label>BB (kg)<input type="number" placeholder="Contoh 70" value={bw} onChange={num(setBw)} /></label>
          <label>TB (cm)<input type="number" placeholder="Contoh 170" value={bh} onChange={num(setBh)} /></label>
          <label>Umur<input type="number" placeholder="Contoh 25" value={bAge} onChange={num(setBAge)} /></label>
          <label>Jenis kelamin
            <select value={male ? "l" : "p"} onChange={(e) => setMale(e.target.value === "l")}>
              <option value="l">Laki-laki</option>
              <option value="p">Perempuan</option>
            </select>
          </label>
        </div>
        <label>Target program</label>
        <div className="row">
          {(["diet", "postur"] as ProgramGoal[]).map((g) => (
            <button key={g} className={goal === g ? "btn primary" : "btn"} onClick={() => setGoal(g)}>
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            className="btn primary"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              const p = buildProgram({
                weightKg: bw as number,
                heightCm: bh as number,
                age: bAge as number,
                male,
                goal,
              });
              saveProgram(user.id, p);
              setProgram(p);
              setLog(loadLog(user.id));
              setEditing(false);
              onUserPatch({ weightKg: bw as number, heightCm: bh as number, age: bAge as number });
              toast(`Program ${GOAL_LABEL[goal]} aktif. Target ±${p.targetKcal} kkal per hari.`);
            }}
          >
            {program ? "Simpan Perubahan" : "Buat Program"}
          </button>
          {program && <button className="btn" onClick={() => setEditing(false)}>Batal</button>}
        </div>
      </div>
    );
  }

  // ---- program aktif ----
  const tasks = tasksFor(program);
  const remaining = tasks.filter((t) => !log.done.includes(t.id));
  const all = isAllDone(tasks, log);
  const totalMin = tasks.reduce((s, t) => s + t.minutes, 0);
  const totalKcal = tasks.reduce((s, t) => s + t.kcal, 0);

  return (
    <div>
      <div className="card">
        <div className="feed-head">
          <b>{GOAL_LABEL[program.goal]}</b>
          <span className="muted">{fmtToday()}</span>
        </div>
        <div className="stats-grid small">
          <div><span>Target makan</span><b>±{program.targetKcal}</b></div>
          <div><span>Protein</span><b>{program.proteinMin}-{program.proteinMax}g</b></div>
          <div><span>Progres</span><b>{tasks.length - remaining.length}/{tasks.length}</b></div>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setBw(program.weightKg);
              setBh(program.heightCm);
              setBAge(program.age);
              setMale(program.male);
              setGoal(program.goal);
              setEditing(true);
            }}
          >
            Ubah
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (!confirm("Hentikan program harian ini?")) return;
              clearProgram(user.id);
              setProgram(null);
              toast("Program harian dihentikan.");
            }}
          >
            Hentikan
          </button>
        </div>
      </div>

      {!all ? (
        remaining.map((t) => (
          <div key={t.id} className="card">
            <div className="feed-head">
              <b>{t.title}</b>
              <span className="muted">{KIND_LABEL[t.kind]}{t.minutes > 0 ? ` • ${t.minutes} mnt • ±${t.kcal} kkal` : " • kebiasaan"}</span>
            </div>
            <p>{t.detail}</p>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  const next = toggleTask(user.id, t.id);
                  setLog(next);
                  const n = next.done.length;
                  toast(n >= tasks.length ? "Program hari ini selesai." : `"${t.title}" selesai (${n}/${tasks.length}).`);
                }}
              >
                Tandai Selesai
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="card center">
          <h2>Program Hari Ini Selesai</h2>
          <p className="muted">{totalMin} menit gerak • ±{totalKcal} kkal terbakar • nutrisi terjaga. Besok menu baru otomatis.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button
              className="btn primary"
              disabled={log.logged}
              onClick={() => {
                onLogProgram(
                  totalMin,
                  `Program Harian Selesai`,
                  `${GOAL_LABEL[program.goal]}: ${tasks.length} tugas selesai (${totalMin} menit).`,
                );
                setLog(markLogged(user.id));
                toast(log.logged ? "Sudah tercatat di Feed hari ini." : "Program hari ini tercatat di Feed.");
              }}
            >
              {log.logged ? "Sudah Tercatat" : "Catat ke Feed"}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <p className="muted">
          Disusun dari panduan publik: ACSM/WHO (150 menit kardio sedang + 2–3x latihan kekuatan per minggu),
          ISSN (protein 1.6–2 g per kg berat badan), dan pola latihan korektif postur umum.
          Bukan pengganti saran dokter atau pelatih pribadi.
        </p>
      </div>
    </div>
  );
}
