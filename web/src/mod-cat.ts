// 猫の家具: キャットタワー（ベッドつき）・爪とぎ・ごはん。
// 猫が乗れる面には data-cat-plat を付ける（cat.ts が足場として測る）。data-sink はその面に沈む深さ（px）。
// 猫が使うと document に "kona:cat" が届き（detail.kind: eat / scratch / toy）、家具の見た目が変わる。
// ごはんを入れると "kona:feed" を出し、お腹の空いた猫が寄ってくる

import "./mod-cat.css";
import { onDocument, stored } from "./modctx";

const FOOD = "kona.catfood", SCRATCH = "kona.scratch";
const num = (k: string, d: number) => { try { const s = stored(k), v = Number(s); return Number.isFinite(v) && s !== null ? v : d; } catch { return d; } };
const put = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* 保存できなくても動く */ } };
// ---------- ローポリで描く道具 ----------
// 猫・小物と同じく、平らな多角形を同じ色の細い縁で塗って継ぎ目を消し、濃淡 4 段（光の当たる上・左が明るく、右・下が暗い）で形を見せる。
// 家具の大きさは画面で変わるので、実際の大きさを測ってから描き直す
type Shade = { hi: string; mid: string; lo: string; deep: string };
const CARPET: Shade = { hi: "#7a736c", mid: "#625c56", lo: "#4c4742", deep: "#35312d" };
const ROPE: Shade = { hi: "#cdb388", mid: "#ad9267", lo: "#8a724f", deep: "#5f4f37" };
const CLOTH: Shade = { hi: "#a78678", mid: "#8a6b5f", lo: "#6c5249", deep: "#4a3832" };
const FLEECE: Shade = { hi: "#d8c7b4", mid: "#c1ae9a", lo: "#a59180", deep: "#857262" };
const POM: Shade = { hi: "#f4b9a1", mid: "#e0907a", lo: "#bf6c58", deep: "#8f4b3c" };
const CARD: Shade = { hi: "#d2a86d", mid: "#b78b55", lo: "#966f42", deep: "#6a4d2d" };
const KRAFT: Shade = { hi: "#d8b88b", mid: "#be9b6c", lo: "#9d7c52", deep: "#705737" };
const pts = (ps: number[][]) => ps.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const tri = (c: string, ps: number[][]) => `<polygon style="fill:${c};stroke:${c}" points="${pts(ps)}"/>`;
const jit = (i: number, n = 1) => { const x = Math.sin(i * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };
/** el の大きさに合わせて SVG を描く（大きさが変わったら描き直す）。はみ出して描いてもよい */
function lowpoly(el: HTMLElement, draw: (w: number, h: number) => string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lp"); svg.setAttribute("aria-hidden", "true");
  el.prepend(svg);
  let lw = 0, lh = 0;
  const paint = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h || (w === lw && h === lh)) return;
    lw = w; lh = h;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = draw(w, h);
  };
  new ResizeObserver(paint).observe(el);
  paint();
}
/** 板（タワーの段・土台）: 上の面・前の面・両端の面。前の面は三角に割って、ゆるい凹凸を見せる */
function slab(S: Shade, seed: number) {
  return (w: number, h: number) => {
    const t = Math.min(h * .4, 5), e = Math.min(4, w * .04);
    let out = tri(S.hi, [[0, t], [e, 0], [w - e, 0], [w, t]]);
    const n = Math.max(2, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const a = i / n * w, b = (i + 1) / n * w, m = a + (b - a) * (.3 + .4 * jit(i, seed));
      out += tri(i % 2 ? S.mid : S.lo, [[a, t], [b, t], [m, h]]) + tri(i % 2 ? S.lo : S.mid, [[a, t], [m, h], [a, h]]) + tri(S.lo, [[m, h], [b, t], [b, h]]);
    }
    return out + tri(S.deep, [[w - e, h], [w, t], [w, h]]) + tri(S.hi, [[0, t], [e, h], [0, h]]);
  };
}
/** 麻縄を巻いた柱: 縦 3 面の角柱に、斜めに巻いた縄の段を面ごとの濃淡で描く */
function post(w: number, h: number) {
  const a = w * .3, b = w * .72, step = 5;
  let out = tri(ROPE.mid, [[0, 0], [w, 0], [w, h], [0, h]]);
  const faces: [number, number, Shade[keyof Shade], Shade[keyof Shade]][] = [[0, a, ROPE.hi, ROPE.mid], [a, b, ROPE.mid, ROPE.lo], [b, w, ROPE.lo, ROPE.deep]];
  for (const [x0, x1, c, d] of faces) {
    out += tri(c, [[x0, 0], [x1, 0], [x1, h], [x0, h]]);
    for (let y = -step; y < h + step; y += step) {
      const k = (x0 / w) * 2.4; // 縄は右へ行くほど下がる（巻きの傾き）
      out += tri(d, [[x0, y + k + 3], [x1, y + k + 2.4 * (x1 - x0) / w * 2 + 3], [x1, y + k + 2.4 * (x1 - x0) / w * 2 + 4.3], [x0, y + k + 4.3]]);
    }
  }
  return out;
}
/** 丸いベッド: ふちの盛り上がった布の器に、毛足の長いクッション */
function bed(w: number, h: number) {
  const r = h * .42;
  return tri(CLOTH.lo, [[0, r], [w * .06, h * .9], [w * .2, h], [w * .8, h], [w * .94, h * .9], [w, r]])
    + tri(CLOTH.mid, [[w * .2, h], [w * .5, r * 1.3], [w * .8, h]])
    + tri(CLOTH.deep, [[w * .8, h], [w, r], [w * .94, h * .9]])
    + tri(CLOTH.hi, [[0, r], [w * .07, 0], [w * .3, -1], [w * .2, r * .9]]) + tri(CLOTH.mid, [[w * .2, r * .9], [w * .3, -1], [w * .7, -1], [w * .8, r * .9]])
    + tri(CLOTH.lo, [[w * .8, r * .9], [w * .7, -1], [w * .93, 0], [w, r]])
    + tri(FLEECE.mid, [[w * .14, r * 1.05], [w * .3, r * .55], [w * .7, r * .55], [w * .86, r * 1.05], [w * .5, r * 1.5]])
    + tri(FLEECE.hi, [[w * .14, r * 1.05], [w * .3, r * .55], [w * .48, r * .62], [w * .36, r * 1.2]])
    + tri(FLEECE.lo, [[w * .6, r * 1.3], [w * .7, r * .55], [w * .86, r * 1.05]]);
}
/** ぽんぽん: 八角形を三角に割った毛糸玉 */
function pom(w: number, h: number) {
  const cx = w / 2, cy = h / 2, R = w / 2, P = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 - Math.PI / 8; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
  const col = [POM.mid, POM.lo, POM.deep, POM.lo, POM.mid, POM.hi, POM.hi, POM.mid];
  return P.map((p, i) => tri(col[i], [[cx, cy], p, P[(i + 1) % 8]])).join("") + tri(POM.hi, [[cx - R * .2, cy - R * .2], [cx - R * .55, cy - R * .5], [cx, cy - R * .7]]);
}
/** 段ボール箱: 前の面を折れ目とテープで分け、三角の面で少しへこんだ紙の張りを見せる。開いたふたが左右に倒れる */
function box(w: number, h: number) {
  const f = 38, rim = 5, tape = w * .12, cx = w / 2;
  return tri(CARD.deep, [[2, -rim], [w - 2, -rim], [w - 4, 2], [4, 2]]) // 奥の壁の内側
    + tri(CARD.lo, [[w, 0], [w + f * .96, -f * .3], [w + f * .9, -f * .3 + 6], [w, 3]]) + tri(CARD.mid, [[w, 0], [w + f * .96, -f * .3], [w + f * .4, -f * .14]])
    + tri(CARD.hi, [[0, 0], [-f * .96, -f * .3], [-f * .9, -f * .3 + 6], [0, 3]]) + tri(CARD.mid, [[0, 0], [-f * .96, -f * .3], [-f * .4, -f * .14]])
    + tri(CARD.hi, [[0, 0], [cx, 0], [w * .3, h * .55], [0, h * .7]]) + tri(CARD.mid, [[0, h * .7], [w * .3, h * .55], [cx, h], [0, h]])
    + tri(CARD.mid, [[cx, 0], [w, 0], [w, h * .6], [w * .72, h * .5]]) + tri(CARD.lo, [[w * .72, h * .5], [w, h * .6], [w, h], [cx, h]])
    + tri(CARD.mid, [[w * .3, h * .55], [cx, 0], [w * .72, h * .5], [cx, h]])
    + tri(CARD.lo, [[w * .3, h * .55], [cx, h], [w * .72, h * .5], [cx, h * .62]])
    + tri("rgba(236,214,170,.55)", [[cx - tape / 2, 0], [cx + tape / 2, 0], [cx + tape / 2, h * .3], [cx - tape / 2, h * .32]]) // ガムテープ
    + tri(CARD.hi, [[0, 0], [w, 0], [w, 1.6], [0, 1.6]]) // ふちの切り口
    + tri(CARD.deep, [[w - 3, 0], [w, 0], [w, h], [w - 3, h]]);
}
/** 紙袋: 口をぎざぎざに折り返したクラフト紙。縦のまちの折れ目で面を分ける */
function bagArt(w: number, h: number) {
  const z = 10, band = 9;
  let back = "", teeth = Math.round(w / 9);
  for (let i = 0; i < teeth; i++) { const a = i / teeth * w, b = (i + 1) / teeth * w; back += tri(i % 2 ? KRAFT.deep : KRAFT.lo, [[a, 3], [(a + b) / 2, -z * .55], [b, 3]]); }
  const g1 = w * .16, g2 = w * .84;
  return back
    + tri(KRAFT.hi, [[0, 0], [g1, 0], [g1, h], [0, h]]) + tri(KRAFT.mid, [[g1, 0], [g2, 0], [g2 - 2, h * .5], [g1 + 2, h * .45]])
    + tri(KRAFT.hi, [[g1, 0], [g1 + 2, h * .45], [g1, h]]) + tri(KRAFT.mid, [[g1 + 2, h * .45], [g2 - 2, h * .5], [g2, h], [g1, h]])
    + tri(KRAFT.lo, [[g2, 0], [w, 0], [w, h], [g2, h]]) + tri(KRAFT.deep, [[g2, 0], [g2 + 2, h * .5], [g2, h]])
    + tri(KRAFT.lo, [[g1 + 2, h * .45], [g2 - 2, h * .5], [(g1 + g2) / 2, h * .62]])
    + tri("rgba(255,240,210,.22)", [[0, 0], [w, 0], [w, band], [0, band]]) + tri("rgba(0,0,0,.18)", [[0, band], [w, band], [w, band + 1.2], [0, band + 1.2]]);
}

type CatEvent = CustomEvent<{ kind: "eat" | "scratch" | "toy"; amount?: number }>;
/** 家具が DOM から外れたら、聞くのをやめる */
function listen(root: HTMLElement, f: (e: CatEvent) => void) {
  onDocument(root, "kona:cat", e => f(e as CatEvent));
}

// ---------- キャットタワー ----------
// 麻縄を巻いた柱に、高さの違う 3 段の板。いちばん上に丸いベッド、真ん中の板の下にはぽんぽんが揺れている
export function mountCatTower(body: HTMLElement) {
  body.innerHTML = `<div class="ctower">
    <i class="ct-post" style="left:22%;bottom:0;height:64%"></i>
    <i class="ct-post" style="left:66%;bottom:0;height:88%"></i>
    <div class="ct-deck" data-cat-plat="perch" style="left:4%;width:44%;bottom:34%"></div>
    <div class="ct-deck" data-cat-plat="perch" style="left:44%;width:44%;bottom:62%"></div>
    <div class="ct-deck ct-top" style="left:38%;width:56%;bottom:88%"></div>
    <div class="ct-bed" data-cat-plat="bed" data-sink="5" style="left:41%;width:50%;bottom:calc(88% + var(--deck))"></div>
    <div class="ct-toy" style="left:46%;top:38%"><i class="ct-string"></i><i class="ct-pom"></i></div>
    <div class="ct-base" data-cat-plat="perch"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".ctower")!, toy = root.querySelector<HTMLElement>(".ct-toy")!;
  root.querySelectorAll<HTMLElement>(".ct-post").forEach(e => lowpoly(e, post));
  root.querySelectorAll<HTMLElement>(".ct-deck, .ct-base").forEach((e, i) => lowpoly(e, slab(CARPET, i + 1)));
  lowpoly(root.querySelector<HTMLElement>(".ct-bed")!, bed);
  lowpoly(root.querySelector<HTMLElement>(".ct-pom")!, pom);
  const swing = () => { toy.classList.remove("hit"); void toy.offsetWidth; toy.classList.add("hit"); };
  toy.addEventListener("click", swing);
  listen(root, e => { if (e.detail.kind === "toy") swing(); });
}

// ---------- 爪とぎ ----------
// 床に置く段ボールの爪とぎ。とぐほど表面がけば立ち、まわりに削りくずが散る（覚えておく）
export function mountScratcher(body: HTMLElement) {
  body.innerHTML = `<div class="cscr">
    <div class="cs-pad" data-cat-plat="pad" data-sink="1"><i class="cs-wear"></i></div>
    <i class="cs-bits"></i>
    <div class="cs-board" data-cat-plat="deck"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".cscr")!, bits = root.querySelector<HTMLElement>(".cs-bits")!;
  let n = num(SCRATCH, 0);
  const paint = () => {
    root.style.setProperty("--wear", String(Math.min(1, n / 40)));
    // 削りくず: といだ回数に応じて少しずつ増える（多すぎない）
    const k = Math.min(9, Math.floor(n / 3));
    bits.innerHTML = Array.from({ length: k }, (_, i) => {
      const x = (i * 37 % 100), side = i % 2 ? 1 : -1;
      return `<b style="left:${side < 0 ? 6 + x * .12 : 82 + x * .12}%;transform:rotate(${(i * 53) % 180}deg)"></b>`;
    }).join("");
  };
  paint();
  listen(root, e => { if (e.detail.kind === "scratch") { n++; put(SCRATCH, n); paint(); } });
  // 片づける: ダブルクリックで削りくずを掃除する
  root.addEventListener("dblclick", () => { n = Math.min(n, 2); put(SCRATCH, n); paint(); });
}

// ---------- ごはん ----------
// 食器と水入れ。食器を押すとカリカリを入れる。猫が食べた分だけ減る
export function mountCatFood(body: HTMLElement) {
  body.innerHTML = `<div class="cfood">
    <i class="cf-mat"></i>
    <button class="cf-bowl" data-bowl aria-label="ごはんを入れる"><i class="cf-kibble"></i><i class="cf-dish"></i></button>
    <i class="cf-water"><i></i></i>
    <div class="cf-board" data-cat-plat="deck"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".cfood")!, bowl = root.querySelector<HTMLButtonElement>(".cf-bowl")!;
  let level = num(FOOD, .6);
  const paint = () => {
    bowl.dataset.level = level.toFixed(2);
    root.style.setProperty("--food", String(level));
    bowl.title = level < .05 ? "空っぽ。押すとごはんを入れる" : level < .4 ? "少し残っている。押すと足す" : "ごはんが入っている";
  };
  paint();
  bowl.addEventListener("click", () => {
    level = 1; put(FOOD, level); paint();
    document.dispatchEvent(new CustomEvent("kona:feed"));
  });
  listen(root, e => { if (e.detail.kind === "eat") { level = Math.max(0, level - (e.detail.amount ?? .15)); put(FOOD, level); paint(); } });
}

// ---------- 箱・紙袋 ----------
// 空いた段ボール箱と、口を折り返した紙袋。猫は見つけると入りたがり、中に収まって顔だけ出す。
// ダブルクリックで箱と紙袋を取り替える（覚えておく）
const BOX = "kona.box";
export function mountCatBox(body: HTMLElement) {
  body.innerHTML = `<div class="cbox">
    <div class="cb-in" data-cat-plat="box" data-sink="26"></div>
    <div class="cb-board" data-cat-plat="deck"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".cbox")!;
  let isBag = num(BOX, 0) === 1;
  const inner = root.querySelector<HTMLElement>(".cb-in")!;
  lowpoly(inner, (w, h) => isBag ? bagArt(w, h) : box(w, h)); // 箱と紙袋は大きさが違うので、切り替えると描き直される
  const paint = () => {
    const bag = isBag;
    root.classList.toggle("bag", bag);
    root.title = bag ? "紙袋（ダブルクリックで箱にする）" : "段ボール箱（ダブルクリックで紙袋にする）";
  };
  paint();
  root.addEventListener("dblclick", () => { isBag = !isBag; put(BOX, isBag ? 1 : 0); paint(); });
}
