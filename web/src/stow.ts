// しまう: 棚の小物・床と壁の家具を片付ける。どこからしまっても（ホームのボタン・受け皿・設定の見本）、
// 「〜をしまいました」と「元に戻す」を出す。元に戻すと、同じ棚の同じ並び・同じ場所と大きさに置き直す。
// ドラッグしている間は、画面の上に「ここで放すとしまう」の受け皿を出す（設定を開いていなくても片付けられる）。
import "./stow.css";
import { OBJECTS } from "./mod-objects";
import { defOf, removeThing, toggleThing, restoreThings, type Item } from "./room-things";
import { renderSettings } from "./settings";
import { t } from "./i18n";

export interface StowHooks {
  /** 小物を棚に置く（shelfId がなければしまう） */
  putObject(key: string, shelfId?: string, at?: number): void;
  /** 小物の置いてある棚と、その棚の小物の中で何番目か */
  placeOf(key: string): { shelf: string; at: number } | undefined;
  toast(text: string, action?: string, run?: () => void): void;
}
let h: StowHooks | undefined;
export function initStow(hooks: StowHooks) { h = hooks; }

const objLabel = (k: string) => { const o = OBJECTS.find(x => x.key === k); return o ? t(o.label) : k; };
const thingLabel = (k: string) => { const d = defOf(k); return d ? t(d.label) : k; };
const told = (label: string, undo: () => void) => h?.toast(`${label}${t("をしまいました")}`, t("元に戻す"), undo);

/** 棚の小物をしまう */
export function stowObject(key: string) {
  if (!h) return;
  const was = h.placeOf(key);
  if (!was) return;
  h.putObject(key);
  told(objLabel(key), () => h!.putObject(key, was.shelf, was.at));
}
/** 家具をひとつしまう（id）、または種類ごとすべて（kind） */
export function stowThing(p: { id: string } | { kind: string }) {
  const out: Item[] = "id" in p ? removeThing(p.id) : toggleThing(p.kind, false);
  if (!out.length) return;
  renderSettings();
  const label = thingLabel(out[0].k) + (out.length > 1 ? ` ×${out.length}` : "");
  told(label, () => { restoreThings(out); dispatchEvent(new Event("resize")); renderSettings(); });
}

// 受け皿: ドラッグの間だけ出す。over はいま上にあるか
let tray: HTMLElement | undefined;
export function showTray(on: boolean) {
  if (on && !tray) {
    tray = document.createElement("div");
    tray.className = "stow-tray"; tray.setAttribute("aria-hidden", "true");
    tray.innerHTML = `${BOX_SVG}<span>${t("ここで放すとしまう")}</span>`;
    document.body.append(tray);
    requestAnimationFrame(() => tray?.classList.add("in"));
  } else if (!on && tray) { tray.remove(); tray = undefined; }
}
/** (x, y) が受け皿の上か。上にあれば受け皿を光らせる */
export function overTray(x: number, y: number) {
  if (!tray) return false;
  const r = tray.getBoundingClientRect(), on = x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  tray.classList.toggle("over", on);
  return on;
}

/** 箱のしるし（ホームのしまうボタンと受け皿） */
export const BOX_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 6.5h11v7h-11z"/><path d="M1.5 3.5h13v3h-13z"/><path d="M6.5 9h3"/></svg>`;
