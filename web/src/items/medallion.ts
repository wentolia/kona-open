// 大きな織りのラグ: 二重の縁の帯に小さな菱を並べ、真ん中に段のついた六角のメダリオン、四隅に三角
import { poly } from "./lowpoly";
import { trap, cell, cell2, diamond, tassel, type At } from "./_rug";
import type { ItemDef } from "./types";

/** 段のついた六角（中心 u,v、半幅 du、半高 dv、段の数 n） */
function stepHex(at: At, c: string, u: number, v: number, du: number, dv: number, n: number) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const v0 = v - dv + i * dv / n, v1 = v0 + dv / n, w = du * (.35 + .65 * (i + 1) / n);
    s += cell(at, c, u - w, v0, u + w, v1) + cell(at, c, u - w, 2 * v - v1, u + w, 2 * v - v0);
  }
  return s;
}
function art() {
  const at = trap(0, 420, 3, 37, 28);
  let s = cell(at, "#e0cfa8", 0, 0, 1, 1) + cell(at, "#5a2f2a", .015, .06, .985, .94);
  s += cell(at, "#c9a05a", .03, .13, .97, .87) + cell(at, "#7a3a2e", .045, .2, .955, .8);
  for (let i = 0; i < 12; i++) s += cell2(at, "#87422f", "#733728", .045 + i * .91 / 12, .2, .045 + (i + 1) * .91 / 12, .8);
  // 縁の帯の小さな菱
  for (let i = 0; i < 26; i++) { const u = .05 + i * .9 / 25; s += diamond(at, "#2f3f55", u, .095, .008, .03) + diamond(at, "#2f3f55", u, .905, .008, .03); }
  // 四隅の三角
  for (const [u, du] of [[.045, 1], [.955, -1]] as const) for (const [v, dv] of [[.2, 1], [.8, -1]] as const)
    s += poly("#c9a05a", [at(u, v), at(u + du * .09, v), at(u, v + dv * .26)]);
  // メダリオン
  s += stepHex(at, "#2f3f55", .5, .5, .22, .27, 4) + stepHex(at, "#c9a05a", .5, .5, .15, .19, 3) + stepHex(at, "#a04a34", .5, .5, .08, .11, 2);
  s += diamond(at, "#e0cfa8", .5, .5, .025, .06);
  for (const u of [.2, .8]) s += diamond(at, "#c9a05a", u, .5, .035, .14) + diamond(at, "#5a2f2a", u, .5, .015, .06);
  for (let i = 0; i <= 44; i++) s += tassel("#d9c6a0", at(i / 44, 1), 0, 2.6);
  return s;
}

export default { key: "medallion", label: "大きな織りのラグ", at: "floor", w: 420, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 27.5, note: "部屋の真ん中に敷く大判。ソファと低い机ごと載る", art } satisfies ItemDef;
