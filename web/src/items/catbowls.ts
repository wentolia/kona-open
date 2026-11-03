// 猫の食器（三つ）。実績「三匹」で届く
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const bowl = (x: number, c: string) => { const T = tone(c); return poly(T.mid, [[x, 12], [x + 26, 12], [x + 22, 24], [x + 4, 24]]) + poly(T.hi, [[x, 12], [x + 26, 12], [x + 24, 15], [x + 2, 15]]) + poly("#8a5a3a", [[x + 4, 11], [x + 22, 11], [x + 20, 13], [x + 6, 13]]) + poly("#efe6d2", ngon(x + 13, 19, 2.2, 6)); };
  return `${poly("#d8cdb4", [[0, 20], [90, 20], [88, 26], [2, 26]])}${bowl(2, "#3d6b8a")}${bowl(32, "#d9584a")}${bowl(62, "#e8c46a")}`;
}

export default { key: "catbowls", label: "三つ並びの猫の食器", at: "floor", w: 90, h: 26, cat: "猫", order: 754, note: "実績「三匹」で届く", art } satisfies ItemDef;
