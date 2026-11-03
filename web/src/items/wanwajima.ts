// 漆の椀。石川で。朱と黒の漆に金の線
import { poly, tone, box } from "./lowpoly";
import { oval, bowl } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const R = tone("#a82a22");
  return `${bowl("#24201e", 23, 10, 20, 18, R.mid)}${poly("#d8b46a", [[6, 16], [40, 16], [39.4, 17.2], [6.6, 17.2]])}
    ${poly(R.hi, oval(23, 10, 17, 3.4, 14, 0))}${poly("#d8b46a", [[14, 22], [18, 19], [20, 23], [16, 24]])}
    ${box(tone("#24201e"), 14, 28, 18, 4, 2, -1)}`;
}

export default { key: "wanwajima", label: "漆の椀", at: "shelf", w: 46, h: 34, cat: "小物", order: 623, region: "JP-17", note: "石川で。朱と黒の漆に金の線", art } satisfies ItemDef;
