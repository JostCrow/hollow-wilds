import pygame
import random

from pygame.event import Event

from src.battle_state import BattleState
from src.models import (
    CreatureEncounter,
    Gender,
    ItemType,
    Items,
    PartyCreature,
    Player,
    Position,
    Route,
    States,
    WildSpawn,
)
from .data_loader import (
    calculate_stats_based_on_level,
    starters,
    routes_data,
    find_creature,
    generate_moves,
)
from .save_system import save_game, load_game
from .config import TILE_SIZE, AUTOSAVE_INTERVAL, SCREEN_WIDTH


def handle_start_menu_events(
    event: Event, player: Player, current_route: Route
) -> tuple[States, Player, Route]:
    """Handle events for start menu (mouse clicks)."""
    new_state = States.START_MENU

    def local_load_game(
        player: Player, current_route: Route
    ) -> tuple[States, Player, Route]:
        loaded_player, loaded_route = load_game()
        if loaded_player and loaded_route:
            player = loaded_player
            current_route = routes_data.get_route_by_key(loaded_route)
            player.ensure_valid_position(current_route)
            print("Loaded save.")
            return States.OVERWORLD, player, current_route
        else:
            print("No save found.")
            return States.START_MENU, player, current_route

    if event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        # Match rendering positions
        panel_w, panel_h = 360, 180
        panel_x = (SCREEN_WIDTH - panel_w) // 2
        panel_y = 230
        btn_w, btn_h = 300, 48
        btn_x = panel_x + (panel_w - btn_w) // 2
        new_y = panel_y + 25
        load_y = panel_y + 25 + btn_h + 20
        # New Game
        if (
            btn_x <= mouse_pos[0] <= btn_x + btn_w
            and new_y <= mouse_pos[1] <= new_y + btn_h
        ):
            new_state = States.NAME_GENDER
        # Load Game
        elif (
            btn_x <= mouse_pos[0] <= btn_x + btn_w
            and load_y <= mouse_pos[1] <= load_y + btn_h
        ):
            new_state, player, current_route = local_load_game(player, current_route)

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_s:
            new_state, player, current_route = local_load_game(player, current_route)
        elif event.key == pygame.K_p:
            new_state = States.NAME_GENDER

    return (
        new_state,
        player,
        current_route,
    )


def handle_name_gender_events(event: Event, player: Player) -> tuple[States, Player]:
    """Handle events for name/gender input (keyboard + mouse)."""
    new_state = States.NAME_GENDER

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
            if player.gender and player.name != "Unknown":
                new_state = States.STARTER_SELECT
        elif event.key == pygame.K_BACKSPACE:  # pyright: ignore[reportAny]
            player.name = player.name[:-1]
        elif len(player.name) < 10:
            player.name += event.unicode  # pyright: ignore[reportAny]
    elif event.type == pygame.MOUSEBUTTONDOWN:
        mouse_pos = pygame.mouse.get_pos()
        # Match rendering positions for gender buttons
        panel_w, panel_h = 500, 260
        panel_x = (SCREEN_WIDTH - panel_w) // 2
        panel_y = 180
        name_box_y = panel_y + 55
        btn_w, btn_h = 180, 46
        gap = 24
        btn_x = panel_x + 24
        btn_y = name_box_y + 100
        male_rect = (btn_x, btn_y, btn_w, btn_h)
        female_rect = (btn_x + btn_w + gap, btn_y, btn_w, btn_h)
        if (
            male_rect[0] <= mouse_pos[0] <= male_rect[0] + male_rect[2]
            and male_rect[1] <= mouse_pos[1] <= male_rect[1] + male_rect[3]
        ):
            player.gender = Gender.MALE
        elif (
            female_rect[0] <= mouse_pos[0] <= female_rect[0] + female_rect[2]
            and female_rect[1] <= mouse_pos[1] <= female_rect[1] + female_rect[3]
        ):
            player.gender = Gender.FEMALE

    return new_state, player


def handle_starter_select_events(
    event: Event, player: Player, selected_starter: int = 0
) -> tuple[States, Player, int]:
    """Handle events for starter selection (keyboard)."""
    new_state = States.STARTER_SELECT

    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_LEFT:  # pyright: ignore[reportAny]
            selected_starter = (selected_starter - 1) % len(starters)
        elif event.key == pygame.K_RIGHT:  # pyright: ignore[reportAny]
            selected_starter = (selected_starter + 1) % len(starters)
        elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
            starter = starters[selected_starter]
            hp, attack, defence, special_attack, special_defence, speed = (
                calculate_stats_based_on_level(starter, level=5)
            )
            player.capture_creature(
                PartyCreature(
                    creature=starter,
                    level=5,
                    moves=generate_moves(starter, 5),
                    hp=hp,
                    damage=0,
                    attack=attack,
                    defence=defence,
                    special_attack=special_attack,
                    special_defence=special_defence,
                    speed=speed,
                )
            )
            player.items.append(
                Items(
                    key="poke_ball",
                    name="Poke Ball",
                    quantity=5,
                    type=ItemType.CATCHING,
                    description="A ball used to catch wild Pokémon.",
                )
            )
            # Set starting position
            new_state = States.OVERWORLD

    return new_state, player, selected_starter


def handle_overworld_events(
    event: Event, player: Player, current_route: Route
) -> tuple[Player, str, float]:
    """Handle events for overworld (e.g., future: interactions)."""
    from src.battle import heal_party

    if event.type == pygame.KEYDOWN:
        if event.key in (pygame.K_SPACE, pygame.K_RETURN):
            # Check for healing object
            healing_objects = [
                obj
                for obj in (current_route.objects or [])
                if obj.type == "healing-fountain"
            ]
            player_grid_x = int(player.location.x // TILE_SIZE)
            player_grid_y = int(player.location.y // TILE_SIZE)
            for obj in healing_objects:
                tx, ty, w, h = obj.tx, obj.ty, obj.w, obj.h
                # Check if player is on or adjacent to the object
                for dx in range(-1, 2):
                    for dy in range(-1, 2):
                        check_x = player_grid_x + dx
                        check_y = player_grid_y + dy
                        if tx <= check_x < tx + w and ty <= check_y < ty + h:
                            # Heal the party
                            heal_party(player.party)
                            return (
                                player,
                                "Your Pokemon have been healed at the fountain!",
                                3.0,
                            )
    return player, "", 0.0


def update_overworld(
    player: Player,
    current_route: Route,
    dt: float,
    current_time: int,
    last_autosave: int,
) -> tuple[Player, Route, PartyCreature | None]:
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
        creatures_list: list[CreatureEncounter] = (
            current_route.creatures.get("grass", []) if current_route.creatures else []
        )
        if creatures_list and available:
            pos = random.choice(available)
            creature_def: CreatureEncounter = random.choice(creatures_list)
            level_range = creature_def.level
            level = random.randint(level_range[0], level_range[1])
            creature = find_creature(creature_def.name)

            hp, attack, defence, special_attack, special_defence, speed = (
                calculate_stats_based_on_level(creature, level=level)
            )
            wild_creature = PartyCreature(
                creature=creature,
                level=level,
                moves=generate_moves(creature, level),
                hp=hp,
                damage=0,
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

    # Grid-based movement with cooldown to prevent continuous movement
    from src.config import TILE_SIZE

    # Add movement cooldown (250ms between moves for responsive grid movement)
    movement_cooldown = 250
    if not hasattr(player, "last_move_time"):
        player.last_move_time = pygame.time.get_ticks()

    previously_tweening = getattr(player, "is_tweening", False)
    player.update_tween(current_time)
    tween_completed = previously_tweening and not player.is_tweening

    encountered = None

    if tween_completed:
        player.location.x = round(player.location.x / TILE_SIZE) * TILE_SIZE
        player.location.y = round(player.location.y / TILE_SIZE) * TILE_SIZE

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
                    spawn = Position(tx=0, ty=0)
                player.location.x = spawn.tx * TILE_SIZE
                player.location.y = spawn.ty * TILE_SIZE
                current_route = new_route
                player.wild_spawns = []
                player.cancel_tween()
                player.ensure_valid_position(current_route)
                break

        for spawn in player.wild_spawns[:]:
            if spawn.tx == player.grid_x and spawn.ty == player.grid_y:
                encountered = spawn.creature
                player.wild_spawns.remove(spawn)
                break

    keys = pygame.key.get_pressed()
    dx, dy = 0.0, 0.0

    if (
        not player.is_tweening
        and current_time - player.last_move_time >= movement_cooldown
    ):
        if keys[pygame.K_LEFT]:
            dx = -TILE_SIZE  # Move exactly one tile
            player.facing = "left"
        elif keys[pygame.K_RIGHT]:
            dx = TILE_SIZE  # Move exactly one tile
            player.facing = "right"
        elif keys[pygame.K_UP]:
            dy = -TILE_SIZE  # Move exactly one tile
            player.facing = "up"
        elif keys[pygame.K_DOWN]:
            dy = TILE_SIZE  # Move exactly one tile
            player.facing = "down"

    if dx or dy:
        old_x, old_y = player.location.x, player.location.y
        player.move(dx, dy, current_route)

        moved = player.location.x != old_x or player.location.y != old_y
        target_x, target_y = player.location.x, player.location.y
        player.location.x = old_x
        player.location.y = old_y

        player.last_move_time = current_time
        if moved:
            player.start_tween(target_x, target_y, movement_cooldown)

    # Shake decay (every frame)
    if hasattr(player, "shake_active") and player.shake_active:
        player.shake_timer -= dt
        if player.shake_timer <= 0:
            player.shake_active = False

    # Autosave
    if current_time - last_autosave > AUTOSAVE_INTERVAL:
        save_game(player, current_route.key)
        player.last_autosave = current_time

    return player, current_route, encountered


def handle_battle_events(
    event: Event,
    battle_state: BattleState,  # BattleState object
    player: Player,
) -> tuple[States, Player, str, float, bool]:
    """Handle events for battle scene with full battle system."""
    from src.battle_state import BattlePhase
    from src.battle import (
        execute_move,
        select_ai_move,
        is_fainted,
        calculate_exp_gain,
        level_up,
        heal_party,
        BattleResult,
    )
    from src.data_loader import routes_data

    if event.type == pygame.KEYDOWN:
        if battle_state.phase == BattlePhase.MAIN_MENU:
            return _handle_main_battle_menu(event, battle_state, player)
        elif battle_state.phase == BattlePhase.MOVE_SELECT:
            return _handle_move_selection(event, battle_state, player)
        elif battle_state.phase == BattlePhase.BAG_MENU:
            return _handle_bag_menu(event, battle_state, player)
        elif battle_state.phase == BattlePhase.PARTY_SELECT:
            return _handle_party_selection(event, battle_state, player)
        elif battle_state.phase == BattlePhase.SHOWING_RESULTS:
            return _handle_result_display(event, battle_state, player)
        elif battle_state.phase == BattlePhase.SWITCH_REQUIRED:
            return _handle_forced_switch(event, battle_state, player)
        elif battle_state.phase == BattlePhase.VICTORY:
            return _handle_victory(event, battle_state, player)
        elif battle_state.phase == BattlePhase.DEFEAT:
            return _handle_defeat(event, battle_state, player)

    return States.BATTLE, player, "", 0.0, False


def _handle_main_battle_menu(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle main battle menu (FIGHT, BAG, Creatures, RUN)."""
    from src.battle_state import BattlePhase
    from src.battle import is_fainted

    if event.key == pygame.K_ESCAPE:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("back")
        except Exception:
            pass
        return States.OVERWORLD, player, "Got away safely!", 2.0, True
    elif event.key == pygame.K_LEFT:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 1)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_RIGHT:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(3, battle_state.selected_option + 1)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_UP:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 2)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_DOWN:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(3, battle_state.selected_option + 2)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("confirm")
        except Exception:
            pass
        if battle_state.selected_option == 0:  # FIGHT
            battle_state.phase = BattlePhase.MOVE_SELECT
            battle_state.selected_option = 0
        elif battle_state.selected_option == 1:  # BAG
            battle_state.phase = BattlePhase.BAG_MENU
            battle_state.selected_option = 0
        elif battle_state.selected_option == 2:  # Creatures
            if len([p for p in player.party if not is_fainted(p)]) > 1:
                battle_state.phase = BattlePhase.PARTY_SELECT
                battle_state.selected_option = 0
        elif battle_state.selected_option == 3:  # RUN
            return States.OVERWORLD, player, "Got away safely!", 2.0, True

    return States.BATTLE, player, "", 0.0, False


def _handle_move_selection(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle move selection menu."""
    from src.battle_state import BattlePhase
    from src.battle import select_ai_move

    available_moves = [m for m in battle_state.player_pokemon.moves if m.uses > 0]

    if event.key == pygame.K_ESCAPE:  # pyright: ignore[reportAny]
        battle_state.phase = BattlePhase.MAIN_MENU
        try:
            from src.audio import play_sfx

            play_sfx("back")
        except Exception:
            pass
        try:
            from src.audio import play_sfx

            play_sfx("back")
        except Exception:
            pass
        battle_state.selected_option = 0
    elif event.key == pygame.K_LEFT:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 1)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_RIGHT:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(
            len(available_moves) - 1, battle_state.selected_option + 1
        )
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_UP:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 2)
    elif event.key == pygame.K_DOWN:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(
            len(available_moves) - 1, battle_state.selected_option + 2
        )
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
        if battle_state.selected_option < len(available_moves):
            try:
                from src.audio import play_sfx

                play_sfx("confirm")
            except Exception:
                pass
            # Player selected a move, now execute the turn
            battle_state.player_move = available_moves[battle_state.selected_option]
            battle_state.enemy_move = select_ai_move(
                battle_state.wild_pokemon,
                battle_state.player_pokemon,
                battle_state.difficulty,
            )

            return _execute_battle_turn(battle_state, player)

    return States.BATTLE, player, "", 0.0, False


def _handle_bag_menu(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle bag menu for items."""
    from src.battle_state import BattlePhase

    if event.key == pygame.K_ESCAPE:  # pyright: ignore[reportAny]
        battle_state.phase = BattlePhase.MAIN_MENU
        battle_state.selected_option = 0
    elif event.key == pygame.K_LEFT:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 1)
    elif event.key == pygame.K_RIGHT:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(1, battle_state.selected_option + 1)
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass
    elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("confirm")
        except Exception:
            pass
        if battle_state.selected_option == 0:  # Poke Ball
            item = player.get_item_by_key("poke_ball")
            if item and item.quantity > 0:
                return _attempt_capture(battle_state, player, item)
        elif battle_state.selected_option == 1:  # Back
            battle_state.phase = BattlePhase.MAIN_MENU
            battle_state.selected_option = 0

    return States.BATTLE, player, "", 0.0, False


def _handle_party_selection(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle party creature selection for switching."""
    from src.battle_state import BattlePhase
    from src.battle import is_fainted, BattleResult

    # When the battle requires an initial choice we render the full party (all slots),
    # but selection/navigation must skip fainted Pokemon. For normal in-battle switching
    # we present only non-fainted and non-active party members.
    initial_choice = getattr(battle_state, "initial_choice_required", False)

    # The list used for rendering in the UI (rendering.py expects full party when initial_choice=True)
    render_list = (
        player.party
        if initial_choice
        else [
            p
            for p in player.party
            if not is_fainted(p) and p != battle_state.player_pokemon
        ]
    )

    # Ensure the selection index is valid and points to a selectable slot:
    # - For initial_choice: selected_option indexes into player.party (render_list == player.party),
    #   so if it points to a fainted slot, find the nearest non-fainted to highlight.
    # - For normal switching: selected_option indexes into the filtered list; clamp it.
    if initial_choice:
        # If no party at all, just bail
        if not player.party:
            return States.BATTLE, player, "", 0.0, False

        # Normalize selected_option to be within party bounds
        if battle_state.selected_option < 0 or battle_state.selected_option >= len(
            player.party
        ):
            # Pick first healthy index if available
            first_healthy = next(
                (i for i, p in enumerate(player.party) if not is_fainted(p)), 0
            )
            battle_state.selected_option = first_healthy

        # If current selection is fainted, move to nearest non-fainted (search outward)
        if is_fainted(player.party[battle_state.selected_option]):
            n = len(player.party)
            found = False
            for offset in range(1, n):
                forward = (battle_state.selected_option + offset) % n
                backward = (battle_state.selected_option - offset) % n
                if not is_fainted(player.party[forward]):
                    battle_state.selected_option = forward
                    found = True
                    break
                if not is_fainted(player.party[backward]):
                    battle_state.selected_option = backward
                    found = True
                    break
            # If none found, leave selection as-is (all fainted case)
    else:
        # Clamp selection index for the filtered list
        if render_list:
            battle_state.selected_option = max(
                0, min(battle_state.selected_option, len(render_list) - 1)
            )
        else:
            # No valid options to select
            battle_state.selected_option = 0

    # Event handling: move selection but skip fainted on navigation when initial_choice is True
    if event.key == pygame.K_ESCAPE:  # pyright: ignore[reportAny]
        if battle_state.force_switch:
            return States.BATTLE, player, "", 0.0, False  # Can't escape if forced
        battle_state.phase = BattlePhase.MAIN_MENU
        battle_state.selected_option = 0
    elif event.key == pygame.K_UP:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass

        if initial_choice:
            # Find previous non-fainted index in full party
            n = len(player.party)
            if n:
                start = battle_state.selected_option
                for offset in range(1, n):
                    idx = (start - offset) % n
                    if not is_fainted(player.party[idx]):
                        battle_state.selected_option = idx
                        break
        else:
            battle_state.selected_option = max(0, battle_state.selected_option - 1)
    elif event.key == pygame.K_DOWN:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("move")
        except Exception:
            pass

        if initial_choice:
            # Find next non-fainted index in full party
            n = len(player.party)
            if n:
                start = battle_state.selected_option
                for offset in range(1, n):
                    idx = (start + offset) % n
                    if not is_fainted(player.party[idx]):
                        battle_state.selected_option = idx
                        break
        else:
            if render_list:
                battle_state.selected_option = min(
                    len(render_list) - 1, battle_state.selected_option + 1
                )
            else:
                battle_state.selected_option = 0
    elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
        # Determine the chosen Pokemon based on context
        if initial_choice:
            # selected_option indexes into the full party
            if 0 <= battle_state.selected_option < len(player.party):
                chosen = player.party[battle_state.selected_option]
            else:
                return States.BATTLE, player, "", 0.0, False

            # Disallow selecting fainted Pokemon
            if is_fainted(chosen):
                try:
                    from src.audio import play_sfx

                    play_sfx("error")
                except Exception:
                    pass
                return States.BATTLE, player, "", 0.0, False

            # Valid initial send-out
            try:
                from src.audio import play_sfx

                play_sfx("confirm")
            except Exception:
                pass

            battle_state.player_pokemon = chosen
            result = BattleResult()
            result.add_message(f"Go, {chosen.creature.name}!")
            battle_state.add_result(result)
            battle_state.phase = BattlePhase.SHOWING_RESULTS
            battle_state.force_switch = False
            battle_state.initial_choice_required = False
        else:
            # selected_option indexes into the filtered render_list
            if 0 <= battle_state.selected_option < len(render_list):
                new_pokemon = render_list[battle_state.selected_option]
            else:
                return States.BATTLE, player, "", 0.0, False

            try:
                from src.audio import play_sfx

                play_sfx("confirm")
            except Exception:
                pass

            # Switch Pokemon during battle
            old_pokemon = battle_state.player_pokemon
            battle_state.player_pokemon = new_pokemon

            result = BattleResult()
            result.add_message(f"Come back, {old_pokemon.creature.name}!")
            result.add_message(f"Go, {new_pokemon.creature.name}!")
            battle_state.add_result(result)
            battle_state.phase = BattlePhase.SHOWING_RESULTS
            battle_state.force_switch = False

    return States.BATTLE, player, "", 0.0, False


def _handle_result_display(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle displaying battle results and messages."""
    from src.battle_state import BattlePhase
    from src.battle import is_fainted

    if event.key == pygame.K_RETURN or event.key == pygame.K_SPACE:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("confirm")
        except Exception:
            pass
        battle_state.advance_result()

        if not battle_state.has_more_results():
            # Check for victory/defeat conditions
            if is_fainted(battle_state.wild_pokemon):
                battle_state.phase = BattlePhase.VICTORY
                return _handle_exp_and_victory(battle_state, player)
            elif is_fainted(battle_state.player_pokemon):
                # Check if player has other Pokemon
                available_party = [p for p in player.party if not is_fainted(p)]
                if available_party:
                    battle_state.phase = BattlePhase.SWITCH_REQUIRED
                    battle_state.force_switch = True
                    battle_state.selected_option = 0
                else:
                    battle_state.phase = BattlePhase.DEFEAT
            else:
                # Continue battle
                battle_state.reset_for_new_turn()

    return States.BATTLE, player, "", 0.0, False


def _handle_forced_switch(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle forced switching when player's Pokemon faints."""
    from src.battle import is_fainted, BattleResult

    available_party = [p for p in player.party if not is_fainted(p)]

    if event.key == pygame.K_UP:  # pyright: ignore[reportAny]
        battle_state.selected_option = max(0, battle_state.selected_option - 1)
    elif event.key == pygame.K_DOWN:  # pyright: ignore[reportAny]
        battle_state.selected_option = min(
            len(available_party) - 1, battle_state.selected_option + 1
        )
    elif event.key == pygame.K_RETURN:  # pyright: ignore[reportAny]
        if battle_state.selected_option < len(available_party):
            new_pokemon = available_party[battle_state.selected_option]
            battle_state.player_pokemon = new_pokemon
            battle_state.force_switch = False

            # If this forced switch was actually the initial required choice (battle started without an active pokemon),
            # add a simple send-out message and move to showing results so the player sees the Pokemon being sent out.
            if getattr(battle_state, "initial_choice_required", False):
                battle_state.initial_choice_required = False
                result = BattleResult()
                result.add_message(f"Go, {new_pokemon.creature.name}!")
                battle_state.add_result(result)
                battle_state.phase = BattlePhase.SHOWING_RESULTS
            else:
                # Normal forced switch flow during battle: reset for a new turn
                battle_state.reset_for_new_turn()

    return States.BATTLE, player, "", 0.0, False


def _handle_victory(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle victory screen."""
    if event.key == pygame.K_RETURN or event.key == pygame.K_SPACE:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("confirm")
        except Exception:
            pass
        return States.OVERWORLD, player, "", 0.0, True

    return States.BATTLE, player, "", 0.0, False


def _handle_defeat(
    event: Event, battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle defeat - teleport to spawn and heal party."""
    from src.battle import heal_party
    from src.data_loader import routes_data

    if event.key == pygame.K_RETURN or event.key == pygame.K_SPACE:  # pyright: ignore[reportAny]
        try:
            from src.audio import play_sfx

            play_sfx("confirm")
        except Exception:
            pass
        # Heal all Pokemon
        heal_party(player.party)

        # Teleport to spawn point
        if player.reset_spawn_route and player.reset_spawn_point:
            try:
                spawn_route = routes_data.get_route_by_key(player.reset_spawn_route)
                spawn_pos = spawn_route.spawn.get(player.reset_spawn_point)
                if spawn_pos:
                    player.route = spawn_route
                    player.location.x = spawn_pos.tx * TILE_SIZE
                    player.location.y = spawn_pos.ty * TILE_SIZE
                    player.ensure_valid_position(player.route)
            except Exception:
                pass  # Stay at current location if spawn point not found

        return (
            States.OVERWORLD,
            player,
            "Your Pokemon were healed at the Pokemon Center.",
            3.0,
            True,
        )

    return States.BATTLE, player, "", 0.0, False


def _execute_battle_turn(
    battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Execute a complete battle turn with both Pokemon."""
    from src.battle import execute_move, is_fainted
    from src.battle_state import BattlePhase

    battle_state.phase = BattlePhase.EXECUTING
    battle_state.current_results = []
    battle_state.result_index = 0

    # Determine turn order based on speed
    player_goes_first = (
        battle_state.player_pokemon.speed >= battle_state.wild_pokemon.speed
    )

    if player_goes_first:
        first_attacker = battle_state.player_pokemon
        first_move = battle_state.player_move
        first_defender = battle_state.wild_pokemon

        second_attacker = battle_state.wild_pokemon
        second_move = battle_state.enemy_move
        second_defender = battle_state.player_pokemon
    else:
        first_attacker = battle_state.wild_pokemon
        first_move = battle_state.enemy_move
        first_defender = battle_state.player_pokemon

        second_attacker = battle_state.player_pokemon
        second_move = battle_state.player_move
        second_defender = battle_state.wild_pokemon

    # Execute first move
    result1 = execute_move(first_attacker, first_defender, first_move)
    battle_state.add_result(result1)
    try:
        from src.audio import play_sfx

        if result1.hit and result1.damage > 0:
            if result1.critical:
                play_sfx("crit")
            else:
                play_sfx("hit")
        else:
            play_sfx("miss")
    except Exception:
        pass

    # Execute second move only if defender didn't faint
    if not is_fainted(first_defender):
        result2 = execute_move(second_attacker, second_defender, second_move)
        battle_state.add_result(result2)
        try:
            from src.audio import play_sfx

            if result2.hit and result2.damage > 0:
                if result2.critical:
                    play_sfx("crit")
                else:
                    play_sfx("hit")
            else:
                play_sfx("miss")
        except Exception:
            pass

    battle_state.phase = BattlePhase.SHOWING_RESULTS
    return States.BATTLE, player, "", 0.0, False


def _attempt_capture(
    battle_state: BattleState, player: Player, poke_ball_item: Items
) -> tuple[States, Player, str, float, bool]:
    """Attempt to capture the wild Pokemon."""
    from src.battle import BattleResult
    from src.battle_state import BattlePhase

    # Deduct Poke Ball
    poke_ball_item.quantity -= 1
    if poke_ball_item.quantity <= 0:
        player.remove_item_by_key("poke_ball")

    # Calculate capture chance
    current_hp = battle_state.wild_pokemon.hp - battle_state.wild_pokemon.damage
    max_hp = battle_state.wild_pokemon.hp
    if current_hp <= 0:
        success_chance = 1.0
    else:
        hp_ratio = current_hp / max_hp
        success_chance = 0.1 + 0.5 * (1 - hp_ratio)  # 10% at full HP to 60% at 0 HP

    result = BattleResult()
    wild_name = battle_state.wild_pokemon.creature.name

    if random.random() < success_chance:
        # Capture successful!
        player.capture_creature(battle_state.wild_pokemon)
        result.add_message(f"Gotcha! {wild_name} was caught!")
        try:
            from src.audio import play_sfx

            play_sfx("capture_success")
        except Exception:
            pass
        battle_state.add_result(result)
        battle_state.phase = BattlePhase.VICTORY
        return States.BATTLE, player, "", 0.0, False
    else:
        # Capture failed
        result.add_message(f"Oh no! {wild_name} broke free!")
        try:
            from src.audio import play_sfx

            play_sfx("capture_fail")
        except Exception:
            pass
        battle_state.add_result(result)
        battle_state.phase = BattlePhase.SHOWING_RESULTS
        return States.BATTLE, player, "", 0.0, False


def _handle_exp_and_victory(
    battle_state: BattleState, player: Player
) -> tuple[States, Player, str, float, bool]:
    """Handle experience gain and level up on victory."""
    from src.battle import calculate_exp_gain, level_up, BattleResult

    # Calculate experience
    exp_gained = calculate_exp_gain(battle_state.wild_pokemon, is_wild=True)
    try:
        from src.audio import play_sfx

        play_sfx("victory")
    except Exception:
        pass
    battle_state.player_pokemon.experience += exp_gained

    result = BattleResult()
    result.add_message(
        f"{battle_state.player_pokemon.creature.name} gained {exp_gained} EXP!"
    )

    # Check for level up (simple level up every 100 exp for now)
    exp_for_next_level = battle_state.player_pokemon.level * 100
    if battle_state.player_pokemon.experience >= exp_for_next_level:
        battle_state.player_pokemon.experience -= exp_for_next_level
        stat_gains = level_up(battle_state.player_pokemon)
        result.add_message(f"{battle_state.player_pokemon.creature.name} leveled up!")
        result.add_message(f"Level {battle_state.player_pokemon.level}!")

        # Show significant stat gains
        for stat, gain in stat_gains.items():
            if gain > 0:
                result.add_message(f"{stat.replace('_', ' ').title()}: +{gain}")

    battle_state.add_result(result)
    return States.BATTLE, player, "", 0.0, False


def handle_party_events(
    event: Event, player: Player, selected_index: int, reorder_mode: bool
) -> tuple[States, int, bool]:
    if event.type != pygame.KEYDOWN:
        return States.PARTY_MENU, selected_index, reorder_mode
    num_party = len(player.party)
    if event.key == pygame.K_ESCAPE:
        if reorder_mode:
            return States.PARTY_MENU, selected_index, False
        else:
            return States.OVERWORLD, 0, False
    if reorder_mode:
        if event.key == pygame.K_UP and selected_index > 0:
            player.party[selected_index], player.party[selected_index - 1] = (
                player.party[selected_index - 1],
                player.party[selected_index],
            )
            selected_index -= 1
        elif event.key == pygame.K_DOWN and selected_index < num_party - 1:
            player.party[selected_index], player.party[selected_index + 1] = (
                player.party[selected_index + 1],
                player.party[selected_index],
            )
            selected_index += 1
        elif event.key in (pygame.K_SPACE, pygame.K_RETURN):
            reorder_mode = False
        return States.PARTY_MENU, selected_index, reorder_mode
    else:  # view mode
        if event.key == pygame.K_UP:
            selected_index = max(0, selected_index - 1)
        elif event.key == pygame.K_DOWN:
            selected_index = min(num_party - 1, selected_index + 1)
        elif event.key == pygame.K_SPACE and num_party > 0:
            reorder_mode = True
        elif event.key == pygame.K_RETURN and num_party > 0:
            return States.POKEMON_STATS, selected_index, False
        return States.PARTY_MENU, selected_index, reorder_mode


def handle_stats_events(event: Event, player: Player, index: int) -> tuple[States, int]:
    if event.type != pygame.KEYDOWN:
        return States.POKEMON_STATS, index
    if event.key == pygame.K_ESCAPE:
        return States.PARTY_MENU, index
    return States.POKEMON_STATS, index
