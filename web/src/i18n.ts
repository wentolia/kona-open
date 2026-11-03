// 言語: 日本語（元の文）と英語。文は日本語のまま書き、英語のときだけこの表で置き換える（表にない文は日本語のまま）。
// 言語を替えたら画面を開き直す（文はあちこちで描いているため）。

import { prefs } from "./prefs";

const EN: Record<string, string> = {
  // 上の帯・画面
  "ホーム": "Home", "ライブラリ": "Library", "設定": "Settings", "フォルダを開く": "Open folder", "読み直す": "Rescan",
  "読み直しています": "Rescanning", "最小表示": "Compact view", "小窓で手前に出す": "Picture-in-picture",
  "フォルダの中の変更（増えた・減ったアルバム）を反映します": "Pick up albums added or removed in the folder",
  "この端末のフォルダ": "Folder on this device", "設定と聴いた記録を書き出す": "Export settings and listening history",
  "配置・イコライザーなど": "Layout, EQ and more",
  "設定を書き出す": "Export settings", "設定を読み込む": "Import settings", "検索": "Search", "ライブラリを検索": "Search library",
  "フォルダ": "Folders", "外したアルバム": "Hidden albums", "戻す": "Restore", "すべて戻す": "Restore all",
  "元に戻す": "Undo", "猫を呼ぶ": "Call a cat", "猫を帰す": "Send a cat home",
  "この端末のフォルダを開く": "Open a folder on this device", "Google Drive から開く": "Open from Google Drive",
  "PC 向けの画面にする": "Switch to desktop view", "棚の素材": "Shelf material",
  // モジュール
  "棚": "Shelf", "再生中": "Now playing", "波形": "Waveform", "イコライザー": "Equalizer", "時計": "Clock",
  "アルバムの情報": "Album card", "聴いた記録": "Listening log", "出力": "Output",
  "窓辺": "Window", "棚の上の小物": "Shelf objects", "聴いた距離": "Distance",
  "キャットタワー": "Cat tower", "爪とぎ": "Scratcher", "猫のごはん": "Cat food", "スペクトラム": "Spectrum",
  "よく聴く": "Often played", "最近聴いた": "Recently played", "次に再生": "Up next", "アーティスト": "Artist",
  "気分": "Mood", "手動で集める": "Hand-picked", "検索して並べる": "Search results",
  "アルバム名": "Album title", "年（新しい順）": "Year (newest first)", "年（古い順）": "Year (oldest first)", "再生回数": "Play count", "最近聴いた順": "Recently played",
  "棚のアルバムを押して、ジャケットの ▶ で聴きはじめます": "Click an album on a shelf, then ▶ on its cover to start listening",
  "アルバムをここへドラッグすると、いまのアルバムのあとに続けて流れます": "Drag albums here to play them after the current one",
  "次に再生へ": "Play next", "次に再生から外す": "Remove from Up next",
  "名前": "Name", "中身": "Contents", "並び順": "Sort by", "ジャンル": "Genre", "すべて": "All", "検索語": "Search terms",
  "ホームから外す": "Remove from home", "閉じる": "Close", "雨を降らせる": "Make it rain", "景色": "View", "置く小物": "Objects",
  "部屋の明かり": "Room light", "時刻に合わせる": "Follow the time of day",
  // 窓の外・小物・猫の品種
  "街": "City", "海辺": "Seaside", "山と森": "Mountains", "田園": "Countryside", "雪国": "Snow country", "川沿いの街": "Riverside town", "日替わり": "Changes daily",
  "灯り": "Lamp", "鉢植え": "Potted plant", "ろうそく（おやすみタイマー）": "Candle (sleep timer)", "砂時計": "Hourglass",
  "きょうのレコード": "Today's records", "金魚鉢": "Goldfish bowl",
  "雑種": "Mixed", "シャム": "Siamese", "スコティッシュフォールド": "Scottish Fold", "メインクーン": "Maine Coon",
  "三毛（日本猫）": "Calico (Japanese)", "アメリカンショートヘア": "American Shorthair", "ロシアンブルー": "Russian Blue",
  "ベンガル": "Bengal", "スフィンクス": "Sphynx", "ペルシャ": "Persian",
  // 棚の素材
  "床に置く": "On the floor", "置くもの": "Things to place", "時計が正時に鐘を鳴らす": "Clocks chime on the hour", "アナログ時計": "Analog clock", "デジタル時計": "Digital clock", "棚に置く": "On a shelf", "ホームの棚や床へドラッグして置く。ここへ戻すとしまう": "Drag onto a shelf or the floor. Drag back here to put away.", "ホームの棚・床・壁へドラッグして置く（家具はいくつでも）。ここへ戻すとしまう。ダブルクリックで左右を反転": "Drag onto a shelf, the floor or the wall (furniture as many as you like). Drag back here to put away. Double-click to flip.", "壁に掛ける": "On the wall", "ローテーブル": "Low table", "サイドテーブル": "Side table", "スツール": "Stool", "低い本棚": "Low bookcase", "レコード棚": "Record shelf", "スピーカー": "Speaker", "フロアランプ": "Floor lamp", "大きな観葉植物": "Large houseplant", "籐のかご": "Rattan basket", "ビーズクッション": "Beanbag", "薪ストーブ": "Wood stove", "紙袋": "Paper bag", "長方形のラグ": "Striped rug", "ジャケットの額": "Framed album cover", "壁掛けの小さな棚": "Small wall shelf", "日めくり": "Day calendar", "キャットウォーク": "Cat steps", "風鈴": "Wind chime", "レコードプレーヤー": "Turntable", "メトロノーム": "Metronome", "真空管アンプ": "Tube amp", "レコードの木箱": "Record crate", "ギター": "Guitar", "チケットの半券": "Ticket stubs", "譜面台": "Music stand", "果物の鉢": "Fruit bowl", "パンの籠": "Bread basket", "いちごのケーキ": "Strawberry cake", "お団子": "Dango", "みかん": "Mandarins", "コーヒーミル": "Coffee grinder", "クッキーの缶": "Cookie tin", "カフェラテ": "Caffè latte", "ハンドドリップ": "Pour-over", "サイフォン": "Siphon brewer", "クリームソーダ": "Cream soda", "パンケーキ": "Pancakes", "サンドイッチ": "Sandwich", "カクテルグラス": "Cocktail glass", "ウイスキーのロック": "Whisky on the rocks", "ワイン": "Wine", "ビールジョッキ": "Beer mug", "チーズの盛り合わせ": "Cheese board", "バーのランプ": "Bar lamp", "飼い猫": "Your cats", "通りすがりの猫が気まぐれに遊びに来ます。気に入ったら飼い猫にできます（猫の名札を押しても）。品種は変えられません。飼える数はプレゼントで増えます（10 匹まで）": "Passing cats drop by now and then. If you like one, you can keep it (also from its name tag). Breeds can't be changed. Presents let you keep more cats (up to 10).", "遊びに来ている猫": "Visiting cat", "飼い猫にする": "Keep this cat", "アクセサリー": "Accessory", "アクセサリーなし": "No accessory", "手放す": "Let go", "プレゼント": "Presents", "音楽を 30 分聴くごとに、その日はじめて聴いたときに、包みがひとつ届きます（1 日 5 つまで）。包みはホームの床に置かれ、押すと開きます": "A present arrives for every 30 minutes of listening and for your first listen of the day (up to 5 a day). Presents appear on the home floor; press one to open it.", "今日届いた包み": "Presents today", "次まで": "next in", "飼える猫": "Cats you can keep", "包みを開ける": "Open the present", "飼える猫がもう 1 匹ふえました": "You can keep one more cat", "実績": "Achievement", "を聴いていたとき": "was playing", "設定の「部屋」→「置くもの」から置けます": "Place it from Settings → Room → Things to place", "飼い猫の名札か、設定の「猫」からつけられます": "Put it on from a cat's name tag or Settings → Cats", "通りすがりの猫を飼い猫にできます": "You can keep another passing cat", "はじめてのパーティー参加": "First party joined", "はじめてのパーティー主催": "First party hosted", "クラッカー": "Party popper", "鳩時計": "Cuckoo clock", "真鍮の燭台": "Brass candlestick", "ロッキングチェア": "Rocking chair", "柱時計": "Grandfather clock", "アップライトピアノ": "Upright piano", "ジュークボックス": "Jukebox", "ひざ掛け": "Lap blanket", "額入りの楽譜": "Framed sheet music", "レコードの壁掛け": "Wall records", "積んだレコード": "Stack of records", "金のレコード": "Gold record", "愛聴盤の額": "Favorite album frame", "ケーキスタンド": "Cake stand", "本立て": "Bookends", "背の高いレコード棚": "Tall record shelf", "世界地図": "World map", "蓄音機": "Gramophone", "旅行かばん": "Suitcase", "ランタン": "Lantern", "月のモビール": "Moon mobile", "目覚まし時計": "Alarm clock", "お弁当箱": "Bento box", "夕焼けの額": "Sunset painting", "朝食のトレー": "Breakfast tray", "こいのぼり": "Carp streamers", "蚊やり豚": "Mosquito-coil pig", "落ち葉の籠": "Basket of leaves", "こたつ": "Kotatsu", "鏡餅": "Kagami mochi", "年越しそば": "New Year's Eve soba", "週めくりの暦": "Weekly calendar", "押し花の額": "Pressed flowers", "記念の盾": "Commemorative plaque", "猫じゃらし": "Cat teaser", "猫の肖像画": "Cat portrait", "猫のハンモック": "Cat hammock", "足あとのラグ": "Paw-print rug", "猫の食器（三つ）": "Three cat bowls", "毛糸玉の籠": "Yarn basket", "窓辺の小皿": "Windowsill dish", "パーティ帽": "Party hat", "DJ ブース": "DJ booth", "長いソファ": "Long sofa", "大きなテーブル": "Big table", "リボンの箱": "Ribboned box", "飾り棚": "Display cabinet", "玄関マット": "Doormat", "大きな壁時計": "Big wall clock", "シャンデリア": "Chandelier", "季節の飾り棚": "Seasonal shelf", "宝箱": "Treasure chest", "はじめの一時間": "The first hour", "十時間": "Ten hours", "五十時間": "Fifty hours", "百時間": "A hundred hours", "三百時間": "Three hundred hours", "五百時間": "Five hundred hours", "千時間": "A thousand hours", "長い一日": "A long day", "一枚通して": "Start to finish", "十枚": "Ten albums", "五十枚": "Fifty albums", "百枚": "A hundred albums", "お気に入りの一枚": "A favorite", "三枚の日": "A three-album day", "棚が埋まる": "A full shelf", "大きな棚": "A big shelf", "旅する耳": "Traveling ears", "年代をめぐる": "Across the decades", "はじめまして": "Nice to meet you", "夜明け前": "Before dawn", "日付をまたいで": "Past midnight", "早起き": "Early bird", "お昼休み": "Lunch break", "夕暮れ": "Dusk", "週末の朝": "Weekend morning", "春の音": "Sounds of spring", "夏の音": "Sounds of summer", "秋の音": "Sounds of autumn", "冬の音": "Sounds of winter", "元日": "New Year's Day", "年越し": "Into the new year", "一週間": "A week", "ひと月": "A month", "百日": "A hundred days", "はじめてなでる": "First pet", "なでなで": "Lots of pets", "猫の選曲": "The cat's pick", "猫の選曲家": "Cat DJ", "三匹": "Three cats", "寝息": "Sleeping breaths", "窓辺の客": "A guest at the window", "常連": "Regular", "主催者": "Host", "みんなで十時間": "Ten hours together", "にぎやかな夜": "A lively night", "贈る": "Giving", "もらう": "Receiving", "はじめての家具": "First furniture", "壁を飾る": "Decorating the walls", "にぎやかな部屋": "A lively room", "四季の飾り": "Four seasons", "五十の包み": "Fifty presents", "包みが届きました": "a present has arrived", "さんから": " sent this", "贈りもの": "Gifts", "贈る品": "Gift", "贈る相手": "To", "贈りました": "Gift sent", "今日はもう別の品を贈りました": "You've already given a different item today", "贈れる品がまだありません": "Nothing to give yet", "実績の一覧": "Achievements", "ミラーボール": "Mirror ball", "赤い首輪": "Red collar", "青い首輪": "Blue collar", "鈴の首輪": "Bell collar", "迷子札の首輪": "Collar with tag", "スカーフ": "Scarf", "バンダナ": "Bandana", "蝶ネクタイ": "Bow tie", "リボン": "Ribbon", "花飾り": "Flower", "ベレー帽": "Beret", "毛糸の帽子": "Knit hat", "マグカップ": "Mug", "ティーポット": "Teapot", "カセットテープ": "Cassette tape", "ヘッドホン": "Headphones", "小さなラジオ": "Little radio", "ジャケット立て": "Cover stand", "地球儀": "Globe", "ガラス瓶": "Glass jar", "ミニ盆栽": "Mini bonsai", "香炉": "Incense burner", "オルゴール": "Music box", "陶器の猫": "Ceramic cat", "木彫りの鳥": "Wooden bird", "桜の枝": "Cherry branch", "かぼちゃ": "Pumpkin", "雪だるまの置物": "Snowman figure", "キャンドルの輪": "Candle ring", "新年の飾り": "New Year ornament", "置いた": "Placed", "額（夜の丘）": "Frame (night hills)", "額（静物）": "Frame (still life)", "丸い鏡": "Round mirror", "壁のランプ": "Wall lamp", "ガーランド": "Garland", "ドライフラワー": "Dried flowers", "ソファ": "Sofa", "ひとりがけ": "Armchair", "クッション": "Floor cushion", "キリム": "Kilim", "丸いラグ": "Round rug", "位置": "Position", "大きさ": "Size",
  "壁": "Wall", "床": "Floor", "無地": "Plain", "漆喰": "Plaster", "板壁": "Wood panels", "レンガ": "Brick",
  "ウォールナット": "Walnut", "オーク": "Oak", "スチール": "Steel", "アクリル": "Acrylic", "欅": "Zelkova", "パイン": "Pine", "白樺": "Birch", "黒檀": "Ebony", "石": "Stone", "苔": "Moss", "雪": "Snow",
  // 設定ページ
  "色": "Color", "その他": "Other", "もっと見る": "More", "表示と言語": "Display and language", "ライブラリの細かな設定": "More library settings",
  "音の色（イコライザー）": "Tone (equalizer)", "棚板に暮らした跡を残す": "Let the shelves wear", "見た目": "Look", "部屋": "Room", "音": "Sound", "猫": "Cats", "データ": "Data", "キーボード": "Keyboard", "Kona について": "About Kona",
  "フォルダを追加": "Add a folder", "別のフォルダに入れ替える": "Replace with another folder", "外す": "Remove",
  "ボックス": "Box",
  "プリセット": "Presets", "前のプリセット": "Previous preset", "次のプリセット": "Next preset", "調整中": "Custom", "オフ": "Off",
  "出力先": "Output device", "既定の出力": "Default output", "イコライザーを使う": "Use the equalizer", "重ねる音": "Ambient sounds",
  "招待": "Invite", "リスニングパーティー: 流している音をいっしょに聴く": "Listening party: listen together to what's playing",
  "モジュール": "Modules", "ホームのモジュール": "Modules on home", "モジュールを足す": "Add a module", "ホームのモジュールを押して選ぶ": "Click a module on home to choose it", "遊ぶ": "Play",
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
  "再生回数・最後に聴いた日・聴いた記録・聴いた距離を消します。元に戻せません。": "This clears play counts, last-played dates, the listening log and distance. It can't be undone.",
  "聴いた記録を消しました。画面を開き直します": "Listening history cleared. Reloading",
  "設定・配置・聴いた記録・猫・端末に残した曲・覚えているフォルダをすべて消して、はじめの状態に戻します。音楽のファイルそのものは消えません。": "This erases settings, layout, listening history, cats, tracks kept on this device and remembered folders. Your music files are not touched.",
  "覚えているフォルダ（と Google Drive のフォルダ）を忘れて、はじめの画面に戻ります。ファイルや聴いた記録は消えません。": "Kona forgets the remembered folder (and Google Drive folder) and returns to the start screen. Files and history stay.",
  "再生・一時停止": "Play / pause", "次の曲": "Next track", "前の曲": "Previous track", "10 秒送る": "Forward 10 s", "10 秒戻す": "Back 10 s",
  "音量を上げる": "Volume up", "音量を下げる": "Volume down", "消音": "Mute", "なし": "None", "キーを押す…": "Press a key…", "既定に戻す": "Reset to defaults",
  "言語": "Language", "戻る": "Back", "項目を書き出しました": "items exported", "版": "Version", "ライセンス": "License", "無保証": "no warranty", "ソース": "Source",
  "サーバーはなく、アクセス解析もしません。設定・記録・取り込んだ曲は、このブラウザの中にだけ置きます。": "There is no server and no analytics. Settings, history and kept tracks stay in this browser.",
  "通信するのは Google Drive を使うときの Google の API、Spotify を使うときの Spotify、リスニングパーティーを使うときの公開の Nostr リレー（暗号化した接続情報だけ）、STUN サーバーとホストが設定した中継サーバー（どちらも IP アドレスが届きます）だけです。このページを置いている GitHub Pages も、開いた人の IP アドレスを記録します。": "Kona only talks to Google's API when you use Google Drive, to Spotify when you use Spotify, and, for listening parties, to public Nostr relays (encrypted connection details only), a STUN server and the relay server set by the host (both see your IP address). GitHub Pages, which hosts this page, also logs visitors' IP addresses.",
  "リスニングパーティーでは、つながったホストと参加者の間でお互いの IP アドレスが見えます。通話のマイクは本人が入れたときだけ開き、Kona は録音しません。": "In a listening party, the host and each guest can see each other's IP address. The microphone opens only when you turn it on, and Kona never records calls.",
  "決まりごと": "Policies", "プライバシーと利用条件": "Privacy and terms", "使っているソフトウェアのライセンス": "Third-party licenses",
  "Google Drive は読み取りだけで、サインインはこのタブの中だけ（約 1 時間）有効です。": "Google Drive access is read-only, and sign-in lasts only for this tab (about an hour).",
  "聴いた場所は記録しません。位置情報は「ご当地の品」をオンにしたときだけ 1 日 1 回使い、端末の中で都道府県・国に置き換えます。座標は保存も送信もしません。": "Kona does not record where you listen. Your location is used only when Local keepsakes is on, at most once a day, and is turned into a prefecture or country on this device. Coordinates are never stored or sent.",
  // ご当地の品
  "ご当地の品": "Local keepsakes", "土地を調べています…": "Finding where you are…",
  "位置情報が許可されていません。ブラウザのサイトの設定で許可できます": "Location is not allowed. You can allow it in your browser's site settings.",
  "このブラウザは位置情報を使えません": "This browser cannot use location.", "土地が分かりませんでした": "Couldn't tell where you are.",
  "いま": "Now", "あと": "Listen", "分聴くと": "more minutes for", "が届きます": "", "この土地の品はみんな届きました": "You have everything from here.",
  "さんの部屋で": "'s room", "で": "",
  "いる土地（都道府県・国）で合わせて 30 分聴くと、その土地らしい品がひとつ届きます。パーティーでは、ホストの土地の品が届きます": "Listen for 30 minutes in a prefecture or country and something from there arrives. In a listening party, you receive something from the host's place.",
  "いる土地の品を受け取る（位置情報を使う）": "Receive local keepsakes (uses location)",
  "位置情報は 1 日 1 回だけ使い、端末の中で都道府県・国に置き換えます。座標は保存も送信もしません": "Location is checked at most once a day and turned into a prefecture or country on this device. Coordinates are never stored or sent.",
  "調べ直す": "Check again", "届いた品": "Received",
  "木彫りの熊": "Carved bear", "りんご": "Apples", "こけし": "Kokeshi doll", "赤べこ": "Akabeko", "だるま": "Daruma", "招き猫": "Beckoning cat",
  "茶筒と湯呑み": "Tea caddy and cup", "扇子": "Folding fan", "たこ焼き": "Takoyaki", "うどん": "Udon", "しゃもじ": "Rice paddle", "シーサー": "Shisa",
  "木靴とチューリップ": "Clogs and tulips", "ナザール": "Nazar", "タジン鍋": "Tagine", "マトリョーシカ": "Matryoshka",
  "が届きました": " arrived",
  "鉄瓶": "Iron kettle", "きりたんぽ": "Kiritanpo", "さくらんぼ": "Cherries", "納豆": "Natto", "いちご": "Strawberries", "せんべい": "Rice crackers", "落花生": "Peanuts", "寄木細工の箱": "Marquetry box", "米俵": "Rice bale", "紙風船": "Paper balloon", "漆の椀": "Lacquer bowl", "恐竜の化石": "Dinosaur fossil", "ぶどう": "Grapes", "ざるそば": "Zaru soba", "さるぼぼ": "Sarubobo doll", "しゃちほこ": "Shachihoko", "真珠貝": "Pearl oyster", "信楽のたぬき": "Shigaraki tanuki", "酒樽": "Sake barrel", "鹿の置物": "Deer figure", "梅干しの壺": "Umeboshi jar", "梨": "Pears", "勾玉": "Magatama", "桃": "Peach", "ふぐ提灯": "Pufferfish lantern", "すだち": "Sudachi", "砥部焼の鉢": "Tobe ware bowl", "鳴子": "Naruko clappers", "明太子": "Mentaiko", "有田焼の壺": "Arita ware jar", "カステラ": "Castella", "肥後てまり": "Higo temari", "湯桶と手ぬぐい": "Bath pail and towel", "マンゴー": "Mango", "切子のグラス": "Cut glass", "アップルパイ": "Apple pie", "メープルシロップ": "Maple syrup", "ピニャータ": "Piñata", "コーヒー豆の麻袋": "Coffee sack", "マテ茶の器": "Mate gourd", "アルパカの置物": "Alpaca figure", "スコーンと紅茶": "Scones and tea", "クロワッサン": "Croissants", "モカポット": "Moka pot", "パエリア鍋": "Paella pan", "プレッツェル": "Pretzel", "カウベル": "Cowbell", "木の馬": "Wooden horse", "アンフォラ": "Amphora", "ピラミッドの置物": "Pyramid figure", "チャイのグラス": "Chai glasses", "象の置物": "Elephant figure", "青磁の壺": "Celadon jar", "蒸籠と小籠包": "Steamer and dumplings", "ノンラー": "Conical hat", "コアラの置物": "Koala figure", "キウイの鳥": "Kiwi bird", "天灯": "Sky lantern", "タピオカミルクティー": "Bubble tea",
  // 読み込み元の欄と文書へのリンク
  "読み込み元（Google Drive・Spotify）": "Sources (Google Drive, Spotify)", "クライアントIDを入れる": "Enter client ID", "クライアントIDを消す": "Remove client ID",
  "保存してサインイン": "Save and sign in", "保存": "Save", "Client ID を消す": "Remove Client ID", "作り方の手順": "Setup guide",
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
