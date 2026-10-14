import { useState } from "react";
import { formatDate, formatDist, formatPace, formatTime } from "../lib/geo";
import { activityText, openWaShare } from "../lib/share";
import { sportLabel } from "../lib/store";
import { useToast } from "../lib/toast";
import type { Activity } from "../lib/store";

export default function FeedScreen({
  activities,
  me,
  isAdmin,
  filter,
  setFilter,
  onKudos,
  onComment,
  onOpen,
  onDelete,
}: {
  activities: Activity[];
  me: string;
  isAdmin: boolean;
  filter: "all" | "mine" | "friends";
  setFilter: (f: "all" | "mine" | "friends") => void;
  onKudos: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const toast = useToast();
  const list = activities.filter((a) => {
    if (filter === "mine") return a.mine;
    if (filter === "friends") return !a.mine || a.owner === me;
    if (isAdmin) return true;
    return a.privacy !== "private" || a.mine;
  });

  return (
    <div>
      <div className="row">
        {(["all", "mine", "friends"] as const).map((f) => (
          <button key={f} className={filter === f ? "btn primary" : "btn"} onClick={() => setFilter(f)}>
            {f === "all" ? "Semua" : f === "mine" ? "Punyaku" : "Teman"}
          </button>
        ))}
      </div>
      {list.length === 0 && <div className="card"><p className="muted">Belum ada aktivitas di sini. Mulai sesi tracking pertama Anda dari tab Track.</p></div>}
      {list.map((a) => (
        <div key={a.id} className="card">
          <div className="feed-head">
            <b>{a.mine ? `${a.owner} (Anda)` : a.owner}</b>
            <span className="muted">{formatDate(a.startedAt)} • {sportLabel(a.sport)}</span>
          </div>
          <h3 className="link" onClick={() => onOpen(a.id)}>{a.title}</h3>
          <div className="stats-grid small">
            <div><span>Jarak</span><b>{formatDist(a.distanceM)}</b></div>
            <div><span>Waktu</span><b>{formatTime(a.movingSec)}</b></div>
            <div><span>Pace</span><b>{formatPace(a.distanceM, a.movingSec)}/km</b></div>
          </div>
          {a.desc && <p>{a.desc}</p>}
          <div className="row">
            <button className={a.kudos.includes(me) ? "btn primary" : "btn"} onClick={() => onKudos(a.id)}>
              {a.kudos.length > 0 ? `${a.kudos.length} Kudos` : "Kudos"}
            </button>
            <button className="btn" onClick={() => onOpen(a.id)}>Detail & Peta</button>
            <button
              className="btn"
              onClick={() => {
                openWaShare(activityText(a, `${location.origin}${location.pathname}`));
                toast("Membuka WhatsApp untuk berbagi.");
              }}
            >
              Bagikan WA
            </button>
            {(a.mine || isAdmin) && (
              <button
                className="btn danger"
                onClick={() => {
                  if (!confirm(`Hapus "${a.title}"?`)) return;
                  onDelete(a.id);
                  toast("Aktivitas dihapus.");
                }}
              >
                Hapus
              </button>
            )}
          </div>
          <div className="comments">
            {a.comments.map((c) => (
              <div key={c.id}><b>{c.user}: </b><span>{c.text}</span></div>
            ))}
          </div>
          <div className="row">
            <input
              className="grow"
              placeholder="Tulis komentar…"
              value={draft[a.id] ?? ""}
              onChange={(e) => setDraft({ ...draft, [a.id]: e.target.value })}
            />
            <button
              className="btn"
              onClick={() => {
                const t = (draft[a.id] ?? "").trim();
                if (!t) return;
                onComment(a.id, t);
                setDraft({ ...draft, [a.id]: "" });
              }}
            >
              Kirim
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
