// パンケーキ。三段重ねにバターとシロップ。シロップがゆっくり垂れる
import { box, poly, tone } from "./lowpoly";
import { q, type Live } from "./live";
import { ell } from "./_cafe";
import type { ItemDef } from "./types";

function art() {
  const P = tone("#c98a44"), B = tone("#f3dc8a");
  const cake = (y: number) => `${poly(P.mid, [[6, y], [42, y], [41, y + 5.5], [7, y + 5.5]])}${poly(P.lo, [[30, y], [42, y], [41, y + 5.5], [30, y + 5.5]])}
    ${poly("#e6c58a", [[6.5, y + 4.2], [41.5, y + 4.2], [41, y + 5.5], [7, y + 5.5]])}${poly("#dca35c", ell(24, y, 18, 3.4))}`;
  return `${poly("#cfc8bc", [[2, 31], [46, 31], [42, 34], [6, 34]])}${poly("#e8e4dc", ell(24, 30.6, 22, 3))}
    ${cake(24)}${cake(18.5)}${cake(13)}
    ${poly("#8a4a1c", ell(24, 13, 12.5, 2.3))}${poly("#a8622a", ell(22, 12.6, 7, 1.2))}
    <polygon class="drip" fill="#8a4a1c" points="0,0 2.4,0 2.2,1 1.2,1.8 0.2,1"/>
    ${poly("#8a4a1c", [[12, 13.5], [14.2, 14.2], [14, 18], [13, 18.8], [12.2, 17.5]])}
    ${box(B, 20.5, 8.5, 6, 3.5, 3, -2)}`;
}

const live: Live = svg => {
  const drip = q(svg, ".drip")!;
  return s => {
    // 18 秒（ゆっくりの設定では 40 秒）かけて縁から一段下まで垂れ、いったん消えてまた垂れる
    const per = s.calm ? 40 : 18, k = (s.t % per) / per, len = 1 + 9 * Math.min(1, k * 1.15);
    drip.setAttribute("points", `0,0 2.4,0 2.3,${(len * .7).toFixed(2)} 1.2,${len.toFixed(2)} 0.1,${(len * .7).toFixed(2)}`);
    drip.setAttribute("transform", "translate(33 14.4)");
    drip.setAttribute("opacity", k < .94 ? "1" : ((1 - k) / .06).toFixed(2));
  };
};

export default { key: "pancakes", label: "パンケーキ", at: "shelf", w: 48, h: 34, cat: "食べ物", order: 414, draft: true, note: "三段重ね。シロップがゆっくり垂れる", art, live } satisfies ItemDef;
