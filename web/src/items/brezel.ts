// プレッツェル。ドイツで。塩の粒
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const B = tone("#8a4a22");
  return `<path d="M10 30 C 2 18, 10 6, 23 16 C 36 6, 44 18, 36 30 C 30 36, 16 36, 10 30 M 14 32 L 32 18 M 32 32 L 14 18" style="fill:none;stroke:${B.mid};stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/>
    <path d="M10 28 C 4 18, 10 9, 22 16" style="fill:none;stroke:${B.hi};stroke-width:2;stroke-linecap:round"/>
    ${[[12, 14], [30, 12], [8, 24], [38, 24], [23, 26]].map(([x, y]) => poly("#f4f0e8", ngon(x, y, .9, 4))).join("")}`;
}

export default { key: "brezel", label: "プレッツェル", at: "shelf", w: 46, h: 40, cat: "食べ物", order: 671, region: "DE", note: "ドイツで。塩の粒", art } satisfies ItemDef;
