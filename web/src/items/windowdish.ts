// 窓辺の小皿。実績「窓辺の客」で届く
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const D = tone("#9ab0c0");
  return `${poly(D.mid, [[2, 8], [38, 8], [32, 16], [8, 16]])}${poly(D.hi, [[2, 8], [38, 8], [36, 10], [4, 10]])}${poly(D.lo, [[12, 16], [28, 16], [28, 18], [12, 18]])}
    ${poly("#c98a6a", [[10, 7], [18, 4], [24, 6], [16, 8]])}${poly("#e0a88a", [[20, 6], [28, 3], [32, 6], [24, 8]])}`;
}

export default { key: "windowdish", label: "窓辺の小皿", at: "shelf", w: 40, h: 18, cat: "猫", order: 756, note: "実績「窓辺の客」で届く", art } satisfies ItemDef;
