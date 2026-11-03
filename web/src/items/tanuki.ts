// 信楽のたぬき。滋賀で。笠と徳利を持って
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const T = tone("#7a5a3a"), L = tone("#d8c8a8");
  return `${puff(T, [[6, 52], [4, 36], [8, 24], [30, 24], [34, 36], [32, 52]], [14, 32])}${puff(L, oval(19, 40, 9, 9, 10), [16, 36])}
    ${puff(T, oval(19, 17, 10, 9, 10), [15, 13])}${poly(L.mid, oval(19, 20, 6, 4, 8))}${poly("#2a1c14", oval(19, 18.4, 1.6, 1.2, 6))}
    ${poly("#2a1c14", [[13, 14], [16, 14], [16, 15.4], [13, 15.4]])}${poly("#2a1c14", [[22, 14], [25, 14], [25, 15.4], [22, 15.4]])}
    ${poly(tone("#b8925a").mid, [[6, 10], [19, 2], [32, 10], [19, 12]])}${poly(tone("#b8925a").lo, [[19, 2], [32, 10], [19, 12]])}
    ${puff(tone("#e0d4b8"), [[30, 34], [36, 32], [38, 40], [36, 48], [30, 48]], [33, 38])}`;
}

export default { key: "tanuki", label: "信楽のたぬき", at: "shelf", w: 38, h: 54, cat: "飾り", order: 630, region: "JP-25", note: "滋賀で。笠と徳利を持って", art } satisfies ItemDef;
