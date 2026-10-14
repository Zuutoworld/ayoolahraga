import { useCallback, useEffect, useRef, useState } from "react";
import { classifyGps, haversineM, isImpossibleJump, totalDistanceM } from "./geo";
import type { GpsVerdict, TrackPoint } from "./geo";
import { loadDraft, saveDraft } from "./store";
import type { Draft, Sport } from "./store";

export type TrackState =
  | "idle"
  | "gps_check"
  | "countdown"
  | "tracking"
  | "paused"
  | "finish";

export interface FinishedResult {
  points: TrackPoint[];
  startedAt: number;
  endedAt: number;
}

export interface Tracker {
  state: TrackState;
  sport: Sport;
  points: TrackPoint[];
  distanceM: number;
  elapsedSec: number;
  countdown: number;
  gpsOk: boolean;
  gpsMsg: string;
  autoPaused: boolean;
  pending: FinishedResult | null;
  hasRecoveredDraft: boolean;
  setSport: (s: Sport) => void;
  startCheck: () => void;
  cancelCheck: () => void;
  discardAll: () => void;
  pause: (auto?: boolean) => void;
  resume: () => void;
  finish: () => { points: TrackPoint[]; startedAt: number; endedAt: number };
  recoverDraft: () => void;
  clearDraft: () => void;
}

const GAP_MS = 30_000;
const AUTO_PAUSE_SPEED = 0.5; // m/s
const AUTO_PAUSE_MS = 10_000;

export function useTracker(): Tracker {
  const [state, setState] = useState<TrackState>("idle");
  const [sport, setSport] = useState<Sport>("run");
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [gpsOk, setGpsOk] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("Menunggu GPS…");
  const [autoPaused, setAutoPaused] = useState(false);
  const [pending, setPending] = useState<FinishedResult | null>(null);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const autoRef = useRef(false);

  const watchId = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const pausedAccum = useRef<number>(0);
  const pauseStart = useRef<number>(0);
  const stillSince = useRef<number | null>(null);
  const elapsedTick = useRef<number>(0);
  const [, force] = useState(0);

  // Wake Lock: tahan layar HP tetap nyala saat tracking (hemat ribet, gratis)
  const wakeRef = useRef<{ release: () => void } | null>(null);
  const lockScreen = useCallback(() => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => void }> } };
      if (!nav.wakeLock) return;
      nav.wakeLock.request("screen").then(
        (s) => {
          wakeRef.current = s;
        },
        () => {},
      );
    } catch {
      // HP/browser tidak dukung, abaikan
    }
  }, []);
  const unlockScreen = useCallback(() => {
    try {
      wakeRef.current?.release();
    } catch {
      // abaikan
    }
    wakeRef.current = null;
  }, []);

  const ptsRef = useRef<TrackPoint[]>([]);
  const stateRef = useRef<TrackState>("idle");
  stateRef.current = state;

  const setPts = useCallback((p: TrackPoint[]) => {
    ptsRef.current = p;
    setPoints([...p]);
  }, []);

  // cerminkan autoPaused ke ref biar closure watchPosition selalu baca nilai terbaru
  useEffect(() => {
    autoRef.current = autoPaused;
  }, [autoPaused]);

  // autosave draft tiap 10 detik biar selamat kalau app ke-kill
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (
        (stateRef.current === "tracking" || stateRef.current === "paused") &&
        ptsRef.current.length > 0
      ) {
        const d: Draft = {
          sport,
          startedAt: startedAt.current,
          points: ptsRef.current,
          pausedTotalMs: pausedAccum.current,
        };
        saveDraft(d);
      }
      if (stateRef.current === "tracking" || stateRef.current === "paused") {
        force((x) => x + 1);
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [sport]);

  // cek draft crash saat mount
  useEffect(() => {
    const d = loadDraft();
    if (d) setHasRecoveredDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // kunci layar lagi kalau user balik ke tab saat tracking (khusus HP)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && stateRef.current === "tracking") lockScreen();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [lockScreen]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  const onPos = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;
      const t = pos.timestamp;
      // block mock location biar gak curang
      const isMock = (pos.coords as GeolocationCoordinates & { mock?: boolean }).mock === true;
      if (isMock) {
        setGpsMsg("Mock location terdeteksi — nonaktifkan Fake GPS agar hasil valid.");
        return;
      }

      const st = stateRef.current;
      if (st === "gps_check") {
        if (accuracy && accuracy <= 20) {
          setGpsOk(true);
          setGpsMsg(`GPS baik (±${Math.round(accuracy)} m). Siap memulai.`);
        } else {
          setGpsMsg(`Akurasi ±${Math.round(accuracy ?? 999)} m — cari area langit terbuka…`);
        }
        return;
      }
      if (st !== "tracking" && st !== "paused") return;

      const acc = accuracy ?? 999;
      const prev = ptsRef.current[ptsRef.current.length - 1];
      const gap = prev ? t - prev.t > GAP_MS : false;
      let verdict: GpsVerdict;
      if (st === "paused") {
        // penanda batas jeda: terima selama akurasi masuk akal (tidak dihitung ke jarak)
        verdict = acc <= 100 ? "good" : "drop";
      } else {
        const dist = prev
          ? haversineM(prev, { lat: latitude, lng: longitude, t, acc })
          : null;
        verdict = classifyGps(prev ? prev.t : null, t, acc, speed ?? null, dist);
      }
      if (verdict === "drop") return;
      const np: TrackPoint = {
        lat: latitude,
        lng: longitude,
        t,
        acc,
        paused: st === "paused",
        gap,
        coarse: verdict === "coarse",
      };
      // loncat tidak wajar -> buang (titik coarse dikecualikan karena memang noisy)
      if (verdict === "good" && prev && !gap && !np.paused && !prev.paused) {
        const dt = Math.max(1, (t - prev.t) / 1000);
        if (isImpossibleJump(haversineM(prev, np), dt)) return;
      }
      const next = [...ptsRef.current, np];
      setPts(next);

      // auto-pause: diam < 0.5 m/s selama 10 detik
      const spd = speed ?? null;
      if (st === "tracking" && spd !== null && spd < AUTO_PAUSE_SPEED) {
        if (!stillSince.current) stillSince.current = t;
        if (t - stillSince.current > AUTO_PAUSE_MS) {
          pauseStart.current = Date.now();
          setAutoPaused(true);
          setState("paused");
        }
      } else if (spd !== null && spd >= 1) {
        stillSince.current = null;
        if (st === "paused" && autoRef.current) {
          // auto-resume kalau user jalan lagi
          pausedAccum.current += Date.now() - pauseStart.current;
          setAutoPaused(false);
          setState("tracking");
        } else if (st === "tracking") {
          stillSince.current = null;
        }
      }
    },
    [setPts],
  );

  const onErr = useCallback((e: GeolocationPositionError) => {
    if (stateRef.current === "gps_check") {
      setGpsMsg(`GPS error: ${e.message}. Aktifkan izin Location di perangkat.`);
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsMsg("Browser tidak dukung GPS.");
      return;
    }
    stopWatch();
    watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });
  }, [onPos, onErr, stopWatch]);

  const startCheck = useCallback(() => {
    setState("gps_check");
    setGpsOk(false);
    setGpsMsg("Mencari sinyal GPS…");
    startWatch();
    // auto countdown setelah 4 detik walau akurasi belum sempurna (kasih opsi mulai)
    window.setTimeout(() => {
      if (stateRef.current !== "gps_check") return;
      setState("countdown");
      setCountdown(3);
      let c = 3;
      const iv = window.setInterval(() => {
        c -= 1;
        if (c <= 0) {
          window.clearInterval(iv);
          startedAt.current = Date.now();
          pausedAccum.current = 0;
          ptsRef.current = [];
          setPts([]);
          stillSince.current = null;
          setAutoPaused(false);
          setState("tracking");
          startWatch();
          lockScreen();
          elapsedTick.current = Date.now();
        } else {
          setCountdown(c);
        }
      }, 700);
    }, 4000);
  }, [setPts, startWatch, lockScreen]);

  const cancelCheck = useCallback(() => {
    stopWatch();
    setState("idle");
  }, [stopWatch]);

  const discardAll = useCallback(() => {
    stopWatch();
    unlockScreen();
    setPending(null);
    ptsRef.current = [];
    setPts([]);
    saveDraft(null);
    setHasRecoveredDraft(false);
    setAutoPaused(false);
    setState("idle");
  }, [setPts, stopWatch, unlockScreen]);

  const pause = useCallback((_auto?: boolean) => {
    if (stateRef.current !== "tracking") return;
    pauseStart.current = Date.now();
    unlockScreen();
    setState("paused");
  }, [unlockScreen]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") return;
    pausedAccum.current += Date.now() - pauseStart.current;
    stillSince.current = null;
    setAutoPaused(false);
    lockScreen();
    // tandai boundary biar jarak tidak narik garis lurus
    const prev = ptsRef.current[ptsRef.current.length - 1];
    if (prev) {
      const next = [...ptsRef.current, { ...prev, t: Date.now(), paused: true }];
      setPts(next);
    }
    setState("tracking");
  }, [setPts, lockScreen]);

  const finish = useCallback(() => {
    stopWatch();
    unlockScreen();
    saveDraft(null);
    setHasRecoveredDraft(false);
    const endedAt = Date.now();
    const res: FinishedResult = {
      points: [...ptsRef.current],
      startedAt: startedAt.current || endedAt,
      endedAt,
    };
    setPending(res);
    setState("finish");
    return res;
  }, [stopWatch, unlockScreen]);

  const recoverDraft = useCallback(() => {
    const d = loadDraft();
    if (!d) return;
    startedAt.current = d.startedAt;
    pausedAccum.current = d.pausedTotalMs;
    setSport(d.sport);
    setPts(d.points);
    setHasRecoveredDraft(false);
    setState("paused");
    startWatch();
  }, [setPts, startWatch]);

  const clearDraft = useCallback(() => {
    saveDraft(null);
    setHasRecoveredDraft(false);
  }, []);

  const distanceM = totalDistanceM(points);
  const elapsedSec =
    state === "tracking" || state === "paused"
      ? Math.max(0, Math.round((Date.now() - (startedAt.current || Date.now()) - pausedAccum.current) / 1000))
      : 0;

  return {
    state,
    sport,
    points,
    distanceM,
    elapsedSec,
    countdown,
    gpsOk,
    gpsMsg,
    autoPaused,
    pending,
    hasRecoveredDraft,
    setSport,
    startCheck,
    cancelCheck,
    discardAll,
    pause,
    resume,
    finish,
    recoverDraft,
    clearDraft,
  };
}
