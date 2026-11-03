// 窓枠（ケーシング）と下の桟を、棚の素材（<html data-shelf>）に合わせて描く
// 色は棚と同じ CSS 変数（--wood / --wood-hi / --wood-lo / --side-c）から取り、棚と同じく三角の面で組む
// 形は時間で変わらないので、寸法と色が同じあいだは裏のキャンバスに描いたものを使い回す
import { css } from "./modctx";
import { type RGB, mixN, rgba, rnd } from "./window-scenes";

export interface FrameBox { W: number; H: number; d: number; X0: number; X1: number; Y1: number; ox0: number; ox1: number; oy0: number; oy1: number; sh: number }

const parse = (s: string, fb: RGB): RGB => {
  s = s.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  if (/^#[0-9a-f]{3}$/i.test(s)) return [1, 2, 3].map(i => parseInt(s[i] + s[i], 16));
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) { const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (v.length >= 3 && v.every(n => !isNaN(n))) return v.slice(0, 3); }
  return fb;
};

export interface Material { wood: RGB; hi: RGB; lo: RGB; side: RGB; key: string }
export function material(): Material {
  const skin = document.documentElement.dataset.shelf || "lowpoly";
  const wood = parse(css("--wood", "#6d4b33"), [109, 75, 51]), hi = parse(css("--wood-hi", "#9a6e4c"), [154, 110, 76]), lo = parse(css("--wood-lo", "#3b281b"), [59, 40, 27]);
  const side = parse(css("--side-c", ""), lo);
  return { wood, hi, lo, side, key: [skin, wood, hi, lo, side].join("|") };
}

let cache: { key: string; c: HTMLCanvasElement } | null = null;

/** 外枠と下の桟を描く（サッシの上、カーテンの下） */
export function drawFrame(g: CanvasRenderingContext2D, b: FrameBox, M: Material) {
  const key = `${M.key}|${b.W}x${b.H}|${b.d}|${b.X0}|${b.ox0}|${b.oy0}|${b.oy1}|${b.sh}`;
  if (!cache || cache.key !== key) {
    const c = cache?.c ?? document.createElement("canvas");
    c.width = b.W; c.height = b.H;
    const o = c.getContext("2d")!;
    o.clearRect(0, 0, b.W, b.H);
    paint(o, b, M);
    cache = { key, c };
  }
  g.drawImage(cache.c, 0, 0);
}

function paint(g: CanvasRenderingContext2D, b: FrameBox, M: Material) {
  const { W, H, d, X0, X1, Y1, ox0, ox1, oy0, oy1, sh } = b;
  const { wood, hi, lo, side } = M;
  const C = (c: RGB, a = 1) => rgba(c, a);
  const casing = () => { g.beginPath(); g.rect(X0, 0, X1 - X0, Y1); g.rect(ox0, oy0, ox1 - ox0, oy1 - oy0); };
  const cw = ox0 - X0, bev = Math.max(d, cw * .26); // 開口まわりの面取りの幅
  const quad = (p: number[], fill: string | CanvasGradient) => { g.fillStyle = fill; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
  // 開口の内側の面取り: 上は下を向くので暗く、下は上を向くので明るい。左は光を受け、右は陰
  const chamfer = (top: string, left: string, right: string, bottom: string) => {
    const a = ox0 - bev, bx = ox1 + bev, cy = oy0 - bev, dy = oy1 + bev * .6;
    quad([a, cy, bx, cy, ox1, oy0, ox0, oy0], top);
    quad([a, cy, ox0, oy0, ox0, oy1, a, dy], left);
    quad([bx, cy, bx, dy, ox1, oy1, ox1, oy0], right);
    quad([a, dy, ox0, oy1, ox1, oy1, bx, dy], bottom);
  };
  const sy = Y1, topH = sh * .38;

  {
    // ---- 棚板と同じく、木の色を段に分けた三角の面で組む ----
    const pal = [mixN(hi, [255, 255, 255], .12), hi, mixN(hi, wood, .5), wood, mixN(wood, side, .5), side, mixN(side, lo, .5), lo];
    const pick = (light: number, i: number, j: number, s: number) => { // light: 0 = 明るい .. 1 = 暗い
      const k = Math.round(light * (pal.length - 1) + (rnd(i * 7 + s, j * 13 + s) - .5) * 1.6);
      return C(pal[Math.max(0, Math.min(pal.length - 1, k))]);
    };
    const facets = (x0: number, y0: number, x1: number, y1: number, cell: number, light: (u: number, v: number) => number, seed: number) => {
      const nx = Math.max(1, Math.round((x1 - x0) / cell)), ny = Math.max(1, Math.round((y1 - y0) / cell));
      const P = (i: number, j: number): [number, number] => {
        const jx = i > 0 && i < nx ? (rnd(i + seed, j * 3 + 1) - .5) * .7 : 0, jy = j > 0 && j < ny ? (rnd(i * 5 + seed, j + 2) - .5) * .7 : 0;
        return [x0 + (x1 - x0) * (i + jx) / nx, y0 + (y1 - y0) * (j + jy) / ny];
      };
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const a = P(i, j), bb = P(i + 1, j), c = P(i + 1, j + 1), e = P(i, j + 1), flip = rnd(i + seed, j + 9) < .5;
        const t1 = flip ? [a, bb, c] : [a, bb, e], t2 = flip ? [a, c, e] : [bb, c, e];
        for (const [n, t] of [[0, t1], [1, t2]] as const) {
          const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
          const f = pick(light((cx - x0) / (x1 - x0), (cy - y0) / (y1 - y0)), i * 2 + n, j, seed);
          g.fillStyle = f; g.strokeStyle = f; g.lineWidth = d * .5; g.lineJoin = "round";
          g.beginPath(); g.moveTo(t[0][0], t[0][1]); g.lineTo(t[1][0], t[1][1]); g.lineTo(t[2][0], t[2][1]); g.closePath(); g.fill(); g.stroke();
        }
      }
    };
    const cell = Math.max(10 * d, cw * 2.4);
    g.save(); casing(); g.clip("evenodd");
    // 枠は左上から光が来る: 上と左は明るめ、右と下は暗め
    facets(X0, 0, X1, oy0, cell, u => .3 + u * .2, 11);
    facets(X0, oy0, ox0, Y1, cell, (_, v) => .35 + v * .1, 23);
    facets(ox1, oy0, X1, Y1, cell, (_, v) => .5 + v * .1, 37);
    facets(ox0, oy1, ox1, Y1, cell, u => .45 + u * .1, 41);
    chamfer(C(pal[6]), C(pal[2]), C(pal[5]), C(pal[1]));
    g.restore();
    g.strokeStyle = C(lo, .9); g.lineWidth = d; g.strokeRect(ox0 + d / 2, oy0 + d / 2, ox1 - ox0 - d, oy1 - oy0 - d);
    // 下の桟: 上の面は明るい段、手前の面は中から暗い段の三角
    g.save(); g.beginPath(); g.rect(0, sy, W, H - sy); g.clip();
    facets(0, sy, W, sy + topH, Math.max(8 * d, topH * 4), () => .2, 53);
    facets(0, sy + topH, W, H, Math.max(10 * d, (sh - topH) * 2.5), (_, v) => .45 + v * .3, 67);
    g.restore();
    g.fillStyle = C(pal[0], .9); g.fillRect(0, sy, W, Math.max(1, d * .6));
    g.fillStyle = C(lo, .9); g.fillRect(0, sy + topH, W, d * .8);
    const skin = document.documentElement.dataset.shelf;
    const tri = (c: string, p: number[]) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.lineTo(p[4], p[5]); g.closePath(); g.fill(); };
    if (skin === "lowpoly-snow") {
      // 棚と同じく、上の面に積もった雪と、桟の下のつらら
      const whites = ["#f4f7fb", "#e6edf5", "#dbe5f0", "#ffffff"];
      const cap = (x0: number, x1: number, y: number, hgt: number, seed: number) => {
        const n = Math.max(3, Math.round((x1 - x0) / (14 * d)));
        g.fillStyle = "#e6edf5"; g.fillRect(x0, y, x1 - x0, hgt * .45);
        for (let i = 0; i < n; i++) {
          const a = x0 + (x1 - x0) * i / n, b2 = x0 + (x1 - x0) * (i + 1) / n, top = y - hgt * (.5 + rnd(i, seed) * .7), mid = (a + b2) / 2 + (rnd(i, seed + 1) - .5) * (b2 - a) * .5;
          tri(whites[i % 4], [a, y + hgt * .35, b2, y + hgt * .35, mid, top]);
          tri(whites[(i + 2) % 4], [a, y + hgt * .35, mid, top, a - (b2 - a) * .2, y]);
        }
      };
      cap(X0, X1, d * 1.5, Math.max(2 * d, cw * .25), 301);
      cap(0, W, sy + d * .5, Math.max(3 * d, topH * 1.1), 311);
    } else if (skin === "lowpoly-moss") {
      // 桟の上と枠の下の角に、三角の苔のかたまり
      const greens = ["#6f8f3a", "#5f7f33", "#86a447", "#4f6d2c"];
      const tuft = (x: number, y: number, r: number, seed: number) => {
        for (let k = 0; k < 6; k++) {
          const a = rnd(k, seed) * Math.PI, rr = r * (.5 + rnd(k, seed + 1) * .6), cx = x + (rnd(k, seed + 2) - .5) * r * 2.2;
          tri(greens[k % 4], [cx - rr, y + r * .2, cx + rr, y + r * .2, cx + Math.cos(a) * rr * .4, y - rr * (.5 + rnd(k, seed + 3) * .6)]);
        }
      };
      for (let i = 0; i < 5; i++) tuft(W * (.08 + .21 * i + rnd(i, 331) * .08), sy + topH * .4, Math.max(4 * d, topH * 1.6) * (.6 + rnd(i, 332) * .6), 340 + i * 10);
      tuft(X0 + cw * .6, Y1 - d, cw * .45, 400); tuft(X1 - cw * .6, Y1 - d, cw * .4, 410); tuft(X0 + cw * .9, d * 2, cw * .3, 420);
    }
  }
}
