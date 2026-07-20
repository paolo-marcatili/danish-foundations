from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "asset-packs" / "cc0-pixel-v10"
PACK.mkdir(parents=True, exist_ok=True)

TRANSPARENT = (0, 0, 0, 0)
INK = (28, 25, 22, 255)
SKIN = (239, 181, 128, 255)
SKIN_DARK = (185, 112, 76, 255)
HAIR = (98, 55, 28, 255)
HAIR_DARK = (54, 31, 21, 255)
GREEN = (64, 122, 60, 255)
GREEN_DARK = (33, 77, 43, 255)
LEATHER = (108, 72, 44, 255)
LEATHER_DARK = (68, 44, 31, 255)
METAL = (188, 205, 211, 255)
METAL_DARK = (89, 111, 123, 255)
RED = (186, 55, 44, 255)
SHADOW = (0, 0, 0, 58)


def save(img: Image.Image, name: str) -> None:
    img.save(PACK / name)


def line(d: ImageDraw.ImageDraw, pts, fill=INK, width=4):
    d.line(pts, fill=fill, width=width, joint="curve")


def rect(d: ImageDraw.ImageDraw, box, fill, outline=INK, radius=0, width=2):
    if outline:
        d.rounded_rectangle(box, radius=radius, fill=outline)
        x1, y1, x2, y2 = box
        d.rounded_rectangle((x1 + width, y1 + width, x2 - width, y2 - width), radius=max(0, radius - width), fill=fill)
    else:
        d.rounded_rectangle(box, radius=radius, fill=fill)


def ellipse(d: ImageDraw.ImageDraw, box, fill, outline=INK, width=2):
    if outline:
        d.ellipse(box, fill=outline)
        x1, y1, x2, y2 = box
        d.ellipse((x1 + width, y1 + width, x2 - width, y2 - width), fill=fill)
    else:
        d.ellipse(box, fill=fill)


def poly(d: ImageDraw.ImageDraw, pts, fill, outline=INK):
    if outline:
        d.polygon(pts, fill=outline)
        # Inner polygon approximation: good enough for guides.
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        inner = []
        for x, y in pts:
            inner.append((cx + (x - cx) * 0.88, cy + (y - cy) * 0.88))
        d.polygon(inner, fill=fill)
    else:
        d.polygon(pts, fill=fill)


def draw_sword(d: ImageDraw.ImageDraw, x: int, y: int, angle: float = -30, length: int = 36):
    rad = math.radians(angle)
    dx = math.cos(rad) * length
    dy = math.sin(rad) * length
    hdx = math.cos(rad + math.pi / 2) * 4
    hdy = math.sin(rad + math.pi / 2) * 4
    base = (x, y)
    tip = (x + dx, y + dy)
    pts = [(base[0] + hdx, base[1] + hdy), tip, (base[0] - hdx, base[1] - hdy)]
    poly(d, pts, METAL, outline=INK)
    line(d, [(x - 10 * math.cos(rad + math.pi / 2), y - 10 * math.sin(rad + math.pi / 2)), (x + 10 * math.cos(rad + math.pi / 2), y + 10 * math.sin(rad + math.pi / 2))], fill=LEATHER_DARK, width=5)
    line(d, [(x - 5 * math.cos(rad), y - 5 * math.sin(rad)), (x - 17 * math.cos(rad), y - 17 * math.sin(rad))], fill=LEATHER, width=6)


def draw_shield(d: ImageDraw.ImageDraw, x: int, y: int, sx: float = 1.0):
    w, h = int(22 * sx), int(29 * sx)
    pts = [(x, y - h // 2), (x + w // 2, y - h // 5), (x + w // 3, y + h // 2), (x, y + h // 2 + 4), (x - w // 3, y + h // 2), (x - w // 2, y - h // 5)]
    poly(d, pts, (86, 105, 114, 255), outline=INK)
    d.polygon([(x, y - h // 2 + 4), (x + w // 3, y - h // 6), (x, y + h // 2), (x - w // 3, y - h // 6)], fill=(144, 169, 177, 255))
    d.ellipse((x - 4, y - 2, x + 4, y + 6), fill=(218, 178, 80, 255))


def draw_hero_frame(row: int, col: int) -> Image.Image:
    """Draw a bounded 128x128 hero guide frame.

    This version deliberately keeps every hero pose inside the 128x128 cell.
    Jump/victory are readable poses rather than true vertical displacement,
    attack arcs are shorter, and training props stay within frame bounds.
    """
    frame = Image.new("RGBA", (128, 128), TRANSPARENT)
    d = ImageDraw.Draw(frame, "RGBA")
    phase = col / 7
    x = 64
    baseline = 122
    shift_y = 0
    stride = 0.0
    sword_angle = -30
    sword_length = 27
    shield_front = False
    shield_high = False
    sword_hidden = False
    show_weight = False
    show_target = False
    show_crystal = False
    victory_pose = False

    if row == 0:  # idle
        shift_y = int(1.5 * math.sin(phase * math.pi * 2))
        sword_angle = -32
    elif row == 1:  # walk: obvious alternating legs
        stride = math.sin(phase * math.pi * 2)
        shift_y = int(1.5 * math.sin(phase * math.pi * 4))
        sword_angle = -24 + int(5 * math.sin(phase * math.pi * 2))
    elif row == 2:  # jump/hop pose, but kept inside the frame
        shift_y = -1 if col in (2, 3, 4, 5) else 3
        stride = 0.35 if col in (2, 3, 4, 5) else 0
        sword_angle = -44
        shield_high = True
    elif row == 3:  # attack 1
        x += int(3 * math.sin(phase * math.pi))
        sword_angle = -78 + col * 14
        sword_length = 29
    elif row == 4:  # attack 2 / special
        x += int(4 * math.sin(phase * math.pi))
        shift_y = int(3 * math.sin(phase * math.pi))
        sword_angle = -54 + col * 10
        sword_length = 31
        shield_front = True
    elif row == 5:  # defend/parry
        shift_y = 2
        shield_front = True
        shield_high = True
        sword_angle = -152
        sword_length = 22
    elif row == 6:  # hit/fall handled below
        pass
    elif row == 7:  # victory pose, not a vertical jump
        victory_pose = True
        sword_angle = -82
        sword_length = 25
        shield_high = True
        shift_y = int(1 * math.sin(phase * math.pi * 2))
    elif row == 8:  # strength training
        shift_y = int(3 * math.sin(phase * math.pi))
        sword_hidden = True
        show_weight = True
    elif row == 9:  # defense training
        shield_front = True
        shield_high = True
        sword_angle = -150
        sword_length = 21
        shift_y = int(1.5 * math.sin(phase * math.pi * 2))
    elif row == 10:  # precision/throw training
        x += int(3 * math.sin(phase * math.pi))
        sword_angle = -12
        sword_length = 22
        show_target = True
    elif row == 11:  # stamina/echo training
        sword_angle = -34
        sword_length = 24
        shift_y = int(3 * math.sin(phase * math.pi))
        show_crystal = True

    # Fall row: first frames recoil, last frames lie on the ground. All frames
    # stay inside the 128x128 cell so the head/sword cannot be cropped.
    if row == 6:
        d.ellipse((16, baseline - 4, 80, baseline + 2), fill=SHADOW)
        if col < 4:
            x = 64 - col * 3
            shift_y = col * 2
            sword_angle = 12 + col * 8
            sword_length = 24
        else:
            ground = baseline - 1
            x = 64 - min((col - 4) * 2, 6)
            d.ellipse((10, ground - 2, 86, ground + 4), fill=SHADOW)
            line(d, [(x - 21, ground - 13), (x - 42, ground - 5)], fill=LEATHER_DARK, width=7)
            line(d, [(x + 3, ground - 11), (x + 30, ground - 4)], fill=LEATHER_DARK, width=7)
            poly(d, [(x - 24, ground - 34), (x - 38, ground - 18), (x - 16, ground - 10), (x + 6, ground - 27)], GREEN_DARK)
            d.ellipse((x - 21, ground - 35, x + 23, ground - 10), fill=INK)
            d.ellipse((x - 18, ground - 33, x + 21, ground - 12), fill=GREEN)
            rect(d, (x - 10, ground - 31, x + 14, ground - 15), (131, 91, 53, 255), radius=5)
            draw_shield(d, x - 17, ground - 25, 0.92)
            draw_sword(d, x + 8, ground - 18, 8, 24)
            ellipse(d, (x + 16, ground - 50, x + 42, ground - 24), SKIN)
            d.ellipse((x + 31, ground - 39, x + 35, ground - 35), fill=INK)
            poly(d, [(x + 16, ground - 49), (x + 37, ground - 55), (x + 46, ground - 42), (x + 24, ground - 41)], HAIR)
            d.line((x + 18, ground - 43, x + 42, ground - 44), fill=RED, width=3)
            return frame

    y = baseline
    d.ellipse((x - 29, baseline - 5, x + 31, baseline + 2), fill=SHADOW)

    if row == 1:
        left_foot = (x - 12 - int(7 * stride), y - 1)
        right_foot = (x + 12 + int(7 * stride), y - 1)
    elif row == 2:
        left_foot = (x - 17, y - 7)
        right_foot = (x + 12, y - 9)
    elif row in (3, 4, 10):
        left_foot = (x - 17, y - 1)
        right_foot = (x + 17, y - 1)
    elif row == 7:
        left_foot = (x - 13, y - 3)
        right_foot = (x + 13, y - 4)
    else:
        left_foot = (x - 12, y - 1)
        right_foot = (x + 13, y - 1)
    hip_y = y - 30 + shift_y
    line(d, [(x - 6, hip_y), left_foot], fill=LEATHER_DARK, width=7)
    line(d, [(x + 6, hip_y), right_foot], fill=LEATHER_DARK, width=7)
    ellipse(d, (left_foot[0] - 8, left_foot[1] - 4, left_foot[0] + 10, left_foot[1] + 3), LEATHER_DARK)
    ellipse(d, (right_foot[0] - 8, right_foot[1] - 4, right_foot[0] + 10, right_foot[1] + 3), LEATHER_DARK)

    poly(d, [(x - 15, y - 58 + shift_y), (x - 39, y - 30 + shift_y), (x - 23, y - 16 + shift_y), (x - 7, y - 39 + shift_y)], GREEN_DARK)
    rect(d, (x - 17, y - 61 + shift_y, x + 17, y - 29 + shift_y), GREEN, radius=8)
    rect(d, (x - 12, y - 57 + shift_y, x + 12, y - 35 + shift_y), (131, 91, 53, 255), radius=5, width=2)
    d.rectangle((x - 17, y - 43 + shift_y, x + 17, y - 38 + shift_y), fill=LEATHER_DARK)
    d.rectangle((x - 3, y - 45 + shift_y, x + 4, y - 36 + shift_y), fill=(218, 178, 80, 255))

    shoulder_y = y - 55 + shift_y
    if row in (3, 4):
        sword_hand = (x + 15 + int(4 * math.sin(phase * math.pi)), shoulder_y + int(3 * math.cos(phase * math.pi)))
    elif row == 7:
        sword_hand = (x + 12, shoulder_y - 5)
    elif row == 8:
        sword_hand = (x + 20, shoulder_y + 3)
    elif row == 10:
        sword_hand = (x + 14, shoulder_y + 1)
    else:
        sword_hand = (x + 15, shoulder_y)

    if shield_front:
        shield_hand = (x + 12, shoulder_y + (2 if not shield_high else -4))
    elif shield_high:
        shield_hand = (x - 16, shoulder_y - 3)
    else:
        shield_hand = (x - 18, shoulder_y + 6)

    line(d, [(x + 8, shoulder_y), sword_hand], fill=SKIN_DARK, width=6)
    line(d, [(x - 8, shoulder_y), shield_hand], fill=SKIN_DARK, width=6)

    if show_weight:
        ellipse(d, (x + 16, y - 31, x + 44, y - 5), (108, 106, 96, 255))
        d.rectangle((x + 20, y - 20, x + 40, y - 15), fill=(180, 180, 170, 255))
    if show_target:
        d.line((x + 29, y - 47, x + 47, y - 47), fill=(218, 178, 80, 255), width=3)
        d.ellipse((x + 44, y - 53, x + 58, y - 41), outline=INK, width=2)
    if show_crystal:
        ellipse(d, (x + 22, y - 47, x + 43, y - 23), (107, 220, 225, 255))
        d.arc((x + 15, y - 55, x + 51, y - 17), 292, 68, fill=(113, 240, 245, 180), width=3)

    draw_shield(d, int(shield_hand[0]), int(shield_hand[1]), 0.98)
    if not sword_hidden:
        draw_sword(d, int(sword_hand[0]), int(sword_hand[1]), sword_angle, sword_length)

    head_top = y - 80 + shift_y
    ellipse(d, (x - 14, head_top + 7, x + 14, head_top + 35), SKIN)
    d.ellipse((x - 7, head_top + 21, x - 3, head_top + 25), fill=INK)
    d.ellipse((x + 5, head_top + 21, x + 9, head_top + 25), fill=INK)
    d.arc((x - 6, head_top + 27, x + 8, head_top + 35), 10, 170, fill=(120, 49, 39, 255), width=2)
    d.line((x - 15, head_top + 14, x + 16, head_top + 13), fill=RED, width=4)
    poly(d, [(x - 17, head_top + 13), (x - 7, head_top + 1), (x + 15, head_top + 5), (x + 19, head_top + 17), (x + 8, head_top + 13), (x - 2, head_top + 21)], HAIR)
    poly(d, [(x - 4, head_top + 5), (x + 12, head_top + 2), (x + 8, head_top + 17)], HAIR_DARK, outline=None)

    if victory_pose:
        d.ellipse((x + 24, y - 78, x + 31, y - 70), fill=(255, 235, 109, 230))
        d.ellipse((x - 29, y - 76, x - 22, y - 68), fill=(255, 235, 109, 230))
    return frame

def hero_sheet() -> Image.Image:
    sheet = Image.new("RGBA", (128 * 8, 128 * 12), TRANSPARENT)
    for row in range(12):
        for col in range(8):
            sheet.alpha_composite(draw_hero_frame(row, col), (col * 128, row * 128))
    return sheet


def draw_tree(d, x, y, scale=1.0, oak=False):
    trunk_w = int(13 * scale)
    trunk_h = int(58 * scale)
    rect(d, (x - trunk_w // 2, y - trunk_h, x + trunk_w // 2, y), (111, 75, 45, 255), radius=4)
    if oak:
        for dx, dy, r, col in [(-30, -70, 28, (61, 133, 63, 255)), (0, -82, 36, (77, 157, 70, 255)), (31, -68, 27, (61, 134, 63, 255)), (0, -56, 34, (92, 174, 79, 255))]:
            ellipse(d, (x + int(dx*scale) - int(r*scale), y + int(dy*scale) - int(r*scale), x + int(dx*scale) + int(r*scale), y + int(dy*scale) + int(r*scale)), col)
    else:
        for dy, w, col in [(-103, 62, (43, 97, 59, 255)), (-78, 76, (55, 123, 66, 255)), (-52, 86, (69, 148, 72, 255))]:
            poly(d, [(x, y + int(dy*scale)), (x - int(w*scale/2), y - int(18*scale)), (x + int(w*scale/2), y - int(18*scale))], col)


def large_objects_sheet() -> Image.Image:
    sheet = Image.new("RGBA", (128*8, 128), TRANSPARENT)
    d = ImageDraw.Draw(sheet, "RGBA")
    for i in range(8):
        x = i*128
        d.ellipse((x+12, 118, x+116, 126), fill=SHADOW)
    draw_tree(d, 64, 118, 0.98, False)
    draw_tree(d, 192, 118, 0.90, True)
    # cottage
    x=256; y=118
    rect(d,(x+23,y-56,x+100,y), (196,151,95,255), radius=4)
    poly(d,[(x+14,y-54),(x+62,y-96),(x+110,y-54)], (89,83,77,255))
    rect(d,(x+52,y-36,x+72,y),(86,55,38,255),radius=2)
    rect(d,(x+32,y-44,x+47,y-30),(240,218,151,255),radius=2)
    rect(d,(x+78,y-44,x+94,y-30),(240,218,151,255),radius=2)
    # house
    x=384; y=118
    rect(d,(x+18,y-64,x+110,y), (178,132,82,255), radius=4)
    poly(d,[(x+8,y-62),(x+64,y-105),(x+120,y-62)], (76,78,84,255))
    rect(d,(x+54,y-34,x+76,y),(79,54,42,255),radius=2)
    rect(d,(x+30,y-50,x+47,y-35),(229,209,154,255),radius=2)
    rect(d,(x+84,y-50,x+101,y-35),(229,209,154,255),radius=2)
    # arch
    x=512; y=118
    d.arc((x+24,y-100,x+104,y-20),180,360,fill=INK,width=14)
    d.arc((x+30,y-93,x+98,y-27),180,360,fill=(143,135,119,255),width=10)
    rect(d,(x+22,y-66,x+43,y),(135,126,110,255),radius=3)
    rect(d,(x+85,y-66,x+106,y),(135,126,110,255),radius=3)
    # well
    x=640; y=118
    ellipse(d,(x+36,y-45,x+92,y-18),(126,116,100,255))
    rect(d,(x+38,y-32,x+90,y),(130,115,88,255),radius=5)
    line(d,[(x+44,y-46),(x+44,y-88),(x+84,y-88),(x+84,y-46)],fill=(99,68,45,255),width=5)
    poly(d,[(x+34,y-88),(x+64,y-110),(x+94,y-88)],(99,83,67,255))
    # boulder
    x=768; y=118
    ellipse(d,(x+20,y-55,x+72,y),(116,124,126,255))
    ellipse(d,(x+58,y-44,x+108,y),(145,151,149,255))
    d.line((x+41,y-48,x+27,y-31),fill=(210,215,210,255),width=3)
    # mushroom/stump
    x=896; y=118
    rect(d,(x+56,y-48,x+76,y),(166,133,94,255),radius=5)
    ellipse(d,(x+22,y-80,x+110,y-38),(183,73,42,255))
    for sx,sy in [(44,58),(70,51),(89,62)]: ellipse(d,(x+sx,y-sy,x+sx+10,y-sy+8),(241,220,175,255),outline=None)
    return sheet.resize((256 * 8, 256), Image.Resampling.NEAREST)


def small_objects_sheet() -> Image.Image:
    sheet = Image.new("RGBA", (64*8, 64), TRANSPARENT)
    d = ImageDraw.Draw(sheet, "RGBA")
    for i in range(8):
        x=i*64; d.ellipse((x+7,58,x+57,64),fill=SHADOW)
    # log
    x=0; rect(d,(x+12,43,x+54,55),(130,82,47,255),radius=6); ellipse(d,(x+43,40,x+58,56),(170,111,61,255)); d.arc((x+47,44,x+55,53),0,360,fill=LEATHER_DARK,width=2)
    # stump
    x=64; rect(d,(x+22,31,x+44,58),(130,82,47,255),radius=3); ellipse(d,(x+18,24,x+48,38),(177,116,65,255)); d.arc((x+26,28,x+42,36),0,360,fill=LEATHER_DARK,width=2)
    # sign
    x=128; rect(d,(x+29,25,x+35,61),(111,75,45,255),radius=2); rect(d,(x+10,14,x+54,33),(207,159,88,255),radius=4); d.rectangle((x+21,22,x+44,25),fill=LEATHER_DARK)
    # crate
    x=192; rect(d,(x+15,30,x+52,60),(166,105,55,255),radius=3); line(d,[(x+18,33),(x+50,58)],fill=(101,64,41,255),width=3); line(d,[(x+49,33),(x+17,58)],fill=(101,64,41,255),width=3)
    # barrel
    x=256; rect(d,(x+20,24,x+45,60),(151,91,48,255),radius=9); d.rectangle((x+21,32,x+44,36),fill=(92,68,55,255)); d.rectangle((x+21,49,x+44,53),fill=(92,68,55,255))
    # rock
    x=320; ellipse(d,(x+13,40,x+53,60),(130,138,138,255)); poly(d,[(x+20,43),(x+32,36),(x+47,49),(x+37,57)],(164,170,168,255))
    # bush
    x=384
    for cx,cy,r,col in [(22,48,13,(67,149,80,255)),(35,40,16,(90,176,91,255)),(48,49,12,(62,137,76,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
    # marker post
    x=448; rect(d,(x+28,19,x+36,61),(112,74,44,255),radius=2); ellipse(d,(x+16,9,x+48,32),(112,178,207,255)); d.line((x+20,20,x+44,20),fill=(255,255,255,180),width=2)
    return sheet


def front_objects_sheet() -> Image.Image:
    sheet=Image.new("RGBA",(96*6,96),TRANSPARENT); d=ImageDraw.Draw(sheet,"RGBA")
    for i in range(6): d.ellipse((i*96+10,84,i*96+86,94),fill=SHADOW)
    x=0
    for k in range(7): line(d,[(x+18+k*8,88),(x+8+k*10,38+(k%3)*8)],fill=(54,126,64,255),width=5)
    x=96
    for cx,cy,r,col in [(28,65,24,(66,143,74,255)),(52,57,28,(87,171,84,255)),(68,70,20,(65,137,75,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
    for fx,fy,col in [(28,45,(243,159,198,255)),(52,34,(248,229,104,255)),(70,48,(255,255,255,255))]: ellipse(d,(x+fx-5,fy-5,x+fx+5,fy+5),col)
    x=192
    ellipse(d,(x+12,58,x+52,88),(128,136,138,255)); ellipse(d,(x+44,51,x+86,88),(152,158,156,255)); d.line((x+26,62,x+40,53),fill=(224,229,224,255),width=3)
    x=288
    for cx,cy,r,col in [(24,68,21,(55,132,68,255)),(49,55,28,(72,160,78,255)),(72,69,20,(50,124,66,255))]: ellipse(d,(x+cx-r,cy-r,x+cx+r,cy+r),col)
    x=384
    for k in range(8): line(d,[(x+18+k*8,88),(x+22+k*6,42+(k%2)*10)],fill=(42,119,72,255),width=4)
    x=480; rect(d,(x+42,59,x+55,88),(168,132,91,255),radius=4); ellipse(d,(x+15,32,x+82,64),(181,72,42,255)); ellipse(d,(x+31,41,x+43,50),(245,221,169,255),outline=None); ellipse(d,(x+60,44,x+72,54),(245,221,169,255),outline=None)
    return sheet


def training_stations_sheet() -> Image.Image:
    sheet=Image.new("RGBA",(96*4,96),TRANSPARENT); d=ImageDraw.Draw(sheet,"RGBA")
    for i in range(4): d.ellipse((i*96+10,84,i*96+86,94),fill=SHADOW)
    # strength dummy
    x=0; rect(d,(x+43,26,x+53,84),(116,75,44,255),radius=3); rect(d,(x+23,20,x+73,54),(177,126,75,255),radius=8); d.rectangle((x+28,35,x+68,39),fill=LEATHER_DARK); draw_sword(d,x+70,70,-40,25)
    # defense stand
    x=96; rect(d,(x+44,18,x+52,84),(100,70,48,255),radius=3); draw_shield(d,x+48,45,1.55)
    # target
    x=192; rect(d,(x+46,44,x+54,86),(101,68,45,255),radius=3); ellipse(d,(x+18,12,x+82,76),(208,185,122,255)); ellipse(d,(x+27,21,x+73,67),(180,55,42,255)); ellipse(d,(x+36,30,x+64,58),(235,218,153,255)); ellipse(d,(x+44,38,x+56,50),(180,55,42,255));
    # crystal shrine
    x=288; rect(d,(x+24,70,x+72,88),(111,88,76,255),radius=4); poly(d,[(x+48,16),(x+68,50),(x+56,76),(x+39,76),(x+28,50)],(109,225,228,255)); d.arc((x+20,20,x+76,80),270,90,fill=(132,248,248,180),width=3)
    return sheet


def companion_sheet() -> Image.Image:
    sheet=Image.new("RGBA",(48*6,48*2),TRANSPARENT)
    for row in range(2):
        for col in range(6):
            frame=Image.new("RGBA",(48,48),TRANSPARENT); d=ImageDraw.Draw(frame,"RGBA")
            x=24; y=30+int(math.sin(col/6*math.pi*2)*2)
            d.ellipse((x-18,y+8,x+18,y+14),fill=SHADOW)
            wing=10+int(5*math.sin(col/5*math.pi))
            poly(d,[(x-7,y-8),(x-25,y-wing),(x-16,y+6)],(159,70,42,255))
            poly(d,[(x+7,y-8),(x+25,y-wing),(x+16,y+6)],(159,70,42,255))
            ellipse(d,(x-12,y-12,x+12,y+10),(193,86,42,255))
            ellipse(d,(x+7,y-20,x+25,y-2),(212,106,46,255))
            d.ellipse((x+17,y-13,x+21,y-9),fill=INK)
            d.polygon([(x+23,y-8),(x+32,y-5),(x+23,y-2)],fill=(235,171,79,255))
            if row==1 and col>2:
                d.polygon([(x+31,y-6),(x+45,y-12),(x+39,y-5),(x+45,y+2)],fill=(255,128,41,255))
            sheet.alpha_composite(frame,(col*48,row*48))
    return sheet


def main():
    for old_name in [
        "hero-blue.png", "hero-green.png", "hero-rose.png",
        "hero-sword-48.png", "hero-shield-48.png", "hero-armor-48.png",
        "hero-sword-96.png", "hero-shield-96.png", "hero-armor-96.png"
    ]:
        old_path = PACK / old_name
        if old_path.exists():
            old_path.unlink()
    save(companion_sheet(), "companion-dragon.png")
    save(large_objects_sheet(), "objects-large.png")
    save(small_objects_sheet(), "objects-small.png")
    save(front_objects_sheet(), "objects-front.png")
    save(training_stations_sheet(), "training-stations.png")
    print("Generated companion, objects and training stations. Hero poses are generated by tools/generate-hero-pose-guides.py.")


if __name__ == "__main__":
    main()
