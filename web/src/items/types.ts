// 部屋に置くものの定義。items/ に 1 品 1 ファイルで置くと、index.ts が拾って一覧に加える。
// art() は SVG の中身（viewBox は 0 0 w h。敷くものは 0 0 w vh）。猫の足場は <i data-cat-plat="bed|perch" data-sink style="left:…;width:…;top:…"></i> で書く
import type { Live } from "./live";
export type Place = "floor" | "wall" | "shelf";
export type Cat = "家具" | "灯り" | "植物" | "敷きもの" | "飾り" | "小物" | "音楽" | "季節" | "食べ物" | "猫";
export interface ItemDef {
  key: string;
  label: string;
  at: Place;
  /** 描いた大きさ（大きさ 100% のときの px） */
  w: number; h: number;
  /** 敷くもの（床の奥行きに合わせて伸び縮みする）。vh は描いた高さ */
  flat?: boolean; vh?: number;
  /** 最初に置く位置（0〜1） */
  x?: number; y?: number;
  cat: Cat;
  /** 並べる順（小さいほど先） */
  order?: number;
  /** 試作: 見本帳にだけ出し、設定の「置くもの」には出さない */
  draft?: boolean;
  /** 見本帳に出す一言（仕掛けの予定など） */
  note?: string;
  art: () => string;
  /** 動き（毎コマ呼ぶ関数を返す。items/live.ts） */
  live?: Live;
}
