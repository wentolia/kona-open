// 桃。岡山で。きびだんごを添えて
import { poly, puff, tone, leaf } from "./lowpoly";
import { oval, fruit, plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const P = tone("#f0b0a0");
  return `${puff(P, oval(16, 22, 12, 13, 11), [12, 16])}${poly("#e07a78", [[16, 9], [17, 12], [16, 34], [15, 22]])}
    ${poly("rgba(220,90,100,.45)", oval(20, 22, 7, 9, 9))}${leaf("#4f7a3e", "#3f6a35", 16, 10, 10, 3, 50)}
    ${plate("#e8e4dc", 35, 36, 8)}${[[32, 33], [38, 33], [35, 30]].map(([x, y]) => fruit("#e8dcb8", x, y, 2.8, 2.6, 7)).join("")}`;
}

export default { key: "momo", label: "桃", at: "shelf", w: 44, h: 40, cat: "食べ物", order: 636, region: "JP-33", note: "岡山で。きびだんごを添えて", art } satisfies ItemDef;
