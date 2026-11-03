# 位置 → 土地のコード（都道府県 JP-01〜47・国 ISO 3166-1）を端末の中で引くための地図を作る。
# 元データ: Natural Earth（パブリックドメイン）の admin-1（日本の都道府県）と admin-0 50m（国）。
#   python3 scripts/region-map.py ne_10m_admin_1_states_provinces.geojson ne_50m_admin_0_countries.geojson
# → src/region-map.ts（形。必要になったときだけ読み込む）と src/region-names.ts（名前）を書き出す
import json, sys, math

Q = 100  # 0.01 度で丸める（約 1 km）

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]; d = abs(dy * (px - ax) - dx * (py - ay)) / L if (dx or dy) else math.hypot(px - ax, py - ay)
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def rings(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [p[0] for p in polys]  # 外周だけ（湖や穴は無視してよい粗さ）

def enc(ring, tol, min_area):
    r = dp(ring, tol)
    if len(r) < 4 or area(r) < min_area: return None
    q = [(round(x * Q), round(y * Q)) for x, y in r[:-1]]
    out, px, py = [], 0, 0
    for x, y in q:
        out += [x - px, y - py]; px, py = x, y
    return ",".join(map(str, out))

RENAME = {"TW": "台湾", "US": "アメリカ", "TH": "タイ", "KR": "韓国", "CN": "中国", "GB": "イギリス", "RU": "ロシア"}  # 呼び名を短く・ふだんの言い方に
a1, a0 = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
shapes, names = [], {}
for f in sorted((f for f in a1["features"] if f["properties"].get("adm0_a3") == "JPN"), key=lambda f: f["properties"]["iso_3166_2"]):
    p = f["properties"]; code = p["iso_3166_2"]
    rs = [e for e in (enc(r, .012, .0004) for r in rings(f["geometry"])) if e]
    shapes.append([code, rs]); names[code] = [p.get("name_ja") or p["name"], p["name"].replace("ō", "o").replace("Ō", "O")]
for f in a0["features"]:
    p = f["properties"]; exact = len(p["ISO_A2"]) == 2; code = p["ISO_A2"] if exact else p["ISO_A2_EH"]
    if len(code) != 2 or code == "JP" or not f["geometry"]: continue
    rs = [e for e in (enc(r, .06, .01) for r in rings(f["geometry"])) if e]
    if not rs: continue
    shapes.append([code, rs])
    # 名前は本土のもの（ISO_A2 がそのまま合うもの）を優先する。海外領は本土の名前を上書きしない
    if exact or code not in names: names[code] = [RENAME.get(code, p["NAME_JA"] or p["NAME"]), p["NAME"]]

with open("src/region-map.ts", "w") as o:
    o.write("// 土地の形（scripts/region-map.py が Natural Earth から作る。手で直さない）。[コード, 外周（0.01 度の差分を , で並べたもの）…]\n")
    o.write("// 都道府県が先、国が後。位置から土地を引くときだけ読み込む（region.ts）\n")
    o.write("export const SHAPES: [string, string[]][] = " + json.dumps(shapes, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open("src/region-names.ts", "w") as o:
    o.write("// 土地の名前 [日本語, 英語]（scripts/region-map.py が作る。手で直さない）\n")
    o.write("export const NAMES: Record<string, [string, string]> = " + json.dumps(names, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(shapes), sum(len(s[1]) for s in shapes))
