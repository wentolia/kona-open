// 置くもの: 設定の「部屋」→「置くもの」の見本を、ホームへドラッグして置く。
// 小物は落とした棚に（その棚の小物の中で、落とした位置の順に）、家具は床の落とした左右の位置に置く。
// ホームの小物はドラッグで別の棚へ移せる。小物も家具も、設定の上へ戻して落とすとしまう。
import { objectArt } from "./mod-objects";
import { thingThumb, toggleThing, setThing, placedThings } from "./room-things";
import { roomSurface, setRoomSurface } from "./room-surface";
import { renderSettings } from "./settings";

export interface PlaceHooks {
  /** 小物を棚に置く（at は棚の右端の小物の中で何番目か、x はアルバムの並ぶ所に置くときの棚の中の左右の位置）。shelfId がなければしまう */
  putObject(key: string, shelfId?: string, at?: number, x?: number): void;
  /** 置ける棚か */
  isShelf(id: string): boolean;
  /** 置いてある棚 */
  shelfOf(key: string): string | undefined;
}

type Src = { kind: "obj" | "thing"; key: string; from: HTMLElement | SVGElement; placed: boolean };
type Drop = { to: "shelf"; id: string; mod: HTMLElement } | { to: "floor" } | { to: "away" } | undefined;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function sourceOf(n: EventTarget | null, h: PlaceHooks): Src | undefined {
  if (!(n instanceof Element)) return undefined;
  const tile = n.closest<HTMLElement>("#view-settings [data-put]");
  if (tile) {
    const [kind, key] = tile.dataset.put!.split(":") as ["obj" | "thing", string];
    return { kind, key, from: tile, placed: kind === "obj" ? !!h.shelfOf(key) : (placedThings() as string[]).includes(key) };
  }
  const svg = n.closest<SVGSVGElement>("#view-home .goods > svg"); // 棚の右端の小物も、アルバムのあいだの小物も
  if (svg?.dataset.goods) return { kind: "obj", key: svg.dataset.goods, from: svg, placed: true };
  return undefined;
}

function dropAt(x: number, y: number, src: Src, h: PlaceHooks): Drop {
  const at = document.elementsFromPoint(x, y);
  if (at.some(e => e.closest("#view-settings .set"))) return { to: "away" };
  if (!at.some(e => e.closest("#view-home"))) return undefined;
  if (src.kind === "thing") return { to: "floor" };
  for (const e of at) {
    const mod = e.closest<HTMLElement>(".mod[data-id]");
    if (mod && h.isShelf(mod.dataset.id!)) return { to: "shelf", id: mod.dataset.id!, mod };
  }
  return undefined;
}

/** アルバムの並ぶ所に落としたなら、その棚の中の左右の位置（0 左端〜1 右端）。棚の右端の小物の所や、アルバムのない棚なら undefined */
function anchorIn(mod: HTMLElement, x: number, y: number): number | undefined {
  if (mod.dataset.kind === "goods") return undefined;
  const end = mod.querySelector(".goods:not(.goods-float)");
  if (end && !(end as HTMLElement).hidden) { const r = end.getBoundingClientRect(); if (x >= r.left - 4 && y >= r.top && y <= r.bottom) return undefined; }
  const row = mod.querySelector<HTMLElement>(".shelf-line > .row");
  if (!row || !row.querySelector(".spine")) return undefined;
  const r = row.getBoundingClientRect();
  return Math.round(Math.max(0.02, Math.min(0.98, (x - r.left) / Math.max(1, r.width))) * 1000) / 1000;
}

/** 落とした位置が、その棚の小物の中で何番目か（ドラッグしている小物自身は数えない） */
function indexIn(mod: HTMLElement, x: number, self: Element) {
  const kids = [...mod.querySelectorAll(".goods > svg")].filter(e => e !== self);
  return kids.filter(e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2 < x; }).length;
}

export function initPlaceDrag(h: PlaceHooks) {
  document.addEventListener("pointerdown", e => {
    if (e.button !== 0 || (e.target as Element)?.closest?.(".size-knob")) return;
    const src = sourceOf(e.target, h);
    if (!src) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost: HTMLElement | undefined, drop: Drop, over: HTMLElement | undefined;

    const start = () => {
      ghost = document.createElement("div");
      ghost.className = `put-ghost put-ghost-${src.kind}`;
      if (src.kind === "obj") { const art = objectArt(src.key); if (art) ghost.append(art); }
      else ghost.append(thingThumb(src.key, 64));
      document.body.append(ghost);
      document.body.classList.add("putting");
      src.from.classList.add("put-from");
    };
    const move = (ev: PointerEvent) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!ghost) start();
      ev.preventDefault();
      ghost!.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
      drop = dropAt(ev.clientX, ev.clientY, src, h);
      const mod = drop?.to === "shelf" ? drop.mod : undefined;
      if (mod !== over) { over?.classList.remove("put-over"); mod?.classList.add("put-over"); over = mod; }
      ghost!.dataset.to = drop?.to ?? "";
      document.querySelector("#view-settings .set")?.classList.toggle("put-away", drop?.to === "away" && src.placed);
    };
    const up = (ev: PointerEvent) => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      if (!ghost) return;
      ghost.remove(); over?.classList.remove("put-over");
      document.body.classList.remove("putting"); src.from.classList.remove("put-from");
      document.querySelector("#view-settings .set")?.classList.remove("put-away");
      // ドラッグのあとに来るクリック（灯りが点く・見本を押した扱いになる）は捨てる
      const eat = (ce: Event) => { ce.stopPropagation(); ce.preventDefault(); };
      addEventListener("click", eat, { capture: true, once: true });
      setTimeout(() => removeEventListener("click", eat, { capture: true }), 300);
      if (ev.type === "pointercancel" || !drop) return;
      if (src.kind === "obj") {
        if (drop.to === "shelf") h.putObject(src.key, drop.id, indexIn(drop.mod, ev.clientX, src.from), anchorIn(drop.mod, ev.clientX, ev.clientY));
        else if (drop.to === "away" && src.placed) h.putObject(src.key);
        return;
      }
      if (drop.to === "away") { if (src.placed) { toggleThing(src.key, false); renderSettings(); } return; }
      // 家具: 床を敷いていなければ木の床を敷いてから、落とした左右の位置に置く
      if (roomSurface().floor === "none") setRoomSurface({ floor: "oak" });
      if (!(placedThings() as string[]).includes(src.key)) toggleThing(src.key, true);
      const el = document.querySelector<HTMLElement>(`#view-home .room-things [data-thing="${src.key}"]`);
      const L = el?.parentElement?.getBoundingClientRect();
      if (el && L) {
        const w = el.getBoundingClientRect().width;
        setThing(src.key, { x: clamp((ev.clientX - w / 2 - L.left) / Math.max(1, L.width - w), 0, 1) }, true);
      }
      renderSettings();
    };
    addEventListener("pointermove", move, { passive: false }); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
}
