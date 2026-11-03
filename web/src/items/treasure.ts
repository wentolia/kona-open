// 宝箱。実績「五十の包み」で届く。押すと開く
import { poly, tone, box, ngon, BRASS } from "./lowpoly";
import { onPress, q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5232");
  return `<g class="lid">${poly(W.hi, [[4, 26], [10, 8], [80, 8], [86, 26]])}${poly(BRASS.mid, [[20, 8], [26, 8], [26, 26], [20, 26]])}${poly(BRASS.mid, [[64, 8], [70, 8], [70, 26], [64, 26]])}</g>
    <g class="gold" style="display:none">${poly("#e8c46a", [[10, 26], [80, 26], [72, 18], [44, 14], [18, 18]])}${poly("#f4dc8a", ngon(40, 20, 3, 6))}${poly("#d9584a", ngon(56, 21, 3, 6))}</g>
    ${box(W, 4, 26, 76, 42, 6, -4)}${poly(BRASS.mid, [[20, 26], [26, 26], [26, 68], [20, 68]])}${poly(BRASS.mid, [[58, 26], [64, 26], [64, 68], [58, 68]])}
    ${poly(BRASS.hi, [[38, 30], [46, 30], [46, 40], [38, 40]])}${poly(BRASS.deep, ngon(42, 35, 1.5, 6))}`;
}

const live: Live = svg => { const lid = q(svg, ".lid")!, gold = q(svg, ".gold")!; let open = false, k = 0; onPress(svg, () => { open = !open; }); return s => { const w = open ? 1 : 0; if (k === w) return; k += (w - k) * Math.min(1, s.dt * 8); if (Math.abs(k - w) < .01) k = w; lid.setAttribute("transform", `translate(0 ${(-14 * k).toFixed(1)}) scale(1 ${(1 - .6 * k).toFixed(3)})`); gold.style.display = k > .3 ? "" : "none"; }; };

export default { key: "treasure", label: "宝箱", at: "floor", w: 90, h: 70, cat: "小物", order: 774, note: "実績「五十の包み」で届く。押すと開く", art, live } satisfies ItemDef;
