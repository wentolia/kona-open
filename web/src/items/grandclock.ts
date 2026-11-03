// 柱時計。実績「三百時間」で届く。振り子がゆれる
import { poly, tone, box, ngon, BRASS } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#5e3d26");
  return `${box(W, 4, 20, 52, 186, 6, -4)}${poly(W.hi, [[0, 6], [32, 0], [62, 6], [62, 22], [0, 22]])}
    ${poly("#efe6d2", ngon(30, 46, 17, 14))}${poly(BRASS.lo, ngon(30, 46, 17, 14).map(([x, y]) => [30 + (x - 30) * 1.1, 46 + (y - 46) * 1.1] as [number, number]).slice(0, 8))}
    ${poly("#efe6d2", ngon(30, 46, 16, 14))}${poly("#2b2420", [[29.3, 46], [30.7, 46], [30.7, 34], [29.3, 34]])}${poly("#2b2420", [[30, 45.3], [39, 45.3], [39, 46.7], [30, 46.7]])}
    ${poly("#2a1d14", [[14, 72], [46, 72], [46, 182], [14, 182]])}
    <g class="pend">${poly(BRASS.mid, [[29, 74], [31, 74], [31, 156], [29, 156]])}${poly(BRASS.hi, ngon(30, 160, 9, 10))}</g>
    ${poly("rgba(255,255,255,.07)", [[14, 72], [26, 72], [14, 110]])}${poly(W.deep, [[0, 200], [60, 200], [60, 210], [0, 210]])}`;
}

const live: Live = svg => { const p = q(svg, ".pend")!; return s => { const a = Math.sin(s.t * 1.6) * (s.calm ? 3.0 : 6); p.setAttribute("transform", `rotate(${a.toFixed(1)} 30 74)`); }; };

export default { key: "grandclock", label: "柱時計", at: "floor", w: 64, h: 210, cat: "家具", order: 704, note: "実績「三百時間」で届く。振り子がゆれる", art, live } satisfies ItemDef;
