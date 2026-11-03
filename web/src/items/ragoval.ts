// 楕円の裂き織りラグ: 古布を編んだ紐を渦に縫ったもの。輪ごとに色を替え、輪の中は斜めの編み目で明暗を交互に
import { ring, ell, backLit } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const e = ell(140, 20, 137, 18.6);
  // 輪ごとの色 [明, 暗]（外から）
  const C = [["#86604a", "#735240"], ["#a0583a", "#88492f"], ["#d8c9a8", "#c3b38f"], ["#5d7186", "#4e6074"], ["#c79a4a", "#ac833c"], ["#8a9b84", "#748670"], ["#a0583a", "#88492f"], ["#d8c9a8", "#c3b38f"], ["#5d7186", "#4e6074"]];
  const R = [1, .89, .78, .67, .56, .45, .34, .22, .1];
  let s = "";
  R.forEach((r, j) => {
    const n = 32, [a, b] = C[j], next = R[j + 1] ?? 0;
    s += ring(e, n, r, next, (i, o) => { const lit = backLit((i + .5) / n); return o === (i % 2 === 0) ? (lit ? a : b) : (lit ? b : a); });
  });
  return s;
}

export default { key: "ragoval", label: "楕円の裂き織りラグ", at: "floor", w: 280, h: 0, flat: true, vh: 40, x: 0.45, cat: "敷きもの", order: 22, note: "古布を編んだ紐を渦に縫ったラグ", art } satisfies ItemDef;
