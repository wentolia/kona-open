// キウイの鳥。ニュージーランドで。長いくちばし
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const B = tone("#7a5a3a");
  return `${poly("#d8b878", [[14, 30], [16, 30], [15, 38], [12, 38]])}${poly("#d8b878", [[22, 30], [24, 30], [25, 38], [22, 38]])}
    ${puff(B, oval(18, 20, 15, 12, 12), [12, 14])}${poly("#d8c898", [[30, 16], [44, 22], [43, 23.4], [30, 19]])}
    ${poly("#2a2420", [[28, 14], [29.4, 14], [29.4, 15.4], [28, 15.4]])}`;
}

export default { key: "kiwi", label: "キウイの鳥", at: "shelf", w: 44, h: 38, cat: "飾り", order: 682, region: "NZ", note: "ニュージーランドで。長いくちばし", art } satisfies ItemDef;
