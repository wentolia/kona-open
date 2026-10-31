import "./fonts";
import { takeAuthRedirect } from "./drive";
import { takeSpotifyRedirect } from "./spotify";
// Google / Spotify のサインインから小窓に戻ってきたときは、結果を元の画面へ渡して閉じるだけ（画面は組み立てない）
if (!takeAuthRedirect()) takeSpotifyRedirect().catch(() => false).then(closed => { if (!closed) import("./main"); });
