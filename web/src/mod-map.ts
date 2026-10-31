// 聴いた場所: 再生を始めた場所を、モノトーンの地図に小さな点で残す。
// 位置は端末の中（localStorage）にだけ、100m ほどの粗さに丸めて保存する。

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ctx, esc } from "./modctx";
import { playLog, setPlace, type PlayEvent } from "./store";

const KEY = "kona.mapRecord";
let recording = (() => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } })();
const listeners = new Set<() => void>();

/** 場所を記録するか（設定ページと、地図の下のチェックで切り替える） */
export const mapRecording = () => recording;
export function setMapRecording(on: boolean) {
  recording = on;
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
  document.querySelectorAll<HTMLInputElement>(".map-rec input").forEach(i => i.checked = on);
}

/** 再生を始めたときに呼ぶ。記録がオンなら位置を取って、その再生に付ける */
export function recordPlace(e: PlayEvent) {
  if (!recording || !("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    pos => { setPlace(e, pos.coords.latitude, pos.coords.longitude); listeners.forEach(fn => fn()); },
    () => { /* 許可されなければ記録しない */ },
    { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 20_000 },
  );
}

export function mountMap(body: HTMLElement) {
  body.innerHTML = `
    <div class="map">
      <div class="map-canvas"></div>
      <div class="map-bar">
        <label class="map-rec"><input type="checkbox"${recording ? " checked" : ""}>場所を記録する</label>
        <span class="map-count"></span>
      </div>
    </div>`;
  const root = body.querySelector<HTMLElement>(".map")!;
  const el = root.querySelector<HTMLElement>(".map-canvas")!;
  const count = root.querySelector<HTMLElement>(".map-count")!;
  const rec = root.querySelector<HTMLInputElement>(".map-rec input")!;
  rec.onchange = () => {
    setMapRecording(rec.checked);
    render();
  };

  const map = L.map(el, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([35.68, 139.76], 4);
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png`, {
    subdomains: "abcd", maxZoom: 18, className: "map-tiles",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let shown = "", fitted = false, bounds: L.LatLngBounds | undefined;
  // 地図の大きさが決まってから、記録した場所が収まるように寄せる
  const fit = () => {
    if (fitted || !bounds || !el.clientWidth || !el.clientHeight) return;
    fitted = true;
    map.invalidateSize();
    map.fitBounds(bounds.pad(0.4), { maxZoom: 14 });
  };

  const render = () => {
    const placed = playLog().filter(e => e.lat !== undefined && e.lon !== undefined);
    const sig = `${placed.length}|${recording}`;
    if (sig === shown) return;
    shown = sig;
    count.textContent = ""; // 場所の数は下でまとめてから出す
    // 同じ場所はまとめて、回数で点を大きくする
    const spots = new Map<string, { lat: number; lon: number; plays: PlayEvent[] }>();
    for (const e of placed) {
      const k = `${e.lat},${e.lon}`;
      const s = spots.get(k) ?? { lat: e.lat!, lon: e.lon!, plays: [] };
      s.plays.push(e); spots.set(k, s);
    }
    layer.clearLayers();
    if (spots.size) count.textContent = `${spots.size} か所 · ${placed.length} 回`;
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
    for (const s of spots.values()) {
      const last = s.plays[s.plays.length - 1];
      const titles = [...new Set(s.plays.slice(-5).reverse().map(e => ctx().byKey(e.k)?.title).filter(Boolean))];
      L.circleMarker([s.lat, s.lon], {
        radius: 3 + Math.min(7, Math.sqrt(s.plays.length) * 2), color: ink, weight: 1, fillColor: ink, fillOpacity: 0.55, opacity: 0.9,
      }).bindTooltip(`<b>${s.plays.length} 回</b>　${new Date(last.t).toLocaleDateString("ja-JP")}<br>${titles.map(t => esc(t!)).join("<br>")}`, { direction: "top", className: "map-tip" })
        .addTo(layer);
    }
    bounds = spots.size ? L.latLngBounds([...spots.values()].map(s => [s.lat, s.lon] as [number, number])) : undefined;
    fitted = false; fit();
  };
  listeners.add(render);
  new ResizeObserver(() => { map.invalidateSize(); fit(); }).observe(el);
  render();
}
