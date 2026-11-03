// 真珠貝。三重で。開いた貝に一粒
import { poly, tone } from "./lowpoly";
import { fruit } from "./_land";
import type { ItemDef } from "./types";

function art() {
  const S = tone("#c8bcb0");
  let ribs = "";
  for (let i = 0; i < 7; i++) { const a0 = Math.PI * (1.05 + i * .9 / 7), a1 = Math.PI * (1.05 + (i + 1) * .9 / 7);
    ribs += poly(i % 2 ? S.hi : S.mid, [[23, 24], [23 + Math.cos(a0) * 20, 24 + Math.sin(a0) * 18], [23 + Math.cos(a1) * 20, 24 + Math.sin(a1) * 18]]); }
  return `${ribs}${poly(S.lo, [[3, 24], [43, 24], [36, 31], [10, 31]])}${poly("#d8ccd8", [[7, 24], [39, 24], [34, 28], [12, 28]])}
    ${fruit("#f4f0ec", 23, 23, 4.6, 4.6, 8)}${poly("rgba(255,255,255,.8)", [[21, 20.6], [22.6, 20], [22.6, 21.4]])}`;
}

export default { key: "shinju", label: "真珠貝", at: "shelf", w: 46, h: 32, cat: "飾り", order: 629, region: "JP-24", note: "三重で。開いた貝に一粒", art } satisfies ItemDef;
