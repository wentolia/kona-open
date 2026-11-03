// ロッキングチェア。実績「百時間」で届く。押すとゆれる
import { poly, tone } from "./lowpoly";
import { onPress, q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5232");
  return `<g class="rock">${poly(W.deep, [[6, 118], [60, 128], [114, 118], [114, 122], [60, 132], [6, 122]])}
    ${poly(W.lo, [[22, 74], [26, 74], [24, 122], [20, 122]])}${poly(W.lo, [[92, 74], [96, 74], [98, 122], [94, 122]])}
    ${poly(W.mid, [[18, 6], [26, 4], [30, 74], [22, 76]])}
    ${[0, 1, 2, 3].map(i => poly(i % 2 ? W.hi : W.mid, [[28 + i * 2, 12 + i * 15], [70, 14 + i * 15], [70, 18 + i * 15], [28 + i * 2, 16 + i * 15]])).join("")}
    ${poly(W.hi, [[18, 70], [100, 70], [104, 78], [16, 80]])}${poly(W.lo, [[16, 80], [104, 78], [102, 84], [18, 86]])}
    ${poly(tone("#b46b52").mid, [[28, 62], [96, 62], [100, 71], [24, 71]])}
    ${poly(W.mid, [[90, 46], [112, 44], [112, 49], [92, 51]])}${poly(W.lo, [[104, 49], [108, 49], [104, 72], [100, 72]])}
    <i data-cat-plat="bed" data-sink="3" style="left:20%;width:62%;top:50%"></i></g>`;
}

const live: Live = svg => { const g = q(svg, ".rock")!; let v = 0, a = 0; onPress(svg, () => { v += 18; }); return s => { v += (-a * 20 - v * 1.2) * s.dt; a += v * s.dt; if (Math.abs(a) < .01 && Math.abs(v) < .01) return; g.setAttribute("transform", `rotate(${a.toFixed(2)} 60 124)`); }; };

export default { key: "rocking", label: "ロッキングチェア", at: "floor", w: 120, h: 130, cat: "家具", order: 703, note: "実績「百時間」で届く。押すとゆれる", art, live } satisfies ItemDef;
