import { useState } from "react";
import MapView from "./MapView";
import { formatDist, formatPace, formatTime, totalDistanceM } from "../lib/geo";
import { sportLabel } from "../lib/store";
import { useToast } from "../lib/toast";
import type { Sport, Privacy } from "../lib/store";
import type { FinishedResult, useTracker } from "../lib/useTracker";

type T = ReturnType<typeof useTracker>;

const SPORTS: Sport[] = ["run", "ride", "walk"];

export default function TrackScreen({
  tracker,
  onSave,
}: {
  tracker: T;
  onSave: (args: { sport: Sport; title: string; desc: string; privacy: Privacy; result: FinishedResult }) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("friends");
  const toast = useToast();

  const s = tracker.state;

  const discard = () => {
    if (s === "tracking" || s === "paused") {
      if (!confirm("Buang hasil tracking ini? Data GPS yang sudah direkam akan ikut terhapus.")) return;
    }
    setTitle("");
    setDesc("");
    tracker.discardAll();
    toast("Hasil tracking dibuang.");
  };

  if (tracker.hasRecoveredDraft) {
    return (
      <div className="card">
        <h2>Sesi Belum Tersimpan Ditemukan</h2>
        <p className="muted">Aplikasi sempat tertutup saat tracking. Data GPS Anda aman di perangkat ini.</p>
        <div className="row">
          <button className="btn primary" onClick={tracker.recoverDraft}>Lanjutkan Sesi</button>
          <button className="btn" onClick={() => { tracker.clearDraft(); }}>Buang</button>
        </div>
      </div>
    );
  }

  if (s === "idle") {
    return (
      <div>
        <div className="card">
          <h2>Pilih Jenis Olahraga</h2>
          <div className="row">
            {SPORTS.map((sp) => (
              <button
                key={sp}
                className={tracker.sport === sp ? "btn primary" : "btn"}
                onClick={() => tracker.setSport(sp)}
              >
                {sportLabel(sp)}
              </button>
            ))}
          </div>
          <button className="btn go" onClick={tracker.startCheck}>Mulai</button>
          <p className="muted">Menggunakan GPS dan peta OpenStreetMap. Data tersimpan di perangkat terlebih dahulu, aman meski sinyal hilang.</p>
        </div>
      </div>
    );
  }

  if (s === "gps_check") {
    return (
      <div className="card center">
        <h2>Mencari Sinyal GPS</h2>
        <p className="muted">{tracker.gpsMsg}</p>
        <div className="spinner" />
        <p className="muted">Tracking dimulai otomatis dalam beberapa detik.</p>
        <button className="btn" onClick={tracker.cancelCheck}>Batal</button>
      </div>
    );
  }

  if (s === "countdown") {
    return (
      <div className="card center">
        <div className="big-count">{tracker.countdown}</div>
        <p className="muted">Bersiap…</p>
        <button className="btn" onClick={tracker.cancelCheck}>Batal</button>
      </div>
    );
  }

  if (s === "tracking" || s === "paused") {
    const pace = formatPace(tracker.distanceM, tracker.elapsedSec);
    const noSignal = tracker.points.length === 0 && tracker.elapsedSec >= 10;
    const lastAcc = tracker.points.length > 0 ? tracker.points[tracker.points.length - 1].acc : null;
    const coarseCount = tracker.points.filter((p) => p.coarse).length;
    return (
      <div>
        <div className="stats-grid">
          <div><span>Jarak</span><b>{formatDist(tracker.distanceM)}</b></div>
          <div><span>Waktu</span><b>{formatTime(tracker.elapsedSec)}</b></div>
          <div><span>Pace</span><b>{pace}/km</b></div>
        </div>
        {s === "paused" && (
          <div className="banner">{tracker.autoPaused ? "Jeda otomatis — tidak ada pergerakan terdeteksi." : "Tracking dijeda."}</div>
        )}
        {noSignal && (
          <div className="banner warn">
            Belum ada titik GPS yang terekam. Pastikan izin lokasi aktif dan Anda berada di area terbuka.
          </div>
        )}
        {lastAcc !== null && lastAcc > 50 && !noSignal && (
          <div className="banner warn">
            Sinyal GPS lemah (±{Math.round(lastAcc)} m). Garis bisa kurang presisi — pindah ke area terbuka.
          </div>
        )}
        <MapView points={tracker.points} height={260} />
        <p className="muted">{tracker.points.length} titik GPS • sinyal {lastAcc !== null ? `±${Math.round(lastAcc)} m` : "—"}{coarseCount > 0 ? ` • ${coarseCount} titik akurasi rendah (putih)` : ""} • jeda di atas 30 detik tidak dihitung</p>
        <div className="row">
          {s === "tracking" ? (
            <button className="btn" onClick={() => tracker.pause()}>Jeda</button>
          ) : (
            <button className="btn primary" onClick={tracker.resume}>Lanjutkan</button>
          )}
          <button
            className="btn go"
            onClick={() => {
              tracker.finish();
            }}
          >
            Selesai
          </button>
          <button className="btn danger" onClick={discard}>Buang</button>
        </div>
      </div>
    );
  }

  // finish -> form simpan. Hasil diambil dari hook agar aman meski sempat pindah tab.
  const result = tracker.pending;
  const dur = result ? Math.round((result.endedAt - result.startedAt) / 1000) : 0;
  const dist = result ? totalDistanceM(result.points) : 0;
  return (
    <div className="card">
      <h2>Simpan Aktivitas</h2>
      <p className="muted">Langkah terakhir: beri judul lalu simpan agar muncul di Feed.</p>
      {result && <MapView points={result.points} height={200} />}
      <label>Judul<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lari Pagi - Senayan" /></label>
      <label>Deskripsi<textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ceritakan sesi latihan ini…" /></label>
      <label>Privasi
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)}>
          <option value="friends">Teman</option>
          <option value="private">Hanya Saya</option>
          <option value="public">Publik (tautan berbagi)</option>
        </select>
      </label>
      {result && <p className="muted">{result.points.length} titik GPS • jarak {formatDist(dist)} • waktu {formatTime(dur)}</p>}
      {!result && <p className="err">Hasil tracking tidak ditemukan. Data mungkin sudah dibuang.</p>}
      <div className="row">
        <button
          className="btn primary"
          disabled={!result}
          onClick={() => {
            if (!result) return;
            onSave({ sport: tracker.sport, title, desc, privacy, result });
            setTitle("");
            setDesc("");
          }}
        >
          Simpan ke Feed
        </button>
        <button className="btn danger" onClick={discard}>Buang</button>
      </div>
    </div>
  );
}
