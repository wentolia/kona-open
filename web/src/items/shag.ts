// 丸いシャギーラグ: 毛足の長い生成りの円。縁はぎざぎざ、毛の房を散らす
import { poly, type Pt } from "./lowpoly";
import { ell, jit } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const e = ell(110, 20, 106, 18), N = 40;
  const C = ["#e6dccb", "#dcd0bb", "#d0c4ad", "#ebe2d1"];
  let s = "";
  // 縁: 毛先が出たり引っ込んだり
  const edge = (k: number): Pt => e(k / N, k % 2 ? .95 : 1.01);
  for (let k = 0; k < N; k++) {
    const t = k / N, back = Math.sin(t * Math.PI * 2) < 0;
    s += poly(back ? C[1] : C[2], [edge(k), edge(k + 1), e((k + .5) / N, .78)]);
    s += poly(back ? C[0] : C[1], [e(k / N, .8), e((k + 1) / N, .8), e((k + .5) / N, 0)]);
  }
  // 毛の房（小さな三角）
  for (let i = 0; i < 90; i++) {
    const t = jit(i), r = Math.sqrt(jit(i + 99)) * .86, [x, y] = e(t, r), c = C[Math.floor(jit(i + 7) * 4)];
    const l = 1.4 + jit(i + 3) * 1.4;
    s += poly(c, [[x - l, y + .6], [x + l * .2, y - .9], [x + l, y + .4]]);
  }
  return s;
}

export default { key: "shag", label: "丸いシャギーラグ", at: "floor", w: 220, h: 0, flat: true, vh: 40, x: 0.6, cat: "敷きもの", order: 22.5, note: "毛足の長い生成り。猫がいちばん好きな手ざわり", art } satisfies ItemDef;
