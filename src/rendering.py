import os
import pygame
import random

from pygame.surface import Surface

from src.models import Creature, Gender
from .config import (
    TILE_SIZE,
    ASSETS_PATH,
    WHITE,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    GREEN,
    RED,
    BLACK,
)
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
            _ = surf.fill((128, 128, 128))
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
            _ = surf.fill((255, 0, 0))
            npc_sprites_cache[sprite_key] = surf
    return npc_sprites_cache[sprite_key]


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


def get_menu_background() -> Surface | None:
    """Get menu background from cache."""
    if "menu" not in menu_bg_cache:
        path = os.path.join(ASSETS_PATH, "background.png")
        if os.path.exists(path):
            menu_bg_cache["menu"] = pygame.image.load(path)
        else:
            menu_bg_cache["menu"] = None
    return menu_bg_cache["menu"]


def get_battle_background(route_name):
    """Get battle background based on route (e.g., grass for routes, fallback)."""
    if not route_name:
        route_name = "default"
    bg_key = "grass.png"
    if bg_key not in background_cache:
        bg_path = os.path.join(ASSETS_PATH, bg_key)
        if os.path.exists(bg_path):
            img = pygame.image.load(bg_path)
            background_cache[bg_key] = pygame.transform.scale(
                img, (SCREEN_WIDTH, SCREEN_HEIGHT)
            )
        else:
            # Fallback: plain background
            surf = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            surf.fill((135, 206, 235))  # Sky blue
            background_cache[bg_key] = surf
    return background_cache[bg_key]


def render_start_menu(screen: Surface):
    """Render the start menu."""
    # Render cached menu background
    bg = get_menu_background()
    if bg:
        _ = screen.blit(bg, (0, 0))

    _ = draw_text(screen, "Pokemon Browser Game", 300, 150, 36)
    draw_button(screen, "New Game", 300, 250, 200, 50, (0, 255, 0))  # Green
    draw_button(
        screen, "Load Game", 300, 320, 200, 50, (0, 0, 255), (255, 255, 255)
    )  # Blue w/ white text


def render_name_gender(screen: Surface, name_input: str, selected_gender: Gender):
    """Render name input and gender selection."""
    # Render cached menu background
    bg = get_menu_background()
    if bg:
        _ = screen.blit(bg, (0, 0))
    _ = draw_text(screen, "Enter your name:", 300, 200)
    _ = draw_text(screen, name_input or "Type here...", 300, 230)
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
    _ = draw_text(screen, "Press ENTER to confirm", 250, 500)


def render_starter_select(
    screen: Surface, starters: list[Creature], selected_starter: Creature
):
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


def render_overworld(screen: Surface, current_route, player, fps: float | int = 0):
    """Render the overworld map and player."""

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

    # Split objects into layers
    objects = current_route.get("objects", [])
    below_layer = [obj for obj in objects if obj.get("layer", "below") == "below"]
    above_layer = [obj for obj in objects if obj.get("layer", "above") == "above"]

    # Render below-layer objects (e.g., trees behind player)
    for obj in below_layer:
        obj_type = obj.get("type", "")
        if not obj_type:
            continue
        tx = obj.get("tx", 0)
        ty = obj.get("ty", 0)
        w = obj.get("w", 1)
        h = obj.get("h", 1)
        obj_key = obj_type.replace("_", "-")
        obj_img = get_tile_surface(obj_key)
        for dx in range(w):
            for dy in range(h):
                obj_tx = tx + dx
                obj_ty = ty + dy
                screen_x = obj_tx * TILE_SIZE - camera_x
                screen_y = obj_ty * TILE_SIZE - camera_y
                if (
                    -TILE_SIZE <= screen_x <= SCREEN_WIDTH
                    and -TILE_SIZE <= screen_y <= SCREEN_HEIGHT
                ):
                    screen.blit(obj_img, (screen_x, screen_y))

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

    # Render above-layer objects (e.g., walkable items in front of player)
    for obj in above_layer:
        obj_type = obj.get("type", "")
        if not obj_type:
            continue
        tx = obj.get("tx", 0)
        ty = obj.get("ty", 0)
        w = obj.get("w", 1)
        h = obj.get("h", 1)
        obj_key = obj_type.replace("_", "-")
        obj_img = get_tile_surface(obj_key)
        for dx in range(w):
            for dy in range(h):
                obj_tx = tx + dx
                obj_ty = ty + dy
                screen_x = obj_tx * TILE_SIZE - camera_x
                screen_y = obj_ty * TILE_SIZE - camera_y
                if (
                    -TILE_SIZE <= screen_x <= SCREEN_WIDTH
                    and -TILE_SIZE <= screen_y <= SCREEN_HEIGHT
                ):
                    screen.blit(obj_img, (screen_x, screen_y))

    # Render wild spawns as small indicators in tall grass
    for spawn in player.wild_spawns:
        tx = spawn.get("tx", 0)
        ty = spawn.get("ty", 0)
        creature_name = spawn["creature"]["name"]
        spawn_x = tx * TILE_SIZE + TILE_SIZE // 2
        spawn_y = ty * TILE_SIZE + TILE_SIZE // 2
        screen_x = spawn_x - camera_x
        screen_y = spawn_y - camera_y
        if (
            -32 <= screen_x <= SCREEN_WIDTH + 32
            and -32 <= screen_y <= SCREEN_HEIGHT + 32
        ):
            sprite = get_monster_sprite_surface(creature_name)
            small_sprite = pygame.transform.scale(sprite, (16, 16))
            screen.blit(small_sprite, (screen_x - 8, screen_y - 8))

    # UI overlay
    draw_text(screen, f"{player.name} - {current_route.get('name', 'Unknown')}", 10, 10)
    draw_text(screen, f"Party: {len(player.party)}", 10, 40)
    draw_text(screen, f"FPS: {int(fps)}", SCREEN_WIDTH - 100, 10)


def render_battle(screen: Surface, wild_pokemon, player, selected_option=0):
    """Render the battle scene with wild Pokemon."""
    # Render battle background
    bg = get_battle_background("test")
    if bg:
        screen.blit(bg, (0, 0))

    selected_creature = wild_pokemon["creature"]

    if selected_creature:
        # Render wild Pokemon on right side
        print(selected_creature)
        wild_sprite = get_monster_sprite_surface(selected_creature["sprite"])
        screen.blit(wild_sprite, (SCREEN_WIDTH - 150, SCREEN_HEIGHT // 2 - 32))
        draw_text(
            screen,
            f"Wild {selected_creature['name']} Lv. {selected_creature['level']}",
            SCREEN_WIDTH - 150,
            SCREEN_HEIGHT // 2 + 50,
            20,
            BLACK,
        )
        # HP bar for wild
        wild_max = wild_pokemon.get("max_hp", 1)
        wild_hp = wild_pokemon.get("current_hp", 0)
        bar_width = 100
        bar_height = 10
        hp_ratio = wild_hp / wild_max if wild_max > 0 else 0
        pygame.draw.rect(
            screen,
            RED,
            (SCREEN_WIDTH - 160, SCREEN_HEIGHT // 2 + 80, bar_width, bar_height),
        )
        pygame.draw.rect(
            screen,
            GREEN,
            (
                SCREEN_WIDTH - 160,
                SCREEN_HEIGHT // 2 + 80,
                int(bar_width * hp_ratio),
                bar_height,
            ),
        )

    if player.party:
        # Assume first party member as active (expand later)
        active_mon = player.party[0]
        active_sprite = get_monster_sprite_surface(active_mon["name"])
        screen.blit(active_sprite, (100, SCREEN_HEIGHT // 2 - 32))
        draw_text(
            screen,
            f"{active_mon['name']} Lv. {active_mon.get('level', 1)}",
            100,
            SCREEN_HEIGHT // 2 + 50,
            20,
            BLACK,
        )
        # HP bar for active
        max_hp = active_mon.get("max_hp", 1)
        hp = active_mon.get("current_hp", 0)
        bar_width = 100
        bar_height = 10
        hp_ratio = hp / max_hp if max_hp > 0 else 0
        pygame.draw.rect(
            screen, RED, (80, SCREEN_HEIGHT // 2 + 80, bar_width, bar_height)
        )
        pygame.draw.rect(
            screen,
            GREEN,
            (80, SCREEN_HEIGHT // 2 + 80, int(bar_width * hp_ratio), bar_height),
        )

    # Bottom menu options
    options = ["FIGHT", "BAG", "POKÉMON", "RUN"]
    menu_y = SCREEN_HEIGHT - 100
    for i, option in enumerate(options):
        color = GREEN if i == selected_option else WHITE
        pygame.draw.rect(screen, color, (50 + i * 150, menu_y, 120, 40))
        draw_text(screen, option, 110 + i * 150, menu_y + 15, 18, BLACK)
