import { useEffect, useMemo, useState } from "react";
import TrackScreen from "./components/TrackScreen";
import FeedScreen from "./components/FeedScreen";
import DetailScreen from "./components/DetailScreen";
import StatsScreen from "./components/StatsScreen";
import GuidesScreen from "./components/GuidesScreen";
import AuthScreen from "./components/AuthScreen";
import AdminScreen from "./components/AdminScreen";
import { useTracker } from "./lib/useTracker";
import { ToastProvider, useToast } from "./lib/toast";
import { currentUser, logout, updateUser } from "./lib/auth";
import type { User } from "./lib/auth";
import {
  buildActivity,
  loadActivities,
  loadFriends,
  logWorkoutActivity,
  saveActivities,
  saveFriends,
  uid,
} from "./lib/store";
import type { Activity } from "./lib/store";
import type { WorkoutGuide } from "./lib/guides";

type Tab = "feed" | "track" | "guides" | "stats" | "admin";

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(() => currentUser());
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(location.search).get("tab");
    return t === "feed" || t === "track" || t === "guides" || t === "stats" ? t : "track";
  });
  const [activities, setActivities] = useState<Activity[]>(() => loadActivities());
  const [friends, setFriendsState] = useState(() => loadFriends());
  const [filter, setFilter] = useState<"all" | "mine" | "friends">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const tracker = useTracker();

  useEffect(() => {
    saveActivities(activities);
  }, [activities]);

  // impor via #share= (base64 activity)
  useEffect(() => {
    const h = location.hash;
    if (h.startsWith("#share=")) {
      try {
        const obj = JSON.parse(decodeURIComponent(escape(atob(h.slice(7))))) as Activity;
        setActivities((prev) => {
          if (prev.some((a) => a.id === obj.id)) return prev;
          return [{ ...obj, id: uid(), mine: false, createdAt: Date.now() }, ...prev];
        });
        setTab("feed");
        toast("Aktivitas teman berhasil diimpor ke Feed.");
      } catch {
        toast("Tautan berbagi tidak valid.");
      }
      history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // normalisasi milik siapa berdasarkan user yg login (case-insensitive biar data lama nyambung)
  const view = useMemo(() => {
    if (!user) return activities;
    const uname = user.username.toLowerCase();
    const nm = user.name.toLowerCase();
    return activities
      .map((a) => ({ ...a, mine: a.owner.toLowerCase() === uname || a.owner.toLowerCase() === nm }))
      .sort((a, b) => b.startedAt - a.startedAt);
  }, [activities, user]);

  const openAct = useMemo(() => view.find((a) => a.id === openId) ?? null, [view, openId]);

  const friendsBest = useMemo(() => {
    if (!openAct || openAct.routeHash === "workout") return [];
    return view
      .filter((a) => a.routeHash === openAct.routeHash)
      .sort((x, y) => y.distanceM / Math.max(1, y.movingSec) - x.distanceM / Math.max(1, x.movingSec))
      .slice(0, 5);
  }, [view, openAct]);

  if (!user) {
    return (
      <div className="app">
        <header className="topbar"><b>AyoOlahraga</b><span className="muted">Gratis • Tanpa langganan</span></header>
        <main className="main">
          <AuthScreen
            onDone={(u) => {
              setUser(u);
              toast(`Selamat datang, ${u.name}.`);
            }}
          />
        </main>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  const patchUser = (p: Partial<User>) => {
    const users = updateUser(user.id, p);
    const fresh = users.find((u) => u.id === user.id);
    if (fresh) setUser(fresh);
  };

  const logWorkout = (g: WorkoutGuide) => {
    const act = logWorkoutActivity(user.username, g.title, g.durationMin, `${g.title} selesai (${g.durationMin} mnt, ±${g.caloriesEst} kkal).`);
    setActivities((prev) => [act, ...prev]);
    setTab("feed");
    setFilter("mine");
    toast(`${g.title} berhasil dicatat di Feed.`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "track", label: "Track" },
    { id: "guides", label: "Panduan" },
    { id: "stats", label: "Profil" },
  ];
  if (isAdmin) tabs.push({ id: "admin", label: "Admin" });

  return (
    <div className="app">
      <header className="topbar">
        <b>AyoOlahraga {isAdmin && <span className="badge">ADMIN</span>}</b>
        <span>
          <span className="muted">{user.name} </span>
          <button className="btn mini" onClick={() => { logout(); setUser(null); setOpenId(null); }}>Keluar</button>
        </span>
      </header>

      <main className="main">
        {openAct ? (
          <DetailScreen activity={openAct} friendsBest={friendsBest} onBack={() => setOpenId(null)} />
        ) : tab === "track" ? (
          <TrackScreen
            tracker={tracker}
            onSave={({ sport, title, desc, privacy, result }) => {
              const act = buildActivity(user.username, sport, title, result.startedAt, result.endedAt, result.points, privacy, desc);
              setActivities((p) => [act, ...p]);
              tracker.discardAll();
              setTab("feed");
              setFilter("mine");
              toast("Aktivitas berhasil disimpan di Feed.");
            }}
          />
        ) : tab === "feed" ? (
          <FeedScreen
            activities={view}
            me={user.username}
            isAdmin={isAdmin}
            filter={filter}
            setFilter={setFilter}
            onOpen={(id) => setOpenId(id)}
            onDelete={(id) => setActivities((p) => p.filter((a) => a.id !== id))}
            onKudos={(id) =>
              setActivities((p) =>
                p.map((a) => {
                  if (a.id !== id) return a;
                  const has = a.kudos.includes(user.username);
                  return { ...a, kudos: has ? a.kudos.filter((k) => k !== user.username) : [...a.kudos, user.username] };
                }),
              )
            }
            onComment={(id, text) =>
              setActivities((p) =>
                p.map((a) =>
                  a.id === id
                    ? { ...a, comments: [...a.comments, { id: uid(), user: user.name, text, at: Date.now() }] }
                    : a,
                ),
              )
            }
          />
        ) : tab === "guides" ? (
          <GuidesScreen
            isAdmin={isAdmin}
            user={user}
            onUserPatch={patchUser}
            onLogWorkout={logWorkout}
            onLogProgram={(minutes, title, desc) => {
              const act = logWorkoutActivity(user.username, title, minutes, desc);
              setActivities((prev) => [act, ...prev]);
            }}
          />
        ) : tab === "admin" && isAdmin ? (
          <AdminScreen me={user} activities={activities} onDeleteActivity={(id) => setActivities((p) => p.filter((a) => a.id !== id))} />
        ) : (
          <StatsScreen
            activities={view}
            me={user.name}
            setMe={(n) => patchUser({ name: n })}
            friends={friends}
            setFriends={(f) => {
              setFriendsState(f);
              saveFriends(f);
            }}
            onImportActivity={(a) =>
              setActivities((p) => {
                if (p.some((x) => x.id === a.id)) return p;
                return [{ ...a, id: uid() }, ...p];
              })
            }
            user={user}
            onPatchUser={patchUser}
          />
        )}
      </main>

      <nav className="bottomnav">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id && !openAct ? (t.id === "track" ? "active go" : "active") : t.id === "track" ? "go" : ""}
            onClick={() => { setOpenId(null); setTab(t.id); }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
