// けりぐるみ。魚の形の細長いぬいぐるみ。猫が叩くと床を滑って、ぱたぱた跳ねる
import { INK, ngon, poly, puff, tone } from "./lowpoly";
import { q, toy, wobble, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const F = tone("#6f8fb3");
  let stripes = "";
  for (const x of [22, 32, 42]) stripes += poly(F.lo, [[x, 6.5], [x + 3, 6], [x + 3.6, 19.5], [x + .6, 20.4]]);
  return `<g class="fish">${poly(F.lo, [[58, 12], [70, 3], [67.5, 12], [70, 21]])}${poly(F.hi, [[26, 5.5], [35, 1.5], [42, 5]])}
    ${puff(F, [[4, 13], [12, 6.5], [26, 4.5], [42, 4.5], [56, 8.5], [61, 12], [56, 16], [42, 20.5], [26, 21.5], [12, 19.5]], [30, 11])}
    ${stripes}${poly(INK.deep, ngon(11, 11.5, 1.5, 6))}${poly(F.deep, [[4, 13], [9, 14], [5, 15]])}</g>
    <i data-cat-toy="slide" style="left:6%;width:84%;top:30%"></i>`;
}

const live: Live = svg => {
  const fish = q(svg, ".fish"), w = wobble(120, 3.5);
  toy(svg, (dir, p) => { w.v += dir * p * 220; });
  return s => {
    const x = w.step(s.dt);
    if (Math.abs(x) < .01 && Math.abs(w.v) < .01) return;
    fish?.setAttribute("transform", `translate(0 ${(-Math.abs(x) * .18).toFixed(2)}) rotate(${(-x * .5).toFixed(1)} 36 21)`);
  };
};

export default { key: "kicker", label: "けりぐるみ", at: "floor", w: 72, h: 24, x: .64, cat: "猫", order: 54, note: "★ 魚の形。猫が叩くと床を滑って、ぱたぱた跳ねる", art, live } satisfies ItemDef;
