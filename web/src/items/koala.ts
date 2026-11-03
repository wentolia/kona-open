// コアラの置物。オーストラリアで。ユーカリの枝に
import { poly, puff, tone, leaf } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const K = tone("#8a8c90");
  return `${poly("#6a5040", [[0, 46], [40, 38], [40, 41], [0, 49]])}${leaf("#6a9a7a", "#5a8a6a", 34, 40, 10, 2.4, 60)}${leaf("#6a9a7a", "#5a8a6a", 6, 46, 9, 2.4, -50)}
    ${puff(K, [[8, 44], [8, 26], [14, 20], [28, 20], [32, 28], [32, 44]], [14, 26])}${poly(K.hi, oval(20, 34, 6, 7, 8))}
    ${puff(K, oval(20, 14, 10, 9, 10), [16, 10])}${puff(K, oval(9, 8, 5, 5, 8), [7, 6])}${puff(K, oval(31, 8, 5, 5, 8), [29, 6])}
    ${poly("#2a2420", oval(20, 16, 2.6, 3.4, 8))}${poly("#2a2420", [[14, 12], [15.4, 12], [15.4, 13.4], [14, 13.4]])}${poly("#2a2420", [[25, 12], [26.4, 12], [26.4, 13.4], [25, 13.4]])}`;
}

export default { key: "koala", label: "コアラの置物", at: "shelf", w: 40, h: 50, cat: "飾り", order: 681, region: "AU", note: "オーストラリアで。ユーカリの枝に", art } satisfies ItemDef;
