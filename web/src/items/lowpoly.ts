// 部屋に置くものを描く道具。ローポリ: 平らな多角形を濃淡 4 段（hi・mid・lo・deep）で塗る。光は左上から。
// 1 色だけ決めれば tone() が 4 段を作るので、色違いは tone("#…") を替えるだけでよい。
export type Pt = [number, number];
export type Pal = { hi: string; mid: string; lo: string; deep: string };
export const P = (pts: Pt[]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
// 棚の小物と同じく、多角形を同じ色の細い縁で塗って継ぎ目を消す
export const poly = (c: string, pts: Pt[]) => `<polygon style="fill:${c};stroke:${c}" points="${P(pts)}"/>`;
/** ふくらんだ面: 頂点を中に置いた扇に割り、左上から光が当たる向きの面ほど明るく塗る（クッションの丸み） */
export function puff(pal: Pal, pts: Pt[], apex: Pt) {
  const L = [-.55, -.83];
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length], mx = (a[0] + b[0]) / 2 - apex[0], my = (a[1] + b[1]) / 2 - apex[1], d = Math.hypot(mx, my) || 1;
    const t = (mx * L[0] + my * L[1]) / d;
    return poly(t > .45 ? pal.hi : t > -.1 ? pal.mid : t > -.6 ? pal.lo : pal.deep, [apex, a, b]);
  }).join("");
}
/** 平らな面を 2 枚の三角に割る（左上を明るく） */
export const slab = (a: string, b: string, [x0, y0, x1, y1]: number[]) => poly(a, [[x0, y0], [x1, y0], [x0, y1]]) + poly(b, [[x1, y0], [x1, y1], [x0, y1]]);
export const mirror = (W: number, pts: Pt[]): Pt[] => pts.map(([x, y]) => [W - x, y] as Pt).reverse();

// 素材の色（夜の部屋に合わせて、やや暗め）
export const WOOD: Pal = { hi: "#94694a", mid: "#704e35", lo: "#513725", deep: "#36251a" };
export const SAGE: Pal = { hi: "#93a89c", mid: "#76897f", lo: "#5a6b62", deep: "#3d4a43" };
export const OCHRE: Pal = { hi: "#d3a55a", mid: "#b38641", lo: "#8b652e", deep: "#5c421e" };
export const ROSE: Pal = { hi: "#c98d78", mid: "#a96d59", lo: "#845241", deep: "#59362b" };

export const BRASS: Pal = { hi: "#d8b46a", mid: "#b48f4c", lo: "#8a6b35", deep: "#5e4823" };
export const INK: Pal = { hi: "#4a4440", mid: "#38332f", lo: "#2b2724", deep: "#1e1b19" };
/** 額縁: 4 本の台形（上と左が明るい） */
export const bevel = (W: number, H: number, b: number, p: Pal) =>
  poly(p.hi, [[0, 0], [W, 0], [W - b, b], [b, b]]) + poly(p.mid, [[0, 0], [b, b], [b, H - b], [0, H]]) +
  poly(p.lo, [[W, 0], [W, H], [W - b, H - b], [W - b, b]]) + poly(p.deep, [[0, H], [b, H - b], [W - b, H - b], [W, H]]);
/** 正多角形（n 角）の頂点 */
export const ngon = (cx: number, cy: number, r: number, n: number, a0 = 0): Pt[] => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt; });


/** 1 色から濃淡 4 段を作る（明るさを上下に振り、明るい面は少し暖かく、暗い面は少し冷たく） */
export function tone(hex: string): Pal {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  const hsl = (dl: number, dh: number) => {
    const L = Math.max(0, Math.min(1, l + dl)), H = (h + dh + 360) % 360, C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs(H / 60 % 2 - 1)), m = L - C / 2;
    const [R, G, B] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X];
    return "#" + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
  };
  return { hi: hsl(.09, -4), mid: hex, lo: hsl(-.1, 3), deep: hsl(-.2, 6) };
}
/** 箱（正面と、右の側面・上面を少し見せる）。x,y は正面の左上、dx,dy は奥行きの向き */
export const box = (p: Pal, x: number, y: number, w: number, h: number, dx = 6, dy = -4) =>
  poly(p.lo, [[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]]) +
  poly(p.hi, [[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]]) +
  slab(p.mid, p.lo, [x, y, x + w, y + h]);
/** 円柱を縦に帯で割る（左が明るい）。cx は中心、y0〜y1 の高さ、r は半径、n は帯の数 */
export function cylinder(p: Pal, cx: number, y0: number, y1: number, r: number, n = 6, top = true) {
  let o = "";
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n, x0 = cx - Math.cos(a0) * r, x1 = cx - Math.cos(a1) * r;
    const t = (i + .5) / n, c = t < .25 ? p.hi : t < .55 ? p.mid : t < .8 ? p.lo : p.deep;
    o += poly(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  }
  if (top) o += poly(p.hi, ngon(cx, y0, r, 10).map(([x, y]) => [x, y0 + (y - y0) * .3] as Pt));
  return o;
}
/** 葉（細長い菱形を 2 枚の三角で）。a は向き（度、0 で上） */
export function leaf(a: string, b: string, x: number, y: number, len: number, wid: number, deg: number) {
  const r = deg * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), px = -uy, py = ux;
  const tip: Pt = [x + ux * len, y + uy * len], m: Pt = [x + ux * len * .45, y + uy * len * .45];
  return poly(a, [[x, y], [m[0] + px * wid, m[1] + py * wid], tip]) + poly(b, [[x, y], tip, [m[0] - px * wid, m[1] - py * wid]]);
}
/** 楕円の弧の頂点（a0〜a1 ラジアン、n 分割。0 が右、π/2 が下） */
export const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt; });
