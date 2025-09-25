import os
import pygame
import random
from .config import TILE_SIZE, ASSETS_PATH, WHITE, SCREEN_WIDTH, SCREEN_HEIGHT
from .ui import draw_text, draw_button

# Global caches (loaded once)
tile_cache = {}
npc_sprites_cache = {}
background_cache = {}
monster_sprites_cache = {}
menu_bg_cache = {}


def get_tile_surface(tile_key):
    """Get pre-scaled tile surface from cache."""
    if tile_key not in tile_cache:
        tile_path = os.path.join(ASSETS_PATH, "tiles", f"{tile_key}.png")
        if os.path.exists(tile_path):
            img = pygame.image.load(tile_path)
            tile_cache[tile_key] = pygame.transform.scale(img, (TILE_SIZE, TILE_SIZE))
        else:
            # Fallback: Gray square
            surf = pygame.Surface((TILE_SIZE, TILE_SIZE))
            surf.fill((128, 128, 128))
            tile_cache[tile_key] = surf
    return tile_cache[tile_key]


def get_npc_sprite_surface(sprite_key):
    """Get pre-scaled NPC sprite from cache."""
    if sprite_key not in npc_sprites_cache:
        sprite_path = os.path.join(ASSETS_PATH, "npcs", f"{sprite_key}.png")
        if os.path.exists(sprite_path):
            img = pygame.image.load(sprite_path)
            npc_sprites_cache[sprite_key] = pygame.transform.scale(img, (32, 48))
        else:
            # Fallback: Red rectangle
            surf = pygame.Surface((32, 48))
            surf.fill((255, 0, 0))
            npc_sprites_cache[sprite_key] = surf
    return npc_sprites_cache[sprite_key]


def get_background_surface(route_bg_key):
    """Get background from cache based on route background key."""
    if not route_bg_key:
        return None
    if route_bg_key not in background_cache:
        bg_path = os.path.join(ASSETS_PATH, route_bg_key)
        if os.path.exists(bg_path):
            img = pygame.image.load(bg_path)
            background_cache[route_bg_key] = img
        else:
            background_cache[route_bg_key] = None
    return background_cache[route_bg_key]


def get_monster_sprite_surface(name):
    """Get pre-scaled monster sprite from cache."""
    key = name.lower()
    if key not in monster_sprites_cache:
        sprite_path = os.path.join(ASSETS_PATH, "monster", f"{key}.png")
        if os.path.exists(sprite_path):
            img = pygame.image.load(sprite_path)
            monster_sprites_cache[key] = pygame.transform.scale(img, (64, 64))
        else:
            # Fallback: Green square
            surf = pygame.Surface((64, 64))
            surf.fill((0, 255, 0))
            monster_sprites_cache[key] = surf
    return monster_sprites_cache[key]


def get_menu_background():
    """Get menu background from cache."""
    if "menu" not in menu_bg_cache:
        path = os.path.join(ASSETS_PATH, "background.png")
        if os.path.exists(path):
            menu_bg_cache["menu"] = pygame.image.load(path)
        else:
            menu_bg_cache["menu"] = None
    return menu_bg_cache["menu"]


def render_start_menu(screen):
    """Render the start menu."""
    # Render cached menu background
    bg = get_menu_background()
    if bg:
        screen.blit(bg, (0, 0))

    draw_text(screen, "Pokemon Browser Game", 300, 150, 36)
    draw_button(screen, "New Game", 300, 250, 200, 50, (0, 255, 0))  # Green
    draw_button(
        screen, "Load Game", 300, 320, 200, 50, (0, 0, 255), (255, 255, 255)
    )  # Blue w/ white text


def render_name_gender(screen, name_input, selected_gender):
    """Render name input and gender selection."""
    # Render cached menu background
    bg = get_menu_background()
    if bg:
        screen.blit(bg, (0, 0))
    draw_text(screen, "Enter your name:", 300, 200)
    draw_text(screen, name_input or "Type here...", 300, 230)
    # Gender buttons
    draw_button(
        screen,
        "Male",
        200,
        400,
        100,
        50,
        (0, 255, 0) if selected_gender == "male" else WHITE,
    )
    draw_button(
        screen,
        "Female",
        350,
        400,
        100,
        50,
        (255, 0, 0) if selected_gender == "female" else WHITE,
        WHITE,
    )
    draw_text(screen, "Press ENTER to confirm", 250, 500)


def render_starter_select(screen, starters, selected_starter):
    """Render starter Pokémon selection."""
    # Render cached menu background
    bg = get_menu_background()
    if bg:
        screen.blit(bg, (0, 0))
    draw_text(screen, "Choose your starter:", 300, 150)
    for i, starter in enumerate(starters):
        x = 200 + i * 150
        color = (0, 255, 0) if i == selected_starter else WHITE  # Green for selected
        pygame.draw.rect(screen, color, (x, 300, 100, 100))
        # Render cached monster sprite
        sprite = get_monster_sprite_surface(starter["name"])
        screen.blit(sprite, (x + 18, 320))
        draw_text(screen, starter["name"], x + 10, 400)
    draw_text(screen, "Use LEFT/RIGHT to select, ENTER to choose", 200, 500)


def render_overworld(screen, current_route, player, fps=0):
    """Render the overworld map and player."""
    # Render background if present (cached)
    bg_key = current_route.get("background")
    bg = get_background_surface(bg_key)
    if bg:
        screen.blit(bg, (0, 0))

    # Get map data
    tile_map = current_route.get("tiles", {}).get("map", [])
    if not tile_map:
        # UI overlay even if no map
        draw_text(
            screen, f"{player.name} - {current_route.get('name', 'Unknown')}", 10, 10
        )
        draw_text(screen, f"Party: {len(player.party)}", 10, 40)
        draw_text(screen, f"FPS: {int(fps)}", SCREEN_WIDTH - 100, 10)
        return
    map_height = len(tile_map)
    map_width = len(tile_map[0]) if map_height > 0 else 0
    legend = current_route.get("tiles", {}).get("legend", {})

    # Camera setup to center player
    camera_x = player.x - SCREEN_WIDTH // 2
    camera_y = player.y - SCREEN_HEIGHT // 2

    # Clamp camera to map bounds (prevent going outside grid)
    map_width_px = map_width * TILE_SIZE
    map_height_px = map_height * TILE_SIZE
    camera_x = max(0, min(camera_x, map_width_px - SCREEN_WIDTH))
    camera_y = max(0, min(camera_y, map_height_px - SCREEN_HEIGHT))

    original_camera_x = camera_x
    original_camera_y = camera_y

    # Bump effect for blocked movement (shake camera briefly)
    if hasattr(player, "shake_active") and player.shake_active:
        shake_x = random.randint(-3, 3)
        shake_y = random.randint(-3, 3)
        camera_x += shake_x
        camera_y += shake_y
        player.shake_active = False

    # Re-clamp after shake to stay in bounds
    camera_x = max(0, min(camera_x, map_width_px - SCREEN_WIDTH))
    camera_y = max(0, min(camera_y, map_height_px - SCREEN_HEIGHT))

    # Dynamic player screen position (center normally, slide to edge if clamped)
    player_screen_x = SCREEN_WIDTH // 2 - 16
    player_screen_y = SCREEN_HEIGHT // 2 - 24

    # Check clamps
    is_left_clamped = original_camera_x == 0
    is_right_clamped = original_camera_x == (map_width_px - SCREEN_WIDTH)
    is_top_clamped = original_camera_y == 0
    is_bottom_clamped = original_camera_y == (map_height_px - SCREEN_HEIGHT)

    if is_left_clamped or is_right_clamped or is_top_clamped or is_bottom_clamped:
        # Use world-relative position when clamped (slides to edge)
        player_screen_x = player.x - camera_x - 16  # -16 for sprite half-width
        player_screen_y = player.y - camera_y - 24  # -24 for half-height
        # Clamp to screen bounds (prevent going off-screen)
        player_screen_x = max(16, min(player_screen_x, SCREEN_WIDTH - 32))
        player_screen_y = max(24, min(player_screen_y, SCREEN_HEIGHT - 48))
    else:
        # Normal: Center
        player_screen_x = SCREEN_WIDTH // 2 - 16
        player_screen_y = SCREEN_HEIGHT // 2 - 24

    # Calculate visible tile range (optimization: only render what's on screen)
    start_tx = max(0, int(camera_x // TILE_SIZE) - 1)  # -1 for edge buffer
    end_tx = min(map_width, int((camera_x + SCREEN_WIDTH) // TILE_SIZE) + 2)
    start_ty = max(0, int(camera_y // TILE_SIZE) - 1)
    end_ty = min(map_height, int((camera_y + SCREEN_HEIGHT) // TILE_SIZE) + 2)

    # Render only visible tiles
    for ty in range(start_ty, end_ty):
        for tx in range(start_tx, end_tx):
            if tx >= map_width or ty >= map_height:
                continue
            if tx >= len(tile_map[ty]):
                continue
            tile_type = tile_map[ty][tx]
            tile_key = legend.get(tile_type, "path")  # Default to "path"
            tile_img = get_tile_surface(tile_key)  # Cached, no load/scale
            screen_x = tx * TILE_SIZE - camera_x
            screen_y = ty * TILE_SIZE - camera_y
            # Only blit if on screen (extra safety)
            if (
                -TILE_SIZE <= screen_x <= SCREEN_WIDTH
                and -TILE_SIZE <= screen_y <= SCREEN_HEIGHT
            ):
                screen.blit(tile_img, (screen_x, screen_y))

    # Render NPCs (all, but few; could optimize to visible only if many)
    npcs = current_route.get("npcs", [])
    for npc in npcs:
        position = npc.get("position", {})
        tx = position.get("tx", 0)
        ty = position.get("ty", 0)
        npc_x = tx * TILE_SIZE + TILE_SIZE // 2
        npc_y = ty * TILE_SIZE + TILE_SIZE // 2
        sprite_key = npc.get("sprite", "")
        if sprite_key:
            npc_sprite = get_npc_sprite_surface(sprite_key)  # Cached
            npc_screen_x = npc_x - camera_x
            npc_screen_y = npc_y - camera_y
            # Only blit if on screen
            if (
                -48 <= npc_screen_x <= SCREEN_WIDTH
                and -48 <= npc_screen_y <= SCREEN_HEIGHT
            ):
                screen.blit(
                    npc_sprite, (npc_screen_x - 16, npc_screen_y - 24)
                )  # Center

    # Render player
    if player.sprite:
        screen.blit(player.sprite, (player_screen_x, player_screen_y))

    # UI overlay
    draw_text(screen, f"{player.name} - {current_route.get('name', 'Unknown')}", 10, 10)
    draw_text(screen, f"Party: {len(player.party)}", 10, 40)
    draw_text(screen, f"FPS: {int(fps)}", SCREEN_WIDTH - 100, 10)
