// ぶどう。山梨で。ひと房
import { poly } from "./lowpoly";
import { fruit } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const g = [[18, 14], [11, 16], [25, 16], [14, 22], [22, 22], [8, 23], [28, 23], [18, 28], [11, 30], [25, 30], [15, 36], [22, 36], [18, 42]];
  return `${poly("#5a4030", [[17, 4], [19, 4], [19, 12], [17, 12]])}${poly("#4f7a3e", [[19, 6], [32, 2], [28, 10]])}${poly("#3f6a35", [[19, 6], [28, 10], [22, 11]])}
    ${g.map(([x, y]) => fruit("#5a3a6e", x, y, 4.8, 4.8, 8)).join("")}`;
}

export default { key: "budou", label: "ぶどう", at: "shelf", w: 36, h: 48, cat: "食べ物", order: 625, region: "JP-19", note: "山梨で。ひと房", art } satisfies ItemDef;
