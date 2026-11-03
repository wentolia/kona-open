// 猫のアクセサリー: 飼い猫に 1 つつけられる（首輪・リボン・帽子など）。頭の組（cat-head）の中に描くので、首を傾げても一緒に動く。
// 座標は頭の座標（右向き。顔の中心 (17,-27)、あごの下 (13〜18.5, -21)）。free は最初から持っている。ほかはプレゼントで届く
export interface Acc { key: string; label: string; free?: boolean; art: string }
const p = (c: string, pts: string) => `<polygon style="fill:${c};stroke:${c}" stroke-width=".3" stroke-linejoin="round" points="${pts}"/>`;
const band = (c: string, d: string) => p(c, "12.4,-22.4 19,-21.7 18.7,-20.1 12.7,-20.7") + p(d, "12.7,-20.7 18.7,-20.1 18.6,-19.7 12.8,-20.2");
const ngon = (cx: number, cy: number, r: number, n: number, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`; }).join(" ");

export const ACCESSORIES: readonly Acc[] = [
  { key: "collar-red", label: "赤い首輪", free: true, art: band("#b8433a", "#7e2a24") + p("#e2c06a", "17,-21.6 18,-21.5 17.9,-20.4 16.9,-20.5") },
  { key: "collar-blue", label: "青い首輪", free: true, art: band("#3d5f8a", "#263e5c") + p("#d8d0c0", "17,-21.6 18,-21.5 17.9,-20.4 16.9,-20.5") },
  { key: "bell", label: "鈴の首輪", free: true, art: band("#c8553f", "#8a3428") + p("#e6c255", ngon(17.6, -18.9, 1.3, 8)) + p("#a8862e", "17.1,-18.6 18.1,-18.6 18,-18.2 17.2,-18.2") },
  { key: "heart-tag", label: "迷子札の首輪", art: band("#7a5638", "#4f3624") + p("#e6c255", "17.2,-19.6 18.4,-20.4 19.3,-19.6 18.2,-17.6 17.1,-18.8") },
  { key: "scarf", label: "スカーフ", art: p("#d9a441", "12,-22.8 19.3,-21.9 19,-19.6 12.4,-20.1") + p("#b07f2c", "12.6,-21 11,-17.4 9.4,-17.8 11.6,-21.6") + p("#3d6b55", "13.5,-21.8 15,-21.6 14.9,-20.4 13.6,-20.5") },
  { key: "bandana", label: "バンダナ", art: p("#c8553f", "12.4,-22.2 19.2,-21.4 16.2,-16.2") + p("#f0e2c8", ngon(15.8, -19.6, .45, 6)) + p("#f0e2c8", ngon(14.2, -20.6, .4, 6)) + p("#f0e2c8", ngon(17.1, -18.4, .35, 6)) },
  { key: "bowtie", label: "蝶ネクタイ", art: p("#262321", "17.6,-20.6 15.4,-22.2 15.6,-18.8") + p("#262321", "17.6,-20.6 19.8,-22 19.6,-18.8") + p("#4a4440", ngon(17.6, -20.6, .7, 6)) },
  { key: "ribbon", label: "リボン", art: p("#e58fa4", "14.2,-33.2 11.8,-35 12.1,-31.6") + p("#e58fa4", "14.2,-33.2 16.4,-35.2 16.6,-31.8") + p("#c86c84", ngon(14.3, -33.2, .8, 6)) },
  { key: "flower", label: "花飾り", art: [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 - Math.PI / 2; return p("#f3eee2", ngon(20.4 + Math.cos(a) * 1.15, -33.2 + Math.sin(a) * 1.15, .85, 6)); }).join("") + p("#e6b84a", ngon(20.4, -33.2, .65, 6)) },
  { key: "beret", label: "ベレー帽", art: p("#8a2f36", "10.8,-31.2 12.4,-34.6 17.4,-36 22,-34.2 22.8,-31.6 17,-32.4") + p("#6a2129", "10.8,-31.2 17,-32.4 22.8,-31.6 22.6,-31 17,-31.7 11,-30.6") + p("#6a2129", "17.2,-36 17.6,-37.2 18.2,-36") },
  { key: "knit", label: "毛糸の帽子", art: p("#5b7f9a", "10.8,-30.6 11.6,-34.8 16.6,-37 21.4,-35.4 23,-31 17,-31.8") + p("#e9e1cf", "10.6,-30.4 17,-31.4 23.2,-30.8 23,-29.6 17,-30.2 10.8,-29.4") + p("#e9e1cf", ngon(16.6, -37.6, 1.6, 8)) },
];
export const accOf = (key?: string) => key ? ACCESSORIES.find(a => a.key === key) : undefined;
export const accArt = (key?: string) => accOf(key)?.art ?? "";
