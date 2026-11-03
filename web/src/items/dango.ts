// お団子。三色の串を皿に
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const ball = (c: string, cx: number, cy: number) => puff(tone(c), ngon(cx, cy, 7, 8, .3), [cx - 2, cy - 2]);
  return `${poly("#c8a878", [[4, 36], [50, 14], [51, 16], [5, 38]])}
    ${ball("#e8a0a8", 18, 27)}${ball("#f3ead8", 29, 22)}${ball("#8aac6a", 40, 17)}
    ${poly("#e8e4dc", [[0, 36], [54, 36], [50, 40], [4, 40]])}${poly("#2c4a6e", [[6, 37], [48, 37], [47, 38], [7, 38]])}`;
}

export default { key: "dango", label: "お団子", at: "shelf", w: 54, h: 40, cat: "食べ物", order: 403, draft: true, note: "三色の串を皿に", art } satisfies ItemDef;
