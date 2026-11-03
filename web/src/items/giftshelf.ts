// 飾り棚。実績「もらう」で届く。猫が上に乗る
import { poly, tone, box, ngon, puff, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#6b4a30");
  return `${box(W, 4, 8, 104, 140, 8, -5)}${poly("rgba(220,235,240,.18)", [[10, 14], [102, 14], [102, 140], [10, 140]])}
    ${[0, 1, 2].map(r => poly(W.hi, [[10, 52 + r * 38], [102, 52 + r * 38], [102, 55 + r * 38], [10, 55 + r * 38]])).join("")}
    ${puff(tone("#d9584a"), ngon(26, 44, 7, 8), [24, 42])}${box(tone("#3d6b8a"), 50, 36, 14, 16, 3, -2)}${poly("#e8c46a", [[80, 30], [88, 30], [90, 52], [78, 52]])}
    ${poly("#efe6d2", ngon(30, 84, 8, 10))}${box(tone("#5f8a5a"), 66, 76, 20, 14, 3, -2)}
    ${poly(BRASS.mid, [[24, 112], [30, 112], [30, 128], [24, 128]])}${poly("#e58fa4", ngon(70, 122, 7, 8))}
    ${poly("rgba(255,255,255,.08)", [[10, 14], [40, 14], [10, 80]])}${poly(W.lo, [[55, 14], [57, 14], [57, 140], [55, 140]])}
    <i data-cat-plat="perch" data-sink="1" style="left:4%;width:88%;top:2%"></i>`;
}

export default { key: "giftshelf", label: "飾り棚", at: "floor", w: 120, h: 150, cat: "家具", order: 765, note: "実績「もらう」で届く。猫が上に乗る", art } satisfies ItemDef;
