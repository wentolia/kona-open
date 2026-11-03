// ビーズクッション（試作）。猫が沈み込んで寝る
import { puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#6f7f62");
  return `${puff(T, [[8, 74], [6, 52], [18, 26], [44, 10], [80, 8], [110, 22], [124, 48], [122, 74], [96, 82], [34, 82]], [58, 40])}
    <i data-cat-plat="bed" data-sink="7" style="left:16%;width:66%;top:28%"></i>`;
}

export default { key: "beanbag", label: "ビーズクッション", at: "floor", w: 130, h: 82, cat: "家具", order: 39, draft: true, note: "猫が沈み込んで寝る", art } satisfies ItemDef;
