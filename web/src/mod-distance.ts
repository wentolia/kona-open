// 聴いた距離: 聴いた時間の合計を、レコードの溝をたどった長さに換算する（33⅓ 回転・平均の半径 11cm で毎秒約 0.38m）。
// 次に越える目じるしまでの進み具合を細い線で見せる

import { esc, everyFrame, hist } from "./modctx";

const SPEED = 2 * Math.PI * 0.11 * (33.333 / 60); // m/s
export const MARKS: [number, string][] = [
  [100, "100m 走"], [333, "東京タワー"], [634, "スカイツリー"], [3776, "富士山"], [8849, "エベレスト"],
  [34500, "山手線 1 周"], [42195, "フルマラソン"], [552600, "東京 → 新大阪"], [3000000, "日本列島"], [40075000, "地球 1 周"],
];

export const metersOf = (sec: number) => sec * SPEED;
const fmtM = (m: number) => m < 1000 ? `${Math.floor(m)}<small>m</small>` : `${(m / 1000).toFixed(m < 10000 ? 2 : m < 100000 ? 1 : 0)}<small>km</small>`;

export function mountDistance(body: HTMLElement) {
  body.innerHTML = `
    <div class="dist">
      <div class="dist-num"></div>
      <div class="dist-track"><span class="dist-bar">${Array.from({ length: 9 }, () => "<b></b>").join("")}<i></i><em></em></span></div>
      <div class="dist-ends"><span class="dist-from"></span><span class="dist-to"></span></div>
    </div>`;
  const root = body.querySelector<HTMLElement>(".dist")!;
  const num = root.querySelector<HTMLElement>(".dist-num")!, bar = root.querySelector<HTMLElement>(".dist-bar i")!, dot = root.querySelector<HTMLElement>(".dist-bar em")!;
  const from = root.querySelector<HTMLElement>(".dist-from")!, to = root.querySelector<HTMLElement>(".dist-to")!;
  let shown = -1;
  const H = hist();
  everyFrame(root, () => {
    const m = metersOf(H.listened());
    if (Math.floor(m) === shown) return;
    shown = Math.floor(m);
    num.innerHTML = fmtM(m);
    const i = MARKS.findIndex(([v]) => v > m);
    const next = MARKS[i < 0 ? MARKS.length - 1 : i], prev = i > 0 ? MARKS[i - 1] : undefined;
    // 左は通り過ぎた目じるし、右は次の目じるしと、そこまでの残り
    from.textContent = prev ? prev[1] : "";
    from.style.visibility = prev ? "" : "hidden"; from.dataset.m = prev ? String(prev[0]) : "";
    const rest = Math.max(0, next[0] - m);
    to.innerHTML = `${esc(next[1])}<small>あと ${rest < 1000 ? `${Math.ceil(rest)}m` : `${(rest / 1000).toFixed(rest < 10000 ? 1 : 0)}km`}</small>`;
    const lo = prev?.[0] ?? 0, pct = `${Math.min(100, ((m - lo) / (next[0] - lo)) * 100)}%`;
    bar.style.width = pct; dot.style.left = pct;
  });
}
