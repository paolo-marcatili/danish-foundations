from __future__ import annotations

"""Generate a clean, transparent 12x8 hero pose guide sheet.

The guide is intentionally simple and vector-like so it can be used directly by
Phaser or as a pose/control image for image-to-image refinement.

Hero design is fixed in every frame:
- sword in the character's left hand (screen-right/front hand while facing right)
- shield in the character's right hand (screen-left/back hand)
- green cape
- brown shirt
- brown pants
- simple belt
- no extra equipment
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import math

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "asset-packs" / "cc0-pixel-v10"
GUIDE_DIR = PACK / "sources" / "guides"
PACK.mkdir(parents=True, exist_ok=True)
GUIDE_DIR.mkdir(parents=True, exist_ok=True)

FRAME = 128
COLS = 8
ROWS = 12
SHEET_W = FRAME * COLS
SHEET_H = FRAME * ROWS

ROW_NAMES = [
    "idle",
    "walk",
    "jump",
    "attack_1",
    "attack_2_special",
    "defend_parry",
    "hit_fall_get_up",
    "victory_sword_raise",
    "training_strength_squats",
    "training_defense",
    "training_precision_juggle",
    "training_stamina_energy_ball",
]

# Palette: deliberately flat and readable for image-to-image control.
OUTLINE = "#2b211c"
SKIN = "#efbd87"
SKIN_SHADOW = "#c88355"
HAIR = "#5d351f"
HAIR_DARK = "#382219"
SHIRT = "#7a4e2f"
SHIRT_LIGHT = "#9c6840"
PANTS = "#6b472e"
BOOTS = "#3d2a22"
CAPE = "#4b8a4d"
CAPE_DARK = "#2f6538"
BELT = "#3b281f"
BELT_METAL = "#d6ad55"
METAL = "#d9e3e5"
METAL_DARK = "#718895"
SHIELD = "#8da6ad"
SHIELD_LIGHT = "#bdd0d4"
ENERGY = "#77dcff"
ENERGY_CORE = "#e8fbff"
SHADOW = "#00000033"


def fmt(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def attrs(**kwargs: object) -> str:
    out = []
    for key, value in kwargs.items():
        key = key.replace("_", "-")
        out.append(f'{key}="{value}"')
    return " ".join(out)


def line(x1: float, y1: float, x2: float, y2: float, stroke: str, width: float, **extra: object) -> str:
    base = {
        "x1": fmt(x1), "y1": fmt(y1), "x2": fmt(x2), "y2": fmt(y2),
        "stroke": stroke, "stroke_width": fmt(width),
        "stroke_linecap": "round", "stroke_linejoin": "round",
    }
    base.update(extra)
    return f"<line {attrs(**base)}/>"


def ellipse(cx: float, cy: float, rx: float, ry: float, fill: str, stroke: str = OUTLINE, sw: float = 2) -> str:
    return f"<ellipse {attrs(cx=fmt(cx), cy=fmt(cy), rx=fmt(rx), ry=fmt(ry), fill=fill, stroke=stroke, stroke_width=fmt(sw))}/>"


def rect(x: float, y: float, w: float, h: float, fill: str, rx: float = 4, stroke: str = OUTLINE, sw: float = 2, transform: str | None = None) -> str:
    a = dict(x=fmt(x), y=fmt(y), width=fmt(w), height=fmt(h), rx=fmt(rx), fill=fill, stroke=stroke, stroke_width=fmt(sw))
    if transform:
        a["transform"] = transform
    return f"<rect {attrs(**a)}/>"


def polygon(points: Iterable[tuple[float, float]], fill: str, stroke: str = OUTLINE, sw: float = 2) -> str:
    pts = " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)
    return f"<polygon {attrs(points=pts, fill=fill, stroke=stroke, stroke_width=fmt(sw), stroke_linejoin='round')}/>"


def circle(cx: float, cy: float, r: float, fill: str, stroke: str = OUTLINE, sw: float = 2, opacity: float = 1) -> str:
    return f"<circle {attrs(cx=fmt(cx), cy=fmt(cy), r=fmt(r), fill=fill, stroke=stroke, stroke_width=fmt(sw), opacity=fmt(opacity))}/>"


@dataclass
class Pose:
    body_x: float = 64
    body_y: float = 76
    body_angle: float = 0
    head_x: float = 66
    head_y: float = 45
    head_angle: float = 0

    # Character's anatomical left = sword side = screen-right/front.
    left_hip: tuple[float, float] = (70, 91)
    left_knee: tuple[float, float] = (75, 103)
    left_foot: tuple[float, float] = (80, 117)
    right_hip: tuple[float, float] = (58, 91)
    right_knee: tuple[float, float] = (54, 103)
    right_foot: tuple[float, float] = (50, 117)

    left_shoulder: tuple[float, float] = (73, 67)
    left_elbow: tuple[float, float] = (82, 74)
    left_hand: tuple[float, float] = (87, 81)
    right_shoulder: tuple[float, float] = (56, 67)
    right_elbow: tuple[float, float] = (61, 74)
    right_hand: tuple[float, float] = (70, 78)

    sword_angle: float = -28
    sword_length: float = 37
    sword_air: tuple[float, float, float] | None = None  # x, y, angle
    shield_angle: float = -6
    shield_scale: float = 1
    shield_front: bool = True

    crouch: float = 0
    cape_trail: float = 0
    cape_lift: float = 0
    energy_radius: float = 0
    energy_x: float = 104
    energy_y: float = 70
    impact: bool = False
    motion_arc: tuple[float, float, float, float] | None = None  # cx, cy, r, sweep marker
    eye_closed: bool = False


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def p_lerp(a: tuple[float, float], b: tuple[float, float], t: float) -> tuple[float, float]:
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


def base_pose() -> Pose:
    # Open defensive stance, left leg in front, both items protecting torso.
    return Pose()


def pose_for(row: int, col: int) -> Pose:
    p = base_pose()
    t = col / 7

    if row == 0:  # idle, deliberately identical in all frames
        return p

    if row == 1:  # walk: left-front -> together -> right-front -> together
        # Four key positions, interpolated over 8 frames.
        cycle = [
            ((80, 117), (50, 117)),  # left front
            ((69, 117), (59, 117)),  # together
            ((54, 117), (78, 117)),  # right front
            ((62, 117), (68, 117)),  # together
            ((80, 117), (50, 117)),
        ]
        phase = t * 4
        idx = min(3, int(phase))
        local = phase - idx
        lf = p_lerp(cycle[idx][0], cycle[idx + 1][0], local)
        rf = p_lerp(cycle[idx][1], cycle[idx + 1][1], local)
        p.left_foot, p.right_foot = lf, rf
        p.left_knee = ((p.left_hip[0] + lf[0]) / 2 + (2 if lf[0] > 66 else -2), 103)
        p.right_knee = ((p.right_hip[0] + rf[0]) / 2 + (-2 if rf[0] < 64 else 2), 103)
        arm = math.sin(t * math.tau)
        p.left_elbow = (82 - 5 * arm, 74)
        p.left_hand = (87 - 7 * arm, 81)
        p.right_elbow = (61 + 5 * arm, 74)
        p.right_hand = (70 + 4 * arm, 78)
        p.sword_angle = -28 + 8 * arm
        p.shield_angle = -6 - 6 * arm
        p.body_y += 1.5 * abs(math.sin(t * math.tau))
        p.head_y += 1.2 * abs(math.sin(t * math.tau))
        p.cape_trail = 3 + 5 * max(0, -arm)
        return p

    if row == 2:  # very small jump, mostly lifting legs
        lift = [0, 1, 4, 7, 7, 4, 1, 0][col]
        tuck = [0, 1, 4, 7, 7, 4, 1, 0][col]
        p.body_y -= lift
        p.head_y -= lift
        p.left_hip = (70, 91 - lift)
        p.right_hip = (58, 91 - lift)
        p.left_knee = (74, 102 - lift - tuck * 0.45)
        p.right_knee = (58, 102 - lift - tuck * 0.45)
        p.left_foot = (78, 116 - lift - tuck)
        p.right_foot = (53, 116 - lift - tuck)
        p.left_shoulder = (73, 67 - lift)
        p.right_shoulder = (56, 67 - lift)
        p.left_elbow = (82, 74 - lift)
        p.left_hand = (87, 81 - lift)
        p.right_elbow = (61, 74 - lift)
        p.right_hand = (70, 78 - lift)
        p.cape_lift = lift * 0.7
        return p

    if row == 3:  # attack 1 sword swing
        sword_angles = [-28, -62, -105, -150, 145, 100, 42, -28]
        p.sword_angle = sword_angles[col]
        p.sword_length = 39
        p.left_hand = [(87, 81), (82, 67), (76, 59), (84, 58), (93, 69), (96, 79), (91, 83), (87, 81)][col]
        p.left_elbow = [(82, 74), (76, 66), (69, 64), (72, 66), (78, 72), (82, 77), (84, 78), (82, 74)][col]
        p.body_angle = [-1, -4, -6, -4, 3, 6, 3, 0][col]
        p.cape_trail = [0, 2, 4, 7, 10, 7, 3, 0][col]
        if col in (3, 4, 5):
            p.motion_arc = (84, 70, 31, col)
        return p

    if row == 4:  # lunge with small Superman-like jump
        # Start the lunge farther left so the forward sword and trailing cape
        # remain safely inside the 128 px cell.
        base_shift = -16
        forward = [0, 0, 3, 7, 10, 7, 3, 0][col]
        lift = [0, 0, 2, 5, 6, 4, 1, 0][col]
        p.body_x += base_shift + forward
        p.head_x += base_shift + forward
        p.body_y -= lift
        p.head_y -= lift
        p.left_hip = (70 + base_shift + forward, 91 - lift)
        p.right_hip = (58 + base_shift + forward, 91 - lift)
        p.left_knee = (75 + base_shift + forward, 103 - lift - min(4, lift))
        p.right_knee = (54 + base_shift + forward, 103 - lift - min(3, lift))
        p.left_foot = (80 + base_shift + forward + (3 if col in (3, 4) else 0), 117 - lift - min(5, lift))
        p.right_foot = (50 + base_shift + forward - (2 if col in (3, 4) else 0), 117 - lift - min(4, lift))
        p.left_shoulder = (73 + base_shift + forward, 67 - lift)
        p.right_shoulder = (56 + base_shift + forward, 67 - lift)
        p.left_elbow = (79 + base_shift + forward, 66 - lift)
        p.left_hand = (87 + base_shift + forward, 65 - lift)
        p.right_elbow = (64 + base_shift + forward, 72 - lift)
        p.right_hand = (73 + base_shift + forward, 72 - lift)
        p.sword_angle = [-28, -20, -10, 0, 0, 4, -8, -28][col]
        p.sword_length = 31
        p.shield_angle = -18
        p.cape_trail = [0, 3, 7, 12, 15, 11, 5, 0][col]
        p.cape_lift = [0, 0, 2, 6, 8, 5, 2, 0][col]
        return p

    if row == 5:  # defend / parry
        crouch = [0, 2, 5, 8, 8, 5, 2, 0][col]
        shield_forward = [0, 4, 10, 15, 15, 10, 4, 0][col]
        p.crouch = crouch
        p.body_y += crouch
        p.head_y += crouch
        p.left_hip = (70, 91 + crouch)
        p.right_hip = (58, 91 + crouch)
        p.left_knee = (76, 103 + crouch * 0.35)
        p.right_knee = (53, 103 + crouch * 0.35)
        p.left_foot = (80, 117)
        p.right_foot = (50, 117)
        p.right_elbow = (65 + shield_forward * 0.35, 72 + crouch)
        p.right_hand = (72 + shield_forward, 73 + crouch)
        p.left_elbow = (79, 75 + crouch)
        p.left_hand = (84, 83 + crouch)
        p.shield_angle = -14
        p.shield_scale = 1.08
        p.sword_angle = -55
        p.impact = col in (3, 4)
        return p

    if row == 6:  # hit, fall on back, then get up
        # Explicit, readable eight-frame sequence.
        if col == 0:
            return p
        if col == 1:  # hit recoil
            p.body_x -= 5; p.head_x -= 7; p.body_angle = -12; p.head_angle = -8
            p.left_hand = (82, 86); p.sword_angle = 22; p.right_hand = (65, 80)
            p.eye_closed = True; p.impact = True
            return p
        if col == 2:  # tipping backwards
            p.body_x -= 9; p.head_x -= 12; p.body_y += 5; p.head_y += 8; p.body_angle = -32; p.head_angle = -25
            p.left_foot = (73, 117); p.right_foot = (48, 117); p.left_hand = (78, 90); p.sword_angle = 35
            p.eye_closed = True
            return p
        if col in (3, 4):  # lying on back
            p.body_x = 58 + (col - 3) * 2; p.body_y = 105; p.body_angle = -82
            p.head_x = 35; p.head_y = 102; p.head_angle = -78
            p.left_hip = (64, 108); p.right_hip = (58, 104)
            p.left_knee = (83, 111); p.right_knee = (76, 103)
            p.left_foot = (101, 113); p.right_foot = (94, 105)
            p.left_shoulder = (50, 101); p.right_shoulder = (47, 108)
            p.left_elbow = (70, 101); p.left_hand = (82, 105)
            p.right_elbow = (55, 112); p.right_hand = (64, 113)
            p.sword_angle = 8; p.shield_angle = 75; p.eye_closed = True
            return p
        if col == 5:  # roll/kneel
            p.body_x = 58; p.body_y = 91; p.head_x = 53; p.head_y = 65; p.body_angle = -22
            p.left_hip = (63, 101); p.right_hip = (55, 101)
            p.left_knee = (76, 110); p.right_knee = (47, 111)
            p.left_foot = (88, 117); p.right_foot = (42, 117)
            p.left_hand = (76, 91); p.right_hand = (58, 91); p.sword_angle = -8
            return p
        if col == 6:  # getting up
            p.body_y = 83; p.head_y = 53; p.left_foot = (78, 117); p.right_foot = (50, 117)
            p.left_knee = (72, 105); p.right_knee = (54, 105)
            p.left_hand = (84, 86); p.right_hand = (67, 84); p.sword_angle = -20
            return p
        return p

    if row == 7:  # victory: raise sword, no jump
        heights = [0, 5, 12, 19, 21, 16, 7, 0]
        h = heights[col]
        p.left_elbow = (78, 66 - h * 0.35)
        p.left_hand = (81, 78 - h)
        p.sword_angle = [-28, -42, -58, -76, -86, -70, -48, -28][col]
        p.sword_length = 40
        p.right_hand = (70, 78)
        p.shield_angle = -4
        p.head_y -= min(2, h * 0.1)
        return p

    if row == 8:  # squats with equipment held safely
        depth = [0, 3, 8, 13, 13, 8, 3, 0][col]
        p.body_y += depth
        p.head_y += depth
        p.left_hip = (70, 91 + depth)
        p.right_hip = (58, 91 + depth)
        p.left_knee = (79, 101 + depth * 0.35)
        p.right_knee = (48, 101 + depth * 0.35)
        p.left_foot = (82, 117)
        p.right_foot = (48, 117)
        p.left_hand = (86, 84 + depth)
        p.right_hand = (68, 80 + depth)
        p.sword_angle = -42
        return p

    if row == 9:  # repeated shield drill
        forward = [0, 4, 9, 15, 17, 12, 5, 0][col]
        crouch = [0, 1, 3, 5, 5, 3, 1, 0][col]
        p.body_y += crouch; p.head_y += crouch
        p.right_elbow = (64 + forward * 0.35, 72 + crouch)
        p.right_hand = (71 + forward, 73 + crouch)
        p.shield_scale = 1.1
        p.shield_angle = -15
        p.left_hand = (83, 82 + crouch)
        p.sword_angle = -48
        p.impact = col in (3, 4)
        return p

    if row == 10:  # juggle sword: toss, flip, catch in left hand
        if col == 0:
            return p
        if col == 1:
            p.left_hand = (88, 73); p.sword_angle = -68
            return p
        # Sword is airborne for frames 2-5; left hand remains visibly open.
        airborne = {
            2: (91, 56, -90),
            3: (95, 40, -20),
            4: (93, 32, 55),
            5: (90, 48, 130),
        }
        if col in airborne:
            p.sword_air = airborne[col]
            p.left_hand = (88, 72)
            p.left_elbow = (80, 70)
            p.sword_length = 31
            return p
        if col == 6:
            p.left_hand = (88, 72); p.sword_angle = -75
            return p
        return p

    if row == 11:  # energy ball grows and shrinks in front
        radii = [0, 3, 7, 12, 15, 10, 5, 0]
        p.energy_radius = radii[col]
        p.energy_x = 105
        p.energy_y = 70
        p.left_hand = (85, 84)
        p.sword_angle = -55
        p.right_hand = (70, 81)
        p.shield_angle = -8
        return p

    return p


def transform_point(point: tuple[float, float], cx: float, cy: float, angle_deg: float) -> tuple[float, float]:
    if not angle_deg:
        return point
    x, y = point
    a = math.radians(angle_deg)
    dx, dy = x - cx, y - cy
    return (cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a))


def draw_sword(hand: tuple[float, float], angle: float, length: float) -> str:
    hx, hy = hand
    a = math.radians(angle)
    # Handle extends slightly behind hand; blade extends forward.
    grip_back = (hx - math.cos(a) * 8, hy - math.sin(a) * 8)
    guard_c = (hx + math.cos(a) * 2, hy + math.sin(a) * 2)
    blade_start = (hx + math.cos(a) * 4, hy + math.sin(a) * 4)
    tip = (hx + math.cos(a) * length, hy + math.sin(a) * length)
    n = (-math.sin(a), math.cos(a))
    blade = [
        (blade_start[0] + n[0] * 3.2, blade_start[1] + n[1] * 3.2),
        (tip[0], tip[1]),
        (blade_start[0] - n[0] * 3.2, blade_start[1] - n[1] * 3.2),
    ]
    guard_a = (guard_c[0] + n[0] * 8, guard_c[1] + n[1] * 8)
    guard_b = (guard_c[0] - n[0] * 8, guard_c[1] - n[1] * 8)
    return "".join([
        line(grip_back[0], grip_back[1], hx, hy, BELT, 6),
        line(guard_a[0], guard_a[1], guard_b[0], guard_b[1], BELT_METAL, 5),
        polygon(blade, METAL, METAL_DARK, 2),
        line(blade_start[0], blade_start[1], tip[0] - math.cos(a) * 2, tip[1] - math.sin(a) * 2, "#ffffff88", 1.5),
    ])


def draw_shield(hand: tuple[float, float], angle: float, scale: float) -> str:
    x, y = hand
    w, h = 26 * scale, 32 * scale
    transform = f"rotate({fmt(angle)} {fmt(x)} {fmt(y)})"
    return f"""
    <g transform="{transform}">
      <path d="M {fmt(x)} {fmt(y-h/2)} C {fmt(x+w/2)} {fmt(y-h/3)}, {fmt(x+w/2)} {fmt(y+h/4)}, {fmt(x)} {fmt(y+h/2)} C {fmt(x-w/2)} {fmt(y+h/4)}, {fmt(x-w/2)} {fmt(y-h/3)}, {fmt(x)} {fmt(y-h/2)} Z" fill="{SHIELD}" stroke="{OUTLINE}" stroke-width="2.5"/>
      <path d="M {fmt(x)} {fmt(y-h/2+4)} C {fmt(x+w/3)} {fmt(y-h/4)}, {fmt(x+w/3)} {fmt(y+h/5)}, {fmt(x)} {fmt(y+h/2-4)}" fill="none" stroke="{SHIELD_LIGHT}" stroke-width="3"/>
      <circle cx="{fmt(x)}" cy="{fmt(y)}" r="4.5" fill="{BELT_METAL}" stroke="{OUTLINE}" stroke-width="2"/>
    </g>
    """


def draw_frame(p: Pose) -> str:
    out: list[str] = []
    # Ground shadow.
    out.append(ellipse(64, 119, 30, 4, SHADOW, "none", 0))

    # Cape behind body. It extends leftward as hero faces right.
    cape_top = (55, 65)
    cape_bottom = (52, 94)
    trail = p.cape_trail
    lift = p.cape_lift
    out.append(polygon([
        cape_top,
        (40 - trail, 69 - lift),
        (30 - trail, 82 - lift * 0.4),
        (43 - trail * 0.5, 98 - lift * 0.2),
        cape_bottom,
        (61, 82),
    ], CAPE_DARK, OUTLINE, 2.5))
    out.append(polygon([
        (55, 67),
        (43 - trail * 0.75, 72 - lift),
        (37 - trail * 0.8, 84 - lift * 0.35),
        (49 - trail * 0.45, 93),
        (58, 82),
    ], CAPE, "none", 0))

    # Legs, back leg first. The right leg (shield side) is the back leg.
    out.append(line(*p.right_hip, *p.right_knee, PANTS, 10))
    out.append(line(*p.right_knee, *p.right_foot, PANTS, 9))
    out.append(ellipse(p.right_foot[0] + 2, p.right_foot[1], 10, 5, BOOTS, OUTLINE, 2))
    out.append(line(*p.left_hip, *p.left_knee, PANTS, 10))
    out.append(line(*p.left_knee, *p.left_foot, PANTS, 9))
    out.append(ellipse(p.left_foot[0] + 3, p.left_foot[1], 11, 5, BOOTS, OUTLINE, 2))

    # Torso, rotated around center for hit/fall poses.
    torso_transform = f"rotate({fmt(p.body_angle)} {fmt(p.body_x)} {fmt(p.body_y)})"
    out.append(rect(p.body_x - 17, p.body_y - 14, 34, 36, SHIRT, 8, OUTLINE, 2.5, torso_transform))
    out.append(rect(p.body_x - 13, p.body_y - 10, 26, 11, SHIRT_LIGHT, 5, "none", 0, torso_transform))
    out.append(line(p.body_x - 17, p.body_y + 9, p.body_x + 17, p.body_y + 9, BELT, 5))
    out.append(rect(p.body_x - 3, p.body_y + 5.5, 7, 7, BELT_METAL, 1.5, OUTLINE, 1.5))

    # Arms. Sword arm = anatomical left = screen-right.
    out.append(line(*p.left_shoulder, *p.left_elbow, SHIRT_LIGHT, 9))
    out.append(line(*p.left_elbow, *p.left_hand, SKIN_SHADOW, 7))
    out.append(circle(p.left_hand[0], p.left_hand[1], 4.5, SKIN, OUTLINE, 1.5))
    out.append(line(*p.right_shoulder, *p.right_elbow, SHIRT_LIGHT, 9))
    out.append(line(*p.right_elbow, *p.right_hand, SKIN_SHADOW, 7))
    out.append(circle(p.right_hand[0], p.right_hand[1], 4.5, SKIN, OUTLINE, 1.5))

    # Head and hair.
    head_transform = f"rotate({fmt(p.head_angle)} {fmt(p.head_x)} {fmt(p.head_y)})"
    out.append(f'<g transform="{head_transform}">')
    out.append(ellipse(p.head_x, p.head_y, 15, 16, SKIN, OUTLINE, 2.5))
    out.append(polygon([
        (p.head_x - 15, p.head_y - 4),
        (p.head_x - 12, p.head_y - 15),
        (p.head_x - 3, p.head_y - 19),
        (p.head_x + 9, p.head_y - 17),
        (p.head_x + 17, p.head_y - 8),
        (p.head_x + 11, p.head_y - 3),
        (p.head_x + 5, p.head_y - 8),
        (p.head_x - 2, p.head_y - 3),
    ], HAIR, OUTLINE, 2))
    out.append(polygon([
        (p.head_x - 13, p.head_y - 13),
        (p.head_x - 5, p.head_y - 20),
        (p.head_x + 4, p.head_y - 18),
        (p.head_x - 2, p.head_y - 10),
    ], HAIR_DARK, "none", 0))
    if p.eye_closed:
        out.append(line(p.head_x + 4, p.head_y - 1, p.head_x + 9, p.head_y, OUTLINE, 1.8))
    else:
        out.append(circle(p.head_x + 7, p.head_y - 1, 1.8, OUTLINE, "none", 0))
    out.append(line(p.head_x + 7, p.head_y + 7, p.head_x + 11, p.head_y + 6, OUTLINE, 1.6))
    out.append("</g>")

    # Shield stays in right hand. Draw before sword so sword remains readable.
    out.append(draw_shield(p.right_hand, p.shield_angle, p.shield_scale))

    # Sword either in the left hand or airborne during the precision drill.
    if p.sword_air is None:
        out.append(draw_sword(p.left_hand, p.sword_angle, p.sword_length))
    else:
        sx, sy, sa = p.sword_air
        out.append(draw_sword((sx, sy), sa, p.sword_length))

    # Motion and impact effects are intentionally sparse and unambiguous.
    if p.motion_arc:
        cx, cy, r, marker = p.motion_arc
        start = -100 + marker * 8
        end = start + 62
        a1, a2 = math.radians(start), math.radians(end)
        x1, y1 = cx + math.cos(a1) * r, cy + math.sin(a1) * r
        x2, y2 = cx + math.cos(a2) * r, cy + math.sin(a2) * r
        large = 0
        out.append(f'<path d="M {fmt(x1)} {fmt(y1)} A {fmt(r)} {fmt(r)} 0 {large} 1 {fmt(x2)} {fmt(y2)}" fill="none" stroke="#f0c25b99" stroke-width="4" stroke-linecap="round"/>')
    if p.impact:
        out.append(polygon([(104, 62), (111, 66), (107, 72), (115, 78), (104, 79), (101, 89), (96, 80), (87, 82), (93, 73), (88, 65), (98, 67)], "#fff1a0", "#dc8b35", 2))
    if p.energy_radius > 0:
        out.append(circle(p.energy_x, p.energy_y, p.energy_radius + 4, "#77dcff55", "none", 0, 0.7))
        out.append(circle(p.energy_x, p.energy_y, p.energy_radius, ENERGY, "#2c8eb0", 2, 0.95))
        out.append(circle(p.energy_x - p.energy_radius * 0.25, p.energy_y - p.energy_radius * 0.25, max(1.5, p.energy_radius * 0.35), ENERGY_CORE, "none", 0, 0.95))

    return "".join(out)


def build_svg() -> str:
    frames: list[str] = []
    for row in range(ROWS):
        for col in range(COLS):
            p = pose_for(row, col)
            frames.append(f'<g transform="translate({col * FRAME},{row * FRAME})">{draw_frame(p)}</g>')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{SHEET_W}" height="{SHEET_H}" viewBox="0 0 {SHEET_W} {SHEET_H}">
  <title>Hero Language Camp hero pose guide</title>
  <desc>12 animation rows, 8 frames each. Sword left hand, shield right hand, green cape, brown shirt and pants.</desc>
  {''.join(frames)}
</svg>
'''


def make_preview(sheet_png: Path, output: Path) -> None:
    sheet = Image.open(sheet_png).convert("RGBA")
    label_w = 270
    scale = 0.7
    scaled = sheet.resize((int(SHEET_W * scale), int(SHEET_H * scale)), Image.Resampling.LANCZOS)
    width = label_w + scaled.width
    height = scaled.height
    preview = Image.new("RGB", (width, height), (235, 229, 214))
    d = ImageDraw.Draw(preview)
    # Checkerboard behind transparent sheet.
    tile = 16
    checker = Image.new("RGB", scaled.size, (235, 235, 235))
    cd = ImageDraw.Draw(checker)
    for y in range(0, scaled.height, tile):
        for x in range(0, scaled.width, tile):
            if (x // tile + y // tile) % 2:
                cd.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(210, 210, 210))
    checker.paste(scaled, (0, 0), scaled)
    preview.paste(checker, (label_w, 0))

    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 19)
        small = ImageFont.truetype("DejaVuSans.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
        small = font

    row_h = FRAME * scale
    for row, name in enumerate(ROW_NAMES):
        y = int(row * row_h)
        d.rectangle((0, y, label_w - 1, min(height - 1, y + int(row_h) - 1)), fill=(248, 244, 233) if row % 2 == 0 else (239, 234, 222))
        d.text((14, y + 17), f"{row:02d}  {name}", fill=(38, 33, 28), font=font)
        d.text((14, y + 45), "8 frames · 128×128", fill=(92, 82, 70), font=small)
        d.line((label_w, y, width, y), fill=(120, 110, 98), width=1)
    preview.save(output, quality=95)


def validate_sheet(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    if img.size != (SHEET_W, SHEET_H):
        raise RuntimeError(f"Unexpected sheet size {img.size}; expected {(SHEET_W, SHEET_H)}")
    errors: list[str] = []
    for row in range(ROWS):
        for col in range(COLS):
            frame = img.crop((col * FRAME, row * FRAME, (col + 1) * FRAME, (row + 1) * FRAME))
            bbox = frame.getchannel("A").getbbox()
            if bbox is None:
                errors.append(f"row {row}, col {col}: empty")
                continue
            left, top, right, bottom = bbox
            # Leave a safety margin for image-to-image rendering and Phaser filtering.
            if left < 2 or top < 2 or right > FRAME - 2 or bottom > FRAME - 2:
                errors.append(f"row {row}, col {col}: bbox={bbox} touches frame edge")
    if errors:
        raise RuntimeError("Frame validation failed:\n" + "\n".join(errors))


def main() -> None:
    svg_text = build_svg()
    source_svg = GUIDE_DIR / "hero-adventurer-pose-guide.svg"
    source_png = GUIDE_DIR / "hero-adventurer-pose-guide.png"
    runtime_png = PACK / "sources" / "legacy" / "hero-adventurer-guide.png"
    preview_png = GUIDE_DIR / "hero-adventurer-pose-guide-preview.png"

    runtime_png.parent.mkdir(parents=True, exist_ok=True)
    source_svg.write_text(svg_text, encoding="utf-8")
    cairosvg.svg2png(bytestring=svg_text.encode("utf-8"), write_to=str(source_png), output_width=SHEET_W, output_height=SHEET_H)
    # Exact guide is the active runtime sheet until a rendered sheet has been manually verified.
    runtime_png.write_bytes(source_png.read_bytes())
    validate_sheet(source_png)
    make_preview(source_png, preview_png)

    print(f"Generated: {source_svg.relative_to(ROOT)}")
    print(f"Generated: {source_png.relative_to(ROOT)}")
    print(f"Generated: {preview_png.relative_to(ROOT)}")
    print(f"Updated runtime: {runtime_png.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
