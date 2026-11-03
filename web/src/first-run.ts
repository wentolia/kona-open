// はじめて開いたときの部屋: 作者が整えたホーム（配置・部屋・窓・床と壁の品・棚の上の小物・テーマ・時計・スペクトラム・書体）を、そのまま最初の状態にする。
// Kona のものが何も残っていない（はじめての）ときだけ書き込む。もう使っている人の配置や猫は変えない。
// 音楽のファイル・フォルダ・Drive・Spotify・聴いた記録・タグなど、ライブラリに結びつくものは含めない。
// 包みで届く品も一部置いている（植物など）。置いた品は起動時に「持っている」ことになり、包みの山札からは外れる（presents.ts の seedPresents）

import { t } from "./i18n";
import type { ModuleDef } from "./shelves";
import type { Home } from "./layout";
import { firstCats } from "./cat-coat";

function seed() {
  const shelf = (id: string, kind: ModuleDef["kind"], title: string, extra: Partial<ModuleDef> = {}): ModuleDef =>
    ({ id, type: "shelf", kind, title, w: 1, height: 180, facePos: 0, ...extra });
  const mod = (id: string, type: ModuleDef["type"], title: string, height: number): ModuleDef => ({ id, type, title, w: 1, height, facePos: 0 });

  const clock = mod("qawc05e", "clock", t("時計"), 170);
  const goods = shelf("xyuiiip", "goods", t("雑貨"), { w: .5, query: "", goods: ["vase", "mug"] });
  const queue = shelf("7geneo6", "queue", t("次に再生"), { goods: ["records", "cactus", "pinebonsai"] });
  const win = mod("5doa618", "window", t("窓辺"), 200);
  const player = mod("86oze8k", "player", t("再生中"), 220);
  const spectrum = mod("sdm30qh", "spectrum", t("スペクトラム"), 220);
  const folders = shelf("5owrkf6", "search", t("フォルダ"), { w: .5, query: "", sort: "title", folderGaps: true, goods: ["knit"], goodsAt: { knit: .957 } });
  const recent = shelf("ck7l74r", "search", t("最近聴いたアルバム"), { w: .5, query: "", sort: "last" });
  const fav = shelf("18165ci", "search", t("お気に入り"), { w: .5, query: t("tag:お気に入り") });
  const often = shelf("1r5fe69", "search", t("よく聴く"), { w: .5, query: "", sort: "plays", goods: ["figcat", "bowl", "jar", "incense"] });
  const wave = mod("gh5j85l", "waveform", t("波形"), 110);
  const mods = [player, queue, folders, often, win, spectrum, wave, recent, goods, clock, fav];

  const col = (w: number, ...ids: string[]) => ({ w, stack: ids.map(id => ({ id, h: 1 / ids.length })) });
  const home: Home = { rows: [
    { height: 210, cols: [col(.12, clock.id, goods.id), col(.523, queue.id), col(.357, win.id)] },
    { height: 238, cols: [col(.88, player.id), col(.12, spectrum.id)] },
    { height: 179, cols: [col(1, folders.id)] },
    { height: 127, cols: [col(.372, recent.id), col(.234, fav.id), col(.394, often.id)] },
    { height: 60, cols: [col(1, wave.id)] },
  ] };

  // 床と壁（x/y は 0〜1 の位置、d は奥行き、s は大きさ）
  const things = { v: 2, items: [
    { id: "tower", k: "tower", x: .985, s: .59 }, { id: "box", k: "box", x: .023 }, { id: "food", k: "food", x: .188, s: 1.25 },
    { id: "sofa", k: "sofa", x: .567 }, { id: "kilim", k: "kilim", x: .549, s: 1.5 }, { id: "scratcher", k: "scratcher", x: .899, d: .1, s: 1.11 },
    { id: "cushion", k: "cushion", x: .636 }, { id: "round", k: "round", x: .984, s: 1.22 },
    { id: "catwalk", k: "catwalk", x: .897, y: .917, s: 1.37 }, { id: "basket", k: "basket", x: .313, d: .05, s: .88 },
    { id: "paperbag", k: "paperbag", x: .122, s: .71 }, { id: "speaker", k: "speaker", x: .399, d: .15 }, { id: "speaker-2", k: "speaker", x: .696, d: .75 },
    { id: "sidetable", k: "sidetable", x: .434, s: .5 }, { id: "swag", k: "swag", x: .467, y: .921, s: .8 },
    { id: "calendar", k: "calendar", x: .616, y: 0 }, { id: "floorlamp", k: "floorlamp", x: .354, d: .6, s: .83 },
    { id: "lemon", k: "lemon", x: .775, d: .8 }, { id: "monstera", k: "monstera", x: .742, d: .1, s: .5 },
    { id: "snakeplant", k: "snakeplant", x: .138, d: .55 }, { id: "ficus", k: "ficus", x: .098, d: .4, s: .72 }, { id: "olive", k: "olive", x: .905, s: .82 },
  ] };

  const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
  put("kona.layout", mods);
  put("kona.home", home);
  put("kona.cats", firstCats().slice(0, 1)); // 猫は最初は 1 匹（シャム）。ほかの子は通りすがりで来る
  put("kona.room", { wall: "plaster", floor: "walnut" });
  put("kona.window", { scene: "mountain", room: true });
  put("kona.things", things);
  put("kona.itemlit", ["floorlamp"]);
  put("kona.objects", { lamp: true, hide: [], placed: true,
    size: { vase: 1.5, knit: 1.29, bowl: 1.5, incense: 1.5, mug: 1.5, figcat: 1.5, cactus: .82, pinebonsai: .8 } });
  put("kona.theme", { fixed: "moon", custom: { bg: "#1d1b26", accent: "#c9a0f0" } });
  put("kona.clock", { kind: "digital", chime: true });
  put("kona.spectrum", { style: "bars", shape: "circle", dir: "out", size: 1 });
  put("kona.prefs", { font: "mincho" }); // ほかの項目（言語など）は既定のまま
}

try {
  if (!Object.keys(localStorage).some(k => k.startsWith("kona"))) seed();
} catch { /* 保存できないときは、いつもの既定のまま */ }
