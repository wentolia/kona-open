// 猫の毛並み・品種・性格・名前（描き方と動きは cat.ts）。設定の読み込みから来た猫を確かめる isCoat もここ
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// 毛並み: 体の濃淡 4 段（hi/mid/lo/deep）+ 口元・胸（cream）+ 目（ink）
export interface Persona {
  energy: number;  // 元気さ: 歩く・跳ぶ回数
  sleepy: number;  // 眠たがり: 寝ている長さ
  social: number;  // 人なつこさ: ほかの猫のそばへ行く
  playful: number; // 遊び好き: じゃれる・ちょっかい・追いかけっこ
  curious: number; // 好奇心: 遠く・高い所へ行きたがる
  speed: number;   // 足の速さ（倍率）
  size: number;    // 体の大きさ（倍率）
}
export type Pattern = "tabby" | "spots" | "calico" | "point";
export interface Coat {
  hi: string; mid: string; lo: string; deep: string; cream: string; ink: string; p?: Persona; fav?: string;
  breed?: string;            // 品種（BREEDS のキー）。ないものは雑種
  name?: string;             // 名前（名札から変えられる）
  gloss?: number;            // 毛づや（0〜1）。撫でてもらうほど、毛づくろいしてもらうほど少しずつ増す
  likes?: Record<string, number>; // 音楽の好き嫌い（ジャンルかアーティストごとに -1〜1）。聴くうちに育つ
  pat?: Pattern;             // 柄
  mark?: string;             // 縞・斑点の色
  pt?: Shades;               // ポイント（顔・耳・脚・しっぽ）や三毛のぶちの色
  pt2?: Shades;              // 三毛の 2 色目
}
export interface Shades { hi: string; mid: string; lo: string; deep: string }
// 保存した猫（設定の読み込みで外から入ることもある）は、色を SVG にそのまま書き込むので形を確かめる
const SAFE_COLOR = /^[#a-z0-9(),.%\s-]{1,48}$/i;
const isColor = (x: unknown) => typeof x === "string" && SAFE_COLOR.test(x);
const isShades = (x: unknown) => !!x && typeof x === "object" && ["hi", "mid", "lo", "deep"].every(k => isColor((x as Record<string, unknown>)[k]));
/** 保存されていた猫として使えるか（色が色の形をしているか、柄が知っているものか） */
export function isCoat(x: unknown): x is Coat {
  const c = x as Coat;
  if (!c || typeof c !== "object" || !["hi", "mid", "lo", "deep", "cream", "ink"].every(k => isColor((c as unknown as Record<string, unknown>)[k]))) return false;
  if (c.mark !== undefined && !isColor(c.mark)) return false;
  if (c.pt !== undefined && !isShades(c.pt)) return false;
  if (c.pt2 !== undefined && !isShades(c.pt2)) return false;
  if (c.pat !== undefined && !["tabby", "spots", "calico", "point"].includes(c.pat)) return false;
  if (c.name !== undefined && typeof c.name !== "string") return false;
  if (c.breed !== undefined && typeof c.breed !== "string") return false;
  return true;
}
export const randomPersona = (r: () => number = Math.random): Persona => ({
  energy: r(), sleepy: r(), social: r(), playful: r(), curious: r(), speed: .85 + r() * .4, size: .86 + r() * .24,
});
// 性格を持たない以前の猫は、毛並みから決まった性格にする（開き直しても同じ）
export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
// 色の型 [色相, 彩度, 明るさ] から体の濃淡 4 段を作る。少しだけ個体差を足す
function shades([h0, s0, l0]: [number, number, number], jitter = true): Shades {
  const h = h0 + (jitter ? rnd(-6, 6) : 0), s = clamp(s0 + (jitter ? rnd(-.05, .05) : 0), 0, 1), l = clamp(l0 + (jitter ? rnd(-.05, .05) : 0), .08, .85);
  return { hi: hsl(h, s, clamp(l + .09, 0, .92)), mid: hsl(h, s, l), lo: hsl(h, s, l - .07 * (l > .2 ? 1 : .5)), deep: hsl(h, s, Math.max(.06, l - .15)) };
}
const cream = ([h, s, l]: [number, number, number]) => hsl(h, s * .6, clamp(l + .22, 0, .9));
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
// 毛色の型: [色相, 彩度, 明るさ]。夜の部屋に合うよう、やや暗めに寄せる
const BASES: [number, number, number][] = [
  [30, .04, .14],  // 黒
  [35, .05, .30],  // 灰
  [210, .10, .36], // ブルーグレー
  [28, .55, .48],  // 茶トラ
  [32, .30, .30],  // こげ茶
  [40, .30, .70],  // クリーム
  [40, .08, .80],  // 白
  [25, .20, .22],  // 焦げ茶の黒
];
const EYES = ["#e9c46a", "#d8a03a", "#9cc46a", "#7fb0c8", "#c7d36a"];
const WHITE: [number, number, number] = [40, .08, .82], BLUE_EYE = "#7fb6e6", GREEN_EYE = "#8fcf6a";

// ---------- 品種 ----------
// 形の違い: 耳の大きさ・折れ耳・耳先の飾り毛、しっぽ（ふさふさ・短い丸）、長毛（輪郭がふくらむ・襟巻き）、
// 顔（丸顔・鼻の低い顔・くさび形）、毛のない肌のしわ。色と柄は coat() で決める
export interface Breed {
  name: string; weight: number; size: [number, number];
  ear?: number; fold?: boolean; tuft?: boolean; tail?: "bushy" | "bob"; long?: boolean; ruff?: boolean;
  face?: "round" | "flat" | "wedge"; bare?: boolean;
  coat(): Omit<Coat, "p" | "breed">;
}
const solid = (base: [number, number, number], ink: string, white = false): Omit<Coat, "p" | "breed"> =>
  ({ ...shades(base), cream: white ? hsl(40, .15, .82) : cream(base), ink });
export const BREEDS: Record<string, Breed> = {
  mix: { name: "雑種", weight: 81, size: [.86, 1.1], coat: () => {
    const base = pick(BASES), c = solid(base, pick(EYES), Math.random() < .4);
    // 茶トラ・灰・こげ茶は縞が入りやすい
    return (base[1] > .25 || base[2] > .25 && base[2] < .4) && Math.random() < .5 ? { ...c, pat: "tabby", mark: shades(base).deep } : c;
  } },
  siamese: { name: "シャム", weight: 1, size: [.86, .98], ear: 1.18, face: "wedge", coat: () => {
    const body: [number, number, number] = [38, .22, rnd(.72, .8)];
    return { ...shades(body), cream: cream(body), ink: BLUE_EYE, pat: "point", pt: shades(pick<[number, number, number]>([[25, .25, .2], [215, .1, .38], [20, .3, .3]])) };
  } },
  fold: { name: "スコティッシュフォールド", weight: 1, size: [.9, 1.04], fold: true, face: "round", coat: () => {
    const base = pick<[number, number, number]>([[210, .1, .42], [40, .3, .7], [35, .05, .55], [28, .5, .5]]);
    const c = solid(base, pick(["#e9c46a", "#d8a03a", BLUE_EYE]), Math.random() < .35);
    return Math.random() < .5 ? { ...c, pat: "tabby", mark: shades(base).deep } : c;
  } },
  mainecoon: { name: "メインクーン", weight: 1, size: [1.12, 1.26], ear: 1.1, tuft: true, tail: "bushy", long: true, ruff: true, coat: () => {
    const base = pick<[number, number, number]>([[30, .35, .36], [28, .5, .45], [30, .04, .16], [35, .05, .45]]);
    return { ...solid(base, pick(["#d8a03a", "#c7d36a", "#e9c46a"]), Math.random() < .5), pat: "tabby", mark: hsl(base[0], base[1], Math.max(.08, base[2] - .2)) };
  } },
  mike: { name: "三毛（日本猫）", weight: 1, size: [.86, .98], tail: "bob", coat: () => ({
    ...shades(WHITE), cream: hsl(40, .1, .88), ink: pick(["#e9c46a", "#d8a03a"]), pat: "calico",
    pt: shades([28, .6, .5]), pt2: shades([30, .05, .14]),
  }) },
  amshort: { name: "アメリカンショートヘア", weight: 1, size: [.96, 1.08], face: "round", coat: () => {
    const base: [number, number, number] = [210, .04, rnd(.58, .66)];
    return { ...shades(base), cream: hsl(210, .04, .78), ink: pick(["#9cc46a", "#d8a03a"]), pat: "tabby", mark: hsl(220, .08, .2) };
  } },
  russian: { name: "ロシアンブルー", weight: 1, size: [.9, 1.02], ear: 1.08, face: "wedge", coat: () => {
    const base: [number, number, number] = [212, .12, .44];
    return { ...shades(base), cream: hsl(212, .12, .52), ink: GREEN_EYE };
  } },
  bengal: { name: "ベンガル", weight: 1, size: [1, 1.12], coat: () => {
    const base: [number, number, number] = [32, .55, .52];
    return { ...shades(base), cream: hsl(38, .4, .78), ink: pick([GREEN_EYE, "#d8a03a"]), pat: "spots", mark: hsl(25, .45, .14) };
  } },
  sphynx: { name: "スフィンクス", weight: 1, size: [.88, .98], ear: 1.38, face: "wedge", bare: true, coat: () => {
    const base: [number, number, number] = [15, .3, rnd(.62, .7)];
    return { ...shades(base, false), cream: hsl(15, .3, .76), ink: pick([GREEN_EYE, BLUE_EYE, "#d8a03a"]) };
  } },
  persian: { name: "ペルシャ", weight: 1, size: [.96, 1.06], ear: .8, face: "flat", tail: "bushy", long: true, ruff: true, coat: () => {
    const base = pick<[number, number, number]>([WHITE, [40, .3, .72], [35, .04, .62], [30, .04, .18]]);
    return solid(base, pick(["#d8a03a", BLUE_EYE, "#e9c46a"]));
  } },
};
export const breedOf = (C: Coat) => BREEDS[C.breed ?? "mix"] ?? BREEDS.mix;

/** 新しい猫の毛並み。品種は重みつきでランダムに決まり（雑種がいちばん多い）、性格と大きさもその子のものになる */
export function randomCoat(): Coat {
  const keys = Object.keys(BREEDS);
  let r = Math.random() * keys.reduce((n, k) => n + BREEDS[k].weight, 0), breed = keys[0];
  for (const k of keys) if ((r -= BREEDS[k].weight) <= 0) { breed = k; break; }
  return breedCoat(breed);
}
/** その品種の猫の毛並みを作る */
export function breedCoat(breed: string): Coat {
  const B = BREEDS[breed] ?? BREEDS.mix, p = randomPersona();
  p.size = rnd(...B.size);
  return { ...B.coat(), breed, p, name: pick(NAMES) };
}
const NAMES = ["むぎ", "こむぎ", "もち", "きなこ", "あずき", "ごま", "そら", "くう", "レオ", "ルナ", "ミケ", "タマ", "クロ", "シロ", "ちゃちゃ", "はな",
  "ゆず", "こてつ", "ポテト", "ぽんず", "さくら", "ひなた", "ノア", "ココ", "ミルク", "チョコ", "ねね", "とら", "ふく", "おはぎ", "だいず", "みかん"];
/** 名前。付いていない以前の猫は、毛並みから決まった名前にする */
export const nameOf = (C: Coat) => C.name ?? NAMES[Math.floor(seeded(C.hi + C.mid + C.ink)() * NAMES.length)];

/** はじめて開いたときの猫たち（デモ版の部屋と同じ顔ぶれ）。毛並みの細かな揺らぎと性格は毎回その子のものになる */
export function firstCats(): Coat[] {
  const mix = (base: [number, number, number], ink: string, tabby = false, white = false): Coat => {
    const c: Coat = { ...solid(base, ink, white), breed: "mix", p: randomPersona(), name: pick(NAMES) };
    c.p!.size = rnd(...BREEDS.mix.size);
    return tabby ? { ...c, pat: "tabby", mark: shades(base).deep } : c;
  };
  return [
    breedCoat("siamese"),                       // クリームにポイント、青い目
    mix([28, .55, .48], "#e9c46a", false, true), // 茶トラ（胸が白い）
    mix([40, .30, .70], "#e9c46a"),             // クリーム
    breedCoat("sphynx"),                        // 箱の中の毛のない子
    mix([25, .20, .22], "#d8a03a"),             // 焦げ茶
    mix([32, .30, .34], "#d8a03a", true),       // こげ茶の縞
    mix([30, .04, .14], "#e9c46a"),             // 黒
  ];
}
