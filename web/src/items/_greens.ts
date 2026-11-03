// 鉢植えを描く道具（植物の items が使う。default がないので一覧には出ない）
import { poly, ngon, type Pal, type Pt } from "./lowpoly";

const R = Math.PI / 180;
/** 向き deg（0 で上、時計回り）の座標系: t は向きに沿って len 倍、v は右手に wid 倍 */
export const frame = (x: number, y: number, len: number, wid: number, deg: number) => {
  const ux = Math.sin(deg * R), uy = -Math.cos(deg * R);
  return (t: number, v: number): Pt => [x + ux * t * len - uy * v * wid, y + uy * t * len + ux * v * wid];
};

/** 先細りの鉢。cx 中心・y0 縁の上・y1 底・r0 口の半径・r1 底の半径・rim 縁の高さ（0 で縁なし）。土は soil（"" で描かない） */
export function pot(p: Pal, cx: number, y0: number, y1: number, r0: number, r1: number, rim = 4, soil = "#3b2c22", n = 6) {
  const band = (ya: number, yb: number, ra: number, rb: number) => {
    let o = "";
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n, t = (i + .5) / n, c = t < .25 ? p.hi : t < .55 ? p.mid : t < .8 ? p.lo : p.deep;
      o += poly(c, [[cx - Math.cos(a0) * ra, ya], [cx - Math.cos(a1) * ra, ya], [cx - Math.cos(a1) * rb, yb], [cx - Math.cos(a0) * rb, yb]]);
    }
    return o;
  };
  const oval = (c: string, cy: number, r: number, hh: number) => poly(c, ngon(cx, cy, r, 14).map(([x, y]) => [x, cy + (y - cy) * hh / r] as Pt));
  let o = band(y0 + rim, y1, r0, r1);
  if (rim) o += band(y0, y0 + rim, r0 + 2, r0 + 2) + poly(p.deep, [[cx - r0 - 2, y0 + rim], [cx + r0 + 2, y0 + rim], [cx + r0, y0 + rim + 1.2], [cx - r0, y0 + rim + 1.2]]);
  o += oval(p.hi, y0, r0 + (rim ? 2 : 0), Math.max(1.6, r0 * .09));
  if (soil) o += oval(soil, y0 + .4, r0 - 1, Math.max(1.1, r0 * .065));
  return o;
}

/** 茎・幹（太さ w0 → w1 の台形） */
export function stem(c: string, x0: number, y0: number, x1: number, y1: number, w0: number, w1 = w0 * .6) {
  const d = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
  return poly(c, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]]);
}

/** 形のある葉: 幅の形 f(t)（0〜1）を、中央の葉脈の左右で n 枚ずつの面に割る。c は [左の明, 左の暗, 右の明, 右の暗] */
export function blade(c: string[], x: number, y: number, len: number, wid: number, deg: number, f: (t: number) => number, n = 3) {
  const at = frame(x, y, len, wid, deg);
  let o = "";
  for (const s of [-1, 1]) for (let k = 0; k < n; k++) {
    const a = k / n, b = (k + 1) / n, col = c[(s < 0 ? 0 : 2) + (k % 2)], edge: Pt[] = [];
    for (let m = 0; m <= 3; m++) { const t = b - (b - a) * m / 3; edge.push(at(t, s * f(t))); }
    o += poly(col, [at(a, 0), at(b, 0), ...edge]);
  }
  return o;
}

/** ふくらんだ茂み（葉の塊）: 中心 cx,cy・半径 rx,ry の n 角を、左上を明るく扇に塗る */
export function bush(c: string[], cx: number, cy: number, rx: number, ry: number, n = 9, a0 = 0) {
  const pts = ngon(0, 0, 1, n, a0).map(([x, y], i) => [cx + x * rx * (i % 2 ? .9 : 1), cy + y * ry * (i % 2 ? .9 : 1)] as Pt), ap: Pt = [cx - rx * .25, cy - ry * .3];
  return pts.map((p, i) => {
    const q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy, d = Math.hypot(mx, my) || 1, t = (mx * -.55 + my * -.83) / d;
    return poly(t > .45 ? c[0] : t > -.1 ? c[1] : t > -.6 ? c[2] : c[3], [ap, p, q]);
  }).join("");
}

/** 吊るす紐（上の一点から鉢の縁へ） */
export const cords = (c: string, x: number, y: number, ends: Pt[], w = .9) => ends.map(([ex, ey]) => stem(c, x, y, ex, ey, w, w)).join("");
