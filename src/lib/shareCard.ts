import { formatDate, formatDist, formatPace, formatTime } from "./geo";
import type { TrackPoint } from "./geo";
import type { Activity } from "./store";
import { activityText, openWaShare } from "./share";

export interface RoutePt {
  x: number;
  y: number;
}

/** Petakan titik GPS ke kanvas ((proporsional, padding). pure → bisa di-unit-test. */
export function layoutRoute(points: TrackPoint[], w: number, h: number, pad: number): RoutePt[] | null {
  const clean = points.filter((p) => !p.paused && !p.gap);
  if (clean.length === 0) return null;
  if (clean.length === 1) return [{ x: w / 2, y: h / 2 }];
  const meanLat = clean.reduce((s, p) => s + p.lat, 0) / clean.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xs = clean.map((p) => p.lng * kx);
  const ys = clean.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const s = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = pad + (w - pad * 2 - s * spanX) / 2 - s * minX;
  const oy = pad + (h - pad * 2 - s * spanY) / 2 + s * maxY;
  return clean.map((_, i) => ({ x: ox + s * xs[i], y: oy - s * ys[i] }));
}

function wrapTitle(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const next = cur ? `${cur} ${wd}` : wd;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = wd;
      if (lines.length === 2) break;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  const out = lines.slice(0, 2);
  if (words.join(" ").length > out.join(" ").length && out.length === 2) {
    out[1] = out[1].replace(/…?$/, "…");
  }
  return out;
}

/** Gambar kartu bagikan ala Strava (1080x1350, cocok untuk Status WA). */
export function drawShareCard(a: Activity): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas tidak didukung"));

  // latar
  ctx.fillStyle = "#0f0f10";
  ctx.fillRect(0, 0, W, H);

  // header aplikasi
  ctx.fillStyle = "#fc4c02";
  ctx.beginPath();
  ctx.roundRect(60, 56, 120, 120, 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 84px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", 120, 122);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f2f2f2";
  ctx.font = "700 52px system-ui, sans-serif";
  ctx.fillText("AyoOlahraga", 208, 100);
  ctx.fillStyle = "#a7a7ad";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText("GRATIS • TANPA LANGGANAN", 208, 148);

  // judul + pemilik
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 62px system-ui, sans-serif";
  const lines = wrapTitle(ctx, a.title || "Aktivitas", W - 120);
  lines.forEach((ln, i) => ctx.fillText(ln, 60, 280 + i * 74));
  const metaY = 280 + lines.length * 74;
  ctx.fillStyle = "#a7a7ad";
  ctx.font = "400 34px system-ui, sans-serif";
  ctx.fillText(`${a.owner} • ${formatDate(a.startedAt)}`, 60, metaY);

  // panel peta
  const mapX = 60;
  const mapY = metaY + 36;
  const mapW = W - 120;
  const mapH = 560;
  ctx.fillStyle = "#16171e";
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 32);
  ctx.fill();
  ctx.strokeStyle = "#2a2c31";
  ctx.lineWidth = 2;
  ctx.stroke();

  const route = layoutRoute(a.points, mapW, mapH, 70);
  if (route && route.length > 1) {
    ctx.strokeStyle = "#fc4c02";
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    route.forEach((p, i) => {
      const x = mapX + p.x;
      const y = mapY + p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const s0 = route[0];
    const s1 = route[route.length - 1];
    ctx.fillStyle = "#2e9e44";
    ctx.beginPath();
    ctx.arc(mapX + s0.x, mapY + s0.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fc4c02";
    ctx.beginPath();
    ctx.arc(mapX + s1.x, mapY + s1.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mapX + s1.x, mapY + s1.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#a7a7ad";
    ctx.font = "400 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Latihan tanpa GPS", mapX + mapW / 2, mapY + mapH / 2 - 10);
    ctx.fillText("dalam ruangan", mapX + mapW / 2, mapY + mapH / 2 + 34);
    ctx.textAlign = "left";
  }

  // statistik
  const statsY = mapY + mapH + 84;
  const cols = [
    { label: "Jarak", value: formatDist(a.distanceM) },
    { label: "Waktu", value: formatTime(a.movingSec) },
    { label: "Pace", value: `${formatPace(a.distanceM, a.movingSec)}/km` },
  ];
  cols.forEach((c, i) => {
    const x = 60 + (i * (W - 120)) / 3;
    ctx.fillStyle = "#a7a7ad";
    ctx.font = "400 30px system-ui, sans-serif";
    ctx.fillText(c.label, x, statsY);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 58px system-ui, sans-serif";
    ctx.fillText(c.value, x, statsY + 66);
  });

  // footer
  ctx.fillStyle = "#a7a7ad";
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Catat latihanmu gratis — AyoOlahraga", W / 2, H - 56);

  return new Promise((resolve, reject) => {
    cv.toBlob((b) => (b ? resolve(b) : reject(new Error("gagal render gambar"))), "image/png");
  });
}

/** Bagikan sebagai GAMBAR via panel berbagi HP (pilih WhatsApp).
 *  Jatuh ke unduhan + teks bila HP tidak mendukung. */
export async function shareActivityImage(a: Activity, toast: (m: string) => void): Promise<void> {
  try {
    const blob = await drawShareCard(a);
    const file = new File([blob], `ayoolahraga-${a.id.slice(0, 8)}.png`, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: a.title });
      return;
    }
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = file.name;
    el.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Gambar tersimpan. Kirim manual ke WhatsApp.");
  } catch {
    openWaShare(activityText(a, `${location.origin}${location.pathname}`));
  }
}
