// 松の盆栽（棚）。曲がった幹と、平たい雲の形に刈った濃い葉、長方形の鉢
import { box, poly, tone, type Pt } from "./lowpoly";
import { stem } from "./_greens";
import type { ItemDef } from "./types";

/** 葉の段: 平たい楕円を、上を明るく、下に短い針の縁で */
function pad(cx: number, cy: number, rx: number, ry: number) {
  const C = ["#5f8048", "#4b6c3c", "#3a5832", "#2e4829"];
  let o = poly(C[2], [[cx - rx, cy], [cx - rx * .7, cy + ry], [cx + rx * .7, cy + ry], [cx + rx, cy]]);
  o += poly(C[0], [[cx - rx, cy], [cx - rx * .6, cy - ry], [cx + rx * .2, cy - ry * 1.15], [cx + rx * .1, cy]]) + poly(C[1], [[cx + rx * .1, cy], [cx + rx * .2, cy - ry * 1.15], [cx + rx * .7, cy - ry * .9], [cx + rx, cy]]);
  for (let x = cx - rx * .8; x < cx + rx * .8; x += 4) o += poly(C[3], [[x, cy + ry * .9], [x + 3, cy + ry * .9], [x + 1.5, cy + ry + 1.4]]);
  for (let x = cx - rx * .5; x < cx + rx * .4; x += 5) o += poly(C[0], [[x, cy - ry * 1.05], [x + 2, cy - ry * 1.05], [x + .6, cy - ry * 1.05 - 1.4]]);
  return o;
}

function art() {
  const T = "#5b4434", T2 = "#74584a", P = tone("#7a4a3a");
  const trunk: Pt[] = [[40, 58], [36, 46], [44, 36], [34, 24], [26, 20]];
  let s = "";
  for (let i = 0; i < trunk.length - 1; i++) s += stem(i % 2 ? T2 : T, trunk[i][0], trunk[i][1], trunk[i + 1][0], trunk[i + 1][1], 9 - i * 1.8, 7.2 - i * 1.8);
  s += stem(T, 42, 40, 62, 30, 3.4, 1.6) + stem(T, 38, 47, 20, 42, 3, 1.4) + stem(T, 32, 23, 46, 14, 2.4, 1.2);
  s += pad(62, 28, 14, 5) + pad(19, 40, 12, 4.4) + pad(26, 17, 13, 5) + pad(46, 11, 12, 4.6);
  return s + box(P, 12, 58, 54, 9, 6, -4) + poly(P.deep, [[16, 67], [21, 67], [21, 70], [16, 70]]) + poly(P.deep, [[57, 67], [62, 67], [62, 70], [57, 70]]) + poly("#4a3a2c", [[13, 57], [65, 57], [70, 54], [18, 54]]);
}

export default { key: "pinebonsai", label: "松の盆栽", at: "shelf", w: 78, h: 70, cat: "植物", order: 216, draft: true, note: "曲がった幹と雲の形に刈った葉", art } satisfies ItemDef;
