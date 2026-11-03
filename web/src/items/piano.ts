// アップライトピアノ。実績「五百時間」で届く。押すと和音
import { poly, tone, box, BRASS } from "./lowpoly";
import { onPress, chimeNotes, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#2f2622"), K = "#efe8da";
  return `${box(W, 6, 14, 182, 132, 8, -6)}
    ${poly(W.hi, [[14, 22], [180, 22], [180, 58], [14, 58]])}${poly(W.lo, [[20, 28], [174, 28], [174, 52], [20, 52]])}
    ${poly("#d8cdb4", [[70, 30], [124, 30], [126, 50], [68, 50]])}
    ${poly(W.mid, [[0, 64], [196, 64], [196, 72], [0, 72]])}
    ${poly(K, [[4, 72], [192, 72], [192, 84], [4, 84]])}
    ${Array.from({ length: 26 }, (_, i) => [1, 2, 4, 5, 6].includes(i % 7) ? poly("#1e1916", [[10 + i * 7, 72], [14 + i * 7, 72], [14 + i * 7, 79], [10 + i * 7, 79]]) : "").join("")}
    ${poly(W.deep, [[4, 84], [192, 84], [190, 90], [6, 90]])}
    ${poly(BRASS.mid, [[84, 136], [92, 136], [92, 140], [84, 140]])}${poly(BRASS.mid, [[100, 136], [108, 136], [108, 140], [100, 140]])}
    <i data-cat-plat="perch" data-sink="1" style="left:6%;width:88%;top:6%"></i>`;
}

const live: Live = svg => { onPress(svg, () => chimeNotes([262, 330, 392, 523], .06, .05)); };

export default { key: "piano", label: "アップライトピアノ", at: "floor", w: 200, h: 150, cat: "音楽", order: 705, note: "実績「五百時間」で届く。押すと和音", art, live } satisfies ItemDef;
