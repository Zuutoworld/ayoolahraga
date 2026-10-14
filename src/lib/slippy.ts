/* Matematika peta slippy-map (OSM). pure → bisa di-unit-test. */
export interface LatLngBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Proyeksi Web Mercator ke piksel global pada zoom z. */
export function mercPx(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n * 256;
  const lr = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) * n * 256;
  return { x, y };
}

/** Zoom terbesar agar bounds muat di kanvas w×h dengan padding. */
export function fitZoom(b: LatLngBounds, w: number, h: number, pad: number): number {
  for (let z = 18; z >= 1; z--) {
    const a = mercPx(b.minLat, b.minLng, z);
    const c = mercPx(b.maxLat, b.maxLng, z);
    if (Math.abs(c.x - a.x) <= w - pad * 2 && Math.abs(c.y - a.y) <= h - pad * 2) return z;
  }
  return 1;
}

/** Daftar tile yang menutupi bounds pada zoom z. [] bila kebanyakan (>30). */
export function coverTiles(b: LatLngBounds, z: number): { x: number; y: number }[] {
  const a = mercPx(b.minLat, b.minLng, z);
  const c = mercPx(b.maxLat, b.maxLng, z);
  const x0 = Math.floor(Math.min(a.x, c.x) / 256);
  const x1 = Math.floor((Math.max(a.x, c.x) - 1) / 256);
  const y0 = Math.floor(Math.min(a.y, c.y) / 256);
  const y1 = Math.floor((Math.max(a.y, c.y) - 1) / 256);
  const maxTile = 2 ** z - 1;
  const out: { x: number; y: number }[] = [];
  for (let x = Math.max(0, x0); x <= Math.min(maxTile, x1); x++) {
    for (let y = Math.max(0, y0); y <= Math.min(maxTile, y1); y++) {
      out.push({ x, y });
      if (out.length > 30) return [];
    }
  }
  return out;
}

/** Sudut kiri-atas (piksel global) agar bounds tepat di tengah kanvas. */
export function viewOrigin(b: LatLngBounds, z: number, w: number, h: number): { ox: number; oy: number } {
  const a = mercPx(b.minLat, b.minLng, z);
  const c = mercPx(b.maxLat, b.maxLng, z);
  const minX = Math.min(a.x, c.x);
  const maxX = Math.max(a.x, c.x);
  const minY = Math.min(a.y, c.y);
  const maxY = Math.max(a.y, c.y);
  return { ox: minX - (w - (maxX - minX)) / 2, oy: minY - (h - (maxY - minY)) / 2 };
}
