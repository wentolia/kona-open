// 窓辺: いまの時刻の空を、部屋の窓から見る。朝焼け・昼・夕焼け・夜（星と月）が時間とともに移る

import { css, ctx, fit, everyFrame } from "./modctx";
import { noiseLevel } from "./noise";
import { reduceMotion, prefs as konaPrefs } from "./prefs";
import { type Bird, newBird, stepBird, drawBird, publishBird } from "./window-bird";
import { type RGB, type SceneKey, type View, hex, mixN, rgba, mix, rnd, SCENES, DAILY, dailyScene, seasonAt, drawScene, precipitation, snowfall, deepNight, drawLaundry } from "./window-scenes";

// 設定: 雨（設定で降らせるか、「出力」で雨の音を重ねているときに降る）と、外の景色
const KEY = "kona.window";
interface WindowPrefs { rain?: boolean; scene?: string; room?: boolean }
const prefs = (): WindowPrefs => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const savePrefs = (p: WindowPrefs) => { try { localStorage.setItem(KEY, JSON.stringify({ ...prefs(), ...p })); } catch { /* 保存できなくても動く */ } };
export const windowRain = () => !!prefs().rain;
export const setWindowRain = (on: boolean) => savePrefs({ rain: on });
/** 選べる景色（日替わりを含む） */
export const WINDOW_SCENES: { key: string; label: string }[] = [...SCENES, { key: DAILY, label: "日替わり" }];
export const windowScene = () => { const s = prefs().scene; return WINDOW_SCENES.some(x => x.key === s) ? s! : "city"; };
export const setWindowScene = (key: string) => savePrefs({ scene: key });
/** 部屋の明かりも時刻に合わせて変えるか（既定は変える） */
export const roomLightOn = () => prefs().room !== false;
export const setRoomLight = (on: boolean) => savePrefs({ room: on });
export const currentScene = (): SceneKey => { const s = windowScene(); return s === DAILY ? dailyScene() : s as SceneKey; };

// ガラスについた雨粒（ガラスの幅・高さに対する位置と大きさ）。大きい粒はやがて流れ落ち、跡を残す
interface Drop { u: number; v: number; r: number; vy: number; top: number; life: number; wob: number }
interface Rain { amt: number; drops: Drop[]; env: number; slow: number; lastOn: number; rate: number; carry: number; t: number }

// 時刻（0〜24）ごとの空の色（上・下）
const SKY: [number, string, string][] = [
  [0, "#070a12", "#121827"], [4.5, "#0b1020", "#1c2236"], [5.5, "#2a3050", "#c98a6b"], [6.5, "#5d7fa8", "#f0c590"],
  [8, "#6f9ccc", "#bcd3e6"], [16, "#6a94c4", "#c7d6e2"], [17.5, "#4a5f8f", "#e9a26c"], [18.5, "#262c4e", "#b8664f"],
  [19.5, "#0f1426", "#2a2a44"], [24, "#070a12", "#121827"],
];


export function skyAt(h: number): [RGB, RGB] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return [mixN(t0, t1, t), mixN(b0, b1, t)]; }
  }
  return [hex(SKY[0][1]), hex(SKY[0][2])];
}

// 星の位置は固定（毎回同じ空）
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 97.13 + n * 13.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2) * 0.75, s: 0.5 + r(3), tw: r(4) * 6.28 };
});

// 深夜の星空: 細かな星と、天の川の帯の中の星（固定の乱数）
const FAINT = Array.from({ length: 260 }, (_, i) => ({ x: rnd(i, 401), y: rnd(i, 402) * .85, s: .35 + rnd(i, 403) * .6, tw: rnd(i, 404) * 6.28 }));
const MILKY = Array.from({ length: 320 }, (_, i) => {
  const k = rnd(i, 411), off = (rnd(i, 412) + rnd(i, 413) + rnd(i, 414) - 1.5) * .09; // 帯の中心に集まる
  return { x: -.1 + k * 1.2 + off * .5, y: .05 + k * .55 + off, s: .3 + rnd(i, 415) * .5, a: .3 + rnd(i, 416) * .5 };
});

// 雲: 高さ・大きさ・速さ・形（固定の乱数）
const CLOUDS = Array.from({ length: 6 }, (_, i) => ({
  y: .08 + rnd(i, 1) * .4, s: .5 + rnd(i, 2) * .8, v: .004 + rnd(i, 3) * .006, o: i / 6 * 1.4 + rnd(i, 4) * .15,
  puffs: Array.from({ length: 4 + Math.floor(rnd(i, 5) * 3) }, (_, k, ) => [k * .55 - 1 + rnd(i * 7 + k, 6) * .25, -.1 - Math.sin((k + .5) / 5 * Math.PI) * .35 - rnd(i * 7 + k, 7) * .2, .3 + rnd(i * 7 + k, 8) * .25]),
}));
/** 窓の下の桟の高さ（css px）。猫はここに座る */
export const SILL = 12;

// 窓の結露: 寒い朝や雪国の夜、ガラスの内側が白く曇る。指（マウス・タッチ）でなぞると拭えて、文字や絵が描ける
// 拭った跡は時間とともにまた曇っていく（線ごとに描いた時刻を持ち、毎フレーム薄くして描き直す）
interface Fog { amt: number; strokes: { pts: number[]; t: number }[]; glass: number[]; canvas?: HTMLCanvasElement }
const FOG_BACK = 75; // 拭った跡が曇りに戻るまでの秒数
export const frostAt = (h: number, winter: number, snow: boolean, night: number) => {
  const cold = Math.min(1, Math.max(0, winter * 1.4 - .35) + (snow ? .45 : 0));
  return cold * Math.max(Math.exp(-(((h - 7.3) / 2.2) ** 2)), .65 * night);
};

export function mountWindow(body: HTMLElement) {
  body.innerHTML = `<div class="win"><canvas class="win-canvas" aria-label="窓"></canvas></div>`;
  const root = body.querySelector<HTMLElement>(".win")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  let sway = 0, last = performance.now();
  const rain: Rain = { amt: 0, drops: [], env: 0, slow: 0, lastOn: 0, rate: 1, carry: 0, t: 0 };
  const fog: Fog = { amt: 0, strokes: [], glass: [0, 0, 1, 1] };
  const bird: Bird = newBird();
  // 猫が近づくなどで "kona:bird-scare" が流れたら、驚いて飛び去る
  const scare = () => { if (!root.isConnected) { document.removeEventListener("kona:bird-scare", scare); return; } bird.scared = true; };
  document.addEventListener("kona:bird-scare", scare);
  // なぞって拭う: 曇っているときだけ、ガラスの上の操作を受け取る（猫やモジュールの移動には渡さない）
  let drawing: { pts: number[]; t: number } | null = null;
  const toGlass = (e: PointerEvent): [number, number] | null => {
    const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1, [gx, gy, gw, gh] = fog.glass;
    const u = ((e.clientX - r.left) * d - gx) / gw, v = ((e.clientY - r.top) * d - gy) / gh;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [u, v] : null;
  };
  canvas.addEventListener("pointerdown", e => {
    const p = fog.amt > .15 ? toGlass(e) : null;
    if (!p) return;
    e.preventDefault(); e.stopPropagation(); canvas.setPointerCapture(e.pointerId);
    drawing = { pts: [...p, ...p], t: performance.now() / 1000 }; fog.strokes.push(drawing);
    if (fog.strokes.length > 300) fog.strokes.shift();
  });
  canvas.addEventListener("pointermove", e => {
    canvas.style.cursor = fog.amt > .15 && toGlass(e) ? "crosshair" : "";
    if (!drawing) return;
    const p = toGlass(e); if (!p) return;
    drawing.pts.push(...p); drawing.t = performance.now() / 1000;
  });
  const end = () => { drawing = null; };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  everyFrame(root, () => {
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    // カーテンは音に合わせて、ほんの少しだけ揺れる
    const p = ctx().player, [l, r] = p.playing ? p.levels() : [0, 0];
    sway += (Math.min(1, (l + r) * 1.4) - sway) * (1 - Math.exp(-dt / .8));
    stepRain(rain, dt, (l + r) / 2, windowRain() || noiseLevel("rain") > 0);
    // 窓辺の鳥: 晴れた朝（6〜10時半ごろ）に来る
    const d = new Date(), hr = d.getHours() + d.getMinutes() / 60;
    stepBird(bird, dt, hr > 5.8 && hr < 10.5 && rain.amt < .1);
    fit(canvas); draw(canvas, sway, rain, fog, bird);
    const cr = canvas.getBoundingClientRect(), px = devicePixelRatio || 1, [gx, gy, gw, gh] = fog.glass;
    publishBird(bird, cr.left + (gx + bird.u * gw) / px, cr.top + (gy + bird.v * gh) / px);
  });
}

// 雨を進める。曲の拍（音の立ち上がり）の速さで雨粒の数が、音の大きさで粒の大きさが決まる。静かな曲ほど細かい
function stepRain(R: Rain, dt: number, level: number, on: boolean) {
  R.t += dt;
  R.amt += ((on ? 1 : 0) - R.amt) * (1 - Math.exp(-dt / 4));
  // 拍の検出: 速い包絡線が遅い包絡線を大きく上回った瞬間を数える
  R.env += (level - R.env) * (1 - Math.exp(-dt / .04));
  R.slow += (level - R.slow) * (1 - Math.exp(-dt / .9));
  let beat = false;
  if (R.env > R.slow * 1.3 && R.env > .015 && R.t - R.lastOn > .2) { beat = true; R.rate += (1 / Math.max(.2, R.t - R.lastOn) - R.rate) * .2; R.lastOn = R.t; }
  if (R.t - R.lastOn > 3) R.rate += (.6 - R.rate) * (1 - Math.exp(-dt / 3));
  const tempo = Math.max(.5, Math.min(5, R.rate));
  const loud = R.slow > 0 ? Math.max(0, Math.min(1, (20 * Math.log10(R.slow) + 42) / 36)) : 0;
  const size = (rnd: number) => (.006 + .016 * Math.pow(rnd, 2.2)) * (.45 + 1.1 * loud);
  const spawn = (n: number) => { for (let k = 0; k < n && R.drops.length < 320; k++) R.drops.push({ u: Math.random(), v: Math.random() * .98, r: size(Math.random()), vy: 0, top: 0, life: 1, wob: Math.random() * 6 }); };
  if (R.amt > .02) {
    R.carry += dt * R.amt * (5 + tempo * 5) * (1.4 - .6 * loud);
    const n = Math.floor(R.carry); R.carry -= n; spawn(n);
    if (beat) spawn(Math.round(R.amt * (1 + 2 * loud)));
  }
  for (const d of R.drops) {
    // 大きな粒は重さで流れ出す。流れながら小さな粒を拾って太る
    if (!d.vy && d.r > .014 && Math.random() < dt * .25) { d.vy = .02; d.top = d.v; }
    if (d.vy) { d.vy = Math.min(.5, d.vy + dt * d.r * 6); d.v += d.vy * dt * (.6 + .4 * Math.sin(R.t * 3 + d.wob)); d.u += Math.sin(R.t * 2 + d.wob) * dt * .002; }
    d.life -= dt * (R.amt < .5 ? .25 : .012) * (d.vy ? 0 : 1);
  }
  for (const d of R.drops) if (d.vy) for (const o of R.drops) if (o !== d && !o.vy && o.life > 0 && Math.abs(o.u - d.u) < d.r * .6 && Math.abs(o.v - d.v) < d.r) { d.r = Math.min(.03, Math.hypot(d.r, o.r)); o.life = 0; }
  R.drops = R.drops.filter(d => d.life > 0 && d.v < 1.05);
}

function draw(c: HTMLCanvasElement, sway: number, rain: Rain, fog: Fog, bird: Bird) {
  const g = c.getContext("2d")!, W = c.width, H = c.height, d = devicePixelRatio || 1, t = performance.now() / 1000;
  const now = new Date(), h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const calm = reduceMotion();
  const wood = css("--wood", "#6d4b33"), hi = css("--wood-hi", "#9a6e4c"), lo = css("--wood-lo", "#3b281b"), accent = css("--accent", "#f0b35e");
  g.clearRect(0, 0, W, H);
  if (W < 60 * d || H < 50 * d) return;

  // 寸法: 枠の太さ c、桟（下の出っ張り）の高さ sh、壁の厚み（奥行き）r
  const cw = Math.max(5 * d, Math.min(W, H) * .045), sh = SILL * d, over = cw * .7;
  const X0 = over, X1 = W - over, Y1 = H - sh;               // 外枠
  const ox0 = X0 + cw, ox1 = X1 - cw, oy0 = cw, oy1 = Y1 - cw * .5; // 開口
  const r = cw * .9, gx0 = ox0 + r, gx1 = ox1 - r, gy0 = oy0 + r, gy1 = oy1 - r * .4; // ガラス
  const gw = gx1 - gx0, gh = gy1 - gy0;
  const night = h < 5 || h > 19.5 ? 1 : h < 6 ? 6 - h : h > 18.5 ? h - 18.5 : 0;
  const day = 1 - night;

  // ---- 外の景色（ガラスの内側だけ） ----
  g.save(); g.beginPath(); g.rect(ox0, oy0, ox1 - ox0, oy1 - oy0); g.clip();
  const [top0, bottom0] = skyAt(h), wet = rain.amt;
  // 雨の日は空が灰色に曇り、少し暗くなる
  const grey = (c: RGB) => { const m = (c[0] + c[1] + c[2]) / 3; return mixN(c, [m * .8, m * .82, m * .88], .65 * wet); };
  const top = grey(top0), bottom = grey(bottom0);
  const sky = g.createLinearGradient(0, oy0, 0, oy1);
  sky.addColorStop(0, rgba(top)); sky.addColorStop(1, rgba(bottom));
  g.fillStyle = sky; g.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  const X = (u: number) => gx0 + u * gw, Y = (v: number) => gy0 + v * gh;

  if (night > 0) {
    g.fillStyle = "#f4ecd8";
    for (const s of STARS) {
      g.globalAlpha = night * (.3 + .3 * Math.sin(t * .8 + s.tw)) * (1 - s.y * .7);
      g.fillRect(X(s.x), Y(s.y * .8), s.s * d, s.s * d);
    }
    g.globalAlpha = 1;
  }
  // 深夜の星空: 天の川がかかり、細かな星が増え、ときどき流れ星が走る（雨の夜は見えない）
  const deep = (konaPrefs().stars ? deepNight(h) : 0) * night * (1 - wet); // 設定ページの「夜の星空」でオン・オフ
  if (deep > .01) drawStars(g, X, Y, gw, gh, d, t, deep, calm);
  // 太陽と月は弧を描いて横切る
  const arc = (p: number) => ({ x: X(.08 + .84 * p), y: Y(.82 - .62 * Math.sin(Math.PI * p)) });
  const sunP = (h - 6) / 12, moonP = ((h + 6) % 24) / 12;
  let sun: View["sun"] = null, moon: View["moon"] = null;
  g.globalAlpha = 1 - .85 * wet;
  if (sunP > 0 && sunP < 1) {
    const { x, y } = arc(sunP), low = 1 - Math.sin(Math.PI * sunP);
    sun = { x, y, low };
    g.fillStyle = mix("#fff1c9", "#ffb36b", low); g.shadowColor = mix("#ffe2a0", "#ff9a4a", low); g.shadowBlur = 26 * d;
    g.beginPath(); g.arc(x, y, Math.max(4 * d, gh * .065), 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
  } else if (moonP > 0 && moonP < 1) {
    const { x, y } = arc(moonP), mr = Math.max(4 * d, gh * .055);
    moon = { x, y, low: 1 - Math.sin(Math.PI * moonP) };
    g.fillStyle = "#efe6cf"; g.shadowColor = "#efe6cf"; g.shadowBlur = 16 * d;
    g.beginPath(); g.arc(x, y, mr, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    // 欠けた部分は、その高さの空の色で塗る（輪郭が浮かない）
    g.save(); g.beginPath(); g.arc(x, y, mr + d, 0, Math.PI * 2); g.clip();
    g.fillStyle = rgba(mixN(top, bottom, (y - oy0) / (oy1 - oy0)));
    g.beginPath(); g.arc(x + mr * .45, y - mr * .2, mr * .85, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.globalAlpha = 1;
  // 雲: ゆっくり流れる。朝夕は下から染まり、夜は暗い影になる
  for (const cl of CLOUDS) {
    const u = ((cl.o + (calm ? 0 : t * cl.v * .2)) % 1.4) - .2, cy = Y(cl.y), sz = gh * .11 * cl.s;
    const lit = g.createLinearGradient(0, cy - sz, 0, cy + sz * .4);
    lit.addColorStop(0, wet > .05 ? rgba(mixN([255, 255, 255], [96, 102, 112], wet), (.55 * day + .06) * (1 + wet * .6)) : `rgba(255,255,255,${(.55 * day + .06).toFixed(3)})`);
    lit.addColorStop(1, day > .1 ? rgba(mixN("#ffffff", bottom, .55), .4 * day + .05) : "rgba(120,130,150,.08)");
    g.fillStyle = lit; g.globalAlpha = 1 - .75 * deep;
    // 底は平らに、上はもこもこ
    g.save(); g.beginPath(); g.rect(X(u) - sz * 3, cy - sz * 2, sz * 6, sz * 2.15); g.clip();
    g.beginPath();
    const n = cl.puffs.length, x0 = X(u) + cl.puffs[0][0] * sz * 1.6, x1 = X(u) + cl.puffs[n - 1][0] * sz * 1.6;
    g.ellipse((x0 + x1) / 2, cy, (x1 - x0) / 2 + sz * .3, sz * .3, 0, 0, Math.PI * 2);
    for (const [px, py, pr] of cl.puffs) { const x = X(u) + px * sz * 1.6, y = cy + py * sz; g.moveTo(x + pr * sz, y); g.arc(x, y, pr * sz, 0, Math.PI * 2); }
    g.fill(); g.restore(); g.globalAlpha = 1;
  }
  // ときどき鳥が横切る（昼だけ）
  if (day > .6 && !calm && wet < .2) {
    const cyc = 46, k = (t % cyc) / 9;
    if (k < 1) for (let b = 0; b < 3; b++) {
      const bx = X(-.05 + k * 1.1 - b * .035), by = Y(.3 + b * .03 + Math.sin(k * 9 + b) * .01), fl = Math.sin(t * 9 + b * 2) * 2 * d;
      g.strokeStyle = "rgba(30,34,44,.55)"; g.lineWidth = d;
      g.beginPath(); g.moveTo(bx - 3 * d, by - fl); g.lineTo(bx, by); g.lineTo(bx + 3 * d, by - fl); g.stroke();
    }
  }
  // 地上の景色（選んだもの）と、外に降る雨・雪
  const key = currentScene();
  const V: View = { g, d, t, h, X, Y, gw, gh, x0: ox0, x1: ox1, y1: oy1, night, day, wet, top, bottom, accent, calm, season: seasonAt(now), sun, moon };
  drawScene(key, V);
  // 晴れた昼は洗濯物を干す（朝 9 時ごろ出して、夕方 4 時ごろ取り込む。雨や雪国では干さない）
  if (konaPrefs().laundry && key !== "snow") {
    const out = Math.min(Math.max(0, (h - 8.6) / .6), Math.max(0, (16.4 - h) / .6), 1) * Math.max(0, 1 - wet * 3) * (V.season.wi > .8 ? 0 : 1);
    drawLaundry(V, out);
  }
  drawBird(g, bird, X(bird.u), Y(bird.v), gh * .04, t, night + wet * .5, calm);
  const pr = precipitation(key, V);
  if (pr.kind === "snow") { if (pr.amt > .02) snowfall(V, pr.amt); }
  else if (wet > .02) {
    g.strokeStyle = `rgba(210,220,235,${(.22 * wet).toFixed(3)})`; g.lineWidth = Math.max(.6, .7 * d);
    g.beginPath();
    const n = Math.round(90 * wet), fall = gh * .09;
    for (let i = 0; i < n; i++) {
      const x = X(rnd(i, 21) * 1.1 - .05), sp = 1.6 + rnd(i, 22), y = Y((((rnd(i, 23) + t * sp * .9) % 1.2) - .1));
      g.moveTo(x, y); g.lineTo(x - fall * .12, y + fall * (.6 + rnd(i, 24) * .4));
    }
    g.stroke();
  }
  // ガラスについた雨粒と、流れた跡
  if (rain.drops.length) {
    const hiCol = night > .5 ? "rgba(255,226,180," : "rgba(255,255,255,";
    for (const dp of rain.drops) {
      const x = X(dp.u), y = Y(dp.v), rr = Math.max(.8 * d, dp.r * gh), a = Math.min(1, dp.life * 2);
      if (dp.vy && dp.v > dp.top) {
        g.strokeStyle = `rgba(255,255,255,${(.08 * a).toFixed(3)})`; g.lineWidth = rr * .7;
        g.beginPath(); g.moveTo(X(dp.u), Y(dp.top)); g.lineTo(x, y); g.stroke();
      }
      g.fillStyle = `rgba(200,212,228,${(.16 * a).toFixed(3)})`;
      g.beginPath(); g.ellipse(x, y, rr * .9, rr * (dp.vy ? 1.15 : 1), 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(0,0,0,${(.22 * a).toFixed(3)})`; g.lineWidth = Math.max(.5, rr * .22);
      g.beginPath(); g.arc(x, y, rr * .85, .2 * Math.PI, .8 * Math.PI); g.stroke();
      g.fillStyle = hiCol + (.6 * a).toFixed(3) + ")";
      g.beginPath(); g.arc(x - rr * .35, y - rr * .35, Math.max(.4 * d, rr * .28), 0, Math.PI * 2); g.fill();
    }
  }

  // 結露: ガラスの内側の白い曇り。なぞった跡は透け、時間とともにまた曇る
  fog.glass = [gx0, gy0, gw, gh];
  fog.amt += (frostAt(h, V.season.wi, key === "snow", night) - fog.amt) * .02;
  if (fog.amt > .01) drawFog(g, fog, gx0, gy0, gw, gh, d, t, night);
  else fog.strokes.length = 0;

  // ガラス: 斜めの映り込み。夜は部屋の灯りがうっすら映る
  g.globalCompositeOperation = "screen";
  const refl = g.createLinearGradient(gx0, gy0, gx0 + gw * .6, gy1);
  refl.addColorStop(.18, "rgba(255,255,255,0)"); refl.addColorStop(.24, `rgba(255,255,255,${(.05 + .03 * night).toFixed(3)})`);
  refl.addColorStop(.3, "rgba(255,255,255,0)"); refl.addColorStop(.34, `rgba(255,255,255,${(.03 + .02 * night).toFixed(3)})`); refl.addColorStop(.37, "rgba(255,255,255,0)");
  g.fillStyle = refl; g.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  if (night > 0) {
    const room = g.createRadialGradient(gx0 + gw * .2, gy1, 0, gx0 + gw * .2, gy1, gh * 1.1);
    room.addColorStop(0, /^#[0-9a-f]{6}$/i.test(accent) ? rgba(hex(accent), .12 * night) : "rgba(240,179,94,.1)"); room.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = room; g.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  }
  g.globalCompositeOperation = "source-over";

  // 壁の厚み（窓の奥行き）: 上は影、左右は斜めに、下は明るい
  const reveal = (pts: number[], fill: string | CanvasGradient) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  reveal([ox0, oy0, ox1, oy0, gx1, gy0, gx0, gy0], "rgba(12,9,6,.92)");
  reveal([ox0, oy0, gx0, gy0, gx0, gy1, ox0, oy1], "rgba(28,20,14,.85)");
  reveal([ox1, oy0, gx1, gy0, gx1, gy1, ox1, oy1], "rgba(20,14,10,.9)");
  reveal([ox0, oy1, gx0, gy1, gx1, gy1, ox1, oy1], lo);
  g.restore();

  // ---- サッシ: 今どきの引き違い窓。細いアルミの枠に大きな一枚ガラスが 2 枚、真ん中で前後に重なる ----
  const sf = Math.max(2 * d, cw * .38), over2 = sf * 1.2, mid = (gx0 + gx1) / 2;
  const alu = (x: number, y: number, w: number, h: number) => {
    const gr = w > h ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, "#5b5f66"); gr.addColorStop(.45, "#3a3d43"); gr.addColorStop(1, "#24262a");
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  const sash = (x0: number, x1: number, front: boolean) => {
    const y0 = gy0 + (front ? 0 : d * .6), y1 = gy1;
    // 奥の障子は少し暗く見える（前の障子の影）
    alu(x0, y0, x1 - x0, sf); alu(x0, y1 - sf, x1 - x0, sf); alu(x0, y0, sf, y1 - y0); alu(x1 - sf, y0, sf, y1 - y0);
    g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(x0, y0, x1 - x0, d * .7); g.fillRect(x0, y0, d * .7, y1 - y0);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x0 + sf, y0 + sf, x1 - x0 - sf * 2, d * .8); g.fillRect(x0 + sf, y0 + sf, d * .8, y1 - y0 - sf * 2);
    if (!front) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(x0 + sf, y0 + sf, x1 - x0 - sf * 2, y1 - y0 - sf * 2); }
  };
  // 右の障子が奥、左の障子が手前（召し合わせで重なる）
  sash(mid - over2, gx1, false);
  g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(mid + over2 * .1, gy0, 2.5 * d, gh); // 手前の障子が落とす影
  sash(gx0, mid + over2, true);
  // 召し合わせのクレセント錠と、外側の縦枠の引き手
  const lx = mid + over2 * .1, ly = gy0 + gh * .52;
  g.fillStyle = "#9da2a9"; g.fillRect(lx - 1.6 * d, ly - 4 * d, 3.2 * d, 8 * d);
  g.strokeStyle = "#c8ccd2"; g.lineWidth = 1.2 * d; g.beginPath(); g.arc(lx + 1.6 * d, ly, 3.4 * d, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.fillStyle = "rgba(255,255,255,.25)";
  g.fillRect(gx0 + sf * .3, gy0 + gh * .44, d, gh * .14); g.fillRect(gx1 - sf * .3 - d, gy0 + gh * .44, d, gh * .14);
  // レール（下枠の溝）
  g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(gx0, gy1 - d * .8, gw, d * .8);

  // ---- 外枠（ケーシング）: 木目の明暗と面取り ----
  const frame = g.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, hi); frame.addColorStop(.35, wood); frame.addColorStop(1, lo);
  g.fillStyle = frame;
  g.beginPath(); g.rect(X0, 0, X1 - X0, Y1); g.rect(ox0, oy0, ox1 - ox0, oy1 - oy0); g.fill("evenodd");
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = d; g.strokeRect(ox0 + d / 2, oy0 + d / 2, ox1 - ox0 - d, oy1 - oy0 - d);
  g.strokeStyle = "rgba(255,230,200,.12)"; g.strokeRect(X0 + d / 2, d / 2, X1 - X0 - d, Y1 - d);

  // ---- 窓の下の桟: 上の面と、手前の面と、下に落ちる影 ----
  const sy = Y1, topH = sh * .38;
  g.fillStyle = hi; g.fillRect(0, sy, W, topH);
  const front = g.createLinearGradient(0, sy + topH, 0, H);
  front.addColorStop(0, wood); front.addColorStop(1, lo);
  g.fillStyle = front; g.fillRect(0, sy + topH, W, sh - topH);
  g.fillStyle = "rgba(255,240,220,.18)"; g.fillRect(0, sy, W, d);
  g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, sy + topH, W, d * .8);

  // ---- カーテン: 左の端に寄せた薄い布。ひだの明暗、裾は少し揺れる ----
  const cx0 = X0 - cw * .2, cwid = Math.max(14 * d, gw * .17), folds = 5, rodY = cw * .45;
  const swing = (v: number) => (calm ? 0 : Math.sin(t * .9 + v * 3) * (1 + 3 * sway) * d) * v * v;
  const edge = (v: number) => cx0 + cwid * (1 - .28 * Math.pow(v, 1.4)) + Math.sin(v * 5 + t * .4) * d * .6 + swing(v);
  const cloth = g.createLinearGradient(cx0, 0, cx0 + cwid, 0);
  for (let i = 0; i <= folds * 2; i++) cloth.addColorStop(i / (folds * 2), i % 2 ? `rgba(236,226,206,${(.34 + .1 * night).toFixed(3)})` : `rgba(200,186,160,${(.5 + .1 * night).toFixed(3)})`);
  g.fillStyle = cloth;
  g.beginPath(); g.moveTo(cx0, rodY);
  g.lineTo(edge(0), rodY);
  for (let v = 0; v <= 1.0001; v += .05) g.lineTo(edge(v), rodY + (H - sh * .6 - rodY) * v);
  for (let i = folds; i >= 0; i--) g.lineTo(cx0 + (cwid * .72 * i) / folds + swing(1), H - sh * .6 + (i % 2) * 1.5 * d);
  g.closePath(); g.fill();
  // カーテンレール
  g.fillStyle = lo; g.fillRect(cx0 - d, rodY - 1.5 * d, cwid * 1.5, 2.2 * d);
  g.fillStyle = hi; g.fillRect(cx0 - d, rodY - 1.5 * d, cwid * 1.5, d * .7);
  for (let i = 0; i <= folds; i++) { g.fillStyle = lo; g.beginPath(); g.arc(cx0 + (cwid * i) / folds, rodY, 1.6 * d, 0, 7); g.fill(); }
}

function drawStars(g: CanvasRenderingContext2D, X: (u: number) => number, Y: (v: number) => number, gw: number, gh: number, d: number, t: number, k: number, calm: boolean) {
  // 天の川: 斜めにかかる淡い光の帯
  g.save();
  g.translate(X(.5), Y(.33)); g.rotate(Math.atan2(gh * .55, gw * 1.2));
  const len = Math.hypot(gw * 1.2, gh * .55), band = g.createLinearGradient(0, -gh * .16, 0, gh * .16);
  band.addColorStop(0, "rgba(200,210,235,0)"); band.addColorStop(.42, `rgba(205,214,238,${(.07 * k).toFixed(3)})`);
  band.addColorStop(.55, `rgba(225,220,240,${(.1 * k).toFixed(3)})`); band.addColorStop(1, "rgba(200,210,235,0)");
  g.fillStyle = band; g.fillRect(-len / 2, -gh * .16, len, gh * .32);
  // 帯の中の暗い筋（暗黒星雲）
  g.fillStyle = `rgba(6,8,16,${(.08 * k).toFixed(3)})`; g.beginPath(); g.ellipse(len * .05, gh * .01, len * .28, gh * .018, .03, 0, Math.PI * 2); g.fill();
  g.restore();
  g.fillStyle = "#eef0fa";
  for (const s of MILKY) { g.globalAlpha = k * s.a; g.fillRect(X(s.x), Y(s.y), s.s * d, s.s * d); }
  for (const s of FAINT) { g.globalAlpha = k * (.25 + .25 * Math.sin(t * (.6 + s.tw * .2) + s.tw)) * (1 - s.y * .6); g.fillRect(X(s.x), Y(s.y), s.s * d, s.s * d); }
  g.globalAlpha = 1;
  // 流れ星: 数十秒に一度、斜めにすっと流れて消える
  if (calm) return;
  const cyc = 23, n = Math.floor(t / cyc), p = (t % cyc) / .9;
  if (p >= 1 || rnd(n, 431) > .7 * k + .1) return;
  const x0 = .15 + rnd(n, 432) * .7, y0 = .05 + rnd(n, 433) * .3, dir = rnd(n, 434) > .5 ? 1 : -1, L = .18 + rnd(n, 435) * .15;
  const hx = X(x0 + dir * L * p), hy = Y(y0 + L * .45 * p), tx = X(x0 + dir * L * Math.max(0, p - .35)), ty = Y(y0 + L * .45 * Math.max(0, p - .35));
  const a = Math.sin(Math.PI * p) * k, tail = g.createLinearGradient(tx, ty, hx, hy);
  tail.addColorStop(0, "rgba(255,255,255,0)"); tail.addColorStop(1, `rgba(255,252,240,${(.9 * a).toFixed(3)})`);
  g.strokeStyle = tail; g.lineWidth = Math.max(.8, d * .9); g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
}

function drawFog(g: CanvasRenderingContext2D, fog: Fog, gx: number, gy: number, gw: number, gh: number, d: number, t: number, night: number) {
  const W = Math.max(1, Math.round(gw)), H = Math.max(1, Math.round(gh));
  const c = fog.canvas ??= document.createElement("canvas");
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const f = c.getContext("2d")!;
  f.globalCompositeOperation = "source-over"; f.clearRect(0, 0, W, H);
  // 曇り: 下ほど濃く、ふちに細かな水滴
  const a = fog.amt, base = night > .5 ? [150, 156, 170] : [226, 232, 238];
  const gr = f.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgba(${base},${(.32 * a).toFixed(3)})`); gr.addColorStop(.6, `rgba(${base},${(.46 * a).toFixed(3)})`); gr.addColorStop(1, `rgba(${base},${(.62 * a).toFixed(3)})`);
  f.fillStyle = gr; f.fillRect(0, 0, W, H);
  f.fillStyle = `rgba(255,255,255,${(.35 * a).toFixed(3)})`;
  for (let i = 0; i < 220; i++) { const x = rnd(i, 501) * W, y = Math.pow(rnd(i, 502), .6) * H, r = (.3 + rnd(i, 503) * .9) * d; f.fillRect(x, y, r, r); }
  // 拭った跡: 新しいほどはっきり透け、FOG_BACK 秒かけて曇りに戻る
  f.globalCompositeOperation = "destination-out"; f.lineCap = f.lineJoin = "round";
  fog.strokes = fog.strokes.filter(s => t - s.t < FOG_BACK);
  for (const s of fog.strokes) {
    const k = 1 - (t - s.t) / FOG_BACK;
    f.strokeStyle = `rgba(0,0,0,${Math.min(1, k * 1.4).toFixed(3)})`; f.lineWidth = Math.max(4 * d, H * .045);
    f.beginPath(); f.moveTo(s.pts[0] * W, s.pts[1] * H);
    for (let i = 2; i < s.pts.length; i += 2) f.lineTo(s.pts[i] * W, s.pts[i + 1] * H);
    f.stroke();
  }
  g.drawImage(c, gx, gy);
  // 拭った線の下のふちに、集まった水滴が少したまる
  g.fillStyle = `rgba(235,242,248,${(.35 * a).toFixed(3)})`;
  for (const s of fog.strokes) {
    const k = 1 - (t - s.t) / FOG_BACK;
    if (k < .3) continue;
    for (let i = 0; i < s.pts.length; i += 6) { const x = gx + s.pts[i] * gw, y = gy + s.pts[i + 1] * gh + Math.max(2 * d, gh * .022); g.fillRect(x, y, d * 1.2, d * 1.2); }
  }
}
