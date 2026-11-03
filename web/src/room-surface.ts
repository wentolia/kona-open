// 部屋の壁と床: 猫・棚板・上の帯と同じローポリで。<html data-wall / data-floor> を切り替え、
// 形は room-lowpoly.css（scripts/room-lowpoly.py で作る）、置き方は room-surface.css。端末に覚える。
// 壁はテーマ色から塗るので、テーマや時刻で色が移ってもなじむ。床はホームのいちばん下に敷く（猫も床の上を歩く）。
import "./room-lowpoly.css";
import "./room-surface.css";

const KEY = "kona.room";

export const WALLS = [
  { key: "plain", label: "無地" },
  { key: "plaster", label: "漆喰" },
  { key: "planks", label: "板壁" },
  { key: "brick", label: "レンガ" },
] as const;
export const FLOORS = [
  { key: "none", label: "なし" },
  { key: "oak", label: "オーク" },
  { key: "walnut", label: "ウォールナット" },
  { key: "stone", label: "石" },
] as const;

type Room = { wall: string; floor: string };
const DEF: Room = { wall: "plain", floor: "none" };
const ok = (list: readonly { key: string }[], v: unknown, d: string) => list.some(x => x.key === v) ? v as string : d;

export function roomSurface(): Room {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { wall: ok(WALLS, v.wall, DEF.wall), floor: ok(FLOORS, v.floor, DEF.floor) };
  } catch { return { ...DEF }; }
}

export function setRoomSurface(p: Partial<Room>) {
  const r = { ...roomSurface(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* 保存できなくても動く */ }
  apply(r);
}

function apply(r: Room) {
  const d = document.documentElement.dataset;
  const set = (k: "wall" | "floor", v: string, off: string) => { if (v === off) delete d[k]; else d[k] = v; };
  set("wall", r.wall, "plain"); set("floor", r.floor, "none");
  // 床の高さだけホームの下が伸びるので、猫の足場を測り直させる
  dispatchEvent(new Event("resize"));
}

// 以前はラグも覚えていた。読み込むときに外して書き直す
try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (v && "rug" in v) localStorage.setItem(KEY, JSON.stringify(roomSurface())); } catch { /* ignore */ }
apply(roomSurface());
