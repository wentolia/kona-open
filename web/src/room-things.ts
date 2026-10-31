// 部屋のしつらえ: 天井の吊りもの（モビール・吊りランプ・ミラーボール）、雨の日の傘立て、香り（コーヒーの湯気・お香の煙）
// どれも猫や小物と同じローポリ。部屋の明かりの層の下にあるので、時刻の色味に一緒に染まる。操作は素通り
// 吊りものは音に合わせてゆっくり回り、ミラーボールは曲が鳴っている間だけ部屋に光の粒を散らす

import "./room-things.css";
import { prefs, reduceMotion } from "./prefs";
import { ctx } from "./modctx";
import { windowRain } from "./mod-window";
import { noiseLevel } from "./noise";
import { poly, blob, lit } from "./room-decor";
import { seasonAt } from "./window-scenes";
import { markCoffee } from "./shelf-marks";

const hourNow = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const dark = (h: number) => h < 6.5 || h >= 17.5; // ランプを灯す時間

// ---------------- 天井の吊りもの ----------------
// モビール: 2 段の腕に、ローポリの鳥と葉。奥行きは横の伸び縮みと重なり順で見せる
const MOBILE_ITEMS = [
  { tier: 0, ph: 0, kind: "bird", c: "#c8a46a", lo: "#9c7a44" }, { tier: 0, ph: Math.PI, kind: "leaf", c: "#7e9a72", lo: "#5b7552" },
  { tier: 1, ph: Math.PI / 2, kind: "bird", c: "#c97a64", lo: "#9a5442" }, { tier: 1, ph: Math.PI * 1.5, kind: "star", c: "#e2d3a8", lo: "#b8a676" },
];
function mobileShape(kind: string, c: string, lo: string) {
  if (kind === "bird") return poly(c, [-9, 0, 0, -3, 9, -1, 3, 3]) + poly(lo, [-9, 0, 3, 3, -2, 3]) + poly(c, [-2, -2, 3, -10, 4, -2]) + poly(lo, [6, -1, 11, -3, 9, 0]);
  if (kind === "leaf") return poly(c, [0, -9, 5, -2, 0, 9, -5, -2]) + poly(lo, [0, -9, 0, 9, 5, -2]);
  return poly(c, blob(0, 0, 7, 7, 5, -Math.PI / 2).map((v, i) => i % 4 >= 2 ? v * .45 : v)) + poly(lo, [0, 0, 3, 2, 0, 7]);
}

export function initRoomThings() {
  // 天井から下がるもの（画面の上端から）
  const hang = document.createElement("div");
  hang.className = "room-hang"; hang.setAttribute("aria-hidden", "true");
  hang.innerHTML = `<svg viewBox="-80 -20 160 150" preserveAspectRatio="xMidYMin meet"></svg>`;
  const pool = document.createElement("div"); pool.className = "room-hang-pool"; pool.setAttribute("aria-hidden", "true");
  const spots = document.createElement("div"); spots.className = "room-spots"; spots.setAttribute("aria-hidden", "true");
  spots.innerHTML = Array.from({ length: 34 }, () => "<i></i>").join("");
  document.body.append(pool, spots, hang);
  const svg = hang.firstElementChild as SVGSVGElement;
  // 傘立て・香りは棚（ホームの格子）の中に置く
  const umb = document.createElement("div"); umb.className = "room-umbrella"; umb.setAttribute("aria-hidden", "true");
  umb.innerHTML = umbrellaSvg();
  const scent = document.createElement("div"); scent.className = "room-scent"; scent.setAttribute("aria-hidden", "true");

  let ang = 0, last = performance.now(), level = 0, scentKind = "";
  const wisps: SVGPathElement[] = [];
  const frame = () => {
    requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    if (document.body.dataset.state !== "ready" || document.body.hasAttribute("data-mini") || document.hidden) return;
    const p = prefs(), calm = reduceMotion(), h = hourNow(), t = now / 1000;
    let lv = 0;
    try { const pl = ctx().player; if (pl.playing) { const [l, r] = pl.levels(); lv = Math.min(1, (l + r) * 1.4); } } catch { /* まだ用意できていない */ }
    level += (lv - level) * (1 - Math.exp(-dt / .6));
    if (!calm) ang += dt * (.12 + level * .9);
    const home = document.querySelector<HTMLElement>("#view-home:not([hidden])");
    // ---- 吊りもの ----
    const kind = home ? p.hanging : "off";
    hang.dataset.kind = kind; pool.hidden = spots.hidden = true;
    if (kind !== "off") {
      svg.innerHTML = kind === "mobile" ? drawMobile(ang, calm ? 0 : Math.sin(t * .7) * 2 * (1 + level)) : kind === "lamp" ? drawLamp(calm ? 0 : Math.sin(t * .45) * (1.2 + 2 * level), dark(h)) : drawBall(ang * 1.6, level);
      if (kind === "lamp" && dark(h)) pool.hidden = false;
      if (kind === "mirrorball") placeSpots(spots, hang, ang * 1.6, level, h);
    }
    // ---- 傘立てと香り（ホームの格子の中） ----
    const grid = home?.querySelector<HTMLElement>(".grid");
    const rainy = windowRain() || noiseLevel("rain") > 0;
    if (grid) {
      if (umb.parentElement !== grid) grid.append(umb);
      umb.classList.toggle("on", p.umbrella && rainy);
      if (scent.parentElement !== grid) grid.append(scent);
      if (scentKind !== p.scent) {
        scentKind = p.scent; wisps.length = 0;
        scent.innerHTML = p.scent === "off" ? "" : scentSvg(p.scent);
        scent.querySelectorAll<SVGPathElement>(".wisp").forEach(w => wisps.push(w));
      }
      placeScent(scent, grid);
      // 湯気・煙: ゆらぎながら立ちのぼる。冬と朝は湯気がよく見える
      const cold = seasonAt(new Date()).wi * .5 + Math.exp(-(((h - 7.5) / 2.5) ** 2)) * .3;
      wisps.forEach((w, i) => {
        const inc = p.scent === "incense", len = inc ? 70 : 46, x0 = inc ? 72 : 50, y0 = inc ? 30 : 56;
        const pts: string[] = [];
        for (let k = 0; k <= 14; k++) {
          const v = k / 14, sway = calm ? 0 : Math.sin(v * (inc ? 7 : 4.5) - t * (inc ? .9 : 1.3) + i * 2.1) * (inc ? 9 : 6) * v * (.6 + v);
          pts.push(`${(x0 + (i - 1) * (inc ? 0 : 7) + sway + (inc ? v * v * 14 : 0)).toFixed(1)},${(y0 - v * len).toFixed(1)}`);
        }
        w.setAttribute("d", "M" + pts.join(" L"));
        w.style.opacity = String(inc ? .5 : Math.min(.75, .3 + cold) * (.75 + .25 * Math.sin(t * .6 + i)));
      });
    }
  };
  requestAnimationFrame(frame);
}

function drawMobile(a: number, sway: number) {
  let out = `<g transform="rotate(${sway.toFixed(2)} 0 0)"><line x1="0" y1="0" x2="0" y2="30" class="cord"/>`;
  // 腕: 上の段は長く、下の段は短く逆回り
  const tiers = [{ y: 30, r: 46, a }, { y: 74, r: 30, a: -a * 1.3 + .8 }];
  out += `<line x1="0" y1="30" x2="0" y2="74" class="cord"/>`;
  const items = MOBILE_ITEMS.map(it => {
    const T = tiers[it.tier], th = T.a + it.ph, x = Math.cos(th) * T.r, z = Math.sin(th);
    return { ...it, x, z, y: T.y, drop: it.tier ? 28 : 34 };
  }).sort((p, q) => p.z - q.z);
  for (const T of tiers) {
    const x = Math.cos(T.a) * T.r;
    out += `<line x1="${(-x).toFixed(1)}" y1="${T.y}" x2="${x.toFixed(1)}" y2="${T.y}" class="arm"/>`;
  }
  for (const it of items) {
    const s = .8 + .2 * it.z, fx = Math.abs(Math.cos(it.ph + it.z)) * .6 + .4; // 回ると横に細く見える
    out += `<line x1="${it.x.toFixed(1)}" y1="${it.y}" x2="${it.x.toFixed(1)}" y2="${it.y + it.drop}" class="thread"/>`;
    out += `<g transform="translate(${it.x.toFixed(1)} ${it.y + it.drop + 6}) scale(${(s * fx).toFixed(3)} ${s.toFixed(3)})" opacity="${(.75 + .25 * it.z).toFixed(2)}">${mobileShape(it.kind, it.c, it.lo)}</g>`;
  }
  return out + "</g>";
}

function drawLamp(sway: number, on: boolean) {
  const shade = poly("#3f5a4c", [-24, 96, 24, 96, 12, 74, -12, 74]) + poly("#2f463a", [0, 96, 24, 96, 12, 74, 0, 74]) + poly("#58786a", [-12, 74, 12, 74, 6, 68, -6, 68]) +
    poly("#c9a46a", [-25, 96, 25, 96, 24, 98, -24, 98]);
  const bulb = on ? `<ellipse cx="0" cy="98" rx="10" ry="4" fill="#ffe6b0"/><ellipse cx="0" cy="99" rx="22" ry="7" fill="rgba(255,214,150,.35)"/>`
    : `<ellipse cx="0" cy="98" rx="9" ry="3.4" fill="#e9e2d2" opacity=".75"/>`;
  return `<g transform="rotate(${sway.toFixed(2)} 0 0)"><line x1="0" y1="0" x2="0" y2="68" class="cord"/>${poly("#2c2c2c", [-3, 64, 3, 64, 3, 70, -3, 70])}${bulb}${shade}</g>`;
}

/** ミラーボール: 経線ごとに小さな鏡の面を並べ、回転で明るさが移る */
function drawBall(a: number, level: number) {
  const R = 20, cy = 80;
  let out = `<line x1="0" y1="0" x2="0" y2="${cy - R}" class="cord"/><circle cx="0" cy="${cy}" r="${R}" fill="#4a4e58"/>`;
  const rows = 7, cols = 14;
  for (let r = 0; r < rows; r++) {
    const la0 = -Math.PI / 2 + r / rows * Math.PI, la1 = la0 + Math.PI / rows;
    for (let c = 0; c < cols; c++) {
      const lo0 = a + c / cols * Math.PI * 2, lo1 = lo0 + Math.PI * 2 / cols;
      if (Math.cos((lo0 + lo1) / 2) < 0) continue; // 裏側
      const P = (la: number, lo: number) => [Math.sin(lo) * Math.cos(la) * R, cy + Math.sin(la) * R];
      const q = [...P(la0, lo0), ...P(la0, lo1), ...P(la1, lo1), ...P(la1, lo0)];
      const face = Math.cos((lo0 + lo1) / 2) * Math.cos((la0 + la1) / 2), k = (Math.sin(r * 12.9 + c * 78.2) * 43758.5) % 1;
      const glint = Math.abs(k) > .9 - level * .15 ? 1 : 0, l = 38 + face * 40 + glint * 30;
      out += poly(`hsl(220 8% ${l.toFixed(0)}%)`, q);
    }
  }
  return out + `<circle cx="-7" cy="${cy - 8}" r="4" fill="rgba(255,255,255,.55)"/>`;
}

/** ミラーボールの光の粒: 球のまわりの向きを回し、こちら側に来た粒を壁（画面）に映す */
function placeSpots(el: HTMLElement, hang: HTMLElement, a: number, level: number, h: number) {
  const r = hang.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .47;
  const W = innerWidth, H = innerHeight, strength = level * (dark(h) ? 1 : .45);
  if (strength < .03) return;
  el.hidden = false;
  [...el.children].forEach((s, i) => {
    const az = a + i * 2.399, el2 = Math.sin(i * 1.7) * .9, front = Math.cos(az);
    const e = s as HTMLElement;
    if (front < .1) { e.style.opacity = "0"; return; }
    const x = cx + Math.sin(az) * W * .7, y = cy + (el2 * .5 + .45) * H;
    e.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) scale(${(.6 + front * .6).toFixed(2)})`;
    e.style.opacity = (strength * front * (.5 + .5 * Math.sin(i * 3.1))).toFixed(2);
    e.style.background = ["#fff6d8", "#d8ecff", "#ffd8ec", "#e8ffd8"][i % 4];
  });
}

// ---------------- 傘立て（雨の日） ----------------
function umbrellaSvg() {
  return `<svg viewBox="0 0 60 120" preserveAspectRatio="xMidYMax meet">
    <ellipse cx="30" cy="117" rx="26" ry="3" class="puddle"/>
    <!-- 紺の傘とビニール傘 -->
    <g>${poly("#7a5a3a", [19, 6, 22, 6, 22, 14, 19, 14])}${poly("#7a5a3a", [16, 3, 22, 3, 22, 6, 16, 6])}
      ${poly("#26324a", [16, 14, 25, 14, 23, 82, 18, 82])}${poly("#1b2438", [21, 14, 25, 14, 23, 82, 21, 82])}${poly("#3a4a6a", [17, 18, 19, 18, 19.5, 70, 18.4, 70])}</g>
    <g>${poly("#d8dde2", [40, 2, 43, 2, 43, 10, 40, 10])}${poly("rgba(220,232,240,.55)", [35, 12, 46, 12, 43, 84, 38, 84])}${poly("rgba(255,255,255,.5)", [36, 14, 38, 14, 39.5, 70, 38.4, 70])}${poly("#9aa4ac", [40.2, 10, 41.4, 10, 41.4, 92, 40.2, 92])}</g>
    <!-- 筒 -->
    ${poly("#8a7a66", [8, 64, 52, 64, 50, 116, 10, 116])}${poly("#6e604f", [30, 64, 52, 64, 50, 116, 30, 116])}${poly("#a8977f", [8, 64, 52, 64, 50, 68, 10, 68])}
    ${poly("#5a4e40", [10, 84, 50, 84, 50, 87, 10, 87])}${poly("#5a4e40", [10, 102, 50, 102, 50, 105, 10, 105])}
    <circle class="drip" cx="24" cy="116" r="1.4"/><circle class="drip d2" cx="38" cy="116" r="1.2"/>
  </svg>`;
}

// ---------------- 香り ----------------
function scentSvg(kind: string) {
  const grad = `<defs><linearGradient id="wisp-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  if (kind === "coffee") return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet">${grad}
    ${[0, 1, 2].map(() => `<path class="wisp" stroke="url(#wisp-g)" fill="none"/>`).join("")}
    ${poly("#e8e2d6", blob(50, 95, 30, 5, 10))}${lit(50, 95, 30, 5, "#f6f2ea", 7)}
    ${poly("#d9d2c3", [30, 60, 70, 60, 66, 92, 34, 92])}${poly("#bfb6a4", [52, 60, 70, 60, 66, 92, 52, 92])}${poly("#efe9dd", [30, 60, 70, 60, 69, 64, 31, 64])}
    ${poly("#4a2e1e", blob(50, 61.5, 18, 2.4, 10))}
    ${poly("#cfc7b6", [70, 66, 80, 68, 80, 82, 68, 86, 68, 81, 75, 79, 75, 71, 69, 70])}</svg>`;
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet">${grad}
    <path class="wisp incense" stroke="url(#wisp-g)" fill="none"/>
    ${poly("#3a3430", blob(44, 94, 30, 5, 10))}${poly("#5a5048", [16, 88, 72, 88, 68, 95, 20, 95])}${poly("#6e6258", [16, 88, 72, 88, 70, 86, 18, 86])}
    ${poly("#8a3a2a", [40, 86, 42, 86, 72, 30, 70.5, 29.5])}<circle cx="71.6" cy="29.6" r="1.6" class="ember"/></svg>`;
}

/** いちばん上の棚の右端（季節の飾りがあればその左）に置く */
function placeScent(el: HTMLElement, grid: HTMLElement) {
  const shelf = grid.querySelector<HTMLElement>(".mod-shelf");
  if (!shelf || !el.firstElementChild) { el.style.display = "none"; return; }
  el.style.display = "";
  const g = grid.getBoundingClientRect(), r = shelf.getBoundingClientRect();
  const board = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--board")) || 11;
  const h = Math.min(70, Math.max(40, r.height * .26)), w = h;
  const dec = grid.querySelector<HTMLElement>(".room-decor");
  const right = dec ? dec.getBoundingClientRect().left - g.left - 6 : r.right - g.left - 14;
  Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${right - w}px`, top: `${r.bottom - g.top - board - h}px` });
  if (prefs().scent === "coffee") markCoffee(shelf, g.left + right - w / 2); // カップの下にしみが残る（1 日 1 回数える）
}
