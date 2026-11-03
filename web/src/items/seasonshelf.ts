// 季節の飾り棚。実績「四季の飾り」で届く。季節ごとに飾りが替わる
import { poly, tone, box, ngon, puff, leaf } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8a6a48");
  return `${box(W, 4, 10, 106, 98, 8, -5)}${poly("#2a1d14", [[10, 16], [104, 16], [104, 56], [10, 56]])}${poly("#2a1d14", [[10, 62], [104, 62], [104, 102], [10, 102]])}
    <g class="sz" data-s="0">${leaf("#e8a0b0", "#c98090", 30, 54, 16, 6, -20)}${leaf("#e8a0b0", "#c98090", 34, 54, 14, 5, 30)}${poly("#5f8a5a", [[70, 40], [90, 40], [88, 56], [72, 56]])}</g>
    <g class="sz" data-s="1">${poly("#9ab0c0", [[22, 40], [38, 40], [36, 56], [24, 56]])}${poly("#ec8a22", ngon(80, 48, 7, 8))}</g>
    <g class="sz" data-s="2">${puff(tone("#d86a2a"), ngon(32, 46, 9, 9), [29, 43])}${leaf("#c4523e", "#8a3a2a", 78, 54, 14, 5, -30)}${leaf("#e0a03a", "#a87a2a", 84, 54, 12, 4, 30)}</g>
    <g class="sz" data-s="3">${puff(tone("#efe8da"), ngon(32, 50, 7, 9), [30, 48])}${puff(tone("#efe8da"), ngon(32, 39, 5, 9), [30, 37])}${poly("#2f5a3a", [[76, 56], [82, 30], [88, 56]])}</g>
    ${box(tone("#c9a24a"), 24, 88, 18, 14, 3, -2)}${poly("#efe6d2", ngon(78, 94, 7, 10))}`;
}

const live: Live = svg => { const gs = qa(svg, ".sz"); let shown = -1; return () => { const m = new Date().getMonth(), s = m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3; if (s === shown) return; shown = s; gs.forEach((g, i) => g.style.display = i === s ? "" : "none"); }; };

export default { key: "seasonshelf", label: "季節の飾り棚", at: "floor", w: 120, h: 110, cat: "季節", order: 773, note: "実績「四季の飾り」で届く。季節ごとに飾りが替わる", art, live } satisfies ItemDef;
