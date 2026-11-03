// レシート: いま聴いているアルバムを、感熱紙のレシートに印字したような 1 枚の画像にする。
// ジャケットは感熱紙らしく点の濃淡（誤差拡散）で刷る。「ジャケットを隠す」のときは刷らない。
// 画像は端末の中だけで描き、写真と同じ画面から保存・コピー・共有する。Kona からはどこにも送らない

import type { Album } from "./library";
import { loadImage, showPicture } from "./photo";
import { stat, listenedSeconds } from "./store";
import { metersOf } from "./mod-distance";
import { catNames } from "./cat";

const PW = 360;       // 紙の幅（描く単位）
const PAD = 22;       // 紙の左右の余白
const K = 3;          // 画像にするときの倍率（1080px 幅）
const INK = "#26231f", PAPER = "#f3f0e8";
const MONO = `"IBM Plex Mono", ui-monospace, Menlo, Consolas, "Zen Kaku Gothic New", monospace`;
const SANS = `"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif`;

const fmt = (s: number) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const WEEK = "日月火水木金土";
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/** 感熱紙の点: ジャケットを白黒の点（誤差拡散）にする。黒い点だけを残した小さなキャンバス */
async function ditherArt(url: string, w: number): Promise<HTMLCanvasElement | undefined> {
  const im = await loadImage(url);
  if (!im || !im.naturalWidth) return;
  const h = Math.max(1, Math.round(w * im.naturalHeight / im.naturalWidth));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(im, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), px = d.data;
  // 明るさにして、感熱紙で潰れないよう少しコントラストを上げる
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const v = (px[i * 4] * .299 + px[i * 4 + 1] * .587 + px[i * 4 + 2] * .114) / 255;
    L[i] = Math.min(1, Math.max(0, (v - .5) * 1.25 + .56));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, old = L[i], v = old < .5 ? 0 : 1, e = old - v;
    L[i] = v;
    if (x + 1 < w) L[i + 1] += e * 7 / 16;
    if (y + 1 < h) { if (x > 0) L[i + w - 1] += e * 3 / 16; L[i + w] += e * 5 / 16; if (x + 1 < w) L[i + w + 1] += e / 16; }
  }
  for (let i = 0; i < w * h; i++) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 38; px[i * 4 + 3] = L[i] ? 0 : 235; }
  g.putImageData(d, 0, 0);
  return c;
}

type Row = { h: number; draw: (g: CanvasRenderingContext2D, y: number) => void };

/** 幅に収まるよう、文字単位で折り返す（日本語に空白がないため） */
function wrap(g: CanvasRenderingContext2D, text: string, max: number, lines = 3): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (g.measureText(cur + ch).width > max && cur) { out.push(cur); cur = ch; if (out.length === lines) break; }
    else cur += ch;
  }
  if (out.length < lines && cur) out.push(cur);
  else if (out.length === lines && cur) { let last = out[lines - 1]; while (last && g.measureText(last + "…").width > max) last = last.slice(0, -1); out[lines - 1] = last + "…"; }
  return out;
}
/** 1 行に収まらなければ末尾を … にする */
function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let s = text;
  while (s && g.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

export async function drawReceipt(a: Album, index: number, pos: number, hideArt: boolean): Promise<HTMLCanvasElement> {
  const tr = a.tracks[index] ?? a.tracks[0];
  const now = new Date(), p2 = (n: number) => String(n).padStart(2, "0");
  const plays = stat(a.key).plays, meters = metersOf(listenedSeconds());
  const total = a.tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const staff = catNames()[0];
  // 使う文字の書体を読み込んでから描く（キャンバスは読み込み済みの書体しか使えない）
  const text = [a.title, a.artist, tr?.title ?? "", ...a.tracks.map(t => t.title), "担当曲数収録時間再生回目形式聴いた距離またのご来店をお待ちしておりますほか", staff ?? ""].join("");
  await Promise.all([
    document.fonts.load(`500 14px "IBM Plex Mono"`, "KONA 0123456789:/-.·×¥#"),
    document.fonts.load(`400 14px "Zen Kaku Gothic New"`, text),
    document.fonts.load(`700 14px "Zen Kaku Gothic New"`, text),
  ]).catch(() => {});

  const meas = document.createElement("canvas").getContext("2d")!;
  const W = PW - PAD * 2;
  const rows: Row[] = [];
  const font = (g: CanvasRenderingContext2D, size: number, weight = 400, fam = SANS) => { g.font = `${weight} ${size}px ${fam}`; };
  const gap = (h: number) => rows.push({ h, draw: () => {} });
  const center = (s: string, size: number, weight = 400, fam = SANS, lh = 1.5) => rows.push({ h: size * lh, draw: (g, y) => { font(g, size, weight, fam); g.textAlign = "center"; g.fillText(fit(g, s, W), PW / 2, y + size * (lh - 1) / 2 + size * .85); g.textAlign = "left"; } });
  const pair = (l: string, r: string, size = 12, weight = 400) => rows.push({ h: size * 1.7, draw: (g, y) => {
    font(g, size, weight); const base = y + size * 1.25;
    g.fillText(l, PAD, base);
    font(g, size, weight, MONO); g.textAlign = "right"; g.fillText(fit(g, r, W - g.measureText(l).width - 24), PW - PAD, base); g.textAlign = "left";
  } });
  const rule = (kind: "dash" | "double" = "dash") => rows.push({ h: 14, draw: (g, y) => {
    g.save(); g.lineWidth = 1; g.strokeStyle = INK;
    if (kind === "dash") g.setLineDash([4, 3]);
    const line = (yy: number) => { g.beginPath(); g.moveTo(PAD, yy); g.lineTo(PW - PAD, yy); g.stroke(); };
    if (kind === "double") { line(y + 5.5); line(y + 8.5); } else line(y + 7);
    g.restore();
  } });

  // ---- 店の名前と日時 ----
  gap(26);
  center("KONA", 30, 500, MONO, 1.2);
  gap(6);
  center(`${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} (${WEEK[now.getDay()]}) ${p2(now.getHours())}:${p2(now.getMinutes())}`, 11.5, 400, MONO);
  pair(`No.${String(plays).padStart(4, "0")}`, staff ? `担当: ${staff}` : "", 11);
  rule();

  // ---- ジャケット（感熱紙の点） ----
  // Spotify のジャケットは加工しない決まりなので刷らない
  const dots = !hideArt && a.cover && !a.remote ? await ditherArt(a.cover, 150) : undefined;
  if (dots) {
    const dw = 220, dh = dw * dots.height / dots.width;
    rows.push({ h: dh + 18, draw: (g, y) => { g.imageSmoothingEnabled = false; g.drawImage(dots, (PW - dw) / 2, y + 9, dw, dh); g.imageSmoothingEnabled = true; } });
    rule();
  }

  // ---- いまの曲 ----
  rows.push({ h: 30, draw: (g, y) => {
    font(g, 12, 500, MONO);
    const label = " NOW PLAYING ", w = g.measureText(label).width + 8;
    g.fillRect(PAD, y + 7, w, 18); g.fillStyle = PAPER; g.fillText(label, PAD + 4, y + 20.5); g.fillStyle = INK;
  } });
  font(meas, 17, 700);
  for (const l of wrap(meas, tr?.title ?? a.title, W)) rows.push({ h: 24, draw: (g, y) => { font(g, 17, 700); g.fillText(l, PAD, y + 18); } });
  font(meas, 12);
  for (const l of wrap(meas, a.title, W, 2)) rows.push({ h: 18, draw: (g, y) => { font(g, 12); g.fillText(l, PAD, y + 13); } });
  const sub = [a.artist, a.year].filter(Boolean).join(" · ");
  if (sub) rows.push({ h: 18, draw: (g, y) => { font(g, 12); g.fillText(fit(g, sub, W), PAD, y + 13); } });
  const dur = tr?.duration ?? 0;
  rows.push({ h: 30, draw: (g, y) => {
    font(g, 11, 400, MONO);
    const l = fmt(pos), r = dur ? fmt(dur) : "--:--", lw = g.measureText(l).width, rw = g.measureText(r).width;
    g.fillText(l, PAD, y + 19); g.textAlign = "right"; g.fillText(r, PW - PAD, y + 19); g.textAlign = "left";
    const x0 = PAD + lw + 10, x1 = PW - PAD - rw - 10, f = dur ? Math.min(1, pos / dur) : 0;
    g.fillRect(x0, y + 14, (x1 - x0) * f, 3);
    g.save(); g.setLineDash([1.5, 2.5]); g.beginPath(); g.moveTo(x0 + (x1 - x0) * f, y + 15.5); g.lineTo(x1, y + 15.5); g.stroke(); g.restore();
  } });
  rule();

  // ---- 曲目（いまの曲は反転） ----
  const MAX = 18;
  const from = a.tracks.length <= MAX ? 0 : Math.max(0, Math.min(a.tracks.length - MAX, index - Math.floor(MAX / 2)));
  const list = a.tracks.slice(from, from + MAX);
  if (from > 0) center(`… ${from} 曲`, 10.5, 400, SANS, 1.6);
  list.forEach((t, j) => {
    const cur = from + j === index;
    rows.push({ h: 19, draw: (g, y) => {
      if (cur) { g.fillRect(PAD - 4, y + 1, W + 8, 17); g.fillStyle = PAPER; }
      font(g, 11, 500, MONO); g.fillText(String(t.no).padStart(2, "0"), PAD, y + 14);
      const d = t.duration ? fmt(t.duration) : "";
      g.textAlign = "right"; g.fillText(d, PW - PAD, y + 14); g.textAlign = "left";
      const dw = g.measureText(d).width;
      font(g, 11.5, cur ? 700 : 400);
      const name = fit(g, t.title, W - 30 - dw - 14), nw = g.measureText(name).width;
      g.fillText(name, PAD + 26, y + 14);
      // 曲名と長さの間をドットで埋める
      font(g, 11, 400, MONO);
      const dotW = g.measureText(".").width, sx = PAD + 26 + nw + 6, ex = PW - PAD - dw - 6;
      if (ex - sx > dotW * 2) g.fillText(".".repeat(Math.floor((ex - sx) / dotW)), sx, y + 14);
      g.fillStyle = INK;
    } });
  });
  const rest = a.tracks.length - from - list.length;
  if (rest > 0) center(`… ほか ${rest} 曲`, 10.5, 400, SANS, 1.6);
  rule();

  // ---- 曲数・時間・回数 ----
  pair("曲数", `${a.tracks.length} 曲`);
  if (total) pair("収録時間", fmt(total));
  pair("再生", plays ? `${plays} 回目` : "はじめて");
  if (tr?.format) pair("形式", tr.format);
  pair("聴いた距離", meters < 1000 ? `${Math.floor(meters)} m` : `${(meters / 1000).toFixed(2)} km`);
  rule("double");

  // ---- バーコード（アルバムごとに決まった縞） ----
  rows.push({ h: 58, draw: (g, y) => {
    let h = hash(a.key + "#" + index), x = PAD + 26;
    const end = PW - PAD - 26;
    while (x < end) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      const bw = 1 + (h & 3) * .9, sp = 1.2 + ((h >>> 3) & 3) * .9;
      if (x + bw > end) break;
      g.fillRect(x, y + 8, bw, 40); x += bw + sp;
    }
  } });
  center(`KONA-${(hash(a.key) % 1e8).toString().padStart(8, "0")}`, 10, 400, MONO, 1.6);
  gap(8);
  center("またのご来店をお待ちしております", 11, 400, SANS, 1.7);
  center("* thank you for listening *", 10.5, 400, MONO, 1.7);
  gap(30);

  // ---- 描く: 机の上に置いた 1 枚の紙 ----
  const PH = rows.reduce((s, r) => s + r.h, 0);
  const M = 48, CW = PW + M * 2, CH = PH + M * 2;
  const c = document.createElement("canvas");
  c.width = CW * K; c.height = CH * K;
  const g = c.getContext("2d")!;
  g.scale(K, K);
  const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#16140f";
  g.fillStyle = bg; g.fillRect(0, 0, CW, CH);
  const glow = g.createRadialGradient(CW / 2, CH * .4, 10, CW / 2, CH * .4, Math.max(CW, CH) * .7);
  glow.addColorStop(0, "rgba(255, 214, 160, .12)"); glow.addColorStop(1, "rgba(0, 0, 0, .25)");
  g.fillStyle = glow; g.fillRect(0, 0, CW, CH);
  g.translate(M, M);
  // 上下はちぎった跡（ぎざぎざ）
  const edge = (y: number, down: boolean) => { const n = Math.round(PW / 7); for (let i = 0; i <= n; i++) g.lineTo(PW - i * PW / n, y + (i % 2 ? (down ? 4 : -4) : 0)); };
  g.beginPath(); g.moveTo(0, 0);
  for (let i = 0, n = Math.round(PW / 7); i <= n; i++) g.lineTo(i * PW / n, i % 2 ? 4 : 0);
  g.lineTo(PW, PH); edge(PH, false); g.closePath();
  g.save(); g.shadowColor = "rgba(0, 0, 0, .55)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
  g.fillStyle = PAPER; g.fill(); g.restore();
  // 紙のくすみ: 端ほど少し黄ばみ、ロールの巻き癖の影
  g.save(); g.clip();
  const side = g.createLinearGradient(0, 0, PW, 0);
  side.addColorStop(0, "rgba(120, 100, 60, .10)"); side.addColorStop(.12, "rgba(120, 100, 60, 0)"); side.addColorStop(.88, "rgba(120, 100, 60, 0)"); side.addColorStop(1, "rgba(120, 100, 60, .12)");
  g.fillStyle = side; g.fillRect(0, 0, PW, PH);
  // 印字: 感熱紙らしく、わずかにかすれる
  g.fillStyle = INK; g.strokeStyle = INK; g.textBaseline = "alphabetic";
  let y = 0;
  for (const r of rows) { g.globalAlpha = .9; r.draw(g, y); y += r.h; }
  g.globalAlpha = 1;
  const rnd = (() => { let s = hash(a.key); return () => ((s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0) / 4294967296); })();
  g.fillStyle = PAPER;
  for (let i = 0; i < 26; i++) { g.globalAlpha = .08 + rnd() * .16; g.fillRect(rnd() * PW, 0, .6 + rnd() * 1.4, PH); } // ヘッドの細いかすれ
  g.globalAlpha = 1;
  g.restore();
  return c;
}

/** レシートの画面を出す（いま聴いている曲がなければ何もしない） */
export function openReceipt(get: () => { album?: Album; index: number; position: number }) {
  const s = get();
  if (!s.album) return;
  const a = s.album, i = s.index, pos = s.position;
  // ジャケットは既定で点の濃淡で刷る（写真とは別に覚える）。Spotify のアルバムは刷らない
  showPicture({ label: "レシート", prefix: "kona-receipt", tab: "receipt", hideToggle: !!a.cover, hideKey: "kona.receiptHideArt", hideDefault: false, locked: !!a.remote, draw: ({ hideArt }) => drawReceipt(a, i, pos, hideArt) });
}
