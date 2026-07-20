from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "asset-packs" / "cc0-pixel-v10"
PACK.mkdir(parents=True, exist_ok=True)
TRANSPARENT = (0, 0, 0, 0)
INK = (32, 31, 27, 255)
SHADOW = (0, 0, 0, 56)
random.seed(105)


def save(img: Image.Image, name: str) -> None:
    img.save(PACK / name)


def lerp(a: int, b: int, t: float) -> int:
    return int(round(a + (b - a) * t))


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pix = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        col = (lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t), 255)
        for x in range(w):
            pix[x, y] = col
    return img


def rect(d: ImageDraw.ImageDraw, box, fill, outline=INK, radius=0):
    if outline:
        d.rounded_rectangle(box, radius=radius, fill=outline)
        x1, y1, x2, y2 = box
        inset = 2 if min(x2 - x1, y2 - y1) > 18 else 1
        d.rounded_rectangle((x1 + inset, y1 + inset, x2 - inset, y2 - inset), radius=max(0, radius - inset), fill=fill)
    else:
        d.rounded_rectangle(box, radius=radius, fill=fill)


def ellipse(d: ImageDraw.ImageDraw, box, fill, outline=INK):
    if outline:
        d.ellipse(box, fill=outline)
        x1, y1, x2, y2 = box
        d.ellipse((x1 + 1, y1 + 1, x2 - 1, y2 - 1), fill=fill)
    else:
        d.ellipse(box, fill=fill)


def add_noise(img: Image.Image, strength: int = 9) -> Image.Image:
    w, h = img.size
    base = img.copy()
    pix = base.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            n = random.randint(-strength, strength)
            pix[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)), a)
    return base


def seamless_x(img: Image.Image) -> Image.Image:
    w, h = img.size
    for y in range(h):
        # Blend a few columns so tile sprites do not show a hard seam.
        for i in range(4):
            left = img.getpixel((i, y))
            right = img.getpixel((w - 5 + i, y))
            avg = tuple((left[c] + right[c]) // 2 for c in range(4))
            img.putpixel((i, y), avg)
            img.putpixel((w - 5 + i, y), avg)
    return img


def layer_00_sky() -> Image.Image:
    img = gradient((960, 540), (145, 212, 238), (219, 235, 207))
    d = ImageDraw.Draw(img, "RGBA")
    # Atmospheric haze near horizon.
    for y in range(245, 390):
        a = int(64 * (1 - abs(y - 318) / 80))
        if a > 0:
            d.line((0, y, 960, y), fill=(255, 244, 204, a))
    # Fixed sun.
    d.ellipse((800, 50, 866, 116), fill=(255, 244, 150, 255))
    d.ellipse((816, 66, 850, 100), fill=(255, 219, 80, 255))
    # More natural puffy clouds, baked into sky and static.
    def cloud(cx, cy, scale=1.0):
        for dx, dy, rw, rh in [(-60, 12, 52, 22), (-25, -3, 70, 30), (35, 8, 64, 24), (0, 18, 118, 24)]:
            d.rounded_rectangle((cx + int(dx*scale), cy + int(dy*scale), cx + int((dx+rw)*scale), cy + int((dy+rh)*scale)), radius=int(12*scale), fill=(250, 254, 255, 238))
    cloud(170, 80, 1.0)
    cloud(660, 120, 1.1)
    cloud(385, 55, 0.7)
    return img


def layer_01_far_mountains() -> Image.Image:
    w, h = 768, 190
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img, "RGBA")
    colors = [((176, 197, 204, 255), (129, 161, 179, 255)), ((139, 176, 194, 255), (96, 139, 167, 255))]
    for ridx, (light, dark) in enumerate(colors):
        base = 168 - ridx * 16
        peaks = [-50, 72, 188, 306, 438, 568, 710, 838]
        for p in peaks:
            peak_y = 30 + (p * 7 + ridx * 19) % 46
            left = p - 120
            right = p + 128
            d.polygon([(left, base), (p, peak_y), (right, base)], fill=light)
            d.polygon([(p, peak_y), (right, base), (p + 28, base)], fill=dark)
            snow = peak_y + 42
            d.polygon([(p - 34, snow), (p, peak_y + 8), (p + 34, snow)], fill=(244, 251, 252, 255))
            d.polygon([(p - 12, peak_y + 26), (p, peak_y + 8), (p + 12, peak_y + 26)], fill=(255, 255, 255, 255))
    # base haze.
    d.rectangle((0, 158, w, h), fill=(176, 205, 196, 120))
    return seamless_x(add_noise(img, 3))


def wavy_layer(width, height, base, colors, phase, shrubs=False):
    img = Image.new("RGBA", (width, height), TRANSPARENT)
    d = ImageDraw.Draw(img, "RGBA")
    for idx, color in enumerate(colors):
        pts = []
        for x in range(0, width + 1, 6):
            t = x / width
            y = base + idx * 22 + 12 * math.sin(2 * math.pi * (t * (1.3 + idx * .38) + phase)) + 4 * math.sin(2 * math.pi * (t * 4.4 + idx))
            pts.append((x, int(y)))
        d.polygon(pts + [(width, height), (0, height)], fill=color)
    if shrubs:
        for x in range(60, width, 150):
            y = base + 72 + int(6 * math.sin(x * 0.08))
            for dx, r, col in [(-18, 18, colors[-1]), (4, 26, colors[-2]), (28, 16, colors[-1])]:
                d.ellipse((x + dx - r, y - r, x + dx + r, y + r), fill=col)
    return seamless_x(add_noise(img, 4))


def layer_02_far_hills() -> Image.Image:
    return wavy_layer(768, 128, 50, [(159, 198, 146, 255), (135, 184, 131, 255), (120, 172, 121, 255)], 0.13)


def layer_03_mid_hills() -> Image.Image:
    return wavy_layer(768, 146, 62, [(126, 184, 125, 255), (100, 165, 111, 255), (81, 144, 96, 255)], 0.56, True)


def layer_04_sparse_forest() -> Image.Image:
    w, h = 768, 178
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img, "RGBA")
    ground = 155
    d.rectangle((0, ground, w, h), fill=(75, 141, 78, 255))
    def pine(cx, scale):
        y = ground + int(2 * math.sin(cx * .05))
        trunk = int(38 * scale)
        d.rectangle((cx - 4, y - trunk, cx + 4, y), fill=(91, 66, 46, 255))
        for j, (yy, wid, col) in enumerate([(105, 72, (43, 96, 65, 255)), (82, 62, (52, 122, 76, 255)), (60, 50, (68, 147, 86, 255))]):
            d.polygon([(cx, y - int(yy*scale)), (cx - int(wid*scale/2), y - int((yy-48)*scale)), (cx + int(wid*scale/2), y - int((yy-48)*scale))], fill=col)
    # Sparse, leaving hills visible.
    for cx, scale in [(94, .75), (285, .68), (515, .82), (704, .70)]:
        for off in (-w, 0, w):
            pine(cx + off, scale)
    return seamless_x(add_noise(img, 4))


def layer_05_village_back() -> Image.Image:
    w, h = 768, 154
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img, "RGBA")
    ground = 132
    d.rectangle((0, ground, w, h), fill=(90, 157, 88, 255))
    def cottage(x, y, scale):
        ww, hh = int(86*scale), int(62*scale)
        rect(d, (x, y - hh, x + ww, y), (198, 164, 113, 255), radius=3)
        d.polygon([(x - int(12*scale), y - hh + int(7*scale)), (x + ww//2, y - hh - int(48*scale)), (x + ww + int(12*scale), y - hh + int(7*scale))], fill=(55, 58, 58, 255))
        d.polygon([(x - int(6*scale), y - hh + int(8*scale)), (x + ww//2, y - hh - int(39*scale)), (x + ww + int(6*scale), y - hh + int(8*scale))], fill=(99, 112, 118, 255))
        d.rectangle((x + int(40*scale), y - int(32*scale), x + int(57*scale), y - 2), fill=(87, 60, 43, 255))
        for wx in (int(13*scale), int(64*scale)):
            d.rectangle((x + wx, y - int(41*scale), x + wx + int(14*scale), y - int(27*scale)), fill=(237, 223, 168, 255))
            d.rectangle((x + wx + int(6*scale), y - int(41*scale), x + wx + int(8*scale), y - int(27*scale)), fill=(91, 93, 79, 255))
    for x, scale in [(46, .64), (280, .55), (505, .70)]:
        for off in (-w, 0, w):
            cottage(x + off, ground, scale)
    return seamless_x(add_noise(img, 4))


def layer_06_path_ground() -> Image.Image:
    w, h = 768, 234
    img = Image.new("RGBA", (w, h), (91, 171, 88, 255))
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((0, 0, w, 52), fill=(103, 188, 95, 255))
    top = []
    bottom = []
    for x in range(0, w + 1, 8):
        top.append((x, 42 + int(4 * math.sin(2 * math.pi * x / w * 1.6))))
        bottom.append((x, 178 + int(5 * math.sin(2 * math.pi * x / w * 1.6 + .7))))
    d.polygon(top + bottom[::-1], fill=(163, 112, 67, 255))
    u2=[]; l2=[]
    for x in range(0, w+1, 8):
        u2.append((x, 70 + int(3*math.sin(2*math.pi*x/w*1.7 + .2))))
        l2.append((x, 142 + int(4*math.sin(2*math.pi*x/w*1.7 + 1.1))))
    d.polygon(u2 + l2[::-1], fill=(218, 176, 105, 255))
    # path texture stones and edges
    for x in range(10, w, 42):
        y = 82 + int((math.sin(x*.12)+1)*28)
        d.ellipse((x, y, x+9, y+5), fill=(132, 91, 60, 150))
        d.ellipse((x+19, y+28, x+27, y+33), fill=(184, 139, 82, 160))
    lip=[]
    for x in range(0,w+1,8):
        lip.append((x, 178 + int(4 * math.sin(2*math.pi*x/w*2.0))))
    d.polygon(lip + [(w, 196), (0,196)], fill=(72, 146, 70, 255))
    d.rectangle((0, 195, w, h), fill=(99, 71, 48, 255))
    for x in range(0, w, 28):
        d.rectangle((x, 202 + (x//28)%5*4, x+16, 205 + (x//28)%5*4), fill=(76, 56, 43, 255))
    return seamless_x(add_noise(img, 5))


def draw_log(d, x, y, scale=1.0):
    rect(d, (x+6, y+20, x+42, y+31), (126, 78, 43, 255), radius=5)
    ellipse(d, (x+31, y+18, x+45, y+32), (166, 111, 59, 255))
    d.arc((x+34, y+21, x+42, y+29), 0, 360, fill=(92, 56, 34, 255), width=2)
    d.line((x+12, y+23, x+30, y+22), fill=(190, 135, 76, 255), width=2)


def small_objects_sheet() -> Image.Image:
    names = ["log", "stump", "sign", "crate", "barrel", "small_rock", "small_bush", "wildflower"]
    sheet = Image.new("RGBA", (48*len(names),48), TRANSPARENT)
    d=ImageDraw.Draw(sheet,"RGBA")
    for idx,name in enumerate(names):
        x=idx*48; d.ellipse((x+5,42,x+43,47), fill=SHADOW)
        if name=="log": draw_log(d,x,10)
        elif name=="stump":
            rect(d,(x+14,22,x+33,43),(125,81,46,255),radius=4); ellipse(d,(x+12,17,x+35,27),(171,116,65,255)); d.arc((x+17,20,x+31,25),0,360,fill=(84,54,34,255),width=2)
        elif name=="sign":
            d.rectangle((x+23,21,x+26,44), fill=(103,68,42,255)); rect(d,(x+8,14,x+40,27),(218,187,111,255),radius=3); d.rectangle((x+17,20,x+31,22), fill=(85,59,40,255))
        elif name=="crate":
            rect(d,(x+9,20,x+39,43),(148,95,52,255),radius=2); d.line((x+12,23,x+36,40),fill=(84,55,36,255),width=3); d.line((x+36,23,x+12,40),fill=(84,55,36,255),width=3)
        elif name=="barrel":
            rect(d,(x+12,18,x+36,43),(143,90,48,255),radius=8); d.rectangle((x+13,24,x+35,27),fill=(82,75,65,255)); d.rectangle((x+13,35,x+35,38),fill=(82,75,65,255))
        elif name=="small_rock":
            rect(d,(x+12,30,x+38,43),(126,134,128,255),radius=8); d.polygon([(x+17,33),(x+28,30),(x+24,39)], fill=(178,185,177,255))
        elif name=="small_bush":
            for cx,cy,r,col in [(15,34,10,(66,145,75,255)),(27,30,14,(80,171,88,255)),(38,36,9,(59,132,70,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
        elif name=="wildflower":
            for sx, col in [(17,(240,111,144,255)),(27,(255,235,120,255)),(36,(245,245,238,255))]:
                d.line((x+sx,42,x+sx,28),fill=(54,142,67,255),width=2); ellipse(d,(x+sx-5,24,x+sx+5,34),col)
    return sheet


def large_objects_sheet() -> Image.Image:
    names=["large_pine","large_oak","large_cottage","large_house","boulder","well","large_mushroom","arch"]
    frame=96; sheet=Image.new("RGBA",(frame*len(names),frame),TRANSPARENT); d=ImageDraw.Draw(sheet,"RGBA")
    for idx,name in enumerate(names):
        x=idx*frame; d.ellipse((x+7,88,x+89,95),fill=SHADOW)
        if name=="large_pine":
            d.rectangle((x+45,46,x+54,92),fill=(90,62,40,255))
            for yy,wid,col in [(5,82,(34,91,55,255)),(25,74,(44,120,68,255)),(48,60,(69,153,84,255))]:
                d.polygon([(x+49,yy),(x+49-wid//2,yy+54),(x+49+wid//2,yy+54)],fill=INK); d.polygon([(x+49,yy+3),(x+51-wid//2,yy+52),(x+47+wid//2,yy+52)],fill=col)
        elif name=="large_oak":
            d.rectangle((x+42,48,x+57,92),fill=(96,62,42,255));
            for cx,cy,r,col in [(33,45,26,(72,142,77,255)),(60,44,29,(89,166,87,255)),(47,25,31,(102,184,94,255)),(49,62,24,(64,131,73,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
            d.line((x+49,58,x+35,45),fill=(79,49,35,255),width=4)
        elif name=="large_cottage":
            rect(d,(x+12,42,x+84,92),(205,168,112,255),radius=4); d.polygon([(x+5,45),(x+48,7),(x+91,45)],fill=INK); d.polygon([(x+10,45),(x+48,13),(x+86,45)],fill=(89,101,108,255)); d.rectangle((x+42,64,x+59,92),fill=(83,58,42,255));
            for wx in [23,65]: d.rectangle((x+wx,56,x+wx+13,70),fill=(242,220,151,255)); d.rectangle((x+wx+6,56,x+wx+8,70),fill=(91,87,68,255))
        elif name=="large_house":
            rect(d,(x+9,31,x+88,92),(184,150,106,255),radius=3); d.polygon([(x+5,35),(x+48,7),(x+92,35)],fill=(51,57,63,255)); d.polygon([(x+10,36),(x+48,12),(x+87,36)],fill=(90,103,111,255)); d.rectangle((x+25,63,x+44,92),fill=(80,58,42,255)); d.rectangle((x+58,51,x+76,68),fill=(236,221,162,255)); d.rectangle((x+14,49,x+32,64),fill=(236,221,162,255))
        elif name=="boulder":
            rect(d,(x+17,54,x+82,92),(118,130,126,255),radius=16); d.polygon([(x+26,61),(x+45,55),(x+39,77)],fill=(176,185,177,255)); d.polygon([(x+56,61),(x+73,70),(x+54,84)],fill=(85,100,97,255))
        elif name=="well":
            rect(d,(x+24,55,x+73,92),(116,118,112,255),radius=5); d.rectangle((x+28,64,x+69,68),fill=(65,68,69,255)); d.polygon([(x+14,55),(x+48,23),(x+82,55)],fill=INK); d.polygon([(x+19,55),(x+48,29),(x+77,55)],fill=(108,115,119,255)); d.rectangle((x+27,46,x+31,78),fill=(91,62,41,255)); d.rectangle((x+66,46,x+70,78),fill=(91,62,41,255))
        elif name=="large_mushroom":
            rect(d,(x+41,57,x+55,92),(235,207,159,255),radius=5); d.pieslice((x+15,26,x+81,76),180,360,fill=INK); d.pieslice((x+19,30,x+77,74),180,360,fill=(193,67,70,255));
            for dx,dy in [(33,42),(49,35),(62,50)]: d.ellipse((x+dx,dy,x+dx+8,dy+6),fill=(255,232,178,255))
        elif name=="arch":
            rect(d,(x+18,37,x+78,92),(124,127,124,255),radius=5); d.pieslice((x+28,42,x+68,102),180,360,fill=(34,37,42,255));
            for xx in [24,42,60]: d.rectangle((x+xx,47,x+xx+12,54),fill=(159,162,158,255))
    return sheet.resize((256 * len(names), 256), Image.Resampling.LANCZOS)


def front_objects_sheet() -> Image.Image:
    names=["front_grass","front_flower","front_rock","front_bush","fern","front_mushroom"]
    frame=64; sheet=Image.new("RGBA",(frame*len(names),frame),TRANSPARENT); d=ImageDraw.Draw(sheet,"RGBA")
    for idx,name in enumerate(names):
        x=idx*frame; d.ellipse((x+5,57,x+59,63),fill=SHADOW)
        if name=="front_grass":
            for i in range(16):
                xx=x+5+i*4; d.polygon([(xx,62),(xx+2,28+(i%5)*2),(xx+6,62)],fill=(44,134,61,255))
        elif name=="front_flower":
            for stem,col in [(17,(247,112,145,255)),(31,(255,241,123,255)),(47,(244,244,235,255))]: d.line((x+stem,61,x+stem,32),fill=(45,127,58,255),width=2); ellipse(d,(x+stem-7,26,x+stem+7,40),col)
        elif name=="front_rock":
            rect(d,(x+10,40,x+55,62),(119,132,128,255),radius=9); d.polygon([(x+17,44),(x+31,40),(x+27,55)],fill=(174,184,178,255))
        elif name=="front_bush":
            for cx,cy,r,col in [(18,49,16,(67,146,76,255)),(34,41,21,(82,172,89,255)),(51,50,15,(58,132,71,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
        elif name=="fern":
            for i in range(9): d.line((x+32,62,x+9+i*6,40-abs(4-i)*2),fill=(48,134,63,255),width=3); d.line((x+32,62,x+55-i*5,39-abs(4-i)*2),fill=(65,162,79,255),width=3)
        elif name=="front_mushroom":
            rect(d,(x+28,43,x+37,62),(235,207,159,255),radius=3); d.pieslice((x+12,28,x+53,58),180,360,fill=INK); d.pieslice((x+16,32,x+49,56),180,360,fill=(194,69,72,255)); d.ellipse((x+25,39,x+31,44),fill=(255,235,181,255)); d.ellipse((x+38,42,x+44,47),fill=(255,235,181,255))
    return sheet


# This generator intentionally updates only scenery/background/object assets.
# Hero and monster sprites are kept as their existing sprite sheets so animation
# frame ranges remain stable.
for name, image in [
    ("layer-00-sky.png", layer_00_sky()),
    ("layer-01-far-mountains.png", layer_01_far_mountains()),
    ("layer-02-far-hills.png", layer_02_far_hills()),
    ("layer-03-mid-hills.png", layer_03_mid_hills()),
    ("layer-04-sparse-forest.png", layer_04_sparse_forest()),
    ("layer-05-village-back.png", layer_05_village_back()),
    ("layer-06-path-ground.png", layer_06_path_ground()),
    ("objects-small.png", small_objects_sheet()),
    ("objects-large.png", large_objects_sheet()),
    ("objects-front.png", front_objects_sheet()),
]:
    save(image, name)

print("Generated v0.10.5 realistic-style parallax/object assets in", PACK)
