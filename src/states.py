import pygame
from .data_loader import starters, routes_data
from .player import Player
from .save_system import save_game, load_game
from .config import TILE_SIZE, AUTOSAVE_INTERVAL


def handle_start_menu_events(event, player, current_route, routes_data):
    """Handle events for start menu (mouse clicks)."""
    name_input = ""
    selected_gender = None
    selected_starter = 0
    new_state = "start_menu"

    if event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        # New Game
        if 300 <= mouse_pos[0] <= 500 and 250 <= mouse_pos[1] <= 300:
            new_state = "name_gender"
            selected_gender = "male"  # Default
        # Load Game
        elif 300 <= mouse_pos[0] <= 500 and 320 <= mouse_pos[1] <= 370:
            loaded_player, loaded_route = load_game()
            if loaded_player:
                player = loaded_player
                current_route = routes_data.get("routes", {}).get(
                    loaded_route, current_route
                )
                new_state = "overworld"
                print("Loaded save.")
            else:
                print("No save found.")

    return (
        new_state,
        player,
        current_route,
        name_input,
        selected_gender,
        selected_starter,
    )


def handle_name_gender_events(event, name_input, selected_gender, player):
    """Handle events for name/gender input (keyboard + mouse)."""
    new_state = "name_gender"

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_RETURN:
            if name_input and selected_gender:
                player = Player(name_input, selected_gender)
                new_state = "starter_select"
                name_input = ""  # Reset
        elif event.key == pygame.K_BACKSPACE:
            name_input = name_input[:-1]
        elif len(name_input) < 10:
            name_input += event.unicode
    elif event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        if 200 <= mouse_pos[0] <= 300 and 400 <= mouse_pos[1] <= 450:
            selected_gender = "male"
        elif 350 <= mouse_pos[0] <= 450 and 400 <= mouse_pos[1] <= 450:
            selected_gender = "female"

    return new_state, name_input, selected_gender, player


def handle_starter_select_events(
    event, selected_starter, player, current_route, starters
):
    """Handle events for starter selection (keyboard)."""
    new_state = "starter_select"

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_LEFT:
            selected_starter = (selected_starter - 1) % len(starters)
        elif event.key == pygame.K_RIGHT:
            selected_starter = (selected_starter + 1) % len(starters)
        elif event.key == pygame.K_RETURN:
            starter_name = starters[selected_starter]["name"]
            player.add_starter({"name": starter_name})
            # Set starting position
            spawn = current_route.get("spawn", {}).get("default", {"tx": 0, "ty": 0})
            player.grid_x = spawn["tx"]
            player.grid_y = spawn["ty"]
            player.x = player.grid_x * TILE_SIZE + TILE_SIZE // 2
            player.y = player.grid_y * TILE_SIZE + TILE_SIZE // 2
            new_state = "overworld"
            save_game(player, "Willowfen Village")  # Initial save

    return new_state, selected_starter, player, current_route


def handle_overworld_events(event, player, current_route, routes_data):
    """Handle events for overworld (e.g., future: interactions)."""
    # Stub: Expand for exits, NPCs, etc.
    return player, current_route


def update_overworld(player, current_route, dt, current_time, last_autosave):
    """Update overworld logic (movement, autosave)."""
    keys = pygame.key.get_pressed()
    dx, dy = 0, 0
    if keys[pygame.K_LEFT]:
        dx = -player.speed * dt
        player.facing = "left"
    if keys[pygame.K_RIGHT]:
        dx = player.speed * dt
        player.facing = "right"
    if keys[pygame.K_UP]:
        dy = -player.speed * dt
        player.facing = "up"
    if keys[pygame.K_DOWN]:
        dy = player.speed * dt
        player.facing = "down"
    if dx or dy:
        player.move(dx, dy, current_route)
        if hasattr(player, "shake") and player.shake:
            player.shake_active = True
            player.shake_timer = 0.2
            player.shake = False
        player.update_sprite()

        # Check for exits
        exits = current_route.get("exits", [])
        for exit_def in exits:
            area = exit_def.get("area", {})
            if area.get("tx", 0) <= player.grid_x < area.get("tx", 0) + area.get(
                "w", 1
            ) and area.get("ty", 0) <= player.grid_y < area.get("ty", 0) + area.get(
                "h", 1
            ):
                destination = exit_def.get("destination")
                spawn_point = exit_def.get("spawnPoint")
                if destination in routes_data["routes"]:
                    new_route = routes_data["routes"][destination]
                    spawn_dict = new_route.get("spawn", {})
                    if spawn_point in spawn_dict:
                        spawn = spawn_dict[spawn_point]
                    else:
                        spawn = spawn_dict.get("default", {"tx": 0, "ty": 0})
                    player.grid_x = spawn["tx"]
                    player.grid_y = spawn["ty"]
                    player.x = player.grid_x * TILE_SIZE + TILE_SIZE // 2
                    player.y = player.grid_y * TILE_SIZE + TILE_SIZE // 2
                    current_route = new_route
                    save_game(player, current_route.get("name", "Unknown"))
                    break

    # Shake decay (every frame)
    if hasattr(player, "shake_active") and player.shake_active:
        player.shake_timer -= dt
        if player.shake_timer <= 0:
            player.shake_active = False

    # Autosave
    if current_time - last_autosave > AUTOSAVE_INTERVAL:
        save_game(player, current_route.get("name", "Unknown"))
        player.last_autosave = current_time

    return player, current_route
