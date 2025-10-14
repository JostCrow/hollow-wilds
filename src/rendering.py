import os
import pygame
import random

from pygame.surface import Surface

from src.battle_state import BattleState
from src.models import Creature, Gender, Object, Player, Route
from .config import (
    TILE_SIZE,
    ASSETS_PATH,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    GREEN,
    WHITE,
    RED,
    BLACK,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    HP_GREEN,
    HP_YELLOW,
    HP_RED,
)
from .ui import (
    draw_text,
    draw_button,
    draw_panel,
    draw_header,
    draw_footer,
    get_icon_surface,
    draw_button_with_icon,
)

# Global caches (loaded once)
tile_cache: dict[str, Surface] = {}
npc_sprites_cache: dict[str, Surface] = {}
background_cache: dict[str, Surface] = {}
monster_sprites_cache: dict[str, Surface] = {}
menu_bg_cache: dict[str, Surface | None] = {}


def get_tile_surface(tile_key: str) -> Surface:
    """Get pre-scaled tile surface from cache."""
    # For consistent randomization, we'll use a mapping of original keys to randomized keys
    # This ensures the same tile always gets the same variant
    if not hasattr(get_tile_surface, "random_mapping"):
        get_tile_surface.random_mapping = {}
    
    # If this tile key has already been randomized, use the stored mapping
    if tile_key in get_tile_surface.random_mapping:
        cache_key = get_tile_surface.random_mapping[tile_key]
    else:
        # Initial randomization for tree and grass tiles
        cache_key = tile_key
        
        # Only apply randomization for tree and grass tiles that don't already have -alt in the name
        if tile_key in ["tree", "grass"] and not tile_key.endswith("-alt"):
            # 35% chance to use the alt version
            if random.random() < 0.35:
                cache_key = f"{tile_key}-alt"
        
        # Store the mapping for future use
        get_tile_surface.random_mapping[tile_key] = cache_key
    
    # Return from cache if already loaded
    if cache_key in tile_cache:
        return tile_cache[cache_key]
    
    # Load the tile
    tile_path = os.path.join(ASSETS_PATH, "tiles", f"{cache_key}.png")
    if os.path.exists(tile_path):
        img = pygame.image.load(tile_path)
        tile_cache[cache_key] = pygame.transform.scale(img, (TILE_SIZE, TILE_SIZE))
    else:
        # If alt version doesn't exist, fall back to the original key
        if cache_key != tile_key:
            # Update the mapping to use the original key
            get_tile_surface.random_mapping[tile_key] = tile_key
            return get_tile_surface(tile_key)
        # Fallback: Gray square
        surf = pygame.Surface((TILE_SIZE, TILE_SIZE))
        _ = surf.fill((128, 128, 128))
        tile_cache[cache_key] = surf
    
    return tile_cache[cache_key]


def get_npc_sprite_surface(sprite_key: str) -> Surface:
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


def get_monster_sprite_surface(name: str) -> Surface:
    """Get pre-scaled monster sprite from cache."""
    key = name.lower().replace(".png", "")
    if key not in monster_sprites_cache:
        sprite_path = os.path.join(ASSETS_PATH, "monster", f"{key}.png")
        if os.path.exists(sprite_path):
            img = pygame.image.load(sprite_path)
            monster_sprites_cache[key] = pygame.transform.scale(img, (64, 64))
        else:
            # Fallback: Green square
            surf = pygame.Surface((64, 64))
            _ = surf.fill((0, 255, 0))
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


def get_battle_background(route_name: str) -> Surface:
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
            _ = surf.fill((135, 206, 235))  # Sky blue
            background_cache[bg_key] = surf
    return background_cache[bg_key]


def render_start_menu(screen: Surface):
    """Render the start menu."""
    bg = get_menu_background()
    if bg:
        _ = screen.blit(bg, (0, 0))

    # Global header
    draw_header(screen, "Nexus Capture", "A Pokemon-inspired Adventure")

    # Buttons centered
    panel_w, panel_h = 360, 180
    panel_x = (SCREEN_WIDTH - panel_w) // 2
    panel_y = 230
    draw_panel(screen, panel_x, panel_y, panel_w, panel_h)

    btn_w, btn_h = 300, 48
    btn_x = panel_x + (panel_w - btn_w) // 2
    draw_button_with_icon(screen, "New Game", "play", btn_x, panel_y + 25, btn_w, btn_h)
    draw_button_with_icon(
        screen,
        "Load Game",
        "save",
        btn_x,
        panel_y + 25 + btn_h + 20,
        btn_w,
        btn_h,
        secondary=True,
    )

    # Footer hints
    draw_footer(screen, ["ENTER: Select", "ESC: Quit"])


def render_name_gender(screen: Surface, name_input: str, selected_gender: Gender):
    """Render name input and gender selection."""
    bg = get_menu_background()
    if bg:
        _ = screen.blit(bg, (0, 0))

    draw_header(screen, "Welcome Trainer!", "Set your name and gender")

    panel_w, panel_h = 500, 260
    panel_x = (SCREEN_WIDTH - panel_w) // 2
    panel_y = 180
    draw_panel(screen, panel_x, panel_y, panel_w, panel_h)

    _ = draw_text(
        screen, "Enter your name:", panel_x + 24, panel_y + 24, 22, TEXT_PRIMARY
    )
    # Name display box (readonly look; real input handled via events)
    name_box_y = panel_y + 55
    draw_panel(
        screen, panel_x + 20, name_box_y, panel_w - 40, 46, radius=6, shadow=False
    )
    _ = draw_text(
        screen,
        name_input or "Type here...",
        panel_x + 30,
        name_box_y + 12,
        22,
        TEXT_SECONDARY if not name_input else TEXT_PRIMARY,
    )

    _ = draw_text(
        screen, "Select your gender:", panel_x + 24, name_box_y + 70, 20, TEXT_PRIMARY
    )
    btn_w, btn_h = 180, 46
    gap = 24
    btn_x = panel_x + 24
    btn_y = name_box_y + 100
    draw_button_with_icon(
        screen,
        "Male",
        "male",
        btn_x,
        btn_y,
        btn_w,
        btn_h,
        selected=(selected_gender == Gender.MALE),
    )
    draw_button_with_icon(
        screen,
        "Female",
        "female",
        btn_x + btn_w + gap,
        btn_y,
        btn_w,
        btn_h,
        selected=(selected_gender == Gender.FEMALE),
    )

    draw_footer(screen, ["Type name on keyboard", "ENTER: Continue"])


def render_starter_select(
    screen: Surface, starters: list[Creature], selected_starter: int
):
    """Render starter Pokémon selection."""
    bg = get_menu_background()
    if bg:
        _ = screen.blit(bg, (0, 0))

    draw_header(screen, "Choose your starter")

    # Card layout centered
    card_w, card_h = 180, 220
    total_w = len(starters) * card_w + (len(starters) - 1) * 30
    start_x = (SCREEN_WIDTH - total_w) // 2
    y = 180

    for i, starter in enumerate(starters):
        x = start_x + i * (card_w + 30)
        draw_panel(screen, x, y, card_w, card_h, radius=10)
        sprite = get_monster_sprite_surface(starter.name)
        _ = screen.blit(sprite, (x + (card_w - 64) // 2, y + 20))
        _ = draw_text(
            screen, starter.name, x + card_w // 2, y + 110, 20, BLACK, center=True
        )
        is_selected = i == selected_starter
        # Select button style outline
        draw_button(
            screen,
            "Select",
            x + 20,
            y + card_h - 60,
            card_w - 40,
            40,
            selected=is_selected,
        )

    draw_footer(screen, ["LEFT/RIGHT: Navigate", "ENTER: Select"])


def render_overworld(
    screen: Surface,
    current_route: Route,
    player: Player,
    fps: float | int = 0,
    debug_mode: bool = True,
):
    """Render the overworld map and player."""

    # Get map data
    tile_map = current_route.tiles.map
    if not tile_map:
        # UI overlay even if no map
        if debug_mode:
            _ = draw_text(screen, f"{player.name} - {current_route.name}", 10, 10)
            _ = draw_text(screen, f"Party: {len(player.party)}", 10, 40)
            _ = draw_text(
                screen, "Press E to evolve first party member | D: Toggle Debug", 10, 70
            )
            _ = draw_text(screen, f"FPS: {int(fps)}", SCREEN_WIDTH - 100, 10)
        return
    map_height = len(tile_map)
    map_width = len(tile_map[0]) if map_height > 0 else 0
    legend = current_route.tiles.legend

    # Camera setup to center player
    camera_x = player.location.x - SCREEN_WIDTH // 2
    camera_y = player.location.y - SCREEN_HEIGHT // 2

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

    # Use consistent world-relative positioning for both clamped and normal camera modes
    # Player location is top-left of tile, adjust for sprite positioning
    player_screen_x = (
        (player.location.x + TILE_SIZE // 2) - camera_x - 16
    )  # Center horizontally in tile
    player_screen_y = (
        player.location.y + TILE_SIZE - camera_y - 64
    )  # Bottom of tile minus sprite height

    # Check clamps for screen bounds clamping (only needed when camera is at map edge)
    is_left_clamped = original_camera_x == 0
    is_right_clamped = original_camera_x == (map_width_px - SCREEN_WIDTH)
    is_top_clamped = original_camera_y == 0
    is_bottom_clamped = original_camera_y == (map_height_px - SCREEN_HEIGHT)

    if is_left_clamped or is_right_clamped or is_top_clamped or is_bottom_clamped:
        # Clamp to screen bounds (prevent going off-screen when camera is at map edge)
        player_screen_x = max(16, min(player_screen_x, SCREEN_WIDTH - 32))
        player_screen_y = max(
            0, min(player_screen_y, SCREEN_HEIGHT - 48)
        )  # Allow sprite top to reach screen top

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
                _ = screen.blit(tile_img, (screen_x, screen_y))

    # Render object tiles that don't match player's feet position (below player)
    objects = current_route.objects if current_route.objects else []
    player_tx = int(player.location.x // TILE_SIZE)  # Player's feet tile position
    player_ty = int(player.location.y // TILE_SIZE)  # Player's feet tile position

    for obj in objects:
        obj_type = obj.type
        if not obj_type:
            continue
        tx = obj.tx
        ty = obj.ty
        w = obj.w
        h = obj.h
        obj_key = obj_type.replace("_", "-")
        obj_img = get_tile_surface(obj_key)

        # If object requests stretching, render a single scaled image covering its tile area.
        if getattr(obj, "stretch", False):
            rect_left = tx
            rect_top = ty
            rect_w_px = w * TILE_SIZE
            rect_h_px = h * TILE_SIZE
            # Only render in this "below" pass if player's feet tile is NOT inside the object rect.
            player_inside = (
                rect_left <= player_tx < rect_left + w
                and rect_top <= player_ty < rect_top + h
            )
            if not player_inside:
                screen_x = rect_left * TILE_SIZE - camera_x
                screen_y = rect_top * TILE_SIZE - camera_y
                # Only blit if on screen (using rect size for bounds)
                if (
                    -rect_w_px <= screen_x <= SCREEN_WIDTH
                    and -rect_h_px <= screen_y <= SCREEN_HEIGHT
                ):
                    scaled = pygame.transform.scale(obj_img, (rect_w_px, rect_h_px))
                    _ = screen.blit(scaled, (screen_x, screen_y))
            # If player is inside, skip here and let the "above player" pass render it.
            continue

        # Default behavior: render per-tile
        for dx in range(w):
            for dy in range(h):
                obj_tx = tx + dx
                obj_ty = ty + dy
                # Only render this tile if it doesn't match player's feet position
                if not (obj_tx == player_tx and obj_ty == player_ty):
                    screen_x = obj_tx * TILE_SIZE - camera_x
                    screen_y = obj_ty * TILE_SIZE - camera_y
                    if (
                        -TILE_SIZE <= screen_x <= SCREEN_WIDTH
                        and -TILE_SIZE <= screen_y <= SCREEN_HEIGHT
                    ):
                        _ = screen.blit(obj_img, (screen_x, screen_y))

    # Render NPCs (all, but few; could optimize to visible only if many)
    npcs = current_route.npcs if current_route.npcs else []
    for npc in npcs:
        position = npc.position
        tx = position.tx
        ty = position.ty
        npc_x = tx * TILE_SIZE + TILE_SIZE // 2
        npc_y = ty * TILE_SIZE + TILE_SIZE // 2
        sprite_key = npc.sprite
        if sprite_key:
            npc_sprite = get_npc_sprite_surface(sprite_key)  # Cached
            npc_screen_x = npc_x - camera_x
            npc_screen_y = npc_y - camera_y
            # Only blit if on screen
            if (
                -64 <= npc_screen_x <= SCREEN_WIDTH
                and -64 <= npc_screen_y <= SCREEN_HEIGHT
            ):
                _ = screen.blit(
                    npc_sprite, (npc_screen_x - 16, npc_screen_y - 24)
                )  # Center

    # Render player
    if player.sprite:
        _ = screen.blit(player.sprite, (player_screen_x, player_screen_y))

    # Render object tiles that match player's feet position (above player)
    for obj in objects:
        obj_type = obj.type
        if not obj_type:
            continue
        tx = obj.tx
        ty = obj.ty
        w = obj.w
        h = obj.h
        obj_key = obj_type.replace("_", "-")
        obj_img = get_tile_surface(obj_key)

        # If stretched, render here only if player's feet are inside the object's rect
        if getattr(obj, "stretch", False):
            rect_left = tx
            rect_top = ty
            rect_w_px = w * TILE_SIZE
            rect_h_px = h * TILE_SIZE
            player_inside = (
                rect_left <= player_tx < rect_left + w
                and rect_top <= player_ty < rect_top + h
            )
            if player_inside:
                screen_x = rect_left * TILE_SIZE - camera_x
                screen_y = rect_top * TILE_SIZE - camera_y
                if (
                    -rect_w_px <= screen_x <= SCREEN_WIDTH
                    and -rect_h_px <= screen_y <= SCREEN_HEIGHT
                ):
                    scaled = pygame.transform.scale(obj_img, (rect_w_px, rect_h_px))
                    _ = screen.blit(scaled, (screen_x, screen_y))
            # otherwise nothing to do here for this stretched object
            continue

        # Default per-tile above-player rendering
        for dx in range(w):
            for dy in range(h):
                obj_tx = tx + dx
                obj_ty = ty + dy
                # Only render this tile if it matches player's feet position
                if obj_tx == player_tx and obj_ty == player_ty:
                    screen_x = obj_tx * TILE_SIZE - camera_x
                    screen_y = obj_ty * TILE_SIZE - camera_y
                    if (
                        -TILE_SIZE <= screen_x <= SCREEN_WIDTH
                        and -TILE_SIZE <= screen_y <= SCREEN_HEIGHT
                    ):
                        _ = screen.blit(obj_img, (screen_x, screen_y))

    # Render wild spawns as small indicators in tall grass
    for spawn in player.wild_spawns:
        tx = spawn.tx
        ty = spawn.ty
        creature_name = spawn.creature.creature.name
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
            _ = screen.blit(small_sprite, (screen_x - 8, screen_y - 8))

    # DebugFPS top-right (only show if debug mode is enabled)
    if debug_mode:
        # Main HUD panel
        hud_w, hud_h = 260, 80
        hud_x, hud_y = 12, 12
        draw_panel(screen, hud_x, hud_y, hud_w, hud_h, radius=10)
        _ = draw_text(
            screen, f"Trainer: {player.name}", hud_x + 12, hud_y + 10, 18, BLACK
        )
        _ = draw_text(
            screen,
            f"Route: {current_route.name}",
            hud_x + 12,
            hud_y + 32,
            16,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            f"Party: {len(player.party)}",
            hud_x + 12,
            hud_y + 52,
            16,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            "Press E: Evolve | D: Toggle Debug",
            hud_x + 12,
            hud_y + 72,
            14,
            TEXT_SECONDARY,
        )

        # FPS panel top-right
        draw_panel(screen, SCREEN_WIDTH - 90, 12, 78, 32, radius=8)
        _ = draw_text(
            screen, f"{int(fps)} FPS", SCREEN_WIDTH - 51, 28, 14, BLACK, center=True
        )

        # Debug coordinates panel
        debug_w, debug_h = 200, 120
        debug_x, debug_y = SCREEN_WIDTH - debug_w - 12, 55
        draw_panel(screen, debug_x, debug_y, debug_w, debug_h, radius=8)

        # Calculate tile coordinates
        player_tx = int(player.location.x // TILE_SIZE)
        player_ty = int(player.location.y // TILE_SIZE)

        _ = draw_text(screen, "DEBUG INFO", debug_x + 12, debug_y + 8, 14, BLACK)
        _ = draw_text(
            screen,
            f"World: ({player.location.x:.0f}, {player.location.y:.0f})",
            debug_x + 12,
            debug_y + 28,
            12,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            f"Tile: ({player_tx}, {player_ty})",
            debug_x + 12,
            debug_y + 44,
            12,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            f"Camera: ({camera_x:.0f}, {camera_y:.0f})",
            debug_x + 12,
            debug_y + 60,
            12,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            f"Route: {current_route.key}",
            debug_x + 12,
            debug_y + 76,
            12,
            TEXT_SECONDARY,
        )
        _ = draw_text(
            screen,
            f"Wild Spawns: {len(player.wild_spawns)}",
            debug_x + 12,
            debug_y + 92,
            12,
            TEXT_SECONDARY,
        )


def render_battle(screen: Surface, battle_state: BattleState, player: Player) -> None:
    """Render the battle scene with comprehensive battle system."""
    from src.battle_state import BattlePhase

    # Render battle background
    bg = get_battle_background("test")
    if bg:
        _ = screen.blit(bg, (0, 0))

    if battle_state.phase == BattlePhase.SHOWING_RESULTS:
        current_result = battle_state.get_current_result()
        if current_result:
            current_result.commit_damage()

    # Render both Pokemon
    _render_pokemon_sprites(screen, battle_state)

    # Render based on current phase
    if battle_state.phase == BattlePhase.MAIN_MENU:
        _render_main_battle_menu(screen, battle_state)

    elif battle_state.phase == BattlePhase.MOVE_SELECT:
        _render_move_selection(screen, battle_state)

    elif battle_state.phase == BattlePhase.BAG_MENU:
        _render_bag_menu(screen, battle_state, player)

    elif (
        battle_state.phase == BattlePhase.PARTY_SELECT
        or battle_state.phase == BattlePhase.SWITCH_REQUIRED
    ):
        _render_party_selection(screen, battle_state, player)

    elif battle_state.phase == BattlePhase.SHOWING_RESULTS:
        _render_battle_results(screen, battle_state)

    elif battle_state.phase == BattlePhase.VICTORY:
        _render_victory_screen(screen, battle_state)

    elif battle_state.phase == BattlePhase.DEFEAT:
        _render_defeat_screen(screen, battle_state)


def _render_pokemon_sprites(screen: Surface, battle_state: BattleState):
    """Render both Pokemon sprites and HP bars."""
    # Wild Pokemon (opponent)
    wild_pokemon = battle_state.wild_pokemon
    wild_sprite_key = wild_pokemon.creature.sprite or wild_pokemon.creature.name
    wild_sprite = get_monster_sprite_surface(wild_sprite_key)
    _ = screen.blit(wild_sprite, (SCREEN_WIDTH - 150, SCREEN_HEIGHT // 2 - 100))
    _ = draw_text(
        screen,
        f"{wild_pokemon.creature.name} Lv.{wild_pokemon.level}",
        SCREEN_WIDTH - 150,
        SCREEN_HEIGHT // 2 - 120,
        18,
        BLACK,
    )

    # HP bar for wild
    wild_hp = wild_pokemon.hp
    wild_damage = wild_pokemon.damage
    current_hp = max(0, wild_hp - wild_damage)
    bar_width = 120
    bar_height = 12
    hp_ratio = current_hp / wild_hp if wild_hp > 0 else 0
    hp_color = (
        HP_GREEN if hp_ratio >= 0.5 else (HP_YELLOW if hp_ratio >= 0.2 else HP_RED)
    )
    _ = pygame.draw.rect(
        screen,
        (220, 53, 69),
        (SCREEN_WIDTH - 180, SCREEN_HEIGHT // 2 - 10, bar_width, bar_height),
        border_radius=6,
    )
    _ = pygame.draw.rect(
        screen,
        hp_color,
        (
            SCREEN_WIDTH - 180,
            SCREEN_HEIGHT // 2 - 10,
            int(bar_width * hp_ratio),
            bar_height,
        ),
        border_radius=6,
    )
    _ = draw_text(
        screen,
        f"HP: {current_hp}/{wild_hp}",
        SCREEN_WIDTH - 150,
        SCREEN_HEIGHT // 2 + 5,
        14,
        BLACK,
    )

    # Player Pokemon
    player_pokemon = battle_state.player_pokemon
    player_sprite_key = player_pokemon.creature.sprite or player_pokemon.creature.name
    player_sprite = get_monster_sprite_surface(player_sprite_key)
    player_sprite = pygame.transform.flip(player_sprite, True, False)
    _ = screen.blit(player_sprite, (100, SCREEN_HEIGHT // 2 - 100))
    _ = draw_text(
        screen,
        f"{player_pokemon.creature.name} Lv.{player_pokemon.level}",
        100,
        SCREEN_HEIGHT // 2 - 120,
        18,
        BLACK,
    )

    # HP bar for player
    player_hp = player_pokemon.hp
    player_damage = player_pokemon.damage
    current_hp = max(0, player_hp - player_damage)
    hp_ratio = current_hp / player_hp if player_hp > 0 else 0
    hp_color = (
        HP_GREEN if hp_ratio >= 0.5 else (HP_YELLOW if hp_ratio >= 0.2 else HP_RED)
    )
    _ = pygame.draw.rect(
        screen,
        (220, 53, 69),
        (80, SCREEN_HEIGHT // 2 - 10, bar_width, bar_height),
        border_radius=6,
    )
    _ = pygame.draw.rect(
        screen,
        hp_color,
        (80, SCREEN_HEIGHT // 2 - 10, int(bar_width * hp_ratio), bar_height),
        border_radius=6,
    )
    _ = draw_text(
        screen,
        f"HP: {current_hp}/{player_hp}",
        100,
        SCREEN_HEIGHT // 2 + 5,
        14,
        BLACK,
    )


def _render_main_battle_menu(screen: Surface, battle_state: BattleState):
    """Render main battle menu (FIGHT, BAG, Creatures, RUN)."""
    menu_y = SCREEN_HEIGHT - 120
    options = ["FIGHT", "BAG", "Creatures", "RUN"]

    # Menu panel
    draw_panel(screen, 40, menu_y - 20, SCREEN_WIDTH - 80, 120, radius=12)
    for i, option in enumerate(options):
        col = i % 2
        row = i // 2
        x = 60 + col * 220
        y = menu_y + row * 50
        draw_button(
            screen, option, x, y, 180, 40, selected=(i == battle_state.selected_option)
        )


def _render_move_selection(screen: Surface, battle_state: BattleState):
    """Render move selection menu with move details."""
    menu_y = SCREEN_HEIGHT - 180

    # Title
    _ = draw_text(
        screen, "Select a move:", SCREEN_WIDTH // 2 - 60, menu_y - 30, 20, BLACK
    )

    # Filter available moves
    available_moves = [m for m in battle_state.player_pokemon.moves if m.uses > 0]

    if not available_moves:
        _ = draw_text(
            screen,
            "No moves available! (Struggle)",
            SCREEN_WIDTH // 2 - 100,
            menu_y,
            16,
            BLACK,
        )
        return

    # Panel for moves
    draw_panel(screen, 40, menu_y - 30, SCREEN_WIDTH - 80, 190, radius=12)
    # Render moves in a 2x2 grid
    for i, move in enumerate(available_moves[:4]):  # Max 4 moves
        col = i % 2
        row = i // 2
        x = 60 + col * 340
        y = menu_y + row * 70
        # Move panel
        draw_panel(screen, x, y, 320, 60, radius=10, shadow=False)
        if i == battle_state.selected_option:
            # subtle highlight border
            _ = pygame.draw.rect(
                screen, (41, 128, 185), (x, y, 320, 60), width=2, border_radius=10
            )
        # Move name and type
        _ = draw_text(screen, move.name, x + 12, y + 8, 18, BLACK, bold=True)
        _ = draw_text(screen, f"Type: {move.type}", x + 12, y + 34, 14, TEXT_SECONDARY)
        _ = draw_text(
            screen,
            f"Cat: {move.category.capitalize()}",
            x + 12,
            y + 50,
            14,
            TEXT_SECONDARY,
        )
        # Power, Accuracy, PP
        _ = draw_text(screen, f"Pwr: {move.power}", x + 180, y + 8, 14, BLACK)
        _ = draw_text(screen, f"Acc: {move.accuracy}", x + 240, y + 8, 14, BLACK)
        _ = draw_text(
            screen, f"PP: {move.uses}/{move.max_uses}", x + 240, y + 34, 14, BLACK
        )

    # Back hint
    _ = draw_text(
        screen, "Press ESC to go back", 50, SCREEN_HEIGHT - 30, 14, TEXT_SECONDARY
    )


def _render_bag_menu(screen: Surface, battle_state: BattleState, player: Player):
    """Render bag menu for items."""
    menu_y = SCREEN_HEIGHT - 120
    options = ["Poke Ball", "Back"]

    # Panel
    draw_panel(screen, 40, menu_y - 20, SCREEN_WIDTH - 80, 100, radius=12)

    for i, option in enumerate(options):
        x = 60 + i * 220
        y = menu_y
        text = option
        icon = "pokeball" if i == 0 else "back"
        if i == 0:
            item = player.get_item_by_key("poke_ball")
            count = item.quantity if item else 0
            text += f" x{count}"
        draw_button_with_icon(
            screen,
            text,
            icon,
            x,
            y,
            200,
            40,
            selected=(i == battle_state.selected_option),
        )


def _render_party_selection(screen: Surface, battle_state: BattleState, player: Player):
    """Render party selection menu."""
    from src.battle import is_fainted

    # Title
    title = (
        "Choose a Pokemon to switch!"
        if battle_state.force_switch
        else "Choose a Pokemon:"
    )
    _ = draw_text(screen, title, SCREEN_WIDTH // 2 - 120, 50, 20, BLACK)

    # Decide whether to show full party (including fainted) or only available switches.
    # When the battle requires an initial choice (battle_state.initial_choice_required)
    # we show the entire party with indices so the player can pick which to send out.
    show_all = getattr(battle_state, "initial_choice_required", False)

    if show_all:
        # Show every slot in the party (including fainted and empty slots)
        available_party = player.party
    else:
        # Normal party selection: show only non-fainted and not the current active Pokemon
        available_party = [
            p
            for p in player.party
            if not is_fainted(p) and p != battle_state.player_pokemon
        ]

    if not available_party:
        _ = draw_text(
            screen,
            "No available Pokemon to choose.",
            SCREEN_WIDTH // 2 - 100,
            120,
            16,
            BLACK,
        )
        return

    y_offset = 100
    for i, pokemon in enumerate(available_party):
        y = y_offset + i * 60
        color = GREEN if i == battle_state.selected_option else WHITE
        _ = pygame.draw.rect(screen, color, (100, y, 400, 50), border_radius=4)

        # Determine global party index for display (1-based). If pokemon appears multiple times,
        # fallback to the display index.
        try:
            party_index = player.party.index(pokemon)
        except Exception:
            party_index = i

        # Name line with index
        name_label = f"{party_index + 1}. {pokemon.creature.name} Lv.{pokemon.level}"
        # Mark the currently active Pokemon (if any)
        if getattr(
            battle_state, "_player_pokemon", None
        ) is not None and pokemon == getattr(battle_state, "_player_pokemon"):
            name_label += " (active)"
        _ = draw_text(screen, name_label, 120, y + 5, 16, BLACK)

        # HP / fainted line
        if is_fainted(pokemon):
            _ = draw_text(screen, "Fainted", 120, y + 25, 14, RED)
        else:
            current_hp = max(0, pokemon.hp - pokemon.damage)
            _ = draw_text(
                screen, f"HP: {current_hp}/{pokemon.hp}", 120, y + 25, 14, BLACK
            )


def _render_battle_results(screen: Surface, battle_state: BattleState):
    """Render battle results and messages with small hit effect icon."""
    result = battle_state.get_current_result()
    # Simple hit icon near defender
    if result and result.hit and result.damage > 0:
        icon = get_icon_surface("hit", 24)
        target = result.primary_target
        if target == battle_state.wild_pokemon:
            pos = (SCREEN_WIDTH - 120, SCREEN_HEIGHT // 2 - 80)
        elif target == battle_state.player_pokemon:
            pos = (140, SCREEN_HEIGHT // 2 - 80)
        elif result.attacker_name == battle_state.player_pokemon.creature.name:
            pos = (SCREEN_WIDTH - 120, SCREEN_HEIGHT // 2 - 80)
        else:
            pos = (140, SCREEN_HEIGHT // 2 - 80)
        _ = screen.blit(icon, pos)
    if result:
        # Display messages in a text box
        box_y = SCREEN_HEIGHT - 160
        draw_panel(screen, 40, box_y, SCREEN_WIDTH - 80, 130, radius=12)
        # Show messages from current result
        y_offset = box_y + 16
        for msg in result.messages:
            _ = draw_text(screen, msg, 60, y_offset, 18, BLACK)
            y_offset += 26
        # Hint
        _ = draw_text(
            screen, "Press ENTER to continue...", 60, box_y + 100, 14, TEXT_SECONDARY
        )


def _render_victory_screen(screen: Surface, battle_state: BattleState):
    """Render victory screen."""
    _ = draw_text(
        screen,
        "Victory!",
        SCREEN_WIDTH // 2,
        SCREEN_HEIGHT // 2 - 120,
        36,
        GREEN,
        bold=True,
        center=True,
    )

    result = battle_state.get_current_result()
    if result:
        y_offset = SCREEN_HEIGHT // 2 - 70
        for msg in result.messages:
            _ = draw_text(
                screen, msg, SCREEN_WIDTH // 2, y_offset, 20, BLACK, center=True
            )
            y_offset += 28

    _ = draw_text(
        screen,
        "Press ENTER to continue",
        SCREEN_WIDTH // 2,
        SCREEN_HEIGHT - 100,
        16,
        TEXT_SECONDARY,
        center=True,
    )


def _render_defeat_screen(screen: Surface, battle_state: BattleState):
    """Render defeat screen."""
    _ = draw_text(
        screen,
        "You were defeated...",
        SCREEN_WIDTH // 2,
        SCREEN_HEIGHT // 2 - 60,
        28,
        RED,
        bold=True,
        center=True,
    )
    _ = draw_text(
        screen,
        "Returning to Pokemon Center...",
        SCREEN_WIDTH // 2,
        SCREEN_HEIGHT // 2 - 20,
        18,
        TEXT_SECONDARY,
        center=True,
    )
    _ = draw_text(
        screen,
        "Press ENTER to continue",
        SCREEN_WIDTH // 2,
        SCREEN_HEIGHT - 100,
        16,
        TEXT_SECONDARY,
        center=True,
    )


def render_party(
    screen: pygame.Surface, player: Player, selected_index: int, reorder_mode: bool
):
    panel_x = SCREEN_WIDTH - 320
    panel_y = 100
    panel_w = 300
    panel_h = 400
    draw_panel(screen, panel_x, panel_y, panel_w, panel_h)
    draw_text(screen, "Party", panel_x + 10, panel_y + 10, 20, BLACK, bold=True)
    y_start = panel_y + 50
    for i in range(6):
        y = y_start + i * 70
        if i < len(player.party):
            pkm = player.party[i]
            if i == selected_index:
                pygame.draw.rect(
                    screen,
                    (200, 200, 255),
                    (panel_x + 5, y - 5, panel_w - 10, 60),
                    border_radius=4,
                )
            draw_text(
                screen,
                f"{pkm.creature.name} Lv.{pkm.level}",
                panel_x + 10,
                y,
                16,
                BLACK,
            )
            current_hp = max(0, pkm.hp - pkm.damage)
            draw_text(
                screen, f"HP: {current_hp}/{pkm.hp}", panel_x + 10, y + 20, 14, BLACK
            )
        else:
            draw_text(screen, "Empty", panel_x + 10, y, 16, BLACK)
    if reorder_mode:
        draw_text(
            screen,
            "Reorder mode - Use ↑↓ to move, Space to finish",
            panel_x + 10,
            panel_y + panel_h - 30,
            12,
            BLACK,
        )


def render_pokemon_stats(screen: pygame.Surface, player: Player, index: int):
    if index >= len(player.party):
        return
    pkm = player.party[index]
    panel_x = 200
    panel_y = 50
    panel_w = SCREEN_WIDTH - 400
    panel_h = SCREEN_HEIGHT - 100
    draw_panel(screen, panel_x, panel_y, panel_w, panel_h)
    # Sprite
    sprite = get_monster_sprite_surface(pkm.creature.name)
    scaled_sprite = pygame.transform.scale(sprite, (96, 96))
    screen.blit(scaled_sprite, (panel_x + 20, panel_y + 20))
    # Name
    draw_text(
        screen, pkm.creature.name, panel_x + 120, panel_y + 30, 24, BLACK, bold=True
    )
    if pkm.shiny:
        draw_text(
            screen, "Shiny!", panel_x + 120, panel_y + 60, 16, (255, 215, 0), bold=True
        )
    # Types
    types_text = ", ".join(pkm.creature.typing)
    draw_text(screen, f"Types: {types_text}", panel_x + 120, panel_y + 80, 16, BLACK)
    # Stats
    y = panel_y + 120
    draw_text(screen, "Stats:", panel_x + 20, y, 18, BLACK, bold=True)
    y += 30
    draw_text(screen, f"HP: {pkm.hp}", panel_x + 20, y, 16, BLACK)
    y += 25
    draw_text(screen, f"Attack: {pkm.attack}", panel_x + 20, y, 16, BLACK)
    y += 25
    draw_text(screen, f"Defense: {pkm.defence}", panel_x + 20, y, 16, BLACK)
    y += 25
    draw_text(screen, f"Sp. Atk: {pkm.special_attack}", panel_x + 20, y, 16, BLACK)
    y += 25
    draw_text(screen, f"Sp. Def: {pkm.special_defence}", panel_x + 20, y, 16, BLACK)
    y += 25
    draw_text(screen, f"Speed: {pkm.speed}", panel_x + 20, y, 16, BLACK)
    # Moves
    y += 30
    draw_text(screen, "Moves:", panel_x + 20, y, 18, BLACK, bold=True)
    y += 30
    for move in pkm.moves:
        draw_text(screen, move.name, panel_x + 20, y, 16, BLACK)
        y += 20
        draw_text(
            screen,
            f"Type: {move.type}, Cat: {move.category.capitalize()}",
            panel_x + 20,
            y,
            14,
            BLACK,
        )
        y += 30
        if y > panel_y + panel_h - 50:
            break
