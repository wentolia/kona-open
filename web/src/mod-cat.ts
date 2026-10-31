// 猫の家具: キャットタワー（ベッドつき）・爪とぎ・ごはん。
// 猫が乗れる面には data-cat-plat を付ける（cat.ts が足場として測る）。data-sink はその面に沈む深さ（px）。
// 猫が使うと document に "kona:cat" が届き（detail.kind: eat / scratch / toy）、家具の見た目が変わる。
// ごはんを入れると "kona:feed" を出し、お腹の空いた猫が寄ってくる

import "./mod-cat.css";

const FOOD = "kona.catfood", SCRATCH = "kona.scratch";
const num = (k: string, d: number) => { try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) && localStorage.getItem(k) !== null ? v : d; } catch { return d; } };
const put = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* 保存できなくても動く */ } };
type CatEvent = CustomEvent<{ kind: "eat" | "scratch" | "toy"; amount?: number }>;
/** 家具が DOM から外れたら、聞くのをやめる */
function listen(root: HTMLElement, f: (e: CatEvent) => void) {
  const h = (e: Event) => { if (!root.isConnected) document.removeEventListener("kona:cat", h); else f(e as CatEvent); };
  document.addEventListener("kona:cat", h);
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
    <div class="ct-bed" data-cat-plat="bed" data-sink="5" style="left:41%;width:50%;bottom:calc(88% + var(--deck))"><i class="ct-cushion"></i></div>
    <div class="ct-toy" style="left:46%;top:38%"><i class="ct-string"></i><i class="ct-pom"></i></div>
    <div class="ct-base" data-cat-plat="perch"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".ctower")!, toy = root.querySelector<HTMLElement>(".ct-toy")!;
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
    <div class="cb-in" data-cat-plat="box" data-sink="26"><i class="cb-back"></i><i class="cb-front"></i><i class="cb-flap l"></i><i class="cb-flap r"></i></div>
    <div class="cb-board" data-cat-plat="deck"></div>
  </div>`;
  const root = body.querySelector<HTMLElement>(".cbox")!;
  let bag = num(BOX, 0) === 1;
  const paint = () => {
    root.classList.toggle("bag", bag);
    root.title = bag ? "紙袋（ダブルクリックで箱にする）" : "段ボール箱（ダブルクリックで紙袋にする）";
  };
  paint();
  root.addEventListener("dblclick", () => { bag = !bag; put(BOX, bag ? 1 : 0); paint(); });
}
