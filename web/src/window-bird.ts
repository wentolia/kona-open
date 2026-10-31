// 窓辺の鳥: 晴れた朝、スズメが窓の外の縁に飛んで来てとまる。跳ねたり、ついばんだり、首をかしげたりして、しばらくすると飛び去る
// 出入りは document に "kona:bird" で知らせる。とまったとき { state: "land", x, y }（画面座標）、飛び去るとき { state: "leave" }。猫が狙うのに使う
// "kona:bird-scare" を流すと、驚いて飛び去る

export interface BirdState { present: boolean; x: number; y: number }
type Phase = "away" | "arriving" | "perched" | "leaving";
export interface Bird {
  phase: Phase; t: number; next: number; stay: number;
  u: number; v: number; face: 1 | -1;
  from: [number, number]; to: [number, number];
  act: "idle" | "hop" | "peck" | "look"; actT: number; actLen: number; hopFrom: number; hopTo: number;
  scared: boolean;
}
export const newBird = (): Bird => ({
  phase: "away", t: 0, next: 4 + Math.random() * 20, stay: 0, u: 0, v: LEDGE, face: 1,
  from: [0, 0], to: [0, 0], act: "idle", actT: 0, actLen: 1, hopFrom: 0, hopTo: 0, scared: false,
});
const LEDGE = .975; // 窓の外の縁（ガラスの高さに対する位置）
let current: BirdState = { present: false, x: 0, y: 0 };
/** いま窓辺に鳥がとまっているか（とまっていれば画面座標） */
export const windowBird = () => current;
export const scareBird = () => document.dispatchEvent(new CustomEvent("kona:bird-scare"));

/** 鳥を進める。ok は鳥が来てよい天気・時間か */
export function stepBird(B: Bird, dt: number, ok: boolean) {
  B.t += dt;
  const ease = (x: number) => x * x * (3 - 2 * x);
  switch (B.phase) {
    case "away":
      if (!ok) { B.next = Math.max(B.next, B.t + 5); break; }
      if (B.t >= B.next) {
        const side = Math.random() < .5 ? -1 : 1;
        B.phase = "arriving"; B.t = 0; B.scared = false;
        B.from = [side < 0 ? -.12 : 1.12, .25 + Math.random() * .25]; B.to = [.15 + Math.random() * .7, LEDGE];
        B.face = side < 0 ? 1 : -1; B.stay = 15 + Math.random() * 35;
      }
      break;
    case "arriving": {
      const k = Math.min(1, B.t / 1.6), e = ease(k);
      B.u = B.from[0] + (B.to[0] - B.from[0]) * e;
      B.v = B.from[1] + (B.to[1] - B.from[1]) * e - Math.sin(k * Math.PI) * .12;
      if (k >= 1) { B.phase = "perched"; B.t = 0; B.u = B.to[0]; B.v = LEDGE; B.act = "idle"; B.actT = 0; B.actLen = .6; }
      break;
    }
    case "perched": {
      if (!ok || B.scared || B.t > B.stay) {
        B.phase = "leaving"; B.t = 0; B.from = [B.u, B.v];
        B.face = B.u < .5 ? -1 : 1;
        B.to = [B.face > 0 ? 1.15 : -.15, .05 + Math.random() * .2];
        break;
      }
      B.actT += dt;
      if (B.act === "hop") {
        const k = Math.min(1, B.actT / B.actLen);
        B.u = B.hopFrom + (B.hopTo - B.hopFrom) * k;
        B.v = LEDGE - Math.sin(k * Math.PI) * .05;
      }
      if (B.actT >= B.actLen) {
        B.v = LEDGE; B.actT = 0;
        const r = Math.random();
        if (r < .35) { // 跳ねる（ときどき向きを変える）
          if (Math.random() < .35) B.face = B.face > 0 ? -1 : 1;
          B.act = "hop"; B.actLen = .22; B.hopFrom = B.u;
          B.hopTo = Math.min(.9, Math.max(.1, B.u + B.face * (.025 + Math.random() * .04)));
        } else if (r < .65) { B.act = "peck"; B.actLen = .5 + Math.random() * .5; }
        else if (r < .8) { B.act = "look"; B.actLen = .8 + Math.random() * .8; B.face = B.face > 0 ? -1 : 1; }
        else { B.act = "idle"; B.actLen = .6 + Math.random() * 1.6; }
      }
      break;
    }
    case "leaving": {
      const k = Math.min(1, B.t / 1.3), e = k * k;
      B.u = B.from[0] + (B.to[0] - B.from[0]) * e;
      B.v = B.from[1] + (B.to[1] - B.from[1]) * Math.sqrt(k);
      if (k >= 1) { B.phase = "away"; B.t = 0; B.next = 30 + Math.random() * 90; }
      break;
    }
  }
}

/** 画面座標の更新と、出入りの知らせ */
export function publishBird(B: Bird, x: number, y: number) {
  const present = B.phase === "perched";
  const changed = present !== current.present;
  current = { present, x, y };
  if (changed) document.dispatchEvent(new CustomEvent("kona:bird", { detail: present ? { state: "land", x, y } : { state: "leave" } }));
}

const poly = (g: CanvasRenderingContext2D, c: string, p: number[]) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };

/** スズメ（ローポリ）。x, y は足もと、s は大きさ（体の長さのおよそ半分） */
export function drawBird(g: CanvasRenderingContext2D, B: Bird, x: number, y: number, s: number, t: number, dim: number, calm: boolean) {
  if (B.phase === "away") return;
  const flying = B.phase !== "perched" || B.act === "hop";
  const flap = flying && !calm ? Math.sin(t * (B.phase === "perched" ? 30 : 38)) : 0;
  const peck = B.phase === "perched" && B.act === "peck" && !calm ? Math.max(0, Math.sin(B.actT * 14)) : 0;
  const tilt = B.phase === "perched" && B.act === "look" && !calm ? Math.sin(B.actT * 4) * .25 : 0;
  g.save();
  g.translate(x, y); g.scale(B.face * s, s);
  if (B.phase !== "perched") g.rotate(B.phase === "leaving" ? -.25 : .1);
  g.globalAlpha = 1;
  const C = (hex: string) => { // 朝夕・雨の暗さに合わせて沈める
    const n = parseInt(hex.slice(1), 16), k = 1 - dim * .55;
    return `rgb(${Math.round((n >> 16) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
  };
  // 足
  if (B.phase === "perched") { g.strokeStyle = C("#4a3a2c"); g.lineWidth = .12; g.beginPath(); g.moveTo(-.15, -.45); g.lineTo(-.2, 0); g.moveTo(.2, -.45); g.lineTo(.18, 0); g.stroke(); }
  // 尾（上向きにぴんと）
  poly(g, C("#5a4230"), [-.7, -.78, -1.4, -1.5, -1.52, -1.32, -.78, -.56]);
  // 体: 背は茶、腹は淡い
  poly(g, C("#8a6646"), [-.85, -.7, -.4, -1.25, .45, -1.3, .85, -1.0, .8, -.55, .2, -.35, -.5, -.42]);
  poly(g, C("#d9cbb0"), [-.5, -.42, .2, -.35, .8, -.55, .85, -.85, .25, -.75, -.4, -.6]);
  // 翼: 濃い茶に白い筋。飛ぶときは羽ばたく
  if (flying) {
    const up = flap * .9;
    poly(g, C("#6a4a30"), [-.4, -1.05, .35, -1.15, .1 - .2 * up, -1.15 - 1.1 * up, -.5, -1.1 - .9 * up]);
    poly(g, C("#4a3424"), [-.4, -1.05, -.5, -1.1 - .9 * up, -.75, -1.0 - .6 * up]);
  } else {
    poly(g, C("#6a4a30"), [-.75, -.75, -.35, -1.15, .4, -1.15, .3, -.75]);
    poly(g, C("#4a3424"), [-.75, -.75, -1.05, -.8, -.4, -.95]);
    g.fillStyle = C("#e8e0d0"); g.fillRect(-.35, -.98, .55, .06);
  }
  // 頭: 栗色の帽子、白い頬に黒い斑点、黒いのど
  g.save();
  g.translate(.62, -1.18); g.rotate(peck * .9 + tilt);
  poly(g, C("#7a4a2a"), [-.3, -.05, -.15, -.5, .3, -.52, .5, -.25, .45, .05, .0, .12]);
  poly(g, C("#eee6d8"), [-.15, -.02, .1, -.3, .45, -.22, .45, .05, .05, .14]);
  g.fillStyle = C("#2a2420"); g.beginPath(); g.arc(.12, -.08, .07, 0, 7); g.fill(); // 頬の斑点
  poly(g, C("#2a2420"), [.25, .02, .45, .05, .38, .2, .22, .16]); // のど
  poly(g, C("#3a3028"), [.5, -.28, .72, -.2, .5, -.12]); // くちばし
  g.fillStyle = "#111"; g.beginPath(); g.arc(.32, -.3, .055, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(.33, -.33, .025, .025);
  g.restore();
  g.restore();
}
