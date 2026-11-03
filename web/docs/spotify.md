# Spotify で聴く（設定の手順）

Kona はサーバーを持ちません。Spotify の曲は、**あなたのブラウザが Spotify と直接**やりとりして鳴らします。
そのために、Spotify for Developers で「アプリ」をあなた自身で一つ作り、その **Client ID** を Kona に入れます。作るのは一度だけで、料金はかかりません。

> **必要なもの**: Spotify **Premium** のアカウント（ブラウザで鳴らす Web Playback SDK の決まりと、2026 年 2 月からの開発者向けアプリの決まりの両方で必要です）。パソコンの Chrome・Edge・Firefox など、DRM（Widevine）に対応したブラウザ。スマホのブラウザでは鳴らせません。

## しくみと、守っていること

| | |
|---|---|
| Client ID | あなたの Spotify for Developers のもの。Kona には誰のIDも埋め込まれていません |
| サインイン | PKCE（クライアントシークレットを使わない方式）。シークレットはどこにも入れません |
| 権限 | 再生（`streaming`）、プロフィール（`user-read-email` `user-read-private`。SDK が求めるもの）、保存したアルバムを読む（`user-library-read`）、再生先の確認と操作（`user-read-playback-state` `user-modify-playback-state`）。プレイリストやライブラリを書き換える権限は求めません |
| トークン | このブラウザの中（localStorage）だけに置きます。サインアウトで消えます |
| 通信先 | Spotify（`accounts.spotify.com` `api.spotify.com`、再生の部品 `sdk.scdn.co`、ジャケット `i.scdn.co`）だけ。Kona の作者を含め、ほかの誰にも何も送りません |
| 端末に残るもの | トークンと、再生回数・聴いた記録（曲名など。いつもの記録と同じ）。曲名の一覧やジャケットは端末に覚えず、開くたびに Spotify から読みます |
| 外部スクリプト | Spotify を使うと決めたときだけ、Spotify の再生の部品（Web Playback SDK）を読みます。それ以外は今までどおり読みません |

## できること・できないこと

- 棚に並ぶのは、Spotify で **保存したアルバム**（ライブラリのアルバム）です。棚の名前は「Spotify」
- 棚・猫・聴いた記録・レシートなどは、曲の情報（曲名・アーティスト・長さ）から今までどおり動きます
- ジャケットはアプリの中に出します。切り取ったり引き伸ばしたりしないよう、背表紙の模様とレコードのレーベルには使わず、平均色だけにします
- 写真では、Spotify のジャケットを **いつも隠します**（「ジャケットを隠す」を外せません）
- 曲目パネルに **Spotify で開く** を出します（曲の情報の出どころへのリンク）
- Spotify の音は DRM で守られているため、Kona の音の処理を通せません。次のものは Spotify の曲では効きません: **イコライザー・波形・スペクトラム・レベル・音量の正規化・速さとピッチ・クロスフェード・環境音・余韻**。おやすみタイマーのフェードは、音量を少しずつ下げて止めます
- 開発者向けアプリ（Development Mode）は、Spotify の決まりで **使える人が 5 人まで** です（自分と家族など）

## 1. アプリを作る

1. [Spotify for Developers のダッシュボード](https://developer.spotify.com/dashboard) を開き、Spotify のアカウントでログインします
2. **Create app** を押します
   - App name / App description: 何でも（例: `Kona`）
   - **Redirect URIs**: Kona を開いている URL を **そのまま** 入れます（例: `https://wentolia.github.io/kona-open/`）。末尾の `/` まで一致させます。Kona の **設定 → その他 → 読み込み元** に入れるべき文字列が出るので、それをコピーするのが確実です
   - **Which API/SDKs are you planning to use?**: **Web API** と **Web Playback SDK** にチェック
   - 利用規約（Developer Terms of Service / Design Guidelines）を読んで同意し、**Save**
3. できたアプリの **Settings → Basic Information** に **Client ID**（32 文字の英数字）が出ます。Client secret は使いません
4. ほかの人も使うなら **User Management** にその人の名前と Spotify のメールアドレスを追加します（自分だけなら不要）

## 2. Kona に入れる

1. Kona の **設定 → その他 → 読み込み元** を開きます
2. Client ID を貼り付けて **保存してサインイン**
3. Spotify の画面で許可します
4. 保存したアルバムが棚に並びます

次からは、開始画面の **Spotify から** と、右上の **フォルダを開く → Spotify** から開けます。前に開いていたのが Spotify なら、開き直したときもそのまま開きます。

## うまくいかないとき

| お知らせ | 確かめること |
|---|---|
| サインインできませんでした | Client ID が合っているか。Redirect URI が Kona の表示と一字一句同じか |
| Premium のアカウントが要ります | 使っているアカウントが Premium か |
| このブラウザでは鳴らせません | パソコンの Chrome・Edge・Firefox か。DRM（保護されたコンテンツの再生）がオフになっていないか |
| 再生を始められませんでした | 別の端末で Spotify を操作していないか。少し待ってからもう一度 |

## やめるとき

- **設定 → その他 → 読み込み元** の **サインアウト** で、このブラウザのトークンを消せます。**Client ID を消す** で設定ごと消せます
- 権限そのものを取り消すには、[Spotify のアカウントの「アプリ」](https://www.spotify.com/account/apps/) から外します
- ダッシュボードでアプリを削除すれば、Client ID も使えなくなります

## 免責

Kona は MIT ライセンスで、**無保証** です（リポジトリの `LICENSE` を参照）。Kona は Spotify の公式アプリではなく、Spotify とは関係がありません。Client ID とアカウントの管理、Spotify の [開発者規約](https://developer.spotify.com/terms) と [デザインガイドライン](https://developer.spotify.com/documentation/design) を守ることは、使う人それぞれの責任でお願いします。
