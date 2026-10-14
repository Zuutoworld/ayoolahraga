import { useEffect, useState } from "react";
import { formatDist, formatTime } from "../lib/geo";
import { calcPRs } from "../lib/store";
import { useToast } from "../lib/toast";
import type { Activity, Friend } from "../lib/store";
import type { User } from "../lib/auth";

export default function StatsScreen({
  activities,
  me,
  setMe,
  friends,
  setFriends,
  onImportActivity,
  user,
  onPatchUser,
}: {
  activities: Activity[];
  me: string;
  setMe: (n: string) => void;
  friends: Friend[];
  setFriends: (f: Friend[]) => void;
  onImportActivity: (a: Activity) => void;
  user: User;
  onPatchUser: (p: Partial<User>) => void;
}) {
  const [name, setName] = useState(me);
  const [friendName, setFriendName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [bw, setBw] = useState<number | "">(user.weightKg ?? "");
  const [bh, setBh] = useState<number | "">(user.heightCm ?? "");
  const [bAge, setBAge] = useState<number | "">(user.age ?? "");
  const [editingBody, setEditingBody] = useState(
    !(typeof user.weightKg === "number" && typeof user.heightCm === "number" && typeof user.age === "number"),
  );
  const toast = useToast();

  useEffect(() => {
    setName(me);
  }, [me]);

  useEffect(() => {
    setBw(user.weightKg ?? "");
    setBh(user.heightCm ?? "");
    setBAge(user.age ?? "");
  }, [user]);

  const mine = activities.filter((a) => a.mine);
  const totalD = mine.reduce((s, a) => s + a.distanceM, 0);
  const totalT = mine.reduce((s, a) => s + a.movingSec, 0);
  const prs = calcPRs(mine);

  // 7 hari terakhir
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toLocaleDateString("id-ID", { weekday: "short" });
    const km =
      mine
        .filter((a) => new Date(a.startedAt).toDateString() === d.toDateString())
        .reduce((s, a) => s + a.distanceM, 0) / 1000;
    return { key, km };
  });
  const maxKm = Math.max(1, ...days.map((d) => d.km));

  const bodyValid =
    typeof bw === "number" && bw > 0 && typeof bh === "number" && bh > 0 && typeof bAge === "number" && bAge > 0;
  const bmi = bodyValid ? (bw as number) / ((bh as number) / 100) ** 2 : null;

  const exportMine = async () => {
    const blob = new Blob([JSON.stringify(mine, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayo-olahraga-mine.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("File JSON berhasil diunduh. Kirimkan via WhatsApp ke teman Anda.");
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importJson) as Activity | Activity[];
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      arr.forEach((a) => onImportActivity({ ...a, mine: false }));
      setImportJson("");
      toast(`Impor ${arr.length} aktivitas teman. Lihat hasilnya di tab Feed.`);
    } catch {
      toast("Format JSON tidak valid. Periksa kembali data yang ditempel.");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Profil</h2>
        <div className="row">
          <input className="grow" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          <button
            className="btn primary"
            onClick={() => {
              setMe(name.trim() || "Pengguna");
              toast("Nama profil tersimpan.");
            }}
          >
            Simpan
          </button>
        </div>
        <div className="stats-grid">
          <div><span>Total Jarak</span><b>{formatDist(totalD)}</b></div>
          <div><span>Total Waktu</span><b>{formatTime(totalT)}</b></div>
          <div><span>Aktivitas</span><b>{mine.length}x</b></div>
        </div>
        <h3>7 hari terakhir</h3>
        <div className="bars">
          {days.map((d) => (
            <div key={d.key} className="bar-col">
              <div className="bar" style={{ height: `${Math.max(4, (d.km / maxKm) * 80)}px` }} />
              <span>{d.key}</span>
              <span className="muted">{d.km.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <h3>Rekor Pribadi</h3>
        {prs.length === 0 && <p className="muted">Belum ada rekor. Selesaikan sesi minimal 1 km untuk mencatat rekor.</p>}
        {prs.map((p) => (
          <div key={p.label} className="split"><span>{p.label}</span><b>{formatTime(Math.round(p.paceSec))}/km</b></div>
        ))}
      </div>

      <div className="card">
        <h2>Data Badan</h2>
        {!editingBody && bmi !== null ? (
          <>
            <div className="stats-grid">
              <div><span>Berat</span><b>{bw} kg</b></div>
              <div><span>Tinggi</span><b>{bh} cm</b></div>
              <div><span>BMI</span><b>{bmi.toFixed(1)}</b></div>
            </div>
            <div className="row">
              <button className="btn" onClick={() => setEditingBody(true)}>Ubah</button>
              <button
                className="btn danger"
                onClick={() => {
                  if (!confirm("Hapus data badan dari profil?")) return;
                  onPatchUser({ weightKg: undefined, heightCm: undefined, age: undefined });
                  setEditingBody(true);
                  toast("Data badan dihapus dari profil.");
                }}
              >
                Hapus
              </button>
            </div>
          </>
        ) : (
          <>
            {bmi === null && (
              <p className="muted">Belum ada data badan. Isi di bawah ini, atau otomatis terisi setelah memakai Kalkulator di tab Panduan.</p>
            )}
            <div className="grid2">
              <label>BB (kg)<input type="number" placeholder="Contoh 70" value={bw} onChange={(e) => setBw(e.target.value === "" ? "" : Number(e.target.value))} /></label>
              <label>TB (cm)<input type="number" placeholder="Contoh 170" value={bh} onChange={(e) => setBh(e.target.value === "" ? "" : Number(e.target.value))} /></label>
              <label>Umur<input type="number" placeholder="Contoh 25" value={bAge} onChange={(e) => setBAge(e.target.value === "" ? "" : Number(e.target.value))} /></label>
            </div>
            <div className="row">
              <button
                className="btn primary"
                disabled={!bodyValid}
                onClick={() => {
                  if (!bodyValid) return;
                  onPatchUser({ weightKg: bw as number, heightCm: bh as number, age: bAge as number });
                  setEditingBody(false);
                  toast(`Data badan tersimpan: ${bw} kg, ${bh} cm, ${bAge} tahun.`);
                }}
              >
                Simpan Data Badan
              </button>
              {bmi !== null && (
                <button
                  className="btn"
                  onClick={() => {
                    setBw(user.weightKg ?? "");
                    setBh(user.heightCm ?? "");
                    setBAge(user.age ?? "");
                    setEditingBody(false);
                  }}
                >
                  Batal
                </button>
              )}
            </div>
          </>
        )}
        <p className="muted">Data ini dipakai Kalkulator dan Panduan Diet agar target sesuai badan Anda.</p>
      </div>

      <div className="card">
        <h2>Daftar Teman</h2>
        <div className="row">
          <input className="grow" placeholder="Nama teman" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
          <button
            className="btn"
            onClick={() => {
              const n = friendName.trim();
              if (!n) return;
              setFriends([...friends, { id: `${Date.now()}`, name: n }]);
              setFriendName("");
              toast(`${n} ditambahkan ke daftar teman.`);
            }}
          >
            Tambah
          </button>
        </div>
        {friends.map((f) => (
          <div key={f.id} className="split"><span>{f.name}</span>
            <button className="btn danger" onClick={() => setFriends(friends.filter((x) => x.id !== f.id))}>Hapus</button>
          </div>
        ))}
        <h3>Berbagi Data Tanpa Server</h3>
        <p className="muted">Ekspor data Anda ke JSON, kirim via WhatsApp, lalu teman menempelkannya pada kolom di bawah.</p>
        <div className="row">
          <button className="btn" onClick={() => void exportMine()}>Ekspor Data Saya (JSON)</button>
        </div>
        <textarea rows={3} placeholder="Tempel JSON dari teman di sini…" value={importJson} onChange={(e) => setImportJson(e.target.value)} />
        <button className="btn primary" onClick={doImport}>Impor</button>
      </div>
    </div>
  );
}
