// テーマカラー: 部屋の地の色（--bg・--panel）、文字（--ink）、灯りの色（--accent）をまとめて替える。
// 時刻での色の移ろいは部屋の明かり（room-light.ts）がひとつで受け持つので、テーマの色はいつも同じ。
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

export interface ThemePrefs {
  fixed: string;
  custom: { bg: string; accent: string };
}

const KEY = "kona.theme";
const DEFAULTS: ThemePrefs = { fixed: "lamp", custom: { bg: "#1d1b26", accent: "#c9a0f0" } };

const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
const known = (k: unknown): k is string => k === CUSTOM || PALETTES.some(p => p.key === k);

export function themePrefs(): ThemePrefs {
  let v: Partial<ThemePrefs> & { mode?: string; slots?: { p?: unknown }[] } = {};
  try { v = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { /* 既定に戻す */ }
  // 以前「時刻で移ろう」にしていた人は、夜の色をいつもの色として引き継ぐ
  const night = v.mode === "time" && Array.isArray(v.slots) ? v.slots[3]?.p : undefined;
  return {
    fixed: known(night) ? night : known(v.fixed) ? v.fixed : DEFAULTS.fixed,
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

/** CSS 変数に流し込む。ほかの色（薄い文字・線・灯りの照り返し）は 4 色から作る */
export function applyTheme() {
  const c = paletteColors(themePrefs().fixed);
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

export function initTheme() {
  applyTheme();
}
