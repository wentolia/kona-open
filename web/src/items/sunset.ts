// 夕焼けの額。実績「夕暮れ」で届く
import { poly, slab, ngon, bevel, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(96, 70, 5, WOOD)}${slab("#e8a06a", "#e08a5a", [5, 5, 91, 26])}${slab("#c96a52", "#b45a4a", [5, 26, 91, 42])}
    ${poly("#f4d08a", ngon(48, 42, 10, 12).filter(([, y]) => y <= 42))}
    ${poly("#5a3a3a", [[5, 42], [22, 34], [38, 40], [56, 32], [74, 40], [91, 36], [91, 65], [5, 65]])}${poly("#3d2a2c", [[5, 52], [30, 46], [60, 50], [91, 46], [91, 65], [5, 65]])}
    ${poly("#2a1d1e", [[66, 30], [68, 30], [68, 46], [66, 46]])}${poly("#2a1d1e", ngon(67, 28, 5, 6))}`;
}

export default { key: "sunset", label: "夕焼けの額", at: "wall", w: 96, h: 70, cat: "飾り", order: 734, note: "実績「夕暮れ」で届く", art } satisfies ItemDef;
