import os, random, math, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
random.seed(7)
OUT = sys.argv[1]
S = 600
PAL = [
 ((34,52,74),(214,170,110)), ((196,90,64),(240,226,200)), ((60,90,70),(225,215,180)),
 ((28,28,34),(200,60,60)), ((230,220,200),(40,60,90)), ((120,70,110),(240,190,120)),
 ((20,60,90),(110,190,200)), ((210,180,90),(50,40,40)), ((70,80,110),(230,140,120)),
 ((240,236,226),(30,30,30)), ((90,40,40),(220,160,120)), ((40,70,60),(200,230,200)),
 ((150,170,190),(250,245,235)), ((30,30,60),(250,210,90)), ((180,120,90),(60,40,30)),
 ((220,200,210),(90,70,120)), ((50,50,50),(160,160,150)), ((200,110,80),(30,50,70)),
]
def grain(im, a=14):
    n = Image.effect_noise((S,S), 40).convert("L")
    n = Image.merge("RGB",(n,n,n))
    return Image.blend(im, Image.composite(im, n, Image.new("L",(S,S),255-a)), 1)
def cover(i, title):
    bg, fg = PAL[i % len(PAL)]
    im = Image.new("RGB",(S,S),bg); d = ImageDraw.Draw(im)
    st = i % 7
    if st == 0:   # sun
        r = random.randint(110,170); x = random.randint(200,400); y = random.randint(180,380)
        d.ellipse((x-r,y-r,x+r,y+r), fill=fg)
    elif st == 1: # bands
        h = random.randint(140,220)
        d.rectangle((60,60,540,60+h), fill=fg)
        d.rectangle((60,80+h,540,540), fill=tuple(int((a+b)/2) for a,b in zip(bg,fg)))
        im = im.filter(ImageFilter.GaussianBlur(6))
    elif st == 2: # horizon gradient
        for y in range(S):
            t = y/S; t2 = min(1,max(0,(t-0.62)*8))
            c = tuple(int(bg[k]*(1-t)+fg[k]*t) for k in range(3))
            if t>0.62: c = tuple(int(c[k]*0.45) for k in range(3))
            d.line((0,y,S,y), fill=c)
    elif st == 3: # dot grid
        n = random.choice([6,8,10]); g = 440/n
        for a in range(n):
            for b in range(n):
                r = g*0.18*(1+ (a+b)%3*0.4)
                cx, cy = 80+g*a+g/2, 80+g*b+g/2
                d.ellipse((cx-r,cy-r,cx+r,cy+r), fill=fg)
    elif st == 4: # rings
        cx, cy = 300, 300
        for k, r in enumerate(range(280, 20, -26)):
            d.ellipse((cx-r,cy-r,cx+r,cy+r), outline=fg, width=3)
    elif st == 5: # lines
        for k in range(0, S*2, 22):
            d.line((k,0,k-S,S), fill=fg, width=2 if k%66 else 6)
    else:         # blocks
        for _ in range(5):
            x=random.randint(0,420); y=random.randint(0,420); w=random.randint(60,240); h=random.randint(60,240)
            c = tuple(min(255,max(0,fg[k]+random.randint(-50,50))) for k in range(3))
            d.rectangle((x,y,x+w,y+h), fill=c)
        im = im.filter(ImageFilter.GaussianBlur(2))
    im = grain(im)
    if i % 3 == 0:
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        light = sum(bg) > 400 and st not in (0,)
        d.text((36, S-56), title.lower(), font=f, fill=(30,30,30) if sum(im.getpixel((40,S-40)))>380 else (235,230,220))
    return im
ALBUMS = {
 "jazz": [("Blue Hour","Mila Okada",1961),("Paper Moon","The Saltmarsh Trio",1958),("Night Ferry","Iris Lund",1964),("Low Tide","Ono Quartet",1959),("Copper","June Hale",1966),("Lanterns","Asa Kimura",1962),("Morning Ash","Tomas Weil",1957)],
 "ambient": [("Northern Rooms","Field Office",2014),("Glass Garden","Hiro Sato",2019),("Kiln","Wren",2016),("Small Hours","Lumen Park",2021),("Field Notes","Tallow",2012),("Orchard","Mae Ito",2018)],
 "songs": [("Driftwood","Coastal Lines",2009),("Saltwater","Nao",2017),("Iron Bloom","The Pines",2011),("Kintsugi","Sora Mori",2020),("Window Seat","Elsa Berg",2015),("Quiet Machines","Hollow Ink",2013),("Late Bus","Ren Takagi",2022)],
}
i = 0
for shelf, al in ALBUMS.items():
    for title, artist, year in al:
        d = os.path.join(OUT, shelf, title); os.makedirs(d, exist_ok=True)
        cover(i, title).save(os.path.join(d,"cover.jpg"), quality=90)
        n = random.randint(4,7)
        for t in range(1,n+1):
            name = random.choice(["Prelude","Harbor","Snow","Evening","Waltz","Return","Lights","Stairs","Letters","Rain","Tea","Coda"])
            p = os.path.join(d, f"{t:02d} {name}.mp3")
            subprocess.run(["ffmpeg","-loglevel","error","-y","-f","lavfi","-i",f"sine=frequency={220+40*t}:duration={random.randint(150,280)}","-af","volume=0.05","-b:a","32k",
              "-metadata",f"title={name}","-metadata",f"artist={artist}","-metadata",f"album_artist={artist}","-metadata",f"album={title}","-metadata",f"date={year}","-metadata",f"track={t}/{n}",p],check=True)
        i += 1
print(i)
