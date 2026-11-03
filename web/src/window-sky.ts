// 窓の外の空と、その下の景色をまとめて描く
// 空は時刻の色の階調（天頂・中ほど・地平線）に、太陽のまわりの光の暈、地平線の霞を重ねる
// 雲は小物と同じローポリ: いくつかの丸い房を三角の面に割り、太陽の側の面を明るく、下と陰の面を空の色で暗くする

import { type RGB, type SceneKey, type View, hex, mixN, rgba, rnd, clamp, lightOf, seasonAt, drawScene, precipitation, snowfall, glow } from "./window-scenes";

// 時刻（0〜24）ごとの空の色（上・下）
const SKY: [number, string, string][] = [
  [0, "#070a12", "#121827"], [4.5, "#0b1020", "#1c2236"], [5.5, "#2a3050", "#c98a6b"], [6.5, "#5d7fa8", "#f0c590"],
  [8, "#5f93c8", "#c3d7e8"], [16, "#5a8cc0", "#cad9e4"], [17.5, "#4a5f8f", "#e9a26c"], [18.5, "#262c4e", "#b8664f"],
  [19.5, "#0f1426", "#2a2a44"], [24, "#070a12", "#121827"],
];
export function skyAt(h: number): [RGB, RGB] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return [mixN(t0, t1, t), mixN(b0, b1, t)]; }
  }
  return [hex(SKY[0][1]), hex(SKY[0][2])];
}
/** 太陽の位置（ガラスに対する u・v と高さ el 0〜1）。沈んでいれば null */
export function sunAt(h: number): { u: number; v: number; el: number } | null {
  const p = (h - 6) / 12;
  if (p <= 0 || p >= 1) return null;
  const el = Math.sin(Math.PI * p);
  return { u: .08 + .84 * p, v: .82 - .62 * el, el };
}

// 星の位置は固定（毎回同じ空）
const STARS = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 97.13 + n * 13.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2) * .7, s: .4 + r(3) * r(3) * 1.4, tw: r(4) * 6.28 };
});
// 雲: 高さ・大きさ・速さと、房（中心 x・y と半径）の並び
const CLOUDS = Array.from({ length: 7 }, (_, i) => {
  const n = 4 + Math.floor(rnd(i, 5) * 4);
  return {
    y: .07 + rnd(i, 1) * .38, s: .5 + rnd(i, 2) * .8, v: .004 + rnd(i, 3) * .006, o: i / 7 * 1.4 + rnd(i, 4) * .15,
    puffs: Array.from({ length: n }, (_, k) => {
      const c = (k + .5) / n, r = .28 + Math.sin(c * Math.PI) * .32 + rnd(i * 7 + k, 8) * .14;
      return { x: (c - .5) * n * .5 + (rnd(i * 7 + k, 6) - .5) * .15, y: -r * .62 - rnd(i * 7 + k, 7) * .08, r, seed: i * 31 + k };
    }),
  };
});

let skyCache: { key: string; c: HTMLCanvasElement } | null = null;

export interface Box { ox0: number; oy0: number; ox1: number; oy1: number; gx0: number; gy0: number; gw: number; gh: number }
export interface OutsideOpts { g: CanvasRenderingContext2D; d: number; t: number; now: Date; h: number; wet: number; calm: boolean; accent: string; key: SceneKey; box: Box; before?: (V: View) => void }

/** 窓の開口の内側に、空と景色と降るものを描く。描いた景色の View を返す */
export function drawOutside(o: OutsideOpts): View {
  const { g, d, t, h, wet, calm, box: B } = o;
  const night = h < 5 || h > 19.5 ? 1 : h < 6 ? 6 - h : h > 18.5 ? h - 18.5 : 0, day = 1 - night;
  const X = (u: number) => B.gx0 + u * B.gw, Y = (v: number) => B.gy0 + v * B.gh;
  const [top0, bottom0] = skyAt(h);
  // 雨の日は空が灰色に曇り、少し暗くなる
  const grey = (c: RGB) => { const m = (c[0] + c[1] + c[2]) / 3; return mixN(c, [m * .82, m * .85, m * .9], .7 * wet); };
  const top = grey(top0), bottom = grey(bottom0);
  const W = B.ox1 - B.ox0, H = B.oy1 - B.oy0;

  // 太陽と月は弧を描いて横切る
  const arc = (p: number) => ({ x: X(.08 + .84 * p), y: Y(.82 - .62 * Math.sin(Math.PI * p)) });
  const sunP = (h - 6) / 12, moonP = ((h + 6) % 24) / 12;
  let sun: View["sun"] = null, moon: View["moon"] = null;
  if (sunP > 0 && sunP < 1) { const { x, y } = arc(sunP); sun = { x, y, low: 1 - Math.sin(Math.PI * sunP) }; }
  else if (moonP > 0 && moonP < 1) { const { x, y } = arc(moonP); moon = { x, y, low: 1 - Math.sin(Math.PI * moonP) }; }
  const Vbase = { g, d, t, h, X, Y, gw: B.gw, gh: B.gh, x0: B.ox0, x1: B.ox1, y1: B.oy1, night, day, wet, top, bottom, accent: o.accent, calm, season: seasonAt(o.now), sun, moon };
  const V: View = { ...Vbase, lt: lightOf(Vbase) };
  // 空と雲は動きがゆっくりなので、0.5 秒ごとに裏のキャンバスへ描いて使い回す
  const cw = g.canvas.width, ch = g.canvas.height;
  const ck = [cw, ch, B.ox0, B.oy0, B.ox1, B.oy1, B.gw, B.gh, Math.round(h * 120), Math.round(wet * 30), calm ? 0 : Math.floor(t * 2)].join("|");
  if (!skyCache || skyCache.key !== ck) {
    const c = skyCache?.c ?? document.createElement("canvas");
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const sg = c.getContext("2d")!;
    sg.clearRect(0, 0, cw, ch);
    paintSky(sg);
    clouds({ ...V, g: sg });
    skyCache = { key: ck, c };
  }
  g.drawImage(skyCache.c, 0, 0);
  function paintSky(g: CanvasRenderingContext2D) {
  // 空の階調: 天頂は深く、地平線に近いほど白っぽく明るい
  const sky = g.createLinearGradient(0, B.oy0, 0, Y(.72));
  sky.addColorStop(0, rgba(mixN(top, [0, 0, 0], .08 * day)));
  sky.addColorStop(.45, rgba(mixN(top, bottom, .38)));
  sky.addColorStop(.85, rgba(bottom));
  sky.addColorStop(1, rgba(mixN(bottom, [255, 255, 255], .1 * day * (1 - wet))));
  g.fillStyle = sky; g.fillRect(B.ox0, B.oy0, W, H);

  if (night > 0) {
    for (const s of STARS) {
      const a = night * (.35 + .35 * Math.sin(t * .8 + s.tw)) * (1 - s.y * .8) * (1 - wet * .9);
      if (a < .02) continue;
      g.fillStyle = rgba([244, 238, 222], a); g.fillRect(X(s.x), Y(s.y), s.s * d, s.s * d);
    }
  }
  // 太陽のまわりの光の暈（低いほど大きく暖かい）と、夕方・朝の地平線の染まり
  g.globalCompositeOperation = "screen";
  if (sun) {
    const low = sun.low, r = B.gh * (.5 + .7 * low), c = mixN([255, 244, 214], [255, 150, 80], low ** 1.5);
    glow(g, sun.x, sun.y, r, c, (.22 + .3 * low) * (1 - wet * .8));
    const band = g.createRadialGradient(sun.x, Y(.7), 0, sun.x, Y(.7), B.gw * .9);
    band.addColorStop(0, rgba(c, .28 * low * low * (1 - wet))); band.addColorStop(1, rgba(c, 0));
    g.fillStyle = band; g.fillRect(B.ox0, B.oy0, W, H);
  }
  if (moon) glow(g, moon.x, moon.y, B.gh * .3, [190, 200, 230], .12 * night * (1 - wet * .8));
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1 - .9 * wet;
  if (sun) {
    const r = Math.max(4 * d, B.gh * .05);
    g.fillStyle = rgba(mixN([255, 250, 232], [255, 196, 120], sun.low ** 1.5)); g.beginPath(); g.arc(sun.x, sun.y, r, 0, Math.PI * 2); g.fill();
    glow(g, sun.x, sun.y, r * 2.4, [255, 250, 230], .7);
  } else if (moon) {
    const mr = Math.max(4 * d, B.gh * .045);
    g.fillStyle = "#efe8d6"; g.beginPath(); g.arc(moon.x, moon.y, mr, 0, Math.PI * 2); g.fill();
    // 月の海（うっすらとした模様）
    g.fillStyle = "rgba(160,160,150,.25)";
    for (const [a, b, r] of [[-.3, -.2, .3], [.15, .1, .25], [-.05, .35, .2]]) { g.beginPath(); g.arc(moon.x + a * mr, moon.y + b * mr, r * mr, 0, Math.PI * 2); g.fill(); }
    // 欠けた部分は、その高さの空の色で塗る
    g.save(); g.beginPath(); g.arc(moon.x, moon.y, mr + d, 0, Math.PI * 2); g.clip();
    g.fillStyle = rgba(mixN(top, bottom, clamp((moon.y - B.oy0) / (Y(.72) - B.oy0)) * .6));
    g.beginPath(); g.arc(moon.x + mr * .45, moon.y - mr * .2, mr * .85, 0, Math.PI * 2); g.fill(); g.restore();
    glow(g, moon.x, moon.y, mr * 3, [240, 232, 210], .18 * night);
  }
  g.globalAlpha = 1;

  }
  // ときどき鳥が横切る（昼だけ）
  if (day > .6 && !calm && wet < .2) {
    const cyc = 46, k = (t % cyc) / 9;
    if (k < 1) for (let b = 0; b < 3; b++) {
      const bx = X(-.05 + k * 1.1 - b * .035), by = Y(.3 + b * .03 + Math.sin(k * 9 + b) * .01), fl = Math.sin(t * 9 + b * 2) * 2 * d;
      g.fillStyle = rgba(mixN([40, 44, 52], top, .3), .8);
      g.beginPath(); g.moveTo(bx - 3.2 * d, by - fl); g.lineTo(bx, by - .6 * d); g.lineTo(bx + 3.2 * d, by - fl); g.lineTo(bx, by + .5 * d); g.closePath(); g.fill();
    }
  }
  // 地上の景色と、外に降る雨・雪
  drawScene(o.key, V);
  o.before?.(V);
  const pr = precipitation(o.key, V);
  if (pr.kind === "snow") { if (pr.amt > .02) snowfall(V, pr.amt); }
  else if (wet > .02) {
    // 雨脚: 遠い細い筋と、手前の太く速い筋
    for (const [n, a, len, lw] of [[110, .16, .07, .6], [40, .24, .14, 1]] as const) {
      g.strokeStyle = rgba(mixN([215, 222, 235], V.lt.haze, .3), a * wet); g.lineWidth = Math.max(.5, lw * d);
      g.beginPath();
      for (let i = 0; i < Math.round(n * wet); i++) {
        const x = X(rnd(i, 21 + lw) * 1.1 - .05), sp = (1.6 + rnd(i, 22)) * (lw + .4), y = Y((((rnd(i, 23 + lw) + (calm ? 0 : t * sp * .9)) % 1.2) - .1));
        const L = B.gh * len * (.6 + rnd(i, 24) * .4);
        g.moveTo(x, y); g.lineTo(x - L * .12, y + L);
      }
      g.stroke();
    }
  }
  return V;
}

/** ローポリの雲 */
function clouds(V: View) {
  const { t, X, Y, gh, wet, night, day, calm } = V;
  const sun = V.sun ?? V.moon, low = V.sun?.low ?? .3;
  // 光と陰の色: 昼は白と青灰、朝夕は光の側が橙・桃色に、夜は月明かりの灰青
  let litC: RGB = mixN([255, 255, 255], [255, 178, 120], low ** 2 * day);
  let shadeC: RGB = mixN(mixN(V.top, [150, 156, 170], .5), [120, 96, 120], low ** 2 * day * .6);
  litC = mixN(litC, [70, 78, 98], night * .9); shadeC = mixN(shadeC, [22, 26, 40], night * .85);
  const ovc: RGB = mixN([150, 154, 162], [38, 42, 52], night);
  litC = mixN(litC, mixN(ovc, [255, 255, 255], .25), wet * .8); shadeC = mixN(shadeC, mixN(ovc, [0, 0, 0], .25), wet * .8);
  const alpha = .92 - .15 * night;
  // 雨の日は、低く垂れこめた雲が空を覆う: なめらかな灰色の層に、明暗の差の小さい房をいくつも重ねる
  if (wet > .02) {
    const deck = V.g.createLinearGradient(0, Y(-.1), 0, Y(.62));
    deck.addColorStop(0, rgba(mixN(ovc, [0, 0, 0], .18), wet * .95)); deck.addColorStop(.7, rgba(ovc, wet * .85)); deck.addColorStop(1, rgba(ovc, 0));
    V.g.fillStyle = deck; V.g.fillRect(V.x0, Y(-.2), V.x1 - V.x0, Y(.62) - Y(-.2));
    const l2 = mixN(ovc, [255, 255, 255], .12), s2 = mixN(ovc, [0, 0, 0], .12);
    for (let i = 0; i < 18; i++) {
      const u = (i / 17) * 1.3 - .15 + (calm ? 0 : (t * .002) % .1), v = .05 + rnd(i, 71) * .42, r = .07 + rnd(i, 72) * .06;
      cloud(V, X(u), Y(v), gh * r, mixN(l2, V.bottom, v * .5), mixN(s2, V.bottom, v * .5), [{ x: -.6, y: -.2, r: .7, seed: 540 + i }, { x: 0, y: -.35, r: 1, seed: 500 + i }, { x: .7, y: -.25, r: .8, seed: 520 + i }], sun, wet * .7);
    }
  }
  for (const cl of CLOUDS) {
    const u = ((cl.o + (calm ? 0 : t * cl.v * .2)) % 1.4) - .2, sz = gh * .1 * cl.s;
    // 地平線に近い雲ほど小さく、霞む
    const a = alpha * (1 - cl.y * .4) * (1 - wet * .3);
    const far = cl.y * .8;
    cloud(V, X(u), Y(cl.y), sz * (1 - far * .3), mixN(litC, V.bottom, far * .4), mixN(shadeC, V.bottom, far * .4), cl.puffs, sun, a);
  }
  void Y;
}
function cloud(V: View, cx: number, cy: number, sz: number, litC: RGB, shadeC: RGB, puffs: { x: number; y: number; r: number; seed: number }[], sun: { x: number; y: number } | null, a: number) {
  const { g } = V;
  if (a < .02) return;
  const sd = sun ? (() => { const dx = sun.x - cx, dy = sun.y - cy, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })() : [0, -1];
  // 雲の下の面: 平らな底
  const xs = puffs.map(p => p.x), x0 = cx + (Math.min(...xs) - .3) * sz * 1.4, x1 = cx + (Math.max(...xs) + .3) * sz * 1.4;
  g.globalAlpha = a;
  const fc = (p: number[], c: RGB) => { g.fillStyle = g.strokeStyle = rgba(c); g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); g.lineWidth = .6; g.stroke(); };
  fc([x0, cy, x0 + sz * .3, cy - sz * .25, x1 - sz * .3, cy - sz * .25, x1, cy, x1 - sz * .4, cy + sz * .08, x0 + sz * .4, cy + sz * .08], mixN(shadeC, [0, 0, 0], .05));
  // 房: 後ろ（低い房）から順に、7 角形を中心から三角に割る
  const order = [...puffs].sort((p, q) => q.y - p.y);
  for (const p of order) {
    const px = cx + p.x * sz * 1.4, py = cy + p.y * sz, r = p.r * sz, n = 7, rot = rnd(p.seed, 1) * 6.28;
    const pts = Array.from({ length: n }, (_, i) => { const ang = rot + i / n * Math.PI * 2, rr = r * (.88 + .2 * rnd(p.seed, i + 2)); return [px + Math.cos(ang) * rr, Math.min(cy, py + Math.sin(ang) * rr * .85)]; });
    const ccx = px - sd[0] * r * .15, ccy = py - r * .2;
    for (let i = 0; i < n; i++) {
      const q = pts[i], w = pts[(i + 1) % n], mx = (q[0] + w[0]) / 2 - px, my = (q[1] + w[1]) / 2 - py, l = Math.hypot(mx, my) || 1;
      // 太陽の側と上を向いた面ほど明るい
      const k = clamp(.5 + .45 * ((mx * sd[0] + my * sd[1]) / l) + .3 * (-my / l) - .1);
      fc([ccx, ccy, q[0], q[1], w[0], w[1]], mixN(shadeC, litC, k));
    }
  }
  g.globalAlpha = 1;
}
