// 木彫りの鳥（試作）。窓辺に来る鳥と同じ種類を彫る予定
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#b08860");
  return `${poly(T.mid, [[4, 18], [14, 10], [30, 10], [40, 16], [34, 24], [14, 24]])}${poly(T.hi, [[14, 10], [30, 10], [26, 16], [12, 16]])}${poly(T.lo, [[34, 24], [40, 16], [46, 20], [40, 24]])}
    ${poly(T.hi, [[4, 14], [10, 6], [16, 8], [14, 14]])}${poly("#3a2a20", [[2, 12], [4, 11], [4, 13]])}${poly("#2c2a28", [[9, 9.4], [10.4, 9.4], [10.4, 10.6], [9, 10.6]])}
    ${poly("#6a4a30", [[12, 24], [36, 24], [36, 32], [12, 32]])}${poly("#8a6544", [[12, 24], [36, 24], [35, 26], [13, 26]])}`;
}

export default { key: "woodbird", label: "木彫りの鳥", at: "shelf", w: 48, h: 32, cat: "小物", order: 212, draft: true, note: "窓辺に来る鳥と同じ種類を彫る予定", art } satisfies ItemDef;
