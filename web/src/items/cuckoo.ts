// 鳩時計。実績「十時間」で届く。振り子がゆれる
import { poly, tone, box, ngon, leaf, BRASS, SAGE } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#6b4a30"), R = tone("#4e3322");
  return `<g class="pend">${poly(BRASS.mid, [[26, 50], [28, 50], [28, 84], [26, 84]])}${poly(BRASS.hi, ngon(27, 86, 6, 8))}</g>
    ${poly(BRASS.lo, [[16, 58], [18, 58], [18, 90], [16, 90]])}${poly(BRASS.deep, [[14, 90], [20, 90], [19, 96], [15, 96]])}
    ${poly(BRASS.lo, [[36, 58], [38, 58], [38, 80], [36, 80]])}${poly(BRASS.deep, [[34, 80], [40, 80], [39, 86], [35, 86]])}
    ${poly(R.hi, [[0, 20], [27, 0], [54, 20], [48, 22], [27, 6], [6, 22]])}
    ${box(W, 7, 18, 40, 36, 0, 0)}
    ${poly("#efe6d2", ngon(27, 36, 11, 12))}${poly("#2b2420", [[26.3, 36], [27.7, 36], [27.7, 28], [26.3, 28]])}${poly("#2b2420", [[27, 35.3], [33, 35.3], [33, 36.7], [27, 36.7]])}
    ${poly(R.deep, [[22, 18], [32, 18], [32, 24], [22, 24]])}${poly("#e8dcc0", [[24, 20], [29, 19], [30, 22], [25, 23]])}
    ${leaf(SAGE.hi, SAGE.lo, 9, 52, 8, 3, 220)}${leaf(SAGE.hi, SAGE.lo, 45, 52, 8, 3, 140)}`;
}

const live: Live = svg => { const p = q(svg, ".pend")!; return s => { const a = Math.sin(s.t * 2.4) * (s.calm ? 5.0 : 10); p.setAttribute("transform", `rotate(${a.toFixed(1)} 27 50)`); }; };

export default { key: "cuckoo", label: "鳩時計", at: "wall", w: 54, h: 96, cat: "飾り", order: 701, note: "実績「十時間」で届く。振り子がゆれる", art, live } satisfies ItemDef;
