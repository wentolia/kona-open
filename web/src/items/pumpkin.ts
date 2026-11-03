// かぼちゃ。秋。落ち葉と
import { poly, tone, leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#d07a32");
  let s = "";
  const lobes = [[6, 22], [16, 26], [30, 28], [44, 26], [54, 22]];
  lobes.forEach(([cx, rx], i) => { const c = [T.hi, T.mid, T.mid, T.lo, T.deep][i]; s += poly(c, [[cx + (i - 2) * 2, 14], [cx + rx * .35 + (i - 2) * 2, 16], [cx + rx * .4, 30], [cx + rx * .3 + (i - 2) * 1, 44], [cx - (i - 2) * 0, 46], [cx - rx * .3, 44], [cx - rx * .4, 30], [cx - rx * .35, 16]]); });
  return s + `${poly("#5a4a2a", [[28, 6], [33, 4], [34, 14], [29, 15]])}${leaf("#b0582e", "#8a4426", 40, 44, 16, 5, 70)}${leaf("#c9902e", "#a0702a", 12, 45, 14, 4, -80)}`;
}

export default { key: "pumpkin", label: "かぼちゃ", at: "shelf", w: 60, h: 46, cat: "季節", order: 301, note: "秋。落ち葉と", art } satisfies ItemDef;
