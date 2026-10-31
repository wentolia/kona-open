// 到達の証書: 聴いた距離が目じるし（東京タワー・富士山・フルマラソンなど）に届いた日を覚えておき、
// 賞状の画像にして見せる。棚の上の小物の「賞状」と、聴いた距離のモジュールから開く。
// 記録は端末の中（kona.awards）だけ。画像は写真と同じ画面から保存・コピー・共有する

import { MARKS, metersOf } from "./mod-distance";
import { listenedSeconds } from "./store";
import { showPicture, photoToast } from "./photo";
import { catNames } from "./cat";

export interface Award { m: number; label: string; t: number; album?: string; artist?: string }
const KEY = "kona.awards";

let list: Award[] | undefined;
function load(): Award[] {
  if (list) return list;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) list = v.filter(a => a && typeof a.m === "number" && typeof a.label === "string" && typeof a.t === "number");
  } catch { /* 読めなければ作り直す */ }
  if (!list) {
    // はじめて: もう通り過ぎた目じるしは、日付の分からない証書として静かに並べる（一度にたくさん知らせない）
    const m = metersOf(listenedSeconds());
    list = MARKS.filter(([v]) => v <= m).map(([v, label]) => ({ m: v, label, t: 0 }));
    save();
  }
  return list;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list ?? [])); } catch { /* 保存できなくても動く */ } };

export const awards = (): readonly Award[] => load();

/** 聴いた時間が増えたら呼ぶ。新しく届いた目じるしがあれば証書を作って知らせる */
export function checkAwards(now?: { title: string; artist?: string }) {
  const got = load(), m = metersOf(listenedSeconds());
  const fresh = MARKS.filter(([v, label]) => v <= m && !got.some(a => a.m === v && a.label === label));
  if (!fresh.length) return;
  for (const [v, label] of fresh) got.push({ m: v, label, t: Date.now(), ...(now ? { album: now.title, ...(now.artist ? { artist: now.artist } : {}) } : {}) });
  save();
  const last = fresh[fresh.length - 1];
  photoToast(`聴いた距離が「${last[1]}」に届きました。棚の上の賞状から証書を見られます`);
  document.dispatchEvent(new CustomEvent("kona:award"));
}

// ---------- 証書の画像 ----------
const HEIGHTS = new Set(["東京タワー", "スカイツリー", "富士山", "エベレスト"]);
const fmtDist = (m: number) => m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("ja-JP", { maximumFractionDigits: 3 })} km`;
const phrase = (a: Award) => HEIGHTS.has(a.label) ? `${a.label}の高さに届きました` : a.label === "100m 走" ? "100m を走りきりました" : `${a.label}をたどりきりました`;
const SPEED = metersOf(1);
const SERIF = `"Zen Old Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif`;
const MONO = `"IBM Plex Mono", ui-monospace, Menlo, monospace`;

export async function drawCertificate(a: Award): Promise<HTMLCanvasElement> {
  const W = 840, H = 594, K = 2;
  const date = a.t ? new Date(a.t) : undefined;
  const dateText = date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` : "以前に到達";
  const hours = a.m / SPEED / 3600;
  const witness = catNames()[0];
  const body1 = `あなたはレコードの溝を ${fmtDist(a.m)} たどり、`;
  const body2 = `${phrase(a)}。`;
  const body3 = `針を落として聴いた時間は、およそ ${hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString("ja-JP")} 時間です。`;
  const rec = a.album ? `この日のレコード　『${a.album}』${a.artist ? `　${a.artist}` : ""}` : "";
  const all = ["到達証", a.label, body1, body2, body3, rec, dateText, "立会人", witness ?? "", "聴いた距離", "認定", "KONA"].join("");
  await Promise.all([
    document.fonts.load(`400 20px "Zen Old Mincho"`, all), document.fonts.load(`700 20px "Zen Old Mincho"`, all),
    document.fonts.load(`500 14px "IBM Plex Mono"`, "CERTIFICATE OF LISTENING No.0123456789"),
  ]).catch(() => {});

  const c = document.createElement("canvas");
  c.width = W * K; c.height = H * K;
  const g = c.getContext("2d")!;
  g.scale(K, K);
  // 紙: 生成りの厚紙、端ほど少し焼けている
  g.fillStyle = "#f2e9d4"; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7);
  v.addColorStop(0, "rgba(255, 250, 235, .5)"); v.addColorStop(1, "rgba(150, 110, 50, .22)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // 紙の繊維
  let s = 7;
  const rnd = () => ((s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0) / 4294967296);
  g.globalAlpha = .05; g.strokeStyle = "#6b5a3a";
  for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H, l = 4 + rnd() * 10, t = rnd() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); g.stroke(); }
  g.globalAlpha = 1;

  // 縁取り: 金の二重線と、四隅のローポリの飾り
  const GOLD = "#a8853f", GOLD_HI = "#d6b56a", GOLD_LO = "#7a5c25", INK = "#2c2418";
  g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(22, 22, W - 44, H - 44);
  g.lineWidth = 1; g.strokeRect(32, 32, W - 64, H - 64);
  const tri = (pts: number[], col: string) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ox = sx > 0 ? 22 : W - 22, oy = sy > 0 ? 22 : H - 22;
    const P = (x: number, y: number) => [ox + x * sx, oy + y * sy];
    tri([...P(0, 0), ...P(46, 0), ...P(0, 46)], GOLD);
    tri([...P(0, 0), ...P(46, 0), ...P(18, 18)], GOLD_HI);
    tri([...P(0, 46), ...P(18, 18), ...P(0, 0)], GOLD_LO);
    tri([...P(22, 22), ...P(34, 16), ...P(16, 34)], GOLD_HI);
  }

  // 見出し
  g.textAlign = "center"; g.fillStyle = GOLD_LO;
  g.font = `500 12px ${MONO}`;
  const spaced = (t: string, x: number, y: number, sp: number) => { const w = [...t].reduce((n, ch) => n + g.measureText(ch).width + sp, -sp); let cx = x - w / 2; g.textAlign = "left"; for (const ch of t) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } g.textAlign = "center"; };
  spaced("CERTIFICATE OF LISTENING", W / 2, 84, 4);
  g.fillStyle = INK; g.font = `700 54px ${SERIF}`;
  spaced("到達証", W / 2, 150, 22);
  // 目じるし
  g.font = `700 34px ${SERIF}`; g.fillText(a.label, W / 2, 222);
  g.strokeStyle = GOLD; g.lineWidth = 1;
  const lw = Math.max(160, g.measureText(a.label).width + 60);
  g.beginPath(); g.moveTo(W / 2 - lw / 2, 238); g.lineTo(W / 2 + lw / 2, 238); g.stroke();
  // 本文
  g.font = `400 18px ${SERIF}`;
  g.fillText(body1, W / 2, 290); g.fillText(body2, W / 2, 322);
  g.font = `400 14px ${SERIF}`; g.fillStyle = "#4a3e2c";
  g.fillText(body3, W / 2, 360);
  if (rec) { g.font = `400 13px ${SERIF}`; let r = rec; while (g.measureText(r).width > W - 200 && r.length > 4) r = r.slice(0, -2) + "…"; g.fillText(r, W / 2, 392); }

  // 日付・立会人（左下）と、印（右下）
  g.textAlign = "left"; g.fillStyle = INK;
  g.font = `400 15px ${SERIF}`; g.fillText(dateText, 90, H - 112);
  if (witness) { g.font = `400 13px ${SERIF}`; g.fillStyle = "#4a3e2c"; g.fillText(`立会人　${witness}`, 90, H - 86); }
  g.strokeStyle = "#8a7652"; g.lineWidth = .8; g.beginPath(); g.moveTo(90, H - 102); g.lineTo(300, H - 102); g.stroke();
  // 肉球の判子（立会人の猫）
  if (witness) {
    g.save(); g.translate(318, H - 98); g.rotate(-.18); g.fillStyle = "rgba(60, 45, 30, .55)";
    g.beginPath(); g.ellipse(0, 5, 8, 6.5, 0, 0, Math.PI * 2); g.fill();
    for (const [x, y] of [[-9, -5], [-3.5, -10], [3.5, -10], [9, -5]]) { g.beginPath(); g.ellipse(x, y, 3, 3.8, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // 朱肉の印: 角の丸い四角に「聴」、下に KONA。少しかすれて傾く
  g.save(); g.translate(W - 150, H - 112); g.rotate(.06);
  g.strokeStyle = "rgba(178, 48, 36, .85)"; g.fillStyle = "rgba(178, 48, 36, .85)"; g.lineWidth = 3.5;
  const R = 36; g.beginPath(); g.roundRect(-R, -R, R * 2, R * 2, 7); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.roundRect(-R + 5, -R + 5, R * 2 - 10, R * 2 - 10, 4); g.stroke();
  g.textAlign = "center"; g.font = `700 34px ${SERIF}`; g.fillText("聴", 0, 6);
  g.font = `500 9px ${MONO}`; g.fillText("KONA", 0, 24);
  g.fillStyle = "#efe4cb"; // かすれ: 紙の色の小さな点を重ねる
  for (let i = 0; i < 40; i++) { g.globalAlpha = .4 + rnd() * .5; g.beginPath(); g.arc((rnd() - .5) * R * 2, (rnd() - .5) * R * 2, .5 + rnd() * 1.6, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.globalAlpha = 1;
  // 通し番号
  g.textAlign = "right"; g.fillStyle = GOLD_LO; g.font = `500 10px ${MONO}`;
  g.fillText(`No.${String(MARKS.findIndex(([m]) => m === a.m) + 1).padStart(3, "0")}`, W - 48, 58);
  return c;
}

/** 証書を見る。which を省くといちばん新しいもの */
export function openCertificate(which?: number) {
  const got = [...load()].sort((x, y) => x.m - y.m);
  if (!got.length) { photoToast("まだ証書はありません。聴いた距離が 100m に届くと最初の 1 枚が届きます"); return; }
  const i = which !== undefined ? got.findIndex(a => a.m === which) : got.length - 1;
  showPicture({
    label: "到達の証書", prefix: "kona-certificate", choices: got.map(a => `${a.label}（${fmtDist(a.m)}）`), choice: i < 0 ? got.length - 1 : i,
    draw: ({ choice }) => drawCertificate(got[choice]),
  });
}
