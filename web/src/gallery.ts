// 見本帳（items.html）: items/ の部屋に置くものを、床・壁・棚の上に並べて見る。試作（draft）もここにだけ出る。
// 大きさ（50/100/150%）・左右反転・昼と夜・猫の足場の線を切り替えられる。押すと大きく見る（50/100/150% を並べる）
import "./fonts";
import "./gallery.css";
import { ALL_ITEMS, viewBoxOf, type ItemDef } from "./items";
import { startLive } from "./items/live";

const PLACE = { floor: "床", wall: "壁", shelf: "棚" } as const;
/** 画面の 1px あたりの、描いた大きさ（置き場所ごとに同じ縮尺で並べ、大きさを見比べられるように） */
const SCALE = { floor: .5, wall: .75, shelf: 1 } as const;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const st = { place: "all", state: "all", size: 1, flip: false, light: "night", plats: false };
try { Object.assign(st, JSON.parse(localStorage.getItem("kona.gallery") || "{}")); } catch { /* ignore */ }
const keep = () => { try { localStorage.setItem("kona.gallery", JSON.stringify(st)); } catch { /* ignore */ } };

function artHTML(d: ItemDef, z: number, flip: boolean, maxW = Infinity, maxH = Infinity) {
  const h0 = d.flat ? (d.vh ?? 40) * .6 : d.h;
  const k = Math.min(z, maxW / d.w, maxH / h0), w = d.w * k, h = h0 * k;
  const art = d.art(), plats = art.match(/<i [^>]*><\/i>/g) ?? [];
  return `<div class="g-art${d.flat ? " flat" : ""}${flip ? " flip" : ""}" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">` +
    `<svg viewBox="${viewBoxOf(d)}" preserveAspectRatio="${d.flat ? "none" : "xMidYMax meet"}" aria-hidden="true">${art.replace(/<i [^>]*><\/i>/g, "")}</svg>${plats.join("")}</div>`;
}

function card(d: ItemDef) {
  return `<button type="button" class="g-card${d.draft ? " draft" : ""}" data-k="${d.key}">
    <div class="g-scene ${d.at}">${artHTML(d, SCALE[d.at] * st.size, st.flip, 150, 112)}</div>
    <div class="g-meta">
      <div class="g-name">${esc(d.label)}<span class="g-tag${d.draft ? " draft" : ""}">${d.draft ? "試作" : "今ある"}</span><span class="g-tag">${esc(d.cat)}</span></div>
      <div class="g-sub">${d.key} · ${d.w}×${d.flat ? "敷く" : d.h}</div>
      ${d.note ? `<div class="g-note">${esc(d.note)}</div>` : ""}
    </div></button>`;
}

const seg = (name: string, opts: [string, string][], cur: string) =>
  `<span class="g-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-set="${name}" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join("")}</span>`;

function render() {
  document.documentElement.dataset.light = st.light;
  document.documentElement.dataset.plats = st.plats ? "on" : "off";
  const list = ALL_ITEMS.filter(d => (st.place === "all" || d.at === st.place) && (st.state === "all" || (st.state === "draft") === !!d.draft));
  const n = ALL_ITEMS.length, drafts = ALL_ITEMS.filter(d => d.draft).length;
  document.body.innerHTML = `
    <header class="g-top">
      <h1>KONA 見本帳<small>${n} 品（試作 ${drafts}）</small></h1>
      <div class="g-ctl">
        ${seg("place", [["all", "すべて"], ["floor", "床"], ["wall", "壁"], ["shelf", "棚"]], st.place)}
        ${seg("state", [["all", "すべて"], ["now", "今ある"], ["draft", "試作"]], st.state)}
        ${seg("size", [[".5", "50%"], ["1", "100%"], ["1.5", "150%"]], String(st.size).replace(/^0/, ""))}
        ${seg("flip", [["0", "そのまま"], ["1", "反転"]], st.flip ? "1" : "0")}
        ${seg("light", [["night", "夜"], ["day", "昼"]], st.light)}
        ${seg("plats", [["0", "足場なし"], ["1", "猫の足場"]], st.plats ? "1" : "0")}
      </div>
    </header>
    <main>${(["floor", "wall", "shelf"] as const).map(p => {
      const xs = list.filter(d => d.at === p);
      return xs.length ? `<section class="g-sec"><h2>${PLACE[p]}<span>${xs.length}</span></h2><div class="g-grid">${xs.map(card).join("")}</div></section>` : "";
    }).join("")}</main>
    <div class="g-big" hidden></div>`;
  animate(document.body);
}
/** 動きのあるものは、見本帳でも鳴っているつもりで動かす */
function animate(root: Element) {
  root.querySelectorAll<HTMLElement>("[data-k], .g-big-in").forEach(c => {
    const d = ALL_ITEMS.find(x => x.key === (c.dataset.k ?? c.dataset.big));
    c.querySelectorAll<SVGSVGElement>(".g-art svg").forEach(svg => startLive(d, svg));
  });
}

function big(d: ItemDef) {
  const el = document.querySelector<HTMLElement>(".g-big")!, z = SCALE[d.at] * (d.at === "floor" ? 1.4 : 1.6);
  el.innerHTML = `<div class="g-big-in" data-big="${d.key}">
    <div class="g-scene ${d.at}"><div class="g-row">${[.5, 1, 1.5].map(s => artHTML(d, z * s, st.flip, 260, 300)).join("")}</div></div>
    <div class="g-meta"><button type="button" class="g-x">閉じる</button>
      <div class="g-name">${esc(d.label)}<span class="g-tag${d.draft ? " draft" : ""}">${d.draft ? "試作" : "今ある"}</span><span class="g-tag">${esc(d.cat)}</span></div>
      <div class="g-sub">${d.key} · ${PLACE[d.at]} · ${d.w}×${d.flat ? "敷く" : d.h} · 50% / 100% / 150%</div>
      ${d.note ? `<div class="g-note">${esc(d.note)}</div>` : ""}</div></div>`;
  el.hidden = false;
  animate(el);
}

document.addEventListener("click", e => {
  const t = e.target as Element;
  const b = t.closest<HTMLElement>("[data-set]");
  if (b) {
    const k = b.dataset.set!, v = b.dataset.v!;
    if (k === "size") st.size = Number(v); else if (k === "flip" || k === "plats") (st as Record<string, unknown>)[k] = v === "1"; else (st as Record<string, unknown>)[k] = v;
    keep(); render(); return;
  }
  const c = t.closest<HTMLElement>(".g-card");
  if (c) { const d = ALL_ITEMS.find(x => x.key === c.dataset.k); if (d) big(d); return; }
  const g = t.closest<HTMLElement>(".g-big");
  if (g && (t.closest(".g-x") || t === g)) g.hidden = true;
});
addEventListener("keydown", e => { if (e.key === "Escape") document.querySelector<HTMLElement>(".g-big")?.setAttribute("hidden", ""); });
render();
