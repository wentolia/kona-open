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

/** 設定: 真鍮のつまみ。目盛りの点と、向きの線 */
const settings = () => {
  const ticks = ngon(16, 16, 14, 8, -Math.PI / 2).map(([x, y]) => poly(BRASS.lo, ngon(x, y, 1.1, 4) as Pt[])).join("");
  return `${ticks}
  ${puff(BRASS, ngon(16, 16, 11, 8, Math.PI / 8), [13.5, 13.5])}
  ${puff(INK, ngon(16, 16, 6, 8, Math.PI / 8), [15, 15])}
  ${poly(INK.deep, [[15, 5.5], [17, 5.5], [16.8, 10.5], [15.2, 10.5]])}`;
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

/** 招待: 封筒に、薔薇色の封蝋 */
const invite = () => `
  ${slab(PAPER.hi, PAPER.mid, [3, 8, 29, 25])}
  ${poly(PAPER.lo, [[3, 25], [13, 16], [16, 18], [19, 16], [29, 25]])}
  ${poly(PAPER.deep, [[3, 8], [3, 25], [12, 16.5]])}${poly(PAPER.lo, [[29, 8], [29, 25], [20, 16.5]])}
  ${poly(PAPER.hi, [[3, 8], [29, 8], [16, 18.5]])}${poly(PAPER.mid, [[3, 8], [29, 8], [28, 9], [4, 9]])}
  ${puff(ROSE, ngon(16, 18, 3.6, 7), [15, 17])}`;

/** フォルダ（読むところ）: 木箱にレコードが立っている */
const open = () => `
  ${slab(SAGE.hi, SAGE.lo, [6, 6, 15, 18])}
  ${poly(INK.lo, ngon(18.5, 11, 6.5, 10))}${poly(INK.hi, [[14, 7], [18.5, 4.5], [18.5, 11]])}${poly(ROSE.mid, ngon(18.5, 11, 2, 6))}
  ${slab(OCHRE.hi, OCHRE.lo, [20, 8, 27, 18])}
  ${poly(WOOD.deep, [[3, 14], [29, 14], [29, 16], [3, 16]])}
  ${slab(WOOD.hi, WOOD.mid, [3, 16, 29, 21.5])}${slab(WOOD.mid, WOOD.lo, [3, 22.5, 29, 28])}
  ${poly(WOOD.deep, [[3, 21.5], [29, 21.5], [29, 22.5], [3, 22.5]])}
  ${poly(WOOD.deep, [[12, 18], [20, 18], [20, 19.5], [12, 19.5]])}`;

/** スマホのメニュー: 小石が 3 つ */
const more = () => [ [6.5, OCHRE], [16, ROSE], [25.5, SAGE] ].map(([x, p]) => puff(p as typeof SAGE, ngon(x as number, 16, 4.4, 6), [(x as number) - 1, 15])).join("");

/** Kona のしるし: 耳の生えたレコード。盤は黒の面、まん中の札が鼻先、真鍮の目 */
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
