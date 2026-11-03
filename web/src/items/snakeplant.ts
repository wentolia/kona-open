// サンスベリア（床）。まっすぐ立つ剣の形の葉に、黄色の縁と横縞
import { poly, tone, type Pt } from "./lowpoly";
import { frame, pot } from "./_greens";
import type { ItemDef } from "./types";

function sword(x: number, y: number, len: number, wid: number, deg: number, lit: boolean) {
  const at = frame(x, y, len, wid, deg), f = (t: number) => t < .75 ? 1 - t * .25 : (1 - t) / .25 * .81;
  const side = (s: number, k0: number, k1: number, v: number): Pt[] => { const o: Pt[] = []; for (let t = k0; t <= k1 + 1e-6; t += (k1 - k0) / 6) o.push(at(t, s * v * f(t))); return o; };
  const g = lit ? ["#4b7444", "#3d633a"] : ["#3f6539", "#335531"];
  let o = poly("#c9b45a", [...side(-1, 0, 1, 1), ...side(1, 0, 1, 1).reverse()]);
  o += poly(g[0], [at(0, 0), ...side(-1, 0, .98, .78), at(.99, 0)]) + poly(g[1], [at(0, 0), at(.99, 0), ...side(1, 0, .98, .78).reverse()]);
  for (let t = .1; t < .8; t += .085) o += poly(lit ? "#2c4a2a" : "#263f25", [at(t, -.7 * f(t)), at(t + .025, 0), at(t, .7 * f(t)), at(t + .02, .7 * f(t)), at(t + .045, 0), at(t + .02, -.7 * f(t))]);
  return o;
}

function art() {
  const P = tone("#d6cfc2");
  const L: [number, number, number, number, number][] = [[38, 100, 6.5, -8, 0], [50, 112, 7, 4, 1], [28, 84, 6, -16, 1], [44, 86, 6, 14, 0], [38, 70, 5.5, -3, 1], [52, 74, 6, 22, 1], [32, 60, 5, -24, 0]];
  return L.map(([x, len, w, d, lit]) => sword(x + 2, 128, len, w, d, !!lit)).join("") + pot(P, 42, 124, 160, 22, 18, 0, "#3b2c22", 8);
}

export default { key: "snakeplant", label: "サンスベリア", at: "floor", w: 84, h: 160, cat: "植物", order: 43, note: "剣の形の葉に黄色の縁と横縞", art } satisfies ItemDef;
