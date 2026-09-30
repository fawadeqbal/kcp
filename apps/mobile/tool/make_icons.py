#!/usr/bin/env python3
"""App icons until the designer's icon exists: the product mark, a cream "<>" on the
terracotta brand colour (packages/ui/src/theme.css), as in the apps' LogoMark.

Run from apps/mobile: python3 tool/make_icons.py (needs Pillow). Replace the source
drawing with the designer's 1024 x 1024 icon later and run it again."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

BRAND = (198, 113, 57)  # brand #c67139, packages/ui/src/theme.css
WHITE = (255, 250, 243)  # on-primary #fffaf3
HERE = Path(__file__).resolve().parent.parent


def draw(size: int, rounded: bool) -> Image.Image:
    scale = 4  # draw big, then shrink: smooth edges
    big = size * scale
    image = Image.new('RGB', (big, big), BRAND)
    if rounded:
        # Android legacy icons are shown as they are: round the corners ourselves.
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), radius=big // 5, fill=255)
        image.putalpha(mask)
    pen = ImageDraw.Draw(image)
    width = max(2, round(big * 0.085))
    c = big / 2
    arm = big * 0.17
    left, right = big * 0.28, big * 0.72
    strokes = [
        [(left + arm * 0.85, c - arm), (left, c), (left + arm * 0.85, c + arm)],  # "<"
        [(right - arm * 0.85, c - arm), (right, c), (right - arm * 0.85, c + arm)],  # ">"
    ]
    for points in strokes:
        pen.line(points, fill=WHITE, width=width, joint='curve')
        # Round ends, like the apps' icons.
        for x, y in (points[0], points[-1]):
            r = width / 2
            pen.ellipse((x - r, y - r, x + r, y + r), fill=WHITE)
    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    res = HERE / 'android/app/src/main/res'
    for folder, size in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
        draw(size, rounded=True).save(res / f'mipmap-{folder}/ic_launcher.png', optimize=True)
    icons = HERE / 'ios/Runner/Assets.xcassets/AppIcon.appiconset'
    contents = json.loads((icons / 'Contents.json').read_text())
    for image in contents['images']:
        points = float(image['size'].split('x')[0])
        pixels = round(points * int(image['scale'].rstrip('x')))
        # iOS rounds the corners itself, and refuses transparency.
        draw(pixels, rounded=False).save(icons / image['filename'], optimize=True)


if __name__ == '__main__':
    main()
