// 棚の段の「窓」: 背表紙の列を横に送って見せる部分。
// - 面陳の欄が棚の端にあるときは、窓は1つ（ふつうの横スクロール）
// - 欄が棚の途中にあるときは、欄の左右に窓が2つ。1本の列を、左の窓 → 右の窓と続けて映す
// どちらの場合も、窓の端で一部しか見えない背表紙は隠し（棚に入りきらない本は置かない）、
// ホイールで送ったときは背表紙の左端がそろう位置で止める。

import { reduceMotion } from "./prefs";

const offsets = new Map<string, number>(); // 窓が2つある段の、列の送り量（段の id ごと）
const rApplied = new WeakMap<HTMLElement, number>(); // 右の窓に最後に合わせた位置

// 窓や段の大きさが変わったら（ジャケットの差し替え・モジュールの幅の変更など）、並びを合わせ直す
const watch = new ResizeObserver(entries => {
  const rows = new Set<HTMLElement>();
  for (const e of entries) {
    const el = e.target as HTMLElement;
    const twin = el.closest<HTMLElement>(".row.two-panes");
    if (twin) rows.add(twin);
    else if (el.classList.contains("spines")) hidePartials(el);
  }
  rows.forEach(applyOffset);
});

/** 段を描き直す前に、前の窓の見張りを外す */
export function unwatchRow(row: HTMLElement) {
  watch.unobserve(row);
  row.querySelectorAll(".spines").forEach(el => watch.unobserve(el));
}

/** container の中の窓の見張りをすべて外す（container を捨てる前に呼ぶ） */
export function unwatchIn(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>(".spines, .row.two-panes").forEach(el => watch.unobserve(el));
}

/** 窓が1つの段 */
export function mountSingle(pane: HTMLElement) {
  pane.addEventListener("scroll", () => hidePartials(pane), { passive: true });
  watch.observe(pane);
}

/** 窓が2つの段。列の頭は左の窓の左端から、尻尾は右の窓の右端まで（どちらの窓も空にならない） */
export function mountTwin(row: HTMLElement, l: HTMLElement, r: HTMLElement) {
  const id = row.dataset.row!;
  // 右の窓は列の途中から映すので、列が短くても映し始めの位置まで送れるよう、後ろに窓1つ分の余白を足す
  const tail = document.createElement("span"); tail.className = "spine-gap"; r.append(tail);
  [row, l, r].forEach(el => watch.observe(el));
  // キーボード操作などで窓が勝手に送られたら、それに合わせてもう片方の窓をそろえる
  l.addEventListener("scroll", () => {
    if (Math.abs(l.scrollLeft - (offsets.get(id) ?? 0)) > 1) { offsets.set(id, l.scrollLeft); applyOffset(row); }
  });
  r.addEventListener("scroll", () => {
    const d = r.scrollLeft - (rApplied.get(row) ?? r.scrollLeft);
    if (Math.abs(d) > 1) { offsets.set(id, (offsets.get(id) ?? 0) + d); applyOffset(row); }
  });
}

/** フォルダの継ぎ目にあける隙間 */
export function folderGap(prev: string, next: string) {
  const g = document.createElement("span");
  g.className = "folder-gap"; g.title = `${prev} ｜ ${next}`; g.setAttribute("aria-hidden", "true");
  return g;
}

function panesOf(row: HTMLElement) {
  const [l, r] = row.querySelectorAll<HTMLElement>(".pane-l, .pane-r");
  return l && r ? { l, r } : undefined;
}

// 列の背表紙の位置（左の窓の中での左端・右端）。左から順に並んでいる
function spans(l: HTMLElement) {
  return [...l.querySelectorAll<HTMLElement>(".spine")].map(el => [el.offsetLeft, el.offsetLeft + el.offsetWidth] as const);
}
// 条件を満たす最初の添字（条件は左から右へ一度だけ偽→真に変わる）
function firstWhere(n: number, ok: (i: number) => boolean) {
  let lo = 0, hi = n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ok(m)) hi = m; else lo = m + 1; }
  return lo;
}

// 送り量 s のとき、右の窓は左の窓から何 px 先を映すか（左の窓に収まりきらなかった最初の1冊から）
function rightShift(l: HTMLElement, s: number, sp = spans(l)) {
  const b = nearestSpine(l, s) ?? s;
  const i = firstWhere(sp.length, k => sp[k][1] > b + l.clientWidth + 0.5);
  return i < sp.length ? sp[i][0] - b : l.clientWidth;
}

// 送れる上限: 背表紙の左端で止めたときに、列の最後の1冊がまるごと右の窓に入る最初の位置
function paneMax(row: HTMLElement) {
  const p = panesOf(row);
  if (!p) return 0;
  const { l, r } = p, sp = spans(l);
  if (!sp.length) return 0;
  const end = sp[sp.length - 1][1];
  const i = firstWhere(sp.length, k => sp[k][0] + rightShift(l, sp[k][0], sp) + r.clientWidth >= end - 0.5);
  return i < sp.length ? sp[i][0] : 0;
}

function applyOffset(row: HTMLElement) {
  const p = panesOf(row);
  if (!p || !p.l.clientWidth) return; // まだ並べ終わっていないときは送り量を触らない
  const { l, r } = p, id = row.dataset.row!;
  r.querySelector<HTMLElement>(".spine-gap")!.style.width = `${r.clientWidth}px`;
  const s = Math.max(0, Math.min(paneMax(row), offsets.get(id) ?? 0));
  offsets.set(id, s);
  l.scrollLeft = s;
  // 右の窓は、左の窓に収まりきらなかった最初の1冊から映す（背表紙を欄の左右で切らない）
  r.scrollLeft = s + rightShift(l, s);
  rApplied.set(row, r.scrollLeft);
  hidePartials(l); hidePartials(r);
}

// 位置 x に最も近い背表紙の左端（ここで止めると、窓の左端で本が切れない）
function nearestSpine(pane: HTMLElement, x: number) {
  let best: number | undefined;
  for (const el of pane.querySelectorAll<HTMLElement>(".spine")) {
    if (best === undefined || Math.abs(el.offsetLeft - x) < Math.abs(best - x)) best = el.offsetLeft;
    else if (el.offsetLeft > x) break;
  }
  return best;
}

// 窓の端で一部しか見えない背表紙は隠す
function hidePartials(pane: HTMLElement) {
  const a = pane.scrollLeft, z = a + pane.clientWidth;
  pane.querySelectorAll<HTMLElement>(".spine").forEach(el => {
    const l = el.offsetLeft, r = l + el.offsetWidth;
    el.classList.toggle("cut", r > a + 0.5 && l < z - 0.5 && (l < a - 0.5 || r > z + 0.5));
  });
}

// ---------- ホイールで横に送る ----------

// 横に送れるもの: ふつうはその要素のスクロール、窓が2つある段は列の送り量
interface Scroller { get(): number; set(v: number): void; max(): number }
function scrollerOf(el: HTMLElement): Scroller {
  if (el.classList.contains("two-panes")) {
    const id = el.dataset.row!;
    return {
      get: () => offsets.get(id) ?? 0,
      set: v => { offsets.set(id, v); applyOffset(el); },
      max: () => paneMax(el),
    };
  }
  return { get: () => el.scrollLeft, set: v => { el.scrollLeft = v; }, max: () => el.scrollWidth - el.clientWidth };
}

// 1目盛り（多くの環境で 100px）で背表紙 1〜2 冊分だけ送る
const WHEEL_STEP = 0.4;

// ホイールの量は目標位置にためておき、毎フレーム残りの距離の一部ずつ近づけて滑らかに送る。
// raw はためた量そのもの、to はそれを背表紙の左端にそろえた止まる位置
const glides = new Map<HTMLElement, { pos: number; to: number; raw?: number }>();
function glide(el: HTMLElement, to: number, raw?: number) {
  const sc = scrollerOf(el);
  if (reduceMotion()) { sc.set(to); return; }
  const g = glides.get(el);
  if (g) { g.to = to; g.raw = raw; return; }
  glides.set(el, { pos: sc.get(), to, raw });
  requestAnimationFrame(function step() {
    const g = glides.get(el);
    if (!g || !el.isConnected) { glides.delete(el); return; }
    if (Math.abs(sc.get() - g.pos) > 2) g.pos = sc.get(); // つまみやタッチで動かされたら、そこから続ける
    g.pos += (g.to - g.pos) * 0.16;
    if (Math.abs(g.to - g.pos) < 0.5) { sc.set(g.to); glides.delete(el); return; }
    sc.set(g.pos);
    requestAnimationFrame(step);
  });
}

/** 棚の上でマウスホイールを回すと横に送る。端まで来たら通常の縦スクロールに戻す */
export function installWheel() {
  addEventListener("wheel", e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const target = e.target as HTMLElement;
    if (target.closest("#pop")) return; // 曲目パネルは縦に送る
    const list = target.closest<HTMLElement>(".np-tracks");
    if (list && list.scrollWidth <= list.clientWidth) return;
    const twin = target.closest<HTMLElement>(".row.two-panes");
    const el = twin ?? target.closest(".box")?.closest<HTMLElement>(".packed") ?? target.closest<HTMLElement>(".spines, .packed, .np-tracks");
    if (!el) return;
    const sc = scrollerOf(el);
    const dx = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1) * WHEEL_STEP;
    const g = glides.get(el);
    const from = g?.raw ?? g?.to ?? sc.get();
    if ((dx < 0 && from <= 0) || (dx > 0 && from >= sc.max() - 1)) return;
    e.preventDefault();
    const raw = Math.max(0, Math.min(sc.max(), from + dx));
    const pane = twin ? twin.querySelector<HTMLElement>(".pane-l") : el.classList.contains("spines") ? el : null;
    const snap = pane ? nearestSpine(pane, raw) : undefined;
    glide(el, snap === undefined ? raw : Math.max(0, Math.min(sc.max(), snap)), raw);
  }, { passive: false });
}
