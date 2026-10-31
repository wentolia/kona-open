# 棚の素材「ローポリ」系の棚板を作る: 猫や小物と同じ、平らな多角形と濃淡で刻んだ板（上面・前面・下の面取り）、
# 節などの飾り、両端の木口と釘、下の三角の棚受け。素材ごとに色と飾りを替える。
#   python3 scripts/shelf-lowpoly.py  → src/shelf-lowpoly.css を書き出す（手で直さない）
# 乱数の種は素材ごとに固定しているので、何度作っても同じ形になる。
import random, urllib.parse, os

W, H = 420, 16  # タイル 1 枚の幅と高さ（高さは --board に合わせて伸び縮みする）

def svg(w, h, polys, par="none"):
    body = "".join(
        f'<polygon fill="{c}" stroke="{c}" stroke-width=".25" stroke-linejoin="round" points="{" ".join(f"{round(x, 1)},{round(y, 1)}" for x, y in pts)}"/>'
        for c, pts in polys)
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="{par}">{body}</svg>'
    return "url(\"data:image/svg+xml," + urllib.parse.quote(s, safe=' =:/",.').replace('"', "'") + "\")"

def flip(polys, w):
    return [(c, [(w - x, y) for x, y in p]) for c, p in polys]

def strip(rnd, out, y0, y1, pal, n, jit):
    """y0〜y1 の帯を、上下の辺の点をずらした三角形で埋める（左右の端は揃えて継ぎ目を出さない）"""
    def xs():
        r = [0] + [i * W / n + rnd.uniform(-jit, jit) for i in range(1, n)] + [W]
        return r
    a, b = xs(), xs()
    i = k = 0
    while i < len(a) - 1 or k < len(b) - 1:
        if k >= len(b) - 1 or (i < len(a) - 1 and a[i + 1] <= b[k + 1]):
            out.append((rnd.choice(pal), [(a[i], y0), (a[i + 1], y0), (b[k], y1)])); i += 1
        else:
            out.append((rnd.choice(pal), [(a[i], y0), (b[k + 1], y1), (b[k], y1)])); k += 1

def board(seed, top, mid, lo, deep, n=(21, 16, 19, 23), jit=(4, 8, 7, 5), extra=None):
    rnd = random.Random(seed)
    out = []
    for (y0, y1), pal, cnt, j in zip([(0, 4), (4, 8.5), (8.5, 12.5), (12.5, 16)], [top, mid, mid + lo, deep], n, jit):
        strip(rnd, out, y0, y1, pal, cnt, j)
    if extra: extra(rnd, out)
    return out

# ---------- 飾り ----------
def knot(c1, c2, at=263):
    def f(rnd, out):
        cx, cy = at, 8.5
        out.append((c1, [(cx - 5, cy), (cx - 2, cy - 2.2), (cx + 3, cy - 1.8), (cx + 5.5, cy + .3), (cx + 2, cy + 2.2), (cx - 3, cy + 1.8)]))
        out.append((c2, [(cx - 2, cy), (cx, cy - 1), (cx + 2.5, cy - .3), (cx + 1, cy + 1)]))
    return f

def birch_marks(c):
    """白樺の皮目: 横に細長い黒い切れ込み"""
    def f(rnd, out):
        for x in (38, 121, 177, 290, 352):
            y, w = rnd.uniform(5, 11), rnd.uniform(7, 14)
            out.append((c, [(x, y), (x + w * .4, y - .9), (x + w, y - .2), (x + w * .6, y + .8)]))
    return f

def cracks(c):
    """石のひび: 細い折れ線"""
    def f(rnd, out):
        for x in (84, 247, 371):
            pts = [(x, 4)]
            for _ in range(3): pts.append((pts[-1][0] + rnd.uniform(-3, 4), pts[-1][1] + rnd.uniform(2.5, 3.5)))
            out += [(c, [a, b, (b[0] + .7, b[1]), (a[0] + .7, a[1])]) for a, b in zip(pts, pts[1:])]
    return f

def moss(greens):
    """苔: 上面にこんもりと、ところどころ前面へ垂れる"""
    def f(rnd, out):
        x = rnd.uniform(0, 30)
        while x < W - 40:
            w = rnd.uniform(26, 60)
            pts = [(x, 4.5)] + [(x + w * t, rnd.uniform(-.6, 1.5)) for t in (.15, .35, .6, .85)] + [(x + w, 4.5)]
            out.append((rnd.choice(greens), pts))
            if rnd.random() < .6:
                d = x + w * rnd.uniform(.3, .7)
                out.append((rnd.choice(greens), [(d - 3, 4), (d + 3, 4), (d + .5, rnd.uniform(7, 10))]))
            x += w + rnd.uniform(20, 70)
    return f

def snow(whites):
    """雪: 上面を覆い、前面へ少し垂れる"""
    def f(rnd, out):
        xs = [0] + sorted(rnd.uniform(0, W) for _ in range(26)) + [W]
        for a, b in zip(xs, xs[1:]):
            out.append((rnd.choice(whites), [(a, 0), (b, 0), (b, rnd.uniform(4, 6.5)), (a, rnd.uniform(4, 6.5))]))
        for _ in range(9):
            d = rnd.uniform(10, W - 10)
            out.append((rnd.choice(whites), [(d - 4, 5), (d + 4, 5), (d + rnd.uniform(-1, 1), rnd.uniform(7.5, 9.5))]))
    return f

# ---------- 両端と棚受け ----------
def cap(end, cut, grain, nail, nail_hi, top):
    ps = [(end, [(0, 0), (7, 0), (5, 4), (0, 4)]), (cut, [(0, 4), (5, 4), (5, 12.5), (0, 12.5)]), (grain, [(0, 12.5), (5, 12.5), (7, 16), (0, 16)]),
          (top, [(5, 0), (7, 0), (5, 4)])]
    if nail:
        ps += [(nail, [(9, 6.5), (11, 5.6), (13, 6.5), (13, 9), (11, 9.9), (9, 9)]), (nail_hi, [(9, 6.5), (11, 5.6), (13, 6.5), (11, 7.4)])]
    return ps

def bracket(a, b, c, d):
    return [(a, [(0, 0), (16, 0), (3, 13)]), (b, [(0, 0), (3, 13), (0, 13)]), (c, [(0, 0), (16, 0), (9, 2.5)]), (d, [(3, 13), (16, 0), (9, 5)])]

def icicles(rnd, c1, c2):
    out = []
    x = 6
    while x < W - 10:
        w, h = rnd.uniform(3, 6), rnd.uniform(4, 11)
        out.append((rnd.choice([c1, c2]), [(x, 0), (x + w, 0), (x + w * .45, h)]))
        x += w + rnd.uniform(18, 60)
    return out

# ---------- 素材 ----------
SKINS = [
    # key, 説明, 種, 上面, 前面, 前面の陰, 面取り, 飾り, 木口(end, cut, grain, top), 釘(色, 光), 棚受け 4 色, 木の色(wood, hi, lo), 側板, 板の厚み
    dict(key="lowpoly", note="木", seed=7,
         top=["#d2a26c", "#c79763", "#dcae78"], mid=["#a8744a", "#9c6b43", "#b07c50", "#a06e45"], lo=["#875a37", "#7d5333", "#8f603b"], deep=["#55361f", "#4b301c", "#5d3b22"],
         extra=knot("#6e4529", "#4f311c"), cap=("#6a4327", "#5a3820", "#3f2716", "#c9a070"), nail=("#2a2622", "#6b655d"),
         bracket=("#8a5c38", "#6e4729", "#a8744a", "#55361f"), wood=("#9c6b43", "#d2a26c", "#55361f"), side="#6e4729"),
    dict(key="lowpoly-birch", note="白樺", seed=11,
         top=["#f1e6d0", "#e8dcc2", "#f6eddb"], mid=["#dccdb0", "#d3c3a4", "#e2d4b9"], lo=["#c2b090", "#b8a685"], deep=["#8f7b5c", "#857152", "#9a8664"],
         extra=birch_marks("#3b332b"), cap=("#cdb995", "#bca783", "#8a7556", "#f3e9d6"), nail=("#3a3a3c", "#8a8a8e"),
         bracket=("#cbb995", "#b19f7c", "#e2d4b9", "#8f7b5c"), wood=("#d3c3a4", "#f1e6d0", "#8f7b5c"), side="#b8a685"),
    dict(key="lowpoly-ebony", note="黒檀と真鍮", seed=23,
         top=["#5a4234", "#4f392d", "#634a3a"], mid=["#3a2a22", "#33251e", "#402f26"], lo=["#2a1e18", "#251a15"], deep=["#171110", "#1c1513", "#130e0c"],
         extra=None, cap=("#2d211b", "#241a15", "#140f0c", "#6e5444"), nail=("#a9823e", "#f0d08a"),
         bracket=("#3a2a22", "#2a1e18", "#4f392d", "#171110"), wood=("#3a2a22", "#634a3a", "#171110"), side="#241a15"),
    dict(key="lowpoly-stone", note="石板", seed=31, n=(11, 8, 9, 12), jit=(9, 14, 12, 9),
         top=["#a9adb0", "#9ea3a7", "#b4b8ba"], mid=["#80868b", "#767c82", "#8a8f94", "#7c8186"], lo=["#62676c", "#5a5f64"], deep=["#3b3f43", "#34383c", "#42464a"],
         extra=cracks("#3a3d40"), cap=("#6c7176", "#5d6267", "#3b3f43", "#b4b8ba"), nail=None,
         bracket=("#767c82", "#5d6267", "#8a8f94", "#3b3f43"), wood=("#7c8186", "#b4b8ba", "#3b3f43"), side="#5a5f64"),
    dict(key="lowpoly-moss", note="苔むした木", seed=43,
         top=["#8d7553", "#83694a", "#97805c"], mid=["#6c553b", "#634d35", "#735b40"], lo=["#523f2b", "#4a3826"], deep=["#2f2418", "#291f15", "#35291c"],
         extra=moss(["#6f8f3a", "#5f7f33", "#86a447", "#4f6d2c"]), cap=("#4d3b28", "#423222", "#2a2015", "#97805c"), nail=("#3a3530", "#6e6a62"),
         bracket=("#634d35", "#4a3826", "#735b40", "#2f2418"), wood=("#6c553b", "#97805c", "#2f2418"), side="#4a3826"),
    dict(key="lowpoly-snow", note="雪", seed=59,
         top=["#b58a5b", "#aa8053", "#be9363"], mid=["#8f6440", "#86603c", "#976a45"], lo=["#6d4a2e", "#64432a"], deep=["#3f2918", "#382415", "#45301c"],
         extra=snow(["#f4f7fb", "#e6edf5", "#dbe5f0", "#ffffff"]), cap=("#5e3f26", "#4f3520", "#352313", "#f4f7fb"), nail=("#2a2622", "#6b655d"),
         bracket=("#86603c", "#64432a", "#976a45", "#3f2918"), wood=("#8f6440", "#be9363", "#3f2918"), side="#64432a", icicles=("#dfeaf5", "#c8d9ea")),
]

def css():
    out = ["/* 生成ファイル: scripts/shelf-lowpoly.py で作る。手で直さない */"]
    sel = ", ".join(f':root[data-shelf="{s["key"]}"]' for s in SKINS)
    out.append(f"""{sel} {{
  --board: 16px; --board-shadow: 0 10px 14px -8px rgba(0, 0, 0, .7); --side: 10px;
}}
:is({sel}) :is(.mod-shelf, .shelf, .m-shelf)::before {{
  content: ""; position: absolute; left: calc(var(--inset, 0px) + 6%); right: calc(var(--inset, 0px) + 6%); bottom: -13px; height: 13px;
  background: var(--bracket); pointer-events: none; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .45));
}}""")
    for s in SKINS:
        polys = board(s["seed"], s["top"], s["mid"], s["lo"], s["deep"], s.get("n", (21, 16, 19, 23)), s.get("jit", (4, 8, 7, 5)), s["extra"])
        e, c, g, t = s["cap"]
        nail = s["nail"] or (None, None)
        left = cap(e, c, g, nail[0], nail[1], t)
        br = bracket(*s["bracket"])
        wood, hi, lo = s["wood"]
        brk = [f"{svg(16, 13, br, 'xMidYMid meet')} left top / 16px 13px no-repeat", f"{svg(16, 13, flip(br, 16), 'xMidYMid meet')} right top / 16px 13px no-repeat"]
        if s.get("icicles"):
            ic = icicles(random.Random(s["seed"] + 1), *s["icicles"])
            brk.append(f"{svg(W, 13, ic)} left top / {W}px 13px repeat-x")
        out.append(f""":root[data-shelf="{s['key']}"] {{ /* {s['note']} */
  --wood: {wood}; --wood-hi: {hi}; --wood-lo: {lo}; --side-c: {s['side']};
  --board-bg:
    {svg(14, 16, left)} left top / 14px 100% no-repeat,
    {svg(14, 16, flip(left, 14))} right top / 14px 100% no-repeat,
    {svg(W, H, polys)} left top / {W}px 100% repeat-x,
    {s['mid'][0]};
  --bracket:
    {(',' + chr(10) + '    ').join(brk)};
}}""")
    return "\n".join(out) + "\n"

dst = os.path.join(os.path.dirname(__file__), "..", "src", "shelf-lowpoly.css")
open(dst, "w").write(css())
print(dst, os.path.getsize(dst))
