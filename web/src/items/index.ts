// 部屋に置くものの一覧。items/ の *.ts（lowpoly・types・index を除く）を読み込むだけで加わる
import type { ItemDef } from "./types";
export type { ItemDef } from "./types";

const mods = import.meta.glob<{ default: ItemDef }>(["./*.ts", "!./index.ts", "!./types.ts", "!./lowpoly.ts"], { eager: true });
/** すべて（試作を含む）。order → key の順 */
export const ALL_ITEMS: readonly ItemDef[] = Object.values(mods).map(m => m.default).filter(d => d && typeof d.key === "string")
  .sort((a, b) => (a.order ?? 500) - (b.order ?? 500) || a.key.localeCompare(b.key));
/** 置けるもの（試作を除く） */
export const ITEMS = ALL_ITEMS.filter(d => !d.draft);
export const itemOf = (k: string) => ALL_ITEMS.find(d => d.key === k);
/** viewBox */
export const viewBoxOf = (d: ItemDef) => `0 0 ${d.w} ${d.flat ? d.vh ?? 40 : d.h}`;
