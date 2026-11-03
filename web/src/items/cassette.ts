// カセットテープ。★ 再生中はリールが回る
import { ngon, poly, slab, tone } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

const reel = (cx: number) => `<g class="reel" data-cx="${cx}">${poly("#e9e2d1", ngon(cx, 22, 3.6, 6))}${[0, 1, 2].map(i => {
  const a = i * Math.PI * 2 / 3;
  return poly("#2a2724", [[cx + Math.cos(a) * 1.2, 22 + Math.sin(a) * 1.2], [cx + Math.cos(a + .35) * 3.4, 22 + Math.sin(a + .35) * 3.4], [cx + Math.cos(a - .35) * 3.4, 22 + Math.sin(a - .35) * 3.4]]);
}).join("")}</g>`;

function art() {
  const T = tone("#e3dccb");
  return `${slab(T.hi, T.lo, [2, 2, 54, 36])}${poly("#c8553f", [[6, 6], [50, 6], [50, 14], [6, 14]])}
    ${poly("#2a2724", [[12, 17], [44, 17], [44, 27], [12, 27]])}${reel(19)}${reel(37)}
    ${poly(T.deep, [[14, 30], [42, 30], [44, 36], [12, 36]])}`;
}

const live: Live = svg => {
  const reels = qa(svg, ".reel");
  let a = 0;
  return s => {
    if (!s.playing) return;
    a = (a + s.dt * (s.calm ? 40 : 120)) % 360;
    for (const r of reels) r.setAttribute("transform", `rotate(${a.toFixed(1)} ${r.dataset.cx} 22)`);
  };
};

export default { key: "cassette", label: "カセットテープ", at: "shelf", w: 56, h: 36, cat: "音楽", order: 202, note: "★ 再生中はリールが回る", art, live } satisfies ItemDef;
