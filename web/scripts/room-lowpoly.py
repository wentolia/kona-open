# 部屋の壁・床・ラグ: 猫・棚板・上の帯と同じ「平らな多角形と数段の濃淡」で作る。
#   python3 scripts/room-lowpoly.py  → src/room-lowpoly.css を書き出す（手で直さない）
# 壁は上の帯（header-lowpoly.py）と同じく不透明度だけのマスクにして、色は CSS 側でテーマ色から作る
# （テーマや時刻で色が移っても形はそのまま）。床とラグは素材の色で塗る。乱数の種は固定（何度作っても同じ形）。
import random, urllib.parse, os

def url(svg):
    return "url(\"data:image/svg+xml," + urllib.parse.quote(svg, safe=' =:/",.').replace('"', "'") + "\")"

def pts(p):
    return " ".join(f"{x:.1f},{y:.1f}".replace(".0,", ",").removesuffix(".0") for x, y in p)

# 面の色は color 属性ひとつで持ち、塗りと縁（隣の面との隙間を埋める細い線）の両方に使う（文字数を減らすため）
STYLE = "<style>polygon{fill:currentColor;stroke:currentColor;stroke-width:.5;stroke-linejoin:round}</style>"

def svg(w, h, body, par="none"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="{par}">{STYLE}{body}</svg>'

def fill(c, p):
    return f'<polygon color="{c}" points="{pts(p)}"/>'

def mask(p, op):
    """マスク用: 色は黒のまま、濃さだけを面ごとに"""
    return f'<polygon color="#000" opacity="{op}" points="{pts(p)}"/>'


def quad_tris(rnd, x0, y0, x1, y1, n=2):
    """矩形を、上下の辺に点を打った三角形に割る"""
    top = [x0] + sorted(rnd.uniform(x0 + 2, x1 - 2) for _ in range(n - 1)) + [x1]
    bot = [x0] + sorted(rnd.uniform(x0 + 2, x1 - 2) for _ in range(n - 1)) + [x1]
    out, i, k = [], 0, 0
    while i < len(top) - 1 or k < len(bot) - 1:
        if k >= len(bot) - 1 or (i < len(top) - 1 and top[i + 1] <= bot[k + 1]):
            out.append([(top[i], y0), (top[i + 1], y0), (bot[k], y1)]); i += 1
        else:
            out.append([(top[i], y0), (bot[k + 1], y1), (bot[k], y1)]); k += 1
    return out

# ================= 壁（マスク） =================
def wall_plaster():
    """漆喰: 大きな三角形の面がうっすら"""
    rnd = random.Random(5)
    W, H, cx, cy = 1200, 840, 10, 7
    gx, gy = W / cx, H / cy
    P = [[(i * gx + (rnd.uniform(-gx * .35, gx * .35) if 0 < i < cx else 0), j * gy + (rnd.uniform(-gy * .35, gy * .35) if 0 < j < cy else 0)) for i in range(cx + 1)] for j in range(cy + 1)]
    for j in range(cy + 1): P[j][cx] = (W, P[j][0][1])  # 左右の端を揃えて継ぎ目を出さない
    for i in range(cx + 1): P[cy][i] = (P[0][i][0], H)
    body = ""
    for j in range(cy):
        for i in range(cx):
            a, b, c, d = P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]
            for t in ([a, b, c], [a, c, d]) if rnd.random() < .5 else ([a, b, d], [b, c, d]):
                body += mask(t, rnd.choice([.35, .5, .65, .8, 1]))
    return svg(W, H, body), W, H

def wall_planks():
    """板壁: 縦の羽目板。板ごとに細長い三角形の面"""
    rnd = random.Random(9)
    W, H = 900, 600
    body, x = "", 0.0
    while x < W:
        w = min(W - x, rnd.uniform(64, 92))
        if W - (x + w) < 40: w = W - x
        base = rnd.choice([.55, .7, .85])
        ys = [0] + sorted(rnd.uniform(40, H - 40) for _ in range(3)) + [H]
        for y0, y1 in zip(ys, ys[1:]):
            for t in quad_tris(rnd, x + 1.5, y0, x + w - 1.5, y1, 1):
                body += mask(t, round(min(1, base + rnd.uniform(-.12, .15)), 2))
        x += w
    return svg(W, H, body), W, H

def wall_brick():
    """レンガ: 目地は地の色（暗い）、レンガは 2〜3 枚の面"""
    rnd = random.Random(13)
    W, H, bw, bh, g = 480, 264, 60, 22, 3
    body = ""
    for r in range(H // bh):
        off = 0 if r % 2 == 0 else bw / 2
        x = -off
        while x < W:
            x0, x1 = max(0, x + g / 2), min(W, x + bw - g / 2)
            y0, y1 = r * bh + g / 2, (r + 1) * bh - g / 2
            if x1 - x0 > 4:
                base = rnd.choice([.6, .72, .85, .95])
                for t in quad_tris(rnd, x0, y0, x1, y1, 2):
                    body += mask(t, round(min(1, base + rnd.uniform(-.1, .1)), 2))
            x += bw
    return svg(W, H, body), W, H

# ================= 床（色） =================
def floor(seed, rows, pal, base_c, kind="boards"):
    """手前ほど板（石）が大きく見えるように、行の高さを奥から手前へ広げる。上の端には巾木"""
    rnd = random.Random(seed)
    W, H = 960, 40
    ys = [0, 4, 4.8, 10.5, 17.5, 26.5, 40]
    body = fill(base_c["skirt_hi"], [(0, 0), (W, 0), (W, 2), (0, 2)]) + fill(base_c["skirt"], [(0, 2), (W, 2), (W, 4), (0, 4)])
    body += fill(base_c["shadow"], [(0, 4), (W, 4), (W, 4.8), (0, 4.8)])
    for r, (y0, y1) in enumerate(zip(ys[2:], ys[3:])):
        near = r / 3  # 0 = 奥、1 = 手前
        if kind == "boards":
            x = -rnd.uniform(0, 80)
            joints = []
            while x < W:
                joints.append(x); x += rnd.uniform(70, 150) * (1 + near * .3)
            joints = [j for j in joints if 6 < j < W - 6]
            xs = [0] + joints + [W]
            for a, b in zip(xs, xs[1:]):
                shade = rnd.choice(pal["boards"])
                for t in quad_tris(rnd, a + .4, y0 + .3, b - .4, y1 - .3, 2):
                    body += fill(rnd.choice([shade, shade, rnd.choice(pal["boards"])]), t)
                body += fill(pal["seam"], [(b - .4, y0), (b + .4, y0), (b + .4, y1), (b - .4, y1)])
            body += fill(pal["seam"], [(0, y1 - .5), (W, y1 - .5), (W, y1), (0, y1)])
        else:  # 石のタイル: 4 枚の三角形（真ん中の点を少しずらす）
            n = [32, 24, 18, 14][r]
            tw = W / n
            off = tw / 2 if r % 2 else 0
            for i in range(-1, n + 1):
                a, b = max(0, i * tw + off), min(W, (i + 1) * tw + off)
                if b - a < 1: continue
                a2, b2 = a + .7, b - .7
                m = ((a2 + b2) / 2 + rnd.uniform(-tw * .15, tw * .15), (y0 + y1) / 2 + rnd.uniform(-(y1 - y0) * .15, (y1 - y0) * .15))
                ts = [[(a2, y0 + .5), (b2, y0 + .5), m], [(b2, y0 + .5), (b2, y1 - .5), m], [(b2, y1 - .5), (a2, y1 - .5), m], [(a2, y1 - .5), (a2, y0 + .5), m]]
                for k, t in enumerate(ts):
                    body += fill(pal["boards"][(k + i + r) % len(pal["boards"])], t)
    return svg(W, H, body), W

FLOORS = {
    "oak": (floor(17, None, {"boards": ["#b08455", "#a67c4f", "#ba8d5d", "#9d744a"], "seam": "#6a4a2c"},
                  {"skirt_hi": "#d9c3a0", "skirt": "#bfa47d", "shadow": "rgba(0,0,0,.35)"}), "#a67c4f"),
    "walnut": (floor(29, None, {"boards": ["#5b3d27", "#523723", "#64442c", "#4a3220"], "seam": "#2c1d12"},
                     {"skirt_hi": "#7a5a40", "skirt": "#5e432e", "shadow": "rgba(0,0,0,.4)"}), "#523723"),
    "stone": (floor(37, None, {"boards": ["#7d8186", "#71767b", "#888c90", "#686d72"], "seam": "#3c3f43"},
                    {"skirt_hi": "#a3a7ab", "skirt": "#7d8186", "shadow": "rgba(0,0,0,.35)"}, kind="tiles"), "#2f3236"),
}

# ================= ラグ（色）: 奥が狭い台形に寝かせる =================
def persp(x, y, W=200, H=40, k=.16):
    """平らな図形（0..W × 0..H）を、奥（上）が少し狭い台形へ"""
    s = 1 - k * (1 - y / H)
    return (W / 2 + (x - W / 2) * s, y)

def rug_round():
    rnd = random.Random(41)
    body, W, H, n = "", 200, 40, 18
    cols = [("#b5573c", "#a64d35", "#c0623f"), ("#d9a35b", "#cf9852"), ("#7a3428", "#6e2f24")]
    import math
    for ring, (rx, ry) in enumerate([(98, 19), (78, 15), (40, 7.6)]):
        ring_c = cols[ring % len(cols)]
        P = [(100 + rx * math.cos(2 * math.pi * i / n), 20 + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]
        for i in range(n):
            body += fill(rnd.choice(ring_c), [persp(*P[i]), persp(*P[(i + 1) % n]), persp(100, 20)])
    return svg(W, H, body)

def rug_kilim():
    rnd = random.Random(43)
    W, H = 200, 40
    red, red2, cream, ind, ochre = "#9c3a2e", "#8e3429", "#e3d3b0", "#2f3f63", "#c99a45"
    body = ""
    for t in quad_tris(rnd, 0, 0, W, H, 8):
        body += fill(rnd.choice([red, red2]), [persp(*p) for p in t])
    for t in quad_tris(rnd, 8, 4, W - 8, H - 4, 6):
        body += fill(rnd.choice([cream, "#d9c79f"]), [persp(*p) for p in t])
    for t in quad_tris(rnd, 14, 8, W - 14, H - 8, 6):
        body += fill(rnd.choice([red, red2]), [persp(*p) for p in t])
    for i, cx in enumerate(range(34, 180, 33)):
        c = [ind, ochre][i % 2]
        body += fill(c, [persp(cx - 13, 20), persp(cx, 11), persp(cx + 13, 20), persp(cx, 29)])
        body += fill(cream, [persp(cx - 5, 20), persp(cx, 16.5), persp(cx + 5, 20), persp(cx, 23.5)])
    for x in range(4, W, 6):  # 房
        body += fill(cream, [persp(x, H - .5), persp(x + 2, H - .5), (persp(x + 1, H)[0], H + 2)])
    return svg(W, H + 2, body)

def rug_fur():
    """ムートン: ふちがぎざぎざの白い毛皮"""
    rnd = random.Random(47)
    import math
    W, H, n = 200, 40, 30
    cols = ["#e9e4da", "#ddd7cb", "#f2eee6", "#cfc8ba"]
    body = ""
    P = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 1 + (rnd.uniform(.04, .14) if i % 2 else -rnd.uniform(0, .06))
        P.append((100 + 92 * r * math.cos(a), 20 + 18 * r * math.sin(a)))
    inner = [(100 + 55 * math.cos(2 * math.pi * i / n * 2) + rnd.uniform(-4, 4), 20 + 10 * math.sin(2 * math.pi * i / n * 2) + rnd.uniform(-1, 1)) for i in range(n // 2)]
    for i in range(n):
        body += fill(rnd.choice(cols), [persp(*P[i]), persp(*P[(i + 1) % n]), persp(*inner[(i // 2) % len(inner)])])
    for i in range(len(inner)):
        body += fill(rnd.choice(cols), [persp(*inner[i]), persp(*inner[(i + 1) % len(inner)]), persp(100, 20)])
    return svg(W, H, body)

RUGS = {"round": rug_round(), "kilim": rug_kilim(), "fur": rug_fur()}

def css():
    out = ["/* 生成ファイル: scripts/room-lowpoly.py で作る。手で直さない */"]
    for key, (fn) in {"plaster": wall_plaster, "planks": wall_planks, "brick": wall_brick}.items():
        s, w, h = fn()
        out.append(f':root[data-wall="{key}"] {{ --wall-mask: {url(s)}; --wall-size: {w}px {h}px; }}')
    for key, ((s, w), base) in FLOORS.items():
        out.append(f':root[data-floor="{key}"] {{ --floor-bg: {url(s)} left top / {w}px 100% repeat-x, {base}; }}')
    for key, s in RUGS.items():
        out.append(f':root[data-rug="{key}"] {{ --rug: {url(s)}; }}')
    return "\n".join(out) + "\n"

dst = os.path.join(os.path.dirname(__file__), "..", "src", "room-lowpoly.css")
open(dst, "w").write(css())
print(os.path.normpath(dst), os.path.getsize(dst))
