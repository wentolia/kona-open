// お弁当箱。実績「お昼休み」で届く
import { poly, tone, box, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#3a2f2a");
  return `${box(B, 2, 6, 48, 22, 5, -4)}${poly("#efe6d2", [[4, 6], [26, 6], [26, 14], [4, 14]])}
    ${poly("#e8c46a", [[28, 6], [38, 6], [38, 13], [28, 13]])}${poly("#d9584a", ngon(44, 9, 3.2, 7))}${poly("#5f8a5a", [[40, 11], [48, 10], [48, 14], [40, 14]])}
    ${poly("#c4523e", ngon(15, 10, 2.6, 7))}${poly("#2f3a2a", [[4, 3], [50, 3], [50, 5], [4, 5]])}
    ${poly("#a85f4a", [[2, 0], [54, 0], [54, 2], [2, 2]])}`;
}

export default { key: "bento", label: "お弁当箱", at: "shelf", w: 56, h: 30, cat: "食べ物", order: 733, note: "実績「お昼休み」で届く", art } satisfies ItemDef;
