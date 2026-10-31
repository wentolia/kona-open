// 棚の上の小物: 棚板の上に、猫と同じローポリ（平らな多角形と濃淡 4 段）で描いた小物を並べる。
// どれも音楽と暮らしに結びついた役目を持つ:
//  - 灯り: 押すと点く。点けている間は棚全体がほんのり暖かく照らされる
//  - 鉢植え: 音楽を聴いた日の数だけ育ち、季節で姿が変わる。音に合わせて葉が揺れる
//  - ろうそく: 火を灯すと 30 分で燃え尽き、音を静かに絞って止める（おやすみタイマー）。炎は音の大きさで伸び縮みする
//  - 砂時計: 今の曲の進み具合で砂が落ちる。曲が変わるとくるりと返る
//  - きょうのレコード: きょう聴いたアルバムが 1 枚ずつ積み重なる。押すとそのアルバムをもう一度かける
//  - 金魚鉢: 金魚が音の大きさに合わせて泳ぐ。静かなときは底でじっとしている。押すとえさをあげられる。水草は聴いた日の数だけ育つ
//  - 読みかけの本: 音楽を聴いている間に少しずつ読み進む（2 分で 1 ページ）。読み終えると下に積んで次の本へ
//  - 編みもの: 聴いている間に 1 段ずつ編み進む（3 分で 1 段）。編み上がるとかごにしまって次の毛糸へ
//  - ポスト: 月が替わると「先月よく聴いたアルバム」の手紙が届く。押すと読める
//  - 賞状: 聴いた距離が目じるしに届くと額に入った賞状が立つ。押すと証書（画像にして保存・共有できる）
//  - サボテン: 聴いた日の数だけ背が伸びて腕が増える。7 日続けて聴くと花が咲く
//  - ポトス: 吊り鉢から蔓が垂れる。聴いた時間で葉が増え、蔓が伸びる（20 分で 1 枚）
//  - 季節の切り花: 月ごとに花が替わる（水仙・梅・菜の花・桜・カーネーション・紫陽花・ひまわり・桔梗・ススキ・コスモス・菊・椿）。
//    押すと水を替える。替えずに日が経つと少しずつうなだれる
//  夏の夜に灯りを点けていると、小さな虫が寄ってくる

import "./mod-objects.css";
import { ctx, everyFrame, esc, fmt } from "./modctx";
import { playLog, listenedSeconds } from "./store";
import { reduceMotion } from "./prefs";
import { awards, openCertificate } from "./awards";

const KEY = "kona.objects";
let uid = 0;

/** 置ける小物。設定でどれを置くか選ぶ。w は描いた幅（高さ 100 に対して） */
export const OBJECTS = [
  { key: "lamp", label: "灯り", w: 72 }, { key: "plant", label: "鉢植え", w: 62 }, { key: "candle", label: "ろうそく（おやすみタイマー）", w: 44 },
  { key: "hourglass", label: "砂時計", w: 44 }, { key: "records", label: "きょうのレコード", w: 76 }, { key: "bowl", label: "金魚鉢", w: 70 },
  { key: "book", label: "読みかけの本", w: 64 }, { key: "knit", label: "編みもの", w: 66 }, { key: "post", label: "ポスト（月に一度の手紙）", w: 46 },
  { key: "award", label: "賞状（聴いた距離の証書）", w: 52 },
  { key: "cactus", label: "サボテン", w: 40 }, { key: "pothos", label: "ポトス（吊り鉢）", w: 56 }, { key: "vase", label: "季節の切り花", w: 46 },
] as const;
const CANDLE_MIN = 30;
type Saved = { lamp: boolean; hide: string[]; candle?: number; letter?: string; water?: number };
const load = (): Saved => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { lamp: !!v.lamp, hide: Array.isArray(v.hide) ? v.hide : [], ...(typeof v.candle === "number" ? { candle: v.candle } : {}), ...(typeof v.letter === "string" ? { letter: v.letter } : {}), ...(typeof v.water === "number" ? { water: v.water } : {}) };
  } catch { return { lamp: false, hide: [] }; }
};
const save = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 保存できなくても動く */ } };
const patch = (p: Partial<Saved>) => { const s = { ...load(), ...p }; if (p.candle === undefined && "candle" in p) delete s.candle; save(s); };
export const objectShown = (key: string) => !load().hide.includes(key);
export function setObjectShown(key: string, on: boolean) {
  const s = load();
  s.hide = s.hide.filter(k => k !== key).concat(on ? [] : [key]);
  save(s);
  document.dispatchEvent(new CustomEvent("kona:objects"));
}

// ---------- 描くための道具 ----------
// 猫と同じく、多角形を同じ色の細い縁で塗って継ぎ目を消す
const poly = (c: string, pts: string, cls = "") =>
  `<polygon${cls ? ` class="${cls}"` : ""} style="fill:${c};stroke:${c}" points="${pts}"/>`;
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${Math.max(3, Math.min(97, l)).toFixed(0)}%)`;
const hsh = (i: number, n: number) => { const x = Math.sin(i * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };
const strHash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const mix = (c: string, to: string, pct: number) => `color-mix(in srgb, ${c} ${100 - pct}%, ${to})`;
const P = (pts: number[][]) => pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
const smooth = (t: number) => t * t * (3 - 2 * t);

// 素材の色（夜の部屋に合わせ、やや暗め）。濃淡 4 段: 光の当たる上・左が明るく、右・下が暗い
const IRON = { hi: "#6a645c", mid: "#4f4a44", lo: "#3a3631", deep: "#26231f" };
const BRASS = { hi: "#d4ae6e", mid: "#a8834c", lo: "#7c5e35", deep: "#4f3b21" };
const WOOD = { hi: "#94694a", mid: "#704e35", lo: "#513725", deep: "#36251a" };
const CLAY = { hi: "#c27a52", mid: "#a1603e", lo: "#7c472d", deep: "#56301e" };
const WAX = { top: "#f6eedd", hi: "#ebe0c8", mid: "#d6c8ab", lo: "#b0a185" };
const SAND = { hi: "#e6c890", lo: "#be9a62" };

// ---------- 季節の鉢植え ----------
// 音楽を聴いた日の数だけ育つ（芽 → 30 日ほどで茂る）。季節で姿が変わる:
// 春は花が咲き、夏は濃く大きく、秋は葉が色づいて棚に落ち葉、冬は葉を減らしてじっとしている
type Season = "spring" | "summer" | "autumn" | "winter";
const seasonOf = (d = new Date()): Season => { const m = d.getMonth() + 1; return m >= 3 && m <= 5 ? "spring" : m <= 8 && m >= 6 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter"; };
const daysListened = () => new Set(playLog().map(e => new Date(e.t).toDateString())).size;
interface Leaf { a: number; len: number; hi: string; lo: string }
interface Plant { leaves: Leaf[]; flowers: { a: number; h: number }[]; fallen: { x: number; r: number; hi: string; lo: string }[]; season: Season; growth: number }
function plantOf(days: number, season: Season, now = new Date()): Plant {
  const growth = Math.max(.12, Math.min(1, days / 30));
  let n = 2 + Math.round(7 * growth);
  if (season === "winter") n = Math.max(2, Math.round(n * .65));
  // 秋の深まり（9/1 → 11/30 で 0 → 1）
  const fall = season === "autumn" ? Math.min(1, ((now.getMonth() - 8) * 30 + now.getDate()) / 90) : 0;
  const green = season === "spring" ? [112, 46, 48] : season === "summer" ? [128, 44, 36] : season === "winter" ? [100, 14, 46] : [112, 36, 42];
  const leaves: Leaf[] = Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1, k = (i + 1) / (n + 1);
    const a = side * (8 + 58 * Math.abs(k - .5) * 2) * (season === "winter" ? 1.15 : 1) + (hsh(i, 1) - .5) * 10;
    const len = (14 + 26 * growth) * (1 - Math.abs(k - .5) * .7) * (.85 + hsh(i, 2) * .3) * (season === "summer" ? 1.12 : 1);
    // 秋は外側の葉から色づく
    const turn = Math.max(0, Math.min(1, fall * 1.4 - .4 + Math.abs(k - .5) * .8 + hsh(i, 3) * .25));
    const hue = green[0] - turn * (green[0] - (hsh(i, 4) < .4 ? 8 : 30)), sat = green[1] + turn * 30, lig = green[2] + turn * 4;
    return { a, len, hi: hsl(hue, sat, lig + 7), lo: hsl(hue, sat, lig - 7) };
  });
  const nf = 1 + Math.round(3 * growth);
  const flowers = season === "spring" && growth > .3 ? Array.from({ length: nf }, (_, i) => ({ a: (nf > 1 ? (i / (nf - 1) - .5) * 56 : 6) + (hsh(i, 5) - .5) * 10, h: 28 + 18 * growth + hsh(i, 6) * 8 })) : [];
  const fallen = season === "autumn" ? Array.from({ length: Math.round(fall * 3) }, (_, i) => {
    const hue = hsh(i, 10) < .4 ? 8 : 30;
    return { x: hsh(i, 7) < .5 ? -17 - hsh(i, 8) * 9 : 17 + hsh(i, 8) * 9, r: hsh(i, 9) * 180, hi: hsl(hue, 70, 52), lo: hsl(hue, 70, 40) };
  }) : [];
  return { leaves, flowers, fallen, season, growth };
}
// 葉: 主脈で 2 枚の三角に割り、片側を明るく
const leafArt = (l: { len: number; hi: string; lo: string }) => {
  const L = l.len, w = L * .24;
  return poly(l.hi, P([[0, 0], [-w, -L * .36], [-w * .6, -L * .72], [0, -L]])) + poly(l.lo, P([[0, 0], [0, -L], [w * .6, -L * .72], [w, -L * .36]]));
};

// ---------- 小物の形（どれも高さ 100、足元 y=100 が棚板の上） ----------
const lampArt = (id: string) => `
  <defs><linearGradient id="${id}-cone" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
  </linearGradient></defs>
  <polygon class="cone" points="42,57 66,52 96,100 14,100" fill="url(#${id}-cone)"/>
  ${poly(IRON.lo, "6,100 36,100 33,93 9,93")}${poly(IRON.mid, "9,93 33,93 29,89.5 13,89.5")}${poly(IRON.deep, "33,93 36,100 36,100 33,96")}
  ${poly(IRON.mid, "19.6,90 22.4,90 33.2,62.6 30.6,61.6")}${poly(IRON.lo, "22.4,90 21,90 31.4,62.2 33.2,62.6")}
  ${poly(IRON.mid, "30.6,61 33.4,61.4 49.6,42.4 47.4,40.8")}${poly(IRON.lo, "33.4,61.4 32.4,62 48.6,42 49.6,42.4")}
  ${poly(BRASS.hi, "29.4,62 31.2,59.4 34,60 34.4,63 32,64.6")}
  ${poly(BRASS.hi, "47,41.6 48.4,39.4 50.8,40.6 50.4,43")}
  <g class="shade">
    ${poly(BRASS.hi, "42,37 49,34.6 52.4,52.8 41.6,57")}
    ${poly(BRASS.mid, "49,34.6 55.6,33.4 66,51.6 52.4,52.8")}
    ${poly(BRASS.lo, "55.6,33.4 57,34 68,51.2 66,51.6")}
    ${poly(BRASS.deep, "41.6,57 52.4,52.8 66,51.6 68,51.2 60,55 48,57.6", "rim")}
  </g>
  <polygon class="bulb" points="51,54.6 54.6,53.4 57.4,55.4 55,58.2 51.6,57.6"/>
  <g class="moths">${Array.from({ length: 3 }, () => `<g class="moth">${poly("#d9cdb4", "0,0 -3.2,-2.6 -1,.6", "w1")}${poly("#b8aa8e", "0,0 3.2,-2.6 1,.6", "w2")}${poly("#5a4c3c", "0,-1.2 .5,1.6 -.5,1.6")}</g>`).join("")}</g>`;

const plantArt = () => `
  <g class="fallen"></g>
  <g class="flowers"></g>
  <g class="leaves"></g>
  ${poly(CLAY.hi, "15,75 24,75 25,100 19,100")}${poly(CLAY.mid, "24,75 38,75 37,100 25,100")}${poly(CLAY.lo, "38,75 47,75 43,100 37,100")}
  ${poly(CLAY.hi, "12,68.5 24,68.5 24,75 13,75")}${poly(CLAY.mid, "24,68.5 38,68.5 38,75 24,75")}${poly(CLAY.lo, "38,68.5 50,68.5 49,75 38,75")}
  ${poly(CLAY.deep, "13,75 49,75 47.6,77 14.4,77")}
  ${poly("#2e241c", "13.5,68.5 48.5,68.5 46,67 16,67")}`;

const candleArt = () => `
  <circle class="halo" cx="22" cy="30" r="12"/>
  <g class="wax"></g>
  <polyline class="smoke" points=""/>
  <g class="flame"><polygon class="f-l"/><polygon class="f-r"/><polygon class="f-c"/></g>
  ${poly(BRASS.lo, "2,100 42,100 38,95 6,95")}${poly(BRASS.hi, "6,95 38,95 35,92 9,92")}${poly(BRASS.deep, "38,95 42,100 40,100 37.4,96")}
`;

const hourglassArt = (id: string) => `
  <defs>
    <clipPath id="${id}-top"><polygon points="9,38 35,38 34.5,49 24,63.5 20,63.5 9.5,49"/></clipPath>
    <clipPath id="${id}-bot"><polygon points="20,65.5 24,65.5 34.5,80 35,91 9,91 9.5,80"/></clipPath>
  </defs>
  <g class="hg">
    ${poly(WOOD.lo, "4.6,38 7,38 7,91 4.6,91")}${poly(WOOD.deep, "7,38 7.8,38 7.8,91 7,91")}
    ${poly(WOOD.mid, "36.4,38 38.8,38 38.8,91 36.4,91")}${poly(WOOD.deep, "38.8,38 39.6,38 39.6,91 38.8,91")}
    <g clip-path="url(#${id}-top)">${poly(SAND.hi, "", "s-top-l")}${poly(SAND.lo, "", "s-top-r")}</g>
    <line class="stream" x1="22" y1="63" x2="22" y2="90"/>
    <g clip-path="url(#${id}-bot)">${poly(SAND.hi, "", "s-bot-l")}${poly(SAND.lo, "", "s-bot-r")}</g>
    <g class="glass">
      <polygon points="9,38 22,38 22,63.5 20,63.5 9.5,49" style="fill:rgba(236,228,216,.1)"/>
      <polygon points="22,38 35,38 34.5,49 24,63.5 22,63.5" style="fill:rgba(236,228,216,.04)"/>
      <polygon points="20,65.5 22,65.5 22,91 9,91 9.5,80" style="fill:rgba(236,228,216,.1)"/>
      <polygon points="22,65.5 24,65.5 34.5,80 35,91 22,91" style="fill:rgba(236,228,216,.04)"/>
      <polygon points="11.2,40 13.4,40 12.8,48 11.6,48" style="fill:rgba(255,255,255,.28)"/>
      <polygon points="11.4,82 12.6,82 13,89 11.2,89" style="fill:rgba(255,255,255,.22)"/>
      <polygon points="20,63.5 24,63.5 24,65.5 20,65.5" style="fill:rgba(236,228,216,.14)"/>
    </g>
    ${poly(WOOD.hi, "5,32 39,32 41.6,34.4 2.4,34.4")}${poly(WOOD.mid, "2.4,34.4 41.6,34.4 41.6,38.4 2.4,38.4")}${poly(WOOD.lo, "41.6,34.4 43,33.4 43,37.4 41.6,38.4")}
    ${poly(WOOD.hi, "5,90.6 39,90.6 41.6,93.2 2.4,93.2")}${poly(WOOD.mid, "2.4,93.2 41.6,93.2 41.6,100 2.4,100")}${poly(WOOD.lo, "41.6,93.2 43,92.2 43,99 41.6,100")}
  </g>`;

const bowlArt = (id: string) => `
  <defs><clipPath id="${id}-water"><polygon points="14.2,54 55.8,54 57,55 62,66 62,80 56,93 45,100 25,100 14,93 8,80 8,66 13,55"/></clipPath></defs>
  <g clip-path="url(#${id}-water)">
    ${poly("#2c5a63", "0,54 22,54 18,100 0,100")}${poly("#244b54", "22,54 46,54 50,100 18,100")}${poly("#1b3b43", "46,54 70,54 70,100 50,100")}
    ${poly("#3d6f78", "0,52 70,52 70,56.4 0,56.4", "surface")}
    ${poly("#6b5a48", "8,96 20,92 30,95 40,92.4 52,95 62,93 62,100 8,100")}${poly("#4f4234", "20,92 30,95 26,100 14,100")}${poly("#857059", "40,92.4 52,95 46,100 38,100")}
    <g class="weeds"></g>
    <g class="bubbles"></g>
    <g class="food"></g>
    <g class="fish">
      ${poly("#e57a3a", "-5,0 -9.6,-3.6 -8.4,0 -9.6,3.6", "tail")}
      ${poly("#f39a50", "-5,0 -0.6,-3.8 6.4,0")}${poly("#c95a2c", "-5,0 6.4,0 -0.6,3")}
      ${poly("#e8813e", "-2.4,-3.4 1,-3.6 -3.4,-6")}
      ${poly("#1a1410", "3.2,-1.4 4.4,-1.2 4,-0.3 3,-0.5")}
    </g>
  </g>
  <polygon points="13,55 20,49 21,46.4 49,46.4 50,49 57,55 62,66 62,80 56,93 45,100 25,100 14,93 8,80 8,66" class="bowl-glass"/>
  <polygon points="11,66 14.4,57 16,58 13.4,67 13,79 11.2,79" style="fill:rgba(255,255,255,.22)"/>
  <polygon points="54,82 57.6,72 58.6,73 55.6,84" style="fill:rgba(255,255,255,.1)"/>
  ${poly("rgba(236,228,216,.32)", "19.6,46.4 50.4,46.4 49.6,48.4 20.4,48.4")}`;


// ---------- 読みかけの本・編みもの・ポスト ----------
const BOOK_PAGES = 240, PAGE_SEC = 120;          // 2 分で 1 ページ、1 冊 8 時間
const KNIT_ROWS = 26, ROW_SEC = 180;             // 3 分で 1 段、1 枚 78 分
const BOOK_COLORS = ["#7a3b34", "#2f4f6b", "#4a6b3a", "#6b4f2a", "#583a63", "#2e5e5a"];
const YARN_HUES = [8, 205, 42, 150, 285, 20, 340];
const blob = (cx: number, cy: number, rx: number, ry: number, n = 9, rot = 0) =>
  Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
/** 光は左上から: 多角形の頂点列を中心から三角に割り、上の面ほど明るく */
const shaded = (pts: number[][], tones: string[]) => {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length], mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
    const lit = (-mx * .6 - my) / Math.hypot(mx, my || 1e-6); // 左上を向く面ほど 1
    return poly(tones[Math.max(0, Math.min(tones.length - 1, Math.round((1 - lit) / 2 * (tones.length - 1))))], P([[cx, cy], p, q]));
  }).join("");
};

/** 本: 読み終えた本を下に積み、その上に開いた本。p は今の本の進み */
function bookArt(p: number, done: number, color: string) {
  let out = "";
  const n = Math.min(3, done);
  for (let i = 0; i < n; i++) {
    const c = BOOK_COLORS[(done - n + i) % BOOK_COLORS.length], y1 = 100 - i * 5.4, y0 = y1 - 5, off = (hsh(i, 21) - .5) * 4;
    out += poly(c, P([[6 + off, y0], [56 + off, y0], [56 + off, y1], [6 + off, y1]]))
      + poly("#e6dcc4", P([[56 + off, y0 + .8], [59 + off, y0 - 1], [59 + off, y1 - 1.8], [56 + off, y1 - .8]]))
      + poly(mix(c, "#fff", 18), P([[6 + off, y0], [56 + off, y0], [59 + off, y0 - 1.8], [9 + off, y0 - 1.8]]));
  }
  const yb = 100 - n * 5.4, tL = 1 + 6 * p, tR = 1 + 6 * (1 - p), D = 13;
  // 表紙（開いた本の下に少しはみ出す）
  out += poly(mix(color, "#000", 25), P([[4, yb], [60, yb], [60, yb - 1.4], [4, yb - 1.4]]));
  // 紙の束の小口
  out += poly("#d6caae", P([[6, yb - 1.4], [32, yb - 1.4], [32, yb - 2], [6, yb - 1.4 - tL]]));
  out += poly("#c9bd9f", P([[32, yb - 1.4], [58, yb - 1.4], [58, yb - 1.4 - tR], [32, yb - 2]]));
  // ページの面: 外側は明るく、のどに向かって沈む
  const L = yb - 1.4 - tL, R = yb - 1.4 - tR, g = yb - 2;
  out += poly("#efe6d2", P([[6, L], [19, L - 1.6], [20, L - 1.6 - D], [7.5, L - D]])) + poly("#ddd2ba", P([[19, L - 1.6], [32, g], [32, g - D], [20, L - 1.6 - D]]));
  out += poly("#d2c7ae", P([[32, g], [45, R - 1.6], [44, R - 1.6 - D], [32, g - D]])) + poly("#e6dcc6", P([[45, R - 1.6], [58, R], [56.5, R - D], [44, R - 1.6 - D]]));
  // 行（細い多角形）
  for (let k = 0; k < 4; k++) {
    const f = .25 + k * .17;
    out += poly("#b9ad93", P([[9, L - D * f], [17.5, L - 1.6 - D * f], [17.5, L - 1.6 - D * f - .5], [9, L - D * f - .5]]));
    out += poly("#b2a68c", P([[46.5, R - 1.6 - D * f], [55, R - D * f], [55, R - D * f - .5], [46.5, R - 1.6 - D * f - .5]]));
  }
  // しおり
  out += poly("#b8403a", P([[32.6, g - D + 1], [34, g - D + 1], [34.4, yb + 5], [33.4, yb + 4], [32.6, yb + 5.4]]));
  return out;
}

/** 編みもの: 交差した針から編み地が垂れ、右のかごに毛糸玉。p は今の編み地の進み */
function knitArt(rows: number, done: number, hue: number) {
  const c = (l: number) => hsl(hue, 45, l);
  let out = "";
  // かご（編み目のように濃淡を交互に）
  for (let i = 0; i < 6; i++) {
    const x0 = 34 + i * 5, x1 = x0 + 5;
    out += poly(i % 2 ? WOOD.mid : WOOD.hi, P([[x0 + (i ? 0 : 1.5), 82], [x1 - (i === 5 ? 1.5 : 0), 82], [x1 - (i === 5 ? 3 : 0), 100], [x0 + (i ? 0 : 3), 100]]));
  }
  out += poly(WOOD.lo, P([[34.8, 82], [63.2, 82], [62.4, 85], [35.6, 85]]));
  // 編み上がったものは、かごの中に少し見える
  for (let i = 0; i < Math.min(3, done); i++) {
    const h = YARN_HUES[(done - 1 - i) % YARN_HUES.length], x = 52 - i * 6;
    out += poly(hsl(h, 40, 46), P([[x - 5, 82], [x - 4, 78.6], [x + 4, 78], [x + 5, 82]]));
  }
  // 毛糸玉: 残りが減るほど小さく
  const r = 3.4 + 6.6 * (1 - rows / KNIT_ROWS);
  out += `<g class="ball">${shaded(blob(43, 81 - r * .55, r, r * .92, 8, .3), [c(64), c(56), c(48), c(40)])}`
    + poly(c(70), P([[43 - r * .6, 81 - r * 1.1], [43 + r * .2, 81 - r * 1.3], [43 + r * .4, 81 - r * 1.15], [43 - r * .4, 81 - r * .9]])) + `</g>`;
  // 編み地: 1 段ごとに 5 目の V。目の左右で濃淡を分ける
  let knit = "";
  for (let j = 0; j < rows; j++) {
    const y = 4 + j * 2.4;
    for (let k = 0; k < 5; k++) {
      const x = -11 + k * 4.4, sh = (j + k) % 2 ? 2 : 0;
      knit += poly(c(52 + sh), P([[x, y - .6], [x + 2.2, y + 1.9], [x + 2.2, y + 2.9], [x, y + .5]]))
        + poly(c(42 + sh), P([[x + 2.2, y + 1.9], [x + 4.4, y - .6], [x + 4.4, y + .5], [x + 2.2, y + 2.9]]));
    }
  }
  out += `<g class="piece">${knit}</g>`;
  // 糸: 編み地の右上から毛糸玉へ
  out += `<polyline class="yarn" style="stroke:${c(50)}" points="31,${32 + 4} 36,${40} 40,${60} ${43 - r * .3},${81 - r * 1.2}"/>`;
  // 壁の木釘に、糸の輪で針ごと掛けておく
  out += `<polyline class="yarn" style="stroke:${c(50)}" points="12,32 20,22.6 28,32.6"/>`;
  out += shaded(blob(20, 21, 2.6, 2.4, 7, .2), [WOOD.hi, WOOD.mid, WOOD.lo, WOOD.deep]);
  // 針（2 本を浅く交差させる）
  out += poly("#c8b48a", P([[2, 30.6], [38, 33.4], [38, 34.4], [2, 31.6]])) + poly("#8c7a58", P([[0, 30.4], [2.4, 29.6], [2.4, 32.4], [0, 31.8]]));
  out += poly("#b9a57c", P([[4, 37], [36, 28], [36.3, 29], [4.3, 38]])) + poly("#8c7a58", P([[35.6, 27], [38, 26.6], [38, 29.2], [36.2, 29.6]]));
  return out;
}

/** ポスト: 柱の上の箱。手紙が届くと口から封筒がのぞき、旗が上がる */
const MAIL = { hi: "#6a9483", mid: "#4f7766", lo: "#395a4c", deep: "#253d33" };
const postArt = () => `
  ${poly(WOOD.mid, "20,62 26,62 26,96 20,96")}${poly(WOOD.lo, "26,62 27.6,61 27.6,95 26,96")}
  ${poly(IRON.mid, "13,96 33,96 34,100 12,100")}${poly(IRON.hi, "15,94.6 31,94.6 33,96 13,96")}
  ${poly(MAIL.mid, "5,40 37,40 37,64 5,64")}
  ${poly(MAIL.lo, "37,40 42,36 42,60 37,64")}
  ${poly(MAIL.hi, "5,40 7,34.4 11,31 31,31 35,34.4 37,40")}
  ${poly(MAIL.mid, "37,40 35,34.4 31,31 36,27.6 40,30.8 42,36")}
  ${poly(MAIL.deep, "10,46 32,46 32,48.4 10,48.4")}
  <g class="letter">${poly("#f1e9d8", "13,47.6 29,46.4 29.6,40.6 13.6,41.8")}${poly("#d9cfba", "13.6,41.8 21.4,45.4 29.6,40.6")}${poly("#b8403a", "25.4,42.4 27.4,42.2 27.6,44 25.6,44.2")}</g>
  ${poly(MAIL.lo, "8,52 34,52 34,53 8,53")}
  <g class="flag">${poly(IRON.lo, "41,58 42.6,58 42.6,40 41,40")}${poly("#c8553d", "42.6,40 49,40.6 49,45.4 42.6,45")}${poly("#9e3e2c", "42.6,45 49,45.4 48,46.6 42.6,46.2")}</g>`;

/** 賞状: 額縁に入った小さな証書。金の縁、題字の線、朱の印 */
const GILT = { hi: "#e0c27a", mid: "#b48c45", lo: "#86652b", deep: "#5e461c" };
const awardArt = () => `
  ${poly(WOOD.lo, "30,70 34,70 42,100 38.6,100")}
  ${poly(GILT.mid, "4,62 48,62 48,99 4,99")}
  ${poly(GILT.hi, "4,62 48,62 45,65 7,65")}${poly(GILT.lo, "48,62 48,99 45,96 45,65")}${poly(GILT.deep, "4,99 48,99 45,96 7,96")}${poly(GILT.mid, "4,62 7,65 7,96 4,99")}
  ${poly("#f1e8d2", "7,65 45,65 45,96 7,96")}${poly("#e2d6ba", "7,65 45,65 44,67 8,67")}
  ${poly("#5a4a34", "17,70.4 35,70.4 35,72.2 17,72.2")}
  ${poly("#9c8a6a", "12,76 40,76 40,76.9 12,76.9")}${poly("#9c8a6a", "12,79.4 40,79.4 40,80.3 12,80.3")}${poly("#9c8a6a", "15,82.8 37,82.8 37,83.7 15,83.7")}
  ${poly("#8a7652", "11,90.6 22,90.6 22,91.3 11,91.3")}
  ${poly("#b23024", "34.4,86.4 40.4,86.4 40.4,92.4 34.4,92.4")}${poly("#d8b8a2", "35.6,87.6 39.2,87.6 39.2,91.2 35.6,91.2")}${poly("#b23024", "36.4,88.4 38.4,88.4 38.4,90.4 36.4,90.4")}
  <g class="glint">${poly("rgba(255,255,255,.55)", "10,65 15,65 9,96 4,96")}</g>`;

/** 先月の手紙の中身（届いていなければ undefined） */
function letterOf(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), to = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const count = new Map<string, number>(), days = new Set<string>();
  for (const e of playLog()) if (e.t >= from && e.t < to) { count.set(e.k, (count.get(e.k) ?? 0) + 1); days.add(new Date(e.t).toDateString()); }
  if (!count.size) return undefined;
  const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const m = new Date(from);
  return { key: `${m.getFullYear()}-${m.getMonth() + 1}`, month: m.getMonth() + 1, days: days.size, plays: [...count.values()].reduce((a, b) => a + b, 0), top };
}

// ---------- 植物: サボテン・ポトス・季節の切り花 ----------
/** きょう（まだ聴いていなければ昨日）からさかのぼって、続けて聴いた日の数 */
function streak(now = new Date()) {
  const days = new Set(playLog().map(e => new Date(e.t).toDateString()));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const CACTUS = { hi: "#7fae6a", mid: "#5f8f4f", lo: "#46703b", deep: "#2f5028" };
/** 柱: 縦の稜で 3 面に割り、上は斜めの面で丸める */
const column = (x0: number, x1: number, y0: number, y1: number) => {
  const a = x0 + (x1 - x0) * .3, b = x0 + (x1 - x0) * .7, cap = (x1 - x0) * .45;
  return poly(CACTUS.hi, P([[x0, y1], [x0, y0 + cap * .6], [a, y0], [a, y1]])) + poly(CACTUS.mid, P([[a, y1], [a, y0], [b, y0], [b, y1]]))
    + poly(CACTUS.lo, P([[b, y1], [b, y0], [x1, y0 + cap * .6], [x1, y1]]))
    + poly(CACTUS.hi, P([[x0, y0 + cap * .6], [a, y0 - cap * .25], [a, y0]])) + poly(CACTUS.mid, P([[a, y0 - cap * .25], [b, y0 - cap * .25], [b, y0], [a, y0]]))
    + poly(CACTUS.lo, P([[b, y0 - cap * .25], [x1, y0 + cap * .6], [b, y0]]));
};
const spines = (x0: number, x1: number, y0: number, y1: number) => {
  let o = "";
  for (let y = y0 + 3; y < y1 - 1; y += 3.4) for (const x of [x0 + (x1 - x0) * .3, x0 + (x1 - x0) * .7]) o += poly("#e9e2c9", P([[x - .5, y], [x + .5, y - .3], [x + .3, y + .5]]));
  return o;
};
function cactusArt(days: number, run: number) {
  const g = Math.max(.15, Math.min(1, days / 40)), top = 84 - (16 + 30 * g);
  let o = "";
  // 腕: 10 日・25 日で 1 本ずつ
  if (days >= 10) { const y = top + (84 - top) * .45; o += column(5, 10.6, y - 9 - 6 * g, y + 3) + poly(CACTUS.mid, P([[8, y], [15, y - 1], [15, y + 3.4], [8, y + 3.4]])) + spines(5, 10.6, y - 9 - 6 * g, y); }
  if (days >= 25) { const y = top + (84 - top) * .3; o += column(29.4, 34.4, y - 7 - 5 * g, y + 3) + poly(CACTUS.lo, P([[25, y + .4], [31, y], [31, y + 3.4], [25, y + 3.8]])) + spines(29.4, 34.4, y - 7 - 5 * g, y); }
  o += column(14, 26, top, 85) + spines(14, 26, top, 84);
  // 7 日続けて聴くと、てっぺんに花
  if (run >= 7) {
    const cx = 20, cy = top - 3.6;
    o += Array.from({ length: 6 }, (_, i) => `<g transform="translate(${cx} ${cy}) rotate(${i * 60 - 90})">${poly(i % 2 ? "#e0587f" : "#f07a9c", "0,0 -1.8,-4.6 1.8,-4.6")}</g>`).join("")
      + poly("#f5d36a", P(blob(cx, cy, 1.4, 1.2, 5)));
  }
  // 小さな鉢
  o += poly(CLAY.hi, "9,84 16,84 17,100 12,100") + poly(CLAY.mid, "16,84 25,84 25,100 17,100") + poly(CLAY.lo, "25,84 31,84 28,100 25,100");
  o += poly(CLAY.hi, "8,80.6 16,80.6 16,84.4 8.6,84.4") + poly(CLAY.mid, "16,80.6 25,80.6 25,84.4 16,84.4") + poly(CLAY.lo, "25,80.6 32,80.6 31.4,84.4 25,84.4");
  o += poly("#3a2e24", "8.6,80.6 31.4,80.6 30,79.6 10,79.6");
  return o;
}

/** ポトス: 斑入りのハート形の葉を 2 枚の三角で */
const POTHOS = [["#5f9a4c", "#477a38"], ["#8dbb5e", "#6a9a45"], ["#c9d77a", "#9fb35a"]];
const pothosLeaf = (x: number, y: number, side: number, sz: number, k: number) => {
  const [a, b] = POTHOS[k % 3 === 2 ? 2 : k % 2], w = 2.6 * sz, L = 4.4 * sz;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${side * 55})">${poly(a, P([[0, 0], [-w, L * .45], [0, L]]))}${poly(b, P([[0, 0], [0, L], [w, L * .45]]))}</g>`;
};
const POTHOS_SEC = 1200; // 20 分で 1 枚
function pothosArt(leaves: number) {
  let o = `<polyline class="rope" points="18,27 28,-400 38,27"/><polyline class="rope" points="28,28 28,-400"/>`;
  // 吊り鉢（白い陶器）
  o += poly("#e6ddcc", "16,27 28,27 27,38 20,37") + poly("#cfc5b2", "28,27 40,27 36,37 27,38") + poly("#b9ae99", "20,37 27,38 36,37 30,41 25,41");
  o += poly("#f1e9da", "15,25 41,25 40,27.4 16,27.4");
  // 鉢の上の葉
  o += pothosLeaf(22, 25.6, -1.4, 1.1, 1) + pothosLeaf(28, 25, 0, 1.2, 0) + pothosLeaf(34, 25.6, 1.4, 1.1, 2) + pothosLeaf(25, 25.4, -.6, 1, 0) + pothosLeaf(31, 25.4, .7, 1, 1);
  // 垂れる蔓: 3 本に葉を順に配る
  const per = [0, 0, 0];
  for (let i = 0; i < leaves; i++) per[i % 3]++;
  [[18, 27], [27.6, 29], [37.4, 27]].forEach(([x0, y0], v) => {
    const n = Math.min(13, per[v]);
    if (!n) return;
    let pts = `${x0},${y0}`, lv = "";
    for (let j = 1; j <= n; j++) {
      const x = x0 + Math.sin(j * .7 + v * 2) * 2.2, y = y0 + j * 5;
      pts += ` ${x.toFixed(1)},${y}`;
      lv += pothosLeaf(x, y - 1, j % 2 ? 1 : -1, .85 + (j < 3 ? .1 : 0), j + v);
    }
    o += `<g class="vine" data-x="${x0}" data-y="${y0}"><polyline class="stem" points="${pts}"/>${lv}</g>`;
  });
  return o;
}

// 季節の切り花: 月ごとの花。kind で形を変える
type FlowerKind = "daisy" | "star" | "cup" | "branch" | "ball" | "cluster" | "plume";
const MONTH_FLOWERS: { name: string; kind: FlowerKind; c: string; c2: string; mid: string; n: number }[] = [
  { name: "水仙", kind: "star", c: "#f3efe2", c2: "#d8d2c0", mid: "#f2c84b", n: 3 },
  { name: "梅", kind: "branch", c: "#f6c9d2", c2: "#e8a3b2", mid: "#f2d36a", n: 2 },
  { name: "菜の花", kind: "cluster", c: "#f4d54a", c2: "#d9b432", mid: "#f4d54a", n: 4 },
  { name: "桜", kind: "branch", c: "#f9dbe2", c2: "#f0b9c6", mid: "#e88aa0", n: 2 },
  { name: "カーネーション", kind: "cup", c: "#e2586c", c2: "#b9404f", mid: "#e2586c", n: 3 },
  { name: "紫陽花", kind: "ball", c: "#8d9ee0", c2: "#6c7cc4", mid: "#b3a2e2", n: 2 },
  { name: "ひまわり", kind: "daisy", c: "#f2c230", c2: "#d99e1c", mid: "#6b4a24", n: 2 },
  { name: "桔梗", kind: "star", c: "#7d6fd6", c2: "#5f52b4", mid: "#e8e2f6", n: 3 },
  { name: "ススキ", kind: "plume", c: "#d9c7a0", c2: "#bba57a", mid: "#d9c7a0", n: 4 },
  { name: "コスモス", kind: "daisy", c: "#f2a4c2", c2: "#e07ea6", mid: "#f2d04a", n: 3 },
  { name: "菊", kind: "daisy", c: "#f2dc8a", c2: "#d9be5c", mid: "#d99e1c", n: 3 },
  { name: "椿", kind: "cup", c: "#c8303a", c2: "#9c2430", mid: "#f2d04a", n: 2 },
];
const ring = (cx: number, cy: number, r: number, n: number, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
function flowerHead(f: typeof MONTH_FLOWERS[number], i: number, h: number) {
  const tri = (c: string, pts: number[][]) => poly(c, P(pts));
  switch (f.kind) {
    case "daisy": {
      const n = f.name === "菊" ? 14 : f.name === "ひまわり" ? 12 : 8, r = f.name === "ひまわり" ? 6.4 : 4.6, rc = f.name === "ひまわり" ? 2.6 : 1.3;
      return Array.from({ length: n }, (_, k) => { const b = (k + .5) / n * Math.PI * 2, a0 = (k - .35) / n * Math.PI * 2, a1 = (k + .35) / n * Math.PI * 2;
        const c = b - Math.PI / n, wd = Math.PI / n * .9;
        return tri(k % 2 ? f.c : f.c2, [[Math.cos(a0) * rc, Math.sin(a0) * rc], [Math.cos(c - wd) * r * .62, Math.sin(c - wd) * r * .62], [Math.cos(c) * r, Math.sin(c) * r], [Math.cos(c + wd) * r * .62, Math.sin(c + wd) * r * .62], [Math.cos(a1) * rc, Math.sin(a1) * rc]]); }).join("")
        + poly(f.mid, P(ring(0, 0, rc + .4, 7)));
    }
    case "star": {
      const n = f.name === "水仙" ? 6 : 5;
      return Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2 - Math.PI / 2; return tri(k % 2 ? f.c : f.c2, [[0, 0], [Math.cos(a - .32) * 2.2, Math.sin(a - .32) * 2.2], [Math.cos(a) * 4.6, Math.sin(a) * 4.6], [Math.cos(a + .32) * 2.2, Math.sin(a + .32) * 2.2]]); }).join("")
        + poly(f.mid, P(ring(0, 0, f.name === "水仙" ? 1.6 : .9, 6)));
    }
    case "cup":
      return tri(f.c2, [[-3.6, -1], [0, 2.6], [3.6, -1], [2.6, -4.6], [0, -2.4], [-2.6, -4.6]]) + tri(f.c, [[-3.6, -1], [-2.6, -4.6], [0, -2.4], [0, 2.6]])
        + tri(mix(f.c, "#fff", 18), [[-1.4, -3.6], [0, -5.2], [1.4, -3.6], [0, -2]]) + (f.name === "椿" ? poly(f.mid, P(ring(0, -2.2, .9, 5))) : "");
    case "ball":
      return Array.from({ length: 9 }, (_, k) => { const a = k * 2.4, rr = k ? 2.6 + (k % 3) : 0, x = Math.cos(a) * rr, y = Math.sin(a) * rr * .85;
        return [0, 1, 2, 3].map(q => tri(q % 2 ? f.c : (k % 2 ? f.c2 : f.mid), [[x, y], [x + Math.cos(q * Math.PI / 2 + .3) * 1.8, y + Math.sin(q * Math.PI / 2 + .3) * 1.8], [x + Math.cos(q * Math.PI / 2 + .9) * 1.8, y + Math.sin(q * Math.PI / 2 + .9) * 1.8]])).join(""); }).join("");
    case "cluster":
      return Array.from({ length: 7 }, (_, k) => { const x = (hsh(i, 40 + k) - .5) * 5, y = -k * 1.1 + (hsh(i, 50 + k) - .5) * 1.4; return poly(k % 2 ? f.c : f.c2, P(ring(x, y, 1.1, 4, k))); }).join("");
    case "plume":
      return Array.from({ length: 8 }, (_, k) => tri(k % 2 ? f.c : f.c2, [[0, k * 1.6], [3.6 - k * .2, k * 1.6 + 2.4], [0, k * 1.6 + 1.6]])).join("") + poly(f.c2, P([[0, 0], [.5, 0], [.5, 13], [0, 13]]));
    case "branch": {
      // 枝: 節ごとに小さな 5 弁の花
      let o = poly("#5a4434", P([[0, 0], [1.2, 0], [5, -h * .8], [4, -h * .8]])) + poly("#5a4434", P([[-.2, -h * .2], [.8, -h * .2], [-4, -h * .9], [-5, -h * .88]]));
      for (let k = 0; k < 7; k++) {
        const u = k / 6, x = k % 2 ? 4.4 * u : -4.6 * u, y = -h * .15 - h * .72 * u + (hsh(i, 60 + k) - .5) * 2;
        o += Array.from({ length: 5 }, (_, q) => { const a = q / 5 * Math.PI * 2; return tri(q % 2 ? f.c : f.c2, [[x, y], [x + Math.cos(a - .5) * 1.6, y + Math.sin(a - .5) * 1.6], [x + Math.cos(a + .5) * 1.6, y + Math.sin(a + .5) * 1.6]]); }).join("") + poly(f.mid, P(ring(x, y, .45, 4)));
      }
      return o;
    }
  }
}
const VASE = { hi: "#6b86ad", mid: "#4f6a93", lo: "#3a5276", deep: "#28395a" };
function vaseArt(month: number) {
  const f = MONTH_FLOWERS[month];
  let stems = "";
  for (let i = 0; i < f.n; i++) {
    const a = f.n > 1 ? (i / (f.n - 1) - .5) * 40 : 0, h = (f.kind === "branch" ? 46 : 34) + hsh(i, 70) * 10 - Math.abs(a) * .15;
    const head = f.kind === "branch" ? flowerHead(f, i, h) : `<line class="stem" x1="0" y1="0" x2="0" y2="${-h}"/>`
      + (f.kind === "plume" ? "" : poly("#4f7a3e", P([[0, -h * .45], [-3.4, -h * .55], [-.2, -h * .4]])) + poly("#3d6431", P([[0, -h * .6], [3.2, -h * .7], [.2, -h * .55]])))
      + `<g transform="translate(0 ${-h}) rotate(${(-a * .6).toFixed(1)}) scale(1.45)">${flowerHead(f, i, h)}</g>`;
    stems += `<g class="cut" data-a="${a.toFixed(1)}">${head}</g>`;
  }
  return `<g class="cuts">${stems}</g>
  ${poly(VASE.hi, "18,62 22,62 22,66 16,74 13,86 15.4,100 22,100 22,62")}${poly(VASE.mid, "22,62 26,62 28,74 31,86 28.6,100 22,100")}
  ${poly(VASE.lo, "26,62 26.6,62 30,72 32,86 29.6,100 28.6,100 31,86 28,74")}
  ${poly(VASE.hi, "16.6,60 22,60 22,62.6 17.4,62.6")}${poly(VASE.mid, "22,60 27.4,60 26.6,62.6 22,62.6")}${poly(VASE.deep, "17.4,60 26.6,60 25,59 19,59")}
  ${poly("rgba(255,255,255,.22)", "16,78 17.4,72 18,72.4 16.8,84")}`;
}

export function mountObjects(body: HTMLElement) {
  const id = `objs${++uid}`;
  body.innerHTML = `<div class="objs"><div class="objs-row">
  <svg class="lamp" viewBox="0 0 72 100" role="button" tabindex="0" aria-label="灯り"><title>灯り（押すと点く）</title>${lampArt(id)}</svg>
  <svg class="plant" viewBox="0 0 62 100" aria-hidden="true">${plantArt()}</svg>
  <svg class="candle" viewBox="0 0 44 100" role="button" tabindex="0" aria-label="ろうそく（おやすみタイマー）"><title></title>${candleArt()}</svg>
  <svg class="hourglass" viewBox="0 0 44 100" aria-hidden="true">${hourglassArt(id)}</svg>
  <svg class="records" viewBox="0 0 76 100"><g class="stack"></g><g class="disc"></g></svg>
  <svg class="bowl" viewBox="0 0 70 100" role="button" tabindex="0" aria-label="金魚鉢（押すとえさをあげる）"><title>金魚鉢（押すとえさをあげる）</title>${bowlArt(id)}</svg>
  <svg class="book" viewBox="0 0 64 100"><title></title><g class="bk"></g><polygon class="turn"/></svg>
  <svg class="knit" viewBox="0 0 66 100"><title></title><g class="kn"></g></svg>
  <svg class="post" viewBox="0 0 46 100" role="button" tabindex="0" aria-label="ポスト"><title></title>${postArt()}</svg>
  <svg class="award" viewBox="0 0 52 100" role="button" tabindex="0" aria-label="賞状（押すと証書を見る）"><title></title>${awardArt()}</svg>
  <svg class="cactus" viewBox="0 0 40 100"><title></title><g class="cc"></g></svg>
  <svg class="pothos" viewBox="0 0 56 100"><title></title><g class="pt"></g></svg>
  <svg class="vase" viewBox="0 0 46 100" role="button" tabindex="0" aria-label="季節の切り花（押すと水を替える）"><title></title><g class="vs"></g></svg>
</div>
<dialog class="objs-letter"></dialog><div class="objs-board"></div></div>`;

  const root = body.querySelector<HTMLElement>(".objs")!;
  const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const press = (el: Element, fn: () => void) => {
    el.addEventListener("click", fn);
    el.addEventListener("keydown", e => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); fn(); } });
  };
  const state = load();

  // ---------- 灯り: 押すと点く・消える。覚えておく ----------
  const lamp = $<SVGSVGElement>(".lamp"), cone = $<SVGPolygonElement>(".lamp .cone");
  const paintLamp = () => { lamp.classList.toggle("on", state.lamp); root.classList.toggle("lit", state.lamp); lamp.setAttribute("aria-pressed", String(state.lamp)); };
  press(lamp, () => { state.lamp = !state.lamp; patch({ lamp: state.lamp }); paintLamp(); });
  paintLamp();

  // ---------- 鉢植え ----------
  let leaves: SVGGElement[] = [], plant: Plant | undefined, plantSig = "", lastCheck = 0;
  const leafG = $<SVGGElement>(".leaves"), flowerG = $<SVGGElement>(".flowers"), fallenG = $<SVGGElement>(".fallen");
  const grow = () => {
    const days = daysListened(), season = seasonOf(), sig = `${days}|${season}|${new Date().toDateString()}`;
    if (sig === plantSig) return;
    plantSig = sig; plant = plantOf(days, season);
    leafG.innerHTML = plant.leaves.map(l => `<g>${leafArt(l)}</g>`).join("");
    leaves = [...leafG.children] as SVGGElement[];
    // 春の花: 細い茎の先に 5 枚の三角の花びら
    flowerG.innerHTML = plant.flowers.map(f => {
      const petals = Array.from({ length: 5 }, (_, i) => `<g transform="rotate(${i * 72})">${poly(i % 2 ? "#e9a3b5" : "#f6c2cf", "0,0 -2.2,-4 2.2,-4")}</g>`).join("");
      return `<g class="flower" data-a="${f.a}"><line class="stem" x1="0" y1="0" x2="0" y2="${-f.h}"/><g transform="translate(0 ${-f.h})">${petals}${poly("#f3d36b", "0,-1.3 1.2,-.4 .8,1 -.8,1 -1.2,-.4")}</g></g>`;
    }).join("");
    // 秋の落ち葉: 棚板の上、鉢のそばに
    fallenG.innerHTML = plant.fallen.map(f => `<g transform="translate(${31 + f.x} 99.2) rotate(${(f.r % 30) - 15})">${poly(f.hi, "-4.4,0 0,-2 4.4,0")}${poly(f.lo, "-4.4,0 4.4,0 0,1.4")}</g>`).join("");
  };
  grow();

  // ---------- ろうそく: おやすみタイマー ----------
  const candle = $<SVGSVGElement>(".candle"), waxG = $<SVGGElement>(".candle .wax"), flameG = $<SVGGElement>(".candle .flame");
  const [fl, fr, fc] = [...flameG.querySelectorAll<SVGPolygonElement>("polygon")];
  const halo = $<SVGCircleElement>(".candle .halo"), smoke = $<SVGPolylineElement>(".candle .smoke"), ctitle = $<SVGTitleElement>(".candle title");
  const FULL = 40, LOW = 84;
  let waxTop = -1, smokeT = 0, fading = false;
  const drawWax = (top: number) => {
    if (Math.abs(top - waxTop) < .05) return;
    waxTop = top;
    const t = top, b = 92;
    waxG.innerHTML = poly(WAX.hi, P([[14, t], [18.5, t], [18.5, b], [14, b]])) + poly(WAX.mid, P([[18.5, t], [25.5, t], [25.5, b], [18.5, b]]))
      + poly(WAX.lo, P([[25.5, t], [30, t], [30, b], [25.5, b]]))
      + poly(WAX.top, P([[14, t], [18.5, t - 1.6], [25.5, t - 1.6], [30, t], [25.5, t + 1.1], [18.5, t + 1.1]]))
      + poly(WAX.top, P([[14, t], [17, t + .4], [17, t + 6], [15.6, t + 9], [14, t + 6.4]]))
      + poly(WAX.hi, P([[27, t + .6], [29.2, t + .2], [29.2, t + 4.4], [28, t + 5.6]]))
      + `<line class="wick" x1="22" y1="${t - .8}" x2="22.8" y2="${t - 4.4}"/>`;
  };
  const candleLeft = () => state.candle === undefined ? 0 : Math.max(0, state.candle - Date.now());
  const paintCandle = () => {
    candle.classList.toggle("on", state.candle !== undefined);
    candle.setAttribute("aria-pressed", String(state.candle !== undefined));
    ctitle.textContent = state.candle !== undefined ? `おやすみタイマー: あと ${fmt(candleLeft() / 1000)}（押すと吹き消す）` : `ろうそく（灯すと ${CANDLE_MIN} 分で燃え尽き、音を静かに止める）`;
  };
  press(candle, () => {
    if (state.candle !== undefined) { state.candle = undefined; smokeT = 2.5; }
    else state.candle = Date.now() + CANDLE_MIN * 60_000;
    patch({ candle: state.candle }); paintCandle();
  });
  paintCandle();

  // ---------- 砂時計 ----------
  const hg = $<SVGGElement>(".hg"), stream = $<SVGLineElement>(".hourglass .stream");
  const sand = ["s-top-l", "s-top-r", "s-bot-l", "s-bot-r"].map(c => $<SVGPolygonElement>(`.${c}`));
  let trackKey = "", flip = 1;

  // ---------- きょうのレコード ----------
  const stackG = $<SVGGElement>(".stack"), discG = $<SVGGElement>(".disc");
  let stackSig = "", lastStack = -1e9, discAt: [number, number] = [34, 90], spin = 0;
  const restack = () => {
    const today = new Date().toDateString(), keys: string[] = [];
    for (const e of playLog()) if (new Date(e.t).toDateString() === today && !keys.includes(e.k)) keys.push(e.k);
    const shown = keys.slice(-11), now = ctx().player.album?.key ?? "";
    const sig = `${shown.join("|")}#${now}`;
    if (sig === stackSig) return;
    stackSig = sig;
    const SH = 4.6, D = 5;
    const slab = (i: number, c: string, top: boolean) => {
      const off = (hsh(i, 11) - .5) * 6, x0 = 6 + off, x1 = 62 + off, y0 = 100 - (i + 1) * SH, y1 = y0 + SH - .4;
      return poly(c, P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]))
        + poly(mix(c, "#000", 35), P([[x1, y0], [x1 + D, y0 - D * .6], [x1 + D, y1 - D * .6], [x1, y1]]))
        + poly(mix(c, "#fff", 22), P([[x0 + 4, y0 + 2.2], [x0 + 20, y0 + 2.2], [x0 + 20, y0 + 3.4], [x0 + 4, y0 + 3.4]]))
        + (top ? poly(mix(c, "#fff", 12), P([[x0, y0], [x1, y0], [x1 + D, y0 - D * .6], [x0 + D, y0 - D * .6]])) : "");
    };
    // いまかけているレコードは、いちばん上に盤だけ置く
    const n = Math.max(1, shown.length), offTop = (hsh(n - 1, 11) - .5) * 6;
    discAt = [34 + offTop + D * .5, 100 - n * SH - D * .3 - .9];
    if (!shown.length) {
      stackG.innerHTML = `<g class="rec empty"><title>きょう聴いたアルバムがここに積まれていく</title>${slab(0, "#4a4640", true)}</g>`;
      return;
    }
    stackG.innerHTML = shown.map((k, i) => {
      const a = ctx().byKey(k), c = a ? ctx().colorOf(a) : `hsl(${strHash(k) % 360} 30% 40%)`;
      const label = a ? `${a.title}${a.artist ? ` — ${a.artist}` : ""}` : "（見つからないアルバム）";
      return `<g class="rec${a ? "" : " gone"}${k === now ? " now" : ""}" data-k="${esc(k)}"${a ? ` role="button" tabindex="0" aria-label="${esc(label)} をもう一度かける"` : ""}><title>${esc(label)}</title>${slab(i, c, i === shown.length - 1)}</g>`;
    }).join("");
  };
  const replay = (e: Event) => {
    const g = (e.target as Element).closest<SVGGElement>(".rec[data-k]");
    const a = g && ctx().byKey(g.dataset.k!);
    if (a) ctx().play(a);
  };
  stackG.addEventListener("click", replay);
  stackG.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); replay(e); } });

  // ---------- 金魚鉢 ----------
  const bowl = $<SVGSVGElement>(".bowl"), fishG = $<SVGGElement>(".fish"), tail = $<SVGPolygonElement>(".fish .tail");
  const bubbleG = $<SVGGElement>(".bubbles"), foodG = $<SVGGElement>(".food");
  const fish = { x: 35, y: 86, vx: 0, vy: 0, dir: 1, face: 1, tx: 35, ty: 86, wag: 0 };
  let bubbles: { x: number; y: number; r: number }[] = [], food: { x: number; y: number }[] = [];
  press(bowl, () => { for (let i = 0; i < 3; i++) food.push({ x: 24 + Math.random() * 22, y: 54 + Math.random() * 1.5 }); });


  // ---------- 金魚鉢の水草: 聴いた日の数だけ、本数と丈が増える ----------
  const weedG = $<SVGGElement>(".weeds");
  const weeds = () => {
    const g = Math.max(.1, Math.min(1, daysListened() / 30)), n = 1 + Math.round(3 * g);
    return Array.from({ length: n }, (_, i) => ({ x: 22 + (i * 9.7 + hsh(i, 31) * 5) % 28, h: (8 + 28 * g) * (.7 + hsh(i, 32) * .3), ph: hsh(i, 33) * 6, w: 2 + hsh(i, 34) }));
  };
  let weedList = weeds(), weedSig = daysListened();

  // ---------- 読みかけの本 ----------
  const bookG = $<SVGGElement>(".bk"), turn = $<SVGPolygonElement>(".book .turn"), btitle = $<SVGTitleElement>(".book title");
  let bookPage = -1, bookIdx = -1, turnT = 1;
  const readOn = () => {
    const sec = listenedSeconds(), per = BOOK_PAGES * PAGE_SEC, idx = Math.floor(sec / per), page = Math.floor((sec % per) / PAGE_SEC);
    if (page === bookPage && idx === bookIdx) return;
    if (bookPage >= 0 && idx === bookIdx && !calm.matches) turnT = 0; // ページをめくる
    bookPage = page; bookIdx = idx;
    bookG.innerHTML = bookArt(page / BOOK_PAGES, idx, BOOK_COLORS[idx % BOOK_COLORS.length]);
    btitle.textContent = `${idx + 1} 冊目を読んでいる（${page + 1} / ${BOOK_PAGES} ページ）${idx ? `・読み終えた本 ${idx} 冊` : ""}。音楽を聴いている間に少しずつ読み進む`;
  };

  // ---------- 編みもの ----------
  const knitG = $<SVGGElement>(".kn"), ktitle = $<SVGTitleElement>(".knit title");
  let knitRow = -1, piece: SVGGElement | undefined;
  const knitOn = () => {
    const sec = listenedSeconds(), per = KNIT_ROWS * ROW_SEC, idx = Math.floor(sec / per), row = Math.floor((sec % per) / ROW_SEC);
    const sig = idx * 1000 + row;
    if (sig === knitRow) return;
    knitRow = sig;
    knitG.innerHTML = knitArt(row, idx, YARN_HUES[idx % YARN_HUES.length]);
    piece = knitG.querySelector<SVGGElement>(".piece")!;
    ktitle.textContent = `編みかけ（${row} / ${KNIT_ROWS} 段）${idx ? `・編み上がったもの ${idx} 枚` : ""}。音楽を聴いている間に 1 段ずつ編み進む`;
  };

  // ---------- ポスト: 月に一度の手紙 ----------
  const post = $<SVGSVGElement>(".post"), dlg = $<HTMLDialogElement>(".objs-letter"), ptitle = $<SVGTitleElement>(".post title");
  let letter = letterOf(), lastMail = 0;
  const unread = () => !!letter && state.letter !== letter.key;
  const paintPost = () => {
    post.classList.toggle("mail", unread());
    ptitle.textContent = unread() ? `${letter!.month}月の手紙が届いています（押すと読む）` : letter ? `${letter.month}月の手紙（押すと読み返す）` : "ポスト（月が替わると、先月よく聴いたアルバムの手紙が届く）";
  };
  press(post, () => {
    const L = letter;
    const today = new Date();
    dlg.innerHTML = L ? `<form method="dialog">
      <p class="lt-date">${today.getFullYear()}年${L.month === 12 ? 1 : L.month + 1}月</p>
      <h3>${L.month}月によく聴いたアルバム</h3>
      <p>${L.month}月は ${L.days} 日、${L.plays} 回アルバムをかけました。${(() => { const a = ctx().byKey(L.top[0][0]); return a ? `いちばんよく聴いたのは「${esc(a.title)}」でした。` : ""; })()}</p>
      <ol>${L.top.map(([k, n]) => { const a = ctx().byKey(k); return `<li><button type="button" data-k="${esc(k)}"${a ? "" : " disabled"}><i style="background:${a ? ctx().colorOf(a) : "#555"}"></i><span>${a ? esc(a.title) : "（見つからないアルバム）"}${a?.artist ? `<small>${esc(a.artist)}</small>` : ""}</span><em>${n} 回</em></button></li>`; }).join("")}</ol>
      <p class="lt-sign">押すとそのアルバムをかけます</p>
      <button value="close" class="lt-close">閉じる</button></form>`
      : `<form method="dialog"><h3>まだ手紙は届いていません</h3><p>月が替わると、その月によく聴いたアルバムの手紙が届きます。</p><button value="close" class="lt-close">閉じる</button></form>`;
    dlg.querySelectorAll<HTMLButtonElement>("button[data-k]").forEach(b => b.onclick = () => { const a = ctx().byKey(b.dataset.k!); if (a) ctx().play(a); dlg.close(); });
    dlg.showModal();
    if (L) { state.letter = L.key; patch({ letter: L.key }); paintPost(); }
  });
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // 外側を押すと閉じる
  paintPost();

  // ---------- 賞状: 聴いた距離の証書。届いたばかりのときはガラスがきらりと光る ----------
  const award = $<SVGSVGElement>(".award"), atitle = $<SVGTitleElement>(".award title");
  const paintAward = () => {
    const n = awards().length;
    atitle.textContent = n ? `賞状（${n} 枚。押すと証書を見る）` : "";
  };
  press(award, () => { award.classList.remove("new"); openCertificate(); });
  const onAward = () => { if (!root.isConnected) { document.removeEventListener("kona:award", onAward); return; } award.classList.add("new"); paintAward(); arrange(); };
  document.addEventListener("kona:award", onAward);
  paintAward();

  // ---------- サボテン・ポトス・季節の切り花 ----------
  const cactusG = $<SVGGElement>(".cc"), cacTitle = $<SVGTitleElement>(".cactus title");
  const pothosG = $<SVGGElement>(".pt"), potTitle = $<SVGTitleElement>(".pothos title");
  const vaseG = $<SVGGElement>(".vs"), vase = $<SVGSVGElement>(".vase"), vaseTitle = $<SVGTitleElement>(".vase title");
  let cacSig = "", potLeaves = -1, vaseMonth = -1, vines: SVGGElement[] = [], cuts: SVGGElement[] = [], splash = 1;
  if (state.water === undefined) { state.water = Date.now(); patch({ water: state.water }); }
  const plants = () => {
    const days = daysListened(), run = streak(), sig = `${days}|${run}`;
    if (sig !== cacSig) {
      cacSig = sig; cactusG.innerHTML = cactusArt(days, run);
      cacTitle.textContent = run >= 7 ? `サボテン（${run} 日続けて聴いているので、花が咲いた）` : `サボテン（${run} 日続けて聴いている。7 日続くと花が咲く）`;
    }
    const lv = Math.min(39, Math.floor(listenedSeconds() / POTHOS_SEC));
    if (lv !== potLeaves) {
      potLeaves = lv; pothosG.innerHTML = pothosArt(lv); vines = [...pothosG.querySelectorAll<SVGGElement>(".vine")];
      potTitle.textContent = `ポトス（垂れた葉 ${lv} 枚。聴いた時間で少しずつ伸びる）`;
    }
    const mo = new Date().getMonth();
    if (mo !== vaseMonth) { vaseMonth = mo; vaseG.innerHTML = vaseArt(mo); cuts = [...vaseG.querySelectorAll<SVGGElement>(".cut")]; }
  };
  // 水を替えてからの日数（月が替わって花が替わったら、そこから数え直す）
  const staleDays = () => { const d = new Date(), m0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return (Date.now() - Math.max(state.water ?? 0, m0)) / 86_400_000; };
  const paintVase = () => {
    const d = Math.floor(staleDays()), f = MONTH_FLOWERS[new Date().getMonth()];
    vaseTitle.textContent = `${f.name}（${d ? `${d} 日前に水を替えた` : "きょう水を替えた"}。押すと水を替える）`;
  };
  press(vase, () => { state.water = Date.now(); patch({ water: state.water }); splash = 0; paintVase(); });
  plants(); paintVase();

  // ---------- 夏の夜の虫 ----------
  const mothG = $<SVGGElement>(".moths"), moths = [...mothG.querySelectorAll<SVGGElement>(".moth")];
  const mothNight = () => { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return seasonOf(d) === "summer" && (h >= 19.5 || h < 4.5); };
  let mothOn = 0;

  // 設定で外した小物は置かない。並べる幅から大きさを決める
  const arrange = () => {
    let units = 0;
    // 賞状は届いてから立つ
    for (const o of OBJECTS) { const on = objectShown(o.key) && (o.key !== "award" || awards().length > 0); $<SVGSVGElement>(`.${o.key}`).style.display = on ? "" : "none"; if (on) units += o.w + 14; }
    root.style.setProperty("--units", String(Math.max(60, units)));
  };
  const onChange = () => root.isConnected ? arrange() : document.removeEventListener("kona:objects", onChange);
  document.addEventListener("kona:objects", onChange);
  arrange();

  const calm = { get matches() { return reduceMotion(); } };
  let loud = 0, slow = 0, play = 0, last = performance.now(), lastMinute = -1;

  everyFrame(root, () => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), t = now / 1000; last = now;
    const p = ctx().player, [l, r] = p.levels(), rms = (l + r) / 2;
    const db = rms > 0 ? Math.max(0, Math.min(1, (20 * Math.log10(rms) + 48) / 42)) : 0; // -48〜-6 dBFS を 0〜1 に
    loud += (db - loud) * (1 - Math.exp(-dt / 0.12));
    slow += (db - slow) * (1 - Math.exp(-dt / 1.2));
    play += ((p.playing ? 1 : 0) - play) * (1 - Math.exp(-dt / 0.8));
    const m = calm.matches ? 0.25 : 1;

    // 灯り: 点いているときだけ、音で少しだけ明るさが揺れる
    if (state.lamp) cone.style.opacity = String(0.82 + 0.18 * loud);

    // 鉢植え: 葉がゆっくり揺れる。大きい音ほど少し大きく。花は茎ごと、葉よりゆっくり
    const amp = (1.5 + 7 * slow) * m;
    if (now - lastCheck > 60_000) { lastCheck = now; grow(); }
    flowerG.querySelectorAll<SVGGElement>(".flower").forEach((f, i) => {
      const a = Number(f.dataset.a) + Math.sin(t * (0.5 + i * 0.1) + i) * amp * .6;
      f.setAttribute("transform", `translate(31 68) rotate(${a.toFixed(2)})`);
    });
    leaves.forEach((leaf, i) => {
      const ang = plant!.leaves[i].a + Math.sin(t * (0.7 + i * 0.13) + i * 1.7) * amp;
      leaf.setAttribute("transform", `translate(31 68.5) rotate(${ang.toFixed(2)})`);
    });

    // ろうそく: 灯している間だけ燃えて短くなる。燃え尽きたら音を絞って止める
    const left = candleLeft(), lit = state.candle !== undefined;
    if (lit && left <= 0 && !fading) {
      fading = true; state.candle = undefined; smokeT = 2.5; patch({ candle: undefined }); paintCandle();
      p.fadeOutAndPause(8).finally(() => { fading = false; });
    }
    const minute = Math.floor(left / 60_000);
    if (minute !== lastMinute) { lastMinute = minute; paintCandle(); }
    const burnt = lit ? 1 - left / (CANDLE_MIN * 60_000) : 0;
    drawWax(FULL + (LOW - FULL) * burnt);
    if (lit) {
      // 炎の高さは音の大きさ。止まっていても小さく灯る
      const fk = calm.matches ? 0 : (Math.sin(t * 13) + Math.sin(t * 23.7 + 1) * 0.6) * 0.06;
      const h = 8 + 16 * loud * (0.4 + 0.6 * play) + fk * 8, w = 2.8 + 1.3 * loud;
      const dx = calm.matches ? 0 : Math.sin(t * 3.1) * 0.9 + fk * 6, cx = 22.6, b = waxTop - 3.6;
      const L: number[] = [cx - w, b - h * .32], R: number[] = [cx + w, b - h * .32], T: number[] = [cx + dx, b - h], B: number[] = [cx, b + 1.2];
      fl.setAttribute("points", P([B, [cx - w * .7, b - .2], L, T]));
      fr.setAttribute("points", P([B, T, R, [cx + w * .7, b - .2]]));
      fc.setAttribute("points", P([[cx, b + .2], [cx - w * .45, b - h * .22], [cx + dx * .5, b - h * .55], [cx + w * .45, b - h * .22]]));
      halo.setAttribute("cy", (b - h * 0.45).toFixed(1));
      halo.setAttribute("r", (6 + h * 0.6).toFixed(1));
      halo.style.opacity = String(0.07 + 0.1 * loud);
    }
    flameG.style.display = lit ? "" : "none";
    halo.style.display = lit ? "" : "none";
    // 吹き消したあとは、細い煙がしばらく立ちのぼる
    smokeT = Math.max(0, smokeT - dt);
    smoke.style.opacity = String(Math.min(1, smokeT) * .6);
    if (smokeT > 0) {
      const pts: number[][] = [];
      for (let k = 0; k <= 7; k++) pts.push([22.8 + Math.sin(t * 2.2 - k * .8) * k * .45, waxTop - 4.4 - k * 3.4 - (2.5 - smokeT) * 3]);
      smoke.setAttribute("points", P(pts));
    }

    // 砂時計: 曲の進み具合で砂が落ちる。曲が変わったら返す
    const key = p.album ? `${p.album.key}|${p.index}` : "";
    if (key !== trackKey) { if (trackKey && key && !calm.matches) flip = 0; trackKey = key; }
    flip = Math.min(1, flip + dt / .8);
    const pr = flip < 1 ? 0 : (p.duration ? Math.max(0, Math.min(1, p.position / p.duration)) : 0);
    const yS = 38.5 + 25 * Math.sqrt(pr), base = 91 - 8 * pr, apex = base - 10 * Math.min(1, pr * 3);
    sand[0].setAttribute("points", P([[8, yS], [22, yS + 1.2], [22, 66], [8, 66]]));
    sand[1].setAttribute("points", P([[22, yS + 1.2], [36, yS], [36, 66], [22, 66]]));
    sand[2].setAttribute("points", P([[8, 92], [8, base], [22, apex], [22, 92]]));
    sand[3].setAttribute("points", P([[22, apex], [36, base], [36, 92], [22, 92]]));
    const flowing = p.playing && pr > 0 && pr < .995 && flip >= 1;
    stream.style.opacity = flowing ? ".9" : "0";
    stream.setAttribute("y2", apex.toFixed(1));
    hg.setAttribute("transform", flip < 1 ? `rotate(${(180 * (1 - smooth(flip))).toFixed(1)} 22 66)` : "");

    // きょうのレコード: 数秒ごとに積み直す（曲が変わると増える）
    if (now - lastStack > 2000) { lastStack = now; restack(); }
    // 盤: 10 角形の楕円を中心からの三角に割り、つやの向きを回して回っているように見せる
    if (p.album) {
      spin += dt * play * 3.5 * m;
      const [cx, cy] = discAt, N = 12, ring = (rx: number, ry: number, k: number) => [cx + Math.cos(k / N * Math.PI * 2) * rx, cy + Math.sin(k / N * Math.PI * 2) * ry];
      // 縁（手前半分）を先に、その上に盤面
      let d = "";
      for (let k = 0; k < N / 2; k++) d += poly(k % 2 ? "#141312" : "#1b1a18", P([ring(25, 5.2, k), ring(25, 5.2, k + 1), ring(25, 5.2, k + 1).map((v, j) => v + (j ? 1.6 : 0)), ring(25, 5.2, k).map((v, j) => v + (j ? 1.6 : 0))]));
      for (let k = 0; k < N; k++) {
        const sheen = Math.cos(k / N * Math.PI * 2 * 2 - spin * 2);
        d += poly(`hsl(30 4% ${(11 + 7 * Math.max(0, sheen)).toFixed(0)}%)`, P([[cx, cy], ring(25, 5.2, k), ring(25, 5.2, k + 1)]));
      }
      const c = ctx().colorOf(p.album);
      d += poly(c, P(Array.from({ length: 8 }, (_, k) => [cx + Math.cos(k / 8 * Math.PI * 2 + spin) * 7.4, cy + Math.sin(k / 8 * Math.PI * 2 + spin) * 1.55])));
      d += poly("#0d0c0b", P(Array.from({ length: 6 }, (_, k) => [cx + Math.cos(k / 6 * Math.PI * 2) * .9, cy + Math.sin(k / 6 * Math.PI * 2) * .25])));
      discG.innerHTML = d;
    } else if (discG.firstChild) discG.innerHTML = "";

    // 金魚: 目当ての場所へ泳ぐ。音が大きいほど速く、よく動く。静かなときは底のほうでじっと
    if (food.length) { const f = food[0]; fish.tx = f.x; fish.ty = Math.max(58, f.y); }
    else if (Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 3 || Math.random() < dt * (0.15 + loud * .6)) {
      fish.tx = 18 + Math.random() * 34;
      fish.ty = p.playing ? 60 + Math.random() * 28 : 82 + Math.random() * 6;
    }
    const speed = (3 + 14 * loud * play + (food.length ? 8 : 0)) * m;
    const dx = fish.tx - fish.x, dy = fish.ty - fish.y, dist = Math.hypot(dx, dy) || 1;
    fish.vx += (dx / dist * speed - fish.vx) * (1 - Math.exp(-dt / .5));
    fish.vy += (dy / dist * speed * .6 - fish.vy) * (1 - Math.exp(-dt / .5));
    fish.x = Math.max(17, Math.min(53, fish.x + fish.vx * dt));
    fish.y = Math.max(59, Math.min(90, fish.y + fish.vy * dt));
    if (Math.abs(fish.vx) > .6) fish.dir = Math.sign(fish.vx);
    fish.face += (fish.dir - fish.face) * (1 - Math.exp(-dt / .18));
    fish.wag += dt * (3 + Math.abs(fish.vx) * .8) * m;
    tail.setAttribute("transform", `rotate(${(Math.sin(fish.wag * 2) * 14).toFixed(1)} -5 0)`);
    fishG.setAttribute("transform", `translate(${fish.x.toFixed(2)} ${(fish.y + Math.sin(t * 1.3) * .6).toFixed(2)}) scale(${(fish.face * 1.15).toFixed(3)} 1.15)`);
    // えさ: ゆっくり沈む。金魚が近づくと食べる
    food = food.filter(f => { f.y += dt * 4; return f.y < 94 && Math.hypot(f.x - fish.x - fish.dir * 6, f.y - fish.y) > 2.5; });
    foodG.innerHTML = food.map(f => poly("#c9a35a", P([[f.x - .8, f.y], [f.x, f.y - .7], [f.x + .8, f.y + .2]]))).join("");
    // 泡: 音が大きいときに口元から
    if (!calm.matches && Math.random() < dt * (.15 + 2.2 * loud * loud * play)) bubbles.push({ x: fish.x + fish.dir * 6.5, y: fish.y - 1, r: .6 + Math.random() * .8 });
    bubbles = bubbles.filter(bb => { bb.y -= dt * 9; bb.x += Math.sin(bb.y * .6) * dt * 2; return bb.y > 55; });
    bubbleG.innerHTML = bubbles.map(bb => `<circle cx="${bb.x.toFixed(1)}" cy="${bb.y.toFixed(1)}" r="${bb.r.toFixed(2)}"/>`).join("");
    // 水草: 根元は動かず、先へいくほど水に揺られる。細い葉を節ごとに 2 枚の三角で
    if (now - lastCheck < 50 && daysListened() !== weedSig) /* 鉢植えと同じく 1 分ごとに */ { weedSig = daysListened(); weedList = weeds(); }
    let wd = "";
    weedList.forEach((w, i) => {
      const S = 6, pts: number[][] = [];
      for (let k = 0; k <= S; k++) { const u = k / S; pts.push([w.x + Math.sin(t * .8 * m + w.ph + u * 2.2) * u * u * (2.2 + 2 * slow) * m + Math.sin(u * 5 + i) * .8, 96 - u * w.h]); }
      for (let k = 0; k < S; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], hw = w.w * (1 - k / S) + .3, hw1 = w.w * (1 - (k + 1) / S) + .3;
        wd += poly(k % 2 ? "#4c7a45" : "#5a8a4e", P([[x0 - hw, y0], [x0, y0], [x1, y1], [x1 - hw1, y1]])) + poly(k % 2 ? "#365c31" : "#3f6a38", P([[x0, y0], [x0 + hw, y0], [x1 + hw1, y1], [x1, y1]]));
      }
    });
    weedG.innerHTML = wd;

    // 本と編みもの: 聴いた時間で進む
    readOn(); knitOn();
    turnT = Math.min(1, turnT + dt / .9);
    if (turnT < 1) {
      const u = smooth(turnT), yb = 100 - Math.min(3, bookIdx) * 5.4, g = yb - 2, dx = 25 * Math.cos(Math.PI * u), lift = 9 * Math.sin(Math.PI * u);
      turn.setAttribute("points", P([[32, g], [32, g - 13], [32 + dx * .96, g - 13 - lift], [32 + dx, g - lift]]));
      turn.style.display = "";
    } else turn.style.display = "none";
    if (piece) piece.setAttribute("transform", `translate(20 30) rotate(${(Math.sin(t * .9) * (.6 + 2 * slow) * m).toFixed(2)} 0 4)`);


    // 植物: 1 分ごとに育ち具合を見直す
    if (now - lastCheck < 50) { plants(); paintVase(); }
    vines.forEach((v, i) => {
      const a = Math.sin(t * (.55 + i * .12) + i * 2) * (.8 + 3 * slow) * m;
      v.setAttribute("transform", `rotate(${a.toFixed(2)} ${v.dataset.x} ${v.dataset.y})`);
    });
    // 切り花: 水を替えずに日が経つとうなだれる（5 日目から、10 日でいちばん深く）。替えた直後は少し弾む
    splash = Math.min(1, splash + dt / 1.2);
    const droop = Math.max(0, Math.min(1, (staleDays() - 4) / 6)), bounce = splash < 1 ? Math.sin(splash * Math.PI * 3) * (1 - splash) * 6 : 0;
    cuts.forEach((c, i) => {
      const a = Number(c.dataset.a), side = a === 0 ? (i % 2 ? 1 : -1) : Math.sign(a);
      const ang = a * (1 + droop * .5) + side * droop * 22 + Math.sin(t * (.5 + i * .1) + i) * (.6 + 2 * slow) * m + bounce * side;
      c.setAttribute("transform", `translate(22 61) rotate(${ang.toFixed(2)})`);
    });
    (cuts[0]?.parentElement as SVGGElement | null)?.style.setProperty("filter", droop ? `saturate(${(1 - droop * .45).toFixed(2)}) brightness(${(1 - droop * .15).toFixed(2)})` : "");

    // ポスト: 手紙は 1 分ごとに確かめる。届いていれば封筒が上下にふわりと
    if (now - lastMail > 60_000) { lastMail = now; letter = letterOf(); paintPost(); }

    // 夏の夜、灯りを点けていると虫が寄る
    mothOn += ((state.lamp && mothNight() ? 1 : 0) - mothOn) * (1 - Math.exp(-dt / 1.5));
    mothG.style.opacity = mothOn.toFixed(2);
    if (mothOn > .01) moths.forEach((mo, i) => {
      const a = t * (1.3 + i * .4) * m + i * 2.1, rad = 7 + 3 * Math.sin(t * .7 + i);
      const x = 54 + Math.cos(a) * rad + Math.sin(t * 3.1 + i) * 1.5, y = 58 + Math.sin(a * 1.3) * rad * .7 + Math.cos(t * 2.3 + i) * 1.2;
      const flap = calm.matches ? 1 : .35 + .65 * Math.abs(Math.sin(t * 22 + i * 3));
      mo.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(.9 ${flap.toFixed(2)})`);
    });
  });
}
