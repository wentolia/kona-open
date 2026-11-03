// 砥部焼の鉢。愛媛で。白に藍の唐草
import { poly } from "./lowpoly";
import { fruit, bowl } from "./_land";
import type { ItemDef } from "./types";

function art() {

  return `${bowl("#ece8e0", 25, 8, 22, 18, "#e0dcd2")}
    <path d="M10 16 q4 -4 8 0 t8 0 t8 0 t8 0" style="fill:none;stroke:#2c4a7e;stroke-width:1.6"/>
    ${poly("#2c4a7e", [[14, 22], [36, 22], [35, 23.4], [15, 23.4]])}${fruit("#ec8a22", 25, 6, 5, 4.4, 8)}`;
}

export default { key: "tobeyaki", label: "砥部焼の鉢", at: "shelf", w: 50, h: 32, cat: "小物", order: 639, region: "JP-38", note: "愛媛で。白に藍の唐草", art } satisfies ItemDef;
