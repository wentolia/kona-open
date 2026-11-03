// 部屋に置くものの動き: ItemDef.live(svg) が返す関数を、毎コマまとめて呼ぶ。
// 画面に出ていないもの（棚の外の置き場・別の画面）は呼ばない。動きを減らす設定では calm が true になる（ゆっくり・小さく）。
// 見本帳ではプレイヤーがないので、鳴っているつもりの値で動かす
import type { Album } from "../library";
import type { ItemDef } from "./types";

export interface LiveState {
  /** 秒 */ t: number; dt: number;
  playing: boolean;
  /** 音の大きさ（0〜1、なめらかにしたもの） */ loud: number;
  /** 再生中（または止めているいま選んでいる）アルバム */ album?: Album;
  albums: () => Album[];
  colorOf: (a: Album) => string;
  calm: boolean;
}
export type LiveTick = (s: LiveState) => void;
export type Live = (svg: SVGSVGElement) => LiveTick | void;

type Src = { playing: boolean; levels: () => [number, number]; album?: Album; albums: () => Album[]; colorOf: (a: Album) => string; calm: () => boolean };
let source: () => Src | undefined = () => undefined;
/** 本物のプレイヤーをつなぐ（main.ts）。つながっていなければ見本帳の動き */
export const setLiveSource = (f: () => Src | undefined) => { source = f; };

const live = new Set<{ svg: SVGSVGElement; tick: LiveTick }>();
let running = false, last = performance.now(), loud = 0;

export function startLive(def: ItemDef | undefined, svg: SVGSVGElement | null | undefined) {
  if (!def?.live || !svg || svg.dataset.live) return;
  svg.dataset.live = "1";
  try { const tick = def.live(svg); if (tick) live.add({ svg, tick }); } catch (e) { console.error(e); }
  if (!running) { running = true; requestAnimationFrame(frame); }
}

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000), t = now / 1000; last = now;
  const src = source();
  let playing = true, raw = .45 + .3 * Math.sin(t * 2.3) * Math.sin(t * .7);
  if (src) { playing = src.playing; const [l, r] = src.levels(), rms = (l + r) / 2; raw = rms > 0 ? Math.max(0, Math.min(1, (20 * Math.log10(rms) + 48) / 42)) : 0; }
  loud += (raw - loud) * (1 - Math.exp(-dt / .12));
  const s: LiveState = { t, dt, playing, loud, album: src?.album, albums: src?.albums ?? (() => []), colorOf: src?.colorOf ?? (() => "#888"), calm: src?.calm() ?? false };
  for (const x of live) {
    if (!x.svg.isConnected) continue;
    if (x.svg.closest("[hidden]")) continue;
    try { x.tick(s); } catch (e) { console.error(e); live.delete(x); }
  }
}

/** 押すと点く灯りなどの、種類ごとの on/off（端末に覚える） */
const LIT = "kona.itemlit";
export function litOf(k: string): boolean { try { return (JSON.parse(localStorage.getItem(LIT) || "[]") as string[]).includes(k); } catch { return false; } }
export function setLit(k: string, on: boolean) {
  try { const v = new Set(JSON.parse(localStorage.getItem(LIT) || "[]") as string[]); if (on) v.add(k); else v.delete(k); localStorage.setItem(LIT, JSON.stringify([...v])); } catch { /* ignore */ }
}
/** ドラッグのあとのクリックは place-drag / size-knob が捨てるので、ここでは押されたときだけ動く */
export function onPress(svg: SVGSVGElement, fn: () => void) {
  const host = (svg.closest(".thing") as HTMLElement | null) ?? svg;
  host.addEventListener("click", e => { if (svg.closest(".pr-home")) return; e.stopPropagation(); fn(); });
  host.style.cursor = "pointer";
}

/** 湯気・煙: 立ちのぼって消える小さな多角形。strength 0〜1 で濃さ */
export function wisps(svg: SVGSVGElement, x: number, y: number, n = 3, color = "rgba(255,255,255,.7)") {
  svg.style.overflow = "visible";
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("pointer-events", "none");
  const ps = Array.from({ length: n }, (_, i) => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    p.setAttribute("points", "-1.6,0 0,-3.2 1.6,0 0,1.6"); p.setAttribute("fill", color); g.append(p);
    return { p, ph: i / n };
  });
  svg.append(g);
  return (s: LiveState, strength: number) => {
    const sp = s.calm ? .12 : .3;
    for (const w of ps) {
      const k = (s.t * sp + w.ph) % 1, dx = Math.sin(k * 6 + w.ph * 9) * 2.4;
      w.p.setAttribute("transform", `translate(${(x + dx).toFixed(2)} ${(y - k * 18).toFixed(2)}) scale(${(.8 + k * 1.4).toFixed(2)})`);
      w.p.setAttribute("opacity", (strength * Math.sin(k * Math.PI) * .9).toFixed(2));
    }
  };
}

/** 小さな音（オルゴール・風鈴）。部屋の雰囲気を壊さないよう小さめ */
let ac: AudioContext | undefined;
export function chimeNotes(freqs: number[], gap = .22, vol = .06) {
  try {
    ac ??= new AudioContext();
    void ac.resume();
    const t0 = ac.currentTime + .02;
    freqs.forEach((f, i) => {
      const o = ac!.createOscillator(), g = ac!.createGain(), t = t0 + i * gap;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
      o.connect(g).connect(ac!.destination); o.start(t); o.stop(t + 1.5);
    });
    return t0 - ac.currentTime + freqs.length * gap + .4;
  } catch { return 0; }
}

/** 部品を描き替えるときの短縮 */
export const q = <T extends Element = SVGElement>(svg: SVGSVGElement, sel: string) => svg.querySelector(sel) as T | null;
export const qa = (svg: SVGSVGElement, sel: string) => [...svg.querySelectorAll<SVGElement>(sel)];

/** ジャケットを飾る: いまのアルバムのジャケット（なければその色）を、仮の絵 .ph の上に重ねる */
export function albumPic(svg: SVGSVGElement, x: number, y: number, w: number, h: number, tilt = 0): LiveTick {
  const NS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(NS, "g"), bg = document.createElementNS(NS, "rect"), im = document.createElementNS(NS, "image");
  for (const e of [bg, im]) { e.setAttribute("x", String(x)); e.setAttribute("y", String(y)); e.setAttribute("width", String(w)); e.setAttribute("height", String(h)); }
  im.setAttribute("preserveAspectRatio", "xMidYMid slice");
  if (tilt) g.setAttribute("transform", `rotate(${tilt} ${x + w / 2} ${y + h / 2})`);
  g.append(bg, im); g.style.display = "none";
  const ph = svg.querySelector(".ph");
  ph?.after(g);
  let shown: unknown = null;
  return s => {
    const a = s.album;
    if (a === shown && (!a || im.getAttribute("href") === (a.cover ?? null))) return;
    shown = a;
    g.style.display = a ? "" : "none";
    ph?.setAttribute("opacity", a ? "0" : "1");
    if (!a) return;
    bg.setAttribute("fill", s.colorOf(a));
    if (a.cover) im.setAttribute("href", a.cover); else im.removeAttribute("href");
  };
}

/** 押すと点く灯り。点いているあいだは温かい光をまとい、.bulb が明るくなる */
export function lamp(svg: SVGSVGElement, key: string, size = 10): LiveTick {
  const bulbs = qa(svg, ".bulb");
  let on = litOf(key), k = on ? 1 : 0;
  onPress(svg, () => { on = !on; setLit(key, on); });
  return s => {
    on = litOf(key);
    const want = on ? 1 : 0;
    if (Math.abs(k - want) < .01 && svg.dataset.lit === String(want)) return;
    k += (want - k) * Math.min(1, s.dt * 6);
    if (Math.abs(k - want) < .01) k = want;
    svg.dataset.lit = String(k);
    svg.style.filter = k ? `drop-shadow(0 0 ${(size * k).toFixed(1)}px rgba(255,205,130,${(.85 * k).toFixed(2)})) brightness(${(1 + .1 * k).toFixed(3)})` : "";
    for (const b of bulbs) b.style.filter = `brightness(${(.78 + .3 * k).toFixed(3)})`;
  };
}
