// 桜の枝（試作）。春
import { cylinder, poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const V = tone("#d8d0c0");
  let s = `${poly("#5a4030", [[25, 60], [27, 60], [30, 30], [38, 10], [36, 9], [28, 28], [20, 14], [18, 15], [26, 32]])}`;
  const fl: [number, number][] = [[38, 10], [34, 18], [31, 26], [20, 14], [23, 22], [42, 14], [16, 18], [29, 34], [36, 24]];
  fl.forEach(([x, y], i) => { s += poly(i % 2 ? "#f2c4cc" : "#f7d8dc", ngon(x, y, 3.4, 5, i)) + poly("#e07a8a", ngon(x, y, .9, 4)); });
  return s + cylinder(V, 26, 60, 96, 11, 6);
}

export default { key: "sakura", label: "桜の枝", at: "shelf", w: 52, h: 96, cat: "季節", order: 300, draft: true, note: "春", art } satisfies ItemDef;
