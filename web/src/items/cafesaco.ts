// コーヒー豆の麻袋。ブラジルで。こぼれた豆
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const J = tone("#b8986a"), B = "#4a2a1a";
  return `${puff(J, [[8, 40], [6, 20], [12, 12], [36, 12], [42, 20], [40, 40]], [16, 20])}
    ${poly(J.lo, [[12, 12], [36, 12], [34, 8], [14, 8]])}${poly("#3a2a1a", oval(24, 11, 10, 2.4, 10, 0))}
    ${poly("#4a6a3a", [[14, 24], [34, 24], [34, 32], [14, 32]])}${poly("#e8dcb8", [[18, 27], [30, 27], [30, 29], [18, 29]])}
    ${[[40, 40], [44, 38], [46, 41]].map(([x, y]) => poly(B, oval(x, y, 2, 1.4, 6))).join("")}`;
}

export default { key: "cafesaco", label: "コーヒー豆の麻袋", at: "shelf", w: 48, h: 42, cat: "食べ物", order: 664, region: "BR", note: "ブラジルで。こぼれた豆", art } satisfies ItemDef;
