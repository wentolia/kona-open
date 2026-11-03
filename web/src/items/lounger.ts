// 波形の爪とぎ。段ボールを重ねた寝椅子。猫がといだり、くぼみで寝そべったりする
import { poly, tone, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const K = tone("#b88d5a"), N = 24;
  const top = (x: number) => 7 + 15 * Math.sin(Math.PI * (x - 4) / 124) ** 1.4;
  const xs = Array.from({ length: N + 1 }, (_, i) => 4 + i * 124 / N), curve = (dy: number): Pt[] => xs.map(x => [x, top(x) + dy]);
  let s = poly(K.mid, [...curve(0), [128, 44], [4, 44]]) + poly(K.lo, [[96, 44], ...curve(0).filter(([x]) => x >= 96), [128, 44]]);
  for (let j = 1; j < 6; j++) s += poly(K.lo, [...curve(j * 5.4), ...curve(j * 5.4 + 1.1).reverse()].map(([x, y]) => [x, Math.min(43, y)] as Pt));
  s += poly(K.hi, [...curve(-4).map(([x, y]) => [x + 2, y] as Pt), ...curve(0).reverse()]);
  for (let i = 3; i < N - 2; i += 2) { const x = xs[i], y = top(x); s += poly(K.deep, [[x - 1.6, y - 2.6], [x + 1.6, y - 3], [x + 1.4, y - 2.4], [x - 1.4, y - 2]]); }
  return `${s}${poly(K.deep, [[4, 43], [128, 43], [128, 44], [4, 44]])}
    <i data-cat-plat="pad" data-sink="1" style="left:30%;width:40%;top:43%"></i>`;
}

export default { key: "lounger", label: "波形の爪とぎ", at: "floor", w: 132, h: 44, x: .5, cat: "猫", order: 46, note: "段ボールの寝椅子。猫がといだり、くぼみで寝そべったりする", art } satisfies ItemDef;
