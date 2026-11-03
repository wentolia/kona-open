// 額入りの楽譜。実績「一枚通して」で届く
import { poly, ngon, bevel, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(80, 66, 6, BRASS)}${poly("#ece3cf", [[6, 6], [74, 6], [74, 60], [6, 60]])}
    ${[0, 1, 2].map(r => Array.from({ length: 5 }, (_, i) => poly("#8a7d6a", [[11, 14 + r * 15 + i * 2], [69, 14 + r * 15 + i * 2], [69, 14.5 + r * 15 + i * 2], [11, 14.5 + r * 15 + i * 2]])).join("")).join("")}
    ${[[18, 17], [26, 15], [34, 19], [44, 16], [54, 20], [62, 18], [16, 32], [28, 34], [38, 30], [50, 33], [60, 31], [22, 47], [32, 49], [46, 45], [58, 48]].map(([x, y]) => poly("#2b2420", ngon(x, y, 1.6, 6)) + poly("#2b2420", [[x + 1.2, y], [x + 1.8, y], [x + 1.8, y - 7], [x + 1.2, y - 7]])).join("")}`;
}

export default { key: "score", label: "額入りの楽譜", at: "wall", w: 80, h: 66, cat: "飾り", order: 710, note: "実績「一枚通して」で届く", art } satisfies ItemDef;
