// 楕円の無地のラグ（藍）: 柄のない楕円。縁だけ少し濃い
import { tone } from "./lowpoly";
import { ring, ell, backLit } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const p = tone("#3f5672"), e = ell(130, 20, 127, 18.4), N = 28;
  return ring(e, N, 1, .9, (i, o) => backLit(i / N) ? (o ? p.lo : p.mid) : (o ? p.deep : p.lo))
    + ring(e, N, .9, .5, i => backLit((i + .5) / N) ? p.mid : p.lo)
    + ring(e, N, .5, 0, i => backLit((i + .5) / N) ? p.hi : p.mid);
}

export default { key: "plainoval", label: "楕円の無地のラグ", at: "floor", w: 260, h: 0, flat: true, vh: 40, x: 0.4, cat: "敷きもの", order: 26.5, note: "藍一色の楕円", art } satisfies ItemDef;
