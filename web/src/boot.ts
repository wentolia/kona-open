import "./fonts";
import { takeAuthRedirect } from "./drive";
// Google のサインインから小窓に戻ってきたときは、トークンを元の画面へ渡して閉じるだけ（画面は組み立てない）
if (!takeAuthRedirect()) import("./main");
