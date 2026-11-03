// マグカップ。湯気が立ち、時間がたつと冷める予定
import { cylinder, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#c46a4c");
  return `${poly(T.lo, [[28, 10], [36, 10], [38, 14], [38, 22], [34, 26], [28, 26], [28, 22], [33, 21], [34, 15], [28, 14]])}
    ${cylinder(T, 16, 6, 34, 13, 6)}${poly("#3a2418", [[5, 5], [27, 5], [26, 8], [6, 8]])}`;
}

export default { key: "mug", label: "マグカップ", at: "shelf", w: 40, h: 34, cat: "小物", order: 200, note: "湯気が立ち、時間がたつと冷める予定", art } satisfies ItemDef;
