// ホームで直接さわる: 棚の小物と床の家具にカーソルを乗せると、右上の角につまみが出る。
// つまみを右上へ引くと大きく、左下へ押すと小さくなる（50〜150%。ダブルクリックで 100% に戻す）。
// 床の家具は左右と奥行き（上下）に、壁のものは上下左右にドラッグして置き場所を変えられる。ダブルクリックで左右を反転。
// 何を置くかは設定で選ぶ。位置（棚の小物）は自動
import "./size-knob.css";
import { objectSize, setObjectSize, SIZE_MIN, SIZE_MAX } from "./mod-objects";
import { thingSize, thingOf, setThing, removeThing, flipThing, canFlip, defOf, THING_MIN, THING_MAX } from "./room-things";
import { renderSettings } from "./settings";
import { clamp } from "./dom";

type Target = { el: HTMLElement | SVGElement; kind: "obj" | "thing"; key: string };

function targetOf(n: EventTarget | null): Target | undefined {
  if (!(n instanceof Element)) return undefined;
  const svg = n.closest<SVGSVGElement>("#view-home .goods > svg");
  if (svg?.dataset.goods) return { el: svg, kind: "obj", key: svg.dataset.goods };
  const th = n.closest<HTMLElement>("#view-home :is(.room-things, .room-wall) .thing");
  if (th?.dataset.thing) return { el: th, kind: "thing", key: th.dataset.thing };
  return undefined;
}
const sizeOf = (t: Target) => t.kind === "obj" ? objectSize(t.key) : thingSize(t.key);
const range = (t: Target) => t.kind === "obj" ? [SIZE_MIN, SIZE_MAX] : [THING_MIN, THING_MAX];
const setSize = (t: Target, v: number, done = false) => t.kind === "obj" ? setObjectSize(t.key, v) : setThing(t.key, { s: v }, done);

let knob: HTMLButtonElement | undefined;
let cur: Target | undefined;
let busy = false, hideT = 0;

function place() {
  if (!knob || !cur) return;
  if (!cur.el.isConnected) { hide(); return; }
  const r = cur.el.getBoundingClientRect();
  knob.style.left = `${Math.round(r.right - 8)}px`;
  knob.style.top = `${Math.round(r.top - 8)}px`;
}
function show(t: Target) {
  if (!knob) return;
  cur = t;
  knob.dataset.v = `${Math.round(sizeOf(t) * 100)}%`;
  knob.hidden = false;
  place();
}
function hide() { if (knob && !busy) { knob.hidden = true; knob.classList.remove("active"); cur = undefined; } }

export function initSizeKnob() {
  if (knob) return;
  knob = document.createElement("button");
  knob.type = "button"; knob.className = "size-knob"; knob.hidden = true;
  knob.setAttribute("aria-label", "大きさを変える"); knob.title = "引いて大きさを変える（ダブルクリックで元の大きさ）";
  document.body.append(knob);

  document.addEventListener("pointerover", e => {
    if (busy || (e as PointerEvent).pointerType === "touch") return;
    const t = targetOf(e.target);
    if (t) { clearTimeout(hideT); show(t); }
    else if (e.target !== knob) { clearTimeout(hideT); hideT = window.setTimeout(hide, 500); }
  });
  addEventListener("scroll", () => place(), true);
  addEventListener("resize", () => place());
  addEventListener("hashchange", () => { busy = false; hide(); });

  // つまみ: 引いた量（右と上を足す）を、その物の高さに対する割合として大きさに足す
  knob.addEventListener("pointerdown", e => {
    if (!cur || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const t = cur, s0 = sizeOf(t), h0 = Math.max(40, t.el.getBoundingClientRect().height), sx = e.clientX, sy = e.clientY, [lo, hi] = range(t);
    let v = s0;
    busy = true; knob!.classList.add("active"); knob!.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      v = Math.round(clamp(s0 * (1 + ((ev.clientX - sx) - (ev.clientY - sy)) / h0), lo, hi) * 100) / 100;
      setSize(t, v); knob!.dataset.v = `${Math.round(v * 100)}%`; place();
    };
    const up = () => {
      knob!.removeEventListener("pointermove", move); knob!.removeEventListener("pointerup", up); knob!.removeEventListener("pointercancel", up);
      busy = false; knob!.classList.remove("active");
      setSize(t, v, true); place();
    };
    knob!.addEventListener("pointermove", move); knob!.addEventListener("pointerup", up); knob!.addEventListener("pointercancel", up);
  });
  knob.addEventListener("dblclick", () => { if (cur) { setSize(cur, 1, true); knob!.dataset.v = "100%"; place(); } });

  // 床の家具: 左右と奥行き（上へ引くと奥）、壁のもの: 上下左右にドラッグして動かす（少し動かしてから。押しただけでは動かない）
  document.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const t = targetOf(e.target);
    if (t?.kind !== "thing") return;
    const it = thingOf(t.key), def = it && defOf(it.k);
    if (!it || !def) return;
    const el = t.el as HTMLElement, layer = el.parentElement!, wall = def.at === "wall", deep = !wall && !def.flat;
    const r0 = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, offX = sx - r0.left, offY = sy - r0.top, d0 = it.d ?? 0;
    let moving = false, x = it.x, y = it.y ?? 0, d = d0;
    const move = (ev: PointerEvent) => {
      if (!moving && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      if (!moving) { moving = true; busy = true; el.classList.add("moving"); document.body.classList.add("arranging"); }
      const L = layer.getBoundingClientRect(), r = el.getBoundingClientRect();
      x = clamp((ev.clientX - offX - L.left) / Math.max(1, L.width - r.width), 0, 1);
      if (wall) y = clamp((ev.clientY - offY - L.top) / Math.max(1, L.height - r.height), 0, 1);
      if (deep) d = Math.round(clamp(d0 - (ev.clientY - sy) / 60, 0, 1) * 20) / 20;
      setThing(t.key, wall ? { x, y } : deep ? { x, d } : { x }); place();
    };
    const up = (ev: PointerEvent) => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      if (!moving) return;
      busy = false; el.classList.remove("moving"); document.body.classList.remove("arranging");
      // 設定の上で放したらしまう
      if (document.elementsFromPoint(ev.clientX, ev.clientY).some(n => n.closest("#view-settings .set"))) { hide(); removeThing(t.key); renderSettings(); return; }
      setThing(t.key, wall ? { x, y } : deep ? { x, d } : { x }, true); place();
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  // ダブルクリックで左右を反転（猫の家具は中に仕掛けがあるので反転しない）
  document.addEventListener("dblclick", e => {
    const t = targetOf(e.target);
    if (t?.kind !== "thing" || !canFlip(t.key)) return;
    flipThing(t.key);
  });
}
