// レコードプレーヤー: 再生中のアルバムをレコードに見立てる。ジャケットがレーベル、33⅓ 回転で回り、
// トーンアームはアルバム全体の進み具合で内側へ寄っていく。盤をクリックすると再生・一時停止

import { ctx, css, fit, everyFrame } from "./modctx";

// 写真でジャケットを隠すときは、レーベルをジャケットの平均色だけで描く
let plain = false;
export function setPlainLabel(on: boolean) { plain = on; }

export function mountTurntable(body: HTMLElement) {
  body.innerHTML = `<div class="tt"><canvas class="tt-canvas" aria-label="レコードプレーヤー"></canvas></div>`;
  const root = body.querySelector<HTMLElement>(".tt")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  let angle = 0, speed = 0, lift = 0, last = performance.now(), labelKey = "", mixT = 1;
  let label = new Image(), prevLabel: HTMLImageElement | undefined;

  canvas.onclick = e => {
    const r = canvas.getBoundingClientRect(), g = geom(r.width, r.height);
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - g.cx, y - g.cy) <= g.R || Math.hypot(x - g.bx, y - g.by) <= g.R * .16) ctx().player.toggle();
  };
  canvas.onpointermove = e => {
    const r = canvas.getBoundingClientRect(), g = geom(r.width, r.height);
    const x = e.clientX - r.left, y = e.clientY - r.top;
    canvas.style.cursor = Math.hypot(x - g.cx, y - g.cy) <= g.R || Math.hypot(x - g.bx, y - g.by) <= g.R * .16 ? "pointer" : "default";
  };

  everyFrame(root, () => {
    fit(canvas);
    const p = ctx().player, now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    // 回り始め・止まりぎわは少しずつ（重い盤の慣性）
    speed += ((p.playing ? 1 : 0) - speed) * (1 - Math.exp(-dt / (p.playing ? 0.6 : 1.4)));
    angle += speed * dt * (2 * Math.PI * 33.333 / 60);
    const a = p.album;
    const key = a?.cover ?? "";
    // レーベルが替わるときは、前のジャケットから次のジャケットへ溶けるように
    if (key !== labelKey) {
      labelKey = key; prevLabel = label.complete && label.naturalWidth ? label : undefined;
      label = new Image(); if (key) label.src = key; mixT = 0;
    }
    if (!label.src || (label.complete && label.naturalWidth) || !key) mixT = Math.min(1, mixT + dt / .6);
    // アルバム全体での進み具合と、曲の切れ目（溝の間の無音帯）
    let prog = 0, gaps: number[] = [];
    if (a) {
      const lens = a.tracks.map(t => t.duration ?? 0), total = lens.reduce((x, y) => x + y, 0);
      const before = lens.slice(0, p.index).reduce((x, y) => x + y, 0);
      prog = total > 0 ? (before + p.position) / total : (p.index + (p.duration ? p.position / p.duration : 0)) / Math.max(1, a.tracks.length);
      let acc = 0;
      gaps = total > 0 ? lens.slice(0, -1).map(l => (acc += l) / total) : a.tracks.slice(1).map((_, i) => (i + 1) / a.tracks.length);
    }
    // 針は盤の上へ、ゆっくり降りてゆっくり上がる
    lift += ((a ? 1 : 0) - lift) * (1 - Math.exp(-dt / .5));
    draw(canvas, angle, a ? Math.max(0, Math.min(1, prog)) : 0, lift, gaps, speed, !plain && label.complete && label.naturalWidth ? label : undefined, a ? ctx().colorOf(a) : "", mixT < 1 && !plain ? prevLabel : undefined, mixT);
  });
}

// 寸法（css px でも device px でも同じ比率）: 木の台・盤・トーンアームの支点・スタートボタン
function geom(W: number, H: number) {
  const R = Math.max(10, Math.min(H / 2.46, W / 3.05));
  const x0 = (W - 2.95 * R) / 2, y0 = (H - 2.34 * R) / 2;
  const cx = x0 + 1.17 * R, cy = y0 + 1.17 * R;
  return { R, x0, y0, w: 2.95 * R, h: 2.34 * R, cx, cy, px: cx + 1.3 * R, py: cy - .74 * R, bx: x0 + .22 * R, by: y0 + 2.1 * R };
}

const RIN = .46, ROUT = .94; // 音溝の内周と外周（半径の比）

function draw(c: HTMLCanvasElement, angle: number, prog: number, lift: number, gaps: number[], speed: number, label: HTMLImageElement | undefined, color: string, prev: HTMLImageElement | undefined, mixT: number) {
  const g = c.getContext("2d")!, W = c.width, H = c.height, d = devicePixelRatio || 1;
  g.clearRect(0, 0, W, H);
  const G = geom(W, H), { R, cx, cy } = G;
  if (R < 12 * d) return;
  const accent = css("--accent", "#f0b35e"), wood = css("--wood", "#6d4b33"), hi = css("--wood-hi", "#9a6e4c"), lo = css("--wood-lo", "#3b281b");
  const TAU = Math.PI * 2;
  const round = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  // 木の台: 影・木目・面取り
  g.fillStyle = "rgba(0,0,0,.35)"; round(G.x0 + 2 * d, G.y0 + 4 * d, G.w, G.h, R * .08); g.fill();
  const plinth = g.createLinearGradient(G.x0, G.y0, G.x0 + G.w, G.y0 + G.h);
  plinth.addColorStop(0, hi); plinth.addColorStop(.45, wood); plinth.addColorStop(1, lo);
  g.fillStyle = plinth; round(G.x0, G.y0, G.w, G.h, R * .08); g.fill();
  g.save(); g.clip(); g.globalAlpha = .08; g.strokeStyle = "#000"; g.lineWidth = d;
  for (let k = 0; k < 18; k++) { const y = G.y0 + (k + .5) * G.h / 18 + Math.sin(k * 3.1) * 2 * d; g.beginPath(); g.moveTo(G.x0, y); g.bezierCurveTo(G.x0 + G.w * .3, y + 3 * d, G.x0 + G.w * .7, y - 3 * d, G.x0 + G.w, y + Math.sin(k) * 2 * d); g.stroke(); }
  g.restore();
  g.strokeStyle = "rgba(255,235,210,.18)"; g.lineWidth = d; round(G.x0 + d / 2, G.y0 + d / 2, G.w - d, G.h - d, R * .08); g.stroke();

  // ターンテーブル（金属の縁）と、縁のストロボの点（回転と一緒に流れる）
  g.fillStyle = "#2a2c30"; g.beginPath(); g.arc(cx, cy, R * 1.035, 0, TAU); g.fill();
  const rim = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  rim.addColorStop(0, "#9aa0a8"); rim.addColorStop(.5, "#50545b"); rim.addColorStop(1, "#8a9098");
  g.strokeStyle = rim; g.lineWidth = R * .05; g.beginPath(); g.arc(cx, cy, R * 1.01, 0, TAU); g.stroke();
  g.fillStyle = "rgba(20,20,22,.7)";
  for (let k = 0; k < 72; k++) { const a = angle + k * TAU / 72; g.fillRect(cx + Math.cos(a) * R * 1.01 - d * .5, cy + Math.sin(a) * R * 1.01 - d * .5, d, d); }

  // 盤: 黒。外周の無溝帯、音溝、曲の切れ目、内周の無溝帯
  g.fillStyle = "#101113"; g.beginPath(); g.arc(cx, cy, R * .985, 0, TAU); g.fill();
  g.lineWidth = Math.max(.6, d * .6);
  for (let k = RIN; k < ROUT; k += .018) { g.strokeStyle = `rgba(255,255,255,${(.035 + .02 * Math.sin(k * 90)).toFixed(3)})`; g.beginPath(); g.arc(cx, cy, R * k, 0, TAU); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 1.4 * d;
  for (const q of gaps) { g.beginPath(); g.arc(cx, cy, R * (ROUT - q * (ROUT - RIN)), 0, TAU); g.stroke(); }
  // 光の映り込み: 盤は回っても、光の筋は動かない
  const sheen = g.createConicGradient(-Math.PI / 4, cx, cy);
  sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(.06, "rgba(255,255,255,.10)"); sheen.addColorStop(.12, "rgba(255,255,255,0)");
  sheen.addColorStop(.5, "rgba(255,255,255,0)"); sheen.addColorStop(.56, "rgba(255,255,255,.07)"); sheen.addColorStop(.62, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen; g.beginPath(); g.arc(cx, cy, R * .985, 0, TAU); g.arc(cx, cy, R * .4, 0, TAU, true); g.fill();

  // レーベル（ジャケット）。回っていることが分かるよう、縁に一点だけ印
  const lr = R * .36;
  g.save(); g.translate(cx, cy); g.rotate(angle);
  g.beginPath(); g.arc(0, 0, lr, 0, TAU); g.clip();
  if (prev) g.drawImage(prev, -lr, -lr, lr * 2, lr * 2);
  g.globalAlpha = prev ? mixT : 1;
  if (label) g.drawImage(label, -lr, -lr, lr * 2, lr * 2);
  else { g.fillStyle = color || "#3a3530"; g.fillRect(-lr, -lr, lr * 2, lr * 2); }
  g.globalAlpha = 1;
  g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(0, 0, lr, 0, TAU); g.arc(0, 0, lr * .9, 0, TAU, true); g.fill();
  g.restore();
  g.save(); g.translate(cx, cy); g.rotate(angle);
  g.fillStyle = accent; g.globalAlpha = .9; g.beginPath(); g.arc(R * .9, 0, 1.4 * d, 0, TAU); g.fill();
  g.restore();
  // スピンドル
  const sp = g.createRadialGradient(cx - d, cy - d, 0, cx, cy, 3 * d);
  sp.addColorStop(0, "#e8e8ea"); sp.addColorStop(1, "#6a6d72");
  g.fillStyle = sp; g.beginPath(); g.arc(cx, cy, 2.6 * d, 0, TAU); g.fill();

  // スタート／ストップのボタンと、回転数の灯り
  const br = R * .12;
  g.fillStyle = "#222428"; g.beginPath(); g.arc(G.bx, G.by, br * 1.15, 0, TAU); g.fill();
  const btn = g.createLinearGradient(G.bx, G.by - br, G.bx, G.by + br);
  btn.addColorStop(0, "#a9adb3"); btn.addColorStop(1, "#5d6167");
  g.fillStyle = btn; g.beginPath(); g.arc(G.bx, G.by, br, 0, TAU); g.fill();
  g.fillStyle = accent; g.globalAlpha = .15 + .85 * speed; g.shadowColor = accent; g.shadowBlur = 6 * d * speed;
  g.beginPath(); g.arc(G.bx + br * 2.1, G.by, 1.6 * d, 0, TAU); g.fill();
  g.shadowBlur = 0; g.globalAlpha = 1;

  // トーンアーム: 支点（軸受け）、後ろのおもり、細い腕、先のヘッドシェル
  const { px, py } = G;
  const armLen = Math.hypot(cx - px, cy - py) * .95;
  const angOf = (rad: number) => {
    const dx = cx - px, dy = cy - py, D = Math.hypot(dx, dy);
    const a = (armLen * armLen - rad * rad + D * D) / (2 * D), h = Math.sqrt(Math.max(0, armLen * armLen - a * a));
    const mx = px + (a * dx) / D, my = py + (a * dy) / D;
    const p1 = [mx + (h * dy) / D, my - (h * dx) / D], p2 = [mx - (h * dy) / D, my + (h * dx) / D];
    const [tx, ty] = p1[1] > p2[1] ? p1 : p2;
    return Math.atan2(ty - py, tx - px);
  };
  const rest = Math.PI / 2 + .05; // アームレストの上
  const ang = rest + (angOf(R * (ROUT - .01 - prog * (ROUT - RIN))) - rest) * lift;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  // アームレスト
  const rx = px + Math.cos(rest) * armLen * .72, ry = py + Math.sin(rest) * armLen * .72;
  g.fillStyle = "#2b2d31"; g.beginPath(); g.arc(rx, ry, R * .05, 0, TAU); g.fill();
  // 腕の影（上がっている分だけ離れる）
  const off = (2 + (1 - lift) * 3) * d;
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = R * .035; g.lineCap = "round";
  g.beginPath(); g.moveTo(px + off, py + off); g.lineTo(px + cos * armLen + off, py + sin * armLen + off); g.stroke();
  // 軸受けの台
  g.fillStyle = "#1e2023"; g.beginPath(); g.arc(px, py, R * .2, 0, TAU); g.fill();
  g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = d; g.beginPath(); g.arc(px, py, R * .2, 0, TAU); g.stroke();
  // おもり（腕の反対側）
  g.save(); g.translate(px, py); g.rotate(ang);
  const cw = g.createLinearGradient(0, -R * .07, 0, R * .07);
  cw.addColorStop(0, "#b9bdc3"); cw.addColorStop(.5, "#7b7f86"); cw.addColorStop(1, "#4b4e53");
  g.fillStyle = cw; round(-R * .36, -R * .075, R * .2, R * .15, R * .02); g.fill();
  // 腕
  const tube = g.createLinearGradient(0, -R * .02, 0, R * .02);
  tube.addColorStop(0, "#d6d9dd"); tube.addColorStop(1, "#80848a");
  g.fillStyle = tube; g.fillRect(-R * .16, -R * .016, armLen * .9 + R * .16, R * .032);
  // ヘッドシェル（少し角度をつけて）と、指かけ
  g.translate(armLen * .9, 0); g.rotate(.38);
  g.fillStyle = "#2b2d31"; round(-R * .02, -R * .045, armLen * .13, R * .09, R * .015); g.fill();
  g.strokeStyle = "#9a9ea4"; g.lineWidth = R * .014; g.beginPath(); g.moveTo(R * .04, -R * .045); g.lineTo(R * .06, -R * .11); g.stroke();
  g.restore();
  // 軸のキャップ
  const cap = g.createRadialGradient(px - R * .03, py - R * .03, 0, px, py, R * .09);
  cap.addColorStop(0, "#e2e4e7"); cap.addColorStop(1, "#5e6268");
  g.fillStyle = cap; g.beginPath(); g.arc(px, py, R * .085, 0, TAU); g.fill();
  // 針先: 盤に乗っているときだけ灯る
  const tipX = px + cos * armLen, tipY = py + sin * armLen;
  g.fillStyle = accent; g.globalAlpha = lift * (.4 + .6 * speed);
  g.beginPath(); g.arc(tipX, tipY, 1.4 * d, 0, TAU); g.fill(); g.globalAlpha = 1;
}
