import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrackPoint } from "../lib/geo";

const PERSON_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7v1H4v-1z"/></svg>';

/** Ikon orang (divIcon SVG inline) — pengganti marker default Leaflet yang
 *  gambarnya 404 saat di-bundle Vite sehingga tampil rusak di HP. */
function personMarker(color: string): L.DivIcon {
  return L.divIcon({
    className: "ayo-marker",
    html: `<div class="ayo-pin" style="background:${color}">${PERSON_SVG}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function MapView({ points, height = 220 }: { points: TrackPoint[]; height?: number }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const dotsRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: false }).setView([-6.2, 106.8], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const clean = points.filter((p) => !p.paused && !p.gap);
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }
    if (dotsRef.current) {
      dotsRef.current.remove();
      dotsRef.current = null;
    }
    // hapus marker lama
    map.eachLayer((l) => {
      if (l instanceof L.Marker) l.remove();
    });
    if (clean.length === 0) return;
    const latlngs = clean.map((p) => [p.lat, p.lng]) as [number, number][];
    lineRef.current = L.polyline(latlngs, { color: "#fc4c02", weight: 4 }).addTo(map);
    // titik putih = akurasi rendah (50-100 m), direkam darurat agar garis ikut belokan
    const coarse = clean.filter((p) => p.coarse);
    if (coarse.length > 0) {
      dotsRef.current = L.layerGroup(
        coarse.map((p) =>
          L.circleMarker([p.lat, p.lng], {
            radius: 4,
            color: "#ffffff",
            weight: 2,
            fillColor: "#fc4c02",
            fillOpacity: 1,
          }),
        ),
      ).addTo(map);
    }
    L.marker(latlngs[0], { icon: personMarker("#2e9e44"), title: "Mulai" }).addTo(map);
    if (latlngs.length > 1) {
      L.marker(latlngs[latlngs.length - 1], { icon: personMarker("#fc4c02"), title: "Selesai" }).addTo(map);
    }
    map.fitBounds(lineRef.current.getBounds().pad(0.2));
  }, [points]);

  return <div ref={divRef} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}
