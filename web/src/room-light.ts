// 部屋の明かり: 時刻で部屋全体（棚・モジュール・猫）の色味が移る
// 朝は澄んだ白、昼はそのまま、夕方は窓から橙の光が差し込み、夜は暖かい電灯の色で四隅が少し暗くなる
// 窓辺があれば、その窓から外の空の色の光がこぼれる（窓の景色の時刻・雨・雪と同じものを見ている）

import { skyAt, windowRain, roomLightOn, currentScene } from "./mod-window";
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

export function initRoomLight() {
  // 乗算と加算の 2 枚を body 直下に置く（入れ子にすると下の画面と混ざらない）
  const layer = (cls: string) => { const e = document.createElement("div"); e.className = `room-light ${cls}`; e.setAttribute("aria-hidden", "true"); document.body.append(e); return e; };
  const tintEl = layer("room-tint"), spillEl = layer("room-spill");
  let wet = 0, last = 0;
  const update = () => {
    const on = roomLightOn();
    tintEl.hidden = spillEl.hidden = !on;
    if (!on) return;
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const t = performance.now(), dt = last ? (t - last) / 1000 : 99; last = t;
    wet += ((windowRain() ? 1 : 0) - wet) * (1 - Math.exp(-dt / 4));
    const scene = currentScene();
    const L = roomLight(h, wet, scene === "snow", seasonAt(now).wi);
    tintEl.style.background = `radial-gradient(ellipse 85% 80% at 50% 45%, ${rgba(L.tint)} 40%, ${rgba(L.edge)} 100%)`;
    // 窓からこぼれる光: 窓辺のモジュールがあればその位置から、斜め下へ広がる
    const win = document.querySelector<HTMLElement>("#view-home:not([hidden]) .mod-window .win");
    const r = win?.getBoundingClientRect();
    if (r && r.width > 0 && L.spill > .005) {
      const cx = r.left + r.width / 2, cy = r.top + r.height * .55, rx = Math.max(r.width * 1.6, 260), ry = Math.max(r.height * 2.2, 260);
      spillEl.style.background = `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, ${rgba(L.spillCol, L.spill)} 0%, ${rgba(L.spillCol, L.spill * .4)} 45%, ${rgba(L.spillCol, 0)} 100%)`;
    } else spillEl.style.background = "none";
  };
  update();
  setInterval(update, 1000);
  addEventListener("resize", update);
}
