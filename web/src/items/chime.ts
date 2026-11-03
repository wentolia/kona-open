// 風鈴（試作）。夏。風で揺れて小さく鳴る予定
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const G = tone("#8fc2c8");
  return `${poly("#8a7a68", [[14.5, 0], [15.5, 0], [15.5, 14], [14.5, 14]])}
    ${poly(G.hi, [[6, 30], [8, 18], [15, 14], [22, 18], [24, 30]])}${poly(G.lo, [[15, 14], [22, 18], [24, 30], [15, 30]])}
    ${poly("#d9584a", [[9, 22], [12, 20], [13, 24]])}${poly("#d9584a", [[18, 21], [21, 23], [18, 25]])}
    ${poly("#8a7a68", [[14.6, 30], [15.4, 30], [15.4, 48], [14.6, 48]])}
    ${poly("#efe6d2", [[9, 48], [21, 48], [21, 82], [9, 82]])}${poly("#d8ccb4", [[15, 48], [21, 48], [21, 82], [15, 82]])}`;
}

export default { key: "chime", label: "風鈴", at: "wall", w: 30, h: 84, cat: "季節", order: 114, draft: true, note: "夏。風で揺れて小さく鳴る予定", art } satisfies ItemDef;
