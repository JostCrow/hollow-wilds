import pygame
from .config import BLACK


def draw_text(
    screen: pygame.Surface,
    text: str,
    x: int,
    y: int,
    size: int = 24,
    color: tuple[int, int, int] = BLACK,
) -> int:
    """Render text on screen and return height for layout."""
    font = pygame.font.SysFont(None, size)
    text_surf = font.render(text, True, color)
    _ = screen.blit(text_surf, (x, y))
    return text_surf.get_height()


def draw_button(
    screen: pygame.Surface,
    text: str,
    x: int,
    y: int,
    w: int,
    h: int,
    color: tuple[int, int, int],
    text_color: tuple[int, int, int] = BLACK,
) -> None:
    """Draw a colored button with text."""
    _ = pygame.draw.rect(screen, color, (x, y, w, h))
    _ = draw_text(screen, text, x + 10, y + (h - 24) // 2, 24, text_color)
