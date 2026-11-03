// サイドテーブル。丸い天板。上に小物を置ける予定
import { cylinder, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#6e5a48");
  return `${poly(T.deep, [[33, 20], [37, 20], [37, 74], [33, 74]])}${poly(T.lo, [[31, 20], [34, 20], [34, 74], [31, 74]])}
    ${poly(T.lo, [[18, 84], [35, 72], [52, 84], [46, 84], [35, 77], [24, 84]])}
    ${cylinder(T, 35, 12, 20, 32, 8)}
    <i data-cat-plat="perch" data-sink="1" style="left:6%;width:88%;top:12%"></i>`;
}

export default { key: "sidetable", label: "サイドテーブル", at: "floor", w: 70, h: 84, cat: "家具", order: 31, note: "丸い天板。上に小物を置ける予定", art } satisfies ItemDef;
