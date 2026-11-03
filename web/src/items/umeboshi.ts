// 梅干しの壺。和歌山で。小皿にひとつ
import { poly, puff, tone } from "./lowpoly";
import { oval, fruit, plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const P = tone("#a87a4a");
  return `${puff(P, [[6, 14], [30, 14], [34, 24], [30, 40], [6, 40], [2, 24]], [12, 22])}${poly(P.deep, oval(18, 14, 10, 2.4, 10, 0))}
    ${poly("#e8e0cc", [[4, 8], [32, 8], [30, 14], [6, 14]])}${poly("#c44a3a", [[4, 10], [32, 10], [32, 11.4], [4, 11.4]])}
    ${plate("#e8e4dc", 36, 38, 8)}${fruit("#b83038", 36, 35, 4, 3.6, 8)}`;
}

export default { key: "umeboshi", label: "梅干しの壺", at: "shelf", w: 44, h: 44, cat: "食べ物", order: 633, region: "JP-30", note: "和歌山で。小皿にひとつ", art } satisfies ItemDef;
