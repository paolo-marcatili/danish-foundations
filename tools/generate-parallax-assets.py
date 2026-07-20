from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "asset-packs" / "cc0-pixel-v10"
PACK.mkdir(parents=True, exist_ok=True)

TRANSPARENT = (0, 0, 0, 0)
INK = (24, 27, 38, 255)
SHADOW = (0, 0, 0, 46)

# Old semantic filenames are intentionally removed. v0.10.4 uses numbered,
# descriptive layers so a graphics pack can omit a layer without breaking the
# renderer.
STALE = [
    "bg-sky.png",
    "bg-mountains.png",
    "bg-hills.png",
    "bg-forest.png",
    "bg-village.png",
    "ground-strip.png",
    "objects.png",
]
for stale in STALE:
    path = PACK / stale
    if path.exists():
        path.unlink()


def save(img: Image.Image, name: str) -> None:
    img.save(PACK / name)


def seamless_x(img: Image.Image) -> Image.Image:
    """Make the first/last texture columns identical for Phaser TileSprite."""
    w, h = img.size
    for y in range(h):
        img.putpixel((w - 1, y), img.getpixel((0, y)))
    return img


def rect(d: ImageDraw.ImageDraw, box, fill, radius=0, outline=INK):
    if outline:
        d.rounded_rectangle(box, radius=radius, fill=outline)
        x1, y1, x2, y2 = box
        inset = 1 if min(x2 - x1, y2 - y1) > 8 else 0
        d.rounded_rectangle((x1 + inset, y1 + inset, x2 - inset, y2 - inset), radius=max(0, radius - inset), fill=fill)
    else:
        d.rounded_rectangle(box, radius=radius, fill=fill)


def layer_00_sky() -> Image.Image:
    w, h = 960, 540
    img = Image.new("RGBA", (w, h), (142, 224, 252, 255))
    d = ImageDraw.Draw(img)
    # Very soft vertical palette baked into the sky, no alpha at runtime.
    for y in range(h):
        t = y / (h - 1)
        r = int(128 + 76 * t)
        g = int(222 + 22 * t)
        b = int(252 - 46 * t)
        d.line((0, y, w, y), fill=(r, g, b, 255))
    # Sun fixed in the sky layer.
    d.ellipse((792, 52, 854, 114), fill=(255, 247, 142, 255))
    d.ellipse((804, 64, 842, 102), fill=(255, 222, 75, 255))
    # Blocky clouds.
    for x, y, scale in [(105, 68, 1.0), (625, 102, 1.15), (348, 45, 0.75)]:
        col = (247, 253, 255, 255)
        d.rounded_rectangle((x, y + int(20 * scale), x + int(122 * scale), y + int(52 * scale)), radius=int(14 * scale), fill=col)
        d.rounded_rectangle((x + int(26 * scale), y + int(3 * scale), x + int(92 * scale), y + int(41 * scale)), radius=int(10 * scale), fill=col)
        d.rounded_rectangle((x - int(14 * scale), y + int(23 * scale), x + int(50 * scale), y + int(58 * scale)), radius=int(12 * scale), fill=col)
    return img


def layer_01_far_mountains() -> Image.Image:
    w, h = 768, 190
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    xs = list(range(0, w, 4))
    if xs[-1] != w - 1:
        xs.append(w - 1)

    ranges = [
        (142, 42, (186, 210, 220, 255), (157, 188, 204, 255), 0.0),
        (160, 58, (154, 187, 204, 255), (116, 158, 184, 255), 1.35),
    ]
    for base, amp, light, dark, phase in ranges:
        ridge = []
        for x in xs:
            t = x / (w - 1)
            y = base - amp * (0.42 + 0.58 * math.sin(2 * math.pi * (t * 3.0 + phase)) ** 2)
            y -= 8 * math.sin(2 * math.pi * (t * 5.0 + phase * 0.2))
            ridge.append((x, int(y)))
        d.polygon(ridge + [(w - 1, h), (0, h)], fill=light)
        shade = []
        for x in xs:
            t = x / (w - 1)
            y = base + 18 - amp * 0.45 * (0.45 + 0.55 * math.sin(2 * math.pi * (t * 3.0 + phase)) ** 2)
            shade.append((x, int(y)))
        d.polygon(shade + [(w - 1, h), (0, h)], fill=dark)
    # Snow caps placed away from texture edges.
    for x in range(96, w - 96, 146):
        peak_y = 70 + int(10 * math.sin(x * 0.08))
        d.polygon([(x - 20, peak_y + 38), (x, peak_y), (x + 20, peak_y + 38)], fill=(237, 248, 250, 255))
        d.polygon([(x - 8, peak_y + 20), (x, peak_y + 5), (x + 8, peak_y + 20)], fill=(255, 255, 255, 255))
    return seamless_x(img)


def wavy_hill_layer(width: int, height: int, base: int, colors, phase: float, details: bool) -> Image.Image:
    img = Image.new("RGBA", (width, height), TRANSPARENT)
    d = ImageDraw.Draw(img)
    for layer, color in enumerate(colors):
        points = []
        for x in range(0, width + 1, 4):
            t = x / width
            y = base + layer * 18 + 8 * math.sin(2 * math.pi * (t * (1.8 + layer * 0.5) + phase))
            y += 5 * math.sin(2 * math.pi * (t * 4.0 + phase * 0.5 + layer))
            points.append((x, int(y)))
        d.polygon(points + [(width, height), (0, height)], fill=color)
    if details:
        # Sparse silhouette bushes, baked into layer so they use the same speed.
        for x in range(36, width, 112):
            y = base + 42 + int(4 * math.sin(x * 0.1))
            for dx, r, col in [(-12, 13, colors[-1]), (4, 17, colors[-2]), (19, 11, colors[-1])]:
                d.ellipse((x + dx - r, y - r, x + dx + r, y + r), fill=col)
    return seamless_x(img)


def layer_02_far_hills() -> Image.Image:
    return wavy_hill_layer(768, 128, 58, [(154, 200, 139, 255), (129, 182, 124, 255), (109, 166, 112, 255)], 0.15, False)


def layer_03_mid_hills() -> Image.Image:
    return wavy_hill_layer(768, 146, 64, [(130, 190, 125, 255), (103, 169, 108, 255), (85, 148, 95, 255)], 0.62, True)


def layer_04_sparse_forest() -> Image.Image:
    w, h = 768, 178
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    ground = 152
    # Low ground band only; avoid covering the hill layers.
    d.rectangle((0, ground, w, h), fill=(75, 147, 84, 255))
    trunk = (96, 72, 48, 255)
    dark = (48, 114, 72, 255)
    mid = (62, 139, 80, 255)
    light = (79, 162, 92, 255)

    def tree(cx: int, scale: float) -> None:
        y = ground + int(3 * math.sin(cx * 0.08))
        height = int(106 * scale)
        width = int(44 * scale)
        d.rectangle((cx - 4, y - int(48 * scale), cx + 4, y), fill=trunk)
        d.polygon([(cx, y - height), (cx - width, y - int(44 * scale)), (cx + width, y - int(44 * scale))], fill=dark)
        d.polygon([(cx, y - int(86 * scale)), (cx - int(width * 0.82), y - int(30 * scale)), (cx + int(width * 0.82), y - int(30 * scale))], fill=mid)
        d.polygon([(cx, y - int(68 * scale)), (cx - int(width * 0.64), y - int(18 * scale)), (cx + int(width * 0.64), y - int(18 * scale))], fill=light)

    for cx, scale in [(80, 0.85), (220, 0.75), (388, 0.95), (566, 0.82), (712, 0.7)]:
        for offset in (-w, 0, w):
            tree(cx + offset, scale)
    return seamless_x(img)


def layer_05_village_back() -> Image.Image:
    w, h = 768, 154
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    d = ImageDraw.Draw(img)
    ground = 132
    d.rectangle((0, ground, w, h), fill=(84, 156, 91, 255))

    def cottage(x: int, y: int, scale: float) -> None:
        ww = int(76 * scale)
        hh = int(54 * scale)
        rect(d, (x, y - hh, x + ww, y), (210, 172, 116, 255), radius=2)
        d.polygon([(x - int(10 * scale), y - hh + int(6 * scale)), (x + ww // 2, y - hh - int(42 * scale)), (x + ww + int(10 * scale), y - hh + int(6 * scale))], fill=INK)
        d.polygon([(x - int(5 * scale), y - hh + int(6 * scale)), (x + ww // 2, y - hh - int(35 * scale)), (x + ww + int(5 * scale), y - hh + int(6 * scale))], fill=(172, 99, 72, 255))
        d.rectangle((x + int(34 * scale), y - int(28 * scale), x + int(50 * scale), y - 2), fill=(94, 66, 50, 255))
        d.rectangle((x + int(10 * scale), y - int(35 * scale), x + int(25 * scale), y - int(22 * scale)), fill=(106, 177, 210, 255))
        d.rectangle((x + int(56 * scale), y - int(35 * scale), x + int(68 * scale), y - int(23 * scale)), fill=(106, 177, 210, 255))

    for x, scale in [(36, 0.78), (246, 0.68), (472, 0.82), (666, 0.64)]:
        for offset in (-w, 0, w):
            cottage(x + offset, ground, scale)
    return seamless_x(img)


def layer_06_path_ground() -> Image.Image:
    w, h = 768, 234
    img = Image.new("RGBA", (w, h), (90, 177, 92, 255))
    d = ImageDraw.Draw(img)
    # Back grass field.
    d.rectangle((0, 0, w, 44), fill=(103, 193, 101, 255))
    # A broad path, slightly seen from above.
    upper, lower = [], []
    for x in range(0, w + 1, 8):
        top_y = 42 + int(3 * math.sin(2 * math.pi * x / w * 1.8) + 2 * math.sin(2 * math.pi * x / w * 5.2))
        bottom_y = 166 + int(5 * math.sin(2 * math.pi * x / w * 1.8 + 0.8))
        upper.append((x, top_y))
        lower.append((x, bottom_y))
    d.polygon(upper + lower[::-1], fill=(196, 146, 78, 255))
    # Inner lighter lane.
    u2, l2 = [], []
    for x in range(0, w + 1, 8):
        u2.append((x, 68 + int(3 * math.sin(2 * math.pi * x / w * 1.8 + 0.3))))
        l2.append((x, 132 + int(3 * math.sin(2 * math.pi * x / w * 1.8 + 1.2))))
    d.polygon(u2 + l2[::-1], fill=(225, 183, 108, 255))
    # Front grass lip and dirt body to bottom.
    lip = []
    for x in range(0, w + 1, 8):
        lip.append((x, 166 + int(3 * math.sin(2 * math.pi * x / w * 2.4))))
    d.polygon(lip + [(w, 190), (0, 190)], fill=(73, 153, 78, 255))
    d.rectangle((0, 188, w, h), fill=(102, 73, 50, 255))
    for x in range(0, w, 18):
        y = 191 + ((x // 18) % 6) * 5
        d.rectangle((x, y, x + 11, y + 3), fill=(74, 55, 43, 255))
    # Path pebbles, baked into ground.
    for x in range(18, w, 64):
        y = 82 + int(34 * ((math.sin(x * 0.09) + 1) / 2))
        d.rectangle((x, y, x + 6, y + 3), fill=(166, 118, 70, 255))
        d.rectangle((x + 26, y + 18, x + 31, y + 21), fill=(178, 132, 75, 255))
    return seamless_x(img)


def small_objects_sheet() -> Image.Image:
    names = ["log", "stump", "sign", "crate", "barrel", "small_rock", "small_bush", "wildflower"]
    sheet = Image.new("RGBA", (48 * len(names), 48), TRANSPARENT)
    d = ImageDraw.Draw(sheet)
    for idx, name in enumerate(names):
        x = idx * 48
        d.ellipse((x + 5, 42, x + 43, 47), fill=SHADOW)
        if name == "log":
            rect(d, (x + 6, 31, x + 42, 43), (126, 79, 47, 255), radius=6)
            d.ellipse((x + 32, 30, x + 43, 43), fill=INK)
            d.ellipse((x + 34, 32, x + 42, 41), fill=(165, 108, 63, 255))
        elif name == "stump":
            rect(d, (x + 16, 22, x + 34, 45), (126, 82, 48, 255), radius=2)
            d.ellipse((x + 13, 17, x + 37, 29), fill=INK)
            d.ellipse((x + 15, 19, x + 35, 28), fill=(176, 117, 69, 255))
        elif name == "sign":
            d.rectangle((x + 22, 22, x + 27, 46), fill=INK)
            d.rectangle((x + 23, 23, x + 26, 45), fill=(118, 78, 48, 255))
            rect(d, (x + 8, 13, x + 40, 29), (214, 166, 92, 255), radius=3)
            d.rectangle((x + 16, 20, x + 32, 22), fill=(120, 78, 47, 255))
        elif name == "crate":
            rect(d, (x + 12, 22, x + 38, 45), (166, 105, 55, 255), radius=2)
            d.line((x + 14, 24, x + 36, 43), fill=(102, 66, 43, 255), width=3)
            d.line((x + 36, 24, x + 14, 43), fill=(102, 66, 43, 255), width=3)
        elif name == "barrel":
            rect(d, (x + 15, 20, x + 35, 45), (151, 91, 48, 255), radius=7)
            d.rectangle((x + 16, 27, x + 34, 30), fill=(99, 70, 56, 255))
            d.rectangle((x + 16, 38, x + 34, 41), fill=(99, 70, 56, 255))
        elif name == "small_rock":
            rect(d, (x + 10, 30, x + 39, 45), (124, 136, 140, 255), radius=6)
            d.polygon([(x + 15, 33), (x + 24, 30), (x + 20, 39)], fill=(171, 184, 187, 255))
        elif name == "small_bush":
            for cx, cy, r, col in [(17, 36, 10, (75, 159, 88, 255)), (28, 31, 13, (88, 181, 99, 255)), (37, 37, 9, (70, 151, 84, 255))]:
                d.ellipse((x + cx - r, cy - r, x + cx + r, cy + r), fill=INK)
                d.ellipse((x + cx - r + 1, cy - r + 1, x + cx + r - 1, cy + r - 1), fill=col)
        elif name == "wildflower":
            d.line((x + 24, 44, x + 24, 27), fill=(48, 139, 64, 255), width=2)
            for dx, dy, col in [(-5, -3, (255, 109, 139, 255)), (5, -3, (255, 204, 75, 255)), (0, -7, (255, 109, 139, 255)), (0, 1, (255, 204, 75, 255))]:
                d.ellipse((x + 24 + dx - 4, 27 + dy - 4, x + 24 + dx + 4, 27 + dy + 4), fill=col, outline=INK)
            d.ellipse((x + 20, 23, x + 28, 31), fill=(255, 240, 113, 255))
    return sheet


def large_objects_sheet() -> Image.Image:
    names = ["large_pine", "large_oak", "large_cottage", "large_house", "boulder", "well", "large_mushroom", "arch"]
    frame = 96
    sheet = Image.new("RGBA", (frame * len(names), frame), TRANSPARENT)
    d = ImageDraw.Draw(sheet)
    for idx, name in enumerate(names):
        x = idx * frame
        d.ellipse((x + 10, 87, x + 86, 95), fill=SHADOW)
        if name == "large_pine":
            d.rectangle((x + 45, 50, x + 53, 92), fill=(101, 69, 45, 255))
            for yy, wid, col in [(6, 72, (47, 112, 72, 255)), (24, 64, (57, 139, 82, 255)), (43, 52, (70, 158, 90, 255))]:
                d.polygon([(x + 49, yy), (x + 49 - wid // 2, yy + 46), (x + 49 + wid // 2, yy + 46)], fill=INK)
                d.polygon([(x + 49, yy + 2), (x + 51 - wid // 2, yy + 45), (x + 47 + wid // 2, yy + 45)], fill=col)
        elif name == "large_oak":
            d.rectangle((x + 42, 48, x + 55, 92), fill=(107, 71, 47, 255))
            for cx, cy, r, col in [(34, 44, 24, (76, 151, 87, 255)), (59, 43, 25, (82, 166, 94, 255)), (48, 26, 28, (93, 181, 101, 255)), (48, 57, 23, (70, 145, 83, 255))]:
                d.ellipse((x + cx - r, cy - r, x + cx + r, cy + r), fill=INK)
                d.ellipse((x + cx - r + 1, cy - r + 1, x + cx + r - 1, cy + r - 1), fill=col)
        elif name == "large_cottage":
            rect(d, (x + 14, 42, x + 82, 92), (213, 175, 116, 255), radius=3)
            d.polygon([(x + 7, 44), (x + 48, 9), (x + 89, 44)], fill=INK)
            d.polygon([(x + 10, 44), (x + 48, 13), (x + 86, 44)], fill=(176, 102, 72, 255))
            d.rectangle((x + 43, 64, x + 58, 92), fill=(100, 67, 47, 255))
            d.rectangle((x + 24, 57, x + 38, 70), fill=(102, 177, 215, 255))
            d.rectangle((x + 64, 57, x + 75, 70), fill=(102, 177, 215, 255))
        elif name == "large_house":
            rect(d, (x + 12, 32, x + 85, 92), (188, 150, 103, 255), radius=2)
            d.rectangle((x + 12, 28, x + 85, 38), fill=INK)
            d.rectangle((x + 15, 29, x + 82, 36), fill=(83, 99, 109, 255))
            d.rectangle((x + 26, 64, x + 43, 92), fill=(94, 66, 49, 255))
            d.rectangle((x + 58, 52, x + 74, 66), fill=(105, 177, 211, 255))
            for xx in [22, 47, 79]:
                d.line((x + xx, 40, x + xx, 91), fill=(146, 111, 77, 255), width=2)
        elif name == "boulder":
            rect(d, (x + 20, 55, x + 78, 92), (125, 135, 138, 255), radius=12)
            d.polygon([(x + 27, 62), (x + 45, 56), (x + 39, 76)], fill=(171, 184, 186, 255))
            d.polygon([(x + 52, 62), (x + 69, 68), (x + 55, 78)], fill=(98, 111, 116, 255))
        elif name == "well":
            rect(d, (x + 25, 55, x + 71, 92), (119, 122, 121, 255), radius=4)
            d.rectangle((x + 28, 63, x + 68, 66), fill=(75, 79, 84, 255))
            d.polygon([(x + 16, 56), (x + 48, 25), (x + 80, 56)], fill=INK)
            d.polygon([(x + 19, 56), (x + 48, 29), (x + 77, 56)], fill=(178, 104, 74, 255))
            d.rectangle((x + 27, 48, x + 31, 74), fill=(111, 73, 45, 255))
            d.rectangle((x + 65, 48, x + 69, 74), fill=(111, 73, 45, 255))
        elif name == "large_mushroom":
            rect(d, (x + 42, 58, x + 54, 92), (244, 215, 168, 255), radius=4)
            d.pieslice((x + 18, 26, x + 78, 76), 180, 360, fill=INK)
            d.pieslice((x + 20, 28, x + 76, 74), 180, 360, fill=(222, 76, 83, 255))
            for dx, dy in [(35, 41), (50, 34), (61, 48)]:
                d.rectangle((x + dx, dy, x + dx + 7, dy + 5), fill=(255, 235, 176, 255))
        elif name == "arch":
            rect(d, (x + 21, 41, x + 75, 92), (129, 132, 132, 255), radius=4)
            d.pieslice((x + 30, 45, x + 66, 98), 180, 360, fill=(40, 44, 55, 255))
            for xx in [25, 42, 59]:
                d.rectangle((x + xx, 48, x + xx + 11, 54), fill=(158, 163, 163, 255))
    return sheet.resize((256 * len(names), 256), Image.Resampling.NEAREST)


def front_objects_sheet() -> Image.Image:
    names = ["front_grass", "front_flower", "front_rock", "front_bush", "fern", "front_mushroom"]
    frame = 64
    sheet = Image.new("RGBA", (frame * len(names), frame), TRANSPARENT)
    d = ImageDraw.Draw(sheet)
    for idx, name in enumerate(names):
        x = idx * frame
        d.ellipse((x + 8, 56, x + 56, 63), fill=SHADOW)
        if name == "front_grass":
            for i in range(12):
                xx = x + 8 + i * 4
                d.polygon([(xx, 60), (xx + 2, 34 + (i % 4)), (xx + 5, 60)], fill=(55, 150, 70, 255))
            d.rectangle((x + 5, 59, x + 59, 63), fill=(67, 164, 78, 255))
        elif name == "front_flower":
            for stem in [22, 36, 48]:
                d.line((x + stem, 60, x + stem, 39), fill=(49, 139, 65, 255), width=2)
                d.ellipse((x + stem - 7, 34, x + stem + 7, 48), fill=INK)
                d.ellipse((x + stem - 6, 35, x + stem + 6, 47), fill=(255, 118, 145, 255))
                d.ellipse((x + stem - 2, 39, x + stem + 3, 44), fill=(255, 237, 109, 255))
        elif name == "front_rock":
            rect(d, (x + 13, 41, x + 52, 61), (126, 138, 141, 255), radius=7)
            d.polygon([(x + 18, 44), (x + 30, 41), (x + 25, 55)], fill=(175, 187, 190, 255))
        elif name == "front_bush":
            for cx, cy, r, col in [(19, 49, 14, (75, 160, 87, 255)), (34, 43, 18, (88, 181, 99, 255)), (49, 50, 13, (70, 151, 84, 255))]:
                d.ellipse((x + cx - r, cy - r, x + cx + r, cy + r), fill=INK)
                d.ellipse((x + cx - r + 1, cy - r + 1, x + cx + r - 1, cy + r - 1), fill=col)
        elif name == "fern":
            for i in range(7):
                d.line((x + 32, 60, x + 12 + i * 7, 45 - abs(3 - i) * 3), fill=(49, 143, 69, 255), width=3)
                d.line((x + 32, 60, x + 52 - i * 5, 44 - abs(3 - i) * 3), fill=(67, 170, 82, 255), width=3)
        elif name == "front_mushroom":
            rect(d, (x + 28, 45, x + 36, 61), (244, 215, 168, 255), radius=3)
            d.pieslice((x + 14, 30, x + 50, 57), 180, 360, fill=INK)
            d.pieslice((x + 16, 32, x + 48, 55), 180, 360, fill=(222, 76, 83, 255))
            d.rectangle((x + 25, 39, x + 30, 43), fill=(255, 235, 176, 255))
            d.rectangle((x + 38, 42, x + 43, 46), fill=(255, 235, 176, 255))
    return sheet


def equipment_sheet(kind: str, size: int) -> Image.Image:
    sheet = Image.new("RGBA", (size * 64, size), TRANSPARENT)
    d = ImageDraw.Draw(sheet)
    s = size / 48

    def sc(v: float) -> int:
        return int(round(v * s))

    for frame in range(64):
        x = frame * size
        group = "walk" if frame <= 5 else "run" if frame <= 11 else "attack1" if frame <= 15 else "attack2" if frame <= 19 else "throw" if frame <= 23 else "parry" if frame <= 27 else "hit" if frame <= 31 else "fall" if frame <= 35 else "victory" if frame <= 39 else "strength" if frame <= 43 else "defense" if frame <= 47 else "precision" if frame <= 51 else "stamina" if frame <= 55 else "fart" if frame <= 59 else "idle"
        phase = frame % 4
        if kind == "armor":
            if group == "fall":
                d.rounded_rectangle((x + sc(9), sc(31 + phase), x + sc(35), sc(40 + phase)), radius=sc(3), fill=(58, 68, 83, 170))
                continue
            d.rounded_rectangle((x + sc(16), sc(22), x + sc(31), sc(36)), radius=sc(3), fill=(50, 58, 73, 170))
            d.rectangle((x + sc(18), sc(25), x + sc(29), sc(28)), fill=(143, 161, 180, 230))
            d.rectangle((x + sc(18), sc(33), x + sc(29), sc(35)), fill=(35, 41, 55, 210))
        elif kind == "sword":
            if group in {"attack1", "attack2"}:
                y = sc(22 + (phase % 2))
                d.line((x + sc(31), y, x + sc(47), y - sc(4 + phase)), fill=INK, width=max(1, sc(3)))
                d.line((x + sc(32), y - sc(1), x + sc(46), y - sc(4 + phase)), fill=(239, 247, 255, 245), width=max(1, sc(1)))
                d.rectangle((x + sc(28), y - sc(2), x + sc(34), y + sc(2)), fill=(221, 172, 70, 235))
            elif group in {"throw", "precision"}:
                d.polygon([(x + sc(34), sc(15)), (x + sc(47), sc(11)), (x + sc(40), sc(21))], fill=(239, 247, 255, 235), outline=INK)
            elif group == "fall":
                d.line((x + sc(4), sc(39 + phase), x + sc(28), sc(42 + phase)), fill=INK, width=max(1, sc(3)))
                d.line((x + sc(5), sc(38 + phase), x + sc(27), sc(41 + phase)), fill=(239, 247, 255, 210), width=max(1, sc(1)))
            else:
                d.line((x + sc(12), sc(29), x + sc(39), sc(14)), fill=INK, width=max(1, sc(3)))
                d.line((x + sc(13), sc(28), x + sc(38), sc(15)), fill=(239, 247, 255, 210), width=max(1, sc(1)))
                d.rectangle((x + sc(10), sc(29), x + sc(17), sc(32)), fill=(221, 172, 70, 210))
        elif kind == "shield":
            raised = group in {"parry", "defense"}
            if group == "fall":
                cx, cy = sc(34), sc(36 + phase)
            else:
                cx, cy = sc(36 if raised else 13), sc(24 if raised else 27)
            d.rounded_rectangle((x + cx - sc(8), cy - sc(10), x + cx + sc(8), cy + sc(11)), radius=sc(5), fill=INK)
            d.rounded_rectangle((x + cx - sc(6), cy - sc(8), x + cx + sc(6), cy + sc(9)), radius=sc(4), fill=(97, 199, 245, 230))
            d.rectangle((x + cx - sc(2), cy - sc(7), x + cx + sc(2), cy + sc(8)), fill=(255, 234, 108, 230))
            d.rectangle((x + cx - sc(6), cy, x + cx + sc(6), cy + sc(2)), fill=(62, 131, 201, 230))
    return sheet


for filename, image in [
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
    save(image, filename)

for size in (48, 96):
    for equipment in ("sword", "shield", "armor"):
        save(equipment_sheet(equipment, size), f"hero-{equipment}-{size}.png")

print("Generated v0.10.4 numeric parallax/object/equipment assets in", PACK)
