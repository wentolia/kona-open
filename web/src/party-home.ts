// リスニングパーティーの「ホームの写し」: ホストのホーム（棚の並び・モジュールの配置）を、参加者の画面に見るだけの形で組み立てる。
//  - ホストは自分の画面に出ているホームから、形（段・列・モジュールの種類と比率）と、棚に並んだアルバムの順を読み取って送る
//  - アルバムは使い捨ての番号（a0, a1…）で呼ぶ。フォルダの場所などは送らない。送るのは題名・アーティスト・色・曲数・年だけ
//  - ジャケットは、参加者の画面で要るものだけを小さな JPEG にして、頼まれたときに送る。曲目も頼まれたときだけ
//  - 参加者の側では、HTML を受け取らない。届いた文字は textContent、色は形を確かめてから style に入れる
//  - 時計・窓・小物・猫の家具は、参加者の端末で動く飾りとしてそのまま置く。再生中・EQ などは、ホストの「いま流れているもの」の札だけ

import { ctx, everyFrame, fmt, mountingWith, releaseIn, type ModOverride } from "./modctx";
import type { Player } from "./player";
import { enrichTracks, type Album } from "./library";
import { mountModule } from "./modules";
import { esc } from "./dom";
import { modeButtonHTML } from "./modeui";
import { hashOf } from "./album-sort";
import { OBJECTS, placeObjects, objectSize } from "./mod-objects";
import { thingsLayer } from "./room-things";
import { mountSingle, mountTwin, unwatchIn } from "./panes";
import type { ModuleType } from "./shelves";
import { inSet, type AlbumSet } from "./tags";

// hs: 背表紙の高さ・ジャケットの切り取り位置を決める数（ホストの棚と同じばらつきにする）。r: ジャケットの縦横比
export interface SnapAlbum { id: string; t: string; a: string; c: string; n: number; y?: number; hs?: number; r?: number }
// pos: 面陳の位置（0 左端〜1 右端）。sid: 雑貨の棚の番号（小物の置き場所は棚ごと）
export interface SnapMod { type: ModuleType; title: string; h: number; kind?: string; albums?: string[]; face?: string; pos?: number; sid?: string; goods?: string[]; at?: Record<string, string> }
/** ホームの見た目の設定: <html> の data-*（棚板・壁・床・字体）と色などの変数、モジュールの設定（localStorage の値） */
export interface SnapLook { ds: Record<string, string>; css: Record<string, string>; store: Record<string, string> }
const LOOK_DS = ["shelf", "wall", "floor", "font"];
const LOOK_STORE = ["kona.clock", "kona.window", "kona.spectrum", "kona.objects", "kona.things", "kona.catfood", "kona.scratch", "kona.box", "kona.room"];
const SAFE_VAL = /^[#\w\s.,%()+\-/]{0,80}$/;
export function snapLook(): SnapLook {
  const root = document.documentElement, ds: Record<string, string> = {}, css: Record<string, string> = {}, store: Record<string, string> = {};
  for (const k of LOOK_DS) { const v = root.dataset[k]; if (v) ds[k] = v; }
  for (let i = 0; i < root.style.length && i < 60; i++) {
    const k = root.style[i];
    if (k.startsWith("--")) { const v = root.style.getPropertyValue(k).trim(); if (SAFE_VAL.test(v)) css[k] = v; }
  }
  for (const k of LOOK_STORE) { try { const v = localStorage.getItem(k); if (v && v.length < 6000) store[k] = v; } catch { /* ignore */ } }
  return { ds, css, store };
}
export function cleanLook(x: unknown): SnapLook | undefined {
  const o = x as Record<string, Record<string, unknown>> | undefined;
  if (!o || typeof o !== "object") return undefined;
  const pick = (src: unknown, ok: (k: string, v: string) => boolean, max: number) => {
    const out: Record<string, string> = {};
    if (!src || typeof src !== "object") return out;
    for (const [k, v] of Object.entries(src).slice(0, max)) if (typeof v === "string" && ok(k, v)) out[k] = v;
    return out;
  };
  return {
    ds: pick(o.ds, (k, v) => LOOK_DS.includes(k) && /^[a-z0-9-]{1,24}$/.test(v), 10),
    css: pick(o.css, (k, v) => /^--[a-z0-9-]{1,30}$/.test(k) && SAFE_VAL.test(v), 60),
    store: pick(o.store, (k, v) => { if (!LOOK_STORE.includes(k) || v.length > 6000) return false; try { JSON.parse(v); return true; } catch { return false; } }, 20),
  };
}
/** 参加者: 部屋を開いている間だけ、ホストの見た目にする。戻すための関数を返す */
export function applyLook(look: SnapLook): () => void {
  const root = document.documentElement;
  const wasDs: Record<string, string | undefined> = {}, wasCss: Record<string, string> = {};
  for (const k of LOOK_DS) { wasDs[k] = root.dataset[k]; if (look.ds[k]) root.dataset[k] = look.ds[k]; else delete root.dataset[k]; }
  for (const [k, v] of Object.entries(look.css)) { wasCss[k] = root.style.getPropertyValue(k); root.style.setProperty(k, v); }
  dispatchEvent(new Event("resize"));
  return () => {
    for (const k of LOOK_DS) { const v = wasDs[k]; if (v) root.dataset[k] = v; else delete root.dataset[k]; }
    for (const [k, v] of Object.entries(wasCss)) { if (v) root.style.setProperty(k, v); else root.style.removeProperty(k); }
    dispatchEvent(new Event("resize"));
  };
}
export interface SnapRow { h: number; cols: { w: number; cells: SnapMod[] }[] }
export interface SnapTrack { no: number; t: string; d: number }


const OWN: ModuleType[] = ["eq", "output"];
const TYPES: ModuleType[] = ["shelf", "player", "waveform", "eq", "clock", "info", "log", "output", "turntable", "window", "objects", "distance", "cattower", "scratcher", "catfood", "spectrum", "catbox"];
const MAX_ROWS = 24, MAX_COLS = 8, MAX_CELLS = 8, MAX_SHELF = 600, MAX_ALBUMS = 5000;

// ---------- ホスト: 読み取る ----------
// 番号はアルバムの key で振る。棚を読み直すとアルバムは新しいものに入れ替わる（古いジャケットの URL は捨てられ、
// 古い曲は鳴らせない）ので、引くときはいつもいまのアルバムを key で探す
let ids = new Map<string, string>(), byId = new Map<string, Album>();
const idOf = (a: Album) => {
  let id = ids.get(a.key);
  if (!id) { id = `a${ids.size}`; ids.set(a.key, id); }
  byId.set(id, a);
  return id;
};
const current = (id: string) => { const a = byId.get(id); return a ? ctx().byKey(a.key) ?? a : undefined; };
// 送るアルバムのセット（タグで絞る。null は「すべて」）。セットの外のアルバムは、棚・ジャケット・曲目・検索・リクエストのどれにも出さない
let share: AlbumSet | null = null;
export const shareSet = () => share;
export function setShareSet(s: AlbumSet | null) { share = s; }
const ok = (a: Album | undefined): a is Album => !!a && inSet(a, share);
export const albumOf = (id: string) => { const a = current(id); return ok(a) ? a : undefined; };
export function resetIds() { ids = new Map(); byId = new Map(); thumbs.clear(); }

const flexOf = (el: HTMLElement) => Math.max(.01, parseFloat(el.style.flex) || 1);
/** 画面に出ているホームから、形と棚の中身を読む */
export function snapshotHome(): { rows: SnapRow[]; albums: SnapAlbum[] } | undefined {
  const grid = document.querySelector<HTMLElement>("#view-home .grid");
  if (!grid) return undefined;
  const byKey = (k: string) => ctx().byKey(k);
  const used = new Set<Album>();
  const rows: SnapRow[] = [...grid.querySelectorAll<HTMLElement>(":scope > .lrow")].slice(0, MAX_ROWS).map(r => ({
    h: Math.round(parseFloat(r.style.height) || r.getBoundingClientRect().height),
    cols: [...r.querySelectorAll<HTMLElement>(":scope > .lcol")].slice(0, MAX_COLS).map(c => ({
      w: flexOf(c),
      cells: [...c.querySelectorAll<HTMLElement>(":scope > .mod")].slice(0, MAX_CELLS).map(m => {
        const type = (TYPES.find(t => m.classList.contains(`mod-${t}`)) ?? "info") as ModuleType;
        const mod: SnapMod = { type, title: (m.querySelector(".mod-title")?.textContent ?? "").slice(0, 60), h: flexOf(m) };
        if (type === "shelf") {
          mod.kind = m.dataset.kind === "goods" ? "goods" : "albums";
          const keys = [...new Set([...m.querySelectorAll<HTMLElement>(".spine[data-key]")].map(e => e.dataset.key!))].slice(0, MAX_SHELF);
          const list = keys.map(byKey).filter(ok);
          list.forEach(a => used.add(a));
          mod.albums = list.map(idOf);
          const f = byKey(m.querySelector<HTMLElement>(".face[data-key]")?.dataset.key ?? "");
          if (ok(f)) { used.add(f); mod.face = idOf(f); }
          const row = m.querySelector<HTMLElement>(".row[data-row]");
          const pos = parseFloat(row?.style.getPropertyValue("--pos") ?? "");
          if (Number.isFinite(pos)) mod.pos = Math.max(0, Math.min(1, pos));
          if (m.dataset.id && /^[\w-]{1,24}$/.test(m.dataset.id)) mod.sid = m.dataset.id;
          const goods = [...m.querySelectorAll<SVGElement>(".goods [data-goods]")].map(e => e.dataset.goods!).filter(Boolean);
          if (goods.length) mod.goods = goods;
          // アルバムのあいだに置いた小物: どのアルバムの後ろか（"" は列の頭）
          const pane = m.querySelector<HTMLElement>(".spines");
          if (pane) {
            const at: Record<string, string> = {}; let prev = "";
            for (const e of pane.children) {
              const el = e as HTMLElement;
              if (el.classList.contains("spine") && el.dataset.key) { const a = byKey(el.dataset.key); prev = ok(a) ? idOf(a) : prev; }
              else if (el.classList.contains("goods-slot") && el.dataset.slot && goods.includes(el.dataset.slot)) at[el.dataset.slot] = prev;
            }
            if (Object.keys(at).length) mod.at = at;
          }
        }
        return mod;
      }),
    })),
  }));
  const now = ctx().player.album;
  if (ok(now)) used.add(now);
  const albums = [...used].slice(0, MAX_ALBUMS).map(snapAlbum);
  return { rows, albums };
}
/** 送るアルバムの札（棚の背表紙をホストと同じ高さ・幅にするための数も付ける） */
export const snapAlbum = (a: Album): SnapAlbum => ({ id: idOf(a), t: a.title.slice(0, 200), a: (a.artist ?? "").slice(0, 200), c: ctx().colorOf(a), n: a.tracks.length, y: a.year, hs: hashOf(a.key) % 600, r: a.ratio });
/** アルバムの写しの番号（見せるセットの外なら undefined） */
export const idFor = (a: Album) => ok(a) ? idOf(a) : undefined;
export const nowId = () => { const a = ctx().player.album; return ok(a) ? idOf(a) : undefined; };

/** ジャケットを小さな JPEG に（同じものは覚えておく）。外のサービスのジャケットは送らない */
const thumbs = new Map<string, Promise<string | undefined>>();
export function thumbOf(id: string): Promise<string | undefined> {
  const a = albumOf(id);
  const k = `${id} ${a?.cover ?? ""}`;   // ジャケットが替わったら作り直す
  let p = thumbs.get(k);
  if (!p) {
    p = !a?.cover || a.remote ? Promise.resolve(undefined) : new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const S = 160, sc = S / Math.max(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", .72)); } catch { resolve(undefined); }
      };
      img.onerror = () => resolve(undefined);
      img.src = a.cover!;
    });
    thumbs.set(k, p);
    // 作れなかったものは覚えない（まだジャケットを読んでいないだけのことがある。次に頼まれたら作り直す）
    p.then(u => { if (!u) thumbs.delete(k); });
  }
  return p;
}
export async function tracksOf(id: string): Promise<SnapTrack[] | undefined> {
  const a = albumOf(id);
  if (!a) return undefined;
  await enrichTracks(a).catch(() => {});
  return a.tracks.slice(0, 300).map((t, i) => ({ no: t.no || i + 1, t: (t.title ?? "").slice(0, 200), d: Math.round(t.duration ?? 0) }));
}
const fold = (s: string) => s.normalize("NFKC").toLowerCase();
/** リクエストのための検索（題名・アーティスト）。20 件まで */
export function findAlbums(q: string): SnapAlbum[] {
  const f = fold(q.trim());
  if (!f) return [];
  return ctx().albums().filter(a => ok(a) && (fold(a.title).includes(f) || fold(a.artist ?? "").includes(f))).slice(0, 20)
    .map(snapAlbum);
}

// ---------- 参加者: 確かめる ----------
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d.,%\s/]+\))$/i;
export const safeColor = (x: unknown): string | undefined => typeof x === "string" && SAFE_COLOR.test(x) ? x : undefined;
const isId = (x: unknown): x is string => typeof x === "string" && /^a\d{1,5}$/.test(x);
const str = (x: unknown, n: number) => typeof x === "string" ? x.slice(0, n) : "";
const num = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : a;
export function cleanAlbum(x: unknown): SnapAlbum | undefined {
  const o = x as Record<string, unknown>;
  if (!o || !isId(o.id)) return undefined;
  const c = typeof o.c === "string" && SAFE_COLOR.test(o.c) ? o.c : "#555";
  return { id: o.id, t: str(o.t, 200), a: str(o.a, 200), c, n: num(o.n, 0, 999), y: typeof o.y === "number" ? num(o.y, 0, 9999) : undefined,
    hs: typeof o.hs === "number" ? Math.round(num(o.hs, 0, 599)) : undefined, r: typeof o.r === "number" ? num(o.r, .2, 5) : undefined };
}
export function cleanRows(x: unknown): SnapRow[] | undefined {
  if (!Array.isArray(x) || x.length > MAX_ROWS) return undefined;
  const rows: SnapRow[] = [];
  for (const r of x as Record<string, unknown>[]) {
    if (!r || !Array.isArray(r.cols) || r.cols.length > MAX_COLS) return undefined;
    const cols = [];
    for (const c of r.cols as Record<string, unknown>[]) {
      if (!c || !Array.isArray(c.cells) || c.cells.length > MAX_CELLS) return undefined;
      const cells: SnapMod[] = [];
      for (const m of c.cells as Record<string, unknown>[]) {
        if (!m || !TYPES.includes(m.type as ModuleType)) return undefined;
        const mod: SnapMod = { type: m.type as ModuleType, title: str(m.title, 60), h: num(m.h, .01, 100) };
        if (mod.type === "shelf") {
          mod.kind = m.kind === "goods" ? "goods" : "albums";
          if (Array.isArray(m.albums)) mod.albums = (m.albums as unknown[]).filter(isId).slice(0, MAX_SHELF);
          if (isId(m.face)) mod.face = m.face;
          if (typeof m.pos === "number") mod.pos = num(m.pos, 0, 1);
          if (typeof m.sid === "string" && /^[\w-]{1,24}$/.test(m.sid)) mod.sid = m.sid;
          if (Array.isArray(m.goods)) mod.goods = [...new Set((m.goods as unknown[]).filter((k): k is string => typeof k === "string" && OBJECTS.some(o => o.key === k)))];
          if (m.at && typeof m.at === "object" && mod.goods) {
            const at: Record<string, string> = {};
            for (const [k, v] of Object.entries(m.at as Record<string, unknown>)) if (mod.goods.includes(k) && (v === "" || (isId(v) && mod.albums?.includes(v as string)))) at[k] = v as string;
            if (Object.keys(at).length) mod.at = at;
          }
        }
        cells.push(mod);
      }
      cols.push({ w: num(c.w, .01, 100), cells });
    }
    rows.push({ h: num(r.h, 40, 2000), cols });
  }
  return rows;
}
export function cleanTracks(x: unknown): SnapTrack[] | undefined {
  if (!Array.isArray(x) || x.length > 300) return undefined;
  return x.map(t => ({ no: num((t as SnapTrack)?.no, 0, 9999), t: str((t as SnapTrack)?.t, 200), d: num((t as SnapTrack)?.d, 0, 1e5) }));
}
export const isThumb = (x: unknown): x is string => typeof x === "string" && x.length < 60_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(x);

// ---------- 参加者: 組み立てる ----------
export interface HomeView { el: HTMLElement; setCover(id: string, url: string): void; setNow(id?: string): void; dispose(): void }
/** 写しのホームを組み立てる。cover はジャケットが要るとき、open はアルバムを押したとき */
export interface HomeSource {
  /** 再生まわりのモジュールを動かすもの（ホストは自分のプレイヤー、参加者はホストの再生の写し） */
  over?: ModOverride;
  /** 参加者の手元の音量（再生中モジュールの音量のつまみ）。ホストは自分のプレイヤーの音量なのでなし */
  volume?: { get(): number; set(v: number): void };
  /** 再生中のアルバムを、写しの番号にする（ホストのプレイヤーはフォルダの key を持つので） */
  idOf?(a: Album): string | undefined;
}
export function buildHome(rows: SnapRow[], albums: Map<string, SnapAlbum>, opts: { cover(id: string): void; open(id: string): void; src: HomeSource }): HomeView {
  const home = document.createElement("div");
  home.className = "home pr-home";
  const grid = document.createElement("div");
  grid.className = "grid";
  home.append(grid);
  const covers = new Map<string, string>();
  let borrowed = false;
  const faces = new Map<string, HTMLElement[]>();   // ジャケットを待っている面陳・札
  const art = (id: string, box: HTMLElement) => {
    const a = albums.get(id);
    box.replaceChildren();
    const url = covers.get(id);
    if (url) { const img = document.createElement("img"); img.className = "art"; img.alt = ""; img.src = url; box.append(img); }
    else {
      const b = document.createElement("div"); b.className = "art-blank"; b.style.background = a?.c ?? "#555"; b.textContent = a?.t ?? "";
      box.append(b);
      opts.cover(id);
    }
    const waiting = faces.get(id) ?? faces.set(id, []).get(id)!;
    if (!waiting.includes(box)) waiting.push(box);
  };
  // 背表紙・面陳は、ホストの棚（main.ts の spine / face / fillRow）と同じ形・同じばらつきで組む
  const light = (c: string) => { const m = c.match(/rgb\((\d+)[ ,]+(\d+)[ ,]+(\d+)/); return !!m && 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] > 150; };
  const spines: Map<string, HTMLElement[]> = new Map();   // ジャケットが届いたら、背表紙の地にも使う
  const tex = (b: HTMLElement, id: string) => {
    const url = covers.get(id), a = albums.get(id);
    if (!url || b.querySelector(".spine-tex")) return;
    const i = document.createElement("i"); i.className = "spine-tex";
    i.style.backgroundImage = `url("${url}")`; i.style.backgroundPosition = `${(a?.hs ?? 0) % 100}% 50%`;
    b.prepend(i);
  };
  const spine = (id: string, face: HTMLElement) => {
    const a = albums.get(id), h = a?.hs ?? 0, bg = a?.c ?? "#555";
    const b = document.createElement("button");
    b.className = "spine";
    b.style.width = `${15 + Math.min(11, Math.round((a?.n ?? 8) * .65))}px`;
    b.style.height = `${66 + h % 24}%`;
    b.style.background = bg;
    b.style.color = light(bg) ? "#15181b" : "#f2f2f0";
    b.title = a ? (a.a ? `${a.t} — ${a.a}` : a.t) : "";
    b.dataset.id = id;
    const s = document.createElement("span"); s.textContent = a?.t ?? ""; b.append(s);
    tex(b, id);
    (spines.get(id) ?? spines.set(id, []).get(id)!).push(b);
    b.onclick = e => { e.stopPropagation(); opts.open(id); };
    b.onmouseenter = () => { face.dataset.id = id; art(id, face); };
    return b;
  };
  const shelf = (body: HTMLElement, m: SnapMod) => {
    const line = document.createElement("div"); line.className = "shelf-line";
    const row = document.createElement("div");
    row.className = "row";
    const list = m.albums ?? [];
    if (list.length) {
      const face = document.createElement("button");
      const first = m.face && list.includes(m.face) ? m.face : list[0], fa = albums.get(first);
      face.className = "face" + ((fa?.r ?? 1) < 1 ? " tall" : "");
      face.style.setProperty("--ar", String(fa?.r ?? 1));
      face.dataset.id = first;
      art(first, face);
      face.onclick = e => { e.stopPropagation(); opts.open(face.dataset.id!); };
      const at = m.pos ?? 0;
      // 小物の場所（ホストと同じく、そのアルバムの後ろに小物の幅だけ隙間をあける）
      const slot = (p: HTMLElement, after: string) => Object.entries(m.at ?? {}).forEach(([k, a]) => {
        if (a !== after) return;
        const el = document.createElement("i");
        el.className = "goods-slot"; el.dataset.slot = k; el.setAttribute("aria-hidden", "true");
        el.style.setProperty("--s", String(mountingWith(opts.src.over, () => objectSize(k))));
        el.style.setProperty("--ow", String(OBJECTS.find(o => o.key === k)?.w ?? 50));
        p.append(el);
      });
      const pane = (side: "l" | "r") => { const p = document.createElement("div"); p.className = `spines pane-${side}`; slot(p, ""); list.forEach(id => { p.append(spine(id, face)); slot(p, id); }); return p; };
      row.style.setProperty("--pos", String(at));
      if (at > 0 && at < 1) {
        row.classList.add("two-panes");
        const l = pane("l"), r = pane("r");
        row.append(l, face, r);
        mountTwin(row, l, r);
      } else {
        const p = pane(at <= 0 ? "r" : "l");
        if (at <= 0) row.append(face, p); else row.append(p, face);
        mountSingle(p);
      }
    }
    line.append(row);
    body.append(line);
  };
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "lrow"; row.style.height = `${r.h}px`;
    r.cols.forEach((c, ci) => {
      if (ci) { const s = document.createElement("div"); s.className = "split split-v"; row.append(s); }
      const col = document.createElement("div");
      col.className = "lcol"; col.style.flex = `${c.w} 1 0px`;
      c.cells.forEach((m, ki) => {
        if (ki) { const s = document.createElement("div"); s.className = "split split-h"; col.append(s); }
        const sec = document.createElement("section");
        sec.className = `mod mod-${m.type}`; sec.style.flex = `${m.h} 1 0px`;
        const head = document.createElement("header"); head.className = "mod-head";
        const t = document.createElement("span"); t.className = "mod-title"; t.textContent = m.title; head.append(t);
        const body = document.createElement("div"); body.className = "mod-body";
        sec.append(head, body);
        // 猫の足場: 棚は棚板の上、ほかのモジュールは天板の上
        const plat = document.createElement("i");
        plat.className = m.type === "shelf" ? "pr-plat pr-plat-board" : "pr-plat";
        plat.dataset.catPlat = "";
        if (m.type === "shelf") {
          if (m.kind !== "goods") shelf(body, m);
          else { const line = document.createElement("div"); line.className = "shelf-line only"; body.append(line); }
          // 棚の小物: ホストがその棚に置いているもの（大きさなどはホストの設定）。小物は一つずつしかないので、写しの間はここへ移す
          const box = document.createElement("div"); box.className = "goods"; box.hidden = true;
          body.querySelector(".shelf-line")!.append(box);
          const floating = Object.keys(m.at ?? {}), rest = (m.goods ?? []).filter(k => !floating.includes(k));
          if (rest.length) { try { mountingWith(opts.src.over, () => placeObjects(box, rest)); borrowed = true; } catch (e) { console.error(e); } }
          if (floating.length) {
            const line = body.querySelector<HTMLElement>(".shelf-line")!;
            const float = document.createElement("div"); float.className = "goods goods-float";
            line.append(float);
            try { mountingWith(opts.src.over, () => placeObjects(float, floating)); borrowed = true; } catch (e) { console.error(e); }
            float.hidden = false;
            const go = () => floatGoods(line);
            requestAnimationFrame(go);
            line.addEventListener("scroll", go, { capture: true, passive: true });
            new ResizeObserver(go).observe(line);
          }
        }
        else {
          // 飾り・再生まわりのモジュールは、ホストの再生（の写し）で動かす。参加者は見るだけ（操作は受け付けない）
          // 出力・イコライザーは、参加者が自分の設定で聴くためのもの（参加者の手元の設定で組み立てる）
          const own = OWN.includes(m.type);
          if (!own && m.type !== "player" && opts.src.over) sec.classList.add("pr-view-only");
          try {
            mountingWith(own ? undefined : opts.src.over, () => m.type === "player" ? mountNowCard(body, ctx().player, opts, opts.src) : mountModule(m.type, body));
          } catch (e) { console.error(e); /* 置けなくても続ける */ }
        }
        sec.append(plat);
        col.append(sec);
      });
      row.append(col);
    });
    grid.append(row);
    const gap = document.createElement("div"); gap.className = "split split-row"; grid.append(gap);
  }
  // 床の家具（ホストの床に置いているもの）。ホストのホームと同じく grid のいちばん前に置く（猫の足場の順もそろう）
  try { mountingWith(opts.src.over, () => grid.prepend(thingsLayer())); } catch (e) { console.error(e); }
  return {
    el: home,
    // 写しを捨てるとき: 棚の窓の見張りと、飾りのモジュールが document に付けた聞き耳を外す（残すと写しが丸ごと解放されない）
    dispose() {
      unwatchIn(home); releaseIn(home); home.remove(); faces.clear();
      // 借りていた小物を、自分のホームの棚へ戻す
      if (borrowed) document.dispatchEvent(new Event("kona:objects"));
    },
    setCover(id, url) {
      covers.set(id, url);
      for (const b of spines.get(id) ?? []) if (b.isConnected) tex(b, id);
      for (const box of faces.get(id) ?? []) if (box.isConnected && (box.dataset.id === id || !box.dataset.id)) art(id, box);
      faces.set(id, (faces.get(id) ?? []).filter(b => b.isConnected));
    },
    // 再生中のジャケットは、再生の写しに渡すために頼んでおく
    setNow(id) { if (id && !covers.has(id)) opts.cover(id); },
  };
}

/** 再生中: ホームの「再生中」モジュールと同じ形（ジャケット・アルバム・曲名・進み具合・操作・曲目）。
 * 参加者は見るだけなので、曲の操作は押せない。音量だけは参加者の手元の音量（src.volume）につなぐ */
const ICON = {
  prev: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2v12l10-6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
  vol: '<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10L5 10H2z"/><path d="M11 5.2a4 4 0 0 1 0 5.6l-.9-.9a2.7 2.7 0 0 0 0-3.8zM12.8 3.4a6.5 6.5 0 0 1 0 9.2l-.9-.9a5.2 5.2 0 0 0 0-7.4z"/></svg>',
};
function mountNowCard(body: HTMLElement, player: Player, opts: { open(id: string): void }, src: HomeSource) {
  const center = document.createElement("div"); center.className = "center pr-center";
  body.append(center);
  let shown = "", playing: boolean | undefined;
  const render = () => {
    const a = player.album, t = player.track;
    const k = a && t ? `${a.key}#${player.index}#${a.cover ?? ""}#${a.tracks.length}#${player.mode}` : "";
    if (k === shown) {
      if (playing !== player.playing) {
        playing = player.playing;
        const b = center.querySelector<HTMLElement>(".b-play"); if (b) b.innerHTML = playing ? ICON.pause : ICON.play;
      }
      return;
    }
    shown = k; playing = player.playing;
    if (!a || !t) { center.innerHTML = ""; return; }
    const meta = [a.artist, a.year, a.genre].filter(Boolean).map(x => esc(String(x))).join(" · ");
    const art = a.cover ? `<img class="art" alt="" src="${esc(a.cover)}">` : `<div class="art-blank" style="background:${esc(safeColor(a.color) ?? "#555")}">${esc(a.title)}</div>`;
    const vol = src.volume?.get() ?? 1;
    center.innerHTML = `<div class="jacket${(a.ratio ?? 1) < 1 ? " tall" : ""}" style="--ar:${Number(a.ratio) || 1}">${art}</div>
      <div class="np"><div class="np-main">
        <div class="np-meta">
          <div class="np-album">${esc(a.title)}</div>
          <div class="np-sub">${meta}</div>
          <div class="np-title"><span class="np-no">${String(t.no).padStart(2, "0")} / ${a.tracks.length}</span>${esc(t.title)}</div>
        </div>
        <div class="np-bar"><span class="np-pos">0:00</span><div class="np-track"><div class="np-fill"></div></div><span class="np-dur">0:00</span></div>
        <div class="np-row">
          <div class="np-ctrl">
            <button class="b-prev" disabled aria-label="前の曲（ホストが操作します）">${ICON.prev}</button>
            <button class="b-play play" disabled aria-label="${player.playing ? "再生中" : "一時停止中"}（ホストが操作します）">${player.playing ? ICON.pause : ICON.play}</button>
            <button class="b-next" disabled aria-label="次の曲（ホストが操作します）">${ICON.next}</button>
            ${modeButtonHTML(player.mode, "b-mode").replace("<button", "<button disabled")}
          </div>
          <div class="np-vol">
            <span class="b-mute" aria-hidden="true">${ICON.vol}</span>
            <input class="np-vol-range" type="range" min="0" max="100" step="1" value="${Math.round(vol * 100)}" aria-label="あなたの手元の音量"${src.volume ? "" : " disabled"}>
          </div>
        </div>
      </div>
      <ol class="tracks np-tracks" aria-label="曲目">${a.tracks.map((tr, i) => `
        <li class="${i === player.index ? "current" : ""}"><button type="button" tabindex="-1">
          <span class="no">${String(tr.no).padStart(2, "0")}</span><span class="t">${esc(tr.title)}</span><span class="dur">${tr.duration ? fmt(tr.duration) : ""}</span>
        </button></li>`).join("")}</ol></div>`;
    const jacket = center.querySelector<HTMLElement>(".jacket")!;
    jacket.style.cursor = "pointer";
    jacket.onclick = e => { e.stopPropagation(); const id = src.idOf ? src.idOf(a) : a.key; if (id) opts.open(id); };
    const range = center.querySelector<HTMLInputElement>(".np-vol-range")!;
    const paint = () => range.style.setProperty("--fill", `${Number(range.value)}%`);
    range.oninput = () => { src.volume?.set(Number(range.value) / 100); paint(); };
    paint();
    // 曲目は横に流れる。いまの曲が見えるところまで送る（部屋全体はスクロールさせない）
    requestAnimationFrame(() => { const cur = center.querySelector<HTMLElement>(".np-tracks .current"), list = cur?.parentElement; if (cur && list) list.scrollLeft = cur.offsetLeft - list.offsetLeft - 20; });
  };
  render();
  everyFrame(center, () => {
    render();
    const fill = center.querySelector<HTMLElement>(".np-fill"), pos = center.querySelector<HTMLElement>(".np-pos"), dur = center.querySelector<HTMLElement>(".np-dur");
    if (!fill || !pos || !dur) return;
    const d = player.duration, p = Math.min(d || 0, player.position);
    fill.style.width = d ? `${(p / d) * 100}%` : "0";
    const ps = fmt(p), ds = fmt(d);
    if (pos.textContent !== ps) pos.textContent = ps;
    if (dur.textContent !== ds) dur.textContent = ds;
    const r = center.querySelector<HTMLInputElement>(".np-vol-range");
    if (r && src.volume && document.activeElement !== r) { const v = String(Math.round(src.volume.get() * 100)); if (r.value !== v) { r.value = v; r.style.setProperty("--fill", `${v}%`); } }
  });
}

/** 隙間の上に小物を立てる（ホストのホームと同じ。窓が 2 つある段では見えている方の隙間に） */
function floatGoods(line: HTMLElement) {
  const L = line.getBoundingClientRect();
  line.querySelectorAll<SVGSVGElement>(".goods-float > svg").forEach(svg => {
    let best: DOMRect | undefined;
    for (const sl of line.querySelectorAll<HTMLElement>(`.goods-slot[data-slot="${svg.dataset.goods}"]`)) {
      const r = sl.getBoundingClientRect(), p = sl.closest(".spines")!.getBoundingClientRect();
      if (r.width && r.left >= p.left - 1 && r.right <= p.right + 1) { best = r; break; }
    }
    svg.style.visibility = best ? "" : "hidden";
    if (best) svg.style.left = `${(best.left - L.left).toFixed(1)}px`;
  });
}
