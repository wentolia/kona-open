// ホームの配置: 段（行）を上から積み、段の中を列で左右に分け、列の中にモジュールを上下に重ねる。
// - 段の高さは px（段の下の境目をドラッグ）
// - 列の幅は段の中の比率（列の間の境目をドラッグ）
// - 列の中の高さは列の中の比率（モジュールの間の境目をドラッグ）
// モジュールを動かすときは、落とした先のモジュールの左右・上下・真ん中（入れ替え）か、段の間（新しい段）を選ぶ。

import type { ModuleDef } from "./shelves";

export interface Cell { id: string; h: number }        // モジュールと、列の中での高さの比率
export interface Col { w: number; stack: Cell[] }       // 段の中での幅の比率
export interface Row { height: number; cols: Col[] }
export interface Home { rows: Row[] }

export type Drop =
  | { kind: "side"; target: string; side: "left" | "right" | "top" | "bottom" }
  | { kind: "swap"; target: string }
  | { kind: "row"; index: number };

const KEY = "kona.home";
export const MIN_W = 0.12;   // 列の最小幅（段に対する比率）
export const MIN_H = 0.15;   // 重ねたモジュールの最小の高さ（列に対する比率）

export function loadHome(mods: ModuleDef[]): Home {
  let home: Home | undefined;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && Array.isArray(s.rows)) home = s as Home;
  } catch { /* ignore */ }
  return reconcile(home ?? fromFlow(mods), mods);
}

export function saveHome(home: Home) {
  try { localStorage.setItem(KEY, JSON.stringify(home)); } catch { /* ignore */ }
}

/** 以前の「左から並べて折り返す」配置（幅の比率と高さ px）から段を組み立てる */
function fromFlow(mods: ModuleDef[]): Home {
  const rows: Row[] = [];
  let cur: ModuleDef[] = [], used = 0;
  const flush = () => {
    if (!cur.length) return;
    const total = cur.reduce((n, m) => n + (m.w || 1), 0);
    rows.push({ height: Math.max(...cur.map(m => m.height || 180)), cols: cur.map(m => ({ w: (m.w || 1) / total, stack: [{ id: m.id, h: 1 }] })) });
    cur = []; used = 0;
  };
  for (const m of mods) {
    if (used + (m.w || 1) > 1.001) flush();
    cur.push(m); used += m.w || 1;
  }
  flush();
  return { rows };
}

/** 保存された配置とモジュールの一覧を突き合わせる（消えたものは外し、載っていないものは下に段を足す） */
function reconcile(home: Home, mods: ModuleDef[]): Home {
  const ids = new Set(mods.map(m => m.id)), seen = new Set<string>();
  for (const r of home.rows) for (const c of r.cols) c.stack = c.stack.filter(x => ids.has(x.id) && !seen.has(x.id) && seen.add(x.id));
  tidy(home);
  for (const m of mods) if (!seen.has(m.id)) home.rows.push({ height: m.height || 180, cols: [{ w: 1, stack: [{ id: m.id, h: 1 }] }] });
  return home;
}

/** 空になった列・段を消し、比率を合計 1 にそろえる */
export function tidy(home: Home) {
  home.rows = home.rows.filter(r => {
    r.cols = r.cols.filter(c => c.stack.length);
    if (!r.cols.length) return false;
    normalize(r.cols, "w");
    r.cols.forEach(c => normalize(c.stack, "h"));
    return true;
  });
}

function normalize<T>(items: T[], key: keyof T) {
  const sum = items.reduce((n, x) => n + (Number(x[key]) || 0), 0);
  items.forEach(x => { (x[key] as number) = sum > 0 ? (Number(x[key]) || 0) / sum : 1 / items.length; });
}

export function locate(home: Home, id: string) {
  for (const [ri, r] of home.rows.entries())
    for (const [ci, c] of r.cols.entries())
      for (const [ki, k] of c.stack.entries()) if (k.id === id) return { ri, ci, ki, row: r, col: c, cell: k };
  return undefined;
}

export function removeModule(home: Home, id: string) {
  const at = locate(home, id);
  if (!at) return;
  at.col.stack.splice(at.ki, 1);
  tidy(home);
}

/** モジュールを置き直す。height は新しい段を作るときの高さ */
export function place(home: Home, id: string, drop: Drop, height: number) {
  if (drop.kind !== "row" && drop.target === id) return;
  if (drop.kind === "swap") {
    const a = locate(home, id), b = locate(home, drop.target);
    if (a && b) { const t = a.cell.id; a.cell.id = b.cell.id; b.cell.id = t; }
    return;
  }
  // 段の位置は、外す前の並びで数えた位置を、外したあとの並びに合わせ直す
  let rowIndex = drop.kind === "row" ? drop.index : 0;
  if (drop.kind === "row") {
    const from = locate(home, id);
    const leavesRowEmpty = from && from.row.cols.length === 1 && from.col.stack.length === 1;
    if (from && leavesRowEmpty && from.ri < rowIndex) rowIndex--;
  }
  removeModule(home, id);
  if (drop.kind === "row") {
    home.rows.splice(Math.max(0, Math.min(home.rows.length, rowIndex)), 0, { height, cols: [{ w: 1, stack: [{ id, h: 1 }] }] });
    return;
  }
  const t = locate(home, drop.target);
  if (!t) { home.rows.push({ height, cols: [{ w: 1, stack: [{ id, h: 1 }] }] }); return; }
  if (drop.side === "left" || drop.side === "right") {
    // 落とした先の列を半分に分ける
    const w = t.col.w / 2;
    t.col.w = w;
    t.row.cols.splice(t.ci + (drop.side === "right" ? 1 : 0), 0, { w, stack: [{ id, h: 1 }] });
  } else {
    const h = t.cell.h / 2;
    t.cell.h = h;
    t.col.stack.splice(t.ki + (drop.side === "bottom" ? 1 : 0), 0, { id, h });
  }
  tidy(home);
}

export function addModule(home: Home, id: string, height: number) {
  home.rows.push({ height, cols: [{ w: 1, stack: [{ id, h: 1 }] }] });
}
