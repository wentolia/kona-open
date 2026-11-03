import "./cat.css";
import { reduceMotion, onMotionChange, prefs } from "./prefs";
import { SILL, windowRain, roomLightOn } from "./mod-window";
import { markNap, markClaw } from "./shelf-marks";
import { esc } from "./dom";
import { accArt } from "./cat-acc";
import { type Shades, seeded, breedOf, nameOf, randomPersona, type Coat, type Persona, randomCoat } from "./cat-coat";
export { BREEDS, randomCoat, breedCoat, isCoat, type Coat, type Persona, type Pattern } from "./cat-coat";

// ホームの猫: 棚板の上を歩き、跳び移り、座り、香箱を組んで眠る。ほとんどの時間はじっとしている。
// 何匹でも置ける。毛並みと性格（元気さ・眠たがり・人なつこさ・遊び好き・好奇心・足の速さ・体の大きさ）は
// 呼んだときにランダムに決まり、その子のものとして覚えておく。猫どうしは毛づくろいし合い、じゃれ合い、
// ちょっかいを出し、追いかけっこをする。棚板のほか、モジュールの上（再生中・時計など）や窓辺にも行く
type Pose = "stand" | "sit" | "lie";
type State = "stand" | "sit" | "lie" | "sleep" | "walk" | "jump" | "fall" | "purr" | "groom" | "groomed" | "play" | "poke"
  | "stretch" | "yawn" | "selfgroom" | "stalk" | "annoyed" | "chatter" | "eat" | "scratch" | "greet" | "flinch" | "watch" | "held";
// 足場: 棚板・モジュールの上・窓辺・床。pull は猫の好み（大きいほど行きたがる）
// perch: キャットタワーの段、bed: タワーのベッド、pad: 爪とぎ、deck: 家具のモジュールの床板
interface Plat { el: Element; kind: "shelf" | "top" | "sill" | "floor" | "perch" | "bed" | "pad" | "deck" | "box"; y: number; x0: number; x1: number; pull: number; rim?: number }
const samePlat = (a?: Plat, b?: Plat) => !!a && !!b && a.el === b.el && a.kind === b.kind;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const S = 1.7;          // 描いた形（60×44）を何倍で見せるか
const HALF = 20 * S;    // 胴の半分の長さ。棚の端からはみ出さない余白
const SPEED = 30;       // 歩く速さ px/s（忍び足なのでゆっくり）
const RUN = 2.8;        // 走るときの速さの倍率
let music = false;      // 音楽が鳴っている（再生中モジュールの上が温かい）
export function setCatsMusic(on: boolean) { music = on; }
let held = false;       // 写真を撮っている間は、猫はその場でじっとしている
export function holdCats(on: boolean) { held = on; }
// リスニングパーティーの部屋では、届いた音の大きさを猫の耳にする（参加者は自分のプレイヤーを鳴らさないので）
let partyEar: (() => number) | undefined;
export function setPartyEar(fn?: () => number) { partyEar = fn; }

// ---------- 曲を聴く ----------
// 猫たちみんなで 1 つの耳。音の大きさの包絡線から拍（音の立ち上がり）を拾い、テンポと拍の位置を追う。
// 長く聴いた音量とテンポから「静かな曲か」を決める（calm: 0〜1。静かでゆっくりな曲が続くほど 1 へ）
const ear = { lvl: 0, t: 0, last: 0, env: 0, slow: 0, long: 0, lastOn: -9, rate: 1.6, beats: 0, conf: 0, calm: 0, loud: 0 };
function hearMusic(now: number) {
  if (now - ear.last < 8) return; // 1 フレームに 1 回
  const dt = Math.min(.1, (now - ear.last) / 1000); ear.last = now; ear.t += dt;
  const level = ear.lvl = partyEar ? partyEar() : music ? hooks?.level?.() ?? 0 : 0;
  const k = (tau: number) => 1 - Math.exp(-dt / tau);
  ear.env += (level - ear.env) * k(.04); ear.slow += (level - ear.slow) * k(.9); ear.long += (level - ear.long) * k(8);
  if (ear.env > ear.slow * 1.3 && ear.env > .015 && ear.t - ear.lastOn > .25) {
    const gap = ear.t - ear.lastOn;
    if (gap < 1.6) { ear.rate += (1 / gap - ear.rate) * .25; ear.conf = Math.min(1, ear.conf + .25); }
    ear.lastOn = ear.t; ear.beats++;
  }
  if (ear.t - ear.lastOn > 2) ear.conf = Math.max(0, ear.conf - dt); // 拍が途切れたら、しっぽは普段どおりに戻す
  ear.loud = ear.long > 0 ? clamp((20 * Math.log10(ear.long) + 42) / 36, 0, 1) : 0;
  // 拍がはっきりしない曲（ピアノのソロ・アンビエントなど）は、ゆっくりな曲として扱う
  const slowness = ear.conf < .3 ? 1 : clamp((2.2 - ear.rate) / 1, .3, 1);
  const quiet = music && level > 0 ? clamp((.6 - ear.loud) / .3, 0, 1) * slowness : 0;
  ear.calm += (quiet - ear.calm) * k(quiet > ear.calm ? 20 : 6); // 眠くなるのはゆっくり、覚めるのは早め
}
/** 拍に合わせた振り（-1〜1）。拍のたびに左右へ振れ切る。拍が拾えていなければ 0 */
function beatSwing(lag = 0): number {
  if (ear.conf < .3 || !(music || partyEar)) return 0;
  const frac = Math.min(1, (ear.t - ear.lastOn) * ear.rate);
  return Math.cos(Math.PI * (ear.beats + smooth(frac)) - lag) * Math.min(1, ear.conf * 1.5);
}
const REACH_X = 170;    // 一跳びで届く横の距離
const REACH_Y = 260;    // 一跳びで届く縦の距離
const GRAV = 1600;      // 落ちるときの重力 px/s²
const LAUNCH = .07;     // 踏み切りの時間（一瞬）
// 空中の脚の形のキーフレーム: [進み, 肉球の x（立ち位置から）, y, 振り出し, 蹴り]
const FLY_F: number[][] = [[0, 3, -5, .6, 0], [.4, 8, -7, .15, 0], [.75, 7, -3, 0, 0], [1, 5, -.5, 0, 0]];
const FLY_H: number[][] = [[0, -9, -1.5, .05, 1], [.3, -8, -3, .3, .6], [.65, -3, -6, .75, 0], [1, 0, -3.5, .45, 0]];
function flight(keys: number[][], k: number): [number, number, number, number] {
  let i = 0; while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], u = smooth(clamp((k - a[0]) / (b[0] - a[0]), 0, 1));
  return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * u) as [number, number, number, number];
}

let FUR = 0; // 長毛の猫を描くあいだ、輪郭をふくらませる量
const poly = (c: string, pts: string, cls = "", w = .5 + FUR) =>
  `<polygon${cls ? ` class="${cls}"` : ""} fill="${c}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" points="${pts}"/>`;
const leg = (k: string, c: string, pts: string) => `<g data-leg="${k}">${poly(c, pts)}</g>`;
// 関節で曲がる脚: 骨ごとの多角形（上腕/大腿・前腕/下腿・中足・足先）。形は毎フレーム計算する
const limb = (k: Limb, fills: string[]) =>
  `<g data-limb="${k}">${fills.map(f => `<polygon fill="${f}" stroke="${f}" stroke-width="${.4 + FUR * .5}" stroke-linejoin="round"/>`).join("")}</g>`;

// ---------- 脚の骨格と歩き方 ----------
// 猫の並足は「後ろ左 → 前左 → 後ろ右 → 前右」と、同じ側の脚が続けて出る（ラテラルシークエンス）。
// 肉球は地面に置いたら体が通り過ぎるまで動かさず（滑らない）、低く持ち上げて、そっと置く
type Limb = "ff" | "fh" | "nf" | "nh"; // f* は奥（far）、n* は手前（near）。2 文字目 f は前脚、h は後ろ脚
type V = [number, number];
// 本物の猫の骨格に合わせる:
//  前脚: 肩甲骨は背中の上（き甲）から胸の前へ斜めに下り、肩関節は胸の前・高さ 6 割。
//        上腕は短く後ろ下へ、肘は胸の下端。前腕は長くほぼ垂直で、手首は地面のすぐ上
//  後ろ脚: 股関節は腰の高い位置。大腿は前下へ、膝はお腹の線まで前に出る。
//        下腿は長く後ろ下へ、かかとは高い。中足は長くほぼ垂直（猫はつま先立ちで歩く）
const ROOT: Record<Limb, V> = { nf: [10.4, -15.2], ff: [8.8, -15.4], nh: [-11.8, -16.6], fh: [-13.2, -16.8] }; // 肩関節・股関節
const WITHERS: Record<"nf" | "ff", V> = { nf: [5.8, -22.2], ff: [4.4, -22.2] };  // 肩甲骨の上端
const REST: Record<Limb, V> = { nf: [9.8, 0], ff: [8.2, 0], nh: [-10.4, 0], fh: [-11.9, 0] };             // 立ったときの肉球
const OFFSET: Record<Limb, number> = { fh: 0, ff: .25, nh: .5, nf: .75 };
const DUTY = .64;   // 一歩のうち、肉球が地面についている割合
const STRIDE = 17;  // 一歩で進む長さ（描画の単位）
const LIFT = { f: 2.2, h: 1.7 }; // 持ち上げる高さ。低く、静かに
const BONES = { upper: 5.2, fore: 8.6, femur: 6.9, tibia: 7.8, meta: 5.3 };
const smooth = (t: number) => t * t * (3 - 2 * t);
/** u が a〜b の間だけ 1 になる山（始めと終わりの 3 割でなめらかに上がり下がりする） */
const env = (u: number, a: number, b: number) => u <= a || u >= b ? 0 : smooth(Math.min(1, (u - a) / (b - a) / .3, (b - u) / (b - a) / .3));
/** 地面を基準にした肉球の位置を、傾き・沈み・伸び縮みした体の座標に直す（体は (0,-12) を軸に傾く） */
function toLocal(p: V, bob: number, tilt: number, sy: number): V {
  if (!tilt && sy === 1) return p;
  const a = tilt * Math.PI / 180, x = p[0], y = p[1] + bob + 12;
  const lx = x * Math.cos(a) + y * Math.sin(a), ly = -x * Math.sin(a) + y * Math.cos(a) - 12;
  return [lx, (ly - bob) / sy];
}

/** 歩きの位相から、その脚の肉球の位置（体基準）と、振り出し中の割合（0 なら接地中）を出す */
// 走るときは対角の脚がそろって出る速足（トロット）。歩幅を広げ、肉球を高く上げる
const OFFSET_RUN: Record<Limb, number> = { fh: 0, nf: .06, nh: .5, ff: .56 };
const DUTY_RUN = .44;

// ---------- 動きの個性 ----------
// 骨格は同じでも、猫ごとに体の使い方が違う。性格と体格から、関節の振れ幅・速さ・間（ま）を決める。
// 本物の猫の観察に、アニメーションの「らしさ」の原則（予備動作・溜め・追従と重なり・ゆっくり入ってゆっくり出る・誇張）を重ねる:
//  - 大きく重い子: 歩幅が広く足取りはゆっくり。一歩ごとに肩と腰が沈み、体重が乗る。着地や座るときに深く沈む
//  - 元気な子: 足の運びが速く、動きの切り替えがきびきびして、間が短い
//  - 遊び好きな子: 足を高く上げて弾むように歩き、しっぽや頭が大きくしなって行き過ぎてから戻る
//  - 眠たがりな子: 足を低く引きずるように運び、何をするにも一拍おいてから、ゆっくり動く
//  - 好奇心の強い子: 歩きながらもあちこち見回し、頭が体に合わせて揺れる。落ち着いた子は頭を水平に保つ
export interface Motion {
  stride: number;  // 歩幅（倍率）
  lift: number;    // 足を上げる高さ（倍率）
  duty: number;    // 一歩のうち接地している割合
  lat: number;     // 前脚の出るタイミングのずれ（歩き方の癖）
  heave: number;   // 一歩ごとの体の上下と、肩・腰の前後の傾き（重さ）
  steady: number;  // 歩くときに頭を水平に保つ強さ（0〜1）
  snap: number;    // 動きの切り替えの速さ（ばねの硬さ、1/秒）
  bounce: number;  // 行き過ぎて戻る量（0 でぴたりと止まる、大きいほどしなる）
  hold: number;    // 間の長さ（倍率）: 動き出す前の溜め、止まってからの余韻
  reach: number;   // 関節の振れ幅（倍率）: じゃれる・伸び・しっぽ
  sink: number;    // 着地・座るときに沈む深さ（倍率）
}
export function motionOf(p: Persona, seed: string): Motion {
  const r = seeded(seed + "motion"), heavy = clamp((p.size - .86) / .4, 0, 1);
  return {
    stride: (.9 + .22 * heavy + .1 * (p.speed - 1)) * (.96 + .08 * r()),
    lift: clamp(.7 + .55 * p.playful + .25 * p.energy - .3 * p.sleepy + .1 * (r() - .5), .45, 1.5),
    duty: clamp(.66 - .06 * p.energy + .04 * heavy, .56, .72),
    lat: (r() - .5) * .08,
    heave: .55 + .9 * heavy + .3 * (1 - p.energy),
    steady: clamp(.85 - .45 * p.curious + .1 * (r() - .5), .3, .95),
    snap: 4 + 6 * p.energy - 2.2 * p.sleepy,
    bounce: clamp(.12 + .5 * p.playful - .15 * p.sleepy, .05, .6),
    hold: clamp(.75 + .7 * p.sleepy + .35 * p.curious - .45 * p.energy, .5, 1.7),
    reach: .82 + .3 * p.playful + .1 * p.energy,
    sink: .8 + .55 * heavy + .2 * p.sleepy,
  };
}
const BASE_MOTION: Motion = { stride: 1, lift: 1, duty: DUTY, lat: 0, heave: 1, steady: .7, snap: 6, bounce: .2, hold: 1, reach: 1, sink: 1 };
/** 減衰するばね（行き過ぎて戻る）。x を goal へ。k は硬さ、b は行き過ぎの量 */
function spring(st: { x: number; v: number }, goal: number, dt: number, k: number, b: number) {
  const w = Math.min(60, k * 1.6), z = clamp(1 - b, .18, 1); // 固有角振動数と減衰比
  const n = Math.max(1, Math.ceil(w * dt / .4)), h = dt / n; // 硬いばねは細かく刻んで、暴れないように
  for (let i = 0; i < n; i++) { st.v += (-(w * w) * (st.x - goal) - 2 * z * w * st.v) * h; st.x += st.v * h; }
  return st.x;
}
const gaitOf = (run: boolean, m: Motion = BASE_MOTION) => run
  ? { off: OFFSET_RUN, duty: DUTY_RUN, stride: STRIDE * 1.45 * m.stride, lift: 1.9 * m.lift }
  : { off: { ...OFFSET, ff: OFFSET.ff + m.lat, nf: OFFSET.nf + m.lat }, duty: m.duty, stride: STRIDE * m.stride, lift: m.lift };
function gaitPaw(k: Limb, phase: number, run = false, m: Motion = BASE_MOTION): [V, number] {
  const g = gaitOf(run, m);
  const p = ((phase + g.off[k]) % 1 + 1) % 1, r = REST[k];
  // 接地中に体が進むのは duty×歩幅。肉球はその分だけ後ろへ流れ、地面の上では滑らない
  const half = g.duty * g.stride / 2;
  if (p < g.duty) return [[r[0] + half * (1 - 2 * p / g.duty), 0], 0];
  const sw = (p - g.duty) / (1 - g.duty), e = smooth(sw);
  // 持ち上げは前半で、置くときはゆっくり下ろす（着地の瞬間に速さがない）
  const up = Math.sin(Math.PI * Math.pow(sw, .8)) * (k[1] === "f" ? LIFT.f : LIFT.h) * g.lift;
  return [[r[0] + half * (2 * e - 1), -up], sw];
}

/** 2 本の骨で A から T へ届く中間の関節。bend は曲がる向き（1: 後ろへ、-1: 前へ） */
function ik(A: V, T: V, a: number, b: number, bend: 1 | -1): [V, V] {
  const dx = T[0] - A[0], dy = T[1] - A[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + .01, a + b - .01), ang = Math.atan2(dy, dx);
  const th = ang + bend * Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const J: V = [A[0] + Math.cos(th) * a, A[1] + Math.sin(th) * a];
  const u = Math.atan2(T[1] - J[1], T[0] - J[0]);
  return [J, [J[0] + Math.cos(u) * b, J[1] + Math.sin(u) * b]];
}

// 骨 1 本を、太さが根元 wa・先 wb の四角形にする
function bone(P: V, Q: V, wa: number, wb: number): string {
  const l = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, nx = -(Q[1] - P[1]) / l, ny = (Q[0] - P[0]) / l;
  const pt = (X: V, w: number, sgn: number) => `${(X[0] + nx * w * sgn / 2).toFixed(2)},${(X[1] + ny * w * sgn / 2).toFixed(2)}`;
  return `${pt(P, wa, 1)} ${pt(Q, wb, 1)} ${pt(Q, wb, -1)} ${pt(P, wa, -1)}`;
}

/** 肉球の位置から脚の形を決めて、4 つの多角形に書き込む。sw は振り出し中の割合 */
function drawLimb(g: SVGGElement, k: Limb, paw: V, sw: number, push: number) {
  const R = ROOT[k], far = k[0] === "f", w = far ? .85 : 1;
  if (k[1] === "f") {
    // 前脚: き甲 → 肩甲骨 → 肩関節 → 肘（後ろへ曲がる）→ 手首 → 足先。
    // 猫の肩甲骨は鎖骨に縛られず、脚と一緒に前後へ振れる（脚が前へ出ると上端は後ろへ倒れる）
    const [sc, a, b, c, d] = [...g.children] as SVGPolygonElement[];
    const reach = clamp((paw[0] - REST[k][0]) / 6, -1.4, 1.4), top = WITHERS[k as "nf" | "ff"];
    const S: V = [R[0] + .7 * reach, R[1] - .3 * Math.abs(reach)];
    const T: V = [top[0] - 1.1 * reach, top[1] + .35 * Math.abs(reach)];
    sc.setAttribute("points", bone(T, S, 3.4 * w, 4.8 * w));
    const flex = Math.sin(Math.PI * sw);
    const wrist: V = [paw[0] + .3 + 1.7 * flex, paw[1] - 2.3 + .4 * flex];
    const [elbow, W] = ik(S, wrist, BONES.upper, BONES.fore, 1);
    a.setAttribute("points", bone(S, elbow, 4.6 * w, 3.4 * w));
    b.setAttribute("points", bone(elbow, W, 3 * w, 2.2 * w));
    c.setAttribute("points", bone(W, [paw[0] - .2 * flex, paw[1]], 2.2 * w, 2 * w));
    d.setAttribute("points", `${(paw[0] - 1).toFixed(2)},${paw[1].toFixed(2)} ${(paw[0] + 2.1 - 1.2 * flex).toFixed(2)},${(paw[1] + .1 * flex).toFixed(2)} ${(paw[0] + 1.6 - flex).toFixed(2)},${(paw[1] - 1.3).toFixed(2)} ${(paw[0] - .7).toFixed(2)},${(paw[1] - 1.6).toFixed(2)}`);
  } else {
    const [a, b, c, d] = [...g.children] as SVGPolygonElement[];
    // 後ろ脚: 股関節 → 膝（前へ曲がる）→ かかと（後ろへ突き出る）→ 足先。けり出しでかかとが上がり、振り出しで足首をたたむ
    const alpha = (72 + 14 * push - 26 * Math.sin(Math.PI * sw)) * Math.PI / 180;
    const hock: V = [paw[0] - Math.cos(alpha) * BONES.meta, paw[1] - Math.sin(alpha) * BONES.meta];
    const [knee, H] = ik(R, hock, BONES.femur, BONES.tibia, -1);
    a.setAttribute("points", bone(R, knee, 8 * w, 4 * w));
    b.setAttribute("points", bone(knee, H, 3.2 * w, 2.1 * w));
    c.setAttribute("points", bone(H, paw, 2.1 * w, 1.9 * w));
    d.setAttribute("points", `${(paw[0] - 1.1).toFixed(2)},${paw[1].toFixed(2)} ${(paw[0] + 1.9).toFixed(2)},${paw[1].toFixed(2)} ${(paw[0] + 1.4).toFixed(2)},${(paw[1] - 1.3).toFixed(2)} ${(paw[0] - .9).toFixed(2)},${(paw[1] - 1.5).toFixed(2)}`);
  }
}

// ---------- 柄 ----------
type Pt = [number, number];
const quad = (c: string, pts: Pt[], op = .8) => poly(c, pts.map(p => p.join(",")).join(" "), "", .3).replace("<polygon", `<polygon fill-opacity="${op}" stroke-opacity="${op}"`);
// 縞: 背中の線 top（点列）から下へ伸びる帯。x の位置ごとに、上端は背中の線、長さは len
function bands(c: string, top: Pt[], xs: number[], lens: number[], w = 1.5, slant = 1.1): string {
  const yAt = (x: number) => {
    for (let i = 0; i < top.length - 1; i++) {
      const [x0, y0] = top[i], [x1, y1] = top[i + 1];
      if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return top[0][1];
  };
  // 帯は下へ行くほど細くなり、先は少し後ろへ流れる（縞は背骨から脇腹へ向かって細る）
  return xs.map((x, i) => {
    const y = yAt(x) + .7, len = lens[i % lens.length], ww = w * (i % 2 ? .8 : 1);
    return quad(c, [[x, y], [x + ww, yAt(x + ww) + .7], [x + ww * .55 - slant, y + len], [x - slant, y + len * .92]]);
  }).join("");
}
// 斑点: 小さなひし形
const dots = (c: string, at: Pt[], r = 1.1) => at.map(([x, y]) => quad(c, [[x - r, y], [x, y - r * .75], [x + r, y], [x, y + r * .75]])).join("");
// 背中の線（姿勢ごと）
const BACK: Record<Pose, Pt[]> = {
  stand: [[-17.5, -16], [-14, -21.5], [-3, -23], [7, -22.5], [13, -19]],
  sit: [[-13, -7], [-10, -15], [-3, -23], [3, -30]],
  lie: [[-19.5, -7], [-14, -13], [-4, -15.5], [6, -15], [11.5, -12]],
};
function pattern(C: Coat, pose: Pose): string {
  const m = C.mark ?? C.deep;
  if (C.pat === "tabby") {
    if (pose === "stand") return bands(m, BACK.stand, [-12.5, -8.2, -3.8, .6, 5], [6, 7.2, 6.4, 7, 5.2]) + quad(m, [[-16.5, -15.5], [-14.6, -17.8], [-11.8, -13.2], [-13.6, -12.4]]);
    if (pose === "lie") return bands(m, BACK.lie, [-15, -10.2, -5.4, -.6, 4.2], [4.6, 5.8, 5, 5.6, 4.2]);
    // 座ると背中が斜めになるので、背の線に直角に帯を入れる
    return [[[-11.6, -11], [-7.6, -8.6]], [[-8.2, -17], [-4.4, -14]], [[-4.6, -21.6], [-.6, -18.6]], [[-.4, -26.4], [3.4, -24]]]
      .map(([a, b]) => quad(m, [a as Pt, [a[0] + 1.3, a[1] - 1.1], [b[0] + 1.1, b[1] - 1.2], b as Pt])).join("")
      + quad(m, [[-12.4, -9.6], [-10.8, -10.6], [-9.2, -6], [-10.8, -5.4]]);
  }
  if (C.pat === "spots") {
    const at: Record<Pose, Pt[]> = {
      stand: [[-12, -18.5], [-8, -14.5], [-5, -20], [-1, -16.5], [2.5, -20.5], [5.5, -17], [-14.5, -14], [8.5, -19.5], [-3.5, -13.5], [-9.5, -21]],
      sit: [[-9, -12], [-6, -17], [-2, -21], [1, -26], [-5.5, -9], [-1.5, -14], [3.5, -18.5], [-12, -4], [-8, -5]],
      lie: [[-15, -9], [-11, -12], [-6, -13], [-1, -14], [4, -12], [-8, -8.5], [-2, -9.5], [7, -9], [-17, -4]],
    };
    return dots(m, at[pose]);
  }
  if (C.pat === "calico" && C.pt && C.pt2) {
    const o = C.pt, k = C.pt2;
    if (pose === "stand") return poly(k.mid, "-9,-22.6 2,-23 3.5,-17.5 -2,-15.5 -7,-16 -10,-19") + poly(o.mid, "-17.5,-16 -14,-21.5 -9.8,-22.3 -10.8,-17 -14.5,-12.6 -16.8,-13");
    if (pose === "sit") return poly(k.mid, "-3,-23 3,-30 5.5,-27.5 1,-19.5 -4.5,-18.5") + poly(o.mid, "-13,-7 -10,-15 -6.5,-17.5 -5.5,-10 -10,-6");
    return poly(k.mid, "-14,-13 -4,-15.5 -1.5,-11.5 -10.5,-9.5") + poly(o.mid, "-19.5,-7 -14,-13 -12,-9 -16.5,-4.5 -19.5,-4");
  }
  return "";
}

// 顔の形: [頭, 首側の陰, 口元, 鼻]。丸顔は頬が張り、鼻の低い顔は口元が短く、くさび形は鼻先が長い
const FACE: Record<"normal" | "round" | "flat" | "wedge", [string, string, string, string]> = {
  normal: ["10.5,-26 12,-30.5 16,-32.2 20.5,-31 22.6,-28 23.4,-26 22,-22.8 18.5,-21 13,-21", "13,-21 10.5,-26 15.5,-24.5 18.5,-21", "19.5,-25.5 22.6,-27.5 23.6,-25.6 22,-22.8 19,-22.8", "22.6,-27.4 23.9,-26.6 23.4,-25.6"],
  round: ["10.2,-25.5 11.6,-30.5 16,-32.6 20.6,-31.4 22.8,-28.4 23.2,-25.8 22,-22.4 18.4,-20.4 12.8,-20.8", "12.8,-20.8 10.2,-25.5 15.5,-24.3 18.4,-20.4", "19.4,-25.4 22.4,-27.2 23.3,-25.6 21.8,-22.6 18.8,-22.4", "22.4,-27.1 23.6,-26.5 23.1,-25.6"],
  flat: ["10.2,-25.5 11.6,-30.8 16,-32.8 20.4,-31.6 22.2,-28.6 22.3,-25.6 21.2,-22.4 18,-20.5 12.8,-20.8", "12.8,-20.8 10.2,-25.5 15.5,-24.3 18,-20.5", "19.4,-25.6 21.8,-26.8 22.4,-25.4 21,-22.8 18.6,-22.6", "21.6,-26.9 22.6,-26.4 22.2,-25.6"],
  wedge: ["10.8,-26 12.2,-30.4 16,-31.8 20.4,-30.6 23.2,-27.8 24.4,-25.8 22.6,-22.9 18.6,-21.2 13.2,-21.2", "13.2,-21.2 10.8,-26 15.5,-24.6 18.6,-21.2", "20,-25.5 23.4,-27.3 24.6,-25.6 22.6,-22.9 19.4,-22.9", "23.5,-27.2 24.9,-26.4 24.4,-25.5"],
};
// 耳: 付け根を軸に大きさを変える。折れ耳は前へ小さく折れた形に描き替える
const scaled = (k: number, cx: number, cy: number, body: string) => k === 1 ? body : `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${body}</g>`;

// 右向き・足元が原点。立ち姿を基準に、頭だけは姿勢ごとにずらして使い回す
function art(C: Coat): string {
  const B = breedOf(C);
  // ポイント柄は、顔・耳・脚・しっぽだけ濃い色。ほかの猫は体と同じ色
  const P: Shades = C.pat === "point" && C.pt ? C.pt : C;
  // 三毛のしっぽ・片耳は茶色
  const T: Shades = C.pat === "calico" && C.pt ? C.pt : P;
  const tabbyTip = C.pat === "tabby" ? C.mark ?? C.deep : T.lo; // 縞の子はしっぽの先が濃い
  const fur = B.long ? 1.1 : 0, tailFur = B.tail === "bushy" ? 2.4 : fur;
  FUR = fur;
  const tw = (c: string, pts: string) => poly(c, pts, "", .5 + tailFur);
  const tails = B.tail === "bob" ? {
    // 短い丸いしっぽ（ボブテイル）。関節の入れ物だけ残す
    stand: `<g data-tail="stand">${tw(T.lo, "-15,-16.5 -16.5,-20.2 -19.4,-21 -19.8,-18.4 -17.6,-16.2")}<g data-tj="1"></g><g data-tj="2"></g></g>`,
    sit: `<g data-tail="sit">${tw(T.lo, "-14,-3.5 -16.6,-5.6 -18.4,-3.4 -17,-.6 -14.4,-.6")}</g>`,
    lie: `<g data-tail="lie">${tw(T.lo, "-17,-3.5 -19.8,-5 -21.2,-2.8 -19.6,0 -17,0")}</g>`,
  } : {
    stand: `<g data-tail="stand">${tw(T.lo, "-14,-16 -15.5,-21.5 -21.8,-25 -19.2,-19")}<g data-tj="1">${tw(T.mid, "-19.5,-19.5 -21.5,-24.5 -24.2,-31 -20.3,-28.6")}${C.pat === "tabby" ? tw(C.mark ?? C.deep, "-21.9,-26.4 -22.7,-28.3 -20.3,-26.7 -20,-24.6") : ""}<g data-tj="2">${tw(tabbyTip, "-20.5,-29 -24,-30.5 -22.5,-36 -19.5,-33.5")}</g></g></g>`,
    sit: `<g data-tail="sit">${tw(P === C ? C.hi : P.mid, "-14,-4 -6,-3.4 5,-3.4 11,-6 14,-4.5 10.5,0 -6,0 -13.5,-0.5")}${C.pat === "tabby" ? tw(C.mark ?? C.deep, "11,-6 14,-4.5 10.5,0 9.5,-3.6") : ""}</g>`,
    lie: `<g data-tail="lie">${tw(T.lo, "-17,-3.5 -23,-3 -27,-5 -28,-2.5 -25,0 -17,0")}${C.pat === "tabby" ? tw(C.mark ?? C.deep, "-27,-5 -28,-2.5 -25,0 -25.3,-3.4") : ""}</g>`,
  };
  const ruff = (pts: string) => B.ruff ? poly(C.cream, pts, "", 1.8) : "";
  const bare = (pts: string) => B.bare ? poly(C.lo, pts, "", .2) : ""; // 毛のない肌のしわ
  const [face, jowl, muzzle, nose] = FACE[B.face ?? "normal"];
  const ek = B.ear ?? 1;
  // 耳。三毛は片耳が茶、ポイント柄は濃い色
  const farEar = B.fold ? poly(P.lo, "12,-29.6 13.4,-32.4 16.2,-31.2") : poly(P.lo, "11.5,-29 12,-35.5 16.5,-31.5");
  const nearEar = B.fold
    ? poly(T === C ? C.mid : T.mid, "15.4,-31.6 18.6,-33.6 21,-31 19.6,-30") + poly(C.deep, "17.4,-32.3 19.4,-33 19.8,-31.6")
    : poly(T === C ? C.mid : T.mid, "15.2,-31.8 19.2,-37 21.4,-30.3") + poly(C.pat === "point" ? P.deep : B.bare ? C.lo : C.deep, "16.8,-31.6 19.2,-35.2 20.3,-31.1")
      + (B.tuft ? poly(C.deep, "18.9,-36.6 19.3,-40.2 19.7,-36.4", "", .3) : "");
  const out = `
<g class="cat-neck">${poly(C.hi, "")}${poly(C.mid, "")}</g>
<g class="pose p-stand">
  ${tails.stand}
  ${limb("ff", [P.deep, P.deep, P.deep, P.deep, P.lo])}
  ${limb("fh", [P.deep, P.deep, P.deep, P.lo])}
  ${poly(C.mid, "-17.5,-16 12.5,-16 10,-12 0,-10.5 -11,-11 -15.5,-13")}
  ${poly(C.hi, "-17.5,-16 -14,-21.5 -3,-23 7,-22.5 13,-19 12.5,-16")}
  ${poly(C.cream, "13,-19 14.5,-16 10,-12 12.5,-16")}
  ${poly(C.lo, "-18,-15 -14,-20 -7,-16.5 -7.5,-11 -12.5,-9 -16.5,-11")}
  ${pattern(C, "stand")}
  <polygon class="sheen" points="-14,-20.6 -3,-22.4 7,-22 10.5,-20.4 3,-21 -4,-21.2 -12,-19.8"/>
  ${ruff("10.5,-22.5 14.6,-19.2 14,-13.5 10.6,-13.2")}
  ${B.long ? poly(C.lo, "-10,-11.6 0,-11 8.5,-12.6 4,-9.6 -3,-9.4 -8,-9.8", "", 1.2) : ""}
  ${bare("4,-21.6 8,-20.8 8,-20.4 4,-21.2") + bare("-2,-21.8 1.5,-21 1.5,-20.6 -2,-21.4")}
  ${limb("nf", [P.mid, P.mid, P.lo, P.lo, P === C ? C.hi : P.mid])}
  ${limb("nh", [P === C ? C.mid : C.lo, P.lo, P.lo, P === C ? C.hi : P.mid])}
</g>
<g class="pose p-sit">
  ${poly(P.deep, "2,-16 5,-16 5.5,0 2.5,0")}
  ${poly(C.mid, "-11,0 -13,-7 -10,-15 -3,-23 3,-30 10,-30 10,-19 7.5,-12 6,0")}
  ${poly(C.hi, "-13,-7 -10,-15 -3,-23 3,-30 1,-19 -6,-12")}
  ${poly(C.cream, "10,-28 11,-21 8,-14 7.5,-20")}
  ${poly(C.lo, "-15,0 -15.5,-5 -13,-10.5 -8,-13.5 -3.5,-12 -1,-7 -1.5,-2.5 1,0")}
  ${poly(C.mid, "-13,-10.5 -8,-13.5 -3.5,-12 -8,-9.5")}
  ${pattern(C, "sit")}
  <polygon class="sheen" points="-10.5,-14.2 -3,-22.4 2.4,-28.6 1,-24 -4.5,-17.5 -9,-12.6"/>
  ${ruff("3.5,-28.5 10.5,-28 11,-18.5 6,-16.5")}
  ${leg("sf", P === C ? C.hi : P.mid, "5,-19 8.5,-19 8.5,-1 10,0 5,0")}
  ${poly(P.mid, "-2,-2.5 3,-2.5 3.5,0 -2,0")}
  ${tails.sit}
</g>
<g class="pose p-lie">
  ${tails.lie}
  ${poly(C.mid, "-19.5,0 -19.5,-7 -14,-13 -4,-15.5 6,-15 11.5,-12 12.5,-5 11,0")}
  ${poly(C.hi, "-19.5,-7 -14,-13 -4,-15.5 6,-15 2,-11 -10,-9.5")}
  ${poly(C.cream, "11.5,-12 13.5,-8 12.5,-4")}
  ${poly(C.lo, "-19.5,0 -18.5,-7 -12.5,-10.5 -6,-7.5 -6,-2 -3,0")}
  ${pattern(C, "lie")}
  <polygon class="sheen" points="-15,-11.8 -4,-15 5.5,-14.6 -2,-13.8 -12,-11.2"/>
  ${ruff("8.5,-15 12.8,-12.2 13,-6 9,-7.5")}
  ${leg("lf", P === C ? C.hi : P.mid, "8,-3.2 15,-3.2 16.5,0 8,0")}
</g>
<g class="cat-head">
  <g data-ear="f">${scaled(ek, 14, -30.3, farEar)}</g>
  ${poly(C.hi, face, "", B.long ? 1.3 : .5)}
  ${poly(C.mid, jowl)}
  ${C.pat === "point" ? poly(P.mid, "16.2,-29.6 20.4,-30.8 22.8,-28 23.6,-25.8 22,-22.6 18.4,-21.4 16,-24.4") : ""}
  ${C.pat === "calico" && C.pt ? poly(C.pt.mid, "11.6,-30.3 15.8,-32.2 17.4,-29.6 15,-26.6 11.2,-26.4") : ""}
  ${C.pat === "tabby" ? quad(C.mark ?? C.deep, [[15.4, -32], [16.1, -32.1], [16.4, -29.6], [15.8, -29.5]]) + quad(C.mark ?? C.deep, [[17.2, -32], [17.9, -31.8], [17.6, -29.6], [17, -29.7]]) + quad(C.mark ?? C.deep, [[13.2, -25.6], [16.6, -24.8], [16.5, -24.2], [13.4, -24.9]]) : ""}
  ${bare("14.4,-30.6 18.2,-31 18.2,-30.6 14.4,-30.2") + bare("14.8,-29.6 17.6,-29.9 17.6,-29.5 14.8,-29.2")}
  ${poly(C.pat === "point" ? P.lo : C.cream, muzzle)}
  ${poly(C.pat === "point" ? P.deep : B.bare ? C.lo : C.deep, nose)}
  <g data-ear="n">${scaled(ek, 18.3, -31, nearEar)}</g>
  ${poly(C.ink, "17.9,-28.6 19.7,-28.9 20.3,-27.6 18.4,-27.3", "eye-o")}
  ${poly(C.pat === "point" ? P.deep : C.deep, "17.6,-27.9 19,-27 20.5,-27.9 19,-27.4", "eye-c")}
  <polygon class="cat-mouth" fill="#4a2027" visibility="hidden"/><polygon class="cat-jaw" fill="${C.cream}" stroke="${C.cream}" stroke-width=".4" stroke-linejoin="round" visibility="hidden"/>
  <g class="cat-acc">${C.stray ? "" : accArt(C.acc)}</g>
</g>`;
  FUR = 0;
  return out;
}

// 姿勢ごとの頭の位置 [dx, dy, 傾き°]。頭の中心 (17,-27)・首 (13,-21) を基準に
const HEAD: Record<Pose | "sleep", [number, number, number]> = {
  stand: [0, 0, 0], sit: [-8, -8, -4], lie: [-2, 8, 0], sleep: [-4, 12.5, 16],
};
const PIVOT: Record<string, [number, number]> = { lf: [9, -1.6], ff: [7, -14], fh: [-11, -12], nf: [9, -15], nh: [-11, -11], sf: [7, -18] };
const TAIL: Record<Pose, [number, number]> = { stand: [-15, -18], sit: [-12, -2], lie: [-17, -2] };


interface Cat {
  m: Motion;                   // 動きの個性
  sp: { look: { x: number; v: number }; tail: { x: number; v: number }[]; ear: { x: number; v: number }; lean: { x: number; v: number } }; // 追従するばね
  morph?: { t: number; down: boolean }; // 姿勢が変わった時刻と向き（座る・伏せるなら down）
  settleT: number;
  flee?: number;               // 逃げる相手（カーソル）の x。びくっとした直後に走り出す
  fleeRoll: number;            // 最後に「逃げるか」を決めた時刻（同じ近づき方で何度も決めない）
  waryT: number;               // この時刻まで、離れた所からカーソルの様子をうかがう             // 歩き終えて止まった時刻（体が少し前へ流れてから戻る）
  grid: HTMLElement; layer: HTMLElement; el: HTMLElement; flip: SVGGElement; body: SVGGElement; head: SVGGElement;
  neck: SVGPolygonElement[];
  legs: Map<string, SVGGElement>; limbs: Map<Limb, SVGGElement>; gw: number; tails: Map<string, SVGGElement>; zs: HTMLElement[];
  plats: Plat[]; cur?: Plat; x: number; y: number; dir: 1 | -1; state: State; pose: Pose; left: number; t: number; st: number;
  // 移動（歩き・跳び・落下）の始点と終点
  from: [number, number]; to: [number, number]; dest?: Plat; air: number;
  // 跳び: 溜めの長さ・お尻を振る長さ・踏み切りの縦の速さ。着地で受け止める残り時間と深さ
  prep: number; wig: number; vy0: number; land: number; landT: number; landD: number;
  mouse?: [number, number]; look: number; back: boolean; phase: number; raf: number; lastMeasure: number; last: number;
  reduced: boolean; off: () => void;
  p: Persona; s: number;       // 性格と、見た目の倍率
  after?: () => void;          // 歩き・跳びが終わったときに続けること
  run: boolean;                // 走っている
  with?: Cat;                  // いっしょに何かしている相手
  chase?: { role: "runner" | "chaser"; other: Cat; until: number; tries: number };
  fetch?: { key: string; art: string; carrying: boolean; tries: number; play?: boolean }; // くわえて運んでいるアルバム（play なら届けたら再生する）
  carry: HTMLElement;          // 口にくわえたジャケット
  tag: HTMLElement;            // 名札（カーソルを乗せると出る）
  entering?: boolean; leaving?: boolean; // 画面の外から来る・帰る途中（足場に収めない）
  coat: Coat;                  // 毛並み（お気に入りのアルバムもここに覚える）
  favNap?: boolean;            // お気に入りの前に着いて、これから丸くなる
  dur: number;                 // いまの状態の長さ（伸び・あくびなど、進み具合で形が決まるもの用）
  woke: boolean;               // 起きたばかり（立ち上がるときに伸びをする）
  tj: SVGGElement[]; ears: SVGGElement[]; mouth: SVGPolygonElement[]; closed: boolean;
  blinkAt: number; blinkLen: number; slowAt: number; // まばたき（ゆっくりまばたきは猫のあいさつ）
  earT: number; earNext: number; earWhich: number; earBase: number; // 耳のピクつき
  twT: number; twNext: number; // 眠っている間のピクつき（夢）
  talkT: number;               // 寝言を言った時刻
  zoom?: number;               // 夜の運動会: 走り回るのをやめる時刻
  held?: { px: number; py: number; sx: number; sy: number; sway: number; ok: number }; // 抱っこ: 手の位置・遅れてついてくる位置・揺れ・我慢できる時間
  pets: number[]; patience: number; // 撫でられた時刻。我慢できる回数を超えると怒る
  huntCool: number;            // カーソルを狩りたくなるまでの間
  bond: Map<Cat, number>;      // ほかの猫との仲の良さ（0〜1）。いっしょに過ごすほど深まる
  greeted: Map<Cat, number>;   // 最後に鼻であいさつした時刻
  cont?: () => void;           // あいさつのあとに続けること
  hunger: number;              // お腹の空き具合（0〜1）。0.75 を超えるとごはんへ行く
  gs: { mode: number; from: number; until: number }; // 自分の毛づくろいの段取り（0: 前脚を舐める 1: 顔を洗う 2: 肩を舐める）
  stage?: { sleep: number; pup?: Pup };
  toy?: { el: HTMLElement; until: number; n: number }; // 遊んでいるおもちゃ（[data-cat-toy]）。n は続けて叩いた回数
  napAcc?: number;             // 棚板で眠った秒数（跡を残すためにためておく）   // 起動画面の猫: ホームの外で、決まった段取り（眠る → あくび → 起きる）だけをする
}
let pointerAt = 0;             // カーソルが最後に動いた時刻

// 一日のリズム: 猫は薄明薄暮性。明け方と夕方に活発になり、昼過ぎと深夜はよく眠る
function activity(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const peak = (c: number) => Math.exp(-((h - c) ** 2) / 2.5);
  // 静かな曲が流れていると、みんなおとなしくなる
  return (.85 + .55 * Math.max(peak(6), peak(18.5)) - .25 * Math.max(peak(14), peak(2) + peak(26))) * (1 - .45 * ear.calm);
}
const cats: Cat[] = [];

function measure(c: Cat): Plat[] {
  const g = c.grid.getBoundingClientRect();
  if (c.stage?.pup) return pupPlats(c.grid);
  if (c.stage) return [{ el: c.grid, kind: "floor", y: g.height - 4, x0: 0, x1: g.width, pull: 1 }]; // 起動画面: 床だけ
  const out: Plat[] = [];
  // 棚板の厚みは棚の素材で変わる（--board）
  const board = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--board")) || 11;
  for (const m of c.grid.querySelectorAll(".mod")) {
    const r = m.getBoundingClientRect();
    if (r.width < HALF * 2 + 30 || r.height < 20) continue;
    const x0 = r.left - g.left, x1 = r.right - g.left;
    // モジュールの上。再生中・レコードの上は音が鳴っていると温かい。時計の上も好き
    const top = r.top - g.top;
    if (top > 40 * c.s) {
      const pull = m.matches(".mod-player") ? (music ? 2.2 : 1.1) : m.matches(".mod-clock") ? 1.4 : m.matches(".mod-shelf") ? .7 : .9;
      out.push({ el: m, kind: "top", y: top, x0: x0 + 4, x1: x1 - 4, pull });
    }
    if (m.matches(".mod-shelf")) out.push({ el: m, kind: "shelf", y: r.bottom - g.top - board, x0: x0 + 11, x1: x1 - 11, pull: 1 });
    // 窓辺: 窓の下の桟に座って外を眺める
    const w = m.matches(".mod-window") ? m.querySelector(".win") : null;
    if (w) {
      const wr = w.getBoundingClientRect();
      if (wr.width > HALF * 2 + 16) out.push({ el: w, kind: "sill", y: wr.bottom - g.top - 8, x0: wr.left - g.left + 6, x1: wr.right - g.left - 6, pull: 2.6 });
    }
  }
  // 猫の家具（キャットタワーの段・ベッド・爪とぎ・床板）。高い段ほど好き
  // 箱と紙袋は大好き（中に入ると縁から下が隠れる。rim はその縁の高さ）
  const PULL: Partial<Record<Plat["kind"], number>> = { perch: 1.9, bed: 1.5, pad: .8, deck: .6, box: 2.6 };
  for (const e of c.grid.querySelectorAll<HTMLElement>("[data-cat-plat]")) {
    const r = e.getBoundingClientRect(), kind = e.dataset.catPlat as Plat["kind"];
    if (r.width < (kind === "perch" ? 28 : 40) || !(kind in PULL)) continue; // 高い段は細くても乗れる（キャットウォーク）
    out.push({ el: e, kind, y: r.top - g.top + Number(e.dataset.sink ?? 0), x0: r.left - g.left + 2, x1: r.right - g.left - 2, pull: PULL[kind]!, rim: kind === "box" ? r.top - g.top : undefined });
  }
  // 床（部屋の床を敷いているときは、その面の奥寄りに立つ）
  const floorH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--floor-h")) || 0;
  out.push({ el: c.grid, kind: "floor", y: g.height - floorH * .55, x0: 0, x1: g.width, pull: .3 });
  return out;
}

// 立っている棚の範囲で x を収める
// 箱の中では真ん中に収まる
const lo = (p: Plat) => p.kind === "box" ? (p.x0 + p.x1) / 2 : p.x0 + HALF;
const hi = (p: Plat) => p.kind === "box" ? (p.x0 + p.x1) / 2 : Math.max(p.x0 + HALF, p.x1 - HALF);

function refresh(c: Cat) {
  if (!c.grid.isConnected && !c.stage) {
    const g = document.querySelector<HTMLElement>(".grid");
    if (g) c.grid = g;
  }
  if (c.layer.parentElement !== c.grid) c.grid.append(c.layer);
  // ホームが隠れている間（ライブラリを開いているときなど）は大きさが 0 になるので測らない。
  // 測ると足場が全部消えたように見え、猫が一斉に床の同じ場所へ落ちてしまう
  const gr = c.grid.getBoundingClientRect();
  if (!gr.width || !gr.height) return;
  c.plats = measure(c);
  if (c.entering || c.leaving || c.state === "held") return;
  if (c.state === "jump" || c.state === "fall") {
    const d = c.plats.find(p => samePlat(p, c.dest));
    if (d) { c.dest = d; c.to[1] = d.y; }
    return;
  }
  if (!c.cur && c.stage?.pup) {
    const pp = c.stage.pup, p = c.plats[clamp(pp.plat, 0, c.plats.length - 1)] ?? c.plats[c.plats.length - 1];
    const tx = clamp(p.x0 + pp.fx * (p.x1 - p.x0), lo(p), hi(p));
    if (pp.enter && !c.reduced) {
      // 部屋に入ってきた猫: 見えている範囲の上から、決まった足場へ飛び込んでくる
      pp.enter = false;
      const v = view(c);
      c.cur = undefined; c.dest = p; c.x = clamp(tx - rnd(40, 90) * (Math.random() < .5 ? -1 : 1), 0, v.w);
      c.y = Math.min(v.top, p.y) - 50 * c.s; c.dir = tx < c.x ? -1 : 1;
      launch(c, tx, p.y, 0, 0); go(c, "fall");
      c.entering = true;
      c.after = () => { c.entering = false; if (pp.later) pupGo(c, pp.plat, pp.fx); else pupRest(c); };
      return;
    }
    c.cur = p; c.x = tx; c.y = p.y;
    pupRest(c);
    return;
  }
  if (!c.cur && c.stage) {
    // 起動画面: 真ん中で丸くなって眠っている（もう起きている時間なら座っている）
    const p = c.plats[0];
    c.cur = p; c.x = (p.x0 + p.x1) / 2; c.y = p.y; c.dir = 1;
    if (c.stage.sleep > 0 && !c.reduced) go(c, "sleep", c.stage.sleep); else go(c, "sit", rnd(4, 8));
    return;
  }
  if (!c.cur) {
    // 最初は画面に見えている棚のどれかに置く
    const vis = c.plats.filter(p => p.el !== c.grid && p.el.getBoundingClientRect().bottom < innerHeight && p.el.getBoundingClientRect().bottom > 40);
    const p = vis[Math.floor(Math.random() * vis.length)] ?? c.plats[c.plats.length - 1];
    c.cur = p; c.x = rnd(lo(p), hi(p)); c.y = p.y;
    go(c, Math.random() < .5 ? "sleep" : "sit");
    return;
  }
  const same = c.plats.find(p => samePlat(p, c.cur));
  // 部屋の猫: 画面の大きさが変わっても、同じ足場の同じ割合の所にいる（落ちない）
  if (same && c.stage?.pup) {
    c.cur = same; c.y = same.y;
    const want = clamp(same.x0 + c.stage.pup.fx * (same.x1 - same.x0), lo(same), hi(same));
    if (c.state === "walk") c.to[0] = clamp(c.to[0], lo(same), hi(same)); else c.x = want;
    return;
  }
  if (same && Math.abs(same.y - c.y) < 30 && c.x >= same.x0 && c.x <= same.x1) {
    c.cur = same; c.y = same.y; c.x = clamp(c.x, lo(same), hi(same));
    if (c.state === "walk") c.to[0] = clamp(c.to[0], lo(same), hi(same));
  } else drop(c);
}

// 足場が消えたら真下のいちばん近い棚（なければ床）へ落ちる。下に何もなければ上の棚へ跳び上がる
function drop(c: Cat) {
  const under = c.plats.filter(p => c.x >= p.x0 && c.x <= p.x1);
  const below = under.filter(p => p.y >= c.y - 2).sort((a, b) => a.y - b.y);
  const p = below[0] ?? under.sort((a, b) => b.y - a.y)[0] ?? c.plats[c.plats.length - 1];
  const tx = clamp(c.x, lo(p), hi(p));
  if (c.reduced || Math.abs(p.y - c.y) < 4) { c.cur = p; c.x = tx; c.y = p.y; if (c.state === "walk") go(c, "stand"); return; }
  if (p.y < c.y) return leap(c, p, tx);
  c.dest = p; c.cur = undefined;
  launch(c, tx, p.y, 0, .12);
  go(c, "fall");
}

/** 放物線の跳び（落下も含む）を本物の重力で組み立てる。clear は着地点・出発点より上へ上がる高さ */
function launch(c: Cat, tx: number, ty: number, clear: number, prep: number, wig = 0) {
  c.from = [c.x, c.y]; c.to = [tx, ty];
  const ya = Math.min(c.y, ty) - clear;
  const tu = Math.sqrt(2 * Math.max(0, c.y - ya) / GRAV), td = Math.sqrt(2 * Math.max(0, ty - ya) / GRAV);
  c.vy0 = -GRAV * tu; c.air = Math.max(.14, tu + td); c.prep = prep; c.wig = wig;
}

// 跳ぶ: 身を沈めて狙いを定める溜め → 一瞬で踏み切る → 重力どおりの放物線 → 前脚から着地して受け止める。
// 上へ跳ぶときは着地点より少しだけ高く上がる。高いところへ跳ぶほど溜めが長く、ときどきお尻を振る
function leap(c: Cat, p: Plat, tx: number, after?: () => void, force?: { prep: number; wig: number }) {
  const run = c.run, up = c.y - p.y, dx = Math.abs(tx - c.x);
  c.dest = p; c.cur = undefined;
  if (dx > 4) c.dir = tx < c.x ? -1 : 1;
  const clear = (up > 0 ? 9 : 5) * c.s + dx * .06;
  const prep = run ? .09 : clamp(.3 + Math.max(0, up) / 420, .3, .7) * (1.25 - .5 * c.p.energy);
  const wig = !run && up > 70 && Math.random() < .35 + .4 * c.p.playful ? rnd(.35, .6) : 0;
  if (force) launch(c, tx, p.y, clear * .7, force.prep + force.wig, force.wig);
  else launch(c, tx, p.y, clear, prep + wig, wig);
  go(c, "jump");
  c.after = after;
}

// 今の足場の中で x まで歩く（run なら走る）。着いたら after
function walkTo(c: Cat, x: number, after?: () => void, run = false) {
  const p = c.cur!;
  const tx = clamp(x, lo(p), hi(p));
  c.from = [c.x, c.y]; c.to = [tx, c.y];
  if (Math.abs(tx - c.x) > 1) c.dir = tx < c.x ? -1 : 1;
  go(c, "walk");
  c.after = after; c.run = run || !!c.fetch?.play; // 頼まれた 1 枚を運ぶときは小走り
}

// 足場 p の、x に近い所へ一跳びで届くか。届くなら着地点
function reach(c: Cat, p: Plat, x: number): number | undefined {
  if (!c.cur || samePlat(p, c.cur) || Math.abs(p.y - c.y) > REACH_Y) return undefined;
  const a = Math.max(lo(p), c.x - REACH_X), b = Math.min(hi(p), c.x + REACH_X);
  if (b < a) return undefined;
  // 同じ高さの足場は、隣り合っていて横に跳び移るときだけ
  if (Math.abs(p.y - c.y) < 6 && p.x0 < c.cur.x1 && p.x1 > c.cur.x0) return undefined;
  return clamp(x, a, b);
}

// 跳び移る先を、足場の好みと猫の好奇心で重みをつけて選ぶ。avoid の近くは避ける（追いかけっこで逃げるとき）
function jumpTarget(c: Cat, avoid?: number): [Plat, number] | undefined {
  const opts: [Plat, number, number][] = [];
  for (const p of c.plats) {
    const x = reach(c, p, rnd(lo(p), hi(p)));
    if (x === undefined) continue;
    let w = p.pull * (1 + c.p.curious * Math.abs(p.y - c.y) / REACH_Y);
    if (p.kind === "sill" && (new Date().getHours() < 6 || new Date().getHours() > 18)) w *= .6;
    if (avoid !== undefined && Math.abs(x - avoid) < 120) w *= .2;
    if (p.kind === "box" && occupied(c, p)) w *= .05; // 先客のいる箱には、まず入らない
    opts.push([p, x, w]);
  }
  let r = Math.random() * opts.reduce((n, o) => n + o[2], 0);
  for (const o of opts) if ((r -= o[2]) <= 0) return [o[0], o[1]];
  return undefined;
}

function go(c: Cat, s: State, dur?: number) {
  c.state = s; c.st = 0; c.after = undefined;
  if (s !== "walk") c.run = false;
  const D: Record<State, [number, number]> = {
    stand: [2, 5], sit: [6, 14], lie: [8, 16], sleep: [25, 60], purr: [3.5, 4.5], walk: [99, 99], jump: [99, 99], fall: [99, 99],
    groom: [6, 10], groomed: [6, 10], play: [4, 7], poke: [1.4, 2.2],
    stretch: [2.6, 3.4], yawn: [1.7, 2.3], selfgroom: [5, 11], stalk: [1.4, 3.2], annoyed: [1.4, 2], chatter: [2, 4],
    eat: [6, 11], scratch: [3, 6], greet: [1.2, 1.6], flinch: [.9, 1.3], watch: [5, 9], held: [999, 999],
  };
  // 性格と時間帯で長さを変える: 眠たがりはよく眠り、元気な子はじっとしていない
  const a = activity();
  const k = s === "sleep" ? (.5 + c.p.sleepy * 1.1) / a * (1 + ear.calm) : s === "sit" || s === "lie" || s === "stand" ? (1.35 - .7 * clamp(c.p.energy * a, 0, 1)) / Math.sqrt(a) : 1;
  c.left = c.dur = dur ?? rnd(...D[s]) * k;
  const POSE: Partial<Record<State, Pose>> = { sit: "sit", purr: "sit", groom: "sit", selfgroom: "sit", annoyed: "sit", chatter: "sit", watch: "sit", lie: "lie", sleep: "lie", groomed: "lie" };
  const prevPose = c.pose;
  if (s !== "yawn" && s !== "flinch") c.pose = POSE[s] ?? "stand";
  // 姿勢が変わったら、体重が乗って沈む（座る・伏せる）か、伸び上がって少し行き過ぎる（立つ）
  const RANK: Record<Pose, number> = { lie: 0, sit: 1, stand: 2 };
  if (c.pose !== prevPose && s !== "jump" && s !== "fall" && s !== "held") c.morph = { t: c.t, down: RANK[c.pose] < RANK[prevPose] }; // あくび・びくっは今の姿勢のまま
  if (s === "yawn" && !c.stage) { if (caught.has(c)) caught.delete(c); else spreadYawn(c); }
  if (s === "selfgroom") c.gs = { mode: Math.random() < .6 ? 0 : 2, from: 0, until: rnd(1.4, 2.4) };
  c.el.dataset.pose = c.pose;
  c.el.classList.toggle("sleeping", s === "sleep");
}

// 次に何をするか。落ち着いた猫なので、たいていは座るか寝る
function next(c: Cat): void {
  if (c.stage) return stageNext(c);
  const r = Math.random(), p = c.cur!, P = c.p, E = clamp(P.energy * activity(), 0, 1);
  if (c.reduced) {
    const m: Partial<Record<State, State>> = { sit: r < .5 ? "lie" : "sit", lie: "sleep", sleep: "sit" };
    release(c);
    return go(c, m[c.state] ?? "sit");
  }
  if (c.chase) return chaseStep(c);
  if (c.fetch) return fetchStep(c);
  if (c.zoom) return zoomStep(c);
  if (c.flee !== undefined && c.state === "flinch") return fleeRun(c);
  switch (c.state) {
    case "groom": return endGroom(c);
    case "groomed": {
      shine(c, .01);
      if (c.with?.state === "groom" && c.with.with === c) return go(c, "groomed", 1);
      release(c);
      return go(c, Math.random() < .5 + P.sleepy * .4 ? "sleep" : "lie");
    }
    case "play": return endPlay(c);
    case "poke": return c.toy ? endToy(c) : endPoke(c);
    case "stalk": return pounce(c);
    case "annoyed": return stalkOff(c);
    case "stretch": c.woke = false; return go(c, "stand", rnd(.8, 2));
    case "yawn": return go(c, c.pose === "lie" ? "lie" : c.pose === "sit" ? "sit" : "stand", rnd(2, 5));
    case "selfgroom": return go(c, Math.random() < .35 + P.sleepy * .3 ? "lie" : "sit");
    case "chatter": {
      // 窓の外に小鳥がいる間は見つめ続け、遊び好きな子はお尻を振ってガラス越しに跳びかかる
      if (bird && c.cur?.kind === "sill") {
        if (Math.random() < .3 * (.4 + P.playful)) return birdPounce(c);
        if (Math.random() < .6) { faceBird(c); return go(c, "chatter"); }
      }
      return go(c, "sit", rnd(2, 4));
    }
    case "watch": return go(c, Math.random() < .5 ? "sit" : "selfgroom");
    case "flinch": return go(c, c.pose === "lie" ? "lie" : c.pose === "sit" ? "sit" : "stand", rnd(1, 3));
    // 食べ終わったら口のまわりを舐めて、身づくろい
    case "greet": { const f = c.cont; c.cont = undefined; if (f) return f(); return go(c, c.with ? "stand" : "sit", c.with ? 2 : undefined); }
    case "eat": c.hunger = 0; if (eater === c) eater = undefined; return go(c, Math.random() < .65 ? "selfgroom" : "sit");
    case "scratch": return go(c, Math.random() < .5 ? "stand" : "sit", rnd(1, 3));
  }
  // お気に入りのアルバムの前に着いたら、そこで丸くなって眠る（流れていれば、まず喉を鳴らす）
  if (c.favNap && (c.state === "lie" || c.state === "purr" || c.state === "sit")) { c.favNap = false; return go(c, "sleep", rnd(40, 90) * (.6 + P.sleepy * .8)); }
  c.favNap = false;
  // ときどき、お気に入りのアルバムの前へ行く。そのアルバムが流れているときは、ずっと行きたがる
  if ((c.state === "stand" || c.state === "sit") && !c.with) {
    const fav = hooks?.favorite?.(c.coat), playing = !!fav && hooks?.nowPlaying?.() === fav;
    if (fav && Math.random() < (playing ? .45 : .05 + P.sleepy * .07) && goFavorite(c, fav, playing)) return;
  }
  // ごくまれに、よく聴くアルバムをくわえて「次に再生」へ運んでくる
  if ((c.state === "stand" || c.state === "sit") && !c.with && Math.random() < .01 * (.5 + c.p.curious) && startFetch(c)) return;
  // 静かな曲が流れていると、起きている子も横になりにいく
  if ((c.state === "stand" || c.state === "sit") && !c.with && ear.calm > .4 && Math.random() < ear.calm * .5) { if (!goBed(c)) go(c, "lie"); return; }
  // 家具: お腹が空いたらごはんへ。寝起きや気が向いたときは爪とぎへ。眠くなったらタワーのベッドへ。
  // タワーの段にいるときは、ぶら下がったぽんぽんを叩く
  if ((c.state === "stand" || c.state === "sit") && !c.with) {
    if (c.hunger > .75 && goEat(c)) return;
    if (Math.random() < .05 + (c.woke ? .3 : 0) * (c.state === "stand" ? 1 : 0) && goScratch(c)) { c.woke = false; return; }
    if (c.state === "sit" && Math.random() < .12 + P.sleepy * .2 && goBed(c)) return;
    if (p.kind === "perch" && Math.random() < .1 + P.playful * .25 && batToy(c)) return;
    // 床のおもちゃ（毛糸玉・ねずみ・ばね…）を見つけると、忍び寄って叩く。遊び好きな子ほどよく遊び、静かな曲ではあまり遊ばない
    if (Math.random() < (.04 + P.playful * .12) * activity() * (1 - .7 * ear.calm) && goToy(c)) return;
  }
  // 箱を見つけると入りたくなる。昼間は日の当たる所へ移って、ぬくぬくする
  if ((c.state === "stand" || c.state === "sit") && !c.with && p.kind !== "box" && Math.random() < .06 + P.curious * .1 && goBox(c)) return;
  if ((c.state === "stand" || c.state === "sit") && !c.with && !inSun(c) && Math.random() < .1 + P.sleepy * .15 && goSun(c)) return;
  // 床に敷いたラグの上は暖かい。床にいるときは、ラグの上へ行って横になる
  if ((c.state === "stand" || c.state === "sit") && !c.with && p.kind === "floor" && !onRug(c) && Math.random() < .12 + P.sleepy * .15 && goRug(c)) return;
  // 起きているときは、ときどきほかの猫に関わりにいく
  if ((c.state === "stand" || c.state === "sit" || (c.state === "lie" && r < .3)) && !c.with && Math.random() < .12 + P.social * .4 && social(c)) return;
  // 暖かい場所・窓辺では眠りやすい
  const cozy = p.kind === "sill" || p.kind === "box" || p.kind === "bed" || (p.kind === "top" && p.pull > 1.5) || inSun(c) || onRug(c);
  // 起きたばかりで立ち上がるときは、まず伸びをする
  if (c.state === "stand" && c.woke) { c.woke = false; if (Math.random() < .8) return go(c, "stretch"); }
  // 窓辺では外の鳥を見つけて、歯をカカカと鳴らす
  if ((c.state === "sit" || c.state === "stand") && p.kind === "sill" && Math.random() < .3) return go(c, "chatter");
  const up: State = c.woke && Math.random() < .8 ? "stretch" : "stand"; // 寝起きに立ち上がるなら伸びから
  switch (c.state) {
    case "stand":
      if (r < .15 + E * .3 && hi(p) - lo(p) > 40) {
        let tx = rnd(lo(p), hi(p));
        if (Math.abs(tx - c.x) < 30) tx = clamp(c.x + (tx < c.x ? -60 : 60), lo(p), hi(p));
        return walkTo(c, tx);
      }
      if (r < .3 + E * .25 + P.curious * .2) {
        const j = jumpTarget(c);
        if (j) return leap(c, j[0], j[1]);
      }
      return go(c, r < .82 - (cozy ? .3 : 0) - ear.calm * .35 ? "sit" : "lie");
    case "sit":
      if (Math.random() < .2) return go(c, "selfgroom"); // 座ったついでに身づくろい
      return go(c, r < .3 + (cozy ? .25 : 0) + P.sleepy * .15 + ear.calm * .35 ? "lie" : r < .75 ? up : "sit");
    // 静かな曲では、横になった子はそのまま眠ってしまう
    case "lie": return go(c, r < .4 + (cozy ? .2 : 0) + P.sleepy * .3 + ear.calm * .45 ? "sleep" : r < .8 ? "sit" : up);
    // 目が覚めたら、まずあくび。その後しばらくぼんやりしてから起き上がる
    case "sleep": c.woke = true; return Math.random() < .75 ? go(c, "yawn") : go(c, "lie", rnd(3, 6));
    case "purr": return go(c, Math.random() < .3 ? "selfgroom" : "sit");
    default: return go(c, "stand", rnd(1.5, 3));
  }
}

// 口: 口角を軸に下あごを開く。open は 0〜1
function drawMouth(c: Cat, open: number) {
  const [m, j] = c.mouth, vis = open > .03 ? "visible" : "hidden";
  m.setAttribute("visibility", vis); j.setAttribute("visibility", vis);
  if (vis === "hidden") return;
  const K: V = [19.6, -23.4], U: V = [23.4, -24.6], a = open * 42 * Math.PI / 180;
  const ux = (U[0] - K[0]) * .9, uy = (U[1] - K[1]) * .9;
  const L: V = [K[0] + ux * Math.cos(a) - uy * Math.sin(a), K[1] + ux * Math.sin(a) + uy * Math.cos(a)];
  const f = (...ps: V[]) => ps.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  m.setAttribute("points", f(K, U, [U[0] - .2, U[1] + .5], L));
  j.setAttribute("points", f(K, L, [L[0] - .6, L[1] + 1], [K[0] - .3, K[1] + 1.2]));
}

// 首: 胴の付け根から頭の付け根までを毎フレームつなぐ（胴と頭の後ろに描くので、すき間だけを埋める）。
// 胴側の付け根は姿勢ごと、頭側は頭と同じ変形をかけた点
const NECK: Record<Pose, [V, V]> = { stand: [[2, -21.2], [11.5, -15]], sit: [[.5, -26], [8, -19]], lie: [[1, -12.5], [9.5, -8]] };
const NECK_H: [V, V] = [[12, -27], [18, -21.6]]; // 頭の後ろ（うなじ）と喉
function drawNeck(c: Cat, tx: number, ty: number, deg: number) {
  const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
  const H = NECK_H.map(([x, y]): V => {
    if (c.back) x = 26 - x;
    const dx = x - 13, dy = y + 21;
    return [13 + dx * co - dy * si + tx, -21 + dx * si + dy * co + ty];
  });
  // 振り返っているときは、うなじと喉の前後が入れ替わる
  const [h1, h2] = H[0][0] <= H[1][0] ? H : [H[1], H[0]];
  const [b1, b2] = NECK[c.pose];
  const mid = (p: V, q: V): V => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const hm = mid(h1, h2), bm = mid(b1, b2), f = (...ps: V[]) => ps.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  c.neck[0].setAttribute("points", f(b1, h1, hm, bm));
  c.neck[1].setAttribute("points", f(bm, hm, h2, b2));
}

function tick(c: Cat, now: number) {
  if (c.stage && !c.layer.isConnected) { removeCat(c); return; } // 起動画面が片づいた
  if (held) { c.last = now; c.raf = requestAnimationFrame(n => tick(c, n)); return; }
  const dt = Math.min(.05, (now - c.last) / 1000);
  c.last = now; c.t += dt; c.st += dt;
  hearMusic(now);
  if (now - c.lastMeasure > 1000) { c.lastMeasure = now; refresh(c); }
  if (!c.cur && c.state !== "jump" && c.state !== "fall" && c.state !== "held") { c.raf = requestAnimationFrame(n => tick(c, n)); return; }

  const legA: Record<string, number> = { ff: 0, fh: 0, nf: 0, nh: 0, sf: 0, lf: 0 };
  let tilt = 0, sy = 1, bob = 0;
  const s = c.state;
  let air: number | undefined; // 跳んでいる間の進み具合（0〜1）
  let crouch = 0, launchU: number | undefined, wiggle = 0; // 溜めの深さ・踏み切りの進み・お尻振り
  let creep = false;           // 忍び寄りで前へ進んでいる
  let gb = 0, gtl = 0;         // 歩きで生まれる体の上下・前後の傾き（頭はこれを打ち消して水平を保つ）
  let hang = 0;                // 抱っこ: 脇の下を支えられて、体が縦にぶら下がる（1 で真下）
  if (s === "held") {
    // 持ち上げると、胸を手で支えられて縦に伸び、後ろ脚としっぽが下へ垂れる。手の動きに少し遅れて揺れる
    const h = c.held!;
    const lag = Math.min(1, dt * 14);
    h.sx += (h.px - h.sx) * lag; h.sy += (h.py - h.sy) * lag;
    h.sway += ((h.px - h.sx) * -.35 - h.sway) * Math.min(1, dt * 6);
    // 我慢できる時間を過ぎると、身をよじって降りようとする
    const squirm = clamp((c.st - h.ok) / 1.2, 0, 1);
    tilt = -62 + clamp(h.sway, -18, 18) + 8 * squirm * Math.sin(c.t * 9); hang = 1;
    const a = tilt * Math.PI / 180, X = 8, Y = -18 + 12; // 支えている胸（体の座標、回転の中心からの位置）
    c.x = h.sx - c.dir * (X * Math.cos(a) - Y * Math.sin(a)) * c.s;
    c.y = h.sy - ((X * Math.sin(a) + Y * Math.cos(a)) - 12) * c.s;
    if (squirm >= 1 && c.st - h.ok > 1.6) letGo(c);
  } else if (s === "walk") {
    // 歩き出しと止まりぎわはゆっくり。位相は進んだ距離から決めるので、肉球は地面で滑らない
    // 追いかける側は、同じ足場にいる相手のすぐ後ろを目指し続ける
    const ch = c.chase, o = ch?.other;
    if (ch?.role === "chaser" && o && samePlat(o.cur, c.cur) && o.state === "walk") {
      c.to[0] = clamp(o.x - Math.sign(o.x - c.x || 1) * 30 * c.s, lo(c.cur!), hi(c.cur!));
      if (Math.abs(c.to[0] - c.x) > 2) c.dir = c.to[0] < c.x ? -1 : 1;
    }
    const d = c.to[0] - c.x;
    const ease = c.run ? Math.min(1, .5 + c.st / .3) : Math.min(1, .3 + c.st / .6) * Math.min(1, .35 + Math.abs(d) / 30);
    // 歩き出しの溜め: 一拍、腰へ体重を移してから前へ踏み出す（間の長い子ほどゆっくり）
    const ant = c.run ? .05 : .16 * c.m.hold, pre = c.st < ant ? Math.sin(Math.PI * c.st / ant) : 0;
    const step = SPEED * c.p.speed * (.85 + .3 * c.p.energy) * (c.run ? RUN : 1) * ease * (c.st < ant ? .12 : 1) * dt, mv = Math.min(step, Math.abs(d));
    c.x += Math.sign(d) * mv;
    c.phase += mv / c.s / gaitOf(c.run, c.m).stride;
    c.gw = Math.min(1, c.gw + dt * 4);
    // 一歩に 2 回、体重を受けた脚の上で体が沈む。前脚と後ろ脚が交互に体を支えるので、肩と腰がかわるがわる上下する。
    // 重い子ほど大きく、走るとはっきり弾む
    const H = c.m.heave * (c.run ? 1.5 : 1) * c.gw;
    gb = -(c.run ? .7 : .25) * H * (1 - Math.cos(4 * Math.PI * c.phase)) / 2;
    gtl = .8 * H * Math.sin(4 * Math.PI * c.phase + .9);
    bob = gb; tilt += gtl - 2.4 * pre;
    if (Math.abs(d) <= step) {
      c.x = c.to[0];
      c.settleT = c.t; c.sp.lean.v = (c.run ? 70 : 34) * (.6 + .4 * c.m.heave); // 止まっても体は少し前へ流れ、ばねのように戻る
      const after = c.after;
      if (after) { go(c, "stand", 1); after(); } else next(c);
    }
  } else if (s === "jump" || s === "fall") {
    const [x0, y0] = c.from, [x1, y1] = c.to, L = s === "jump" ? LAUNCH : 0, t = c.st;
    const upward = y1 < y0 - 8;
    if (t < c.prep) {
      // 溜め: 跳ぶなら後ろ脚に体重を乗せて低く沈み、着地点を見る。落ちるなら縁から身を乗り出す
      crouch = s === "jump" ? smooth(Math.min(1, t / Math.min(.22, c.prep * .7))) : 0;
      if (s === "jump") {
        bob = 4.6 * crouch; sy = 1 - .05 * crouch; tilt = (upward ? -7 : 4) * crouch;
        // お尻を振って狙いを定める（溜めの後半、踏み切る直前に止める）
        const w0 = c.prep - c.wig - .06;
        if (c.wig && t > w0 && t < c.prep - .06) wiggle = Math.sin((t - w0) * 30) * Math.sin(Math.PI * (t - w0) / c.wig);
      } else tilt = 9 * smooth(t / Math.max(.01, c.prep));
    } else if (t < c.prep + L) {
      // 踏み切り: 一瞬で全身を伸ばす。後ろ脚は地面を蹴り、前脚が先に浮く
      launchU = smooth((t - c.prep) / L);
      bob = 4.6 - 8.6 * launchU; sy = .95 + .08 * launchU;
      tilt = (upward ? -7 - 14 * launchU : 4 + 6 * launchU);
    } else {
      // 空中: 横は等速、縦は重力どおり。体は進む向きに傾く
      const ft = t - c.prep - L, k = Math.min(1, ft / c.air), T = ft > c.air ? c.air : ft;
      const yEnd = y0 + c.vy0 * c.air + GRAV * c.air * c.air / 2;
      c.x = x0 + (x1 - x0) * k;
      c.y = y0 + c.vy0 * T + GRAV * T * T / 2 + (y1 - yEnd) * k;
      const vy = c.vy0 + GRAV * T, vx = Math.abs(x1 - x0) / c.air;
      tilt = clamp(Math.atan2(vy, vx + 120) * 180 / Math.PI * .6, -34, 34);
      bob = -4 * (1 - smooth(Math.min(1, ft / .1))); sy = 1 + .04 * (1 - k);
      air = k;
      if (k >= 1) {
        const after = c.after, drop = Math.max(0, y1 - Math.min(y0, y0 + c.vy0 * c.vy0 / (-2 * GRAV)));
        c.cur = c.dest; c.y = c.dest!.y;
        if (!c.stage && c.cur?.kind === "shelf") markClaw(c.cur.el, c.grid.getBoundingClientRect().left + c.x); // 跳び乗った所に爪あと
        // 着地: 前脚から降りて、膝と肘で衝撃を吸い込み、ゆっくり戻る
        c.landD = clamp(2.2 + drop / (28 * c.s), 2.2, 6.5) * c.m.sink; c.landT = (.2 + Math.min(.22, drop / 900)) * (.8 + .3 * c.m.sink); c.land = c.landT;
        go(c, "stand", c.run || after ? .12 : rnd(1.5, 3));
        if (after) after();
      }
    }
  } else {
    if (s === "stalk") {
      // 忍び寄り: 低く身を伏せたまま、獲物（カーソル）へじりじりと近づく。見失ったら早めに切り上げる
      if (prey(c)) {
        const d = target(c)![0] - c.x;
        c.dir = d < 0 ? -1 : 1;
        if (Math.abs(d) > 95 * c.s / S) {
          const mv = SPEED * .4 * c.p.speed * dt;
          c.x = clamp(c.x + Math.sign(d) * mv, lo(c.cur!), hi(c.cur!));
          c.phase += mv / c.s / STRIDE; creep = true;
        }
      } else c.left = Math.min(c.left, .5);
    }
    c.left -= dt;
    if (c.left <= 0) next(c);
  }
  // 棚板で眠ると、そこに毛と擦れが残る（数秒ごとにまとめて）
  if (s === "sleep" && c.cur?.kind === "shelf" && !c.stage) {
    c.napAcc = (c.napAcc ?? 0) + dt;
    if (c.napAcc > 10) { markNap(c.cur.el, c.grid.getBoundingClientRect().left + c.x, c.napAcc, c.coat.mid); c.napAcc = 0; }
  }
  c.hunger = Math.min(1, c.hunger + dt / 1500 * (s === "sleep" ? .5 : 1)); // 25 分ほどでお腹が空く
  if (creep) c.gw = Math.min(.8, c.gw + dt * 3);
  else if (s !== "walk") c.gw = Math.max(0, c.gw - dt * 3);
  // カーソルが足場の上で動くと、獲物に見えて忍び寄る（遊び好きほど乗りやすい）
  if (!c.reduced && !c.stage && (s === "stand" || s === "sit") && c.st > 1 && c.t > c.huntCool && (wand ? wand.speed > 60 : now - pointerAt < 150) && !c.with && !c.chase && !c.fetch && !c.entering && !c.leaving && prey(c)) {
    c.huntCool = c.t + rnd(5, 14);
    if (Math.random() < .25 + .6 * c.p.playful) { c.dir = target(c)![0] < c.x ? -1 : 1; go(c, "stalk"); }
  }
  // 猫じゃらし: 振られた羽根に跳びつく。真上なら垂直に跳び、別の足場の上なら跳び移ってから押さえる
  if (wand && !c.reduced && !c.stage && c.cur && (s === "stand" || s === "sit" || s === "lie") && c.st > .6 && c.t > c.huntCool && !c.with && !c.chase && !c.fetch && !c.entering && !c.leaving) wandPlay(c);
  // 着地の受け止め: すばやく沈んで、ゆっくり戻る。前脚が先についているので、はじめは少し前へ傾く
  if (c.land > 0 && s !== "jump" && s !== "fall") {
    c.land = Math.max(0, c.land - dt);
    const u = 1 - c.land / c.landT, f = u < .22 ? smooth(u / .22) : 1 - smooth((u - .22) / .78);
    bob += c.landD * f; tilt += 5 * (1 - smooth(Math.min(1, u * 2.5))) * Math.min(1, c.landD / 3);
  }
  // 止まったあとの余韻: 前へ流れた体がばねのように戻る（遊び好きな子は一度行き過ぎる）
  const lean = spring(c.sp.lean, 0, dt, c.m.snap * 1.3, c.m.bounce);
  if (c.pose === "stand" && s !== "walk" && Math.abs(lean) > .01) tilt += clamp(lean, -6, 6);
  // 伸び: 前半は前脚を前へ突き出し、胸を下げてお尻を高く（前伸び）。後半は体を前へ移して後ろ脚を片方ずつ後ろへ伸ばす
  const su = c.st / Math.max(.1, c.dur);
  const stF = c.state === "stretch" ? env(su, 0, .58) : 0, stH = c.state === "stretch" ? env(su, .5, 1) : 0;
  if (stF || stH) { tilt += 16 * stF - 5 * stH; bob += 1.6 * stF - .6 * stH; }
  // 忍び寄り: 胸もお腹も地面すれすれまで低くする
  if (c.state === "stalk") { bob += 5.4; sy *= .95; tilt -= 1.5; }
  // 爪とぎ: お尻を上げて胸を低く。食べるとき: 肘を曲げて頭を器へ下げる
  if (c.state === "scratch") { tilt += 13 + 1.5 * Math.sin(c.st * 2.6 * 2 * Math.PI); bob += 1.4; }
  if (c.state === "eat") { tilt += 7; bob += 2.4; }

  // 脚: 歩きの位相と立ち姿を混ぜ、跳んでいる間は前脚を伸ばし後ろ脚を蹴り出す
  if (c.pose === "stand") {
    const ground = -bob;
    for (const [k, g] of c.limbs) {
      const gt = gaitOf(c.run, c.m), [gp, sw] = gaitPaw(k, c.phase, c.run, c.m), r = REST[k];
      let paw: V = [r[0] + (gp[0] - r[0]) * c.gw, ground + gp[1] * c.gw], swing = sw * c.gw;
      const p = ((c.phase + gt.off[k]) % 1 + 1) % 1, push = c.gw * (p < gt.duty ? smooth(p / gt.duty) : 0);
      // じゃれる・ちょっかい: 前脚で相手をちょいちょいと叩く
      if ((s === "play" || s === "poke") && k[1] === "f") {
        const sp = Math.sin(c.st * (s === "poke" ? 7 : 6) + (k === "ff" ? Math.PI : 0));
        if (sp > .2 && (s === "play" || k === "nf")) { const u = (sp - .2) / .8 * c.m.reach; paw = [r[0] + 3 + 4 * u, ground - 7 * u]; swing = .6 * u; }
      }
      if (s === "scratch" && k[1] === "f") {
        // 爪とぎ: 前脚を交互に前へ伸ばし、爪を立てて手前へ引く
        const u = (c.st * 2.6 + (k === "ff" ? .5 : 0)) % 1;
        if (u < .65) { paw = [r[0] + 11 - 9 * (u / .65), ground]; swing = 0; }
        else { const q = (u - .65) / .35; paw = [r[0] + 2 + 9 * q, ground - 3 * Math.sin(Math.PI * q)]; swing = .5 * Math.sin(Math.PI * q); }
      } else if (s === "scratch") paw = [r[0] - 1.5, ground];
      if (s === "eat") paw = [r[0] + (k[1] === "f" ? 1 : -1.5), ground];
      if (stF || stH) {
        if (k[1] === "f") { paw = [r[0] + 10 * stF + 2.5 * stH, ground]; swing = 0; }
        else if (k === "nh") { paw = [r[0] - 1.5 * stF - 10 * stH, ground - 3 * stH]; swing = .25 * stH; }
        else paw = [r[0] - 1.5 * stF - 1.5 * stH, ground];
      }
      let pu = push;
      if (hang) {
        // 脚は重さで真下へ垂れる（体が傾いているので、体の座標では斜めになる）。身をよじると後ろ脚で宙をかく
        const a = tilt * Math.PI / 180, L = k[1] === "f" ? 12 : 13.5, kick = s === "held" && c.held && c.st > c.held.ok ? Math.sin(c.t * 11 + (k === "nh" ? 0 : 2)) * 3 : 0;
        const rt = ROOT[k as Limb];
        paw = [rt[0] + L * Math.sin(a) + (k[1] === "h" ? kick : 0), rt[1] + L * Math.cos(a)]; swing = 0; pu = 0;
      } else if (air !== undefined) {
        // 空中: 踏み切り直後は後ろ脚が後ろへ伸び前脚は胸にたたむ → 前脚を前へ伸ばす → 着地へ向けて前脚を下へ伸ばす
        const [x, y, w, q] = flight(k[1] === "f" ? FLY_F : FLY_H, air);
        paw = [r[0] + x, y]; swing = w; pu = q;
      } else if (launchU !== undefined) {
        paw = k[1] === "f" ? [r[0] + 3 * launchU, ground - 5 * launchU] : [r[0] - 2.5 * launchU, ground];
        swing = k[1] === "f" ? .6 * launchU : 0; pu = k[1] === "h" ? launchU : 0;
      } else if (s === "jump" || s === "fall") {
        // 溜め: 肉球は地面に残したまま体だけが沈む。お尻を振るときは後ろ脚で小さく足踏み
        paw = [r[0] + (k[1] === "h" ? (k === "nh" ? 1 : -1) * wiggle * .9 - 1.2 * crouch : .6 * crouch), ground - (k[1] === "h" ? Math.max(0, wiggle * (k === "nh" ? 1 : -1)) * .8 : 0)];
        swing = 0; pu = 0;
      }
      // 体が傾いていても、地面についた肉球は本当の地面に置く（体の座標に直す）
      if (air === undefined && !hang) paw = toLocal(paw, bob, tilt, sy);
      drawLimb(g, k, paw, swing, pu);
    }
  }
  // じゃれ合いは、ときどき身を低くしてから小さく跳ねる
  if (s === "play") bob = -Math.max(0, Math.sin(c.st * 3.3 + c.x)) * 3;
  // 呼吸: 眠っているときはゆっくり大きく、喉を鳴らすときは細かく震える
  if (c.state === "sleep") sy = 1 + .035 * c.m.sink * Math.sin(c.t * 2 * Math.PI / (3 * (.8 + .25 * c.m.sink))); // 大きな子ほどゆっくり深く
  else if (c.state === "lie") sy = 1 + .015 * Math.sin(c.t * 2 * Math.PI / 2.8);
  else if (c.state === "purr" || c.state === "groomed") sy = 1 + .008 * Math.sin(c.t * 55);
  // 夢: 眠っている間、ときどき体がピクッとし、しっぽの先が跳ねる
  if (c.state === "sleep" && c.t > c.twNext) {
    c.twT = c.t; c.twNext = c.t + rnd(6, 22);
    if (Math.random() < .6) { c.earT = c.t; c.earWhich = Math.random() < .5 ? 0 : 1; }
    // 寝言: ときどき口をもごもごさせて小さく鳴き、前脚で宙をかく（走る夢）
    if (Math.random() < .3 && !c.reduced) { c.talkT = c.t; say(c, SLEEPTALK[Math.floor(Math.random() * SLEEPTALK.length)]); }
  }
  const talk = c.state === "sleep" && c.t - c.talkT < 1.4 ? (c.t - c.talkT) / 1.4 : -1;
  if (talk >= 0) legA.lf = -16 * Math.max(0, Math.sin(talk * Math.PI * 5)) * (1 - talk);
  const tw = c.state === "sleep" && c.t - c.twT < .35 ? Math.sin(Math.PI * (c.t - c.twT) / .35) : 0;
  sy += .025 * tw;
  // 毛並みに逆らって撫でられた: 背中の皮がさざ波のように震える
  if (s === "flinch") { const u = c.st / c.dur; sy += .03 * Math.sin(c.st * 46) * Math.max(0, 1 - u * 1.4); }
  // 姿勢の切り替わり: 座る・伏せるときは体重が乗って一度沈み、立つときは伸び上がって少し行き過ぎてから落ち着く
  if (c.morph) {
    const u = (c.t - c.morph.t) / (.2 + .22 * c.m.hold);
    if (u > 2) c.morph = undefined;
    else {
      const d = Math.exp(-2.6 * u) * Math.cos(Math.PI * (1.1 + c.m.bounce) * u);
      if (c.morph.down) { sy *= 1 - .08 * c.m.sink * d; bob += 1.5 * c.m.sink * d; }
      else { sy *= 1 + .05 * d; bob -= 1.1 * d; }
    }
  }

  // カーソルが近ければそちらを見る（後ろなら振り返る）
  const [hx, hy, hr] = HEAD[c.state === "sleep" ? "sleep" : c.pose];
  let want = 0, back = false;
  const tm = target(c);
  const pupSw = c.stage?.pup?.emote === "groove" ? (beatSwing(c.p.curious * .3) || Math.cos(c.t * Math.PI * 2.2)) : 0; // 拍が拾えなければ、ゆったりした一定のリズム
  if (tm && (s === "stand" || s === "sit" || s === "lie" || s === "stalk" || s === "annoyed" || s === "flinch" || s === "purr")) {
    const fx = (tm[0] - (c.x + c.dir * (17 + hx) * c.s)) * c.dir, fy = tm[1] - (c.y + (-27 + hy) * c.s);
    if (c.stage?.pup || Math.hypot(fx, fy) < (wand ? 320 : 120)) {
      back = fx < -8;
      want = clamp(Math.atan2(fy, Math.abs(fx)) * 180 / Math.PI, -30, 25) * (back ? -1 : 1);
    }
  }
  // 毛づくろい: 相手の方へ首を傾け、舐めるように小刻みに動かす
  if (s === "groom") { want = 24 + 9 * Math.sin(c.st * 9); back = false; }
  if (c.fetch && !c.fetch.carrying && s === "sit") { want = 30; back = false; } // 背表紙をくわえようと首を下げる
  if ((s === "play" || s === "poke") && c.with) { want = 8; back = false; }
  // 自分の毛づくろい: 前脚を口元へ上げて舐める → その前脚で顔をこする → 振り向いて肩を舐める
  if (s === "selfgroom") {
    if (c.st > c.gs.until) c.gs = { mode: c.gs.mode === 0 ? (Math.random() < .7 ? 1 : 2) : c.gs.mode === 1 ? 0 : Math.random() < .5 ? 0 : 2, from: c.st, until: c.st + rnd(1.4, 2.6) };
    // 段取りの変わり目では前脚をいったん下ろす（舐める → 顔を洗うの間は上げたまま）
    const gk = c.gs.mode === 1 ? 1 : clamp(Math.min(c.st - c.gs.from, c.gs.until - c.st) * 3, 0, 1);
    if (c.gs.mode === 0) { legA.sf = -150 * gk; want = 20 + 7 * Math.sin(c.st * 11) * gk; }
    else if (c.gs.mode === 1) { legA.sf = (-158 + 16 * Math.sin(c.st * 4.5)) * gk; want = 24 + 10 * Math.sin(c.st * 4.5); }
    else { want = -(30 + 7 * Math.sin(c.st * 10)); back = true; } // 振り返った頭は裏返っているので、下を向くのは負の向き
  }
  // 撫ですぎて怒る: 最初にカーソルへ向かって前脚でぱしっと払う
  if (s === "annoyed" && c.st < .5) legA.sf = -75 * Math.sin(Math.PI * clamp((c.st - .1) / .3, 0, 1));
  // あくび: 頭を上げ、口を大きく開ける
  const yu = s === "yawn" ? c.st / c.dur : 0;
  const yawn = s === "yawn" ? smooth(Math.min(1, yu / .35)) * (1 - smooth(clamp((yu - .7) / .3, 0, 1))) : 0;
  if (yawn) { want = -18 * yawn; back = false; }
  if (stF) { want = -10 * stF; back = false; } // 伸びの間は前を見る
  // 窓の外の鳥を見上げて、あごを小刻みに鳴らす
  if (s === "chatter") { want = -24 + 2 * Math.sin(c.st * 3); back = false; }
  if (s === "greet") { want = 6; back = false; } // 首を伸ばして鼻を寄せる
  if (s === "held") { want = clamp(-tilt * .7, -20, 46); back = false; } // 体は縦でも、頭はなるべく起こしてまわりを見る
  if (s === "watch") { want = -13 + 3 * Math.sin(c.st * .7); back = false; }
  if (c.t < c.waryT && (s === "sit" || s === "lie") && tm && !wand) { // 離れた所から、カーソルをじっと見る
    const fx = (tm[0] - (c.x + c.dir * (17 + hx) * c.s)) * c.dir, fy = tm[1] - (c.y + (-27 + hy) * c.s);
    back = fx < -8; want = clamp(Math.atan2(fy, Math.abs(fx)) * 180 / Math.PI, -30, 25) * (back ? -1 : 1);
  }
  if (s === "eat") { want = 34 + 4 * Math.sin(c.st * 6); back = false; } // 器に頭を入れて、噛むたびに少し揺れる
  if (s === "scratch") { want = -6; back = false; }
  // 跳ぶ前は着地点をじっと見る
  if (s === "jump" && c.st < c.prep + LAUNCH) { const [x0, y0] = c.from, [x1, y1] = c.to; want = clamp(Math.atan2(y1 - y0, Math.abs(x1 - x0) + 20) * 180 / Math.PI * .6, -14, 16); back = false; }
  // 空中では体が傾いても、頭は少しだけ水平を保つ
  else if (air !== undefined) { want = clamp(-tilt * .25, -8, 8); back = false; }
  if (pupSw) want += 9 * pupSw; // リズムをとる: 拍に合わせて首を縦に振る
  if (back !== c.back) { c.back = back; c.look = 0; c.sp.look.x = 0; c.sp.look.v = 0; }
  // 頭の向き: ばねで追う。きびきびした子は素早く向き、遊び好きな子は少し行き過ぎてから戻る
  c.look = spring(c.sp.look, want, dt, c.m.snap * .9, c.m.bounce * .6);

  // しっぽ: 根元・中ほど・先の 3 節を少しずつ遅らせて曲げ、波のようにしならせる
  const T = c.t;
  let tj: [number, number, number];
  if (s === "play" || c.chase || c.run) tj = [12 * Math.sin(T * 6), 14 * Math.sin(T * 6 - .9), 18 * Math.sin(T * 6 - 1.8)];
  else if (s === "stalk") tj = [-62, 8, 10 + 22 * Math.sin(T * 9)]; // 低く伸ばして、先だけをピクピク
  else if (s === "scratch") tj = [8 + 6 * Math.sin(T * 3), 10, 16]; // 立てて、ご機嫌に
  else if (s === "eat") tj = [-30, 6 * Math.sin(T * 1.5), 12 + 6 * Math.sin(T * 1.5 - .8)];
  else if (stF || stH) tj = [-14 * stF + 8 * stH, 12 * stF, 18 * stF + 10 * stH];
  else if (s === "held") tj = [-48 + 6 * Math.sin(T * 1.3), 8, 6 + (c.held && c.st > c.held.ok ? 20 * Math.sin(T * 8) : 0)]; // 垂れたしっぽ。嫌になると先を振る
  else if (s === "greet") tj = [-6, 4, 26 + 4 * Math.sin(T * 3)]; // しっぽを立てて、先を曲げる（親しみのしるし）
  else if (s === "walk") tj = [-3 + 3 * Math.sin(T * 2.2), 6 + 5 * Math.sin(T * 2.2 - .8), 24 + 7 * Math.sin(T * 2.2 - 1.6)]; // 立てて、先をかぎ形に
  else tj = [5 * Math.sin(T * 1.1), 7 * Math.sin(T * 1.1 - .8), 10 * Math.sin(T * 1.1 - 1.6)];
  // 曲の拍に合わせて、しっぽをゆったり左右に振る。根元は小さく、先ほど大きく遅れてしなる。
  // 大きな音ほど、遊び好きな子ほどよく振る。眠っている・何かに夢中なときは振らない
  const groove = ["stand", "sit", "lie", "purr", "groomed"].includes(s) ? (.45 + .8 * c.p.playful) * (.5 + .7 * ear.loud) * (1 + .6 * nowLike(c)) : 0;
  const bs = (lag: number) => beatSwing(lag + c.p.curious * .3) * groove;
  if (groove && beatSwing() !== 0 && c.pose === "stand") tj = [7 * bs(0), 9 * bs(.45), 13 * bs(.9)];
  tj = [tj[0] * c.m.reach, tj[1] * c.m.reach, tj[2] * c.m.reach];
  let tailGoal = c.pose === "stand" ? tj[0]
    : s === "annoyed" ? -16 * Math.max(0, Math.sin(T * 7)) // 床にばたんばたんと打ちつける
    : s === "chatter" ? -5 * Math.max(0, Math.sin(T * 13))
    : s === "flinch" ? -12 * Math.max(0, Math.sin(T * 15)) // しっぽをぴしっと振る
    : s === "watch" || c.t < c.waryT ? -4 - 5 * Math.max(0, Math.sin(T * 5.5)) // 先だけをいらいらと打つ
    : groove && beatSwing() !== 0 ? (c.pose === "sit" ? -6 - 7 * bs(.6) : 6 * bs(.6)) // 座っていれば先を床から浮かせてトントン、寝そべっていれば先で拍をとる
    : s === "purr" ? Math.sin(T * 4) * 8 : s === "lie" ? Math.sin(T * .7) * 3 : s === "sleep" ? -14 * tw : 0;
  // 部屋の猫のしぐさ: しっぽを振る（ご機嫌に大きく）・リズムをとる（拍に合わせてトントン）
  const pe = c.stage?.pup?.emote;
  if (pe === "wag" && s !== "walk") {
    const w = Math.sin(T * 7.5) * c.m.reach;
    tj = [16 * w, 18 * Math.sin(T * 7.5 - .7), 22 * Math.sin(T * 7.5 - 1.4)];
    tailGoal = c.pose === "stand" ? tj[0] : 12 * w;
  } else if (pupSw) {
    tj = [9 * pupSw, 11 * Math.cos(c.t * Math.PI * 2.2 - .5), 15 * Math.cos(c.t * Math.PI * 2.2 - 1)];
    tailGoal = c.pose === "stand" ? tj[0] : -6 - 8 * pupSw;
  }
  // しっぽは根元から先へ、少しずつ遅れて追いかける（先ほど柔らかく、行き過ぎて戻る）。体の動きにも引っぱられる
  const tk = c.m.snap * 2.2, tb = c.m.bounce;
  const tail = spring(c.sp.tail[0], tailGoal - gtl * .8, dt, tk, tb);
  const tj1 = spring(c.sp.tail[1], tj[1], dt, tk * .8, tb + .1), tj2 = spring(c.sp.tail[2], tj[2], dt, tk * .62, tb + .18);
  if (c.pose === "stand") {
    c.tj[0].setAttribute("transform", `rotate(${tj1.toFixed(1)} -20.5 -22)`);
    c.tj[1].setAttribute("transform", `rotate(${tj2.toFixed(1)} -22.2 -29.7)`);
  }

  // 目: 起きている間は数秒ごとにまばたき。カーソルがそばで止まっていると、ゆっくりまばたきを返す
  if (c.t > c.blinkAt) {
    const still = !!c.mouse && performance.now() - pointerAt > 1500 && Math.hypot(c.mouse[0] - c.x, c.mouse[1] - (c.y - 30 * c.s)) < 160;
    const slow = still && c.t > c.slowAt && Math.random() < .6;
    if (slow) c.slowAt = c.t + rnd(5, 10);
    c.blinkLen = c.t + (slow ? rnd(.8, 1.3) : .13); // まばたきが終わる時刻
    c.blinkAt = c.blinkLen + (slow ? rnd(3, 5) : rnd(2.5, 7) * (Math.random() < .2 ? .05 : 1)); // ときどき 2 回続けて
  }
  const closed = c.t < c.blinkLen || ["sleep", "purr", "groom", "groomed"].includes(s) || yawn > .45 || stF > .6
    || (s === "selfgroom" && c.gs.mode !== 1 && Math.sin(c.st * 2) > -.3);
  if (closed !== c.closed) { c.closed = closed; c.el.classList.toggle("closed", closed); }

  // 耳: ときどき片方だけピクッと動く。撫ですぎると後ろへ伏せ、獲物や鳥には前へ向ける
  if (c.t > c.earNext) { c.earT = c.t; c.earWhich = Math.random() < .5 ? 0 : 1; c.earNext = c.t + rnd(3, 14); }
  const earGoal = s === "annoyed" || s === "flinch" || (c.pets.length >= c.patience && c.t - c.pets[c.pets.length - 1] < 4) ? -40
    : s === "watch" ? (c.p.social > .5 ? 8 : -22)
    : c.t < c.waryT ? -22 // 離れて様子をうかがう間は、耳を横へ寝かせる（イカ耳）
    : c.zoom && (s === "walk" || s === "jump") ? -16 // 走り回る間は耳を横へ寝かせる
    : s === "held" ? (c.held && c.st > c.held.ok ? -30 : c.p.social > .6 ? 0 : -12) // 人なつこい子は耳を前へ、警戒する子は横へ寝かせる（イカ耳）
    : s === "stalk" || s === "chatter" || s === "greet" ? 7 : 0;
  c.earBase = spring(c.sp.ear, earGoal, dt, c.m.snap * 2, c.m.bounce * .5);
  const twitch0 = c.m.reach; // 振れ幅の大きい子ほど、耳もよく動く
  const twitch = c.t - c.earT < .22 ? -24 * twitch0 * Math.sin(Math.PI * (c.t - c.earT) / .22) : 0;
  c.ears.forEach((g, i) => g.setAttribute("transform", `rotate(${(c.earBase + (i === c.earWhich ? twitch : 0)).toFixed(1)} ${i ? "18.3 -31" : "14 -30.3"})`));

  // 口: あくび・伸びのついでのあくび・窓辺のクラッキング・舐めるときにだけ開く
  const open = Math.max(yawn, talk >= 0 ? .2 * Math.max(0, Math.sin(talk * Math.PI * 3)) * (1 - talk) : 0, stF * .7, s === "eat" ? .18 * (1 + Math.sin(c.st * 12)) : 0, s === "chatter" ? .22 * (1 + Math.sin(c.t * 44)) : 0, s === "selfgroom" && c.gs.mode !== 1 ? .25 * Math.max(0, Math.sin(c.st * 11)) : 0);
  drawMouth(c, open);
  c.el.style.transform = `translate3d(${(c.x - 30 * c.s).toFixed(1)}px, ${(c.y - 40 * c.s).toFixed(1)}px, 0)`;
  // 箱・紙袋の中: 縁より下を隠して、中に収まって見せる（入るとき・出るときも縁で切る）
  const bx = c.plats.find(p => p.kind === "box" && p.rim !== undefined && c.x > p.x0 - 4 && c.x < p.x1 + 4 && c.y > p.rim + 1 && c.y <= p.y + 4);
  const clip = bx ? `inset(-80px -80px ${Math.max(0, 44 * c.s - (bx.rim! - (c.y - 40 * c.s))).toFixed(1)}px -80px)` : "";
  if (c.el.style.clipPath !== clip) c.el.style.clipPath = clip;
  c.flip.setAttribute("transform", `scale(${c.dir} 1)`);
  c.body.setAttribute("transform", `rotate(${tilt.toFixed(1)} 0 -12) translate(0 ${bob.toFixed(2)}) scale(1 ${sy.toFixed(3)})`);
  // 振り返るときは首の付け根（x=13）を軸に頭を裏返す。頭が胴から離れない
  const gr = s === "greet" ? Math.sin(Math.PI * clamp(c.st / c.dur, 0, 1)) : 0;
  // 歩いている間、頭は体の上下と傾きを打ち消して水平を保つ（獲物を見る目がぶれない）。好奇心の強い子ほど頭も揺れる
  const st0 = c.m.steady, htx = hx + 1 * c.gw + 2.6 * gr, hty = hy + 2.2 * c.gw + 1 * gr - gb * st0, ha = hr + c.look - gtl * st0;
  c.head.setAttribute("transform", `translate(${htx.toFixed(2)} ${hty.toFixed(2)}) rotate(${ha.toFixed(1)} 13 -21)${c.back ? " translate(26 0) scale(-1 1)" : ""}`);
  drawNeck(c, htx, hty, ha);
  for (const [k, g] of c.legs) g.setAttribute("transform", `rotate(${legA[k].toFixed(1)} ${PIVOT[k][0]} ${PIVOT[k][1]})`);
  const tp = TAIL[c.pose];
  c.tails.get(c.pose)?.setAttribute("transform", `rotate(${tail.toFixed(1)} ${tp[0]} ${tp[1]})`);
  if (c.fetch?.carrying) {
    // 口元: 頭の位置に合わせて、くわえたジャケットを揺らしながら運ぶ
    const mx = 30 + c.dir * (23 + hx + (c.pose === "stand" ? c.gw : 0)), my = 40 - 22 + hy + (c.pose === "stand" ? 2.2 * c.gw : 0) + bob;
    c.carry.style.transform = `translate(${(mx * c.s - 9).toFixed(1)}px, ${(my * c.s - 4).toFixed(1)}px) rotate(${(c.dir * (8 + Math.sin(c.t * 9) * 3)).toFixed(1)}deg)`;
  }
  const zx = (30 + c.dir * 12) * c.s;
  for (const z of c.zs) z.style.left = `${zx}px`;
  c.raf = requestAnimationFrame(n => tick(c, n));
}

/** 猫たちを grid に置く。coats の数だけ居るように、増えた分は呼び、減った分は帰す。
 *  animate なら、呼んだ子は画面の外から駆けてくるか飛び込んできて、帰す子は走り去るか飛び降りる */
let ambient = 0;
/** いま流れている曲への好き嫌い（-1〜1）。流れていなければ 0 */
function nowLike(c: Cat): number {
  if (!music || !tasteAt) return 0;
  const label = hooks?.tasteOf?.(tasteAt);
  return label ? likeOf(c, label) : 0;
}
/** リスニングパーティーの間、ホームの猫はお出かけする（ホストの猫と入ってきた猫だけがホームにいる）。終われば帰ってくる */
let away = false;
export function setCatsAway(on: boolean) {
  if (away === on) return;
  away = on;
  document.dispatchEvent(new Event("kona:cats-away"));
}
export const catsAway = () => away;
export function setCats(grid: HTMLElement, coats: Coat[], animate = false): void {
  if (away) coats = [];
  // 日だまりの位置と、来客の猫の訪れは、数秒ごとに確かめる
  if (!ambient) ambient = window.setInterval(() => { paintSun(); maybeVisit(); learnTaste(); maybeZoomies(); }, 3000);
  while (cats.length > coats.length) { const c = cats.pop()!; if (animate) leave(c); else removeCat(c); }
  for (const c of cats) { c.grid = grid; refresh(c); }
  for (let i = cats.length; i < coats.length; i++) { const c = addCat(grid, coats[i]); if (animate) enter(c); }
}

// 見えている範囲（grid の座標）
function view(c: Cat) {
  const g = c.grid.getBoundingClientRect(), sc = c.grid.closest(".home")?.getBoundingClientRect();
  return { top: Math.max(0, (sc?.top ?? 0) - g.top), bottom: Math.min(g.height, (sc?.bottom ?? innerHeight) - g.top), w: g.width };
}

function enter(c: Cat) {
  if (!c.plats.length) return; // ホームが見えていない。見えたときにどこかの棚へ置かれる
  const v = view(c), out = 40 * c.s;
  const vis = c.plats.filter(p => p.y > v.top + 60 && p.y < v.bottom && p.kind !== "sill");
  const edge = vis.filter(p => p.x0 < 40 || p.x1 > v.w - 40);
  if (edge.length && Math.random() < .55) {
    // 端から駆け込んでくる
    const p = edge[Math.floor(Math.random() * edge.length)], left = p.x0 < 40 && (p.x1 <= v.w - 40 || Math.random() < .5);
    c.cur = p; c.y = p.y; c.x = left ? -out : v.w + out;
    c.from = [c.x, c.y]; c.to = [clamp(left ? p.x0 + rnd(80, 260) : p.x1 - rnd(80, 260), lo(p), hi(p)), c.y]; c.dir = left ? 1 : -1;
    go(c, "walk"); c.run = true;
  } else {
    // 上から飛び込んでくる
    const p = vis[Math.floor(Math.random() * vis.length)] ?? c.plats[c.plats.length - 1], tx = rnd(lo(p), hi(p));
    c.cur = undefined; c.dest = p; c.x = tx - rnd(40, 90) * (Math.random() < .5 ? -1 : 1);
    c.y = v.top - 50 * c.s; c.dir = tx < c.x ? -1 : 1;
    launch(c, tx, p.y, 0, 0); go(c, "fall");
  }
  c.entering = true;
  c.after = () => { c.entering = false; go(c, "stand", rnd(1, 2)); };
}

function leave(c: Cat) {
  for (const o of cats) { if (o.with === c || o.chase?.other === c) { o.with = undefined; o.chase = undefined; } }
  c.with = undefined; c.chase = undefined; c.fetch = undefined; c.carry.hidden = true;
  c.leaving = true;
  const done = () => removeCat(c);
  setTimeout(done, 4000); // 念のため
  const v = view(c), p = c.cur;
  if (!p) return done();
  const edgeL = p.x0 < 40, edgeR = p.x1 > v.w - 40;
  if ((edgeL || edgeR) && Math.random() < .55) {
    // 端まで走って画面の外へ
    const right = edgeR && (!edgeL || c.x > v.w / 2);
    c.from = [c.x, c.y]; c.to = [right ? v.w + 50 * c.s : -50 * c.s, c.y]; c.dir = right ? 1 : -1;
    go(c, "walk"); c.run = true; c.after = done;
  } else {
    // ひょいと飛び降りて、画面の下へ消える
    const fake: Plat = { el: c.grid, kind: "floor", y: v.bottom + 120 * c.s, x0: -1e5, x1: 1e5, pull: 0 };
    c.dest = fake; c.cur = undefined;
    launch(c, c.x + c.dir * rnd(60, 110), fake.y, 8 * c.s, .3); go(c, "jump"); c.after = done;
  }
}

function addCat(grid: HTMLElement, coat: Coat, stage?: Cat["stage"], size = 1): Cat {
  const persona = coat.p ?? randomPersona(seeded(JSON.stringify({ ...coat, fav: undefined })));
  const scale = S * persona.size * size;
  const layer = document.createElement("div");
  layer.className = "cat-layer";
  layer.innerHTML = `<div class="cat" data-pose="sit" style="--s:${scale}"><svg viewBox="-30 -40 60 44" aria-label="${esc(nameOf(coat))}"><g class="cat-flip"><g class="cat-body">${art(coat)}</g></g></svg><span class="cat-z">z</span><span class="cat-z">z</span><i class="cat-carry" hidden></i><span class="cat-say"></span><button class="cat-tag" tabindex="-1">${esc(nameOf(coat))}</button></div>`;
  const el = layer.firstElementChild as HTMLElement;
  el.style.setProperty("--gloss", String(coat.gloss ?? 0));
  const c: Cat = {
    m: motionOf(persona, nameOf(coat) + coat.hi), settleT: -9, fleeRoll: 0, waryT: -9,
    sp: { look: { x: 0, v: 0 }, tail: [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }], ear: { x: 0, v: 0 }, lean: { x: 0, v: 0 } },
    coat, grid, layer, el, flip: el.querySelector(".cat-flip")!, body: el.querySelector(".cat-body")!, head: el.querySelector(".cat-head")!,
    neck: [...el.querySelectorAll<SVGPolygonElement>(".cat-neck polygon")],
    legs: new Map([...el.querySelectorAll<SVGGElement>("[data-leg]")].map(g => [g.dataset.leg!, g])),
    limbs: new Map([...el.querySelectorAll<SVGGElement>("[data-limb]")].map(g => [g.dataset.limb as Limb, g])), gw: 0,
    tails: new Map([...el.querySelectorAll<SVGGElement>("[data-tail]")].map(g => [g.dataset.tail!, g])),
    zs: [...el.querySelectorAll<HTMLElement>(".cat-z")],
    plats: [], x: 0, y: 0, dir: Math.random() < .5 ? -1 : 1, state: "sit", pose: "sit", left: 5, t: 0, st: 0,
    from: [0, 0], to: [0, 0], air: .6, prep: 0, wig: 0, vy0: 0, land: 0, landT: .3, landD: 0, look: 0, back: false, phase: 0, raf: 0, lastMeasure: 0, last: performance.now(),
    reduced: reduceMotion(), off: () => {},
    p: persona, s: scale, run: false, carry: el.querySelector<HTMLElement>(".cat-carry")!, tag: el.querySelector<HTMLElement>(".cat-tag")!,
    dur: 5, woke: false, closed: false,
    tj: [...el.querySelectorAll<SVGGElement>("[data-tj]")], ears: [...el.querySelectorAll<SVGGElement>("[data-ear]")],
    mouth: [el.querySelector<SVGPolygonElement>(".cat-mouth")!, el.querySelector<SVGPolygonElement>(".cat-jaw")!],
    talkT: -9, blinkAt: rnd(1, 5), blinkLen: .13, slowAt: 0, earT: -9, earNext: rnd(2, 8), earWhich: 0, earBase: 0, twT: -9, twNext: rnd(5, 15),
    pets: [], patience: 2 + Math.floor(persona.social * 4 + Math.random() * 2), huntCool: rnd(3, 8), hunger: rnd(.1, .7), bond: new Map(), greeted: new Map(), gs: { mode: 0, from: 0, until: 2 },
    stage,
  };
  let last: [number, number, number] | undefined; // 直前のカーソル位置と時刻（近づく速さを測る）
  const onMove = (e: PointerEvent) => {
    if (c.stage?.pup) return;   // 部屋の猫の目線は、その猫の飼い主のカーソル（Pup.look で入れる）
    const g = c.grid.getBoundingClientRect(), now = performance.now();
    c.mouse = [e.clientX - g.left, e.clientY - g.top];
    pointerAt = now;
    if (last && now - last[2] > 8 && e.pointerType !== "touch") {
      const dt = (now - last[2]) / 1000, cy = c.y - 14 * c.s;
      const d0 = Math.hypot(last[0] - c.x, last[1] - cy), d1 = Math.hypot(c.mouse[0] - c.x, c.mouse[1] - cy);
      maybeFlee(c, d1, (d0 - d1) / dt);
    }
    last = [c.mouse[0], c.mouse[1], now];
  };
  const onLeave = () => { c.mouse = undefined; };
  const onResize = () => { c.lastMeasure = 0; };
  const offMq = onMotionChange(() => { c.reduced = reduceMotion(); });
  // 撫でると座って喉を鳴らす。続けて撫ですぎると、耳を伏せしっぽを打ちつけて、どこかへ行ってしまう
  const onClick = (e: Event) => {
    e.stopPropagation();
    if (!c.cur || c.state === "jump" || c.state === "fall" || c.state === "walk" || c.state === "annoyed") return;
    c.pets = c.pets.filter(t => c.t - t < 30);
    c.pets.push(c.t);
    if (c.pets.length > c.patience && !c.with && !c.chase && !c.fetch) { c.pets = []; return go(c, "annoyed"); }
    shine(c, .006);
    go(c, "purr");
  };
  // 撫でる: 押したまま動かすと、撫でた場所と向きで反応が変わる（動かさずに押すだけなら、軽くなでたことにする）
  let stroke: { pts: [number, number][]; done: boolean } | undefined, stroked = false;
  const gp = (e: PointerEvent): [number, number] => { const g = c.grid.getBoundingClientRect(); return [e.clientX - g.left, e.clientY - g.top]; };
  const onStrokeMove = (e: PointerEvent) => {
    if (!stroke || stroke.done) return;
    stroke.pts.push(gp(e));
    const [a, b] = [stroke.pts[0], stroke.pts[stroke.pts.length - 1]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 16) { stroke.done = true; stroked = true; strokeCat(c, stroke.pts); }
  };
  const onStrokeEnd = () => { stroke = undefined; removeEventListener("pointermove", onStrokeMove); removeEventListener("pointerup", onStrokeEnd); removeEventListener("pointercancel", onStrokeEnd); };
  // 抱っこ: 動かさずに長押しすると持ち上げる。持ったまま動かして、離したところの段へ降ろす
  let holdT = 0;
  const onHoldMove = (e: PointerEvent) => { if (c.held) { const [x, y] = gp(e); c.held.px = x; c.held.py = y; } };
  const onHoldEnd = () => { removeEventListener("pointermove", onHoldMove); removeEventListener("pointerup", onHoldEnd); removeEventListener("pointercancel", onHoldEnd); if (c.state === "held") letGo(c); };
  if (stage?.pup) el.classList.add("cat-pup", "named"); // 部屋の猫は撫でたり抱いたりしない。名札はいつも出す
  el.addEventListener("pointerdown", e => {
    if (stage?.pup) return;
    if (e.button !== 0 || (e.target as Element).closest(".cat-tag")) return;
    e.preventDefault(); stroked = false;
    stroke = { pts: [gp(e)], done: false };
    addEventListener("pointermove", onStrokeMove); addEventListener("pointerup", onStrokeEnd); addEventListener("pointercancel", onStrokeEnd);
    clearTimeout(holdT);
    holdT = window.setTimeout(() => {
      if (!stroke || stroke.done) return;
      const [a, b] = [stroke.pts[0], stroke.pts[stroke.pts.length - 1]];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 8 || !pickUp(c, b)) return;
      stroke.done = true; stroked = true;
      addEventListener("pointermove", onHoldMove); addEventListener("pointerup", onHoldEnd); addEventListener("pointercancel", onHoldEnd);
    }, 450);
  });
  const onUp = () => clearTimeout(holdT);
  addEventListener("pointerup", onUp);
  el.addEventListener("click", e => {
    if (stage?.pup) return;
    if ((e.target as Element).closest(".cat-tag")) { e.stopPropagation(); openCard(c); return; }
    if (stroked) { e.stopPropagation(); stroked = false; return; }
    onClick(e);
  });
  // 名札: しばらく乗せていると出て、離れてしばらくすると消える
  let tagT = 0;
  if (!stage?.pup) el.addEventListener("pointerenter", () => { clearTimeout(tagT); tagT = window.setTimeout(() => el.classList.add("named"), 450); });
  if (!stage?.pup) el.addEventListener("pointerleave", () => { clearTimeout(tagT); tagT = window.setTimeout(() => el.classList.remove("named"), 1500); });
  // ダブルクリック: 「1 枚選んで」と頼む（撫でた 2 回分は数えない）
  if (!stage?.pup) el.addEventListener("dblclick", e => { e.stopPropagation(); c.pets.splice(-2); catPicksAlbum(c); });
  addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  addEventListener("resize", onResize);
  c.off = () => {
    removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    removeEventListener("resize", onResize);
    removeEventListener("pointerup", onUp);
    clearTimeout(holdT); clearTimeout(tagT);
    offMq();
  };
  if (!stage) cats.push(c);
  refresh(c);
  c.lastMeasure = performance.now();
  c.raf = requestAnimationFrame(n => tick(c, n));
  return c;
}

function removeCat(c: Cat) {
  const i = cats.indexOf(c);
  if (i >= 0) cats.splice(i, 1);
  for (const o of cats) {
    if (o.chase?.other === c) { o.chase = undefined; o.with = undefined; }
    if (o.with === c) o.with = undefined;
  }
  cancelAnimationFrame(c.raf);
  c.off();
  c.layer.remove();
}

// ---------- 起動画面の猫 ----------
// ホームと同じ猫（同じ毛並み・同じ体）を、起動画面の小さな床に置く。sleep 秒だけ眠ってから、
// あくびをして目を開け、座る。あとは座ったまま、まばたき・耳のピクつき・カーソルを目で追う。撫でると喉を鳴らす
export function stageCat(host: HTMLElement, coat: Coat, sleep: number, size = 1.25): void {
  const c = addCat(host, coat, { sleep }, size);
  c.layer.classList.add("cat-stage");
}
function stageNext(c: Cat) {
  if (c.stage?.pup) return pupNext(c);
  switch (c.state) {
    case "sleep": c.woke = true; return go(c, "yawn", 2);       // あくびは寝ていた姿勢のまま
    case "yawn": return go(c, "lie", .7);                       // 目を開けて、ひと呼吸
    default: c.woke = false; return go(c, "sit", rnd(6, 12));   // 起き上がって座る。あとはそのまま
  }
}

// ---------- カーソルを狩る・撫ですぎ ----------
// カーソルが今の足場の上（床すれすれ）で動いていて、跳びかかれる距離にあるか
function prey(c: Cat): boolean {
  const m = target(c), p = c.cur;
  if (!m || !p) return false;
  const dx = Math.abs(m[0] - c.x);
  return m[0] > p.x0 && m[0] < p.x1 && m[1] > p.y - 70 * c.s / S && m[1] < p.y + 10 && dx > 24 && dx < 260;
}
// 忍び寄りの終わり: まだ獲物がそこにいたら、お尻を振って跳びかかり、前脚で押さえる
function pounce(c: Cat) {
  const p = c.cur!;
  if (!prey(c) || Math.abs(target(c)![0] - c.x) > REACH_X) { c.toy = undefined; return go(c, Math.random() < .5 ? "sit" : "stand"); }
  const tx = clamp(target(c)![0] - c.dir * 14 * c.s, lo(p), hi(p));
  leap(c, p, tx, () => { go(c, "poke", rnd(1, 1.6)); kickFeather(c); hitToy(c); }, { prep: .12, wig: rnd(.3, .55) });
}
// 撫ですぎて怒ったあと: その場を離れて、気を取り直すように身づくろいする
function stalkOff(c: Cat) {
  release(c);
  const j = jumpTarget(c);
  if (j && Math.random() < .6) return leap(c, j[0], j[1], () => go(c, "selfgroom"));
  const p = c.cur!, far = c.x - lo(p) > hi(p) - c.x ? lo(p) : hi(p);
  if (Math.abs(far - c.x) > 50) return walkTo(c, far, () => go(c, "selfgroom"));
  go(c, "selfgroom");
}

// ---------- カーソルから逃げる ----------
/** 臆病さ: 人見知り（人なつこくない）で、遊び好きでない子ほど高い */
const shyOf = (c: Cat) => clamp((1 - c.p.social) * .8 + (1 - c.p.playful) * .25 - .05, 0, 1);
/** いま逃げたくなる度合い: 臆病さに、今日の気分と、撫ですぎ・怒った直後のいらだちを重ねる */
function waryOf(c: Cat): number {
  const day = seeded(new Date().toDateString() + nameOf(c.coat))();
  const cross = c.pets.length >= c.patience && c.t - c.pets[c.pets.length - 1] < 20;
  return clamp(Math.pow(shyOf(c), 1.4) * .85 + (day < .35 ? .25 : 0) + (cross ? .45 : 0) + (c.state === "annoyed" || c.state === "flinch" ? .35 : 0) + (c.t < c.waryT ? .3 : 0), 0, .95);
}
/** カーソルが勢いよく近づいてきたら、機嫌と性格しだいで逃げる。決めるのは近づくたびに 1 回だけ */
function maybeFlee(c: Cat, dist: number, closing: number) {
  const R = (55 + 55 * shyOf(c)) * Math.max(1, c.s);
  if (dist > R || closing < 380 || c.t - c.fleeRoll < 2.5) return;
  if (!c.cur || c.stage || c.reduced || c.chase || c.fetch || c.zoom || c.with || c.entering || c.leaving || c.flee !== undefined) return;
  if (!["stand", "sit", "lie", "selfgroom", "yawn", "stretch", "watch", "annoyed"].includes(c.state) && !(c.state === "walk" && !c.run)) return;
  c.fleeRoll = c.t;
  if (Math.random() > waryOf(c) * clamp((closing - 300) / 900, .35, 1)) return;
  release(c);
  c.flee = c.mouse![0];
  c.dir = c.mouse![0] < c.x ? 1 : -1; // まず背を向ける
  go(c, "flinch", .08 + .1 * c.m.hold); // ほんの一瞬すくむ（溜め）。そこから一気に走る
}
function fleeRun(c: Cat) {
  const from = c.flee!, p = c.cur!;
  c.flee = undefined;
  const settle = () => {
    c.waryT = c.t + rnd(4, 9) * c.m.hold;
    if (c.mouse) c.dir = c.mouse[0] < c.x ? -1 : 1; // 振り返って、カーソルの様子をうかがう
    go(c, c.p.sleepy > .6 ? "lie" : "sit", rnd(4, 8));
  };
  const far = Math.abs(lo(p) - from) > Math.abs(hi(p) - from) ? lo(p) : hi(p);
  const room = Math.abs(far - c.x);
  const j = jumpTarget(c, from);
  if (j && Math.abs(j[1] - from) > 120 && (room < 90 || Math.random() < .35 + .4 * c.p.curious)) { c.run = true; leap(c, j[0], j[1], settle); return; }
  if (room > 24) return walkTo(c, far, settle, true);
  if (j) { c.run = true; leap(c, j[0], j[1], settle); return; } // 追い詰められたら、どこへでも跳ぶ
  settle();
}

// ---------- 猫の家具 ----------
const tellFurniture = (kind: "eat" | "scratch" | "toy", amount?: number) => document.dispatchEvent(new CustomEvent("kona:cat", { detail: { kind, amount } }));
const modOf = (el: Element) => el.closest(".mod, .thing"); // 猫のごはんは床の家具
const occupied = (c: Cat, p: Plat) => cats.some(o => o !== c && (samePlat(o.cur, p) || samePlat(o.dest, p)));

let eater: Cat | undefined, eaterAt = 0; // いま器を使っている子
// ごはん: 器の横へ行って食べる。空っぽなら、器のそばに座って待つ（こちらをじっと見る）
function goEat(c: Cat): boolean {
  const bowl = c.grid.querySelector<HTMLElement>("[data-bowl]");
  const dest = bowl && c.plats.find(p => p.kind === "deck" && modOf(p.el) === modOf(bowl));
  if (!bowl || !dest) return false;
  const g = c.grid.getBoundingClientRect(), r = bowl.getBoundingClientRect(), bx = r.left + r.width / 2 - g.left;
  // 頭を器の上に持ってくる。広い側から近づく
  const side = bx - lo(dest) > hi(dest) - bx ? -1 : 1, x = clamp(bx + side * 21 * c.s, lo(dest), hi(dest));
  // 器はひとつ。先に食べている子がいたら、少し離れて座って順番を待つ
  const busyBowl = eater && eater !== c && cats.includes(eater) && performance.now() - eaterAt < 30000;
  if (busyBowl) {
    if (samePlat(c.cur, dest) && Math.abs(c.x - bx) < 110 * c.s) { go(c, "sit", rnd(4, 8)); return true; } // もう待っている
    const queued = cats.filter(o => o !== c && o !== eater && samePlat(o.cur, dest) && Math.abs(o.x - bx) < 200 * o.s).length;
    travel(c, dest, clamp(bx + (eater!.x < bx ? 1 : -1) * (rnd(62, 72) + 46 * queued) * c.s, lo(dest), hi(dest)), () => { c.dir = bx < c.x ? -1 : 1; go(c, "sit", rnd(5, 9)); }, () => go(c, "sit"));
    return true;
  }
  // 空っぽの器の前でしばらく待ったら、あきらめてほかのことをすることもある
  if (Number(bowl.dataset.level ?? 0) <= .03 && samePlat(c.cur, dest) && Math.abs(c.x - bx) < 60 * c.s && Math.random() < .5) return false;
  eater = c; eaterAt = performance.now();
  travel(c, dest, x, () => {
    c.dir = bx < c.x ? -1 : 1;
    if (Number(bowl.dataset.level ?? 0) > .03) { eaterAt = performance.now(); go(c, "eat"); tellFurniture("eat", .1 + .08 * c.p.size); }
    else { eater = undefined; go(c, "sit", rnd(8, 16)); }
  }, () => { eater = undefined; go(c, "sit"); });
  return true;
}
// 爪とぎ: 段ボールの上に乗って、前脚で引っかく
function goScratch(c: Cat): boolean {
  const pads = c.plats.filter(p => p.kind === "pad" && !occupied(c, p)), pad = pads[Math.floor(Math.random() * pads.length)]; // 爪とぎ・波形の爪とぎ
  if (!pad) return false;
  travel(c, pad, (lo(pad) + hi(pad)) / 2 + rnd(-10, 10), () => { go(c, "scratch"); tellFurniture("scratch"); }, () => go(c, "sit"));
  return true;
}
// タワーのベッド・ソファ・クッションで丸くなる（空いているところから選ぶ）
function goBed(c: Cat): boolean {
  const beds = c.plats.filter(p => p.kind === "bed" && !samePlat(p, c.cur) && !occupied(c, p)), bed = beds[Math.floor(Math.random() * beds.length)];
  if (!bed) return false;
  travel(c, bed, (lo(bed) + hi(bed)) / 2, () => { c.favNap = true; go(c, "lie", rnd(1.5, 3)); }, () => go(c, "sit"));
  return true;
}
// タワーにぶら下がったぽんぽんを、前脚で叩く
function batToy(c: Cat): boolean {
  const toy = c.grid.querySelector<HTMLElement>(".ct-pom");
  if (!toy) return false;
  const g = c.grid.getBoundingClientRect(), r = toy.getBoundingClientRect(), tx = r.left + r.width / 2 - g.left, ty = r.top - g.top;
  const p = c.cur!;
  if (ty > p.y || p.y - ty > 70 * c.s || tx < p.x0 - 20 || tx > p.x1 + 20) return false; // この段から届く高さにない
  const x = clamp(tx - Math.sign(tx - c.x || 1) * 24 * c.s, lo(p), hi(p));
  walkTo(c, x, () => { c.dir = tx < c.x ? -1 : 1; go(c, "poke", rnd(1.2, 2)); setTimeout(() => tellFurniture("toy"), 250); });
  return true;
}
// ---------- おもちゃ ----------
// 床に置いたおもちゃ（items/ の <i data-cat-toy>）。遊び好きな子は離れた所から身を伏せて忍び寄り、お尻を振って跳びかかる。
// のんびりした子は横まで歩いていって、前脚でちょいと叩く。叩くと "kona:bat" を出し、転がるものは転がっていく（room-things.ts）。
// 転がったら追いかけて、また叩く（遊び好きほど続ける）
const toyAt = (c: Cat): [number, number] | undefined => {
  const t = c.toy;
  if (!t || !t.el.isConnected || performance.now() > t.until) return undefined;
  const g = c.grid.getBoundingClientRect(), r = t.el.getBoundingClientRect();
  return [r.left + r.width / 2 - g.left, c.cur ? c.cur.y - 6 : r.top - g.top];
};
const toysOf = (c: Cat) => [...c.grid.querySelectorAll<HTMLElement>("[data-cat-toy]")].filter(e => e.getBoundingClientRect().width > 0 && !cats.some(o => o !== c && o.toy?.el === e));
function goToy(c: Cat, el?: HTMLElement, n = 0): boolean {
  const list = el ? [el] : toysOf(c), toy = list[Math.floor(Math.random() * list.length)];
  if (!toy || !c.cur) return false;
  const g = c.grid.getBoundingClientRect(), r = toy.getBoundingClientRect(), tx = r.left + r.width / 2 - g.left, ty = r.bottom - g.top;
  // おもちゃの載っている足場: 真下の近いもの（床のおもちゃなら床）
  const dest = c.plats.filter(p => p.kind !== "box" && tx >= p.x0 - 10 && tx <= p.x1 + 10 && Math.abs(p.y - ty) < 90)
    .sort((a, b) => Math.abs(a.y - ty) - (a.kind === "floor" ? 20 : 0) - (Math.abs(b.y - ty) - (b.kind === "floor" ? 20 : 0)))[0];
  if (!dest) return false;
  const side = samePlat(c.cur, dest) ? (c.x < tx ? -1 : 1) : Math.random() < .5 ? -1 : 1;
  let stalk = !c.reduced && Math.random() < .25 + .6 * c.p.playful;
  let x = tx + side * (stalk ? rnd(130, 175) * c.s / S : 16 * c.s + r.width * .3);
  if (x < lo(dest) || x > hi(dest)) { // 壁ぎわ: 反対側から
    const o = tx - side * (stalk ? rnd(130, 175) * c.s / S : 16 * c.s + r.width * .3);
    if (o >= lo(dest) && o <= hi(dest)) x = o; else { stalk = false; x = clamp(x, lo(dest), hi(dest)); }
  }
  c.toy = { el: toy, until: performance.now() + 25000, n };
  travel(c, dest, x, () => {
    const t = toyAt(c);
    if (!t) { c.toy = undefined; return go(c, "sit"); }
    c.dir = t[0] < c.x ? -1 : 1;
    if (stalk && prey(c)) return go(c, "stalk");
    go(c, "poke", rnd(1.1, 1.8)); setTimeout(() => hitToy(c), 250);
  }, () => { c.toy = undefined; go(c, "sit"); }, 8, n > 0);
  return true;
}
function hitToy(c: Cat) {
  if (!toyAt(c)) return;
  c.toy!.el.dispatchEvent(new CustomEvent("kona:bat", { bubbles: true, detail: { dir: c.dir, power: .55 + .6 * c.p.energy * Math.random() + .15 } }));
}
function endToy(c: Cat) {
  const t = c.toy!;
  c.toy = undefined;
  release(c);
  // 転がったおもちゃを追いかける。3 回ほどで気が済んで、座って身づくろい
  if (t.el.isConnected && t.n < 3 && Math.random() < (.3 + .5 * c.p.playful) * Math.min(1, activity())) {
    const el = t.el;
    go(c, "stand", rnd(.4, 1.2));
    setTimeout(() => { if (c.cur && c.state === "stand" && !c.with && !c.chase && !c.fetch) goToy(c, el, t.n + 1); }, rnd(300, 900));
    return;
  }
  go(c, Math.random() < .5 ? "sit" : "selfgroom");
}
// おもちゃを押すと、起きている遊び好きな子が気づいて寄ってくる
document.addEventListener("kona:toy", e => {
  const el = (e as CustomEvent<HTMLElement>).detail;
  const awake = cats.filter(c => c.cur && !c.stage && !c.reduced && !busy(c) && c.state !== "sleep" && !c.toy && Math.random() < .35 + .6 * c.p.playful);
  const g = awake[0]?.grid.getBoundingClientRect(), r = el.getBoundingClientRect(), tx = g ? r.left + r.width / 2 - g.left : 0;
  const c = awake.sort((a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx))[0];
  if (c) setTimeout(() => { if (c.cur && !busy(c) && c.state !== "sleep") goToy(c, el); }, rnd(400, 1600));
});

// ごはんを入れた音で、お腹の空いた子（と、食いしん坊の好奇心旺盛な子）が寄ってくる
document.addEventListener("kona:feed", () => {
  for (const c of cats) {
    if (c.hunger < .3 && Math.random() > c.p.curious * .4) continue;
    setTimeout(() => {
      if (!c.cur || c.with || c.chase || c.fetch || c.leaving || ["jump", "fall", "walk", "eat"].includes(c.state)) return;
      c.hunger = Math.max(c.hunger, .8);
      if (c.state === "sleep") { go(c, "yawn"); c.woke = true; return; } // 起きてから来る
      goEat(c);
    }, rnd(300, 2500));
  }
});

// ---------- 名札と性格 ----------
// 猫にしばらくカーソルを乗せると、頭の上に名札が出る。名札を押すと、名前・性格・好きなアルバム・今日の機嫌が見られる
const TRAITS: [keyof Persona, string][] = [["energy", "元気さ"], ["sleepy", "眠たがり"], ["social", "人なつこさ"], ["playful", "遊び好き"], ["curious", "好奇心"]];
const DOING: Partial<Record<State, string>> = {
  sleep: "眠っている", lie: "くつろいでいる", sit: "座っている", stand: "立ち止まっている", walk: "歩いている", jump: "跳んでいる", fall: "降りている",
  purr: "喉を鳴らしている", groom: "毛づくろいしてあげている", groomed: "毛づくろいしてもらっている", play: "じゃれている", poke: "ちょっかいを出している",
  stretch: "伸びをしている", yawn: "あくびをしている", selfgroom: "身づくろいしている", stalk: "獲物を狙っている", annoyed: "ご機嫌ななめ",
  chatter: "窓の外の鳥を見ている", watch: "窓の外の猫を見つめている", flinch: "びくっとした", held: "抱っこされている", eat: "ごはんを食べている", scratch: "爪をといでいる", greet: "あいさつしている",
};
/** 今日の機嫌: 日ごとに決まる気分に、お腹の具合・撫ですぎ・眠気を重ねる */
function moodOf(c: Cat): string {
  if (c.state === "annoyed" || c.pets.length >= c.patience) return "ちょっと不機嫌";
  if (c.t < c.waryT) return "警戒中";
  if (c.hunger > .75) return "おなかぺこぺこ";
  const day = seeded(new Date().toDateString() + nameOf(c.coat))();
  if (c.state === "sleep" || ear.calm > .6 || day < .2 + c.p.sleepy * .15) return "ねむたい";
  if (day > .75 - c.p.playful * .15) return "ごきげん";
  return day > .45 ? "まあまあ" : "おだやか";
}
let card: HTMLElement | undefined;
function closeCard() { card?.remove(); card = undefined; }
function openCard(c: Cat) {
  closeCard();
  const C = c.coat, fav = hooks?.favorite?.(C), title = fav ? hooks?.albumTitle?.(fav) : undefined;
  const best = [...c.bond].filter(([o]) => cats.includes(o)).sort((a, b) => b[1] - a[1])[0];
  const dots = (v: number) => Array.from({ length: 5 }, (_, i) => `<i${i < Math.round(v * 5) ? ` class="on"` : ""}></i>`).join("");
  const el = document.createElement("div");
  el.className = "cat-card"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${nameOf(C)}のこと`);
  el.innerHTML = `
    <input class="cat-name" value="${esc(nameOf(C))}" maxlength="12" aria-label="名前" spellcheck="false"${C.stray ? " readonly" : ""}>
    <p class="cat-breed">${esc(breedOf(C).name)}・${esc(DOING[c.state] ?? "")}${C.stray ? `・通りすがり` : ""}</p>
    <dl>${TRAITS.map(([k, label]) => `<dt>${label}</dt><dd>${dots(c.p[k])}</dd>`).join("")}<dt>毛づや</dt><dd>${dots(.1 + .9 * (C.gloss ?? 0))}</dd></dl>
    <p><span>今日の機嫌</span>${esc(moodOf(c))}</p>
    ${title ? `<p><span>好きなアルバム</span>${esc(title)}</p>` : ""}
    ${(() => { const t = tastes(c); return (t.love ? `<p><span>好きな音楽</span>${esc(t.love)}</p>` : "") + (t.hate ? `<p><span>苦手な音楽</span>${esc(t.hate)}</p>` : ""); })()}
    ${best && best[1] > .45 ? `<p><span>仲良し</span>${esc(nameOf(best[0].coat))}</p>` : ""}
    ${C.stray ? (() => { const r = hooks?.room?.(), full = !!r && r.pets >= r.cap;
      return `<button type="button" class="cat-adopt"${full ? " disabled" : ""}>飼い猫にする</button>${full ? `<p class="cat-full">いまは ${r!.cap} 匹まで飼えます</p>` : ""}`; })()
    : hooks?.accs ? `<p><span>アクセサリー</span><select class="cat-acc-pick" aria-label="アクセサリー"><option value="">なし</option>${hooks.accs().map(a => `<option value="${esc(a.key)}"${a.key === C.acc ? " selected" : ""}>${esc(a.label)}</option>`).join("")}</select></p>` : ""}`;
  // 猫の頭の上あたりに出す（画面からはみ出さないように）
  const g = c.grid.getBoundingClientRect();
  c.layer.append(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${clamp(c.x - w / 2, 8, g.width - w - 8)}px`;
  el.style.top = `${Math.max(8, c.y - 52 * c.s - h)}px`;
  const name = el.querySelector<HTMLInputElement>(".cat-name")!;
  name.addEventListener("change", () => {
    const v = name.value.trim();
    if (v) { C.name = v; hooks?.saveCoats?.(); c.tag.textContent = v; }
    else name.value = nameOf(C);
  });
  name.addEventListener("keydown", e => { if (e.key === "Enter") name.blur(); if (e.key === "Escape") closeCard(); });
  el.querySelector(".cat-adopt")?.addEventListener("click", () => { if (hooks?.adopt?.(C)) { closeCard(); openCard(c); } });
  el.querySelector<HTMLSelectElement>(".cat-acc-pick")?.addEventListener("change", e => { C.acc = (e.target as HTMLSelectElement).value || undefined; hooks?.saveCoats?.(); restyleCat(C); });
  card = el;
}
addEventListener("pointerdown", e => { if (card && !(e.target as Element).closest(".cat-card, .cat-tag")) closeCard(); });
addEventListener("keydown", e => { if (e.key === "Escape") closeCard(); });

// ---------- 猫どうし ----------
type Social = "groom" | "play" | "poke" | "chase" | "cuddle";
// 仲の良さ: はじめは人なつこさしだい。毛づくろい・寄り添い・遊びで深まり、寝ているところへのちょっかいで少し下がる
const bondOf = (c: Cat, o: Cat) => c.bond.get(o) ?? .2 + .25 * (c.p.social + o.p.social) / 2;
function befriend(c: Cat, o: Cat | undefined, d: number) {
  if (!o) return;
  const v = clamp(bondOf(c, o) + d, 0, 1);
  c.bond.set(o, v); o.bond.set(c, v);
}
const busy = (o: Cat) => !o.cur || !!o.with || !!o.chase || !!o.fetch || !!o.entering || ["walk", "jump", "fall", "purr", "stalk", "annoyed", "stretch", "eat", "scratch", "flinch", "watch"].includes(o.state);
const resting = (o: Cat) => o.state === "sit" || o.state === "lie" || o.state === "sleep";

function release(c: Cat) {
  const o = c.with;
  c.with = undefined;
  if (o?.with === c) o.with = undefined;
}

/** 近くの猫を選んで、毛づくろい・じゃれ合い・ちょっかい・追いかけっこのどれかをしに行く */
function social(c: Cat): boolean {
  const others = cats.filter(o => o !== c && !busy(o));
  if (!others.length) return false;
  // 近い子ほど選ばれやすい。同じ足場ならなおさら
  const w = others.map(o => (samePlat(o.cur, c.cur) ? 3 : 1) / (1 + Math.hypot(o.x - c.x, o.y - c.y) / 200));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), o = others[0];
  for (let i = 0; i < others.length; i++) if ((r -= w[i]) <= 0) { o = others[i]; break; }
  const P = c.p, Q = o.p, B = bondOf(c, o);
  // 仲の良い子とは毛づくろいし合い、寄り添って眠る。まだ打ち解けていない子には、ちょっかいを出しがち
  const kinds: [Social, number][] = [
    ["groom", P.social * (resting(o) ? 1.2 : .5) * (.4 + Q.social) * (.3 + B * 1.4)],
    ["play", P.playful * Q.playful * (o.state === "sleep" ? .1 : 1) * (.6 + B)],
    ["poke", P.playful * (resting(o) ? 1 : .3) * .8 * (1.3 - B)],
    ["chase", P.playful * P.energy * (o.state === "sleep" ? .1 : .7) * (.5 + B * .6)],
    ["cuddle", (o.state === "sleep" || o.state === "lie" ? 1.4 : 0) * B * B * (.3 + P.sleepy + ear.calm) * (.4 + P.social)],
  ];
  let k = Math.random() * kinds.reduce((a, b) => a + b[1], 0), kind: Social = "groom";
  for (const [n, v] of kinds) if ((k -= v) <= 0) { kind = n; break; }
  return approach(c, o, kind, 1);
}

/** 相手のそばまで行く（同じ足場なら歩き、届く足場なら跳ぶ）。着いたら begin */
function approach(c: Cat, o: Cat, kind: Social, hops: number): boolean {
  if (!o.cur || !c.cur) return false;
  c.with = o; o.with = c;
  if (resting(o)) o.left = Math.max(o.left, 10); // 相手は待っていてくれる
  // 寄り添うときは体を並べる（少し離れて伏せる）。あいさつするときは向かい合って鼻先が触れる距離に
  const gap = needGreet(c, o, kind) ? 21.5 * (c.s + o.s) : (kind === "cuddle" ? 30 : 27) * Math.max(c.s, o.s) / S * 1.15;
  const side = c.x < o.x ? -1 : 1;
  const spot = (p: Plat) => {
    const a = o.x + side * gap, b = o.x - side * gap;
    return a >= lo(p) && a <= hi(p) ? a : b >= lo(p) && b <= hi(p) ? b : undefined;
  };
  const arrive = () => {
    if (o.with !== c || !samePlat(o.cur, c.cur) || Math.abs(o.x - c.x) > gap * 1.6 + 20 || busy(o) && o.with !== c) { release(c); return go(c, "stand", .5); }
    begin(c, o, kind);
  };
  if (samePlat(o.cur, c.cur)) {
    const x = spot(c.cur);
    if (x === undefined) { release(c); return false; }
    if (Math.abs(x - c.x) < 4) arrive(); else walkTo(c, x, arrive, kind === "chase");
    return true;
  }
  const x = spot(o.cur), tx = x === undefined ? undefined : reach(c, o.cur, x);
  if (hops > 0 && tx !== undefined) { leap(c, o.cur, tx, () => approach(c, o, kind, hops - 1) || (release(c), go(c, "sit"))); return true; }
  release(c);
  return false;
}

const needGreet = (c: Cat, o: Cat, kind: Social) => kind !== "cuddle" && o.state !== "sleep" && performance.now() - (c.greeted.get(o) ?? -1e9) > 120000;
function face(c: Cat, o: Cat) { if (Math.abs(o.x - c.x) > 2) c.dir = o.x < c.x ? -1 : 1; }

function begin(c: Cat, o: Cat, kind: Social) {
  face(c, o);
  // しばらく会っていなかった相手とは、まず鼻を寄せてあいさつ（鼻チュー）。寝ている子は起こさない
  if (needGreet(c, o, kind)) {
    const now = performance.now();
    c.greeted.set(o, now); o.greeted.set(c, now);
    face(o, c);
    go(c, "greet"); go(o, "greet", c.left + .2);
    // あいさつが済んだら、毛づくろいなどは体が触れるところまで寄ってから始める
    c.cont = () => {
      if (o.with !== c || !samePlat(o.cur, c.cur)) { release(c); return go(c, "sit"); }
      const close = 27 * Math.max(c.s, o.s) / S * 1.15;
      if (kind !== "chase" && Math.abs(c.x - o.x) > close * 1.3) walkTo(c, o.x + Math.sign(c.x - o.x) * close, () => begin(c, o, kind));
      else begin(c, o, kind);
    };
    return;
  }
  if (kind === "cuddle") {
    // 相手と同じ向きに並んで伏せ、そのまま眠る
    c.dir = o.dir; befriend(c, o, .1);
    go(c, "lie", rnd(1.5, 3)); c.favNap = true;
    if (o.state === "lie") { o.favNap = true; o.left = Math.min(o.left, 4); }
    release(c);
    return;
  }
  if (kind === "groom") {
    befriend(c, o, .08);
    const d = rnd(6, 10);
    go(c, "groom", d); go(o, "groomed", d + 1);
  } else if (kind === "play") {
    face(o, c); befriend(c, o, .05);
    const d = rnd(4, 7);
    go(c, "play", d); go(o, "play", d + .3);
  } else if (kind === "poke") {
    if (o.state === "sleep") befriend(c, o, -.04);
    go(c, "poke");
  } else startChase(o, c); // 飛びかかって、相手が逃げる
}

// 毛づくろいの後: 半分くらいはお返しに舐めてもらい、そのまま寄り添って眠る
function endGroom(c: Cat) {
  const o = c.with;
  if (o && o.with === c && o.state === "groomed" && Math.random() < .35 + o.p.social * .4) {
    const d = rnd(5, 9);
    face(o, c); go(o, "groom", d); go(c, "groomed", d + 1);
    return;
  }
  release(c);
  go(c, Math.random() < .5 ? "lie" : "sit");
  if (o && o.state === "groomed") go(o, Math.random() < .5 + o.p.sleepy * .4 ? "sleep" : "lie");
}

// じゃれ合いの後: 盛り上がったら追いかけっこに、そうでなければ座って落ち着く
function endPlay(c: Cat) {
  const o = c.with;
  release(c);
  if (o && o.state === "play" && o.cur && c.cur && Math.random() < .3 + (c.p.playful + o.p.playful) * .2) {
    return Math.random() < .5 ? startChase(c, o) : startChase(o, c);
  }
  go(c, "sit");
  if (o && o.state === "play") go(o, Math.random() < .5 ? "sit" : "stand");
}

// ちょっかいの後: 相手の性格しだいで、追いかけてくる・じゃれ返す・知らん顔
function endPoke(c: Cat) {
  const o = c.with;
  if (!o || o.with !== c || !o.cur) { release(c); return go(c, "sit"); }
  const r = Math.random();
  if (r < o.p.playful * .7 && o.state !== "sleep") return startChase(c, o);
  if (r < .55 && o.state !== "sleep") { face(o, c); const d = rnd(3, 5); go(o, "play", d); go(c, "play", d + .3); return; }
  release(c);
  if (o.state === "sleep") go(o, "lie");
  else face(o, c);
  go(c, "sit");
}

// ---------- 追いかけっこ ----------
function startChase(runner: Cat, chaser: Cat) {
  release(runner); release(chaser);
  const until = performance.now() + rnd(7000, 13000);
  runner.chase = { role: "runner", other: chaser, until, tries: 0 };
  chaser.chase = { role: "chaser", other: runner, until, tries: 0 };
  runner.with = chaser; chaser.with = runner;
  chaseStep(runner);
  go(chaser, "stand", .35); // 一瞬ためてから追いかける
}

function endChase(c: Cat) {
  const o = c.chase?.other;
  for (const k of [c, o]) {
    if (!k) continue;
    k.chase = undefined; k.with = undefined; k.run = false;
    if (k.cur && k.state !== "jump" && k.state !== "fall") go(k, "stand", rnd(.6, 1.2));
    else k.after = undefined;
  }
  // 息を整えたら、仲直りの毛づくろい
  if (o && o.cur && samePlat(o.cur, c.cur) && Math.random() < .35) setTimeout(() => { if (!busy(c) && !busy(o)) approach(c, o, "groom", 0); }, 1500);
}

function chaseStep(c: Cat): void {
  const ch = c.chase;
  if (!ch) return next(c);
  const o = ch.other;
  if (performance.now() > ch.until || !o.chase || !cats.includes(o) || !c.cur) return endChase(c);
  const step = () => chaseStep(c);
  if (ch.role === "runner") {
    const p = c.cur;
    if (Math.random() < .45) {
      const j = jumpTarget(c, o.x);
      if (j) { c.run = true; return leap(c, j[0], j[1], step); }
    }
    // 追っ手と反対側の端へ走る。端にいたら逆へ
    const away = o.x < c.x ? hi(p) : lo(p);
    return walkTo(c, Math.abs(away - c.x) > 40 ? away : away === hi(p) ? lo(p) : hi(p), step, true);
  }
  if (o.state === "jump" || o.state === "fall") {
    const tx = o.dest ? reach(c, o.dest, o.to[0] - Math.sign(o.to[0] - c.x || 1) * 30 * c.s) : undefined;
    if (o.dest && tx !== undefined) { c.run = true; return leap(c, o.dest, tx, step); }
    return walkTo(c, o.from[0], step, true);
  }
  if (samePlat(o.cur, c.cur)) {
    // 追いついた: 相手が止まっていたら捕まえておしまい
    if (Math.abs(o.x - c.x) < 34 * c.s) return o.state === "walk" ? go(c, "stand", .15) : endChase(c);
    return walkTo(c, o.x, step, true);
  }
  const tx = o.cur ? reach(c, o.cur, o.x) : undefined;
  if (o.cur && tx !== undefined) { c.run = true; return leap(c, o.cur, tx, step); }
  if (++ch.tries > 4) return endChase(c);
  return walkTo(c, o.x, step, true);
}

// ---------- くわえて運ぶ ----------
export interface CatHooks {
  /** くわえてくるアルバム（よく聴くもののうち、まだ「次に再生」にないもの）。art はジャケットの URL か色 */
  pick(): { key: string; art: string } | undefined;
  /** 「次に再生」に入れる */
  deliver(key: string): void;
  /** この猫のお気に入りのアルバム（なければ決めて覚える） */
  favorite?(coat: Coat): string | undefined;
  /** いま流れているアルバム */
  nowPlaying?(): string | undefined;
  /** ランダムで 1 枚選ぶ（ランダムで 1 枚） */
  random?(): { key: string; art: string } | undefined;
  /** そのアルバムを流す */
  play?(key: string): void;
  /** アルバムの名前（名札に好きなアルバムを出す） */
  albumTitle?(key: string): string | undefined;
  /** 好き嫌いを覚える単位（ジャンル。なければアーティスト、それもなければアルバム） */
  tasteOf?(key: string): string | undefined;
  /** 名前などを変えたので、毛並みを保存し直す */
  saveCoats?(): void;
  /** いまの音の大きさ（0〜1 くらい、左右の平均）。拍とテンポを拾うのに使う */
  level?(): number;
  /** 通りすがりの猫を飼い猫にする（上限で飼えなければ false） */
  adopt?(coat: Coat): boolean;
  /** いま飼い猫をもう 1 匹ふやせるか（いまの数・上限） */
  room?(): { pets: number; cap: number };
  /** 持っているアクセサリー */
  accs?(): { key: string; label: string }[];
}
let hooks: CatHooks | undefined;
export function setCatHooks(h: CatHooks) { hooks = h; }

const queueBoard = (c: Cat) => c.plats.find(p => p.kind === "shelf" && (p.el as HTMLElement).dataset.kind === "queue");

// お気に入りの背表紙が立っている棚へ行き、その前で丸くなる
function goFavorite(c: Cat, key: string, playing: boolean): boolean {
  const g = c.grid.getBoundingClientRect();
  const spines = [...c.grid.querySelectorAll<HTMLElement>(`.mod-shelf .spine[data-key="${CSS.escape(key)}"], .mod-shelf .face[data-key="${CSS.escape(key)}"]`)]
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
  for (const sp of spines) {
    const mod = sp.closest(".mod"), dest = mod && c.plats.find(p => p.kind === "shelf" && p.el === mod);
    if (!dest) continue;
    const r = sp.getBoundingClientRect(), x = clamp(r.left + r.width / 2 - g.left, lo(dest), hi(dest));
    if (samePlat(c.cur, dest) && Math.abs(c.x - x) < 6) return false; // もうそこにいる
    travel(c, dest, x, () => { c.favNap = true; go(c, playing ? "purr" : "lie", playing ? rnd(4, 7) : rnd(1.5, 3)); }, () => go(c, "sit"));
    return true;
  }
  return false;
}

function startFetch(c: Cat): boolean {
  if (!hooks || cats.some(o => o.fetch) || !queueBoard(c)) return false;
  const a = hooks.pick();
  if (!a) return false;
  beginFetch(c, a);
  return true;
}
function beginFetch(c: Cat, a: { key: string; art: string }, play = false) {
  c.fetch = { key: a.key, art: a.art, carrying: false, tries: 0, play };
  c.carry.style.background = a.art.startsWith("blob:") || a.art.startsWith("data:") || a.art.startsWith("http") ? `center / cover url("${a.art}")` : a.art;
  fetchStep(c);
}

/** ランダムで 1 枚: 猫が棚からアルバムを 1 枚くわえてきて、再生中のところへ置いて流す。
 *  頼める猫がいなければ false（呼び出し側でそのまま流す）。who を渡せばその子に頼む */
export function catPicksAlbum(who?: unknown): boolean {
  const a = hooks?.random?.();
  if (!a) return false;
  const free = (o: Cat) => !!o.cur && !o.fetch && !o.chase && !o.entering && !o.leaving && !["jump", "fall"].includes(o.state);
  const c = cats.find(o => o === who && free(o))
    // 起きている子から先に。寝ていたら起きて取りに行く
    ?? [...cats].filter(free).sort((x, y) => Number(x.state === "sleep") - Number(y.state === "sleep") || y.p.curious - x.p.curious)[0];
  if (!c) return false;
  release(c); c.woke = false;
  beginFetch(c, a, true);
  return true;
}

function fetchStep(c: Cat): void {
  const f = c.fetch!;
  // 運べなくなったら置いて座る（頼まれた 1 枚なら、そのまま流す）
  const cancel = () => { if (f.play) hooks?.play?.(f.key); c.fetch = undefined; c.carry.hidden = true; go(c, "sit"); };
  if (++f.tries > 12 || !c.cur) return cancel();
  const g = c.grid.getBoundingClientRect();
  if (!f.carrying) {
    if (c.state === "sit" && c.st > .8) { f.carrying = true; c.carry.hidden = false; return fetchStep(c); } // くわえた
    // その背表紙が立っている棚へ（「よく聴く」の棚があればそこから）
    const spines = [...c.grid.querySelectorAll<HTMLElement>(`.mod-shelf .spine[data-key="${CSS.escape(f.key)}"]`)].filter(el => el.getBoundingClientRect().width > 0);
    const sp = spines.find(el => el.closest<HTMLElement>(".mod")?.dataset.sort === "plays") ?? spines[0];
    const mod = sp?.closest(".mod");
    const src = mod && c.plats.find(p => p.kind === "shelf" && p.el === mod);
    if (!sp || !src) { f.carrying = true; c.carry.hidden = false; return fetchStep(c); } // 見当たらなければ、どこからか持ってきた
    const r = sp.getBoundingClientRect(), x = r.left + r.width / 2 - g.left;
    return travel(c, src, x, () => { face(c, { x } as Cat); go(c, "sit", 1); }, cancel);
  }
  // 頼まれた 1 枚は再生中のモジュールの上へ（なければ次に再生の棚、それもなければその場に置く）
  const player = f.play ? c.plats.find(p => p.kind === "top" && p.el.matches(".mod-player")) : undefined;
  const dst = player ?? queueBoard(c) ?? (f.play ? c.cur : undefined);
  if (!dst) return cancel();
  return travel(c, dst, samePlat(dst, c.cur) && f.play ? c.x : rnd(lo(dst), hi(dst)), () => {
    if (f.play) hooks?.play?.(f.key); else hooks?.deliver(f.key);
    c.fetch = undefined; c.carry.hidden = true;
    go(c, "purr", 3); // 置いて、得意げに喉を鳴らす
  }, cancel);
}

// 足場から足場へ、一跳びで届く道を探して（幅優先）、歩いて跳んでたどり着く
function travel(c: Cat, dest: Plat, x: number, then: () => void, fail: () => void, budget = 8, run = false): void {
  if (!c.cur || budget <= 0) return fail();
  if (samePlat(c.cur, dest)) return walkTo(c, x, then, run);
  const gap = (p: Plat, q: Plat) => Math.max(0, lo(q) - hi(p), lo(p) - hi(q));
  const linked = (p: Plat, q: Plat) => !samePlat(p, q) && Math.abs(p.y - q.y) <= REACH_Y && gap(p, q) <= REACH_X * .9 &&
    !(Math.abs(p.y - q.y) < 6 && p.x0 < q.x1 && p.x1 > q.x0);
  const prev = new Map<Plat, Plat>(), start = c.plats.find(p => samePlat(p, c.cur)) ?? c.cur, end = c.plats.find(p => samePlat(p, dest)) ?? dest;
  const queue = [start], seen = new Set([start]);
  while (queue.length && !seen.has(end)) {
    const p = queue.shift()!;
    for (const q of c.plats) if (!seen.has(q) && linked(p, q)) { seen.add(q); prev.set(q, p); queue.push(q); }
  }
  if (!seen.has(end)) return fail();
  let hop = end;
  while (prev.get(hop) !== start) hop = prev.get(hop)!;
  // 次の足場にいちばん近い所まで歩いてから跳ぶ
  const take = clamp(clamp(c.x, lo(hop), hi(hop)), lo(start), hi(start));
  walkTo(c, take, () => {
    const lx = reach(c, hop, clamp(c.x, lo(hop), hi(hop)));
    if (lx === undefined) return fail();
    leap(c, hop, lx, () => travel(c, dest, x, then, fail, budget - 1, run));
  }, run);
}


// ---------- 撫でる ----------
// 撫でた場所と向きで反応が変わる。頭・頬・あごはいちばん好き（数に入らない）。背中は毛並みに沿えば喜ぶが、
// 逆なでするとびくっと皮を震わせる。しっぽとお腹は嫌がる子が多い（お腹は、とても人なつこい子だけ許す）
function strokeCat(c: Cat, pts: [number, number][]) {
  if (!c.cur || ["jump", "fall", "walk", "annoyed", "eat", "scratch"].includes(c.state) || c.chase || c.fetch) return;
  const local = ([x, y]: [number, number]): V => [(x - c.x) / c.s * c.dir, (y - c.y) / c.s];
  const L = pts.map(local), mid = L[Math.floor(L.length / 2)];
  const along = L[L.length - 1][0] - L[0][0]; // 頭の向きを正。負なら頭からしっぽへ（毛並みに沿う）
  const sleeping = c.state === "sleep", pose = c.pose;
  const [hx, hy] = HEAD[sleeping ? "sleep" : pose];
  const near = (p: V) => Math.hypot(p[0] - (17 + hx), p[1] - (-27 + hy)) < 9;
  const zone = L.filter(near).length * 2 >= L.length || near(mid) ? "head"
    : pose === "sit" ? (mid[1] > -4.5 ? "tail" : mid[0] > 3 && mid[1] > -21 ? "chest" : "back")
    : mid[0] < (pose === "stand" ? -16 : -18) ? "tail"
    : mid[1] > (pose === "stand" ? -13 : -5) && mid[0] > -14 && mid[0] < 12 ? "belly" : "back";
  c.pets = c.pets.filter(t => c.t - t < 30);
  const fed = (n: number) => { for (let i = 0; i < n; i++) c.pets.push(c.t); return c.pets.length > c.patience; };
  const purr = () => { if (sleeping) c.woke = true; shine(c, zone === "back" ? .012 : .008); go(c, "purr"); }; // 毛並みに沿って撫でるほど、つやが出る
  const angry = () => go(c, "annoyed");
  const flinch = () => fed(2) ? angry() : go(c, "flinch");
  if (zone === "head") { c.pets = c.pets.slice(1); return purr(); } // いくら撫でても嫌がらない。むしろ機嫌が直る
  if (zone === "back") return along <= 2 ? (fed(1) ? angry() : purr()) : flinch();
  if (zone === "chest") return c.p.social > .4 ? (fed(1) ? angry() : purr()) : flinch();
  if (zone === "tail") { fed(3); return c.p.social > .75 ? go(c, "flinch") : angry(); }
  // お腹: 寝そべって見せていても、触ると前脚で払う子がほとんど
  if ((pose === "lie") && c.p.social > .7 && Math.random() < .5) return fed(1) ? angry() : purr();
  fed(3); return pose === "stand" ? go(c, "flinch") : angry();
}

// ---------- 寝言 ----------
const SLEEPTALK = ["…みゃ", "…ん", "むにゃ", "…ぷ", "…ゃ"];
function say(c: Cat, text: string) {
  const b = c.el.querySelector<HTMLElement>(".cat-say");
  if (!b) return;
  b.textContent = text; b.style.left = `${(30 + c.dir * 20) * c.s}px`;
  b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
}

// ---------- あくびの伝染 ----------
// あくびを見た近くの猫が、少し遅れて同じようにあくびをする。仲の良い相手ほどうつりやすい。うつったあくびはそれ以上うつさない
const caught = new WeakSet<Cat>();
function spreadYawn(c: Cat) {
  for (const o of cats) {
    if (o === c || !o.cur || o.state === "sleep" || busy(o) || Math.hypot(o.x - c.x, o.y - c.y) > 320) continue;
    if (Math.random() > .25 + .45 * bondOf(o, c)) continue;
    setTimeout(() => {
      if (!o.cur || busy(o) || !["sit", "lie", "stand"].includes(o.state)) return;
      caught.add(o); face(o, c); go(o, "yawn");
    }, rnd(900, 2600));
  }
}

// ---------- 箱 ----------
function goBox(c: Cat): boolean {
  const boxes = c.plats.filter(p => p.kind === "box" && !occupied(c, p));
  const box = boxes[Math.floor(Math.random() * boxes.length)];
  if (!box) return false;
  // 入ったら、まず顔を出してあたりを見回し、それから中で丸くなる
  travel(c, box, lo(box), () => go(c, "sit", rnd(3, 6)), () => go(c, "sit"));
  return true;
}

// ---------- 日向ぼっこ ----------
// 窓から差す日の光は、太陽の高さと向きで部屋の中を動く（朝は窓の右下、昼は真下、夕方は左下へ長く伸びる）。
// 窓辺の景色と同じ時刻の太陽（6 時〜18 時）を使う。雨の日と夜は差さない
interface Sun { p: Plat; x: number; w: number; k: number }
let sun: Sun | undefined, sunEl: HTMLElement | undefined;
function findSun(c: Cat): Sun | undefined {
  const sill = c.plats.find(p => p.kind === "sill");
  const now = new Date(), h = now.getHours() + now.getMinutes() / 60, sp = (h - 6) / 12;
  if (!sill || sp <= .02 || sp >= .98 || windowRain()) return undefined;
  const k = Math.min(1, Math.sin(Math.PI * sp) * 2.2); // 朝夕は弱い
  const wx = (sill.x0 + sill.x1) / 2, wy = sill.y, ww = sill.x1 - sill.x0;
  const elev = Math.max(.12, Math.sin(Math.PI * sp)) * 58 * Math.PI / 180;
  const slope = (.5 - sp) * 2 / Math.tan(elev); // 1px 下がるごとに横へずれる量
  let best: Sun | undefined;
  for (const p of c.plats) {
    if (p.kind === "sill" || p.kind === "box" || p.y < wy + 16) continue;
    const x = wx + (p.y - wy) * slope, w = Math.min(ww * .5, 150 + 120 * Math.min(1, Math.abs(slope)));
    if (x + w / 2 < p.x0 + 20 || x - w / 2 > p.x1 - 20) continue;
    if (!best || p.y < best.p.y) best = { p, x: clamp(x, p.x0 + w * .3, p.x1 - w * .3), w, k };
  }
  return best;
}
const inSun = (c: Cat) => !!c.cur && (c.cur.kind === "sill" ? !!sun || (new Date().getHours() >= 7 && new Date().getHours() < 17 && !windowRain()) : !!sun && samePlat(c.cur, sun.p) && Math.abs(c.x - sun.x) < sun.w / 2);
function goSun(c: Cat): boolean {
  if (!sun || occupied(c, sun.p) && cats.some(o => o !== c && samePlat(o.cur, sun!.p) && Math.abs(o.x - sun!.x) < 50)) return false;
  const s = sun;
  travel(c, s.p, clamp(s.x + rnd(-.2, .2) * s.w, lo(s.p), hi(s.p)), () => { c.favNap = true; go(c, "lie", rnd(2, 4)); }, () => go(c, "sit"));
  return true;
}
function paintSun() {
  const c = cats[0];
  sun = c ? findSun(c) : undefined;
  // 日だまりの光は、部屋の明かり（時刻の色味）を点けているときだけ描く。猫が日なたを好むのは変わらない
  if (!sun || !c || !roomLightOn()) { sunEl?.remove(); sunEl = undefined; return; }
  if (!sunEl || sunEl.parentElement !== c.grid) { sunEl?.remove(); sunEl = document.createElement("i"); sunEl.className = "cat-sun"; c.grid.append(sunEl); }
  Object.assign(sunEl.style, { left: `${(sun.x - sun.w / 2).toFixed(0)}px`, top: `${(sun.p.y - 14).toFixed(0)}px`, width: `${sun.w.toFixed(0)}px`, opacity: (sun.k * .9).toFixed(2) });
}

// ---------- ラグ ----------
// 床に敷いたラグ（room-things.ts の data-cat-rug）。床の足場のうち、ラグの幅のところ
function rugs(c: Cat): [number, number][] {
  const g = c.grid.getBoundingClientRect();
  return [...c.grid.querySelectorAll<HTMLElement>("[data-cat-rug]")].map(e => { const r = e.getBoundingClientRect(); return [r.left - g.left + r.width * .15, r.right - g.left - r.width * .15] as [number, number]; }).filter(([a, b]) => b > a);
}
const onRug = (c: Cat) => c.cur?.kind === "floor" && rugs(c).some(([a, b]) => c.x >= a && c.x <= b);
function goRug(c: Cat): boolean {
  const floor = c.plats.find(p => p.kind === "floor"), list = rugs(c), r = list[Math.floor(Math.random() * list.length)];
  if (!floor || !r) return false;
  travel(c, floor, clamp(rnd(r[0], r[1]), lo(floor), hi(floor)), () => { c.favNap = true; go(c, "lie", rnd(2, 4)); }, () => go(c, "sit"));
  return true;
}

// ---------- 来客の猫 ----------
// たまに、近所の野良猫が窓の外から覗きにくる。外の桟に前脚をかけて顔を出し、部屋の中を見回して、また降りていく。
// 部屋の猫は気づくと窓辺へ寄って、じっと見つめる（人なつこい子は耳を前へ、警戒する子はイカ耳で、しっぽの先を打つ）
let visitAt = performance.now() + rnd(90, 240) * 1000, visiting = false;
export function catVisit(): boolean {
  const win = document.querySelector<HTMLElement>(".grid .mod-window .win");
  if (!win || visiting || reduceMotion()) return false;
  const r = win.getBoundingClientRect();
  if (r.width < 150 || r.height < 110 || r.bottom < 0 || r.top > innerHeight) return false;
  visiting = true;
  // ガラスの範囲（mod-window の寸法と同じ計算。CSS ピクセル）。窓の中桟をまたがないよう、片側のガラスに出る
  const W = win.clientWidth, H = win.clientHeight, cw = Math.max(5, Math.min(W, H) * .045), over = cw * .7, Y1 = H - SILL;
  const rr = cw * .9, gx0 = over + cw + rr, gx1 = W - over - cw - rr, gy0 = cw + rr, gy1 = Y1 - cw * .5 - rr * .4;
  const mid = (gx0 + gx1) / 2, sf = Math.max(2, cw * .38) * 1.4, left = Math.random() < .5;
  const px0 = left ? gx0 : mid + sf, px1 = left ? mid - sf : gx1, pw = px1 - px0, ph = gy1 - gy0;
  const coat = randomCoat(), k = clamp(ph / 150, .5, .85), sc = S * k;
  const dir = Math.random() < .5 ? 1 : -1;
  const v = document.createElement("div");
  v.className = "cat-visitor";
  Object.assign(v.style, { left: `${px0}px`, top: `${gy0}px`, width: `${pw}px`, height: `${ph}px` });
  const h = new Date().getHours(), night = h < 6 || h >= 19;
  v.innerHTML = `<div class="cat" data-pose="sit" style="--s:${sc};filter:brightness(${night ? .42 : .8}) saturate(.8)"><svg viewBox="-30 -40 60 44" aria-hidden="true"><g transform="scale(${dir} 1)"><g class="cat-body">${art(coat)}</g></g></svg></div><i class="cv-glass"></i>`;
  win.append(v);
  const el = v.querySelector<HTMLElement>(".cat")!;
  const head = el.querySelector<SVGGElement>(".cat-head")!, ears = [...el.querySelectorAll<SVGGElement>("[data-ear]")];
  const fake = { back: false, pose: "sit", neck: [...el.querySelectorAll<SVGPolygonElement>(".cat-neck polygon")] } as unknown as Cat;
  const x = pw / 2 - 30 * sc + rnd(-.18, .18) * pw;
  const stay = rnd(10, 18), t0 = performance.now();
  let blinkAt = 1.5, earAt = 2, earT = -9, earWhich = 0, closed = false;
  const [hx, hy, hr] = HEAD.sit;
  const frame = (now: number) => {
    const t = (now - t0) / 1000;
    if (!v.isConnected) { visiting = false; return; }
    // 下からそっと顔を出す → 見回す → ゆっくり降りる。胸から上だけが見える
    const up = smooth(clamp(t / 1.6, 0, 1)) * (1 - smooth(clamp((t - stay) / 1.2, 0, 1)));
    const show = 16 * sc * up; // ガラスの下端から出ている高さ（頭と胸元だけ）
    el.style.transform = `translate(${x.toFixed(1)}px, ${(ph - show - 6 * sc).toFixed(1)}px)`;
    // 見回す: 部屋の中（こちら）と左右をゆっくり見て、ときどき小首をかしげる
    const look = 10 * Math.sin(t * .9) - 6 * Math.max(0, Math.sin(t * .37 + 1)) + (t > stay * .5 && t < stay * .5 + 1.2 ? 9 : 0);
    const ha = hr + look, back = Math.sin(t * .45) > .8;
    fake.back = back;
    head.setAttribute("transform", `translate(${hx} ${hy}) rotate(${ha.toFixed(1)} 13 -21)${back ? " translate(26 0) scale(-1 1)" : ""}`);
    drawNeck(fake, hx, hy, ha);
    // 耳: ときどき片方だけピクッと動かして、部屋の音を拾う
    if (t > earAt) { earT = t; earWhich = Math.random() < .5 ? 0 : 1; earAt = t + rnd(1.5, 4); }
    const e = t - earT < .22 ? -22 * Math.sin(Math.PI * (t - earT) / .22) : 0;
    ears.forEach((g, i) => g.setAttribute("transform", `rotate(${(i === earWhich ? e : 0).toFixed(1)} ${i ? "18.3 -31" : "14 -30.3"})`));
    if (t > blinkAt) { closed = !closed; blinkAt = t + (closed ? .14 : rnd(2, 5)); el.classList.toggle("closed", closed); }
    if (t > stay + 1.3) { v.remove(); visiting = false; return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // 部屋の猫が気づく
  setTimeout(() => {
    for (const c of cats) {
      if (!c.cur || c.with || c.chase || c.fetch || c.entering || c.leaving || ["jump", "fall", "walk", "eat"].includes(c.state)) continue;
      if (c.state === "sleep" && Math.random() > .25 + c.p.curious * .3) continue;
      if (Math.random() > .5 + c.p.curious * .45) continue;
      const sill = c.plats.find(p => p.kind === "sill");
      const vx = win.getBoundingClientRect().left - c.grid.getBoundingClientRect().left + px0 + x + 30 * sc; // 来客の居る所（grid の座標）
      const look = () => { c.dir = c.x < vx ? 1 : -1; go(c, "watch", Math.max(3, stay - 2)); };
      if (sill && !samePlat(c.cur, sill)) travel(c, sill, clamp(win.getBoundingClientRect().left - c.grid.getBoundingClientRect().left + px0 + pw / 2 + rnd(-70, 70), lo(sill), hi(sill)), look, look, 8, true); // 小走りで見にいく
      else look();
    }
  }, 1600);
  return true;
}
function maybeVisit() {
  const now = performance.now();
  if (visiting || now < visitAt || document.hidden || !cats.length) return;
  visitAt = now + rnd(5, 12) * 60000;
  catVisit();
}

// ---------- 猫じゃらし ----------
// 棒の先から糸で羽根を吊るした猫じゃらし。カーソルで棒を持ち、羽根は糸の先で重さどおりに揺れる。
// 羽根が足場の近くで動くと忍び寄って跳びかかり、上で揺れると垂直に跳んで前脚で叩く
interface Wand { el: HTMLElement; stick: SVGLineElement; str: SVGPolylineElement; fea: SVGGElement; px: number; py: number; fx: number; fy: number; vx: number; vy: number; speed: number; raf: number; last: number }
let wand: Wand | undefined;
export const wandOn = () => !!wand;
const STRING = 64;
export function toggleWand(on = !wand): boolean {
  if (!on) { if (wand) { cancelAnimationFrame(wand.raf); wand.el.remove(); removeEventListener("pointermove", wandMove); document.documentElement.classList.remove("wand"); } wand = undefined; return false; }
  if (wand) return true;
  const el = document.createElement("div");
  el.className = "cat-wand";
  el.innerHTML = `<svg width="100%" height="100%"><line class="cw-stick"/><polyline class="cw-string"/><g class="cw-feather">
    <polygon points="0,0 -4,10 -1,22 2,12" fill="#e98a6b"/><polygon points="0,0 4,9 3,20 0,12" fill="#f3c06b"/><polygon points="0,0 -1,8 -6,16 -4,8" fill="#7fb0c8"/>
    <circle r="2.6" cy="-1" fill="#d9b44a" stroke="#8a6d22" stroke-width=".6"/></g></svg>`;
  document.body.append(el);
  const px = innerWidth / 2, py = innerHeight / 2;
  wand = { el, stick: el.querySelector(".cw-stick")!, str: el.querySelector(".cw-string")!, fea: el.querySelector(".cw-feather")!, px, py, fx: px + 50, fy: py - 64 + STRING, vx: 0, vy: 0, speed: 0, raf: 0, last: performance.now() };
  addEventListener("pointermove", wandMove, { passive: true });
  document.documentElement.classList.add("wand");
  const w = wand;
  const step = (now: number) => {
    const dt = Math.min(.04, (now - w.last) / 1000); w.last = now;
    // 棒の先（カーソルの右上）から糸が下がる。羽根は重力と空気抵抗で揺れ、糸が張ると引き戻される
    const tx = w.px + 48, ty = w.py - 66;
    w.vy += 900 * dt; w.vx *= Math.exp(-dt * 1.6); w.vy *= Math.exp(-dt * 1.6);
    w.fx += w.vx * dt; w.fy += w.vy * dt;
    const dx = w.fx - tx, dy = w.fy - ty, d = Math.hypot(dx, dy);
    if (d > STRING) {
      const nx = dx / d, ny = dy / d;
      w.fx = tx + nx * STRING; w.fy = ty + ny * STRING;
      const vr = w.vx * nx + w.vy * ny; if (vr > 0) { w.vx -= vr * nx; w.vy -= vr * ny; }
    }
    w.speed += (Math.hypot(w.vx, w.vy) - w.speed) * Math.min(1, dt * 6);
    w.stick.setAttribute("x1", String(w.px)); w.stick.setAttribute("y1", String(w.py)); w.stick.setAttribute("x2", String(tx)); w.stick.setAttribute("y2", String(ty));
    // 糸はたるみを少しだけ見せる
    const sag = Math.max(0, STRING - d) * .5, mx = (tx + w.fx) / 2, my = (ty + w.fy) / 2 + sag;
    w.str.setAttribute("points", `${tx},${ty} ${mx.toFixed(1)},${my.toFixed(1)} ${w.fx.toFixed(1)},${w.fy.toFixed(1)}`);
    const ang = Math.atan2(w.fx - mx, w.fy - my) * -180 / Math.PI;
    w.fea.setAttribute("transform", `translate(${w.fx.toFixed(1)} ${w.fy.toFixed(1)}) rotate(${(ang + clamp(-w.vx * .03, -30, 30)).toFixed(1)})`);
    w.raf = requestAnimationFrame(step);
  };
  w.raf = requestAnimationFrame(step);
  return true;
}
function wandMove(e: PointerEvent) { if (wand) { wand.px = e.clientX; wand.py = e.clientY; } }
addEventListener("keydown", e => { if (e.key === "Escape" && wand) toggleWand(false); });
/** 狙う相手: 猫じゃらしを出していれば羽根、なければカーソル（grid の座標） */
function target(c: Cat): [number, number] | undefined {
  if (!wand) return toyAt(c) ?? c.mouse;
  const g = c.grid.getBoundingClientRect();
  return [wand.fx - g.left, wand.fy - g.top];
}
/** 押さえた・叩いた羽根を弾く */
function kickFeather(c: Cat) {
  if (!wand) return;
  const [fx, fy] = target(c)!;
  if (Math.hypot(fx - c.x, fy - (c.y - 20 * c.s)) > 90 * c.s / S + 40) return;
  wand.vx += c.dir * rnd(180, 320); wand.vy -= rnd(120, 260);
}
function wandPlay(c: Cat) {
  const [fx, fy] = target(c)!, p = c.cur!, top = c.y - 34 * c.s;
  if (wand!.speed < 25 && Math.random() < .995) return; // 止まっている羽根には飽きる
  const keen = .3 + .6 * c.p.playful;
  // 真上で揺れている: 垂直に跳んで前脚で叩く
  if (Math.abs(fx - c.x) < 46 * c.s / S + 20 && fy < top - 8 && top - fy < 170) {
    c.huntCool = c.t + rnd(1.2, 3);
    if (Math.random() > keen) return;
    c.dir = fx < c.x ? -1 : 1;
    const tx = clamp(fx, lo(p), hi(p));
    c.dest = p; c.cur = undefined;
    launch(c, tx, p.y, Math.max(8 * c.s, c.y - fy - 34 * c.s), .22);
    go(c, "jump");
    c.after = () => { kickFeather(c); go(c, Math.random() < .5 ? "stand" : "sit", rnd(.8, 1.6)); };
    setTimeout(() => kickFeather(c), 260);
    return;
  }
  // 別の足場の上（近く）で揺れている: そこへ跳び移って押さえる
  if (!prey(c) && Math.hypot(fx - c.x, fy - c.y) < 380) {
    const q = c.plats.find(q => !samePlat(q, p) && fx > q.x0 && fx < q.x1 && fy > q.y - 90 && fy < q.y + 6);
    const lx = q && reach(c, q, fx);
    c.huntCool = c.t + rnd(1.5, 4);
    if (q && lx !== undefined && Math.random() < keen) leap(c, q, lx, () => { go(c, "poke", rnd(1, 1.6)); kickFeather(c); });
  }
}


// ---------- 抱っこ ----------
// 長押しで持ち上げる。人なつこい子はおとなしく抱かれ、そうでない子はすぐに身をよじって降りたがる。
// 離すと、その下の段へ降りる（高ければ跳び降りる）。降りたあと、気にしない子は座り、気にする子は身づくろいで気を落ち着ける
function pickUp(c: Cat, at: [number, number]): boolean {
  if (!c.cur || c.chase || c.fetch || c.entering || c.leaving || c.stage || ["jump", "fall", "annoyed"].includes(c.state)) return false;
  release(c);
  if (eater === c) eater = undefined;
  const ok = c.state === "sleep" ? .8 : .6 + c.p.social * 7 * (.5 + bondPeople(c)); // 我慢できる秒数
  c.held = { px: at[0], py: at[1], sx: at[0], sy: at[1] + 6, sway: 0, ok };
  c.cur = undefined;
  go(c, "held");
  c.el.classList.add("held");
  return true;
}
/** 撫でてもらった回数が多いほど、抱っこにも慣れる（0〜1） */
const bondPeople = (c: Cat) => clamp(c.pets.length / Math.max(1, c.patience), 0, 1) * .3 + .7 * c.p.social;
function letGo(c: Cat) {
  if (c.state !== "held") return;
  const calm = !c.held || c.st < c.held.ok;
  c.held = undefined;
  c.el.classList.remove("held");
  c.pose = "stand"; c.el.dataset.pose = "stand";
  c.state = "fall"; // drop() が着地まで面倒を見る
  drop(c);
  const after = () => calm ? go(c, Math.random() < .5 ? "sit" : "stand", rnd(1, 3)) : go(c, "selfgroom");
  if (!c.cur) c.after = after; else after(); // その場の高さに段があれば、そのまま降りる
}

// ---------- 音楽の好き嫌い ----------
// 猫ごとに、ジャンル（なければアーティスト）ごとの好き嫌いがある。はじめは生まれつきの小さな好みだけで、
// 曲が流れている間の過ごし方で育つ: そばでくつろいだり眠ったりした曲は好きに、大きな音で落ち着けなかった曲は苦手になる。
// 好きな曲がかかるとプレーヤーのそばへ来て喉を鳴らし、しっぽをよく振る。苦手な曲だと耳を伏せて離れていく
const likeOf = (c: Cat, label: string) => c.coat.likes?.[label] ?? (seeded(nameOf(c.coat) + label)() - .5) * .5;
let tasteAt = "", tasteSaved = 0;
function learnTaste() {
  const key = hooks?.nowPlaying?.(), label = key ? hooks?.tasteOf?.(key) : undefined;
  if (!label || !music) { tasteAt = ""; return; }
  let changed = false;
  for (const c of cats) {
    if (!c.cur) continue;
    let d = 0;
    const warm = c.cur.kind === "top" && c.cur.el.matches(".mod-player");
    if (["sleep", "purr", "lie", "groomed"].includes(c.state) && ear.loud < .75) d += .004 * (warm ? 2 : 1);
    if (ear.loud > .75) d -= .005 * c.p.sleepy;
    if (c.state === "annoyed" || c.state === "flinch") d -= .006;
    if (!d) continue;
    c.coat.likes = c.coat.likes ?? {};
    c.coat.likes[label] = clamp(likeOf(c, label) + d, -1, 1);
    changed = true;
  }
  if (changed && performance.now() - tasteSaved > 60000) { tasteSaved = performance.now(); hooks?.saveCoats?.(); }
  // 曲（アルバム）が変わったら、好き嫌いで動く
  if (key === tasteAt) return;
  tasteAt = key!;
  for (const c of cats) {
    const like = likeOf(c, label);
    if (!c.cur || busy(c) || c.state === "held" || (c.state === "sleep" && like < .6)) continue;
    setTimeout(() => {
      if (!c.cur || busy(c)) return;
      if (like > .3 && Math.random() < like) goListen(c);
      else if (like < -.3 && Math.random() < -like) { go(c, "flinch"); c.cont = undefined; setTimeout(() => { if (c.state === "flinch" || c.state === "sit" || c.state === "stand") stalkOff(c); }, 1200); }
    }, rnd(800, 4000));
  }
}
function goListen(c: Cat) {
  const p = c.plats.find(p => p.kind === "top" && p.el.matches(".mod-player"));
  const purr = () => { if (c.state === "sleep") c.woke = true; go(c, "purr"); };
  if (!p || samePlat(p, c.cur)) return purr();
  travel(c, p, rnd(lo(p), hi(p)), purr, () => go(c, "sit"));
}
/** カードに出す: いちばん好きな音楽・苦手な音楽 */
function tastes(c: Cat): { love?: string; hate?: string } {
  const e = Object.entries(c.coat.likes ?? {}).sort((a, b) => b[1] - a[1]);
  return { love: e[0] && e[0][1] > .3 ? e[0][0] : undefined, hate: e.length && e[e.length - 1][1] < -.3 ? e[e.length - 1][0] : undefined };
}


// ---------- 毛づや ----------
// 撫でてもらうほど、ほかの猫に毛づくろいしてもらうほど、毛並みに少しずつつやが出る（背中に光の筋が浮く）。
// 何日も撫でないと、ゆっくり元に戻る
let glossSaved = 0;
function shine(c: Cat, d: number) {
  const C = c.coat, day = Math.floor(Date.now() / 864e5);
  const last = (C as Coat & { glossDay?: number }).glossDay ?? day;
  const g = clamp((C.gloss ?? 0) * Math.pow(.97, Math.max(0, day - last)) + d * (1 - (C.gloss ?? 0) * .7), 0, 1);
  C.gloss = g; (C as Coat & { glossDay?: number }).glossDay = day;
  c.el.style.setProperty("--gloss", g.toFixed(3));
  if (performance.now() - glossSaved > 20000) { glossSaved = performance.now(); hooks?.saveCoats?.(); }
}

// ---------- 夜の運動会 ----------
// 深夜（23 時〜4 時）にときどき、1 匹が急に走り出して棚から棚へ跳び回る。遊び好きな子は加わって追いかける。
// 設定でやめられる。動きを減らす設定のときはしない
function zoomies(c: Cat, secs = rnd(14, 26)): boolean {
  if (!c.cur || c.fetch || c.chase || c.stage || c.state === "held" || c.state === "jump" || c.state === "fall") return false;
  release(c);
  c.zoom = c.t + secs;
  if (c.state === "sleep") c.woke = true;
  c.run = true;
  zoomStep(c);
  // 起きている遊び好きな子が、少し遅れて加わる
  for (const o of cats) if (o !== c && !o.zoom && o.state !== "sleep" && Math.random() < o.p.playful * .7)
    setTimeout(() => { if (!o.zoom && o.cur && !busy(o)) { o.zoom = o.t + secs * .7; o.run = true; zoomStep(o); } }, rnd(800, 3000));
  return true;
}
function zoomStep(c: Cat): void {
  if (!c.cur) return;
  if (c.t > (c.zoom ?? 0)) { c.zoom = undefined; c.run = false; return go(c, Math.random() < .5 ? "selfgroom" : "sit"); } // 走り終えたら、何事もなかったように身づくろい
  const r = Math.random(), p = c.cur;
  if (r < .1) return go(c, "stand", rnd(.3, .7)); // 急に止まって、あたりをうかがう
  if (r < .6) { const j = jumpTarget(c); if (j) { c.run = true; leap(c, j[0], j[1]); c.run = true; return; } } // 着地したらすぐ次へ
  const far = c.x - lo(p) > hi(p) - c.x ? lo(p) : hi(p);
  if (Math.abs(far - c.x) > 30) return walkTo(c, far + rnd(-20, 20), undefined, true);
  const j = jumpTarget(c);
  if (j) { c.run = true; leap(c, j[0], j[1]); c.run = true; return; }
  go(c, "stand", .4);
}
function maybeZoomies() {
  const h = new Date().getHours();
  if (!(h >= 23 || h < 4) || !prefs().catZoomies || reduceMotion() || document.hidden || cats.some(c => c.zoom)) return;
  if (Math.random() > .004) return; // 3 秒ごとに見て、だいたい 10〜15 分に 1 回
  const awake = cats.filter(c => c.cur && !busy(c) && c.state !== "sleep");
  const c = (awake.length ? awake : cats)[Math.floor(Math.random() * (awake.length || cats.length))];
  if (c) zoomies(c);
}


// ---------- 窓辺の鳥 ----------
// 晴れた朝、窓の外に小鳥がとまると（窓辺のモジュールが "kona:bird" を出す）、起きている猫は窓辺へ寄って
// 歯をカカカと鳴らし、遊び好きな子はガラス越しに跳びかかる。跳びかかると鳥は驚いて飛び去る（"kona:bird-scare"）
let bird: { x: number; y: number } | undefined; // 鳥の足もと（画面の座標）
const birdX = (c: Cat) => bird ? bird.x - c.grid.getBoundingClientRect().left : c.x;
function faceBird(c: Cat) { if (bird) c.dir = birdX(c) < c.x ? -1 : 1; }
function goBird(c: Cat) {
  const sill = c.plats.find(p => p.kind === "sill");
  if (!sill || !bird) return;
  const bx = birdX(c), side = c.x < bx ? -1 : 1, x = clamp(bx + side * rnd(40, 70), lo(sill), hi(sill));
  const watch = () => { faceBird(c); go(c, "chatter", rnd(4, 8)); };
  if (samePlat(c.cur, sill)) return walkTo(c, x, watch);
  travel(c, sill, x, watch, () => go(c, "sit"), 8, true);
}
function birdPounce(c: Cat) {
  const p = c.cur!, bx = clamp(birdX(c), lo(p), hi(p));
  faceBird(c);
  leap(c, p, bx, () => { document.dispatchEvent(new CustomEvent("kona:bird-scare")); go(c, "poke", rnd(.8, 1.3)); }, { prep: .12, wig: rnd(.4, .7) });
}
document.addEventListener("kona:bird", e => {
  const d = (e as CustomEvent<{ state: "land" | "leave"; x?: number; y?: number }>).detail;
  if (d?.state === "land" && d.x !== undefined && d.y !== undefined) {
    bird = { x: d.x, y: d.y };
    for (const c of cats) {
      if (c.stage || c.zoom) continue;
      if (c.state === "sleep" && Math.random() > .2 + c.p.curious * .2) continue; // 眠りの浅い子だけ気づく
      if (Math.random() > .35 + .5 * Math.max(c.p.curious, c.p.playful)) continue;
      setTimeout(() => {
        if (!bird || !c.cur || busy(c) || c.state === "held") return;
        if (c.state === "sleep") { c.woke = true; go(c, "yawn"); setTimeout(() => { if (bird && c.cur && !busy(c)) goBird(c); }, 2500); return; }
        goBird(c);
      }, rnd(400, 3500));
    }
  } else if (d?.state === "leave") {
    bird = undefined;
    // 見送ったあと、しばらく窓の外を見ている
    for (const c of cats) if (c.state === "chatter") c.left = Math.min(c.left, rnd(1, 3));
  }
});

/** 開発時の確認用: いまいる猫たち */
/** いる猫の名前（呼んだ順） */
/** 毛並みの持ち物（アクセサリー・通りすがりかどうか）が変わったら、描き直す */
export function restyleCat(coat: Coat) {
  for (const c of cats) if (c.coat === coat) {
    const g = c.el.querySelector(".cat-acc");
    if (g) g.innerHTML = coat.stray ? "" : accArt(coat.acc);
    c.el.classList.toggle("stray", !!coat.stray);
  }
}
export const catNames = () => cats.filter(c => !c.stage).map(c => nameOf(c.coat));
export const debugCats = () => cats;
export const debugEar = () => ear;
export const debugDo = { walk: (c: unknown, x: number) => { (c as Cat).state = "stand"; walkTo(c as Cat, x); }, go: (c: unknown, s: string) => go(c as Cat, s as State), zoom: (c: unknown) => zoomies(c as Cat), shine: (c: unknown, d: number) => shine(c as Cat, d), taste: () => ({ music, tasteAt, now: hooks?.nowPlaying?.(), label: hooks?.nowPlaying?.() ? hooks?.tasteOf?.(hooks.nowPlaying()!) : undefined }), goBox: (c: unknown) => goBox(c as Cat), goSun: (c: unknown) => goSun(c as Cat), stroke: (c: unknown, pts: [number, number][]) => strokeCat(c as Cat, pts), sun: () => { paintSun(); return sun; } };

// ---------- リスニングパーティーの部屋の猫 ----------
// 部屋に入った人の分身。自分では動き回らず、飼い主の操作（クリックした先へ歩く・しぐさ）だけをする。
// 目線は飼い主のカーソル。足場は部屋の家具（[data-cat-plat]）と床。位置は「何番目の足場の、幅の何割の所」で
// やり取りするので、画面の大きさが違う人どうしでも同じ所にいる
export type Emote = "stand" | "sit" | "lie" | "sleep" | "wag" | "groove" | "groom" | "stretch" | "yawn";
export const EMOTES: Emote[] = ["stand", "sit", "lie", "sleep", "wag", "groove", "groom", "stretch", "yawn"];
interface Pup { plat: number; fx: number; emote: Emote; going: number; enter?: boolean; later?: boolean }
export interface Puppet {
  /** plat 番目の足場の、幅の fx 割（0〜1）の所へ行く */
  go(plat: number, fx: number): void;
  emote(e: Emote): void;
  /** 通話で話している（名札に印を出す） */
  talk(on: boolean): void;
  /** 目線の先（部屋の中の割合 0〜1）。undefined なら前を見る */
  look(p?: [number, number]): void;
  /** 吹き出し（文字だけ。HTML としては読まない） */
  say(text: string, secret?: boolean): void;
  readonly where: { plat: number; fx: number; emote: Emote };
  remove(): void;
}
const ONE_SHOT: Partial<Record<Emote, number>> = { stretch: 3, yawn: 2 };
function pupPlats(room: HTMLElement): Plat[] {
  const g = room.getBoundingClientRect(), out: Plat[] = [];
  for (const e of room.querySelectorAll<HTMLElement>("[data-cat-plat]")) {
    const r = e.getBoundingClientRect();
    out.push({ el: e, kind: "deck", y: r.top - g.top + Number(e.dataset.sink ?? 0), x0: r.left - g.left + 2, x1: r.right - g.left - 2, pull: 1 });
  }
  out.push({ el: room, kind: "floor", y: g.height - 24, x0: 0, x1: g.width, pull: 1 });
  return out;
}
function pupState(e: Emote): [State, number] {
  const m: Record<Emote, State> = { stand: "stand", sit: "sit", lie: "lie", sleep: "sleep", wag: "sit", groove: "sit", groom: "selfgroom", stretch: "stretch", yawn: "yawn" };
  return [m[e], ONE_SHOT[e] ?? 1e6];
}
function pupRest(c: Cat) { const [st, d] = pupState(c.stage!.pup!.emote); go(c, st, d); }
function pupNext(c: Cat) {
  const pp = c.stage!.pup!;
  if (ONE_SHOT[pp.emote]) pp.emote = "sit"; // 伸び・あくびは一度だけ。終わったら座る
  pupRest(c);
}
/** 足場をまたいで歩く: 跳び移れる足場をたどる道すじ（幅優先）を探し、一段ずつ歩いて跳ぶ */
// 部屋（パーティー）の段は間が広いことがあるので、届かないときは跳べる高さを広げてもう一度探す（下へは高さを問わず飛び降りる）
const PUP_UP = [REACH_Y - 10, REACH_Y * 1.8];
function pupPath(c: Cat, from: Plat, to: Plat, up = PUP_UP[0]): Plat[] {
  const gap = (a: Plat, b: Plat) => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
  const ok = (a: Plat, b: Plat) => !samePlat(a, b) && (b.y > a.y ? up > REACH_Y || b.y - a.y <= up : a.y - b.y <= up) && gap(a, b) <= REACH_X - 20;
  const prev = new Map<Plat, Plat>(), q = [from], seen = new Set([from]);
  while (q.length) {
    const a = q.shift()!;
    if (samePlat(a, to)) { const path: Plat[] = []; for (let x: Plat | undefined = a; x && x !== from; x = prev.get(x)) path.unshift(x); return path; }
    for (const b of c.plats) if (!seen.has(b) && ok(a, b)) { seen.add(b); prev.set(b, a); q.push(b); }
  }
  return [];
}
function pupGo(c: Cat, pi: number, fx: number) {
  const pp = c.stage!.pup!, go_ = ++pp.going;
  const p = c.plats[clamp(pi, 0, c.plats.length - 1)];
  if (!p) return;
  if (!c.cur) { pp.later = true; return; } // 飛び込んでいる途中: 着いてから向かう
  pp.later = false;
  const live = () => pp.going === go_;
  const x = clamp(p.x0 + fx * (p.x1 - p.x0), lo(p), hi(p));
  const done = () => { if (live()) pupRest(c); };
  // 遠ければ小走りで（部屋ではのんびり歩きすぎない）
  const walk = (to: number, then: () => void) => walkTo(c, to, then, Math.abs(to - c.x) > 160);
  const arrive = () => { if (!live()) return; Math.abs(x - c.x) < 2 ? done() : walk(x, done); };
  const from = c.plats.find(q => samePlat(q, c.cur)) ?? c.cur;
  let path = samePlat(from, p) ? [] : pupPath(c, from, p);
  if (!samePlat(from, p) && !path.length) path = pupPath(c, from, p, PUP_UP[1]);
  if (!samePlat(from, p) && !path.length) return done(); // 届かない所はあきらめて、その場で
  const hop = (i: number) => {
    if (!live()) return;
    if (i >= path.length) return arrive();
    const nx = path[i], last = i === path.length - 1;
    // 跳ぶ先の着地点: 最後の段なら目当ての所、途中の段なら今の足場に近い所
    const aim = last ? x : clamp(c.x, lo(nx), hi(nx));
    const launchX = clamp(aim, lo(c.cur!), hi(c.cur!));
    // 道すじで選んだ段へは、ふだんより高くても跳ぶ（横の届く距離はふだんどおり）
    const far = (at: number) => { if (!c.cur || samePlat(nx, c.cur)) return undefined; const a = Math.max(lo(nx), at - REACH_X), b = Math.min(hi(nx), at + REACH_X); return b < a ? undefined : clamp(aim, a, b); };
    const jump = () => {
      if (!live()) return;
      const r = reach(c, nx, aim) ?? far(c.x);
          if (r === undefined) return done();
      leap(c, nx, r, () => hop(i + 1));
    };
    if ((reach(c, nx, aim) ?? far(c.x)) !== undefined) jump(); else walk(launchX, jump);
  };
  hop(0);
}
/** enter: 置くときに、上から飛び込んでくる */
export function puppetCat(room: HTMLElement, coat: Coat, at: { plat: number; fx: number; emote: Emote }, size = 1, enter = false): Puppet {
  const pup: Pup = { plat: at.plat, fx: at.fx, emote: at.emote, going: 0, enter };
  const c = addCat(room, coat, { sleep: 0, pup }, size);
  c.layer.classList.add("cat-room");
  let sayT = 0;
  return {
    go(plat, fx) {
      pup.plat = plat; pup.fx = clamp(fx, 0, 1);
      if (pup.emote !== "groove" && pup.emote !== "wag") pup.emote = "stand"; // 歩いて着いたら立ったまま（リズム・しっぽはそのまま続ける）
      pupGo(c, plat, pup.fx);
    },
    emote(e) {
      pup.emote = e;
      if (c.state === "walk" || c.state === "jump" || c.state === "fall") return; // 着いてから
      pupRest(c);
    },
    look(p) {
      if (!p) { c.mouse = undefined; return; }
      const g = c.grid.getBoundingClientRect();
      c.mouse = [p[0] * g.width, p[1] * g.height];
    },
    say(text, secret = false) {
      let b = c.el.querySelector<HTMLElement>(".cat-bubble");
      if (!b) { b = document.createElement("span"); b.className = "cat-bubble"; c.el.append(b); }
      b.textContent = text; b.classList.toggle("secret", secret); b.hidden = false;
      clearTimeout(sayT);
      sayT = window.setTimeout(() => { if (b) b.hidden = true; }, Math.min(12_000, 3500 + text.length * 120));
    },
    get where() {
      return { plat: pup.plat, fx: pup.fx, emote: pup.emote };
    },
    talk(on) { c.el.classList.toggle("talking", on); },
    remove() { clearTimeout(sayT); removeCat(c); },
  };
}
