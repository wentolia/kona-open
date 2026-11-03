// 真空管アンプ。★ 再生中は真空管がともり、音に合わせて明るさがゆらぐ
import { box, poly, tone, ngon } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#3a3734"), G = tone("#c9d2d4");
  let tubes = "";
  for (const x of [18, 34, 50]) tubes += `${poly(G.lo, [[x - 5, 28], [x - 5, 10], [x - 3, 5], [x + 3, 5], [x + 5, 10], [x + 5, 28]])}<g class="tube">${poly("#ffb35c", [[x - 2.4, 26], [x - 2.4, 14], [x + 2.4, 14], [x + 2.4, 26]])}</g>${poly("rgba(255,255,255,.35)", [[x - 4, 10], [x - 2.6, 7], [x - 2.6, 26], [x - 4, 26]])}`;
  return `${tubes}${poly("#2a2724", [[62, 14], [76, 14], [76, 28], [62, 28]])}${poly("#4a4643", [[64, 16], [74, 16], [74, 26], [64, 26]])}
    ${box(T, 2, 28, 76, 20, 6, -4)}${poly("#c8b48a", [[8, 34], [40, 34], [40, 42], [8, 42]])}${poly("#2a2724", ngon(56, 38, 4, 8))}${poly("#2a2724", ngon(68, 38, 4, 8))}`;
}

const live: Live = svg => {
  const tubes = qa(svg, ".tube");
  let glow = 0;
  return s => {
    glow += ((s.playing ? 1 : .08) - glow) * Math.min(1, s.dt * 1.5);
    tubes.forEach((t, i) => t.setAttribute("opacity", Math.max(0, glow * (.75 + .25 * s.loud + (s.calm ? 0 : .05 * Math.sin(s.t * 11 + i * 2)))).toFixed(2)));
  };
};

export default { key: "amp", label: "真空管アンプ", at: "shelf", w: 84, h: 48, cat: "音楽", order: 213, note: "★ 再生中は真空管がともり、音に合わせて明るさがゆらぐ", art, live } satisfies ItemDef;
