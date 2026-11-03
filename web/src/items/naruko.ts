// 鳴子。高知で。よさこいの拍子木
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#d8b884");
  const one = (x: number, y: number, a: number) => `<g transform="rotate(${a} ${x} ${y})">
    ${poly(W.lo, [[x - 2, y], [x + 2, y], [x + 2, y + 18], [x - 2, y + 18]])}${poly(W.hi, [[x - 2, y], [x, y], [x, y + 18], [x - 2, y + 18]])}
    ${poly("#c42a28", [[x - 8, y - 16], [x + 8, y - 16], [x + 8, y], [x - 8, y]])}${poly("#2a2420", [[x - 8, y - 12], [x + 8, y - 12], [x + 8, y - 10], [x - 8, y - 10]])}
    ${poly("#e8c86a", [[x - 8, y - 6], [x + 8, y - 6], [x + 8, y - 4], [x - 8, y - 4]])}${poly(W.mid, [[x - 9, y - 16], [x + 9, y - 16], [x + 9, y - 14], [x - 9, y - 14]])}</g>`;
  return `${one(14, 26, -12)}${one(30, 28, 10)}`;
}

export default { key: "naruko", label: "鳴子", at: "shelf", w: 44, h: 46, cat: "飾り", order: 640, region: "JP-39", note: "高知で。よさこいの拍子木", art } satisfies ItemDef;
