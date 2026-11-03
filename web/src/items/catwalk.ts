// キャットウォーク。壁に段を並べ、猫が段から段へ登って移る
import { poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#9a7650");
  const step = (x: number, y: number) => slab(T.hi, T.mid, [x, y, x + 34, y + 6]) + poly(T.deep, [[x, y + 6], [x + 34, y + 6], [x + 32, y + 9], [x + 2, y + 9]]) + poly(T.lo, [[x + 14, y + 9], [x + 20, y + 9], [x + 17, y + 14]]);
  return `${step(0, 38)}${step(43, 20)}${step(86, 2)}
    <i data-cat-plat="perch" data-sink="1" style="left:0%;width:28%;top:73%"></i><i data-cat-plat="perch" data-sink="1" style="left:36%;width:28%;top:38%"></i><i data-cat-plat="perch" data-sink="1" style="left:72%;width:28%;top:4%"></i>`;
}

export default { key: "catwalk", label: "キャットウォーク", at: "wall", w: 120, h: 52, cat: "猫", order: 113, note: "壁に段を並べ、猫が段から段へ登って移る", art } satisfies ItemDef;
