"""
Generates the launcher, adaptive and splash artwork from the design tokens.

Run from the repository root:

    python3 scripts/icons.py

Every colour here is read from `global.css` rather than typed, so the artwork
cannot drift from the theme the way `app.json`'s splash grounds did (they held
the pre-Phase-8b palette for two phases). Every shape is a letterform in Geist
600 — DESIGN.md §1.2 rule 1, type does the work, and §15 cut illustration.

Regenerate rather than edit: these are outputs, not sources.
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
GEIST_600 = (
    ROOT / "node_modules/@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf"
)


def tokens() -> dict[str, str]:
    """`--color-bg: 244 242 238;` -> `{'light.bg': '#F4F2EE', 'dark.bg': ...}`."""
    css = (ROOT / "global.css").read_text()
    # The dark values live in a `.dark:root` block after the light ones.
    light, _, dark = css.partition(".dark")
    found = {}

    for theme, block in (("light", light), ("dark", dark)):
        for name, rgb in re.findall(r"--color-([\w-]+):\s*([\d\s]+);", block):
            r, g, b = (int(part) for part in rgb.split())
            found[f"{theme}.{name}"] = f"#{r:02X}{g:02X}{b:02X}"

    return found


def draw_glyph(
    text: str, height: int, fill: str, ground: str | None, size: tuple[int, int]
) -> Image.Image:
    """One piece of type, optically centred on its ink rather than its line box."""
    image = Image.new("RGBA", size, ground or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Binary search a point size that puts the ink at exactly `height`. Font
    # metrics include leading and side bearings; the bounding box of the drawn
    # pixels is the only measurement that matches what the eye sees.
    low, high = 1, height * 4
    font = ImageFont.truetype(GEIST_600, low)

    while low < high:
        mid = (low + high + 1) // 2
        candidate = ImageFont.truetype(GEIST_600, mid)
        box = candidate.getbbox(text)

        if box[3] - box[1] <= height:
            low, font = mid, candidate
        else:
            high = mid - 1

    left, top, right, bottom = font.getbbox(text)
    draw.text(
        ((size[0] - (right - left)) / 2 - left, (size[1] - (bottom - top)) / 2 - top),
        text,
        font=font,
        fill=fill,
    )

    return image


def main() -> None:
    colour = tokens()
    ASSETS.mkdir(exist_ok=True)

    # The launcher icon is §6.1's primary button at icon scale: solid `text`
    # with a `bg` letter. Ink rather than ground because an icon sits on someone
    # else's wallpaper, where a warm off-white square disappears.
    ink, paper = colour["light.text"], colour["light.bg"]

    # Flattened to RGB deliberately: the App Store rejects an icon carrying an
    # alpha channel, even a fully opaque one.
    draw_glyph("Z", 480, paper, ink, (1024, 1024)).convert("RGB").save(
        ASSETS / "icon.png"
    )

    # Android composites this over `adaptiveIcon.backgroundColor` and masks the
    # result — a circle on most launchers. Only the centre 66% is guaranteed to
    # survive, so the glyph is smaller than the one above and the ground is left
    # transparent for the launcher to fill.
    draw_glyph("Z", 380, paper, None, (1024, 1024)).save(ASSETS / "adaptive-icon.png")

    # The splash mark, on transparency so the ground is the theme's own — one
    # file per theme because the ink inverts and the artwork does not.
    #
    # **The `Z` rather than the wordmark**, which DESIGN.md §12 first proposed.
    # Android 12 and later draw the splash icon inside a circular mask with only
    # the inner two thirds guaranteed, and `Zoomies` set at 5.4:1 loses its first
    # and last letters to it. The same geometry as the adaptive foreground above,
    # for the same reason and with the same margin.
    for name, fill in (
        ("splash-icon", ink),
        ("splash-icon-dark", colour["dark.text"]),
    ):
        draw_glyph("Z", 380, fill, None, (1024, 1024)).save(ASSETS / f"{name}.png")

    for name in ("icon", "adaptive-icon", "splash-icon", "splash-icon-dark"):
        with Image.open(ASSETS / f"{name}.png") as image:
            print(f"{name}.png {image.size[0]}x{image.size[1]} {image.mode}")


if __name__ == "__main__":
    main()
