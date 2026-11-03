// ホームに置くモジュールの定義（種類・名前・棚の中身の設定）。どこに置くか（段・列・高さ）は layout.ts
import { setTag, cleanTag } from "./tags";

export type ModuleType = "shelf" | "player" | "waveform" | "eq" | "clock" | "info" | "log" | "output" | "turntable" | "window" | "objects" | "distance" | "cattower" | "scratcher" | "catfood" | "spectrum" | "catbox";
// 棚の中身は 3 種類だけ: 検索（検索語と並び順。よく聴く・最近聴いた・フォルダ・アーティスト・気分・タグもこれで表す）・次に再生・雑貨
export type ShelfKind = "search" | "queue" | "goods";
export type SortKey = "title" | "artist" | "year" | "yearAsc" | "plays" | "last" | "hue";

export interface ModuleDef {
  id: string;
  type: ModuleType;
  title: string;
  w: number;           // 以前の配置の幅（移行用。いまの配置は layout.ts）
  height: number;      // 新しい段に置くときの高さ（px）
  // 以下は棚のときだけ使う
  kind?: ShelfKind;
  facePos?: number;    // ジャケットの表示欄の位置（棚の幅に対する比率 0 左端〜1 右端）
  query?: string;      // 検索の棚: 検索語
  sort?: SortKey;      // 検索の棚: 並び順
  folderGaps?: boolean; // フォルダごとにまとめ、継ぎ目に隙間をあける
}
export type ShelfDef = ModuleDef & { type: "shelf"; kind: ShelfKind };
export const isShelf = (m: ModuleDef): m is ShelfDef => m.type === "shelf" && !!m.kind;

export interface ModuleInfo { type: ModuleType; label: string; minHeight: number; height: number; ready: boolean; single?: boolean }
export const MODULES: ModuleInfo[] = [
  { type: "shelf", label: "棚", minHeight: 100, height: 180, ready: true },
  { type: "player", label: "再生中", minHeight: 72, height: 220, ready: true, single: true },
  { type: "waveform", label: "波形", minHeight: 60, height: 110, ready: true, single: true },
  { type: "spectrum", label: "スペクトラム", minHeight: 120, height: 220, ready: true, single: true },
  { type: "eq", label: "イコライザー", minHeight: 150, height: 220, ready: true, single: true },
  { type: "clock", label: "時計", minHeight: 110, height: 170, ready: true, single: true },
  { type: "info", label: "アルバムの情報", minHeight: 140, height: 220, ready: true, single: true },
  { type: "log", label: "聴いた記録", minHeight: 120, height: 220, ready: true, single: true },
  { type: "output", label: "出力", minHeight: 120, height: 170, ready: true, single: true },
  { type: "turntable", label: "レコードプレーヤー", minHeight: 120, height: 220, ready: true, single: true },
  { type: "window", label: "窓辺", minHeight: 90, height: 200, ready: true, single: true },
  { type: "distance", label: "聴いた距離", minHeight: 90, height: 140, ready: true, single: true },
  { type: "cattower", label: "キャットタワー", minHeight: 240, height: 380, ready: true, single: true },
  { type: "scratcher", label: "爪とぎ", minHeight: 70, height: 110, ready: true, single: true },
  { type: "catfood", label: "猫のごはん", minHeight: 70, height: 110, ready: true, single: true },
  { type: "catbox", label: "箱（紙袋）", minHeight: 80, height: 120, ready: true },
];
export const moduleInfo = (t: ModuleType) => MODULES.find(m => m.type === t)!;

export const KINDS: { kind: ShelfKind; label: string }[] = [
  { kind: "search", label: "アルバム（検索と並び順）" },
  { kind: "queue", label: "次に再生" },
  { kind: "goods", label: "雑貨" },
];
export const kindLabel = (k: ShelfKind) => KINDS.find(x => x.kind === k)!.label;

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "title", label: "アルバム名" },
  { key: "artist", label: "アーティスト" },
  { key: "year", label: "年（新しい順）" },
  { key: "yearAsc", label: "年（古い順）" },
  { key: "plays", label: "再生回数" },
  { key: "last", label: "最近聴いた順" },
  { key: "hue", label: "ジャケットの色の順" },
];

// 幅は自由。ただし 1/4・1/3・1/2・2/3・3/4・全幅 の近く（±1.5%）では軽く吸い付く
const MAGNETS: [number, string][] = [[1 / 4, "1/4"], [1 / 3, "1/3"], [1 / 2, "1/2"], [2 / 3, "2/3"], [3 / 4, "3/4"], [1, "全幅"]];
export const MIN_W = 0.12;
export function snapRatio(raw: number): number {
  const w = Math.max(MIN_W, Math.min(1, raw));
  const near = MAGNETS.find(([m]) => Math.abs(m - w) < 0.015);
  return near ? near[0] : Math.round(w * 1000) / 1000;
}
export const ratioLabel = (w: number) => MAGNETS.find(([m]) => Math.abs(m - w) < 1e-6)?.[1] ?? `${Math.round(w * 100)}%`;

/** 検索語がタグひとつだけ（tag:"…"）の棚は、そのタグの棚として扱う（落とすとタグがつき、外すとタグが外れる） */
export function tagOfShelf(d: ModuleDef): string | undefined {
  if (d.type !== "shelf" || d.kind !== "search") return undefined;
  const m = (d.query ?? "").trim().match(/^(?:tag|t):(?:"([^"]+)"|(\S+))$/i);
  return m ? m[1] ?? m[2] : undefined;
}
// ドロップでアルバムを追加できる棚
export const accepts = (d: ModuleDef) => d.kind === "queue" || !!tagOfShelf(d);

/** 検索語の中の値（空白を含むときは "…" で囲む） */
export const quoteQ = (v: string) => /[\s"]/.test(v) ? `"${v.replace(/"/g, "")}"` : v;
/** 以前の棚の種類を、検索と並び順に置き換える（手動で集めた棚は、棚の名前のタグをアルバムにつけて、そのタグの棚に） */
type OldShelf = Omit<ModuleDef, "kind"> & { kind?: string; arg?: string; albums?: string[]; searchAlign?: string };
function toSearch(m: OldShelf): ModuleDef {
  const { arg, albums, searchAlign: _, ...rest } = m;
  const s = (query: string, sort?: SortKey): ModuleDef => ({ ...rest, kind: "search", query, ...(sort ? { sort } : {}) });
  switch (m.kind) {
    case "often": return s("", "plays");
    case "recent": return s("", "last");
    case "folder": return s(arg ? `folder:${quoteQ(arg)}` : "");
    case "artist": return s(arg ? `artist:${quoteQ(arg)}` : "");
    case "mood": return s(`mood:${arg ?? "夜"}`, "hue");
    case "manual": {
      const tag = cleanTag(m.title || "お気に入り") || "お気に入り";
      if (albums?.length) setTag(albums, tag, true);
      return s(`tag:${quoteQ(tag)}`);
    }
    default: return rest as ModuleDef;
  }
}

const KEY = "kona.layout", OLD_KEY = "kona.shelves";
export const newId = () => Math.random().toString(36).slice(2, 9);

const shelf = (title: string, w: number, extra: Partial<ModuleDef> = {}): ModuleDef =>
  ({ id: newId(), type: "shelf", kind: "search", query: "", title, w, height: 180, ...extra });
const player = (): ModuleDef => ({ id: newId(), type: "player", title: "再生中", w: 1, height: 220 });

function defaults(): ModuleDef[] {
  return [
    shelf("よく聴く", 1, { sort: "plays" }),
    player(),
    shelf("次に再生", 1, { kind: "queue", query: undefined }),
    shelf("最近聴いた", 1 / 2, { sort: "last" }),
    shelf("お気に入り", 1 / 2, { query: "tag:お気に入り" }),
  ];
}

// 以前の形式から移す: 12分割の span / 20px 刻みの h → 比率と px。「再生中の上 / 下」の棚は上 → 再生中 → 下の順に
// face は以前の「左 / 右」や「何冊目の後ろ」の指定。比率に置き換える
type Legacy = ModuleDef & { span?: number; h?: number; zone?: "above" | "below"; face?: number | "left" | "right"; bookends?: boolean };
// 以前の「棚の上の小物」モジュールは、中身が「雑貨」の棚に置き換える
const fromLegacy = ({ span, h, zone: _, face, bookends, ...m }: Legacy): ModuleDef => ({
  ...(bookends ? { folderGaps: true } : {}),
  ...m, ...(m.type === "objects" ? { kind: "goods" as const, title: m.title === "棚の上の小物" ? "雑貨" : m.title } : {}),
  type: m.type === "objects" ? "shelf" : m.type ?? "shelf", w: m.w ?? (span ?? 12) / 12, height: m.height ?? (h ?? 9) * 20,
  facePos: m.facePos ?? (face === undefined || face === "left" || face === 0 ? 0 : face === "right" || face >= 1e5 ? 1 : 0.35),
});
function migrate(old: Legacy[]): ModuleDef[] {
  return [...old.filter(s => s.zone === "above").map(fromLegacy), player(), ...old.filter(s => s.zone !== "above").map(fromLegacy)];
}

export function loadLayout(): ModuleDef[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    // 廃止したモジュール（音の高さと大きさ・きょうの一枚・ジュークボックスなど）は読み飛ばす
    // 古い種類の棚を置き換えたら、すぐに残す（手動の棚のタグを、開くたびにつけ直さないため）
    const settle = (mods: ModuleDef[], before: unknown[]) => { if (JSON.stringify(mods) !== JSON.stringify(before)) saveLayout(mods); return mods; };
    if (Array.isArray(saved) && saved.length) return settle(saved.map(fromLegacy).map(toSearch).filter(m => MODULES.some(i => i.type === m.type)), saved);
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null");
    if (Array.isArray(old) && old.length) return settle(migrate(old).map(toSearch), []);
  } catch { /* ignore */ }
  return defaults();
}

export function saveLayout(mods: ModuleDef[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(mods)); } catch { /* ignore */ }
}

// 気分の棚: ジャケットの平均色から、アルバムをおおまかな気分に振り分ける
export const MOODS = ["夜", "静か", "明るい", "温かい", "涼しい"] as const;
export type Mood = typeof MOODS[number];
export function hsl(color?: string): [number, number, number] | undefined {
  const m = color?.match(/rgb\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  if (!m) return undefined;
  const [r, g, b] = [m[1], m[2], m[3]].map(v => Number(v) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, dd = max - min;
  if (!dd) return [0, 0, l];
  const s = dd / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / dd + 6) % 6 : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h * 60, s, l];
}
export function moodOf(color?: string): Mood {
  const c = hsl(color);
  if (!c) return "静か";
  const [h, s, l] = c;
  if (l < 0.22) return "夜";
  if (s < 0.16) return "静か";
  if (l > 0.62) return "明るい";
  return h < 70 || h >= 320 ? "温かい" : "涼しい";
}
