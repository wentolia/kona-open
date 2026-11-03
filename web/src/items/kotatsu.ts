// こたつ。実績「冬の音」で届く。猫が上で丸まる
import { poly, tone, ngon, puff } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const F = tone("#a85f4a"), W = tone("#8a6a48");
  return `${poly(W.hi, [[4, 8], [186, 8], [190, 14], [0, 14]])}${poly(W.lo, [[0, 14], [190, 14], [190, 18], [0, 18]])}
    ${puff(F, [[6, 18], [184, 18], [188, 80], [96, 84], [2, 80]], [60, 30])}
    ${[0, 1, 2].map(i => poly(tone("#d8c7a4").mid, [[30 + i * 60, 18], [40 + i * 60, 18], [42 + i * 60, 82], [32 + i * 60, 82]])).join("")}
    ${poly("#ec8a22", ngon(150, 3, 5, 8))}${poly("#ec8a22", ngon(162, 4, 5, 8))}
    <i data-cat-plat="bed" data-sink="2" style="left:6%;width:88%;top:8%"></i>`;
}

export default { key: "kotatsu", label: "こたつ", at: "floor", w: 190, h: 84, cat: "季節", order: 743, note: "実績「冬の音」で届く。猫が上で丸まる", art } satisfies ItemDef;
