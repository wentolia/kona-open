// いちご。栃木で。小さなかごに
import { poly, puff, tone, box } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const berry = (cx: number, cy: number, s: number) => {
    const R = tone("#c42a36");
    const body = puff(R, [[cx - 6 * s, cy - 4 * s], [cx, cy - 6 * s], [cx + 6 * s, cy - 4 * s], [cx + 5 * s, cy + 2 * s], [cx, cy + 8 * s], [cx - 5 * s, cy + 2 * s]], [cx - 2 * s, cy - 2 * s]);
    const seeds = [[-3, -1], [1, -2], [3, 2], [-1, 3], [-3, 4]].map(([x, y]) => poly("#e8c86a", [[cx + x * s, cy + y * s], [cx + x * s + .8, cy + y * s], [cx + x * s + .4, cy + y * s + 1.2]])).join("");
    return body + seeds + poly("#4f7a3e", [[cx - 6 * s, cy - 5 * s], [cx, cy - 8 * s], [cx + 6 * s, cy - 5 * s], [cx, cy - 4 * s]]);
  };
  return `${box(tone("#c9a676"), 4, 24, 34, 10, 4, -3)}${berry(12, 16, 1.05)}${berry(30, 15, 1)}${berry(21, 13, 1.1)}`;
}

export default { key: "ichigo", label: "いちご", at: "shelf", w: 44, h: 36, cat: "食べ物", order: 617, region: "JP-09", note: "栃木で。小さなかごに", art } satisfies ItemDef;
