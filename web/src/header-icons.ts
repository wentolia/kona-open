// 上の帯のボタンの絵。部屋の小物（items/）と同じ道具で、平らな多角形を濃淡 4 段で塗る。光は左上から。
// 字は置かない（読み上げと、触れたときの名前は aria-label / title に持たせる）。どれも 32×32 の中に描く。
import { poly, puff, slab, bevel, ngon, tone, WOOD, SAGE, OCHRE, ROSE, BRASS, INK, type Pt } from "./items/lowpoly";

const PAPER = tone("#d9c8a4"), TERRA = tone("#a5523c"), GLASS = tone("#3f5c6c"), SKY = tone("#6f8fa0");

/** ホーム: 切妻の小さな家。窓に灯り */
const home = () => `
  ${slab(PAPER.mid, PAPER.lo, [7, 15, 25, 28])}
  ${poly(PAPER.deep, [[7, 15], [25, 15], [25, 17], [7, 17]])}
  ${poly(TERRA.hi, [[16, 4], [3, 16], [16, 16]])}${poly(TERRA.lo, [[16, 4], [16, 16], [29, 16]])}
  ${poly(TERRA.deep, [[3, 16], [29, 16], [28, 17.5], [4, 17.5]])}
  ${slab(WOOD.mid, WOOD.lo, [17.5, 20, 22, 28])}
  ${slab(OCHRE.hi, OCHRE.mid, [10, 20, 14.5, 24])}
  ${poly(PAPER.deep, [[5, 28], [27, 28], [27, 29.5], [5, 29.5]])}`;

/** ライブラリ: 板の上に背表紙が 3 冊、1 冊は寄りかかる */
const library = () => `
  ${slab(SAGE.hi, SAGE.lo, [5, 9, 10, 27])}${poly(SAGE.deep, [[5, 9], [10, 9], [10, 10.5], [5, 10.5]])}
  ${slab(OCHRE.hi, OCHRE.lo, [10.5, 5, 15.5, 27])}
  ${poly(BRASS.deep, [[10.5, 9], [15.5, 9], [15.5, 10.2], [10.5, 10.2]])}${poly(BRASS.deep, [[10.5, 21.5], [15.5, 21.5], [15.5, 22.7], [10.5, 22.7]])}
  ${poly(ROSE.hi, [[16, 27], [22.5, 7.5], [26.5, 9]])}${poly(ROSE.lo, [[16, 27], [26.5, 9], [21, 27]])}
  ${poly(ROSE.deep, [[22.5, 7.5], [26.5, 9], [26.2, 10], [22.2, 8.6]])}
  ${slab(WOOD.hi, WOOD.lo, [3, 27, 29, 30])}`;

/** 設定: 真鍮の歯車。歯は 8 枚、まん中に軸の穴 */
const settings = () => {
  const g: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2, w = Math.PI / 8;
    for (const [d, r] of [[-w * .95, 10], [-w * .55, 14], [w * .55, 14], [w * .95, 10]] as const) g.push([16 + Math.cos(a + d) * r, 16 + Math.sin(a + d) * r]);
  }
  return `${puff(BRASS, g, [13.5, 13.5])}
  ${puff(INK, ngon(16, 16, 4.6, 8, Math.PI / 8), [17, 17.5])}`;
};

/** 写真を撮る: 黒い箱に真鍮のレンズ */
const photo = () => `
  ${poly(INK.mid, [[10, 10], [12, 6], [20, 6], [22, 10]])}${poly(INK.hi, [[12, 6], [20, 6], [19, 7.5], [13, 7.5]])}
  ${slab(INK.hi, INK.lo, [3, 10, 29, 26])}
  ${poly(INK.deep, [[3, 24.5], [29, 24.5], [29, 26], [3, 26]])}
  ${slab(PAPER.hi, PAPER.mid, [23.5, 12, 27, 14.5])}${slab(ROSE.hi, ROSE.lo, [5, 7.5, 8.5, 10])}
  ${puff(BRASS, ngon(16, 18, 7, 8, Math.PI / 8), [13.5, 15.5])}
  ${puff(GLASS, ngon(16, 18, 4.2, 6), [14.8, 16.8])}
  ${poly("#e8eef0", [[13.8, 16.4], [15, 15.6], [15.2, 16.6]])}`;

/** 最小表示: 手のひらほどのラジオ（小さな再生の窓に畳む） */
const mini = () => {
  const grille = [0, 1, 2].flatMap(r => [0, 1, 2].map(c => poly(INK.lo, ngon(9 + c * 3.2, 17 + r * 3.2, 1.1, 6)))).join("");
  return `
  ${poly(INK.mid, [[8, 10], [21, 3.5], [21.6, 4.6], [9.6, 10]])}
  ${slab(ROSE.hi, ROSE.lo, [3, 10, 29, 27])}
  ${poly(ROSE.deep, [[3, 25.5], [29, 25.5], [29, 27], [3, 27]])}
  ${slab(PAPER.hi, PAPER.lo, [5.5, 13.5, 18.5, 25])}${grille}
  ${puff(BRASS, ngon(23.5, 19, 3.6, 8), [22.5, 18])}
  ${slab(OCHRE.hi, OCHRE.lo, [20.5, 12.5, 26.5, 14.5])}`;
};

/** 小窓で手前に出す: 壁の窓枠の前に、小さな額がもう 1 枚 */
const pip = () => `
  <g transform="translate(2 4)">${bevel(22, 18, 3, WOOD)}${slab(SKY.hi, SKY.lo, [3, 3, 19, 15])}</g>
  <g transform="translate(15 15)">${poly("rgba(0,0,0,.28)", [[1.5, 1.5], [16, 1.5], [16, 13], [1.5, 13]])}${bevel(15, 12, 2.4, BRASS)}${slab(OCHRE.hi, OCHRE.lo, [2.4, 2.4, 12.6, 9.6])}</g>`;

/** 招待（リスニングパーティー）: クラッカーから紙ふぶきと紙テープ */
const invite = () => `
  ${poly(OCHRE.hi, [[4, 29], [12.5, 13], [15.5, 16.5]])}${poly(OCHRE.lo, [[4, 29], [15.5, 16.5], [19, 20.5]])}
  ${poly(ROSE.mid, [[7.2, 23], [9.4, 18.9], [13.4, 23.5], [10.6, 25.4]])}
  ${poly(OCHRE.deep, [[12.5, 13], [19, 20.5], [17.6, 21.4], [11.6, 14.4]])}
  ${poly(ROSE.hi, [[16, 13], [18.5, 9.5], [20.5, 11.5], [19, 8], [22, 6.5], [20.3, 9.2], [18.6, 12.4], [16.9, 14.2]])}
  ${poly(SAGE.hi, [[20, 16], [24, 14.5], [27, 16.5], [29.5, 14], [30, 15.2], [27.2, 18], [24.2, 16], [20.6, 17.4]])}
  ${poly(BRASS.hi, ngon(25, 6, 1.7, 4, .3))}${poly(SAGE.mid, ngon(14, 6.5, 1.5, 3, .5))}
  ${poly(ROSE.lo, ngon(28, 22, 1.5, 4))}${poly(OCHRE.hi, ngon(23.5, 23, 1.2, 3, 1))}${poly(BRASS.mid, ngon(29, 9, 1.2, 3))}`;

/** フォルダ（読むところ）: 書類フォルダ。後ろの板につまみ、紙が少しのぞき、手前の板が開く */
const open = () => `
  ${poly(OCHRE.lo, [[3, 7], [12, 7], [14.5, 10], [29, 10], [29, 27], [3, 27]])}${poly(OCHRE.deep, [[3, 7], [12, 7], [14.5, 10], [3, 10]])}
  ${slab(PAPER.hi, PAPER.mid, [6, 11.5, 26.5, 22])}
  ${poly(PAPER.lo, [[9, 14.5], [20, 14.5], [20, 15.5], [9, 15.5]])}
  ${poly(OCHRE.hi, [[2, 15], [30, 15], [28.5, 27], [3.5, 27]])}${poly(OCHRE.mid, [[30, 15], [28.5, 27], [3.5, 27]])}
  ${poly(OCHRE.deep, [[3.5, 27], [28.5, 27], [28.4, 28], [3.6, 28]])}`;

/** スマホのメニュー: 小石が 3 つ */
const more = () => [ [6.5, OCHRE], [16, ROSE], [25.5, SAGE] ].map(([x, p]) => puff(p as typeof SAGE, ngon(x as number, 16, 4.4, 6), [(x as number) - 1, 15])).join("");

/** Kona のしるし: 猫の耳が生えたレコード。盤は面を割った 12 角、溝が 2 本、まん中にレーベル、上に真鍮の目 */
export const logo = () => {
  const D = tone("#5a524b");
  const ring = (r: number, o: number) => `<polygon points="${ngon(16, 18, r, 12, Math.PI / 12).map(p => p.map(v => v.toFixed(2)).join(",")).join(" ")}" style="fill:none;stroke:#000;stroke-opacity:${o};stroke-width:.4"/>`;
  return `
  ${poly(D.hi, [[5.2, 12], [7.2, 1.8], [13, 7]])}${poly(ROSE.lo, [[7.2, 9.6], [8, 5], [11, 7.6]])}
  ${poly(D.lo, [[26.8, 12], [24.8, 1.8], [19, 7]])}${poly(ROSE.deep, [[24.8, 9.6], [24, 5], [21, 7.6]])}
  ${puff(D, ngon(16, 18, 12.5, 12, Math.PI / 12), [12.5, 14.5])}
  ${ring(10.8, .32)}${ring(9, .26)}${ring(7.3, .2)}
  ${poly(BRASS.hi, [[9.4, 12.6], [11.6, 11.2], [13.4, 12.4], [11.4, 13.5]])}${poly(BRASS.mid, [[18.6, 12.4], [20.4, 11.2], [22.6, 12.6], [20.6, 13.5]])}
  ${puff(OCHRE, ngon(16, 19, 4.6, 8, Math.PI / 8), [14.8, 17.8])}
  ${poly(D.deep, ngon(16, 19, .9, 6))}`;
};

export const HEADER_ICON = { home, library, settings, photo, mini, pip, invite, open, more, logo };
export type HeaderIcon = keyof typeof HEADER_ICON;

export const headerIcon = (k: HeaderIcon) =>
  `<svg class="hd-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${HEADER_ICON[k]()}</svg>`;

/** index.html の上の帯で data-icon を持つものに絵を入れる */
export function paintHeaderIcons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-icon]")) el.innerHTML = headerIcon(el.dataset.icon as HeaderIcon);
}
