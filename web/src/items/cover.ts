// ジャケットの額（試作）。★ いま聴いている（または選んだ）アルバムのジャケットを飾る予定。今は仮の絵
import { bevel, poly, INK } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(92, 92, 6, INK)}${poly("#ece6d8", [[6, 6], [86, 6], [86, 86], [6, 86]])}
    ${poly("#2b3e5c", [[14, 14], [78, 14], [78, 78], [14, 78]])}${poly("#d9a441", [[30, 30], [62, 30], [62, 62], [30, 62]])}${poly("#e9d9b0", [[38, 38], [54, 38], [54, 54], [38, 54]])}`;
}

export default { key: "cover", label: "ジャケットの額", at: "wall", w: 92, h: 92, cat: "音楽", order: 110, draft: true, note: "★ いま聴いている（または選んだ）アルバムのジャケットを飾る予定。今は仮の絵", art } satisfies ItemDef;
