// 半円のマット: まっすぐな辺を奥に。扇のような放射の柄と、縁の帯
import { ring, ell } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const e = ell(100, 4, 97, 34);
  let s = ring(e, 14, 1, .86, (i, o) => o ? "#3e4f4a" : "#34433f", 0, .5);
  s += ring(e, 14, .86, .78, (i, o) => o ? "#d6c39b" : "#c8b48b", 0, .5);
  s += ring(e, 12, .78, 0, i => ["#b5674a", "#cf9a5a", "#b5674a", "#e0cfa6"][i % 4], 0, .5);
  s += ring(e, 6, .3, 0, (i, o) => o ? "#3e4f4a" : "#34433f", 0, .5);
  return s;
}

export default { key: "halfmoon", label: "半円のマット", at: "floor", w: 200, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 23, note: "扇の柄。戸口や棚の前に", art } satisfies ItemDef;
