// マグカップ。湯気が立ち、40 分ほどで冷める。押すと淹れ直す
import { cylinder, poly, tone } from "./lowpoly";
import { onPress, wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#c46a4c");
  return `${poly(T.lo, [[28, 10], [36, 10], [38, 14], [38, 22], [34, 26], [28, 26], [28, 22], [33, 21], [34, 15], [28, 14]])}
    ${cylinder(T, 16, 6, 34, 13, 6)}${poly("#3a2418", [[5, 5], [27, 5], [26, 8], [6, 8]])}`;
}

const KEY = "kona.mug";
const poured = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const live: Live = svg => {
  const steam = wisps(svg, 16, 3);
  let at = poured() || Date.now();
  onPress(svg, () => { at = Date.now(); try { localStorage.setItem(KEY, String(at)); } catch { /* ignore */ } });
  return s => steam(s, Math.max(0, 1 - (Date.now() - at) / 2.4e6));
};

export default { key: "mug", label: "マグカップ", at: "shelf", w: 40, h: 34, cat: "小物", order: 200, note: "湯気が立ち、40 分ほどで冷める。押すと淹れ直す", art, live } satisfies ItemDef;
