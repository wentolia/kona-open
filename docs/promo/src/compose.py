import json
CSS = """
<link rel="stylesheet" href="fonts/zen-old-mincho/400.css">
<link rel="stylesheet" href="fonts/zen-kaku-gothic-new/400.css">
<style>
*{margin:0;box-sizing:border-box}
html,body{width:%(w)dpx;height:%(h)dpx;overflow:hidden}
body{background:radial-gradient(120%% 90%% at 50%% 0%%,#2a2622 0%%,#17171a 60%%,#121215 100%%);color:#ece4d8;
 font-family:'Zen Old Mincho',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:%(gap)dpx;position:relative}
.shot{display:block;border-radius:%(r)dpx;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06);object-fit:cover}
.copy{font-size:%(fs)dpx;letter-spacing:.12em;line-height:1.6;text-align:center}
.mark{font-family:'Zen Kaku Gothic New',sans-serif;font-size:%(ms)dpx;letter-spacing:.42em;color:#c9a46a;padding-left:.42em}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:%(gg)dpx}
.grid img{width:100%%;display:block;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.05)}
.foot{display:flex;flex-direction:column;align-items:center;gap:10px}
.bleed{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover}
.over{position:absolute;left:0;right:0;bottom:0;padding:120px 48px 34px;background:linear-gradient(transparent,rgba(14,14,16,.92));display:flex;align-items:flex-end;justify-content:space-between}
</style>"""
def page(name,w,h,body,**k):
    d=dict(w=w,h=h,gap=26,r=10,fs=26,ms=15,gg=14); d.update(k)
    open(f'{name}.html','w').write(f'<!doctype html><meta charset=utf-8>{CSS%d}<body>{body}</body>')
    return dict(name=name,w=w,h=h)
P=[]
# 1 hero framed
P.append(page('hero',1200,630,'''<img class=shot src="a.png" style="width:1000px;height:525px">
<div class=foot style="flex-direction:row;gap:26px;align-items:baseline"><span class=mark>KONA</span><span class=copy style="font-size:20px">ジャケットで選ぶ、ちいさな音楽プレイヤー</span></div>''',gap=22))
# 2 hero bleed
P.append(page('hero-bleed',1200,630,'''<img class=bleed src="a.png">
<div class=over><span class=copy style="font-size:22px;text-align:left">ジャケットで選ぶ、ちいさな音楽プレイヤー</span><span class=mark>KONA</span></div>'''))
# 3 covers square
P.append(page('covers',1080,1080,'''<div class=copy style="font-size:34px">今夜の一枚を、背表紙から。</div>
<img class=shot src="b-crop.png" style="width:960px;height:624px">
<span class=mark>KONA</span>''',gap=46))
# 4 cats square
P.append(page('cats',1080,1080,'''<div class=copy style="font-size:34px">猫も、たくさんいます。</div>
<img class=shot src="c-crop.png" style="width:960px;height:720px">
<span class=mark>KONA</span>''',gap=40))
# 5 rooms 1200x630
g='<div class=grid style="width:%dpx">'+''.join(f'<img src="{f}">' for f in ['a.png','v2.png','v3.png','v4.png'])+'</div>'
P.append(page('rooms',1200,630,(g%880)+'''<div class=foot style="flex-direction:row;gap:26px;align-items:baseline"><span class=mark>KONA</span><span class=copy style="font-size:20px">部屋は、好きなように。</span></div>''',gap=20))
# 6 rooms square
P.append(page('rooms-square',1080,1080,'<div class=copy style="font-size:34px">部屋は、好きなように。</div>'+(g%960)+'<span class=mark>KONA</span>',gap=44,gg=16))
json.dump(P,open('pages.json','w'))
