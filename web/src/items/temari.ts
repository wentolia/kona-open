// 肥後てまり。熊本で。糸でかがった模様
import { poly, puff, tone, ngon } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const B = tone("#2a3a6e");
  let st = "";
  const cs = ["#c44a3a", "#e8c86a", "#e8e0cc", "#5f8a4a"];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; st += poly(cs[i % 4], [[20, 20], [20 + Math.cos(a) * 15, 20 + Math.sin(a) * 15], [20 + Math.cos(a + .3) * 9, 20 + Math.sin(a + .3) * 9]]); }
  return `${puff(B, oval(20, 20, 17, 17, 14), [14, 14])}${st}${poly(cs[0], ngon(20, 20, 3.6, 8))}${poly("#c42a28", [[16, 36], [24, 36], [22, 40], [18, 40]])}`;
}

export default { key: "temari", label: "肥後てまり", at: "shelf", w: 40, h: 40, cat: "飾り", order: 644, region: "JP-43", note: "熊本で。糸でかがった模様", art } satisfies ItemDef;
