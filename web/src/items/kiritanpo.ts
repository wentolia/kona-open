// きりたんぽ。秋田で。杉の串に焼いたごはん
import { poly, tone } from "./lowpoly";
import { plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const R = tone("#e8d6a8"), Br = "#b8864a";
  const tanpo = (x: number, y: number) => poly("#c8a878", [[x, y], [x + 46, y - 14], [x + 46.6, y - 12.6], [x + .6, y + 1.4]]) +
    poly(R.mid, [[x + 8, y - 6], [x + 34, y - 14], [x + 37, y - 9], [x + 11, y - 1]]) + poly(R.hi, [[x + 8, y - 6], [x + 34, y - 14], [x + 34.6, y - 12], [x + 8.6, y - 4]]) +
    [0, 1, 2, 3].map(i => poly(Br, [[x + 13 + i * 6, y - 5.4 - i * 1.8], [x + 16 + i * 6, y - 6.4 - i * 1.8], [x + 17 + i * 6, y - 3 - i * 1.8], [x + 14 + i * 6, y - 2 - i * 1.8]])).join("");
  return `${plate("#e8e4dc", 28, 34, 26)}${tanpo(4, 30)}${tanpo(8, 36)}`;
}

export default { key: "kiritanpo", label: "きりたんぽ", at: "shelf", w: 56, h: 40, cat: "食べ物", order: 614, region: "JP-05", note: "秋田で。杉の串に焼いたごはん", art } satisfies ItemDef;
