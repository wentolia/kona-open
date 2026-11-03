// 茶筒と湯呑み。静岡で。湯呑みから湯気
import { poly, tone, cylinder } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const Cu = tone("#a86a44"), Y = tone("#7c8a76"), Ti = "#7a9a3e";
  return `${cylinder(Cu, 14, 8, 48, 10, 6)}${poly(Cu.deep, [[4, 16], [24, 16], [24, 17], [4, 17]])}
    ${poly("#e8e0cc", [[7, 24], [21, 24], [21, 38], [7, 38]])}${poly("#4f7a3e", [[14, 26], [18, 30], [14, 36], [10, 30]])}${poly("#3f6a35", [[14, 26], [14, 36], [10, 30]])}
    ${cylinder(Y, 40, 30, 48, 10, 6, false)}${poly(Y.deep, [[30, 46], [50, 46], [49, 48], [31, 48]])}
    ${poly(Y.hi, [[30, 30], [50, 30], [48, 32], [32, 32]])}${poly(Ti, [[32, 31], [48, 31], [47, 32.4], [33, 32.4]])}`;
}

const live: Live = svg => { const steam = wisps(svg, 40, 29, 2); return s => steam(s, .6); };

export default { key: "chazutsu", label: "茶筒と湯呑み", at: "shelf", w: 52, h: 48, cat: "小物", order: 607, region: "JP-22", note: "静岡で。湯呑みから湯気", art, live } satisfies ItemDef;
