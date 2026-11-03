// リスニングパーティーの「ホームの写し」: ホストのホーム（棚の並び・モジュールの配置）を、参加者の画面に見るだけの形で組み立てる。
//  - ホストは自分の画面に出ているホームから、形（段・列・モジュールの種類と比率）と、棚に並んだアルバムの順を読み取って送る
//  - アルバムは使い捨ての番号（a0, a1…）で呼ぶ。フォルダの場所などは送らない。送るのは題名・アーティスト・色・曲数・年だけ
//  - ジャケットは、参加者の画面で要るものだけを小さな JPEG にして、頼まれたときに送る。曲目も頼まれたときだけ
//  - 参加者の側では、HTML を受け取らない。届いた文字は textContent、色は形を確かめてから style に入れる
//  - 時計・窓・小物・猫の家具は、参加者の端末で動く飾りとしてそのまま置く。再生中・EQ などは、ホストの「いま流れているもの」の札だけ

import { ctx, releaseIn } from "./modctx";
import { enrichTracks, type Album } from "./library";
import { mountModule } from "./modules";
import { mountSingle, unwatchIn } from "./panes";
import type { ModuleType } from "./shelves";
import { inSet, type AlbumSet } from "./tags";

export interface SnapAlbum { id: string; t: string; a: string; c: string; n: number; y?: number }
export interface SnapMod { type: ModuleType; title: string; h: number; kind?: string; albums?: string[]; face?: string }
export interface SnapRow { h: number; cols: { w: number; cells: SnapMod[] }[] }
export interface SnapTrack { no: number; t: string; d: number }

const DECOR: ModuleType[] = ["clock", "window", "objects", "cattower", "scratcher", "catfood", "catbox"];
const TYPES: ModuleType[] = ["shelf", "player", "waveform", "eq", "clock", "info", "log", "output", "turntable", "window", "objects", "distance", "cattower", "scratcher", "catfood", "spectrum", "catbox"];
const MAX_ROWS = 24, MAX_COLS = 8, MAX_CELLS = 8, MAX_SHELF = 600, MAX_ALBUMS = 5000;

// ---------- ホスト: 読み取る ----------
let ids = new Map<Album, string>(), byId = new Map<string, Album>();
const idOf = (a: Album) => {
  let id = ids.get(a);
  if (!id) { id = `a${ids.size}`; ids.set(a, id); byId.set(id, a); }
  return id;
};
// 送るアルバムのセット（タグで絞る。null は「すべて」）。セットの外のアルバムは、棚・ジャケット・曲目・検索・リクエストのどれにも出さない
let share: AlbumSet | null = null;
export const shareSet = () => share;
export function setShareSet(s: AlbumSet | null) { share = s; }
const ok = (a: Album | undefined): a is Album => !!a && inSet(a, share);
export const albumOf = (id: string) => { const a = byId.get(id); return ok(a) ? a : undefined; };
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
        }
        return mod;
      }),
    })),
  }));
  const now = ctx().player.album;
  if (ok(now)) used.add(now);
  const albums = [...used].slice(0, MAX_ALBUMS).map(a => ({ id: idOf(a), t: a.title.slice(0, 200), a: (a.artist ?? "").slice(0, 200), c: ctx().colorOf(a), n: a.tracks.length, y: a.year }));
  return { rows, albums };
}
export const nowId = () => { const a = ctx().player.album; return ok(a) ? idOf(a) : undefined; };

/** ジャケットを小さな JPEG に（同じものは覚えておく）。外のサービスのジャケットは送らない */
const thumbs = new Map<string, Promise<string | undefined>>();
export function thumbOf(id: string): Promise<string | undefined> {
  let p = thumbs.get(id);
  if (!p) {
    const a = albumOf(id);
    p = !a?.cover || a.remote ? Promise.resolve(undefined) : new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const S = 160, k = S / Math.max(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", .72)); } catch { resolve(undefined); }
      };
      img.onerror = () => resolve(undefined);
      img.src = a.cover!;
    });
    thumbs.set(id, p);
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
    .map(a => ({ id: idOf(a), t: a.title.slice(0, 200), a: (a.artist ?? "").slice(0, 200), c: ctx().colorOf(a), n: a.tracks.length, y: a.year }));
}

// ---------- 参加者: 確かめる ----------
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d.,%\s/]+\))$/i;
const isId = (x: unknown): x is string => typeof x === "string" && /^a\d{1,5}$/.test(x);
const str = (x: unknown, n: number) => typeof x === "string" ? x.slice(0, n) : "";
const num = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : a;
export function cleanAlbum(x: unknown): SnapAlbum | undefined {
  const o = x as Record<string, unknown>;
  if (!o || !isId(o.id)) return undefined;
  const c = typeof o.c === "string" && SAFE_COLOR.test(o.c) ? o.c : "#555";
  return { id: o.id, t: str(o.t, 200), a: str(o.a, 200), c, n: num(o.n, 0, 999), y: typeof o.y === "number" ? num(o.y, 0, 9999) : undefined };
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
export function buildHome(rows: SnapRow[], albums: Map<string, SnapAlbum>, opts: { cover(id: string): void; open(id: string): void }): HomeView {
  const home = document.createElement("div");
  home.className = "home pr-home";
  const grid = document.createElement("div");
  grid.className = "grid";
  home.append(grid);
  const covers = new Map<string, string>();
  const faces = new Map<string, HTMLElement[]>();   // ジャケットを待っている面陳・札
  let nowEls: HTMLElement[] = [];
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
  const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const spine = (id: string, face: HTMLElement) => {
    const a = albums.get(id);
    const b = document.createElement("button");
    b.className = "spine";
    b.style.width = `${15 + Math.min(11, Math.round((a?.n ?? 8) * .65))}px`;
    b.style.height = `${66 + hash(id) % 24}%`;
    b.style.background = a?.c ?? "#555";
    b.title = a ? (a.a ? `${a.t} — ${a.a}` : a.t) : "";
    const s = document.createElement("span"); s.textContent = a?.t ?? ""; b.append(s);
    b.onclick = e => { e.stopPropagation(); opts.open(id); };
    b.onmouseenter = () => { face.dataset.id = id; art(id, face); };
    return b;
  };
  const shelf = (body: HTMLElement, m: SnapMod) => {
    const row = document.createElement("div");
    row.className = "row";
    const list = m.albums ?? [];
    if (list.length) {
      const face = document.createElement("button");
      face.className = "face";
      const first = m.face && list.includes(m.face) ? m.face : list[0];
      face.dataset.id = first;
      art(first, face);
      face.onclick = e => { e.stopPropagation(); opts.open(face.dataset.id!); };
      const pane = document.createElement("div");
      pane.className = "spines pane-r";
      list.forEach(id => pane.append(spine(id, face)));
      row.append(face, pane);
      mountSingle(pane);
    }
    body.append(row);
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
        if (m.type === "shelf" && m.kind !== "goods") shelf(body, m);
        else if (m.type === "shelf" || DECOR.includes(m.type)) { try { mountModule(m.type === "shelf" ? "objects" : m.type, body); } catch { /* 飾りが置けなくても続ける */ } }
        else {
          const n = document.createElement("div"); n.className = "pr-now-card";
          nowEls.push(n); body.append(n);
        }
        sec.append(plat);
        col.append(sec);
      });
      row.append(col);
    });
    grid.append(row);
    const gap = document.createElement("div"); gap.className = "split split-row"; grid.append(gap);
  }
  return {
    el: home,
    // 写しを捨てるとき: 棚の窓の見張りと、飾りのモジュールが document に付けた聞き耳を外す（残すと写しが丸ごと解放されない）
    dispose() { unwatchIn(home); releaseIn(home); home.remove(); faces.clear(); nowEls = []; },
    setCover(id, url) {
      covers.set(id, url);
      for (const box of faces.get(id) ?? []) if (box.isConnected && (box.dataset.id === id || !box.dataset.id)) art(id, box);
      faces.set(id, (faces.get(id) ?? []).filter(b => b.isConnected));
    },
    setNow(id) {
      nowEls = nowEls.filter(e => e.isConnected);
      for (const n of nowEls) {
        n.replaceChildren();
        const a = id ? albums.get(id) : undefined;
        if (!a || !id) { n.textContent = "いまは何も流れていません"; continue; }
        const box = document.createElement("div"); box.className = "pr-now-art";
        n.append(box); art(id, box);
        const t = document.createElement("b"); t.textContent = a.t;
        const s = document.createElement("span"); s.textContent = a.a;
        n.append(t, s);
        n.onclick = e => { e.stopPropagation(); opts.open(id); };
      }
    },
  };
}
