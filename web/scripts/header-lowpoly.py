# ヘッダー（上の帯）の地: 猫や棚板と同じ、平らな三角形の面と数段の濃淡。下の端は低い稜線にする。
#   python3 scripts/header-lowpoly.py  → src/header-lowpoly.css を書き出す（手で直さない）
# 面ごとの濃淡は「不透明度」で付けたマスクにする。色は CSS 側の背景色（テーマ色から計算）なので、
# テーマや時刻で色が移っても形はそのまま、色だけが替わる。乱数の種は固定（何度作っても同じ形）。
import random, urllib.parse, os

W, H = 1440, 60  # タイル 1 枚（横に繰り返す。高さは帯に合わせて伸び縮みする）
rnd = random.Random(3)

def row(y0, jit):
    """y0 の高さの辺に点を不規則に打つ。タイルの左右の端は y0 に揃えて継ぎ目を出さない"""
    xs, x = [0.0], 0.0
    while True:
        x += rnd.uniform(70, 150)
        if x > W - 50: break
        xs.append(x)
    xs.append(W)
    return [(x, y0 if x in (0, W) else y0 + rnd.uniform(-jit, jit)) for x in xs]

rows = [row(0, 0), row(26, 7), row(H - 5, 4.5)]  # 上の辺・中ほど・下の稜線（H-5±4.5）
tris = []
for a, b in zip(rows, rows[1:]):
    i = k = 0
    while i < len(a) - 1 or k < len(b) - 1:
        if k >= len(b) - 1 or (i < len(a) - 1 and a[i + 1][0] < b[k + 1][0]):
            tris.append([a[i], a[i + 1], b[k]]); i += 1
        else:
            tris.append([a[i], b[k], b[k + 1]]); k += 1

polys = []
for t in tris:
    ys = sorted(p[1] for p in t)
    up = ys[1] < sum(ys) / 3  # 2 点が上にある面は上からの灯りを受けて明るい
    o = rnd.choice([1, 1, .9]) if up else rnd.choice([.62, .72, .8])
    pts = " ".join(f"{round(x, 1)},{round(y, 1)}" for x, y in t)
    polys.append(f'<polygon fill-opacity="{o}" stroke="#000" stroke-opacity="{o}" stroke-width=".6" stroke-linejoin="round" points="{pts}"/>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none">{"".join(polys)}</svg>'
url = "url(\"data:image/svg+xml," + urllib.parse.quote(svg, safe=' =:/",.').replace('"', "'") + "\")"

out = os.path.join(os.path.dirname(__file__), "..", "src", "header-lowpoly.css")
with open(out, "w") as f:
    f.write("/* 生成ファイル: scripts/header-lowpoly.py で作る。手で直さない */\n")
    f.write(f":root {{\n  --top-band: {url};\n  --top-band-w: {W}px;\n}}\n")
print("wrote", os.path.normpath(out))
