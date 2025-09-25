from typing_extensions import Any
import pygame
import random

from pygame.event import Event

from src.models import (
    Creature,
    Gender,
    Move,
    PartyCreature,
    Player,
    Route,
    RoutesData,
    States,
    WildSpawn,
)
from .data_loader import (
    calculate_stats_based_on_level,
    starters,
    routes_data,
    find_creature,
)
from .save_system import save_game, load_game
from .config import TILE_SIZE, AUTOSAVE_INTERVAL


def handle_start_menu_events(
    event: Event, player: Player, current_route: Route
) -> tuple[States, Player, Route]:
    """Handle events for start menu (mouse clicks)."""
    new_state = States.START_MENU

    if event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        # New Game
        if 300 <= mouse_pos[0] <= 500 and 250 <= mouse_pos[1] <= 300:
            new_state = States.NAME_GENDER
        # Load Game
        # elif 300 <= mouse_pos[0] <= 500 and 320 <= mouse_pos[1] <= 370:
        #     loaded_player, loaded_route = load_game()
        #     if loaded_player:
        #         player = loaded_player
        #         current_route = routes_data.get("routes", {}).get(
        #             loaded_route, current_route
        #         )
        #         new_state = "overworld"
        #         print("Loaded save.")
        #     else:
        #         print("No save found.")

    return (
        new_state,
        player,
        current_route,
    )


def handle_name_gender_events(event: Event, player: Player) -> tuple[States, Player]:
    """Handle events for name/gender input (keyboard + mouse)."""
    new_state = States.NAME_GENDER

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_RETURN:
            if player.gender and player.name != "Unknown":
                new_state = States.STARTER_SELECT
        elif event.key == pygame.K_BACKSPACE:
            player.name = player.name[:-1]
        elif len(player.name) < 10:
            player.name += event.unicode
    elif event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        if 200 <= mouse_pos[0] <= 300 and 400 <= mouse_pos[1] <= 450:
            player.gender = Gender.MALE
        elif 350 <= mouse_pos[0] <= 450 and 400 <= mouse_pos[1] <= 450:
            player.gender = Gender.FEMALE

    return new_state, player


def handle_starter_select_events(
    event: Event, player: Player, starters: list[Creature]
) -> tuple[States, Player]:
    """Handle events for starter selection (keyboard)."""
    new_state = States.STARTER_SELECT
    selected_starter = 0

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_LEFT:
            selected_starter = (selected_starter - 1) % len(starters)
        elif event.key == pygame.K_RIGHT:
            selected_starter = (selected_starter + 1) % len(starters)
        elif event.key == pygame.K_RETURN:
            starter = starters[selected_starter]
            hp, attack, defence, special_attack, special_defence, speed = (
                calculate_stats_based_on_level(starter, level=5)
            )
            player.capture_creature(
                PartyCreature(
                    creature=starter,
                    level=5,
                    moves=[],
                    hp=hp,
                    max_hp=hp,
                    attack=attack,
                    defence=defence,
                    special_attack=special_attack,
                    special_defence=special_defence,
                    speed=speed,
                )
            )
            # Set starting position
            new_state = States.OVERWORLD

    return new_state, player


def handle_overworld_events(event: Event, player: Player) -> Player:
    """Handle events for overworld (e.g., future: interactions)."""
    # Stub: Expand for exits, NPCs, etc.
    return player


def update_overworld(
    player: Player,
    current_route: Route,
    dt: float,
    current_time: int,
    last_autosave: int,
) -> tuple[Player, Route, Any]:
    """Update overworld logic (movement, autosave)."""
    # Manage wild spawns

    tall_grass_objects = (
        [obj for obj in current_route.objects if obj.type == "tall_grass"]
        if current_route.objects
        else []
    )
    # Clean expired
    player.wild_spawns = [
        spawn
        for spawn in player.wild_spawns
        if current_time - spawn.spawn_time < spawn.duration
    ]
    # Spawn new if needed
    num_active = len(player.wild_spawns)
    if (
        num_active == 0 or (num_active < 4 and random.random() < 0.01)
    ) and tall_grass_objects:
        possible_positions = set()
        for obj in tall_grass_objects:
            tx_start = obj.tx
            ty_start = obj.ty
            w = obj.w
            h = obj.h
            for i in range(w):
                for j in range(h):
                    possible_positions.add((tx_start + i, ty_start + j))
        occupied = {(spawn.tx, spawn.ty) for spawn in player.wild_spawns}
        available: list[list[int]] = [
            pos for pos in possible_positions if pos not in occupied
        ]
        creatures_list = (
            current_route.creatures.get("grass", {}) if current_route.creatures else []
        )
        if creatures_list and available:
            pos = random.choice(available)
            creature_def = random.choice(creatures_list)
            level_range = creature_def.get("level", [1, 5])
            level = random.randint(level_range[0], level_range[1])
            creature = find_creature(creature_def["name"])

            hp, attack, defence, special_attack, special_defence, speed = (
                calculate_stats_based_on_level(creature, level=level)
            )
            wild_creature = PartyCreature(
                creature=creature,
                level=level,
                moves=[],
                hp=hp,
                max_hp=hp,
                attack=attack,
                defence=defence,
                special_attack=special_attack,
                special_defence=special_defence,
                speed=speed,
            )
            duration = random.randint(4, 20) * 1000  # ms
            player.wild_spawns.append(
                WildSpawn(
                    tx=pos[0],
                    ty=pos[1],
                    creature=wild_creature,
                    spawn_time=current_time,
                    duration=duration,
                )
            )

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

        # Check for exits
        exits = current_route.exits
        for exit_def in exits:
            area = exit_def.area
            if (
                area.tx <= player.grid_x < area.tx + area.w
                and area.ty <= player.grid_y < area.ty + area.h
            ):
                destination = exit_def.destination
                spawn_point = exit_def.spawnPoint
                new_route = routes_data.get_route_by_key(destination)
                spawn_dict = new_route.spawn
                if spawn_point in spawn_dict:
                    spawn = spawn_dict[spawn_point]
                else:
                    spawn = spawn_dict.get("default", {"tx": 0, "ty": 0})
                player.grid_x = spawn.tx
                player.grid_y = spawn.ty
                player.x = player.location.x * TILE_SIZE + TILE_SIZE // 2
                player.y = player.location.y * TILE_SIZE + TILE_SIZE // 2
                current_route = new_route
                # save_game(player, current_route.get("name", "Unknown"))
                break

    # Check for encounter if moved
    encountered = None
    if dx or dy:
        for spawn in player.wild_spawns[:]:
            if spawn.tx == player.location.x and spawn.ty == player.location.y:
                encountered = {
                    "creature": spawn.creature,
                    "battle_bg": "grass",
                }
                player.wild_spawns.remove(spawn)
                break

    # Shake decay (every frame)
    if hasattr(player, "shake_active") and player.shake_active:
        player.shake_timer -= dt
        if player.shake_timer <= 0:
            player.shake_active = False

    # Autosave
    if current_time - last_autosave > AUTOSAVE_INTERVAL:
        save_game(player, current_route.name)
        player.last_autosave = current_time

    return player, current_route, encountered


def handle_battle_events(
    event: Event,
    wild_pokemon: PartyCreature | None,
    player: Player,
    selected_option: int = 0,
) -> tuple[States, PartyCreature | None, Player, int]:
    """Handle events for battle scene (navigate options, select actions)."""
    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_ESCAPE:
            return States.OVERWORLD, None, player, 0
        elif event.key == pygame.K_UP:
            selected_option = max(0, selected_option - 1)
        elif event.key == pygame.K_DOWN:
            selected_option = min(3, selected_option + 1)
        elif event.key == pygame.K_RETURN:
            if selected_option == 3:  # RUN
                return States.OVERWORLD, None, player, 0
            else:
                options = ["FIGHT", "BAG", "POKÉMON"]
                print(
                    f"Selected {options[selected_option]} (stub - implement battle actions)"
                )
                selected_option = 0  # Reset to first option after selection
    return States.BATTLE, wild_pokemon, player, selected_option
