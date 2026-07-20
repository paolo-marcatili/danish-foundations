from __future__ import annotations
from pathlib import Path
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/assets/pixel"
PACK = ROOT / "asset-packs/cc0-pixel-v10"
OUT.mkdir(parents=True, exist_ok=True)
PACK.mkdir(parents=True, exist_ok=True)

BLACK = (26, 30, 42, 255)
INK = BLACK
TRANSPARENT = (0, 0, 0, 0)
SHADOW = (0, 0, 0, 75)


def img(w: int, h: int, color=TRANSPARENT) -> Image.Image:
    return Image.new("RGBA", (w, h), color)


def rect(d: ImageDraw.ImageDraw, xy, fill, outline=INK, radius: int = 0):
    if radius:
        if outline:
            d.rounded_rectangle(xy, radius=radius, fill=outline)
            x0, y0, x1, y1 = xy
            d.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), radius=max(0, radius - 1), fill=fill)
        else:
            d.rounded_rectangle(xy, radius=radius, fill=fill)
    else:
        if outline:
            d.rectangle(xy, fill=outline)
            x0, y0, x1, y1 = xy
            d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=fill)
        else:
            d.rectangle(xy, fill=fill)


def ellipse(d: ImageDraw.ImageDraw, xy, fill, outline=INK):
    if outline:
        d.ellipse(xy, fill=outline)
        x0, y0, x1, y1 = xy
        d.ellipse((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=fill)
    else:
        d.ellipse(xy, fill=fill)


def palette_tint(pal: dict, shift: int = 0) -> dict:
    def tune(c):
        return tuple(max(0, min(255, v + shift)) for v in c[:3]) + (255,)
    return {k: tune(v) for k, v in pal.items()}


def hero_pose(frame: int) -> tuple[str, int]:
    groups = [
        ("walk", 0, 6), ("run", 6, 6), ("attack1", 12, 4), ("attack2", 16, 4),
        ("throw", 20, 4), ("parry", 24, 4), ("hit", 28, 4), ("fall", 32, 4),
        ("victory", 36, 4), ("train_strength", 40, 4), ("train_defense", 44, 4),
        ("train_precision", 48, 4), ("train_stamina", 52, 4), ("fart", 56, 4),
        ("idle", 60, 4),
    ]
    for name, start, length in groups:
        if start <= frame < start + length:
            return name, frame - start
    return "idle", 0


def draw_sword(d: ImageDraw.ImageDraw, x: int, y: int, angle: str):
    if angle == "up":
        d.line((x + 32, y + 26, x + 42, y + 7), fill=INK, width=3)
        d.line((x + 32, y + 26, x + 41, y + 8), fill=(235, 246, 255, 255), width=1)
        d.rectangle((x + 28, y + 24, x + 35, y + 27), fill=(221, 171, 69, 255))
    elif angle == "forward":
        d.line((x + 31, y + 27, x + 47, y + 23), fill=INK, width=3)
        d.line((x + 32, y + 26, x + 46, y + 23), fill=(235, 246, 255, 255), width=1)
        d.rectangle((x + 28, y + 25, x + 34, y + 29), fill=(221, 171, 69, 255))
    else:
        d.line((x + 12, y + 28, x + 38, y + 28), fill=INK, width=3)
        d.line((x + 13, y + 27, x + 37, y + 27), fill=(235, 246, 255, 255), width=1)


def draw_shield(d: ImageDraw.ImageDraw, x: int, y: int, pal: dict, raised: bool = False):
    yy = y + (18 if raised else 24)
    d.rounded_rectangle((x + 31, yy - 7, x + 44, yy + 9), radius=4, fill=INK)
    d.rounded_rectangle((x + 32, yy - 6, x + 43, yy + 8), radius=3, fill=pal["shield"])
    d.rectangle((x + 36, yy - 6, x + 39, yy + 8), fill=(255, 233, 108, 255))
    d.rectangle((x + 32, yy, x + 43, yy + 2), fill=(80, 149, 222, 255))


def draw_hero_frame(d: ImageDraw.ImageDraw, ox: int, oy: int, pal: dict, frame: int):
    pose, phase = hero_pose(frame)
    x, y = ox, oy
    # Motion offsets.
    cycle6 = [0, 1, 1, 0, -1, -1]
    leg_front = [0, 2, 4, 0, -3, -1][phase % 6]
    leg_back = [0, -2, -3, 0, 3, 2][phase % 6]
    arm_front = [-2, -1, 1, 2, 0, -1][phase % 6]
    arm_back = [2, 1, -1, -2, 0, 1][phase % 6]
    bob = [0, -1, -1, 0, 1, 0][phase % 6]
    if pose == "run":
        leg_front *= 2
        leg_back *= 2
        arm_front *= 2
        arm_back *= 2
    if pose in {"attack1", "attack2", "throw", "parry", "train_strength", "train_defense", "train_precision", "train_stamina", "fart"}:
        bob = 0
    if pose == "hit":
        x -= [0, 2, 3, 1][phase]
        bob += [0, 1, 3, 1][phase]
    if pose == "fall":
        bob = 8 + phase * 2
    if pose == "victory":
        bob = [-2, -4, -3, -1][phase]
    if pose == "train_strength":
        arm_front = arm_back = -8 + phase
    elif pose == "train_defense":
        arm_front = -4
        arm_back = 0
    elif pose == "train_precision":
        arm_front = [-5, -8, -6, -4][phase]
        arm_back = 1
    elif pose == "train_stamina":
        arm_front = arm_back = [-3, -5, -3, -1][phase]
    elif pose in {"attack1", "attack2"}:
        arm_front = [-4, -7, -3, 0][phase]
        arm_back = 1
    elif pose == "throw":
        arm_front = [-8, -5, -1, 1][phase]
        arm_back = 0
    elif pose == "parry":
        arm_front = -2
        arm_back = 0
    elif pose == "fart":
        arm_front = 1
        arm_back = [-2, -1, 1, 2][phase]

    # Shadow.
    d.ellipse((x + 10, y + 42, x + 38, y + 47), fill=SHADOW)

    if pose == "fall":
        # Sideways cartoon fall frame.
        d.rounded_rectangle((x + 8, y + 30 + phase, x + 36, y + 41 + phase), radius=4, fill=INK)
        d.rounded_rectangle((x + 9, y + 31 + phase, x + 35, y + 40 + phase), radius=3, fill=pal["shirt"])
        ellipse(d, (x + 30, y + 24 + phase, x + 44, y + 37 + phase), pal["skin"])
        d.rectangle((x + 36, y + 28 + phase, x + 38, y + 29 + phase), fill=INK)
        d.rectangle((x + 38, y + 32 + phase, x + 40, y + 33 + phase), fill=pal["cheek"])
        d.rectangle((x + 9, y + 40 + phase, x + 18, y + 44 + phase), fill=pal["pants"])
        d.rectangle((x + 4, y + 38 + phase, x + 12, y + 42 + phase), fill=pal["pants"])
        return

    # Back pack and back arm.
    rect(d, (x + 7, y + 22 + bob, x + 14, y + 36 + bob), pal["pack"], radius=2)
    rect(d, (x + 13, y + 25 + arm_back + bob, x + 17, y + 38 + arm_back + bob), pal["skin"], radius=2)

    # Legs and boots.
    rect(d, (x + 18, y + 34 + leg_back, x + 23, y + 44 + leg_back), pal["pants"], radius=1)
    rect(d, (x + 26, y + 34 + leg_front, x + 31, y + 44 + leg_front), pal["pants"], radius=1)
    d.rectangle((x + 16, y + 43 + leg_back, x + 24, y + 46 + leg_back), fill=INK)
    d.rectangle((x + 25, y + 43 + leg_front, x + 35, y + 46 + leg_front), fill=INK)
    d.rectangle((x + 18, y + 43 + leg_back, x + 24, y + 44 + leg_back), fill=pal["boot_hi"])
    d.rectangle((x + 27, y + 43 + leg_front, x + 34, y + 44 + leg_front), fill=pal["boot_hi"])

    # Body/tunic.
    rect(d, (x + 16, y + 22 + bob, x + 31, y + 36 + bob), pal["shirt"], radius=3)
    d.rectangle((x + 17, y + 33 + bob, x + 30, y + 36 + bob), fill=pal["belt"])
    d.rectangle((x + 23, y + 33 + bob, x + 25, y + 36 + bob), fill=(244, 196, 74, 255))
    d.rectangle((x + 20, y + 25 + bob, x + 27, y + 26 + bob), fill=pal["shirt_hi"])
    d.polygon([(x + 23, y + 24 + bob), (x + 25, y + 28 + bob), (x + 29, y + 28 + bob), (x + 26, y + 31 + bob), (x + 27, y + 34 + bob), (x + 23, y + 32 + bob), (x + 19, y + 34 + bob), (x + 20, y + 31 + bob), (x + 17, y + 28 + bob), (x + 21, y + 28 + bob)], fill=(255, 237, 107, 255))

    # Front arm and hand.
    rect(d, (x + 29, y + 23 + arm_front + bob, x + 36, y + 28 + arm_front + bob), pal["skin"], radius=2)

    # Scarf.
    d.rectangle((x + 15, y + 20 + bob, x + 32, y + 23 + bob), fill=INK)
    d.rectangle((x + 16, y + 20 + bob, x + 31, y + 22 + bob), fill=pal["scarf"])
    d.rectangle((x + 31, y + 22 + bob, x + 40, y + 26 + bob), fill=INK)
    d.rectangle((x + 32, y + 22 + bob, x + 39, y + 25 + bob), fill=pal["scarf"])

    # Head, hair, expression.
    ellipse(d, (x + 17, y + 9 + bob, x + 32, y + 23 + bob), pal["skin"])
    d.rectangle((x + 16, y + 8 + bob, x + 34, y + 12 + bob), fill=INK)
    d.rectangle((x + 17, y + 8 + bob, x + 33, y + 11 + bob), fill=pal["hair"])
    d.rectangle((x + 13, y + 12 + bob, x + 19, y + 21 + bob), fill=INK)
    d.rectangle((x + 14, y + 12 + bob, x + 19, y + 20 + bob), fill=pal["hair"])
    d.rectangle((x + 24, y + 8 + bob, x + 39, y + 13 + bob), fill=INK)
    d.rectangle((x + 25, y + 8 + bob, x + 38, y + 12 + bob), fill=pal["hair_hi"])
    d.rectangle((x + 27, y + 14 + bob, x + 29, y + 15 + bob), fill=INK)
    d.rectangle((x + 30, y + 17 + bob, x + 32, y + 19 + bob), fill=pal["cheek"])
    if pose == "hit":
        d.rectangle((x + 25, y + 18 + bob, x + 31, y + 19 + bob), fill=(120, 42, 52, 255))
    else:
        d.rectangle((x + 25, y + 20 + bob, x + 30, y + 20 + bob), fill=(126, 47, 47, 255))

    # Pose props and details.
    if pose in {"attack1", "attack2"}:
        draw_sword(d, x, y + bob, "forward" if phase >= 1 else "up")
    if pose == "throw":
        d.polygon([(x + 36, y + 16 + bob), (x + 46, y + 13 + bob), (x + 41, y + 20 + bob)], fill=(235, 246, 255, 255), outline=INK)
    if pose in {"parry", "train_defense"}:
        draw_shield(d, x, y + bob, pal, raised=True)
    if pose == "train_strength":
        rect(d, (x + 14, y + 3, x + 34, y + 10), (121, 128, 132, 255), radius=3)
        d.rectangle((x + 16, y + 4, x + 24, y + 5), fill=(167, 176, 181, 255))
    if pose == "train_precision":
        d.polygon([(x + 35, y + 13), (x + 45, y + 10), (x + 39, y + 18)], fill=(235, 246, 255, 255), outline=INK)
    if pose == "train_stamina":
        for i in range(3):
            d.rectangle((x + 36 + i * 3, y + 12 - i * 2, x + 37 + i * 3, y + 15 - i * 2), fill=(112, 231, 229, 255))
    if pose == "fart":
        d.ellipse((x + 8 - phase * 2, y + 29 - phase, x + 16 - phase * 2, y + 36 - phase), fill=(108, 214, 94, 210), outline=INK)
    if pose == "victory":
        d.rectangle((x + 12, y + 18 + bob, x + 16, y + 28 + bob), fill=pal["skin"])
        d.star if False else None


def make_hero():
    palettes = {
        "blue": {
            "skin": (255, 205, 158, 255), "cheek": (239, 106, 113, 255), "hair": (72, 43, 36, 255), "hair_hi": (105, 67, 43, 255),
            "shirt": (75, 187, 248, 255), "shirt_hi": (130, 222, 255, 255), "pants": (50, 74, 149, 255), "scarf": (255, 88, 122, 255),
            "pack": (89, 125, 179, 255), "belt": (111, 70, 42, 255), "boot_hi": (65, 45, 37, 255), "shield": (108, 203, 248, 255)
        },
        "green": {
            "skin": (241, 186, 143, 255), "cheek": (235, 103, 105, 255), "hair": (40, 31, 28, 255), "hair_hi": (86, 57, 42, 255),
            "shirt": (94, 214, 122, 255), "shirt_hi": (152, 239, 156, 255), "pants": (61, 86, 161, 255), "scarf": (255, 175, 70, 255),
            "pack": (87, 119, 177, 255), "belt": (104, 69, 44, 255), "boot_hi": (69, 47, 38, 255), "shield": (107, 211, 158, 255)
        },
        "rose": {
            "skin": (199, 128, 92, 255), "cheek": (244, 112, 121, 255), "hair": (31, 25, 22, 255), "hair_hi": (81, 47, 39, 255),
            "shirt": (255, 135, 180, 255), "shirt_hi": (255, 178, 207, 255), "pants": (55, 83, 164, 255), "scarf": (122, 229, 255, 255),
            "pack": (90, 119, 178, 255), "belt": (108, 68, 44, 255), "boot_hi": (66, 45, 37, 255), "shield": (255, 150, 197, 255)
        },
    }
    for name, pal in palettes.items():
        sheet = img(48 * 64, 48)
        d = ImageDraw.Draw(sheet)
        for f in range(64):
            draw_hero_frame(d, f * 48, 0, pal, f)
        sheet.save(OUT / f"hero-{name}.png")


def draw_monster(d: ImageDraw.ImageDraw, x: int, y: int, kind: str, frame: int):
    colors = {
        "goblin": ((76, 194, 91, 255), (42, 151, 72, 255)),
        "bat": ((121, 101, 211, 255), (82, 66, 164, 255)),
        "troll": ((160, 143, 103, 255), (117, 97, 74, 255)),
        "dragon": ((238, 112, 70, 255), (183, 75, 59, 255)),
        "wizard": ((86, 100, 211, 255), (50, 60, 151, 255)),
        "blob": ((255, 133, 180, 255), (207, 83, 146, 255)),
    }
    main, dark = colors[kind]
    bob = [0, -2, 0, 1][frame % 4]
    d.ellipse((x + 10, y + 40, x + 38, y + 46), fill=SHADOW)
    if kind == "bat":
        d.polygon([(x + 13, y + 16 + bob), (x + 0, y + 25 + bob), (x + 14, y + 32 + bob)], fill=INK)
        d.polygon([(x + 34, y + 16 + bob), (x + 48, y + 25 + bob), (x + 34, y + 32 + bob)], fill=INK)
        d.polygon([(x + 13, y + 18 + bob), (x + 4, y + 25 + bob), (x + 13, y + 29 + bob)], fill=dark)
        d.polygon([(x + 34, y + 18 + bob), (x + 44, y + 25 + bob), (x + 34, y + 29 + bob)], fill=dark)
    if kind == "dragon":
        d.polygon([(x + 14, y + 14 + bob), (x + 18, y + 4 + bob), (x + 21, y + 16 + bob)], fill=INK)
        d.polygon([(x + 28, y + 16 + bob), (x + 33, y + 4 + bob), (x + 36, y + 14 + bob)], fill=INK)
        d.polygon([(x + 15, y + 14 + bob), (x + 18, y + 7 + bob), (x + 20, y + 16 + bob)], fill=(255, 232, 138, 255))
        d.polygon([(x + 29, y + 16 + bob), (x + 33, y + 7 + bob), (x + 35, y + 14 + bob)], fill=(255, 232, 138, 255))
    if kind == "blob":
        d.ellipse((x + 8, y + 16 + bob, x + 40, y + 40 + bob), fill=INK)
        d.ellipse((x + 10, y + 17 + bob, x + 38, y + 39 + bob), fill=main)
        d.rectangle((x + 16, y + 21 + bob, x + 25, y + 25 + bob), fill=(255, 172, 207, 255))
    else:
        d.rounded_rectangle((x + 9, y + 14 + bob, x + 39, y + 39 + bob), radius=8, fill=INK)
        d.rounded_rectangle((x + 11, y + 16 + bob, x + 37, y + 38 + bob), radius=7, fill=main)
        d.rectangle((x + 13, y + 32 + bob, x + 36, y + 38 + bob), fill=dark)
    if kind == "wizard":
        d.polygon([(x + 13, y + 16 + bob), (x + 24, y + 2 + bob), (x + 37, y + 16 + bob)], fill=INK)
        d.polygon([(x + 15, y + 15 + bob), (x + 24, y + 4 + bob), (x + 35, y + 15 + bob)], fill=(47, 57, 137, 255))
        d.rectangle((x + 27, y + 8 + bob, x + 30, y + 11 + bob), fill=(255, 231, 98, 255))
    # Eyes and expression.
    eye_y = y + 24 + bob
    if frame == 1:  # hit
        d.rectangle((x + 16, eye_y, x + 21, eye_y + 1), fill=INK)
        d.rectangle((x + 28, eye_y, x + 33, eye_y + 1), fill=INK)
        d.rectangle((x + 20, y + 31 + bob, x + 30, y + 32 + bob), fill=(111, 38, 47, 255))
    elif frame == 2:  # attack
        d.rectangle((x + 16, eye_y, x + 20, eye_y + 2), fill=(255, 255, 255, 255)); d.point((x + 18, eye_y + 1), fill=INK)
        d.rectangle((x + 29, eye_y, x + 33, eye_y + 2), fill=(255, 255, 255, 255)); d.point((x + 31, eye_y + 1), fill=INK)
        d.rectangle((x + 19, y + 32 + bob, x + 31, y + 35 + bob), fill=INK)
        d.rectangle((x + 21, y + 32 + bob, x + 29, y + 33 + bob), fill=(232, 73, 74, 255))
    elif frame == 3:  # defeat
        d.rectangle((x + 15, eye_y, x + 20, eye_y + 1), fill=INK)
        d.rectangle((x + 28, eye_y, x + 33, eye_y + 1), fill=INK)
        d.ellipse((x + 18, y + 31 + bob, x + 31, y + 38 + bob), fill=INK)
    else:
        d.rectangle((x + 16, eye_y, x + 20, eye_y + 3), fill=(255, 255, 255, 255)); d.point((x + 18, eye_y + 1), fill=INK)
        d.rectangle((x + 29, eye_y, x + 33, eye_y + 3), fill=(255, 255, 255, 255)); d.point((x + 31, eye_y + 1), fill=INK)
        d.rectangle((x + 20, y + 33 + bob, x + 30, y + 34 + bob), fill=INK)


def make_monsters():
    kinds = ["goblin", "bat", "troll", "dragon", "wizard", "blob"]
    sheet = img(48 * 4, 48 * len(kinds))
    d = ImageDraw.Draw(sheet)
    for row, kind in enumerate(kinds):
        for f in range(4):
            draw_monster(d, f * 48, row * 48, kind, f)
    sheet.save(OUT / "monsters.png")


def make_training_stations():
    sheet = img(64 * 4, 64)
    d = ImageDraw.Draw(sheet)
    # Vocabulary / strength: training dummy and crate.
    x = 0
    d.ellipse((x + 8, 52, x + 56, 60), fill=SHADOW)
    rect(d, (x + 30, 22, x + 35, 55), (129, 80, 48, 255))
    rect(d, (x + 18, 14, x + 47, 32), (180, 119, 69, 255), radius=6)
    d.rectangle((x + 24, 20, x + 41, 22), fill=(238, 190, 104, 255))
    d.rectangle((x + 16, 40, x + 48, 55), fill=INK)
    d.rectangle((x + 18, 41, x + 46, 54), fill=(151, 99, 55, 255))
    d.line((x + 18, 41, x + 46, 54), fill=(222, 164, 84, 255), width=2)
    d.line((x + 46, 41, x + 18, 54), fill=(222, 164, 84, 255), width=2)
    # Comprehension / defense: shield post and arrows.
    x = 64
    d.ellipse((x + 8, 52, x + 56, 60), fill=SHADOW)
    rect(d, (x + 30, 11, x + 35, 56), (120, 75, 45, 255))
    d.rounded_rectangle((x + 16, 15, x + 49, 47), radius=9, fill=INK)
    d.rounded_rectangle((x + 18, 17, x + 47, 45), radius=8, fill=(108, 199, 245, 255))
    d.rectangle((x + 30, 17, x + 35, 45), fill=(255, 232, 106, 255))
    d.rectangle((x + 18, 30, x + 47, 35), fill=(71, 146, 224, 255))
    for yy in [18, 26, 42]:
        d.line((x + 4, yy, x + 14, yy + 2), fill=INK, width=2)
        d.polygon([(x + 14, yy + 2), (x + 18, yy), (x + 15, yy + 5)], fill=(238, 246, 255, 255), outline=INK)
    # Grammar / precision: rune target gate.
    x = 128
    d.ellipse((x + 7, 52, x + 57, 60), fill=SHADOW)
    rect(d, (x + 10, 16, x + 16, 56), (108, 83, 67, 255))
    rect(d, (x + 48, 16, x + 54, 56), (108, 83, 67, 255))
    d.rounded_rectangle((x + 18, 11, x + 46, 40), radius=10, fill=INK)
    d.rounded_rectangle((x + 20, 13, x + 44, 38), radius=9, fill=(255, 244, 177, 255))
    for r, c in [(11, (255, 105, 128, 255)), (7, (255, 229, 91, 255)), (3, (95, 192, 255, 255))]:
        d.ellipse((x + 32 - r, 25 - r, x + 32 + r, 25 + r), outline=c, width=2)
    d.rectangle((x + 30, 51, x + 35, 55), fill=(166, 103, 57, 255))
    # Pronunciation / stamina: echo crystal shrine.
    x = 192
    d.ellipse((x + 8, 52, x + 56, 60), fill=SHADOW)
    rect(d, (x + 23, 41, x + 41, 56), (108, 83, 67, 255), radius=3)
    d.polygon([(x + 32, 5), (x + 49, 30), (x + 38, 49), (x + 22, 49), (x + 15, 29)], fill=INK)
    d.polygon([(x + 32, 8), (x + 46, 30), (x + 37, 46), (x + 24, 46), (x + 18, 29)], fill=(96, 224, 242, 255))
    d.polygon([(x + 32, 8), (x + 32, 46), (x + 46, 30)], fill=(55, 169, 218, 255))
    d.arc((x + 5, 17, x + 25, 45), 270, 90, fill=(155, 240, 246, 255), width=2)
    d.arc((x + 39, 17, x + 59, 45), 90, 270, fill=(155, 240, 246, 255), width=2)
    sheet.save(OUT / "training-stations.png")


OBJECT_KINDS = ["grass", "flower", "rock", "log", "stump", "bush", "mushroom", "sign", "pine", "oak", "cottage", "cave"]


def draw_object(d: ImageDraw.ImageDraw, x: int, y: int, kind: str):
    d.ellipse((x + 6, y + 40, x + 42, y + 47), fill=SHADOW)
    if kind == "grass":
        for dx, h, col in [(8, 10, (68, 169, 75, 255)), (14, 15, (77, 190, 83, 255)), (22, 12, (55, 151, 68, 255)), (31, 14, (81, 188, 89, 255))]:
            d.polygon([(x + dx, y + 45), (x + dx + 4, y + 45 - h), (x + dx + 8, y + 45)], fill=col)
    elif kind == "flower":
        d.line((x + 24, y + 43, x + 24, y + 30), fill=(60, 154, 70, 255), width=2)
        for dx, dy in [(0, -8), (-5, -5), (5, -5), (-3, 0), (3, 0)]:
            d.rectangle((x + 23 + dx, y + 31 + dy, x + 26 + dx, y + 34 + dy), fill=(255, 126, 171, 255))
        d.rectangle((x + 23, y + 30, x + 26, y + 33), fill=(255, 231, 83, 255))
    elif kind == "rock":
        d.ellipse((x + 7, y + 28, x + 40, y + 46), fill=INK)
        d.ellipse((x + 9, y + 29, x + 38, y + 45), fill=(136, 145, 153, 255))
        d.rectangle((x + 15, y + 31, x + 27, y + 34), fill=(172, 181, 186, 255))
    elif kind == "log":
        d.rounded_rectangle((x + 7, y + 30, x + 42, y + 45), radius=6, fill=INK)
        d.rounded_rectangle((x + 9, y + 31, x + 40, y + 44), radius=5, fill=(128, 79, 42, 255))
        d.ellipse((x + 7, y + 30, x + 21, y + 45), fill=INK)
        d.ellipse((x + 9, y + 31, x + 20, y + 44), fill=(212, 140, 73, 255))
        d.arc((x + 11, y + 33, x + 18, y + 41), 0, 360, fill=(130, 75, 43, 255), width=1)
    elif kind == "stump":
        rect(d, (x + 14, y + 25, x + 34, y + 45), (141, 89, 48, 255), radius=3)
        d.ellipse((x + 13, y + 19, x + 35, y + 30), fill=INK)
        d.ellipse((x + 15, y + 21, x + 33, y + 29), fill=(216, 145, 75, 255))
        d.arc((x + 19, y + 22, x + 30, y + 29), 0, 360, fill=(122, 76, 43, 255), width=1)
    elif kind == "bush":
        for box, col in [((6, 31, 24, 46), (68, 178, 87, 255)), ((17, 25, 39, 46), (52, 163, 79, 255)), ((29, 32, 43, 46), (74, 189, 95, 255))]:
            x0, y0, x1, y1 = box
            d.ellipse((x + x0, y + y0, x + x1, y + y1), fill=INK)
            d.ellipse((x + x0 + 1, y + y0 + 1, x + x1 - 1, y + y1 - 1), fill=col)
    elif kind == "mushroom":
        rect(d, (x + 21, y + 31, x + 27, y + 45), (248, 214, 162, 255), radius=2)
        d.rounded_rectangle((x + 10, y + 24, x + 38, y + 35), radius=6, fill=INK)
        d.rounded_rectangle((x + 12, y + 25, x + 36, y + 34), radius=5, fill=(239, 83, 112, 255))
        d.rectangle((x + 19, y + 26, x + 23, y + 29), fill=(255, 240, 213, 255))
        d.rectangle((x + 30, y + 28, x + 33, y + 31), fill=(255, 240, 213, 255))
    elif kind == "sign":
        rect(d, (x + 22, y + 25, x + 26, y + 46), (116, 72, 42, 255))
        rect(d, (x + 8, y + 16, x + 40, y + 31), (255, 236, 169, 255), radius=3)
        d.polygon([(x + 30, y + 20), (x + 37, y + 24), (x + 30, y + 28)], fill=(96, 74, 51, 255))
    elif kind == "pine":
        rect(d, (x + 22, y + 27, x + 27, y + 46), (116, 75, 44, 255))
        for yy, w, col in [(13, 14, (54, 142, 76, 255)), (22, 18, (62, 160, 84, 255)), (31, 22, (73, 181, 92, 255))]:
            d.polygon([(x + 24, y + yy), (x + 24 - w, y + yy + 18), (x + 24 + w, y + yy + 18)], fill=INK)
            d.polygon([(x + 24, y + yy + 2), (x + 26 - w, y + yy + 17), (x + 22 + w, y + yy + 17)], fill=col)
    elif kind == "oak":
        rect(d, (x + 21, y + 26, x + 28, y + 46), (118, 75, 43, 255))
        for box, col in [((8, 11, 29, 31), (58, 155, 77, 255)), ((20, 8, 43, 31), (68, 176, 90, 255)), ((13, 22, 39, 39), (51, 144, 72, 255))]:
            x0, y0, x1, y1 = box
            d.ellipse((x + x0, y + y0, x + x1, y + y1), fill=INK)
            d.ellipse((x + x0 + 1, y + y0 + 1, x + x1 - 1, y + y1 - 1), fill=col)
    elif kind == "cottage":
        rect(d, (x + 5, y + 25, x + 42, y + 46), (151, 113, 75, 255))
        d.polygon([(x + 2, y + 26), (x + 24, y + 10), (x + 46, y + 26)], fill=INK)
        d.polygon([(x + 5, y + 25), (x + 24, y + 12), (x + 43, y + 25)], fill=(96, 119, 131, 255))
        d.rectangle((x + 13, y + 32, x + 22, y + 46), fill=(78, 55, 39, 255))
        d.rectangle((x + 29, y + 31, x + 38, y + 38), fill=(226, 211, 166, 255))
    elif kind == "cave":
        d.polygon([(x + 4, y + 45), (x + 13, y + 22), (x + 26, y + 13), (x + 42, y + 25), (x + 45, y + 45)], fill=INK)
        d.polygon([(x + 7, y + 44), (x + 15, y + 24), (x + 26, y + 16), (x + 40, y + 27), (x + 42, y + 44)], fill=(117, 126, 128, 255))
        d.ellipse((x + 17, y + 28, x + 35, y + 46), fill=(44, 47, 54, 255))


def make_objects():
    sheet = img(48 * len(OBJECT_KINDS), 48)
    d = ImageDraw.Draw(sheet)
    for i, kind in enumerate(OBJECT_KINDS):
        draw_object(d, i * 48, 0, kind)
    sheet.save(OUT / "objects.png")


def make_bg():
    sky = img(960, 540, (132, 218, 255, 255))
    d = ImageDraw.Draw(sky)
    for yy in range(540):
        # Fully opaque gradient.
        d.line((0, yy, 960, yy), fill=(132, min(242, 218 + yy // 9), 255, 255))
    # Fixed sun.
    d.rectangle((812, 42, 866, 96), fill=(255, 238, 98, 255))
    d.rectangle((824, 54, 854, 84), fill=(255, 247, 142, 255))
    # Sparse clouds.
    for cx, cy in [(120, 88), (630, 118)]:
        d.rectangle((cx, cy, cx + 72, cy + 18), fill=(250, 253, 255, 255))
        d.rectangle((cx + 26, cy - 13, cx + 90, cy + 18), fill=(250, 253, 255, 255))
        d.rectangle((cx + 58, cy - 4, cx + 122, cy + 18), fill=(250, 253, 255, 255))
    sky.save(OUT / "bg-sky.png")

    mountains = img(768, 180, TRANSPARENT)
    d = ImageDraw.Draw(mountains)
    d.rectangle((0, 126, 768, 180), fill=(172, 216, 195, 255))
    for x, h, c in [(-70, 116, (177, 199, 214, 255)), (90, 152, (154, 183, 205, 255)), (300, 118, (184, 207, 218, 255)), (510, 142, (160, 188, 207, 255))]:
        d.polygon([(x, 180), (x + 110, 180 - h), (x + 250, 180)], fill=c)
        d.polygon([(x + 110, 180 - h), (x + 143, 180 - h + 50), (x + 75, 180 - h + 78)], fill=(230, 240, 241, 255))
    mountains.save(OUT / "bg-mountains.png")

    forest = img(768, 190, TRANSPARENT)
    d = ImageDraw.Draw(forest)
    d.rectangle((0, 118, 768, 190), fill=(141, 203, 135, 255))
    for x in range(-20, 800, 44):
        h = 68 + ((x * 5) % 34)
        d.rectangle((x + 17, 190 - h + 42, x + 23, 190), fill=(122, 94, 65, 255))
        d.polygon([(x, 190 - h + 70), (x + 20, 190 - h), (x + 42, 190 - h + 70)], fill=(75, 146, 91, 255))
        d.polygon([(x + 2, 190 - h + 90), (x + 20, 190 - h + 30), (x + 40, 190 - h + 90)], fill=(86, 158, 97, 255))
    forest.save(OUT / "bg-forest.png")

    village = img(768, 200, TRANSPARENT)
    d = ImageDraw.Draw(village)
    d.rectangle((0, 136, 768, 200), fill=(160, 214, 132, 255))
    for x in [45, 220, 415, 615]:
        d.rectangle((x, 96, x + 82, 188), fill=(151, 116, 79, 255))
        d.rectangle((x + 8, 122, x + 32, 146), fill=(219, 207, 170, 255))
        d.rectangle((x + 46, 120, x + 65, 188), fill=(88, 68, 48, 255))
        d.polygon([(x - 8, 98), (x + 41, 62), (x + 91, 98)], fill=(91, 112, 125, 255))
    village.save(OUT / "bg-village.png")

    ground = img(768, 220, TRANSPARENT)
    d = ImageDraw.Draw(ground)
    # Wide visible grass/path surface.
    d.rectangle((0, 0, 768, 220), fill=(126, 88, 53, 255))
    for x in range(0, 768, 24):
        c = (139, 95, 56, 255) if (x // 24) % 2 else (129, 85, 51, 255)
        d.rectangle((x, 78, x + 24, 220), fill=c)
    d.rectangle((0, 0, 768, 34), fill=(86, 184, 74, 255))
    d.rectangle((0, 34, 768, 76), fill=(102, 201, 82, 255))
    # Broad path seen slightly from above.
    for x in range(0, 768, 16):
        y_top = 40 + (4 if (x // 32) % 2 else 0)
        y_bottom = 106 + (5 if (x // 48) % 2 else -2)
        d.rectangle((x, y_top, x + 16, y_bottom), fill=(205, 165, 103, 255) if (x // 16) % 2 else (218, 178, 112, 255))
    d.rectangle((0, 37, 768, 42), fill=(69, 152, 66, 255))
    d.rectangle((0, 103, 768, 109), fill=(116, 74, 44, 255))
    for x in range(2, 768, 21):
        d.polygon([(x, 36), (x + 4, 22), (x + 8, 36)], fill=(72, 171, 68, 255))
        d.polygon([(x + 6, 34), (x + 11, 18), (x + 16, 34)], fill=(92, 196, 76, 255))
    for x in range(8, 768, 63):
        d.rectangle((x, 126, x + 8, 132), fill=(111, 72, 43, 255))
        d.rectangle((x + 30, 170, x + 38, 176), fill=(111, 72, 43, 255))
    ground.save(OUT / "ground-strip.png")


def sync_asset_pack():
    if PACK.exists():
        for child in PACK.iterdir():
            if child.is_file():
                child.unlink()
    for png in OUT.glob("*.png"):
        shutil.copy2(png, PACK / png.name)
    license_text = """# Pixel assets license\n\nThe placeholder pixel assets in this folder were generated specifically for Hero Language Camp and are released as CC0 1.0 / public domain dedication by the project author.\n\nThey are intentionally simple starter assets and can be replaced by any compatible permissive/CC0 sprite pack later.\n"""
    (OUT / "LICENSE-PIXEL-ASSETS.md").write_text(license_text, encoding="utf-8")
    (PACK / "LICENSE-PIXEL-ASSETS.md").write_text(license_text, encoding="utf-8")
    (PACK / "manifest.yaml").write_text(
        """asset_pack_id: cc0-pixel-v10\nversion: 0.10.0\nlicense: CC0-1.0\nrenderer: phaser-2d\nstyle: cute-retro-pixel-side-scroller\nassets:\n  hero_frame_size: 48\n  monster_frame_size: 48\n  object_frame_size: 48\n  station_frame_size: 64\n  hero:\n    - hero-blue.png\n    - hero-green.png\n    - hero-rose.png\n  monsters: monsters.png\n  training_stations: training-stations.png\n  scenery_objects: objects.png\n  backgrounds:\n    - bg-sky.png\n    - bg-mountains.png\n    - bg-forest.png\n    - bg-village.png\n  ground: ground-strip.png\nnotes: >-\n  Generated CC0 sprite sheets for the Phaser 2D side-scroller.\n  The app serves the active copy from apps/web/public/assets/pixel/.\n""",
        encoding="utf-8",
    )
    (PACK / "README.md").write_text(
        """# CC0 Pixel v0.10 asset pack\n\nThis folder mirrors the active Phaser 2D sprite assets used by the web app.\n\nThe active runtime copy lives in `apps/web/public/assets/pixel/` so Vite can serve it directly. This asset-pack copy exists so artists can replace or improve a complete pack without digging through app code.\n\nAll placeholder PNGs in this pack are generated by `tools/generate-pixel-assets.py` and released as CC0/public domain.\n""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    make_hero()
    make_monsters()
    make_training_stations()
    make_objects()
    make_bg()
    sync_asset_pack()
