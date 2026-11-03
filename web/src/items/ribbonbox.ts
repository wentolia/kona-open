// リボンの箱。実績「贈る」で届く
import { poly, tone, box, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#3d6b8a"), R = tone("#e8c46a");
  return `${box(B, 4, 16, 44, 34, 6, -4)}${poly(R.mid, [[22, 12], [30, 12], [30, 50], [22, 50]])}${poly(R.lo, [[48, 26], [54, 22], [54, 28], [48, 32]])}
    ${poly(R.hi, [[26, 12], [14, 2], [10, 8], [18, 14]])}${poly(R.mid, [[26, 12], [38, 2], [42, 8], [34, 14]])}${poly(R.deep, ngon(26, 12, 3, 6))}`;
}

export default { key: "ribbonbox", label: "リボンの箱", at: "floor", w: 56, h: 52, cat: "小物", order: 764, note: "実績「贈る」で届く", art } satisfies ItemDef;
