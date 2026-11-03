// 部屋の明かり: 時刻で部屋全体（棚・モジュール・猫）の色味が移る
// 朝は澄んだ白、昼はそのまま、夕方は窓から橙の光が差し込み、夜は暖かい電灯の色で四隅が少し暗くなる
// 窓辺があれば、その窓から外の空の色の光がこぼれる（窓の景色の時刻・雨・雪と同じものを見ている）
// 晴れていて日が出ていれば、窓の形の日だまりが部屋に落ちる。太陽の位置で向きと長さが変わり（朝夕は低く長く橙に、昼は短く白く）、
// 2 枚のガラスと召し合わせ・枠の影、左のカーテンの透けた影が映る。窓から日だまりまでは、空気中の光の筋がうっすら見える

import { skyAt, windowRain, roomLightOn, currentScene, windowGlass } from "./mod-window";
import { sunAt } from "./window-sky";
import { mixN, rgba, seasonAt, type RGB } from "./window-scenes";

const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
const WHITE: RGB = [255, 255, 255];

/** 時刻 h の部屋の色。tint は乗算する色（白で変化なし）、edge は四隅の色、spill は窓からこぼれる光（加算） */
export function roomLight(h: number, wet: number, snow: boolean, winter: number) {
  const night = h < 5 || h > 19.5 ? 1 : h < 6 ? 6 - h : h > 18.5 ? h - 18.5 : 0;
  const morning = bell(h, 7, 1.4), dusk = bell(h, 17.6, 1.1);
  let tint: RGB = WHITE;
  tint = mixN(tint, [238, 243, 255], morning * (.7 + .3 * winter));      // 朝: 青みのある澄んだ光
  tint = mixN(tint, [255, 222, 186], dusk);                               // 夕方: 橙
  tint = mixN(tint, [236, 214, 188], night);                              // 夜: 電灯の暖かい色
  tint = mixN(tint, [232, 236, 242], wet * (1 - night) * .8);             // 雨の昼: 灰色に沈む
  const edge = mixN(tint, [150, 136, 122], .28 * night + .1 * wet);
  const [, sky] = skyAt(h);
  const spillCol = snow ? mixN(sky, [235, 242, 255], .5) : sky;
  let spill = (.1 + .16 * dusk + .06 * morning + (snow ? .06 : 0)) * (1 - night) * (1 - wet * .6);
  let spillC = spillCol;
  return { tint, edge, spillCol: spillC, spill };
}

/** 日差し: 窓のガラス（画面座標）から部屋へ落ちる日だまりと光の筋を描く */
interface Glass { x: number; y: number; w: number; h: number; curtain: number; bar: number }
function drawSunbeam(c: HTMLCanvasElement, G: Glass, sun: { u: number; el: number }, k: number, col: number[], clipOut: DOMRect | null, patchOnly: boolean, gain: number) {
  const px = Math.min(1.5, devicePixelRatio || 1), W = Math.round(innerWidth * px), H = Math.round(innerHeight * px);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(px, 0, 0, px, 0, 0);
  const low = 1 - sun.el;
  // 光は太陽と反対の側へ、低い太陽ほど遠く長く落ちる
  const dy = G.h * (.45 + 1.5 * low), stretch = 1 + 1.3 * low, shear = -(sun.u - .5) * (.25 + .2 * low); // 横へのずれは控えめに（窓の下から大きく外れない）
  const map = (x: number, y: number): [number, number] => { const yy = G.y + dy + (y - G.y) * stretch; return [x + shear * (yy - y), yy]; };
  const quad = (x0: number, x1: number, y0: number, y1: number) => [map(x0, y0), map(x1, y0), map(x1, y1), map(x0, y1)];
  g.save();
  if (clipOut) { g.beginPath(); g.rect(0, 0, innerWidth, innerHeight); g.rect(clipOut.left, clipOut.top, clipOut.width, clipOut.height); g.clip("evenodd"); }
  g.globalCompositeOperation = "lighter";
  // 光の筋: ガラスから日だまりへ。窓の近くほど濃く、空気に散って消えていく
  if (!patchOnly) {
  const hull = [[G.x, G.y], [G.x + G.w, G.y], [G.x + G.w, G.y + G.h], [G.x, G.y + G.h], ...quad(G.x, G.x + G.w, G.y, G.y + G.h)];
  const cx = hull.reduce((a, p) => a + p[0], 0) / hull.length, cy = hull.reduce((a, p) => a + p[1], 0) / hull.length;
  hull.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  const [ex, ey] = map(G.x + G.w / 2, G.y + G.h);
  const shaft = g.createLinearGradient(G.x + G.w / 2, G.y + G.h / 2, ex, ey);
  shaft.addColorStop(0, `rgba(${col},${(.07 * k).toFixed(3)})`); shaft.addColorStop(1, `rgba(${col},${(.015 * k).toFixed(3)})`);
  g.fillStyle = shaft; g.beginPath(); hull.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  // 筋の濃淡（空気中のちりが光る帯）
  for (let i = 0; i < 5; i++) {
    const f0 = (i * .21 + .07) % 1, f1 = f0 + .035 + (i % 2) * .03, xa = G.x + G.w * f0, xb = G.x + G.w * f1;
    const [p0, p1, p2, p3] = [[xa, G.y + G.h * .1], [xb, G.y + G.h * .1], map(xb, G.y + G.h), map(xa, G.y + G.h)];
    const st = g.createLinearGradient(p0[0], p0[1], p3[0], p3[1]);
    st.addColorStop(0, `rgba(${col},${(.05 * k).toFixed(3)})`); st.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = st; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill();
  }
  }
  // 日だまり: 2 枚のガラスの形。枠と召し合わせは影になり、カーテンの下は布越しに弱く
  const b = G.bar, mid = G.x + G.w / 2;
  const panes: [number, number, number][] = [[G.x + b, mid - b * 1.2, 1], [mid + b * 1.2, G.x + G.w - b, 1]];
  const pane = (x0: number, x1: number, a: number) => {
    if (x1 <= x0) return;
    const q = quad(x0, x1, G.y + b, G.y + G.h - b);
    const gr = g.createLinearGradient(q[0][0], q[0][1], q[3][0], q[3][1]);
    gr.addColorStop(0, `rgba(${col},${Math.min(1, .34 * a * k * gain).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},${Math.min(1, .24 * a * k * gain).toFixed(3)})`);
    g.fillStyle = gr; g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  };
  for (const [x0, x1] of panes) {
    // カーテンのかかった部分と、かかっていない部分
    const cut = Math.max(x0, Math.min(x1, G.curtain));
    pane(x0, cut, .35); pane(cut, x1, 1);
  }
  g.restore();
}

export function initRoomLight() {
  // 乗算と加算の 2 枚を body 直下に置く（入れ子にすると下の画面と混ざらない）
  const layer = (cls: string) => { const e = document.createElement("div"); e.className = `room-light ${cls}`; e.setAttribute("aria-hidden", "true"); document.body.append(e); return e; };
  const tintEl = layer("room-tint"), spillEl = layer("room-spill");
  // 日差しの層: ぼかして影のふちをやわらかく（半影）
  // 光の筋とうっすらした明るさは加算（screen）で、日だまりは下の色を明るく照らす覆い焼き（color-dodge）で重ねる。
  // 覆い焼きにすると、棚の木や本の背は色を保ったまま明るくなり、暗い壁は暗いまま少しだけ明るむ
  const canvasLayer = (cls: string) => { const e = document.createElement("canvas"); e.className = `room-light room-beam ${cls}`; e.setAttribute("aria-hidden", "true"); document.body.append(e); return e; };
  const beam = canvasLayer("room-beam-air"), patch = canvasLayer("room-beam-patch");
  let beamKey = "";
  let wet = 0, last = 0;
  const update = () => {
    const on = roomLightOn();
    tintEl.hidden = spillEl.hidden = beam.hidden = patch.hidden = !on;
    if (!on) return;
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const t = performance.now(), dt = last ? (t - last) / 1000 : 99; last = t;
    wet += ((windowRain() ? 1 : 0) - wet) * (1 - Math.exp(-dt / 4));
    const scene = currentScene();
    const L = roomLight(h, wet, scene === "snow", seasonAt(now).wi);
    tintEl.style.background = `radial-gradient(ellipse 85% 80% at 50% 45%, ${rgba(L.tint)} 40%, ${rgba(L.edge)} 100%)`;
    // 窓からこぼれる光（空の光）: 窓辺のモジュールがあればその下へ、やわらかく広がる
    const win = document.querySelector<HTMLElement>("#view-home:not([hidden]) .mod-window .win");
    const r = win?.getBoundingClientRect();
    if (r && r.width > 0 && L.spill > .005) {
      const cx = r.left + r.width / 2, cy = r.top + r.height * .7, rx = Math.max(r.width * 1.2, 220), ry = Math.max(r.height * 1.6, 220);
      spillEl.style.background = `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, ${rgba(L.spillCol, L.spill * .7)} 0%, ${rgba(L.spillCol, L.spill * .25)} 50%, ${rgba(L.spillCol, 0)} 100%)`;
    } else spillEl.style.background = "none";
    // 日差し
    const sun = sunAt(h), k = sun && r && r.width > 0 ? Math.min(1, sun.el * 5) * (.55 + .45 * (1 - sun.el)) * (1 - wet) ** 2 : 0;
    if (!sun || k < .02 || !win || !r) { if (beamKey) { for (const c of [beam, patch]) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); beamKey = ""; } return; }
    const wg = windowGlass(), cv = win.querySelector("canvas");
    if (!wg.canvas || wg.canvas !== cv || !wg.w) return;
    const cr = cv.getBoundingClientRect();
    const G = { x: cr.left + wg.x, y: cr.top + wg.y, w: wg.w, h: wg.h, curtain: cr.left + wg.curtain, bar: Math.max(2, Math.min(cr.width, cr.height) * .045 * .38) };
    const col = mixN([255, 240, 212], [255, 138, 58], (1 - sun.el) ** 1.1).map(Math.round);
    const key = [G.x, G.y, G.w, G.h, G.curtain, Math.round(sun.u * 400), Math.round(k * 50), col, innerWidth, innerHeight].map(v => typeof v === "number" ? Math.round(v) : v).join("|");
    if (key === beamKey) return;
    beamKey = key;
    drawSunbeam(beam, G, sun, k, col, r, false, .5);
    drawSunbeam(patch, G, sun, k, mixN(col, [255, 255, 255], .3).map(Math.round), r, true, .75);
  };
  update();
  setInterval(update, 1000);
  addEventListener("resize", update);
}
