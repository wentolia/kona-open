// 小さな無地のマット（くすんだ薔薇色）: 角を落とした小さな四角
import { poly, tone } from "./lowpoly";
import { trap } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const p = tone("#a87264"), at = trap(0, 150, 6, 36, 10), c = .07, cv = .2;
  // 角を落とした外形
  const out = [at(c, 0), at(1 - c, 0), at(1, cv), at(1, 1 - cv), at(1 - c, 1), at(c, 1), at(0, 1 - cv), at(0, cv)];
  let s = poly(p.lo, out);
  const m = .04, mv = .12, inn = [at(c + m, mv), at(1 - c - m, mv), at(1 - m, cv + mv), at(1 - m, 1 - cv - mv), at(1 - c - m, 1 - mv), at(c + m, 1 - mv), at(m, 1 - cv - mv), at(m, cv + mv)];
  const mid = at(.5, .5);
  inn.forEach((a, i) => { const b = inn[(i + 1) % inn.length]; s += poly(i < 2 || i === 7 ? p.hi : i < 5 ? p.mid : p.mid, [a, b, mid]); });
  return s;
}

export default { key: "plainrose", label: "小さな無地のマット", at: "floor", w: 150, h: 0, flat: true, vh: 40, x: 0.7, cat: "敷きもの", order: 26, note: "くすんだ薔薇色。椅子の足もとに", art } satisfies ItemDef;
