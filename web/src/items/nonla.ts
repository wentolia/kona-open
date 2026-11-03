// ノンラー。ベトナムで。葉で編んだ笠
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const H = tone("#e0c890");
  let r = "";
  for (let i = 1; i < 5; i++) r += poly(H.lo, [[28 - i * 6, 6 + i * 4.6], [28 + i * 6, 6 + i * 4.6], [28 + i * 6, 7 + i * 4.6], [28 - i * 6, 7 + i * 4.6]]);
  return `${poly(H.hi, [[28, 2], [2, 26], [28, 28]])}${poly(H.mid, [[28, 2], [28, 28], [54, 26]])}${r}${poly("#c44a5a", [[4, 26], [52, 26], [50, 28], [6, 28]])}`;
}

export default { key: "nonla", label: "ノンラー", at: "shelf", w: 56, h: 30, cat: "飾り", order: 680, region: "VN", note: "ベトナムで。葉で編んだ笠", art } satisfies ItemDef;
