// パエリア鍋。スペインで。海老とレモン
import { poly, tone, ngon } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const P = tone("#3a3836"), R = "#e0a83a";
  return `${poly(P.lo, [[0, 16], [8, 16], [8, 18], [0, 18]])}${poly(P.lo, [[52, 16], [60, 16], [60, 18], [52, 18]])}
    ${poly(P.mid, [[6, 16], [54, 16], [50, 26], [10, 26]])}${poly(R, oval(30, 16, 23, 5, 14, 0))}
    ${[[18, 15], [30, 13], [40, 16]].map(([x, y]) => poly("#e8704a", [[x - 4, y], [x, y - 2], [x + 4, y], [x + 2, y + 2], [x - 2, y + 2]])).join("")}
    ${[[24, 17], [36, 18]].map(([x, y]) => poly("#5f8a3a", ngon(x, y, 1.2, 5))).join("")}${poly("#e8e070", [[42, 13], [48, 14], [46, 17]])}`;
}

export default { key: "paella", label: "パエリア鍋", at: "shelf", w: 60, h: 32, cat: "食べ物", order: 670, region: "ES", note: "スペインで。海老とレモン", art } satisfies ItemDef;
