// 言語: 日本語（元の文）と英語。文は日本語のまま書き、英語のときだけこの表で置き換える（表にない文は日本語のまま）。
// 言語を替えたら画面を開き直す（文はあちこちで描いているため）。

import { prefs } from "./prefs";

const EN: Record<string, string> = {
  // 上の帯・画面
  "ホーム": "Home", "ライブラリ": "Library", "設定": "Settings", "フォルダを開く": "Open folder", "読み直す": "Rescan",
  "読み直しています": "Rescanning", "最小表示": "Compact view", "小窓で手前に出す": "Picture-in-picture",
  "フォルダの中の変更（増えた・減ったアルバム）を反映します": "Pick up albums added or removed in the folder",
  "この端末のフォルダ": "Folder on this device", "設定と聴いた記録を書き出す": "Export settings and listening history",
  "配置・イコライザーなど": "Layout, EQ and more", "再生回数・聴いた日と場所も": "Includes plays, dates and places",
  "設定を書き出す": "Export settings", "設定を読み込む": "Import settings", "検索": "Search", "ライブラリを検索": "Search library",
  "フォルダ": "Folders", "外したアルバム": "Hidden albums", "戻す": "Restore", "すべて戻す": "Restore all",
  "元に戻す": "Undo", "猫を呼ぶ": "Call a cat", "猫を帰す": "Send a cat home",
  "この端末のフォルダを開く": "Open a folder on this device", "Google Drive から開く": "Open from Google Drive",
  "PC 向けの画面にする": "Switch to desktop view", "棚の素材": "Shelf material",
  // モジュール
  "棚": "Shelf", "再生中": "Now playing", "波形": "Waveform", "イコライザー": "Equalizer", "時計": "Clock",
  "アルバムの情報": "Album card", "聴いた記録": "Listening log", "出力": "Output",
  "レコードプレーヤー": "Turntable", "窓辺": "Window", "棚の上の小物": "Shelf objects", "聴いた距離": "Distance",
  "キャットタワー": "Cat tower", "爪とぎ": "Scratcher", "猫のごはん": "Cat food", "スペクトラム": "Spectrum",
  "よく聴く": "Often played", "最近聴いた": "Recently played", "次に再生": "Up next", "アーティスト": "Artist",
  "気分": "Mood", "手動で集める": "Hand-picked", "検索して並べる": "Search results",
  "アルバム名": "Album title", "年（新しい順）": "Year (newest first)", "年（古い順）": "Year (oldest first)", "再生回数": "Play count", "最近聴いた順": "Recently played",
  "名前": "Name", "中身": "Contents", "並び順": "Sort by", "ジャンル": "Genre", "すべて": "All", "検索語": "Search terms",
  "ホームから外す": "Remove from home", "閉じる": "Close", "雨を降らせる": "Make it rain", "景色": "View", "置く小物": "Objects",
  "部屋の明かりも時刻で変える": "Change the room light with the time of day",
  // 窓の外・小物・猫の品種
  "街": "City", "海辺": "Seaside", "山と森": "Mountains", "田園": "Countryside", "雪国": "Snow country", "川沿いの街": "Riverside town", "日替わり": "Changes daily",
  "灯り": "Lamp", "鉢植え": "Potted plant", "ろうそく（おやすみタイマー）": "Candle (sleep timer)", "砂時計": "Hourglass",
  "きょうのレコード": "Today's records", "金魚鉢": "Goldfish bowl",
  "雑種": "Mixed", "シャム": "Siamese", "スコティッシュフォールド": "Scottish Fold", "メインクーン": "Maine Coon",
  "三毛（日本猫）": "Calico (Japanese)", "アメリカンショートヘア": "American Shorthair", "ロシアンブルー": "Russian Blue",
  "ベンガル": "Bengal", "スフィンクス": "Sphynx", "ペルシャ": "Persian",
  // 棚の素材
  "床に置く": "On the floor", "置くもの": "Things to place", "置き時計が正時に鐘を鳴らす": "Desk clocks chime on the hour", "アナログ時計": "Analog clock", "デジタル時計": "Digital clock", "棚に置く": "On a shelf", "ホームの棚や床へドラッグして置く。ここへ戻すとしまう": "Drag onto a shelf or the floor. Drag back here to put away.", "ソファ": "Sofa", "ひとりがけ": "Armchair", "クッション": "Floor cushion", "キリム": "Kilim", "丸いラグ": "Round rug", "位置": "Position", "大きさ": "Size",
  "壁": "Wall", "床": "Floor", "無地": "Plain", "漆喰": "Plaster", "板壁": "Wood panels", "レンガ": "Brick",
  "ウォールナット": "Walnut", "オーク": "Oak", "スチール": "Steel", "アクリル": "Acrylic", "欅": "Zelkova", "パイン": "Pine", "白樺": "Birch", "黒檀": "Ebony", "石": "Stone", "苔": "Moss", "雪": "Snow",
  // 設定ページ
  "色": "Color", "その他": "Other", "もっと見る": "More", "文字と言語": "Text and language", "ライブラリの細かな設定": "More library settings",
  "音の色（イコライザー）": "Tone (equalizer)", "棚板に暮らした跡を残す": "Let the shelves wear", "見た目": "Look", "部屋": "Room", "音": "Sound", "猫": "Cats", "データ": "Data", "キーボード": "Keyboard", "Kona について": "About Kona",
  "フォルダを追加": "Add a folder", "別のフォルダに入れ替える": "Replace with another folder", "外す": "Remove",
  "ボックス": "Box",
  "プリセット": "Presets", "前のプリセット": "Previous preset", "次のプリセット": "Next preset", "調整中": "Custom", "オフ": "Off", "イコライザーのいまの形を残す": "Save the current EQ shape",
  "出力先": "Output device", "既定の出力": "Default output", "イコライザーを使う": "Use the equalizer", "重ねる音": "Ambient sounds",
  "招待": "Invite", "リスニングパーティー: 流している音をいっしょに聴く": "Listening party: listen together to what's playing",
  "モジュール": "Modules", "ホームのモジュール": "Modules on home", "モジュールを足す": "Add a module", "遊ぶ": "Play",
  "猫じゃらしで遊ぶ": "Play with a cat wand", "猫じゃらしをしまう": "Put the wand away", "ランダムで1枚": "Pick one at random", "新しい棚": "New shelf",
  "テーマカラー": "Theme color", "いつも同じ": "Always the same", "時刻で移ろう": "Shift with the time of day",
  "朝": "Morning", "昼": "Day", "夕": "Evening", "夜": "Night", "移り変わり": "Transition", "すぐ": "Instant",
  "15 分": "15 min", "1 時間": "1 hour", "2 時間": "2 hours", "自分で選ぶ": "Custom", "自分で選ぶ色": "Custom colors", "地": "Base",
  "朝靄": "Morning mist", "昼の書斎": "Study", "夕焼け": "Sunset", "森": "Forest", "深い夜": "Deep night", "月明かり": "Moonlight", "夜桜": "Night blossoms",
  "棚と明かり": "Shelves and light", "文字と動き": "Text and motion", "文字の大きさ": "Text size", "小": "Small", "標準": "Normal", "大": "Large", "特大": "Extra large",
  "書体": "Typeface", "ゴシック": "Sans", "明朝": "Serif", "動き": "Motion", "端末の設定に従う": "Follow the system", "減らす": "Reduce",
  "部屋のしつらえ": "Room details", "棚板に暮らした跡を残す（猫の毛・爪あと）": "Let the shelves wear (cat hair, claw marks)",
  "季節と夜": "Seasons and night", "窓の外": "Outside the window",
  "イコライザーのプリセット": "Equalizer presets", "フラット": "Flat", "低音を足す": "Bass boost", "声を前に": "Vocal", "明るく": "Bright",
  "夜の小さな音": "Late-night low volume", "古いレコード": "Old record", "いまの形を残す": "Save the current curve", "残す": "Save", "消す": "Delete",
  "音量と曲のつなぎ": "Volume and transitions", "音量の正規化": "Volume normalization", "しない": "Off", "曲ごと": "Per track", "アルバムごと": "Per album",
  "曲のつなぎ": "Between tracks", "ギャップレス": "Gapless", "クロスフェード 3 秒": "Crossfade 3 s", "秒": "s",
  "イコライザーの形を残しました": "Saved the equalizer curve",
  "猫を出さない": "Hide the cats", "品種": "Breed", "帰す": "Send home", "匹": "cats",
  "夜中にときどき駆け回る（夜の運動会）": "Run around at night (midnight zoomies)", "いたずら": "Mischief",
  "よく聴くアルバムをくわえてきたら": "When a cat brings a favorite album", "させない": "Don't allow", "次に再生に入れる": "Add to Up next", "そのまま再生する": "Play it right away",
  "読み込んだフォルダ": "Loaded folder", "この端末のフォルダ（選んだファイル）": "Folder on this device (picked files)", "開いていません": "Nothing open",
  "別のフォルダを開く": "Open another folder", "フォルダを解除する": "Forget folder",
  "ほかのアプリから戻ってきたら、フォルダの変化を反映する": "Pick up folder changes when returning from other apps",
  "並び方と見せ方": "Order and appearance", "ジャケットがないとき": "Albums without artwork", "色と題名": "Color and title", "頭文字": "Initial", "色だけ": "Color only", "括り方": "Group by", "ライブラリの箱と、棚の仕切り（「隙間をあけて仕切る」にした棚）をどちらで括るか。アーティストはタグのアルバムアーティストを使います。": "How library boxes and shelf dividers (on shelves set to divide with gaps) are grouped. Artist uses the album artist tag.",
  "フォルダ未選択": "No folder chosen", "使っていません": "Not in use", "サインイン中": "Signed in", "サインインが切れています": "Signed out", "サインアウト": "Sign out",
  "端末に残したアルバム": "Albums kept on this device", "枚": "albums", "端末から消す": "Remove from device",
  "このブラウザで Kona が使っている容量": "Storage used by Kona in this browser",
  "聴いた記録を消す": "Clear listening history", "すべて初期化する": "Reset everything",
  "やめる": "Cancel", "初期化する": "Reset", "解除する": "Forget",
  "再生回数・最後に聴いた日・聴いた記録と場所・聴いた距離を消します。元に戻せません。": "This clears play counts, last-played dates, the listening log, places and distance. It can't be undone.",
  "聴いた記録を消しました。画面を開き直します": "Listening history cleared. Reloading",
  "設定・配置・聴いた記録・猫・端末に残した曲・覚えているフォルダをすべて消して、はじめの状態に戻します。音楽のファイルそのものは消えません。": "This erases settings, layout, listening history, cats, tracks kept on this device and remembered folders. Your music files are not touched.",
  "覚えているフォルダ（と Google Drive のフォルダ）を忘れて、はじめの画面に戻ります。ファイルや聴いた記録は消えません。": "Kona forgets the remembered folder (and Google Drive folder) and returns to the start screen. Files and history stay.",
  "再生・一時停止": "Play / pause", "次の曲": "Next track", "前の曲": "Previous track", "10 秒送る": "Forward 10 s", "10 秒戻す": "Back 10 s",
  "音量を上げる": "Volume up", "音量を下げる": "Volume down", "消音": "Mute", "なし": "None", "キーを押す…": "Press a key…", "既定に戻す": "Reset to defaults",
  "言語": "Language", "戻る": "Back", "項目を書き出しました": "items exported", "版": "Version", "ライセンス": "License", "無保証": "no warranty", "ソース": "Source",
  "サーバーはなく、アクセス解析もしません。設定・記録・取り込んだ曲は、このブラウザの中にだけ置きます。": "There is no server and no analytics. Settings, history and kept tracks stay in this browser.",
  "通信するのは Google Drive を使うときの Google の API、Spotify を使うときの Spotify だけです。": "The only network traffic is Google's API when you use Google Drive, and Spotify when you use Spotify.",
  "Google Drive は読み取りだけで、サインインはこのタブの中だけ（約 1 時間）有効です。": "Google Drive access is read-only, and sign-in lasts only for this tab (about an hour).",
  "聴いた場所は記録しません。位置情報は使いません。": "Kona does not record where you listen and never uses your location.",
};

export const lang = () => prefs().lang;
export function t(ja: string): string { return lang() === "en" ? EN[ja] ?? ja : ja; }

/** index.html に書いてある文（上の帯など）を替える */
export function translateStatic() {
  if (lang() === "ja") return;
  for (const el of document.querySelectorAll<HTMLElement>(".top a, .top button, .top [title], .top [aria-label]")) {
    if (el.children.length === 0 && el.textContent?.trim()) el.textContent = t(el.textContent.trim());
    for (const a of ["title", "aria-label"]) { const v = el.getAttribute(a); if (v) el.setAttribute(a, t(v)); }
  }
}
