from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

ROOT = '/home/claude/pwa'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
NAVY_A, NAVY_B = (18, 69, 122), (7, 22, 38)
BOLT = [(292, 60), (140, 290), (232, 290), (208, 452), (372, 208), (274, 208)]


def diag_gradient(size, c1, c2):
    w, h = size
    g = Image.linear_gradient('L').resize((max(w, h) * 2, max(w, h) * 2))
    g = g.rotate(45, resample=Image.BICUBIC, expand=False)
    g = g.crop(((g.width - w) // 2, (g.height - h) // 2, (g.width - w) // 2 + w, (g.height - h) // 2 + h))
    a = Image.new('RGB', size, c1)
    b = Image.new('RGB', size, c2)
    return Image.composite(b, a, g)


def vgrad(size, top, bottom):
    w, h = size
    g = Image.linear_gradient('L').resize((w, h))
    return Image.composite(Image.new('RGB', size, bottom), Image.new('RGB', size, top), g)


def draw_bolt(img, cx, cy, height, outline=True):
    """Draw the gold bolt centred at (cx, cy) with the given pixel height."""
    xs = [p[0] for p in BOLT]; ys = [p[1] for p in BOLT]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    s = height / bh
    ox = cx - (min(xs) + bw / 2) * s
    oy = cy - (min(ys) + bh / 2) * s
    pts = [(ox + x * s, oy + y * s) for x, y in BOLT]
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    fill = vgrad(img.size, (255, 210, 77), (255, 159, 0))
    # soft glow
    glow = mask.filter(ImageFilter.GaussianBlur(height * 0.04))
    img.paste(Image.new('RGB', img.size, (255, 190, 40)), (0, 0), glow.point(lambda v: int(v * 0.35)))
    img.paste(fill, (0, 0), mask)
    if outline:
        d = ImageDraw.Draw(img)
        d.line(pts + [pts[0]], fill=(255, 243, 196), width=max(1, int(height * 0.012)), joint='curve')


def circuit_lines(img, s):
    d = ImageDraw.Draw(img)
    col = (47, 111, 168)
    w = max(2, int(10 * s))
    d.line([(64 * s, 150 * s), (150 * s, 150 * s), (184 * s, 116 * s), (244 * s, 116 * s)], fill=col, width=w, joint='curve')
    d.line([(448 * s, 362 * s), (362 * s, 362 * s), (328 * s, 396 * s), (268 * s, 396 * s)], fill=col, width=w, joint='curve')
    for (x, y) in [(64, 150), (448, 362)]:
        r = 12 * s
        d.ellipse([x * s - r, y * s - r, x * s + r, y * s + r], fill=col)


def make_icon(px, rounded=True, bolt_h=0.78, lines=True, supersample=4):
    S = px * supersample
    bg = diag_gradient((S, S), NAVY_A, NAVY_B)
    if lines and px >= 64:
        circuit_lines(bg, S / 512)
    draw_bolt(bg, S * 0.52, S * 0.5, S * bolt_h)
    if rounded:
        m = Image.new('L', (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.2188), fill=255)
        out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        out.paste(bg.convert('RGBA'), (0, 0), m)
    else:
        out = bg.convert('RGBA')
    return out.resize((px, px), Image.LANCZOS)


os.makedirs(f'{ROOT}/icons', exist_ok=True)
os.makedirs(f'{ROOT}/images', exist_ok=True)

for px in (72, 96, 128, 144, 152, 192, 384, 512):
    make_icon(px, rounded=True, bolt_h=0.78).save(f'{ROOT}/icons/icon-{px}.png', optimize=True)
for px in (192, 512):
