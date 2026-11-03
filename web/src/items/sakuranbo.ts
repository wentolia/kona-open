// さくらんぼ。山形で。ふたつ並んで
import { poly } from "./lowpoly";
import { fruit } from "./_land";
import type { ItemDef } from "./types";

function art() {

  return `${poly("#4f6a3a", [[13, 30], [14, 30], [22, 6], [21, 6]])}${poly("#4f6a3a", [[27, 32], [28, 32], [23, 6], [22, 6]])}
    ${poly("#4f7a3e", [[22, 6], [34, 2], [30, 9]])}${poly("#3f6a35", [[22, 6], [30, 9], [26, 10]])}
    ${fruit("#c8283a", 13, 34, 8.4)}${fruit("#b02032", 28, 36, 8.4)}`;
}

export default { key: "sakuranbo", label: "さくらんぼ", at: "shelf", w: 40, h: 44, cat: "食べ物", order: 615, region: "JP-06", note: "山形で。ふたつ並んで", art } satisfies ItemDef;
