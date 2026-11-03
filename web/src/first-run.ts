// はじめて開いたときの部屋: デモ版で整えた配置・猫・棚の上の小物を、そのまま最初の状態にする。
// Kona のものが何も残っていない（はじめての）ときだけ書き込む。もう使っている人の配置や猫は変えない。
// 音楽のファイル・フォルダ・Drive・Spotify・聴いた記録など、ライブラリに結びつくものは含めない。

import { newId, type ModuleDef } from "./shelves";
import type { Home } from "./layout";
import { firstCats } from "./cat-coat";

function seed() {
  const shelf = (kind: ModuleDef["kind"], title: string, extra: Partial<ModuleDef> = {}): ModuleDef =>
    ({ id: newId(), type: "shelf", kind, title, w: 1, height: 180, facePos: 0, ...extra });
  const mod = (type: ModuleDef["type"], title: string, height: number): ModuleDef => ({ id: newId(), type, title, w: 1, height });

  const clock = mod("clock", "時計", 170), goods = shelf("goods", "雑貨", { goods: ["records", "vase"] }), queue = shelf("queue", "次に再生"), win = mod("window", "窓辺", 200);
  const player = mod("player", "再生中", 220);
  const all = shelf("search", "すべて", { query: "", facePos: .22 }), food = mod("catfood", "猫のごはん", 110), tower = mod("cattower", "キャットタワー", 380);
  const box = mod("catbox", "箱（紙袋）", 120), often = shelf("search", "よく聴く", { query: "", sort: "plays" }), recent = shelf("search", "最近聴いた", { query: "", sort: "last" }),
    night = shelf("search", "夜", { query: "mood:夜", sort: "hue" }), quiet = shelf("search", "静か", { query: "mood:静か", sort: "hue" });
  const wave = mod("waveform", "波形", 110);
  const dist = mod("distance", "聴いた距離", 140), eq = mod("eq", "イコライザー", 220), out = mod("output", "出力", 170);
  const mods = [clock, goods, queue, win, player, all, food, tower, box, often, recent, night, quiet, wave, dist, eq, out];

  const col = (w: number, ...ids: string[]) => ({ w, stack: ids.map(id => ({ id, h: 1 / ids.length })) });
  const home: Home = { rows: [
    { height: 270, cols: [col(.15, clock.id, goods.id), col(.47, queue.id), col(.38, win.id)] },
    { height: 320, cols: [col(1, player.id)] },
    { height: 240, cols: [col(.76, all.id), col(.12, food.id), col(.12, tower.id)] },
    { height: 190, cols: [col(.12, box.id), col(.25, often.id), col(.31, recent.id), col(.15, night.id), col(.17, quiet.id)] },
    { height: 80, cols: [col(1, wave.id)] },
    { height: 300, cols: [col(.33, dist.id), col(.28, eq.id), col(.39, out.id)] },
  ] };

  localStorage.setItem("kona.layout", JSON.stringify(mods));
  localStorage.setItem("kona.home", JSON.stringify(home));
  localStorage.setItem("kona.cats", JSON.stringify(firstCats()));
  localStorage.setItem("kona.clock", JSON.stringify({ kind: "analog", chime: false }));
  // 雑貨の棚には、きょうのレコードと季節の切り花だけ（ほかの小物は、どの棚の設定からでも置ける）
  localStorage.setItem("kona.objects", JSON.stringify({ lamp: false, hide: [], placed: true }));
}

try {
  if (!Object.keys(localStorage).some(k => k.startsWith("kona"))) seed();
} catch { /* 保存できないときは、いつもの既定のまま */ }
