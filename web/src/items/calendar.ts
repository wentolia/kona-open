// 日めくり（試作）。今日の日付を出す予定
import { poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#efe8da");
  return `${poly("#6b5a48", [[24, 0], [26, 0], [26, 8], [24, 8]])}${slab(T.hi, T.mid, [4, 8, 46, 70])}${poly("#b04a3b", [[4, 8], [46, 8], [46, 22], [4, 22]])}
    ${poly("#2c2a28", [[16, 32], [34, 32], [34, 35], [16, 35]])}${poly("#2c2a28", [[16, 40], [22, 40], [22, 58], [16, 58]])}${poly("#2c2a28", [[28, 40], [34, 40], [34, 58], [28, 58]])}
    ${poly(T.lo, [[4, 70], [46, 70], [44, 72], [6, 72]])}`;
}

export default { key: "calendar", label: "日めくり", at: "wall", w: 50, h: 72, cat: "小物", order: 112, draft: true, note: "今日の日付を出す予定", art } satisfies ItemDef;
