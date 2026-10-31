// テーマカラー: 部屋の地の色（--bg・--panel）、文字（--ink）、灯りの色（--accent）をまとめて替える。
// 「いつも同じ」か「時刻で移ろう」（朝・昼・夕・夜にそれぞれ色を決め、決めた時刻からゆっくり次の色へ移る）。
// どれも夜の部屋に合う暗い地に限る（棚・猫・窓辺は暗い部屋を前提に描いているため）。端末に覚える。
// キャンバスのモジュール（レコード・窓辺・波形など）は毎フレーム --accent を読むので、一緒に替わる。

export type RGB = [number, number, number];
export interface Palette { key: string; label: string; bg: string; panel: string; ink: string; accent: string }

export const PALETTES: Palette[] = [
  { key: "lamp", label: "灯り", bg: "#1a1d22", panel: "#24272d", ink: "#ece4d8", accent: "#f0b35e" },
  { key: "dawn", label: "朝靄", bg: "#1c2129", panel: "#252b35", ink: "#e8ecf2", accent: "#a9c8e6" },
  { key: "noon", label: "昼の書斎", bg: "#2a2a2a", panel: "#343433", ink: "#f2ede5", accent: "#e3c27c" },
  { key: "dusk", label: "夕焼け", bg: "#241c1e", panel: "#2f2528", ink: "#f1e3d9", accent: "#f08a5e" },
  { key: "forest", label: "森", bg: "#1a201c", panel: "#232a25", ink: "#e4ead9", accent: "#a8c686" },
  { key: "deep", label: "深い夜", bg: "#12151d", panel: "#1a1e29", ink: "#dfe3ee", accent: "#8fa8f0" },
  { key: "moon", label: "月明かり", bg: "#1c1c21", panel: "#25252b", ink: "#e8e6ee", accent: "#d6d2e6" },
  { key: "sakura", label: "夜桜", bg: "#211b20", panel: "#2c242a", ink: "#f0e4ea", accent: "#eba5bd" },
];
export const CUSTOM = "custom";

export interface Slot { label: string; at: string; p: string }
export interface ThemePrefs {
  mode: "fixed" | "time";
  fixed: string;
  slots: Slot[];
  /** 次の色へ移りきるまでの分 */
  fade: number;
  custom: { bg: string; accent: string };
}

const KEY = "kona.theme";
const DEFAULTS: ThemePrefs = {
  mode: "fixed", fixed: "lamp", fade: 60,
  slots: [
    { label: "朝", at: "05:30", p: "dawn" },
    { label: "昼", at: "10:00", p: "noon" },
    { label: "夕", at: "16:30", p: "dusk" },
    { label: "夜", at: "19:30", p: "lamp" },
  ],
  custom: { bg: "#1d1b26", accent: "#c9a0f0" },
};
export const FADES = [{ m: 0, label: "すぐ" }, { m: 15, label: "15 分" }, { m: 60, label: "1 時間" }, { m: 120, label: "2 時間" }];

const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const known = (k: unknown): k is string => k === CUSTOM || PALETTES.some(p => p.key === k);

export function themePrefs(): ThemePrefs {
  let v: Partial<ThemePrefs> = {};
  try { v = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { /* 既定に戻す */ }
  const slots = DEFAULTS.slots.map((d, i) => {
    const s = Array.isArray(v.slots) ? v.slots[i] : undefined;
    return { label: d.label, at: isTime(s?.at) ? s!.at : d.at, p: known(s?.p) ? s!.p : d.p };
  });
  return {
    mode: v.mode === "time" ? "time" : "fixed",
    fixed: known(v.fixed) ? v.fixed : DEFAULTS.fixed,
    slots,
    fade: FADES.some(f => f.m === v.fade) ? v.fade! : DEFAULTS.fade,
    custom: { bg: isHex(v.custom?.bg) ? v.custom!.bg : DEFAULTS.custom.bg, accent: isHex(v.custom?.accent) ? v.custom!.accent : DEFAULTS.custom.accent },
  };
}

export function setThemePrefs(p: Partial<ThemePrefs>) {
  const next = { ...themePrefs(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 保存できなくても動く */ }
  applyTheme();
}

// ---------- 色の計算 ----------
export const toRGB = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
export const toHex = (c: RGB) => "#" + c.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a: number) => `rgba(${c.map(Math.round).join(", ")}, ${a})`;
const WHITE: RGB = [255, 255, 255];
const BASE_INK: RGB = [236, 228, 216];

/** 地の色が明るすぎると文字と灯りが沈むので、明るさを抑える（HSL の L を 22% まで） */
function darken(c: RGB): RGB {
  const max = Math.max(...c), min = Math.min(...c), l = (max + min) / 2 / 255;
  return l <= .22 ? c : mix([0, 0, 0], c, .22 / l);
}

interface Colors { bg: RGB; panel: RGB; ink: RGB; accent: RGB }
export function paletteColors(key: string, prefs = themePrefs()): Colors {
  if (key === CUSTOM) {
    const bg = darken(toRGB(prefs.custom.bg)), accent = toRGB(prefs.custom.accent);
    return { bg, panel: mix(bg, BASE_INK, .06), ink: mix(BASE_INK, accent, .08), accent };
  }
  const p = PALETTES.find(x => x.key === key) ?? PALETTES[0];
  return { bg: toRGB(p.bg), panel: toRGB(p.panel), ink: toRGB(p.ink), accent: toRGB(p.accent) };
}
const mixColors = (a: Colors, b: Colors, t: number): Colors => ({ bg: mix(a.bg, b.bg, t), panel: mix(a.panel, b.panel, t), ink: mix(a.ink, b.ink, t), accent: mix(a.accent, b.accent, t) });

const minutes = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const smooth = (t: number) => t * t * (3 - 2 * t);

/** その時刻（0 時からの分）の色。時刻で移ろうときは、各時刻から fade 分かけて前の色から移る */
export function colorsAt(min: number, prefs = themePrefs()): Colors {
  if (prefs.mode === "fixed") return paletteColors(prefs.fixed, prefs);
  const s = [...prefs.slots].sort((a, b) => minutes(a.at) - minutes(b.at));
  // いまの時刻を過ぎた最後の区切り（どれも過ぎていなければ前の日の最後）
  let i = s.length - 1;
  for (let k = 0; k < s.length; k++) if (minutes(s[k].at) <= min) i = k;
  const cur = s[i], prev = s[(i - 1 + s.length) % s.length];
  const since = (min - minutes(cur.at) + 1440) % 1440;
  const to = paletteColors(cur.p, prefs);
  if (!prefs.fade || since >= prefs.fade) return to;
  return mixColors(paletteColors(prev.p, prefs), to, smooth(since / prefs.fade));
}

const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };

/** CSS 変数に流し込む。ほかの色（薄い文字・線・灯りの照り返し）は 4 色から作る */
export function applyTheme() {
  const c = colorsAt(nowMin());
  const r = document.documentElement.style;
  r.setProperty("--bg", toHex(c.bg));
  r.setProperty("--panel", toHex(c.panel));
  r.setProperty("--ink", toHex(c.ink));
  r.setProperty("--muted", toHex(mix(c.ink, c.bg, .38)));
  r.setProperty("--line", rgba(c.ink, .22));
  r.setProperty("--soft", rgba(c.ink, .08));
  r.setProperty("--accent", toHex(c.accent));
  r.setProperty("--lamp-ink", toHex(mix(c.accent, WHITE, .6)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", toHex(c.bg));
}

let timer = 0;
export function initTheme() {
  applyTheme();
  // 時刻で移ろう間は 30 秒ごとに少しずつ。タブに戻ったときもすぐ合わせる
  clearInterval(timer);
  timer = window.setInterval(() => { if (themePrefs().mode === "time") applyTheme(); }, 30_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) applyTheme(); });
}
