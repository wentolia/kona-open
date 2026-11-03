// 長いソファ。実績「みんなで十時間」で届く。猫が並んで寝る
import { poly, tone, puff, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const S = tone("#5a6b62");
  return `${puff(S, [[14, 10], [266, 10], [270, 66], [10, 66]], [90, 22])}
    ${puff(S, [[0, 46], [26, 40], [30, 104], [2, 104]], [8, 50])}${puff(S, [[254, 40], [280, 46], [278, 104], [250, 104]], [262, 50])}
    ${[0, 1, 2].map(i => puff(tone("#6b7d73"), [[30 + i * 74, 62], [102 + i * 74, 62], [104 + i * 74, 88], [28 + i * 74, 88]], [60 + i * 74, 66])).join("")}
    ${poly(S.deep, [[24, 88], [256, 88], [254, 106], [26, 106]])}
    ${poly(WOOD.deep, [[30, 106], [36, 106], [36, 120], [30, 120]])}${poly(WOOD.deep, [[244, 106], [250, 106], [250, 120], [244, 120]])}
    <i data-cat-plat="bed" data-sink="4" style="left:11%;width:78%;top:52%"></i>
    <i data-cat-plat="perch" data-sink="2" style="left:6%;width:88%;top:9%"></i>`;
}

export default { key: "longsofa", label: "長いソファ", at: "floor", w: 280, h: 120, cat: "家具", order: 762, note: "実績「みんなで十時間」で届く。猫が並んで寝る", art } satisfies ItemDef;
