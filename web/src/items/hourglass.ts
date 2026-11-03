// 砂時計。実績「はじめの一時間」で届く。再生中は砂が落ちる
import { poly, tone } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5a3c"), G = "rgba(220,235,240,.35)";
  return `${poly(W.hi, [[2, 0], [28, 0], [28, 4], [2, 4]])}${poly(W.lo, [[2, 42], [28, 42], [28, 46], [2, 46]])}
    ${poly(W.mid, [[4, 4], [6, 4], [6, 42], [4, 42]])}${poly(W.deep, [[24, 4], [26, 4], [26, 42], [24, 42]])}
    ${poly(G, [[8, 5], [22, 5], [16, 23], [22, 41], [8, 41], [14, 23]])}
    <g class="top">${poly("#e2c48a", [[10, 10], [20, 10], [16, 21], [14, 21]])}</g>
    ${poly("#d8b878", [[9, 41], [21, 41], [18, 35], [12, 35]])}
    <g class="fall">${poly("#e2c48a", [[14.6, 22], [15.4, 22], [15.4, 37], [14.6, 37]])}</g>`;
}

const live: Live = svg => { const f = q(svg, ".fall")!; return s => { f.style.opacity = s.playing ? String(.6 + .4 * Math.sin(s.t * 9)) : "0"; }; };

export default { key: "hourglass", label: "砂時計", at: "shelf", w: 30, h: 46, cat: "小物", order: 700, note: "実績「はじめの一時間」で届く。再生中は砂が落ちる", art, live } satisfies ItemDef;
