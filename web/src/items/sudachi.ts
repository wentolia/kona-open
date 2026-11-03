// すだち。徳島で。半分に切って
import { poly, tone } from "./lowpoly";
import { oval, fruit } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const G = tone("#5f9a3a");
  let seg = "";
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = (i + .8) / 8 * Math.PI * 2; seg += poly("#d8e09a", [[31, 20], [31 + Math.cos(a) * 7, 20 + Math.sin(a) * 5], [31 + Math.cos(b) * 7, 20 + Math.sin(b) * 5]]); }
  return `${fruit("#5f9a3a", 12, 20, 9, 8.4, 9)}${poly(G.lo, oval(31, 22, 10, 7, 12, 0))}${poly("#eef0c8", oval(31, 20, 9, 6.4, 12, 0))}${seg}`;
}

export default { key: "sudachi", label: "すだち", at: "shelf", w: 44, h: 30, cat: "食べ物", order: 638, region: "JP-36", note: "徳島で。半分に切って", art } satisfies ItemDef;
