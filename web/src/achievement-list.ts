// 実績の一覧: id → 名前と、解除すると包みで届く品（items/*.ts の key）。判定は achievements.ts
export interface AchDef { label: string; item: string; how: string }
export const ACHIEVEMENTS: Record<string, AchDef> = {
  "party-join": { label: "はじめてのパーティー参加", item: "cracker", how: "パーティーに参加する" },
  "party-host": { label: "はじめてのパーティー主催", item: "mirrorball", how: "パーティーを主催する" },
  // 聴いた時間
  "hours-1": { label: "はじめの一時間", item: "hourglass", how: "合わせて 1 時間聴く" },
  "hours-10": { label: "十時間", item: "cuckoo", how: "合わせて 10 時間聴く" },
  "hours-50": { label: "五十時間", item: "candlestick", how: "合わせて 50 時間聴く" },
  "hours-100": { label: "百時間", item: "rocking", how: "合わせて 100 時間聴く" },
  "hours-300": { label: "三百時間", item: "grandclock", how: "合わせて 300 時間聴く" },
  "hours-500": { label: "五百時間", item: "piano", how: "合わせて 500 時間聴く" },
  "hours-1000": { label: "千時間", item: "jukebox", how: "合わせて 1000 時間聴く" },
  "long-day": { label: "長い一日", item: "throw", how: "1 日に 3 時間聴く" },
  // 通して聴く
  "whole-1": { label: "一枚通して", item: "score", how: "アルバムを最初から最後まで聴く" },
  "whole-10": { label: "十枚", item: "recordwall", how: "通して 10 枚" },
  "whole-50": { label: "五十枚", item: "recordstack", how: "通して 50 枚" },
  "whole-100": { label: "百枚", item: "goldrecord", how: "通して 100 枚" },
  "favorite": { label: "お気に入りの一枚", item: "favframe", how: "同じアルバムを通して 10 回" },
  "three-day": { label: "三枚の日", item: "cakestand", how: "1 日に通して 3 枚" },
  // ライブラリ
  "lib-50": { label: "棚が埋まる", item: "bookends", how: "アルバム 50 枚を読み込む" },
  "lib-200": { label: "大きな棚", item: "tallshelf", how: "アルバム 200 枚を読み込む" },
  "genres-10": { label: "旅する耳", item: "worldmap", how: "10 のジャンルを聴く" },
  "decades-5": { label: "年代をめぐる", item: "gramophone", how: "5 つの年代のアルバムを聴く" },
  "new-20": { label: "はじめまして", item: "suitcase", how: "まだ聴いていないアルバム 20 枚を再生" },
  // 時間帯
  "dawn": { label: "夜明け前", item: "lantern", how: "4〜6 時に聴く" },
  "midnight": { label: "日付をまたいで", item: "moonmobile", how: "0 時をまたいで再生" },
  "early": { label: "早起き", item: "alarm", how: "朝 5〜7 時に聴く" },
  "lunch": { label: "お昼休み", item: "bento", how: "12 時台に聴く" },
  "dusk": { label: "夕暮れ", item: "sunset", how: "17〜19 時に聴く" },
  "weekend": { label: "週末の朝", item: "breakfast", how: "土日の朝に 1 時間" },
  // 季節・暦
  "spring": { label: "春の音", item: "koinobori", how: "春に初めて 1 時間" },
  "summer": { label: "夏の音", item: "katori", how: "夏に初めて 1 時間" },
  "autumn": { label: "秋の音", item: "leafbasket", how: "秋に初めて 1 時間" },
  "winter": { label: "冬の音", item: "kotatsu", how: "冬に初めて 1 時間" },
  "newyear-day": { label: "元日", item: "kagamimochi", how: "1 月 1 日に聴く" },
  "newyear-eve": { label: "年越し", item: "soba", how: "大晦日から元日へまたいで再生" },
  "streak-7": { label: "一週間", item: "weekcal", how: "7 日続けて聴く" },
  "streak-30": { label: "ひと月", item: "pressed", how: "30 日続けて聴く" },
  "days-100": { label: "百日", item: "plaque", how: "聴いた日が通算 100 日" },
  // 猫
  "stroke-1": { label: "はじめてなでる", item: "teaser", how: "猫を初めてなでる" },
  "stroke-100": { label: "なでなで", item: "catportrait", how: "猫を 100 回なでる" },
  "cat-pick": { label: "猫の選曲", item: "cathammock", how: "猫が選んだアルバムを最後まで聴く" },
  "cat-pick-5": { label: "猫の選曲家", item: "pawrug", how: "猫が選んだアルバムを通して 5 枚" },
  "cats-3": { label: "三匹", item: "catbowls", how: "飼い猫を 3 匹に" },
  "nap": { label: "寝息", item: "yarnbasket", how: "猫が寝ているあいだに 1 時間聴く" },
  "stray": { label: "窓辺の客", item: "windowdish", how: "通りすがりの猫に初めて会う" },
  // パーティー
  "party-5": { label: "常連", item: "partyhat", how: "パーティーに 5 回参加" },
  "host-5": { label: "主催者", item: "djbooth", how: "パーティーを 5 回主催" },
  "party-10h": { label: "みんなで十時間", item: "longsofa", how: "パーティーで一緒に 10 時間" },
  "party-4": { label: "にぎやかな夜", item: "bigtable", how: "4 人以上のパーティー" },
  "gift-give": { label: "贈る", item: "ribbonbox", how: "パーティーで初めて贈る" },
  "gift-get": { label: "もらう", item: "giftshelf", how: "パーティーで初めてもらう" },
  // 部屋・包み
  "room-1": { label: "はじめての家具", item: "doormat", how: "初めて家具を置く" },
  "wall-5": { label: "壁を飾る", item: "bigclock", how: "壁に 5 つ掛ける" },
  "room-30": { label: "にぎやかな部屋", item: "chandelier", how: "部屋に 30 個置く" },
  "seasons": { label: "四季の飾り", item: "seasonshelf", how: "季節の品を 4 つ飾る" },
  "opened-50": { label: "五十の包み", item: "treasure", how: "包みを 50 個開ける" },
};
export const REWARD_KEYS = new Set(Object.values(ACHIEVEMENTS).map(a => a.item));
