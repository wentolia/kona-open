// タピオカミルクティー。台湾で。太いストローで
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#c8a07a");
  const pearls = [[8, 40], [13, 41], [18, 40], [23, 41], [10, 36], [16, 36.6], [21, 36]].map(([x, y]) => poly("#2a1c14", ngon(x, y, 2.2, 7))).join("");
  return `${poly("rgba(230,230,230,.35)", [[2, 10], [30, 10], [27, 46], [5, 46]])}
    ${poly(M.mid, [[3, 16], [29, 16], [26.6, 44], [5.4, 44]])}${poly(M.lo, [[16, 16], [29, 16], [26.6, 44], [16, 44]])}${pearls}
    ${poly("#e8e4dc", [[1, 8], [31, 8], [30, 11], [2, 11]])}
    ${poly("#3a8a8a", [[17, 0], [21, 0], [19, 40], [15, 40]])}${poly("#4aa8a8", [[17, 0], [19, 0], [17, 40], [15, 40]])}`;
}

export default { key: "bubbletea", label: "タピオカミルクティー", at: "shelf", w: 32, h: 48, cat: "食べ物", order: 684, region: "TW", note: "台湾で。太いストローで", art } satisfies ItemDef;
