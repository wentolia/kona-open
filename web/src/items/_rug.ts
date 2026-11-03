// 敷くものを描く道具（ラグの items が使う。default がないので一覧には出ない）
// 床は奥（上）へ向かって細くなる。四角いものは trap()、丸いものは ell() の座標で描く
import { poly, type Pt } from "./lowpoly";

/** u（0 左〜1 右）, v（0 奥〜1 手前）→ 座標 */
export type At = (u: number, v: number) => Pt;
/** 奥へ向かって細くなる四角。x0〜x0+W の幅、y0（奥）〜y1（手前）、inset は奥側の寄り */
export const trap = (x0: number, W: number, y0: number, y1: number, inset: number): At =>
  (u, v) => { const i = inset * (1 - v); return [x0 + i + (W - 2 * i) * u, y0 + (y1 - y0) * v]; };
/** 四角の面 */
export const cell = (at: At, c: string, u0: number, v0: number, u1: number, v1: number) =>
  poly(c, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
/** 四角の面を 2 枚の三角で（左上を a、右下を b） */
export const cell2 = (at: At, a: string, b: string, u0: number, v0: number, u1: number, v1: number) =>
  poly(a, [at(u0, v0), at(u1, v0), at(u0, v1)]) + poly(b, [at(u1, v0), at(u1, v1), at(u0, v1)]);
/** 菱形（中心 u,v、半幅 du,dv） */
export const diamond = (at: At, c: string, u: number, v: number, du: number, dv: number) =>
  poly(c, [at(u, v - dv), at(u + du, v), at(u, v + dv), at(u - du, v)]);

/** 楕円: t（0〜1 で一周、0 が右、.25 が手前）, r（0 中心〜1 縁）→ 座標 */
export type Ell = (t: number, r: number) => Pt;
export const ell = (cx: number, cy: number, rx: number, ry: number): Ell =>
  (t, r) => { const a = t * Math.PI * 2; return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]; };
/** 奥側（上半分）ほど少し明るい */
export const backLit = (t: number) => Math.sin(t * Math.PI * 2) < 0;
/** r0（外）〜r1（内）の輪を n に割り、i 番目の色を col(i, 外側の三角か) で塗る。t0〜t1 だけ描くこともできる */
export function ring(e: Ell, n: number, r0: number, r1: number, col: (i: number, outer: boolean) => string, t0 = 0, t1 = 1) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = t0 + (t1 - t0) * i / n, b = t0 + (t1 - t0) * (i + 1) / n;
    s += r1 > 0
      ? poly(col(i, true), [e(a, r0), e(b, r0), e(a, r1)]) + poly(col(i, false), [e(b, r0), e(b, r1), e(a, r1)])
      : poly(col(i, true), [e(a, r0), e(b, r0), e(0, 0)]);
  }
  return s;
}
/** 決まった揺らぎ（0〜1） */
export const jit = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** 房: 点 p から dx,dy の向きへ、細い台形 */
export const tassel = (c: string, [x, y]: Pt, dx: number, dy: number, w = .7): string =>
  poly(c, [[x - w, y], [x + w, y], [x + dx + w * .5, y + dy], [x + dx - w * .5, y + dy]]);
