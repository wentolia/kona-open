// スマホ版のモック: 音は鳴らさず、サンプルのアルバムと疑似的な再生で画面と操作を確かめる
import "./style.css";
import type { Album, Track } from "./library";
import type { Player } from "./player";
import { initMobile, renderMobile } from "./mobile";
import { recordPlay } from "./store";
import { esc } from "./dom";

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ジャケット: 色の面と円を重ねた抽象画（SVG）
function cover(h: number) {
  const c = (dh: number, s: number, l: number) => `hsl(${(h + dh) % 360} ${s}% ${l}%)`;
  const shapes = Array.from({ length: 5 }, (_, i) => `<circle cx="${rnd() * 300}" cy="${rnd() * 300}" r="${30 + rnd() * 90}" fill="${c(i * 47, 55, 45 + rnd() * 20)}" opacity=".85"/>`).join("");
  const lines = Array.from({ length: 4 }, () => `<line x1="${rnd() * 300}" y1="0" x2="${rnd() * 300}" y2="300" stroke="${c(180, 30, 85)}" stroke-width="${1 + rnd() * 3}" opacity=".6"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${c(0, 35, 22)}"/>${shapes}${lines}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const DATA: Record<string, [string, string][]> = {
  "Jazz": [["Blue Hour Sessions", "Mori Trio"], ["Lantern", "Aki Sato Quartet"], ["Small Hours", "The Hollows"], ["Kintsugi", "Rei Nakano"], ["Night Ferry", "Ode Ensemble"], ["Paper Moons", "Mori Trio"], ["Orchard", "Hana Ito"]],
  "Ambient": [["Field Notes", "Saltmarsh"], ["Low Tide Hours", "Saltmarsh"], ["Quiet Machines", "Weaver"], ["Driftwood", "Isle"], ["Northern Rooms", "Weaver"], ["After Rain", "Kumo"]],
  "Pop": [["Iron Bloom", "Yoake"], ["Yoake I", "Yoake"], ["Yoake II", "Yoake"], ["Summer Static", "Coast"], ["Neon Garden", "Mika"], ["Polaroid", "Coast"], ["Orbit", "Mika"], ["Glass Town", "Hikari"]],
  "Classical": [["Goldberg Variations", "K. Ando"], ["Nocturnes", "E. Morel"], ["Cello Suites", "T. Weiss"], ["Preludes", "E. Morel"]],
};
const albums: Album[] = [];
for (const [shelf, list] of Object.entries(DATA)) for (const [title, artist] of list) {
  const h = Math.floor(rnd() * 360), n = 4 + Math.floor(rnd() * 9);
  const tracks: Track[] = Array.from({ length: n }, (_, i) => ({
    entry: { path: `${shelf}/${title}/${i + 1}.flac`, getFile: async () => new File([], "") },
    title: ["Opening", "Harbor", "Morning Light", "Slow Walk", "Window", "Paper Boat", "Late Bus", "Lull", "Ember", "Coda", "Tide", "Moss"][(i + h) % 12] + (i > 9 ? " II" : ""),
    no: i + 1, disc: 1, duration: 150 + Math.floor(rnd() * 200), format: "FLAC · 16bit / 44.1kHz",
  }));
  albums.push({ key: `${shelf}/${title}`, shelf, dir: title, title, artist, year: 1990 + Math.floor(rnd() * 34), tracks, cover: cover(h), color: `hsl(${h} 32% 34%)`, ratio: 1, tagged: true });
}
// 最近聴いた・よく聴くを出すために、いくつか聴いたことにする
if (!localStorage.getItem("kona.mock.seeded")) {
  for (const i of [3, 7, 7, 7, 12, 12, 1, 15, 15, 15, 15, 20, 4, 9]) recordPlay(albums[i].key);
  localStorage.setItem("kona.mock.seeded", "1");
}

// 疑似プレイヤー: 時間だけ進める
class MockPlayer {
  album?: Album; index = 0; position = 0; private on_ = false; private fns = new Set<() => void>();
  constructor() { setInterval(() => { if (!this.on_) return; this.position += .5; if (this.position >= this.duration) this.next(); }, 500); }
  get track() { return this.album?.tracks[this.index]; }
  get playing() { return this.on_; }
  get duration() { return this.track?.duration ?? 0; }
  on(fn: () => void) { this.fns.add(fn); return () => this.fns.delete(fn); }
  private emit() { this.fns.forEach(f => f()); }
  async playAlbum(a: Album, i = 0) { this.album = a; this.index = i; this.position = 0; this.on_ = true; this.emit(); }
  toggle() { if (!this.album) return; this.on_ = !this.on_; this.emit(); }
  mode: "normal" | "album" | "track" | "shuffle" = "normal";
  cycleMode() { const m = ["normal", "album", "track", "shuffle"] as const; this.mode = m[(m.indexOf(this.mode) + 1) % m.length]; this.emit(); }
  next() {
    if (!this.album) return;
    if (this.index < this.album.tracks.length - 1) { this.index++; this.position = 0; this.emit(); return; }
    const k = queue.shift(); const a = k && albums.find(x => x.key === k);
    if (a) { recordPlay(a.key); this.playAlbum(a, 0); } else { this.on_ = false; this.position = 0; this.emit(); }
    renderMobile();
  }
  prev() { if (this.position > 3 || this.index === 0) this.position = 0; else this.index--; this.emit(); }
  seek(r: number) { this.position = r * this.duration; this.emit(); }
}

const queue: string[] = [albums[5].key, albums[17].key];
const player = new MockPlayer();

let toastTimer = 0;
function toast(text: string, action?: string, run?: () => void) {
  document.getElementById("toast")?.remove(); clearTimeout(toastTimer);
  const el = document.createElement("div");
  el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status");
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button>${esc(action)}</button>` : ""}`;
  if (action && run) el.querySelector("button")!.onclick = () => { el.remove(); run(); };
  document.body.append(el);
  toastTimer = window.setTimeout(() => el.remove(), 4000);
}

initMobile({
  player: player as unknown as Player,
  albums: () => albums,
  queue,
  play: async (a, i = 0) => { if (a !== player.album) recordPlay(a.key); await player.playAlbum(a, i); renderMobile(); },
  queueChanged: () => renderMobile(),
  colorOf: a => a.color ?? "#444",
  art: a => a.cover ? `<img class="art" alt="" src="${a.cover}">` : `<div class="art-blank" style="background:${a.color}">${esc(a.title)}</div>`,
  openSource: () => toast("モックでは開けません"),
  driveName: () => "Music",
  driveConfigured: () => true,
  toast,
  status: () => `サンプル · ${albums.length} 枚`,
}, undefined, { force: true });
player.playAlbum(albums[7], 2).then(() => player.toggle());
