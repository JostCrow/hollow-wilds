import pygame
from .config import BLACK, WHITE


def draw_text(screen, text, x, y, size=24, color=BLACK):
    """Render text on screen and return height for layout."""
    font = pygame.font.SysFont(None, size)
    text_surf = font.render(text, True, color)
    screen.blit(text_surf, (x, y))
    return text_surf.get_height()


def draw_button(screen, text, x, y, w, h, color, text_color=BLACK):
    """Draw a colored button with text."""
    pygame.draw.rect(screen, color, (x, y, w, h))
    draw_text(screen, text, x + 10, y + (h - 24) // 2, 24, text_color)
