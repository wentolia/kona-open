// モンステラ（床）。ハートの形に深い切れ込みの入った大きな葉
import { poly, tone, type Pt } from "./lowpoly";
import { frame, pot, stem } from "./_greens";
import type { ItemDef } from "./types";

/** 葉: 葉脈の左右を、先へ向かって斜めに切れ込む帯に割る（帯のすき間が切れ込み） */
function mleaf(x: number, y: number, len: number, deg: number, lit: number) {
  const at = frame(x, y, len, len * .56, deg), f = (t: number) => Math.sqrt(Math.max(0, (1 - t) * (t + .18))) / .59;
  const M = (t: number) => at(Math.max(0, t), 0), I = (t: number, s: number) => at(t + .05, s * .4 * f(t + .05)), O = (t: number, s: number) => { const u = Math.min(1, t + .1); return at(u, s * f(u)); };
  const ts = [-.18, .2, .44, .68, 1], C = lit ? ["#679a51", "#5b8c48", "#4c7a3f", "#43703a"] : ["#58894a", "#4d7c42", "#3f6a37", "#365f32"];
  let o = "";
  for (const s of [-1, 1]) for (let k = 0; k < ts.length - 1; k++) {
    const a = ts[k], b = ts[k + 1], c = C[(s < 0 ? 0 : 2) + (k % 2)];
    o += k === ts.length - 2 ? poly(c, [M(a), at(1, 0), O(a + .05, s), I(a, s)])
      : poly(c, [M(a), M(b), I(b, s), O(b, s), O(a + (k ? .09 : -.08), s), I(a, s)].filter((p, i) => k || i !== 4) as Pt[]);
  }
  for (const [t, v] of [[.32, -.62], [.56, .58], [.56, -.55], [.3, .64]]) { const c = at(t, v * f(t)), e = at(t + .07, v * f(t + .07)); o += poly(lit ? "#3a5f33" : "#2e4f2a", [[c[0], c[1]], [(c[0] + e[0]) / 2 + 1, (c[1] + e[1]) / 2 - 1], [e[0], e[1]], [(c[0] + e[0]) / 2 - 1, (c[1] + e[1]) / 2 + 1]]); }
  return o + poly(lit ? "#86ad6a" : "#6f9a58", [M(0), at(.9, -.02), at(.9, .02)]);
}

function art() {
  const P = tone("#4a4744");
  const L: [number, number, number, number, number][] = [
    [58, 100, 48, -60, 1], [96, 96, 50, 62, 0], [70, 64, 50, -10, 1], [104, 128, 42, 104, 0], [46, 128, 40, -106, 1], [86, 76, 44, 26, 1], [54, 80, 40, -34, 0],
  ];
  let s = "";
  L.forEach(([x, y, , d]) => { s += stem("#4b7a3e", 75 + d * .04, 148, x, y, 2.6, 1.6); });
  L.forEach(([x, y, len, d, lit]) => { s += mleaf(x, y, len, d, lit); });
  return s + pot(P, 75, 144, 200, 27, 21, 5);
}

export default { key: "monstera", label: "モンステラ", at: "floor", w: 150, h: 200, cat: "植物", order: 40, draft: true, note: "切れ込みの入った大きな葉", art } satisfies ItemDef;
