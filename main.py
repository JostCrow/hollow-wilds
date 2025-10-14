import pygame
from src.config import (
    BLACK,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    FPS,
    BG_COLOR,
    TILE_SIZE,
    DEBUG_MODE,
)
from src.data_loader import routes_data, starters, creatures_data
from src.models import (
    Gender,
    Items,
    ItemType,
    PartyCreature,
    Player,
    Route,
    RouteLocation,
    States,
)
from src.rendering import (
    render_start_menu,
    render_name_gender,
    render_starter_select,
    render_overworld,
    render_battle,
    render_party,
    render_pokemon_stats,
)
from src.states import (
    handle_start_menu_events,
    handle_name_gender_events,
    handle_starter_select_events,
    handle_overworld_events,
    update_overworld,
    handle_battle_events,
    handle_party_events,
    handle_stats_events,
)
from src.ui import draw_text
from src.evolution_system import get_evolution_system

# Initialize Pygame
_ = pygame.init()
# Initialize audio
try:
    from src.audio import init_audio

    init_audio()
except Exception:
    pass


def main():
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Nexus Capture")
    clock = pygame.time.Clock()

    # Initial state and vars
    state: States = States.START_MENU
    current_route: Route = routes_data.get_route_by_key(routes_data.startingRoute)
    player: Player = Player(
        name="",
        gender=Gender.MALE,
        party=[],
        boxed=[],
        route=current_route,
        location=RouteLocation(
            x=current_route.spawn.get("default").tx * TILE_SIZE,  # pyright: ignore[reportCallIssue, reportOptionalMemberAccess]
            y=current_route.spawn.get("default").ty * TILE_SIZE,  # pyright: ignore[reportOptionalMemberAccess]
        ),
        items=[
            Items(
                key="fire_stone",
                name="Fire Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It burns as red as ember.",
            ),
            Items(
                key="water_stone",
                name="Water Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It is a clear blue reminiscent of a lake.",
            ),
            Items(
                key="leaf_stone",
                name="Leaf Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It has a leaf pattern that seems to move.",
            ),
            Items(
                key="earth_stone",
                name="Earth Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It feels heavy and solid like bedrock.",
            ),
            Items(
                key="light_stone",
                name="Light Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It emits a brilliant, pure light.",
            ),
            Items(
                key="dark_stone",
                name="Dark Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It seems to absorb light around it.",
            ),
            Items(
                key="moon_stone",
                name="Moon Stone",
                quantity=3,
                type=ItemType.EVOLUTION,
                description="A peculiar stone that makes certain species of creatures evolve. It glows with lunar energy.",
            ),
        ],
    )
    player.ensure_valid_position(current_route)
    last_autosave = 0
    wild_pokemon: PartyCreature | None = None
    battle_state = None  # Will be BattleState when in battle
    selected_starter_option = 0
    battle_message: str = ""
    message_timer: float = 0.0
    pending_overworld: bool = False
    showing_stone_evolution_menu = False
    stone_evolution_party_index = -1
    available_stone_evolutions = []
    debug_mode = DEBUG_MODE
    party_selected_index = 0
    reorder_mode = False
    stats_index = 0

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        fps = clock.get_fps()
        current_time = pygame.time.get_ticks()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            if state == States.START_MENU:
                state, player, current_route = handle_start_menu_events(
                    event, player, current_route
                )

            elif state == States.NAME_GENDER:
                state, player = handle_name_gender_events(event, player)

            elif state == States.STARTER_SELECT:
                state, player, selected_starter_option = handle_starter_select_events(
                    event, player, selected_starter_option
                )

            elif state == States.OVERWORLD:
                # Handle evolution system events first
                if (
                    get_evolution_system().is_evolution_active()
                    and event.type == pygame.MOUSEBUTTONDOWN
                ):
                    mouse_pos = pygame.mouse.get_pos()
                    if get_evolution_system().handle_evolution_click(
                        mouse_pos,
                        player,
                        creatures_data,
                    ):
                        pass  # Evolution event was handled
                elif (
                    showing_stone_evolution_menu
                    and event.type == pygame.MOUSEBUTTONDOWN
                ):
                    mouse_pos = pygame.mouse.get_pos()
                    selected_req = get_evolution_system().handle_stone_menu_click(
                        mouse_pos,
                        available_stone_evolutions,
                        stone_evolution_party_index,
                    )
                    if selected_req is not None:
                        showing_stone_evolution_menu = False
                        available_stone_evolutions = []
                    else:  # Cancel was clicked or no selection
                        showing_stone_evolution_menu = False
                        available_stone_evolutions = []
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_d:
                    # Toggle debug mode
                    debug_mode = not debug_mode
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_s:
                    # Save the game when 'S' is pressed
                    from src.save_system import save_game
                    save_game(player, current_route.key)
                    battle_message = "Game saved!"
                    message_timer = 2.0  # Show message for 2 seconds
                elif (
                    event.type == pygame.KEYDOWN
                    and event.key == pygame.K_e
                    and player.party
                ):
                    # Show evolution menu for first party member (example)
                    available_stone_evolutions = (
                        get_evolution_system().check_stone_evolutions(player, 0)
                    )
                    if available_stone_evolutions:
                        showing_stone_evolution_menu = True
                        stone_evolution_party_index = 0
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                    state = States.PARTY_MENU
                    party_selected_index = 0
                    reorder_mode = False
                else:
                    player, message, timer = handle_overworld_events(
                        event, player, current_route
                    )
                    if message:
                        battle_message = message
                        message_timer = timer

            elif state == States.BATTLE:
                if battle_state:
                    (
                        returned_state,
                        returned_player,
                        returned_message,
                        returned_timer,
                        end_battle,
                    ) = handle_battle_events(event, battle_state, player)

                    state = returned_state
                    player = returned_player

                    if returned_message:
                        battle_message = returned_message
                        message_timer = returned_timer

                    if end_battle:
                        pending_overworld = True
                        battle_state = None
                        wild_pokemon = None

                        # Check for level-up evolutions after battle
                        evolution_candidates = (
                            get_evolution_system().check_level_evolutions(
                                player, creatures_data
                            )
                        )
                        if evolution_candidates:
                            # Process the first evolution
                            get_evolution_system().process_level_up_evolutions(
                                player, creatures_data
                            )

            elif state == States.PARTY_MENU:
                returned_state, party_selected_index, reorder_mode = (
                    handle_party_events(
                        event, player, party_selected_index, reorder_mode
                    )
                )
                state = returned_state
                if state == States.POKEMON_STATS:
                    stats_index = party_selected_index
            elif state == States.POKEMON_STATS:
                returned_state, stats_index = handle_stats_events(
                    event, player, stats_index
                )
                state = returned_state
                if state == States.PARTY_MENU:
                    party_selected_index = stats_index

        # Update battle/overworld message timer
        if message_timer > 0:
            message_timer -= dt
            if message_timer <= 0:
                battle_message = ""
                if (
                    pending_overworld
                    and not get_evolution_system().is_evolution_active()
                ):
                    state = States.OVERWORLD
                    pending_overworld = False
                    battle_state = None
                    wild_pokemon = None

        # Update evolution system
        get_evolution_system().update(dt)

        # Update overworld
        if (
            state == States.OVERWORLD
            and player
            and not get_evolution_system().is_evolution_active()
            and not showing_stone_evolution_menu
        ):
            player, current_route, battle_trigger = update_overworld(
                player, current_route, dt, current_time, last_autosave
            )
            last_autosave = player.last_autosave
            if battle_trigger:
                from src.battle_state import BattleState

                state = States.BATTLE
                wild_pokemon = battle_trigger
                # Initialize battle state: do NOT auto-select the first party member.
                # Pass None so the BattleState forces the player to choose an active Pokémon
                # (this prevents sending out a fainted Pokémon by default).
                if player.party:
                    battle_state = BattleState(wild_pokemon, None)
                    battle_state.selected_option = 0
                    # Set reset spawn point if not already set
                    if not player.reset_spawn_route:
                        player.reset_spawn_route = current_route.key
                        player.reset_spawn_point = "default"

        # Render
        _ = screen.fill(BG_COLOR)  # App background

        if state == States.START_MENU:
            render_start_menu(screen)
        elif state == States.NAME_GENDER:
            render_name_gender(screen, player.name, player.gender)
        elif state == States.STARTER_SELECT:
            render_starter_select(screen, starters, selected_starter_option)
        elif state == States.OVERWORLD:
            render_overworld(screen, current_route, player, fps, debug_mode)
            if message_timer > 0:
                _ = draw_text(
                    screen,
                    battle_message,
                    SCREEN_WIDTH // 2,
                    SCREEN_HEIGHT // 2,
                    24,
                    BLACK,
                    center=True,
                )

            # Render evolution system
            if get_evolution_system().is_evolution_active():
                get_evolution_system().draw_evolution_screen(screen, player)
            elif showing_stone_evolution_menu:
                available_stone_evolutions = (
                    get_evolution_system().show_stone_evolution_menu(
                        screen, player, stone_evolution_party_index
                    )
                )

        elif state == States.BATTLE:
            if battle_state:
                render_battle(screen, battle_state, player)
            if battle_message:
                _ = draw_text(
                    screen, battle_message, 250, SCREEN_HEIGHT // 2, 24, BLACK
                )
        elif state == States.PARTY_MENU:
            render_overworld(screen, current_route, player, fps, debug_mode)
            render_party(screen, player, party_selected_index, reorder_mode)
        elif state == States.POKEMON_STATS:
            render_overworld(screen, current_route, player, fps, debug_mode)
            render_pokemon_stats(screen, player, stats_index)

        pygame.display.flip()

    try:
        from src.audio import shutdown_audio

        shutdown_audio()
    except Exception:
        pass
    pygame.quit()


if __name__ == "__main__":
    main()
