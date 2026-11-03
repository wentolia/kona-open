// 世界地図。実績「旅する耳」で届く
import { poly, tone, ngon, bevel, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const L = tone("#b99a6a");
  return `${bevel(130, 80, 4, WOOD)}${poly("#d8cfb6", [[4, 4], [126, 4], [126, 76], [4, 76]])}
    ${poly(L.mid, [[14, 14], [34, 10], [46, 18], [40, 30], [30, 34], [22, 30], [12, 22]])}${poly(L.lo, [[30, 36], [40, 38], [42, 52], [36, 66], [30, 56]])}
    ${poly(L.mid, [[58, 14], [70, 12], [72, 22], [62, 26], [56, 20]])}${poly(L.lo, [[60, 30], [74, 30], [76, 46], [68, 60], [60, 46]])}
    ${poly(L.mid, [[74, 12], [104, 10], [116, 18], [110, 32], [94, 36], [82, 28], [74, 22]])}${poly(L.lo, [[104, 50], [116, 50], [116, 58], [104, 58]])}
    ${[[24, 22], [36, 46], [64, 18], [68, 40], [96, 22], [110, 54]].map(([x, y]) => poly("#d9584a", ngon(x, y, 1.8, 6))).join("")}`;
}

export default { key: "worldmap", label: "世界地図", at: "wall", w: 130, h: 80, cat: "飾り", order: 722, note: "実績「旅する耳」で届く", art } satisfies ItemDef;
