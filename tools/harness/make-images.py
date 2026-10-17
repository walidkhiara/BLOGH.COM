"""Generates flat stand-in images for the harness (layout testing only — not store photography)."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1] if len(sys.argv) > 1 else 'img'
os.makedirs(out, exist_ok=True)
colors = {'black': (28,28,30), 'white': (235,235,232), 'sage': (140,158,132), 'navy': (36,44,72), 'red': (170,40,44), 'grey': (120,120,124), 'sand': (196,178,150), 'lilac': (170,150,196)}
def garment(c, kind, alt=False, w=900, h=1125):
    bg = (226,226,223) if alt else (238,238,236)
    im = Image.new('RGB', (w, h), bg); d = ImageDraw.Draw(im); cx = w // 2
    if kind == 'top':
        d.rounded_rectangle([cx-190,300,cx+190,820], 40, fill=c)
        d.polygon([(cx-190,320),(cx-330,520),(cx-270,570),(cx-190,450)], fill=c)
        d.polygon([(cx+190,320),(cx+330,520),(cx+270,570),(cx+190,450)], fill=c)
        d.ellipse([cx-70,270,cx+70,350], fill=bg)
    else:
        d.rounded_rectangle([cx-170,200,cx+170,330], 20, fill=c)
        d.polygon([(cx-170,300),(cx-10,300),(cx-30,1000),(cx-150,1000)], fill=c)
        d.polygon([(cx+10,300),(cx+170,300),(cx+150,1000),(cx+30,1000)], fill=c)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if alt else im
for name, c in colors.items():
    for kind in ('top', 'bottom'):
        garment(c, kind).save(f'{out}/{kind}-{name}.jpg', quality=85)
        garment(c, kind, True).save(f'{out}/{kind}-{name}-2.jpg', quality=85)
def campaign(name, w, h, tone):
    im = Image.new('RGB', (w, h), tone); d = ImageDraw.Draw(im)
    for i in range(h):
        k = i / h; d.line([(0,i),(w,i)], fill=tuple(int(t*(0.55+0.6*k)) for t in tone))
    fx = int(w*0.66); s = h/1400
    d.ellipse([fx-60*s,180*s,fx+60*s,320*s], fill=(18,18,20))
    d.polygon([(fx-150*s,340*s),(fx+150*s,340*s),(fx+110*s,800*s),(fx-110*s,800*s)], fill=(18,18,20))
    d.polygon([(fx-110*s,790*s),(fx-10*s,790*s),(fx-60*s,1400*s),(fx-170*s,1400*s)], fill=(14,14,16))
    d.polygon([(fx+10*s,790*s),(fx+110*s,790*s),(fx+200*s,1400*s),(fx+80*s,1400*s)], fill=(14,14,16))
    d.polygon([(fx+150*s,350*s),(fx+330*s,120*s),(fx+370*s,150*s),(fx+170*s,470*s)], fill=(18,18,20))
    im.filter(ImageFilter.GaussianBlur(1.2)).save(f'{out}/{name}.jpg', quality=82)
for name, w, h, tone in [('hero',2600,1500,(150,140,128)),('hero-mobile',1200,1800,(150,140,128)),('tile-women',1200,1500,(176,160,150)),('tile-men',1200,1500,(110,120,130)),('campaign-split',1600,1400,(120,132,120)),('campaign-full',2600,1400,(90,100,120)),('editorial',1200,1440,(170,150,130)),('editorial-2',1200,900,(130,130,140)),('collection',2600,1100,(120,110,105))]:
    campaign(name, w, h, tone)
