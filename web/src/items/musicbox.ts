// オルゴール。押すとふたが開いて、短い旋律が鳴る
import { box, poly, tone, BRASS } from "./lowpoly";
import { chimeNotes, onPress, q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#8a5a3e");
  return `${poly("#3a2418", [[4, 12], [10, 4], [46, 4], [40, 12]])}<g class="lid">${poly(T.hi, [[4, 12], [10, 4], [46, 4], [40, 12]])}</g>${poly(T.lo, [[40, 12], [46, 4], [46, 30], [40, 38]])}
    ${box(T, 4, 12, 36, 26, 0, 0)}${poly(BRASS.mid, [[18, 22], [26, 22], [26, 28], [18, 28]])}<g class="key">${poly(BRASS.hi, [[46, 14], [50, 12], [50, 16], [46, 18]])}</g>`;
}

// ド・ミ・ソ・ラ・ソ・ミ・レ・ド（高めの音で、オルゴールらしく）
const TUNE = [1047, 1319, 1568, 1760, 1568, 1319, 1175, 1047];
const live: Live = svg => {
  const lid = q(svg, ".lid")!, key = q(svg, ".key")!;
  svg.style.overflow = "visible";
  let until = 0, open = 0, turn = 0;
  onPress(svg, () => { if (performance.now() < until) return; until = performance.now() + chimeNotes(TUNE, .28, .05) * 1000; });
  return s => {
    const on = performance.now() < until;
    open += ((on ? 1 : 0) - open) * Math.min(1, s.dt * 5);
    lid.setAttribute("transform", `translate(0 ${(-open * 9).toFixed(2)}) skewX(${(-open * 10).toFixed(2)})`);
    if (on) turn += s.dt * 180;
    key.setAttribute("transform", `rotate(${turn.toFixed(1)} 48 15)`);
  };
};

export default { key: "musicbox", label: "オルゴール", at: "shelf", w: 50, h: 38, cat: "音楽", order: 210, note: "押すとふたが開いて、短い旋律が鳴る", art, live } satisfies ItemDef;
