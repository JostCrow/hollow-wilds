import pygame
from .config import (
    BLACK,
    PANEL_BG,
    PANEL_BORDER,
    BUTTON_BG,
    BUTTON_BG_HOVER,
    BUTTON_TEXT,
    BUTTON_SECONDARY_BG,
    BUTTON_SECONDARY_TEXT,
    ASSETS_PATH,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
)
import os

_font_cache: dict[tuple[int, bool], pygame.font.Font] = {}
_icon_cache: dict[tuple[str, int], pygame.Surface] = {}


def get_font(size: int = 24, bold: bool = False) -> pygame.font.Font:
    key = (size, bold)
    if key not in _font_cache:
        _font_cache[key] = pygame.font.SysFont("Arial", size, bold=bold)
    return _font_cache[key]


def draw_text(
    screen: pygame.Surface,
    text: str,
    x: int,
    y: int,
    size: int = 24,
    color: tuple[int, int, int] = BLACK,
    bold: bool = False,
    center: bool = False,
) -> int:
    """Render text on screen and return height for layout."""
    font = get_font(size, bold)
    text_surf = font.render(text, True, color)
    rect = text_surf.get_rect()
    if center:
        rect.center = (x, y)
    else:
        rect.topleft = (x, y)
    _ = screen.blit(text_surf, rect)
    return rect.height


def draw_panel(
    screen: pygame.Surface,
    x: int,
    y: int,
    w: int,
    h: int,
    radius: int = 8,
    shadow: bool = True,
) -> None:
    """Draw a soft panel with border and subtle shadow."""
    if shadow:
        shadow_surf = pygame.Surface((w + 8, h + 8), pygame.SRCALPHA)
        _ = pygame.draw.rect(
            shadow_surf, (0, 0, 0, 40), (8, 8, w, h), border_radius=radius
        )
        _ = screen.blit(shadow_surf, (x - 8, y - 8))
    _ = pygame.draw.rect(screen, PANEL_BG, (x, y, w, h), border_radius=radius)
    _ = pygame.draw.rect(
        screen, PANEL_BORDER, (x, y, w, h), width=2, border_radius=radius
    )


def draw_button(
    screen: pygame.Surface,
    text: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: tuple[int, int, int] = BUTTON_BG,
    text_color: tuple[int, int, int] = BUTTON_TEXT,
    *,
    selected: bool = False,
    secondary: bool = False,
) -> None:
    """Draw a modern rounded button with subtle shadow and border.

    Existing calls remain compatible with defaults.
    """
    bg = BUTTON_SECONDARY_BG if secondary else color
    fg = BUTTON_SECONDARY_TEXT if secondary else text_color

    # Shadow
    shadow_surf = pygame.Surface((w + 6, h + 6), pygame.SRCALPHA)
    _ = pygame.draw.rect(shadow_surf, (0, 0, 0, 45), (6, 6, w, h), border_radius=10)
    _ = screen.blit(shadow_surf, (x - 6, y - 6))

    # Button body
    _ = pygame.draw.rect(screen, bg, (x, y, w, h), border_radius=10)
    # Highlight border if selected
    border_color = BUTTON_BG_HOVER if selected else (255, 255, 255)
    _ = pygame.draw.rect(screen, border_color, (x, y, w, h), width=2, border_radius=10)

    # Text centered
    _ = draw_text(screen, text, x + w // 2, y + h // 2, 20, fg, bold=True, center=True)


def get_icon_surface(name: str, size: int = 24) -> pygame.Surface:
    """Load and cache small UI icons from assets/icons.
    Falls back to a simple circle with the first letter if not found.
    """
    key = (name, size)
    if key in _icon_cache:
        return _icon_cache[key]
    path = os.path.join(ASSETS_PATH, "icons", f"{name}.png")
    if os.path.exists(path):
        img = pygame.image.load(path)
        surf = pygame.transform.smoothscale(img, (size, size))
    else:
        # Fallback: simple circle with letter
        surf = pygame.Surface((size, size), pygame.SRCALPHA)
        _ = pygame.draw.circle(surf, (200, 200, 200), (size // 2, size // 2), size // 2)
        letter = name[:1].upper()
        f = get_font(max(12, size // 2), bold=True)
        txt = f.render(letter, True, (60, 60, 60))
        rect = txt.get_rect(center=(size // 2, size // 2))
        _ = surf.blit(txt, rect)
    _icon_cache[key] = surf
    return surf


def draw_button_with_icon(
    screen: pygame.Surface,
    text: str,
    icon_name: str,
    x: int,
    y: int,
    w: int,
    h: int,
    *,
    selected: bool = False,
    secondary: bool = False,
) -> None:
    """Draw a button with a left-aligned icon and centered text."""
    draw_button(
        screen,
        text,
        x,
        y,
        w,
        h,
        selected=selected,
        secondary=secondary,
    )
    icon = get_icon_surface(icon_name, size=20)
    _ = screen.blit(icon, (x + 12, y + (h - 20) // 2))


def draw_header(
    screen: pygame.Surface, title: str, subtitle: str | None = None
) -> None:
    """Global header bar with title and optional subtitle."""
    bar_h = 56
    draw_panel(screen, 0, 0, SCREEN_WIDTH, bar_h, radius=0, shadow=False)
    _ = draw_text(screen, title, 16, 16, 20, TEXT_PRIMARY)
    if subtitle:
        _ = draw_text(screen, subtitle, 16, 34, 14, TEXT_SECONDARY)


def draw_footer(screen: pygame.Surface, hints: list[str]) -> None:
    """Global footer bar with input hints."""
    bar_h = 36
    y = SCREEN_HEIGHT - bar_h
    draw_panel(screen, 0, y, SCREEN_WIDTH, bar_h, radius=0, shadow=False)
    # Render hints spaced
    x = 16
    for hint in hints:
        _ = draw_text(screen, hint, x, y + 10, 14, TEXT_SECONDARY)
        x += max(100, len(hint) * 8)
