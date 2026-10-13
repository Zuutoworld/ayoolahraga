import { useState } from "react";
import { deleteUser, listUsers, setPassword, updateUser } from "../lib/auth";
import type { Role, User } from "../lib/auth";
import { formatDate, formatDist, formatTime } from "../lib/geo";
import { useToast } from "../lib/toast";
import type { Activity } from "../lib/store";

export default function AdminScreen({
  me,
  activities,
  onDeleteActivity,
}: {
  me: User;
  activities: Activity[];
  onDeleteActivity: (id: string) => void;
}) {
  const [users, setUsers] = useState<User[]>(() => listUsers());
  const toast = useToast();

  const refresh = () => setUsers(listUsers());

  const resetPw = async (u: User) => {
    const npw = prompt(`Kata sandi baru untuk ${u.username} (min. 6 karakter):`);
    if (!npw) return;
    try {
      setUsers(await setPassword(u.id, npw));
      toast(`Kata sandi ${u.username} berhasil direset.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mereset kata sandi.");
    }
  };

  const changeRole = (u: User, role: Role) => {
    if (u.id === me.id && role !== "admin") {
      toast("Tidak dapat mencabut status admin akun sendiri.");
      return;
    }
    setUsers(updateUser(u.id, { role }));
    refresh();
    toast(`${u.username} sekarang berstatus ${role === "admin" ? "admin" : "pengguna"}.`);
  };

  const remove = (u: User) => {
    if (u.id === me.id) {
      toast("Tidak dapat menghapus akun sendiri.");
      return;
    }
    if (u.role === "admin") {
      toast("Tidak dapat menghapus sesama admin.");
      return;
    }
    if (!confirm(`Hapus pengguna ${u.username}?`)) return;
    setUsers(deleteUser(u.id));
    toast(`Pengguna ${u.username} dihapus.`);
  };

  const countAct = (u: User) => activities.filter((a) => a.owner === u.username || a.owner === u.name).length;

  return (
    <div>
      <div className="card">
        <h2>Kelola Pengguna</h2>
        {users.map((u) => (
          <div key={u.id} className="split">
            <span>
              <b>{u.username}</b> ({u.name}) — {u.role === "admin" ? "Admin" : "Pengguna"}
              <br />
              <span className="muted">{countAct(u)} aktivitas • bergabung {formatDate(u.createdAt)}</span>
            </span>
            <span className="row" style={{ margin: 0 }}>
              {u.role === "user" ? (
                <button className="btn" onClick={() => changeRole(u, "admin")}>Jadikan Admin</button>
              ) : (
                u.id !== me.id && <button className="btn" onClick={() => changeRole(u, "user")}>Cabut Admin</button>
              )}
              <button className="btn" onClick={() => void resetPw(u)}>Reset Kata Sandi</button>
              {u.id !== me.id && u.role !== "admin" && (
                <button className="btn danger" onClick={() => remove(u)}>Hapus</button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Semua Aktivitas ({activities.length})</h2>
        <p className="muted">Administrator dapat melihat seluruh aktivitas, termasuk yang privat.</p>
        {activities.map((a) => (
          <div key={a.id} className="split">
            <span>
              <b>{a.title}</b> — {a.owner}
              <br />
              <span className="muted">{formatDist(a.distanceM)} • {formatTime(a.movingSec)} • {a.privacy}</span>
            </span>
            <button
              className="btn danger"
              onClick={() => {
                if (!confirm(`Hapus "${a.title}" milik ${a.owner}?`)) return;
                onDeleteActivity(a.id);
                toast("Aktivitas dihapus.");
              }}
            >
              Hapus
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
