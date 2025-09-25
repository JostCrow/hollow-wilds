import pygame
from src.config import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, WHITE
from src.data_loader import routes_data, starters
from src.models import Gender, PartyCreature, Player, Route, RouteLocation, States
from src.rendering import (
    render_start_menu,
    render_name_gender,
    render_starter_select,
    render_overworld,
    render_battle,
)
from src.states import (
    handle_start_menu_events,
    handle_name_gender_events,
    handle_starter_select_events,
    handle_overworld_events,
    update_overworld,
    handle_battle_events,
)

# Initialize Pygame
pygame.init()


def main():
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Pokemon Browser Game")
    clock = pygame.time.Clock()

    # Initial state and vars
    state: States = States.START_MENU
    current_route: Route = routes_data.get_route_by_key(routes_data.startingRoute)
    player: Player = Player(
        name="Unknown",
        gender=Gender.MALE,
        party=[],
        boxed=[],
        route=current_route,
        location=RouteLocation(
            x=current_route.spawn.get("default").tx,  # pyright: ignore[reportCallIssue, reportOptionalMemberAccess]
            y=current_route.spawn.get("default").ty,  # pyright: ignore[reportOptionalMemberAccess]
        ),
    )
    last_autosave = 0
    wild_pokemon: PartyCreature | None = None
    selected_option = 0

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
                state, player = handle_starter_select_events(event, player, starters)

            elif state == States.OVERWORLD:
                player = handle_overworld_events(event, player)

            elif state == States.BATTLE:
                state, wild_pokemon, player, selected_option = handle_battle_events(
                    event, wild_pokemon, player, selected_option
                )

        # Update overworld
        if state == States.OVERWORLD and player:
            player, current_route, battle_trigger = update_overworld(
                player, current_route, dt, current_time, last_autosave
            )
            last_autosave = player.last_autosave
            if battle_trigger:
                state = States.BATTLE
                wild_pokemon = battle_trigger

        # Render
        screen.fill(WHITE)  # White background

        if state == States.START_MENU:
            render_start_menu(screen)
        elif state == States.NAME_GENDER:
            render_name_gender(screen, player.name, player.gender)
        elif state == "starter_select":
            render_starter_select(screen, starters, selected_starter)
        elif state == "overworld":
            if not player:
                state = "start_menu"
                continue
            render_overworld(screen, current_route, player, fps)

        elif state == "battle":
            render_battle(screen, wild_pokemon, player, selected_option or 0)

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
