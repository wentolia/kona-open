// 季節の飾り: 日付に合わせて、いちばん上の棚の右端に季節のものがひとつ出る（正月の鏡餅、桜、こどもの日、七夕、
// 夏の風鈴、お月見、ハロウィン、クリスマス）。猫と同じローポリ（平らな多角形と濃淡）で描く
// 部屋の明かりの層の下にあるので、夕方は橙に、深夜は暗く沈む。かぼちゃとツリーの灯りは夜に灯る

import "./room-decor.css";
import { prefs, reduceMotion } from "./prefs";

interface Decor { key: string; label: string; from: [number, number]; to: [number, number]; w: number; svg: () => string }

export const poly = (c: string, pts: number[], cls = "") =>
  `<polygon${cls ? ` class="${cls}"` : ""} style="fill:${c};stroke:${c}" points="${pts.map(v => v.toFixed(1)).join(" ")}"/>`;
/** n 角形のだ円（ローポリの丸） */
export const blob = (cx: number, cy: number, rx: number, ry: number, n = 9, rot = 0) =>
  Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }).flat();
/** 上半分だけ明るく塗る（光は左上から） */
export const lit = (cx: number, cy: number, rx: number, ry: number, c: string, n = 7) =>
  poly(c, Array.from({ length: n }, (_, i) => { const a = Math.PI * (1 + i / (n - 1)) - .5; return [cx + Math.cos(a) * rx * .82, cy + Math.sin(a) * ry * .82]; }).flat());
const flower = (x: number, y: number, r: number, c: string, core: string) => poly(c, blob(x, y, r, r, 5, -Math.PI / 2)) + poly(core, blob(x, y, r * .35, r * .35, 5));

// 三方（白木の台）: 鏡餅とお月見に使う
const sanbo = (x0: number, x1: number, top: number) => {
  const m = (x0 + x1) / 2, w = x1 - x0;
  return poly("#c9a878", [x0, top, x1, top, x1 - w * .04, top + 8, x0 + w * .04, top + 8]) + poly("#e2c79a", [x0, top, x1, top, x1 - 2, top + 2.5, x0 + 2, top + 2.5]) +
    poly("#b08e60", [m - w * .32, top + 8, m + w * .32, top + 8, m + w * .38, 100, m - w * .38, 100]) +
    poly("#8f714a", [m + w * .12, top + 8, m + w * .32, top + 8, m + w * .38, 100, m + w * .16, 100]) +
    poly("#5a4630", blob(m, top + 20, w * .1, 6, 6));
};

const DECOR: Decor[] = [
  { key: "kagami", label: "鏡餅", from: [12, 28], to: [1, 11], w: 62, svg: () =>
    sanbo(14, 86, 66) +
    poly("#f7f3ea", [22, 66, 78, 66, 84, 58, 16, 58]) + poly("#d8392b", [16, 58, 22, 66, 20, 66, 14, 58]) + poly("#d8392b", [84, 58, 78, 66, 80, 66, 86, 58]) +
    poly("#ece6d8", blob(50, 54, 30, 9, 11)) + lit(50, 54, 30, 9, "#fbf8f1", 8) +
    poly("#e6dfd0", blob(50, 42, 22, 8, 10)) + lit(50, 42, 22, 8, "#fdfbf6", 8) +
    poly("#e98a1f", blob(50, 30, 9, 8, 8)) + lit(50, 30, 9, 8, "#f6b04a", 6) + poly("#3f7a3a", [50, 22, 62, 17, 56, 24]) + poly("#2c5a2a", [50, 22, 56, 24, 52, 25]) },
  { key: "hina", label: "桃の花とひな人形", from: [2, 20], to: [3, 3], w: 66, svg: () =>
    poly("#3a2a20", [4, 100, 96, 100, 94, 93, 6, 93]) + poly("#b2232a", [6, 93, 94, 93, 92, 90, 8, 90]) +
    // お内裏様（黒）とお雛様（赤）
    poly("#22252c", [16, 90, 36, 90, 32, 66, 20, 66]) + poly("#3a3e48", [16, 90, 26, 90, 26, 66, 20, 66]) + poly("#f1e6d6", blob(26, 61, 5, 5.5, 7)) + poly("#16171b", [22, 57, 30, 57, 29, 53, 23, 53]) +
    poly("#c43a3a", [40, 90, 62, 90, 57, 67, 45, 67]) + poly("#e2645a", [40, 90, 51, 90, 51, 67, 45, 67]) + poly("#f1e6d6", blob(51, 62, 5, 5.5, 7)) + poly("#16171b", [45, 60, 57, 60, 55, 55, 47, 55]) + poly("#d8a83a", [48, 55, 54, 55, 51, 51]) +
    // 桃の枝を挿した小さな花瓶
    poly("#a7b4c2", [72, 90, 86, 90, 88, 72, 84, 66, 74, 66, 70, 72]) + poly("#c6d1dc", [72, 90, 78, 90, 78, 66, 74, 66, 70, 72]) +
    `<g class="dec-sway">${poly("#5b3e2c", [78, 66, 79, 66, 70, 22, 69, 22])}${poly("#5b3e2c", [79, 66, 80, 66, 92, 30, 91, 30])}${poly("#5b3e2c", [74, 46, 75, 46, 62, 36, 61, 36])}
    ${[[70, 24], [66, 34], [62, 37], [72, 40], [76, 52], [91, 32], [88, 42], [85, 50], [70, 30]].map(([x, y], i) => flower(x, y, 3.6, i % 2 ? "#ef8fa8" : "#e86f93", "#fbe0e7")).join("")}</g>` },
  { key: "sakura", label: "桜の枝", from: [3, 20], to: [4, 15], w: 52, svg: () =>
    poly("#8a9a9f", [34, 100, 66, 100, 70, 84, 62, 62, 60, 50, 40, 50, 38, 62, 30, 84]) + poly("#a9b8bc", [34, 100, 48, 100, 48, 50, 40, 50, 38, 62, 30, 84]) + poly("#6c7a80", [40, 50, 60, 50, 58, 54, 42, 54]) +
    `<g class="dec-sway">${poly("#4f3628", [49, 52, 51, 52, 30, 8, 28, 8])}${poly("#4f3628", [50, 52, 52, 52, 78, 14, 76, 14])}${poly("#4f3628", [40, 32, 41, 31, 18, 26, 18, 27])}${poly("#4f3628", [62, 32, 63, 33, 86, 32, 86, 31])}
    ${[[28, 10], [33, 18], [38, 26], [22, 25], [17, 29], [44, 36], [76, 15], [70, 22], [64, 30], [84, 30], [80, 35], [58, 40], [30, 16], [72, 18]].map(([x, y], i) => flower(x, y, 4, i % 3 ? "#f5c9d3" : "#f0b2c2", "#fff2f4")).join("")}</g>
    <g class="dec-petal">${poly("#f5c9d3", blob(0, 0, 2, 1.4, 5))}</g>` },
  { key: "koinobori", label: "こいのぼり", from: [4, 20], to: [5, 5], w: 60, svg: () => {
    const carp = (y: number, len: number, c: string, lo: string, belly: string, i: number) => `<g class="dec-carp" style="animation-delay:${-i * .4}s">` +
      poly(c, [22, y - 6, 22 + len * .8, y - 5, 22 + len, y - 8, 22 + len * .9, y, 22 + len, y + 8, 22 + len * .8, y + 5, 22, y + 6]) +
      poly(lo, [22, y + 1, 22 + len * .8, y + 1, 22 + len * .9, y, 22 + len, y + 8, 22 + len * .8, y + 5, 22, y + 6]) +
      poly(belly, [24, y + 2, 22 + len * .7, y + 3, 22 + len * .7, y + 5, 24, y + 5]) +
      poly("#fff", blob(29, y - 1.5, 3.2, 3.2, 7)) + poly("#16171b", blob(29, y - 1.5, 1.5, 1.5, 6)) + "</g>";
    return poly("#7a5a3a", [18, 100, 21, 100, 21, 8, 18, 8]) + poly("#d8b04a", blob(19.5, 6, 3.5, 3.5, 7)) +
      `<g class="dec-wind">${poly("#3a8ad8", [21, 12, 40, 14, 30, 16, 40, 18, 21, 20])}` +
      carp(32, 66, "#25262c", "#16171b", "#d8a83a", 0) + carp(52, 58, "#cf3b30", "#a32a22", "#f4d0a0", 1) + carp(70, 48, "#3a76c8", "#2c5aa0", "#cfe0f4", 2) + "</g>" +
      poly("#4a3a2c", [12, 100, 28, 100, 26, 96, 14, 96]);
  } },
  { key: "tanabata", label: "七夕の笹飾り", from: [6, 28], to: [7, 7], w: 54, svg: () => {
    const strip = (x: number, y: number, c: string, i: number) => `<g class="dec-swing" style="transform-origin:${x + 2}px ${y}px;animation-delay:${-i * .7}s">${poly(c, [x, y, x + 4.5, y, x + 4.5, y + 15, x, y + 15])}</g>`;
    const leaf = (x: number, y: number, dx: number, dy: number, c: string) => poly(c, [x, y, x + dx, y + dy, x + dx * .4, y + dy * .4 + 2]);
    return poly("#3f5a2c", [30, 100, 50, 100, 48, 94, 32, 94]) + poly("#7a9a4a", [39, 94, 42, 94, 44, 4, 42, 4]) + poly("#5f7d38", [41, 94, 42, 94, 44, 4, 43, 4]) +
      [[42, 20, -24, 8], [43, 28, 26, 6], [42, 40, -26, 10], [43, 50, 24, 12], [43, 12, 18, -2], [42, 62, -20, 10], [43, 70, 18, 8]].map(([x, y, dx, dy], i) => leaf(x, y, dx, dy, i % 2 ? "#5d8a3a" : "#6f9c44")).join("") +
      strip(22, 28, "#e8564a", 0) + strip(64, 34, "#f0c23a", 1) + strip(18, 50, "#4a8ad0", 2) + strip(62, 62, "#a35ac8", 3) + strip(30, 66, "#f2f0e8", 4) + strip(54, 18, "#4aa86a", 5) +
      `<g class="dec-swing" style="transform-origin:72px 46px">${poly("#e88aa8", blob(72, 52, 4, 6, 8))}${poly("#e88aa8", [70, 58, 74, 58, 76, 70, 68, 70])}</g>`;
  } },
  { key: "furin", label: "風鈴", from: [7, 15], to: [8, 31], w: 44, svg: () =>
    poly("#4a3a2c", [10, 100, 90, 100, 86, 95, 14, 95]) + poly("#6b5240", [18, 95, 23, 95, 23, 14, 18, 14]) + poly("#6b5240", [18, 14, 72, 14, 72, 18, 18, 18]) +
    `<g class="dec-swing" style="transform-origin:62px 18px">` + poly("#6b5240", [61.5, 18, 62.5, 18, 62.5, 26, 61.5, 26]) +
    poly("rgba(200,226,236,.75)", [50, 44, 74, 44, 72, 34, 66, 27, 58, 27, 52, 34]) + poly("rgba(240,250,255,.85)", [52, 40, 58, 30, 61, 29, 56, 40]) +
    poly("#d8392b", [56, 36, 68, 36, 66, 31, 58, 31]) + poly("#2c6ab0", [52, 42, 72, 42, 73, 44, 51, 44]) +
    poly("#d8392b", [61, 44, 63, 44, 63, 54, 61, 54]) + `<g class="dec-swing" style="transform-origin:62px 54px;animation-duration:2.6s">${poly("#f4f0e2", [57, 54, 67, 54, 67, 82, 57, 82])}${poly("#2c6ab0", [59, 60, 65, 60, 65, 61.5, 59, 61.5])}</g></g>` },
  { key: "tsukimi", label: "お月見", from: [9, 10], to: [10, 5], w: 64, svg: () => {
    const dango = (x: number, y: number) => poly("#ece7da", blob(x, y, 6.5, 6, 8)) + lit(x, y, 6.5, 6, "#fbf9f2", 6);
    return sanbo(8, 62, 74) + [[22, 66], [35, 66], [48, 66], [28.5, 56], [41.5, 56], [35, 46]].map(([x, y]) => dango(x, y)).join("") +
      // すすきを挿した花瓶
      poly("#4a4f58", [70, 100, 92, 100, 90, 76, 72, 76]) + poly("#626875", [70, 100, 80, 100, 80, 76, 72, 76]) +
      `<g class="dec-sway">${[[78, 4, -10], [82, 10, 6], [80, 18, 14], [76, 14, -16]].map(([x, y, dx], i) =>
        poly("#a89a6a", [80 + i * .6, 76, 81 + i * .6, 76, x + dx * .2, y, x - 1 + dx * .2, y]) +
        poly("#d8c89a", [x + dx * .2, y, x + dx * .2 + dx * .3, y + 4, x + dx * .2 + dx * .5, y + 14, x + dx * .2 + 1, y + 12])).join("")}</g>`;
  } },
  { key: "pumpkin", label: "ハロウィンのかぼちゃ", from: [10, 15], to: [10, 31], w: 60, svg: () =>
    poly("#b85a14", blob(30, 76, 20, 22, 9)) + poly("#b85a14", blob(70, 76, 20, 22, 9)) + poly("#e07a1e", blob(50, 75, 22, 24, 10)) +
    lit(30, 76, 20, 22, "#d4701c") + lit(70, 76, 20, 22, "#d4701c") + lit(50, 75, 22, 24, "#f0973a", 8) +
    poly("#5a6a2a", [47, 52, 53, 52, 56, 40, 52, 39]) + poly("#3f4a1e", [50, 52, 53, 52, 56, 40, 54, 40]) +
    `<g class="dec-glow">` + poly("#ffcf5a", [32, 70, 42, 70, 37, 61]) + poly("#ffcf5a", [58, 70, 68, 70, 63, 61]) +
    poly("#ffcf5a", [30, 80, 70, 80, 66, 90, 58, 86, 50, 91, 42, 86, 34, 90]) + `</g>` },
  { key: "tree", label: "クリスマスツリー", from: [12, 1], to: [12, 25], w: 56, svg: () =>
    poly("#9a3a2a", [36, 100, 64, 100, 66, 86, 34, 86]) + poly("#b84a36", [34, 86, 50, 86, 50, 100, 36, 100]) + poly("#5a3a26", [46, 86, 54, 86, 54, 78, 46, 78]) +
    [[50, 52, 30, 80], [50, 32, 24, 62], [50, 12, 17, 44]].map(([x, top, w, bot]) => poly("#2f5a3a", [x, top, x + w, bot, x - w, bot]) + poly("#3d7048", [x, top, x, bot, x - w, bot])).join("") +
    poly("#f2c84a", blob(50, 11, 6, 6, 10).map((v, i) => i % 4 < 2 ? (v - (i % 2 ? 11 : 50)) * .45 + (i % 2 ? 11 : 50) : v)) +
    `<g class="dec-lights">${[[40, 40], [58, 46], [46, 56], [62, 64], [36, 70], [52, 72], [44, 30], [66, 76], [30, 76]].map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="2.2" style="fill:${["#ff6a5a", "#ffd25a", "#7ad0ff", "#ff9ad0"][i % 4]};animation-delay:${-i * .37}s"/>`).join("")}</g>` },
];

const md = (d: Date): [number, number] => [d.getMonth() + 1, d.getDate()];
const le = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
/** 今日の飾り（なければ undefined）。年をまたぐ期間（正月）にも対応 */
export function decorFor(d = new Date()): Decor | undefined {
  const t = md(d);
  return DECOR.find(x => le(x.from, x.to) ? le(x.from, t) && le(t, x.to) : le(x.from, t) || le(t, x.to));
}

export function initRoomDecor() {
  let el: HTMLElement | null = null, key = "";
  const update = () => {
    const grid = document.querySelector<HTMLElement>("#view-home .grid");
    const dec = prefs().decor ? decorFor() : undefined;
    const shelf = grid?.querySelector<HTMLElement>(".mod-shelf");
    if (!grid || !dec || !shelf) { el?.remove(); el = null; return; }
    if (!el || el.parentElement !== grid || key !== dec.key) {
      el?.remove(); key = dec.key;
      el = document.createElement("div");
      el.className = `room-decor dec-${dec.key}`; el.title = dec.label; el.setAttribute("aria-label", dec.label); el.setAttribute("role", "img");
      el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet">${dec.svg()}</svg>`;
      grid.append(el);
    }
    // いちばん上の棚の、棚板の上の右端
    const g = grid.getBoundingClientRect(), r = shelf.getBoundingClientRect();
    const board = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--board")) || 11;
    const h = Math.min(96, Math.max(44, r.height * .3)), w = h * dec.w / 100 * 1.6;
    Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${r.right - g.left - w - 14}px`, top: `${r.bottom - g.top - board - h}px` });
    el.classList.toggle("dec-calm", reduceMotion());
    el.classList.toggle("dec-night", (() => { const n = new Date().getHours(); return n >= 17 || n < 6; })());
  };
  update();
  setInterval(update, 1000);
  addEventListener("resize", update);
  document.addEventListener("kona:prefs", update); // 設定ページで切り替えたらすぐ反映
}
