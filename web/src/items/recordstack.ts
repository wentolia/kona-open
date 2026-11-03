// 積んだレコード。実績「五十枚」で届く。猫が上に乗る
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = ["#3d6b8a", "#a85f4a", "#5f8a5a", "#c9a24a", "#6b5a8a", "#2f2622", "#b46b52", "#4a6a6a"];
  return C.map((c, i) => { const T = tone(c), y = 56 - i * 7, dx = (i * 7 % 5) - 2; return poly(T.mid, [[4 + dx, y], [60 + dx, y], [60 + dx, y + 7], [4 + dx, y + 7]]) + poly(T.lo, [[60 + dx, y], [66 + dx, y - 3], [66 + dx, y + 4], [60 + dx, y + 7]]) + poly(T.hi, [[4 + dx, y], [10 + dx, y - 3], [66 + dx, y - 3], [60 + dx, y]]); }).join("")
    + `<i data-cat-plat="bed" data-sink="1" style="left:6%;width:88%;top:5%"></i>`;
}

export default { key: "recordstack", label: "積んだレコード", at: "floor", w: 70, h: 64, cat: "音楽", order: 712, note: "実績「五十枚」で届く。猫が上に乗る", art } satisfies ItemDef;
