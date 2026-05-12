"""Generate a 1200x630 OG card PNG for a player profile."""
import io
from pathlib import Path
from typing import Dict, Any, Optional

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (11, 14, 20)
SURFACE = (20, 25, 35)
BORDER = (39, 48, 65)
PRIMARY = (16, 185, 129)
AMBER = (245, 158, 11)
RED = (239, 68, 68)
TEXT = (243, 244, 246)
MUTED = (156, 163, 175)


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def render_player_card(player: Dict[str, Any], streaks: Dict[str, Any], titles_by_game: Dict[str, int]) -> bytes:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Title strip
    d.rectangle([(0, 0), (W, 90)], fill=SURFACE)
    d.text((40, 26), "CueStats · Fremont Open", font=_font(28, bold=True), fill=PRIMARY)
    d.text((W - 320, 30), "fremontopen.com", font=_font(24), fill=MUTED)

    # Player name
    name = player.get("name", "—")
    d.text((40, 130), name, font=_font(80, bold=True), fill=TEXT)

    # Subtitle: W-L · win rate
    wins, losses, win_rate = player.get("wins", 0), player.get("losses", 0), player.get("win_rate", 0.0)
    d.text((40, 230), f"{wins} W   ·   {losses} L   ·   {win_rate}% win rate",
           font=_font(36), fill=MUTED)

    # Stats grid (4 cards)
    grid_y = 310
    cards = [
        ("WINS", str(wins), PRIMARY),
        ("LOSSES", str(losses), RED),
        ("CURRENT STREAK", _streak_label(streaks), AMBER),
        ("TOURNEY TITLES", str(sum(titles_by_game.values())), PRIMARY),
    ]
    cw = 270
    gap = 24
    x = 40
    for label, value, color in cards:
        d.rectangle([(x, grid_y), (x + cw, grid_y + 200)], fill=SURFACE, outline=BORDER, width=2)
        d.text((x + 20, grid_y + 22), label, font=_font(18, bold=True), fill=MUTED)
        d.text((x + 20, grid_y + 70), value, font=_font(72, bold=True), fill=color)
        x += cw + gap

    # Tourney titles by game type (bottom strip)
    if titles_by_game:
        ty = 560
        d.text((40, ty - 28), "Tournament titles by game", font=_font(20, bold=True), fill=MUTED)
        chip_x = 40
        for game, count in sorted(titles_by_game.items(), key=lambda kv: -kv[1])[:4]:
            txt = f"{game}: {count}"
            tw = int(d.textlength(txt, font=_font(20)))
            d.rounded_rectangle([(chip_x, ty), (chip_x + tw + 24, ty + 40)], radius=6, fill=SURFACE, outline=BORDER, width=2)
            d.text((chip_x + 12, ty + 8), txt, font=_font(20), fill=TEXT)
            chip_x += tw + 36

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _streak_label(s: Dict[str, Any]) -> str:
    c = s.get("current") or {}
    if not c.get("type") or not c.get("length"):
        return "—"
    return f"{c['length']}{c['type']}"
