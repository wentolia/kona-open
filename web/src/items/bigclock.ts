// 大きな壁時計。実績「壁を飾る」で届く。いまの時刻を指す
import { poly, ngon, puff, WOOD, BRASS } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${puff(WOOD, ngon(55, 55, 54, 20), [40, 40])}${poly("#ece3cf", ngon(55, 55, 46, 20))}
    ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, x = 55 + Math.sin(a) * 40, y = 55 - Math.cos(a) * 40; return poly("#3a2f2a", ngon(x, y, i % 3 ? 1.4 : 2.6, 6)); }).join("")}
    <g class="hh">${poly("#2b2420", [[53.5, 56], [56.5, 56], [55.8, 30], [54.2, 30]])}</g><g class="mm">${poly("#2b2420", [[54, 58], [56, 58], [55.5, 18], [54.5, 18]])}</g>
    ${poly(BRASS.mid, ngon(55, 55, 3, 8))}`;
}

const live: Live = svg => { const h = q(svg, ".hh")!, m = q(svg, ".mm")!; let shown = -1; return () => { const n = new Date(), k = n.getHours() * 60 + n.getMinutes(); if (k === shown) return; shown = k; h.setAttribute("transform", `rotate(${(k % 720) / 2} 55 55)`); m.setAttribute("transform", `rotate(${n.getMinutes() * 6} 55 55)`); }; };

export default { key: "bigclock", label: "大きな壁時計", at: "wall", w: 110, h: 110, cat: "飾り", order: 771, note: "実績「壁を飾る」で届く。いまの時刻を指す", art, live } satisfies ItemDef;
