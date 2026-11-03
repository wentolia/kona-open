// ナザール。トルコで。青い目玉のお守りを小さな台に
import { poly, ngon, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const ring = (r: number, c: string) => poly(c, ngon(18, 20, r, 14, .1));
  return `${poly(BRASS.mid, [[16, 34], [20, 34], [21, 44], [15, 44]])}${poly(BRASS.hi, [[8, 44], [28, 44], [26, 48], [10, 48]])}
    ${ring(16, "#1e3f8a")}${poly("#2e58b0", ngon(18, 20, 16, 14, .1).slice(7, 14).concat([[18, 20]]))}
    ${ring(11, "#eef2f4")}${ring(7.4, "#5aa6d8")}${ring(3.8, "#151a22")}
    ${poly("rgba(255,255,255,.55)", [[8, 12], [12, 8], [13, 10], [9, 14]])}`;
}

export default { key: "nazar", label: "ナザール", at: "shelf", w: 36, h: 48, cat: "飾り", order: 652, region: "TR", note: "トルコで。青い目玉のお守りを小さな台に", art } satisfies ItemDef;
