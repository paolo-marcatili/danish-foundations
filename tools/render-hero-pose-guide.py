from __future__ import annotations

"""Create a pose-faithful painterly render from the generated vector guide.

The DALL-E image-to-image result is retained as a style reference. Because the
model may change the grid or frame count, this script transfers its warm,
hand-painted texture and palette onto the exact 12x8 pose guide. The output
therefore preserves the runtime frame grid while looking less like flat vector
art.
"""

from pathlib import Path
import math
import random

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "asset-packs" / "cc0-pixel-v10"
GUIDE = PACK / "sources" / "guides" / "hero-adventurer-pose-guide.png"
STYLE = PACK / "sources" / "image-to-image" / "hero-adventurer-dalle-concept.png"
OUT = PACK / "sources" / "rendered" / "hero-adventurer-rendered.png"
PREVIEW = PACK / "sources" / "rendered" / "hero-adventurer-rendered-preview.png"
RUNTIME = PACK / "sources" / "legacy" / "hero-adventurer-rendered-runtime.png"
FRAME = 128
COLS = 8
ROWS = 12

# Flat guide palette. Exact matching is softened below to include antialiased pixels.
PALETTE = {
    "outline": (43, 33, 28),
    "skin": (239, 189, 135),
    "skin_shadow": (200, 131, 85),
    "hair": (93, 53, 31),
    "hair_dark": (56, 34, 25),
    "shirt": (122, 78, 47),
    "shirt_light": (156, 104, 64),
    "pants": (107, 71, 46),
    "boots": (61, 42, 34),
    "cape": (75, 138, 77),
    "cape_dark": (47, 101, 56),
    "belt": (59, 40, 31),
    "belt_metal": (214, 173, 85),
    "metal": (217, 227, 229),
    "metal_dark": (113, 136, 149),
    "shield": (141, 166, 173),
    "shield_light": (189, 208, 212),
    "energy": (119, 220, 255),
}

# Painterly target tones, informed by the image-to-image output.
TARGET = {
    "outline": (42, 30, 23),
    "skin": (224, 165, 103),
    "skin_shadow": (158, 92, 57),
    "hair": (71, 39, 22),
    "hair_dark": (35, 24, 19),
    "shirt": (105, 67, 37),
    "shirt_light": (143, 94, 49),
    "pants": (91, 61, 39),
    "boots": (48, 34, 27),
    "cape": (61, 117, 58),
    "cape_dark": (31, 71, 37),
    "belt": (48, 31, 23),
    "belt_metal": (186, 139, 54),
    "metal": (202, 211, 210),
    "metal_dark": (74, 91, 99),
    "shield": (91, 112, 119),
    "shield_light": (154, 174, 177),
    "energy": (93, 206, 248),
}


def distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def nearest_region(rgb: tuple[int, int, int]) -> tuple[str, float]:
    best_name = "outline"
    best_dist = 1e9
    for name, color in PALETTE.items():
        d = distance(rgb, color)
        if d < best_dist:
            best_name, best_dist = name, d
    return best_name, best_dist


def make_style_texture(size: tuple[int, int]) -> Image.Image:
    style = Image.open(STYLE).convert("RGB")
    # Extract mostly texture rather than the model's altered sprite geometry.
    gray = ImageOps.grayscale(style)
    blurred = gray.filter(ImageFilter.GaussianBlur(9))
    high = ImageChops.subtract(gray, blurred)
    high = ImageEnhance.Contrast(high).enhance(1.8)
    high = ImageOps.autocontrast(high)
    # Tile to sheet dimensions.
    tex = Image.new("L", size, 128)
    tile = high.resize((512, 341), Image.Resampling.LANCZOS)
    for y in range(0, size[1], tile.height):
        for x in range(0, size[0], tile.width):
            tex.paste(tile, (x, y))
    return tex.filter(ImageFilter.GaussianBlur(0.45))


def render() -> Image.Image:
    guide = Image.open(GUIDE).convert("RGBA")
    w, h = guide.size
    style_tex = make_style_texture((w, h))
    tex_px = style_tex.load()
    src_px = guide.load()
    out = Image.new("RGBA", guide.size, (0, 0, 0, 0))
    out_px = out.load()

    random.seed(20260718)
    for y in range(h):
        frame_y = y % FRAME
        # Top-left naturalistic light; lower-right is warmer/darker.
        vertical = (frame_y / (FRAME - 1))
        for x in range(w):
            r, g, b, a = src_px[x, y]
            if a == 0:
                continue
            name, d = nearest_region((r, g, b))
            base = TARGET[name]
            frame_x = x % FRAME
            light = 1.12 - 0.28 * vertical + 0.08 * (1 - frame_x / (FRAME - 1))
            # DALL-E-derived brush texture, intentionally subtle.
            texture = (tex_px[x, y] - 128) / 128.0
            amount = 0.10 if name not in ("outline", "metal", "metal_dark") else 0.055
            jitter = (random.random() - 0.5) * 0.025
            factor = max(0.56, min(1.28, light + texture * amount + jitter))
            # Preserve anti-aliasing by blending target with original when far from a palette anchor.
            blend = max(0.2, min(1.0, 1.0 - d / 95.0))
            rr = int((base[0] * factor) * blend + r * (1 - blend))
            gg = int((base[1] * factor) * blend + g * (1 - blend))
            bb = int((base[2] * factor) * blend + b * (1 - blend))
            out_px[x, y] = (max(0, min(255, rr)), max(0, min(255, gg)), max(0, min(255, bb)), a)

    alpha = guide.getchannel("A")
    # Soft inner shadow creates volume but keeps the transparent frame clean.
    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(3))
    offset_shadow = Image.new("L", guide.size, 0)
    offset_shadow.paste(shadow_mask, (2, 3))
    inner_shadow = ImageChops.subtract(offset_shadow, alpha.filter(ImageFilter.GaussianBlur(0.6)))
    shadow_layer = Image.new("RGBA", guide.size, (40, 23, 15, 0))
    shadow_layer.putalpha(inner_shadow.point(lambda v: int(v * 0.35)))
    out = Image.alpha_composite(out, shadow_layer)

    # Warm highlights from top-left edges.
    edge = alpha.filter(ImageFilter.FIND_EDGES)
    edge = edge.filter(ImageFilter.GaussianBlur(0.7)).point(lambda v: int(v * 0.18))
    highlight = Image.new("RGBA", guide.size, (255, 226, 166, 0))
    highlight.putalpha(edge)
    out = Image.alpha_composite(out, highlight)

    # Tiny painterly grain clipped to the figure alpha.
    grain = Image.effect_noise(guide.size, 24).convert("L").filter(ImageFilter.GaussianBlur(0.35))
    grain_alpha = ImageChops.multiply(grain.point(lambda v: abs(v - 128) // 6), alpha)
    grain_layer = Image.new("RGBA", guide.size, (93, 65, 43, 0))
    grain_layer.putalpha(grain_alpha)
    out = Image.alpha_composite(out, grain_layer)

    # Restore exact guide alpha, guaranteeing transparent frame cells.
    out.putalpha(alpha)
    return out


def make_preview(image: Image.Image, output: Path) -> None:
    scale = 0.62
    scaled = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    tile = 14
    bg = Image.new("RGB", scaled.size, (232, 232, 228))
    d = ImageDraw.Draw(bg)
    for y in range(0, bg.height, tile):
        for x in range(0, bg.width, tile):
            if (x // tile + y // tile) % 2:
                d.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(205, 205, 201))
    bg.paste(scaled, (0, 0), scaled)
    bg.save(output, quality=95)


def main() -> None:
    if not GUIDE.exists():
        raise SystemExit(f"Guide not found: {GUIDE}")
    if not STYLE.exists():
        raise SystemExit(f"Image-to-image style reference not found: {STYLE}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME.parent.mkdir(parents=True, exist_ok=True)
    image = render()
    image.save(OUT)
    # Use the pose-faithful rendered version in the app. The exact SVG/PNG guide remains in sources/guides.
    image.save(RUNTIME)
    make_preview(image, PREVIEW)
    print(f"Generated rendered sheet: {OUT.relative_to(ROOT)}")
    print(f"Generated preview: {PREVIEW.relative_to(ROOT)}")
    print(f"Updated runtime sheet: {RUNTIME.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
