// 大きな観葉植物。季節で葉の色が少し変わる予定
import { cylinder, leaf, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const pot = tone("#c9c1b2");
  let s = "";
  const L: [number, number, number, number][] = [[64, 130, 70, -40], [66, 128, 82, -12], [64, 130, 76, 18], [62, 132, 60, 48], [66, 132, 56, -66], [64, 126, 92, 2], [62, 132, 58, 72], [66, 130, 66, -28], [64, 130, 72, 32]];
  L.forEach(([x, y, len, a], i) => { s += poly("#3f5a36", [[x - .8, y], [x + .8, y], [x + Math.sin(a * Math.PI / 180) * len * .5 + .8, y - Math.cos(a * Math.PI / 180) * len * .5], [x + Math.sin(a * Math.PI / 180) * len * .5 - .8, y - Math.cos(a * Math.PI / 180) * len * .5]]);
    const bx = x + Math.sin(a * Math.PI / 180) * len * .45, by = y - Math.cos(a * Math.PI / 180) * len * .45;
    s += leaf(i % 2 ? "#5b8a4a" : "#6d9b55", i % 2 ? "#40683a" : "#4c7740", bx, by, len * .62, len * .2, a); });
  return s + `${cylinder(pot, 65, 140, 202, 30, 8, false)}${poly(pot.hi, [[33, 136], [97, 136], [96, 142], [34, 142]])}${poly("#3b2c22", [[37, 138], [93, 138], [92, 141], [38, 141]])}
    ${poly(pot.deep, [[38, 202], [92, 202], [90, 206], [40, 206]])}`;
}

export default { key: "bigplant", label: "大きな観葉植物", at: "floor", w: 130, h: 206, cat: "植物", order: 37, note: "季節で葉の色が少し変わる予定", art } satisfies ItemDef;
