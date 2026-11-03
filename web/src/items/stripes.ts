// 長方形のラグ。ボーダー柄。猫が寝そべる
import { poly, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const at = (u: number, v: number): Pt => { const y = 2 + 36 * v, inset = 18 * (1 - v); return [inset + (300 - 2 * inset) * u, y]; };
  const quad = (u0: number, v0: number, u1: number, v1: number) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const cols = ["#d9cdb3", "#3f5b6e", "#d9cdb3", "#c58b4a", "#d9cdb3", "#3f5b6e", "#d9cdb3"];
  let s = poly("#cabd9f", quad(0, 0, 1, 1));
  cols.forEach((c, i) => { s += poly(c, quad(.03, .1 + i * .8 / 7, .97, .1 + (i + 1) * .8 / 7)); });
  return s;
}

export default { key: "stripes", label: "長方形のラグ", at: "floor", w: 300, h: 0, flat: true, vh: 40, cat: "敷きもの", order: 42, note: "ボーダー柄。猫が寝そべる", art } satisfies ItemDef;
