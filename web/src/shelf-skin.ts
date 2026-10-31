// 棚の素材: ウォールナット（既定）・白木・黒スチール・アクリル・和箪笥・ローポリ（木・白樺・黒檀・石板・苔・雪。shelf-lowpoly.css は scripts/shelf-lowpoly.py で作る）。
// <html data-shelf="…"> を切り替えると、style.css の末尾で棚板・側板・木の色（--wood など）が替わる。
// 木の色はレコードプレーヤーの台や窓辺の枠（キャンバス）も毎フレーム読むので、そちらも一緒に替わる。端末に覚える。
import "./shelf-lowpoly.css";

const KEY = "kona.shelfSkin";

export const SHELF_SKINS = [
  { key: "walnut", label: "ウォールナット" },
  { key: "oak", label: "オーク" },
  { key: "steel", label: "スチール" },
  { key: "acrylic", label: "アクリル" },
  { key: "tansu", label: "欅" },
  { key: "lowpoly", label: "パイン" },
  { key: "lowpoly-birch", label: "白樺" },
  { key: "lowpoly-ebony", label: "黒檀" },
  { key: "lowpoly-stone", label: "石" },
  { key: "lowpoly-moss", label: "苔" },
  { key: "lowpoly-snow", label: "雪" },
] as const;
export type ShelfSkin = typeof SHELF_SKINS[number]["key"];

const valid = (v: unknown): v is ShelfSkin => SHELF_SKINS.some(s => s.key === v);

export function shelfSkin(): ShelfSkin {
  try { const v = localStorage.getItem(KEY); return valid(v) ? v : "walnut"; } catch { return "walnut"; }
}

export function setShelfSkin(v: string) {
  if (!valid(v)) return;
  try { if (v === "walnut") localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* 保存できなくても動く */ }
  apply(v);
}

function apply(v: ShelfSkin) {
  if (v === "walnut") delete document.documentElement.dataset.shelf;
  else document.documentElement.dataset.shelf = v;
  // 棚板の厚みが変わると段の高さも変わるので、猫などの配置を測り直させる
  dispatchEvent(new Event("resize"));
}

apply(shelfSkin());
