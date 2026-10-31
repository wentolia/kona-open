// 部屋の壁・床・ラグ: 猫・棚板・上の帯と同じローポリで。<html data-wall / data-floor / data-rug> を切り替え、
// 形は room-lowpoly.css（scripts/room-lowpoly.py で作る）、置き方は room-surface.css。端末に覚える。
// 壁はテーマ色から塗るので、テーマや時刻で色が移ってもなじむ。床とラグはホームのいちばん下に敷く（猫も床の上を歩く）。
import "./room-lowpoly.css";
import "./room-surface.css";

const KEY = "kona.room";

export const WALLS = [
  { key: "plain", label: "無地" },
  { key: "plaster", label: "漆喰（大きな面）" },
  { key: "planks", label: "板壁" },
  { key: "brick", label: "レンガ" },
] as const;
export const FLOORS = [
  { key: "none", label: "なし" },
  { key: "oak", label: "明るい木の床" },
  { key: "walnut", label: "濃い木の床" },
  { key: "stone", label: "石のタイル" },
] as const;
export const RUGS = [
  { key: "none", label: "なし" },
  { key: "round", label: "丸いラグ" },
  { key: "kilim", label: "キリム" },
  { key: "fur", label: "ムートン" },
] as const;

type Room = { wall: string; floor: string; rug: string };
const DEF: Room = { wall: "plain", floor: "none", rug: "none" };
const ok = (list: readonly { key: string }[], v: unknown, d: string) => list.some(x => x.key === v) ? v as string : d;

export function roomSurface(): Room {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { wall: ok(WALLS, v.wall, DEF.wall), floor: ok(FLOORS, v.floor, DEF.floor), rug: ok(RUGS, v.rug, DEF.rug) };
  } catch { return { ...DEF }; }
}

export function setRoomSurface(p: Partial<Room>) {
  const r = { ...roomSurface(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* 保存できなくても動く */ }
  apply(r);
}

function apply(r: Room) {
  const d = document.documentElement.dataset;
  const set = (k: "wall" | "floor" | "rug", v: string, off: string) => { if (v === off) delete d[k]; else d[k] = v; };
  set("wall", r.wall, "plain"); set("floor", r.floor, "none"); set("rug", r.rug, "none");
  // 床の高さだけホームの下が伸びるので、猫の足場を測り直させる
  dispatchEvent(new Event("resize"));
}

apply(roomSurface());
