// ご当地の品を描く道具（default がないので一覧には出ない）
import { poly, puff, tone, ngon, type Pt } from "./lowpoly";

/** 楕円の頂点 */
export const oval = (cx: number, cy: number, rx: number, ry: number, n = 10, a0 = .2): Pt[] => ngon(0, 0, 1, n, a0).map(([x, y]) => [cx + x * rx, cy + y * ry] as Pt);
/** ふくらんだ実（丸・楕円）。光は左上 */
export const fruit = (c: string, cx: number, cy: number, rx: number, ry = rx, n = 9) => puff(tone(c), oval(cx, cy, rx, ry, n), [cx - rx * .35, cy - ry * .4]);
/** 平たい皿（上から少し見下ろす） */
export function plate(c: string, cx: number, y: number, rx: number, ry = rx * .22) {
  const T = tone(c);
  return poly(T.lo, [[cx - rx, y], [cx + rx, y], [cx + rx * .8, y + ry * 1.6], [cx - rx * .8, y + ry * 1.6]]) + poly(T.hi, oval(cx, y, rx, ry, 14, 0));
}
/** 椀・鉢（口の楕円と胴） */
export function bowl(c: string, cx: number, y: number, rx: number, h: number, inner = "#2a2420") {
  const T = tone(c);
  return poly(T.mid, [[cx - rx, y], [cx + rx, y], [cx + rx * .62, y + h], [cx - rx * .62, y + h]]) +
    poly(T.lo, [[cx, y], [cx + rx, y], [cx + rx * .62, y + h], [cx, y + h]]) +
    poly(T.deep, [[cx - rx * .4, y + h], [cx + rx * .4, y + h], [cx + rx * .36, y + h + 2], [cx - rx * .36, y + h + 2]]) +
    poly(inner, oval(cx, y, rx, rx * .22, 14, 0));
}
/** 小さな葉と軸（実の上） */
export const stem = (x: number, y: number, deg = 20) => {
  const r = deg * Math.PI / 180;
  return poly("#5a4030", [[x - .6, y], [x + .6, y], [x + .8, y - 4], [x - .2, y - 4]]) +
    poly("#4f7a3e", [[x, y - 2], [x + Math.cos(r) * 7, y - 2 - Math.sin(r) * 7 - 2], [x + Math.cos(r) * 4, y - Math.sin(r) * 4 + 1]]);
};
