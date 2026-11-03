// 譜面台。楽譜を載せる
import { poly, tone, INK } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const P = tone("#efe8da");
  let lines = "";
  for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) { const y = 12 + r * 11 + k * 1.6; lines += poly("#9a9080", [[12, y], [50, y], [50, y + .5], [12, y + .5]]); }
  return `${poly(INK.lo, [[29, 54], [33, 54], [33, 140], [29, 140]])}${poly(INK.mid, [[31, 128], [10, 150], [14, 150], [31, 134]])}${poly(INK.mid, [[31, 128], [52, 150], [48, 150], [31, 134]])}
    ${poly(INK.hi, [[4, 4], [58, 4], [60, 56], [2, 56]])}${poly(P.hi, [[8, 6], [31, 6], [31, 52], [8, 52]])}${poly(P.mid, [[31, 6], [54, 6], [54, 52], [31, 52]])}${lines}
    ${poly(INK.deep, [[0, 54], [62, 54], [62, 58], [0, 58]])}`;
}

export default { key: "musicstand", label: "譜面台", at: "floor", w: 62, h: 150, cat: "音楽", order: 41, note: "楽譜を載せる", art } satisfies ItemDef;
