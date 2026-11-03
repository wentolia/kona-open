// スコーンと紅茶。イギリスで。ジャムとクリーム
import { poly, puff, tone, cylinder } from "./lowpoly";
import { oval, plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const S = tone("#d8a868");
  return `${plate("#ece8e0", 18, 34, 17)}${puff(S, [[6, 32], [8, 20], [16, 16], [26, 18], [30, 24], [28, 32]], [12, 20])}
    ${poly("#f4ecd8", [[10, 19], [24, 18], [22, 22], [12, 22]])}${poly("#b82a3a", [[13, 17], [21, 16], [20, 19], [14, 19]])}
    ${cylinder(tone("#e8e4dc"), 46, 22, 38, 8, 6, false)}${poly("#7a3a1a", oval(46, 22, 7, 1.6, 10, 0))}
    <polyline points="54,26 57,28 54,34" style="fill:none;stroke:#d8d4cc;stroke-width:1.6"/>`;
}

export default { key: "scone", label: "スコーンと紅茶", at: "shelf", w: 56, h: 40, cat: "食べ物", order: 667, region: "GB", note: "イギリスで。ジャムとクリーム", art } satisfies ItemDef;
