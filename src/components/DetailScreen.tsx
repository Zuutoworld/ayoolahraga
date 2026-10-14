import MapView from "./MapView";
import { formatDate, formatDist, formatPace, formatTime, toGpx } from "../lib/geo";
import { activityText, openWaShare } from "../lib/share";
import { useToast } from "../lib/toast";
import type { Activity } from "../lib/store";

export default function DetailScreen({
  activity,
  friendsBest,
  onBack,
}: {
  activity: Activity;
  friendsBest: Activity[];
  onBack: () => void;
}) {
  const toast = useToast();
  const exportGpx = () => {
    const gpx = toGpx(activity.title, activity.points);
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activity.title.replace(/\s+/g, "-")}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    toast("File GPX berhasil diunduh.");
  };

  const shareLink = async () => {
    const full = JSON.stringify(activity);
    if (full.length > 3500) {
      toast("Aktivitas terlalu besar untuk tautan. Gunakan Ekspor GPX atau JSON sebagai gantinya.");
      return;
    }
    const payload = btoa(unescape(encodeURIComponent(full)));
    const url = `${location.origin}${location.pathname}#share=${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Tautan berhasil disalin. Kirimkan ke teman Anda.");
    } catch {
      toast("Gagal menyalin otomatis. Buka lewat HTTPS agar fitur salin berfungsi.");
    }
  };

  return (
    <div>
      <button className="btn" onClick={onBack}>Kembali</button>
      <div className="card">
        <span className="muted">{formatDate(activity.startedAt)} • {activity.owner}</span>
        <h2>{activity.title}</h2>
        <div className="stats-grid">
          <div><span>Jarak</span><b>{formatDist(activity.distanceM)}</b></div>
          <div><span>Bergerak</span><b>{formatTime(activity.movingSec)}</b></div>
          <div><span>Pace</span><b>{formatPace(activity.distanceM, activity.movingSec)}/km</b></div>
        </div>
        <MapView points={activity.points} height={280} />
        {activity.points.length > 0 && <h3>Split per Kilometer</h3>}
        {activity.points.length === 0 && <p className="muted">Latihan tanpa GPS (dalam ruangan), durasi {formatTime(activity.movingSec)}.</p>}
        {activity.points.length > 0 && activity.splits.length === 0 && <p className="muted">Belum mencapai 1 km pada sesi ini.</p>}
        {activity.splits.map((s) => (
          <div key={s.km} className="split"><span>KM {s.km}</span><b>{formatTime(Math.round(s.paceSec))}/km</b></div>
        ))}
        <h3>Papan Peringkat Rute (Anda & Teman)</h3>
        {friendsBest.length === 0 && <p className="muted">Belum ada pembanding di rute ini.</p>}
        {friendsBest.map((b, i) => (
          <div key={b.id} className="split"><span>#{i + 1} {b.owner}</span><b>{formatDist(b.distanceM)} • {formatPace(b.distanceM, b.movingSec)}</b></div>
        ))}
        <div className="row">
          <button className="btn" onClick={exportGpx}>Ekspor GPX</button>
          <button className="btn" onClick={() => void shareLink()}>Bagikan ke Teman</button>
          <button
            className="btn"
            onClick={() => {
              openWaShare(activityText(activity, `${location.origin}${location.pathname}`));
              toast("Membuka WhatsApp untuk berbagi.");
            }}
          >
            Bagikan WA
          </button>
        </div>
      </div>
    </div>
  );
}
