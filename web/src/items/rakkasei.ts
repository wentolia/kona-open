// 落花生。千葉で。殻ごと
import { poly, puff, tone } from "./lowpoly";
import { oval, plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const P = tone("#d2ac74");
  const nut = (x: number, y: number, a: number) => `<g transform="rotate(${a} ${x} ${y})">${puff(P, oval(x - 5, y, 6, 4.6, 8), [x - 7, y - 2])}${puff(P, oval(x + 5, y, 6, 4.6, 8), [x + 3, y - 2])}
    ${poly(P.lo, [[x - 9, y], [x + 9, y], [x + 9, y + .6], [x - 9, y + .6]])}</g>`;
  return `${plate("#e8e4dc", 24, 24, 23)}${nut(16, 20, -10)}${nut(32, 21, 12)}${nut(24, 14, 4)}`;
}

export default { key: "rakkasei", label: "落花生", at: "shelf", w: 48, h: 30, cat: "食べ物", order: 619, region: "JP-12", note: "千葉で。殻ごと", art } satisfies ItemDef;
