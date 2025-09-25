import pygame
import os
from src.config import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, WHITE
from src.data_loader import routes_data, starters
from src.player import Player
from src.save_system import save_game, load_game
from src.rendering import (
    render_start_menu,
    render_name_gender,
    render_starter_select,
    render_overworld,
)
from src.states import (
    handle_start_menu_events,
    handle_name_gender_events,
    handle_starter_select_events,
    handle_overworld_events,
    update_overworld,
)

# Initialize Pygame
pygame.init()


def main():
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Pokemon Browser Game")
    clock = pygame.time.Clock()

    # Initial state and vars
    state = "start_menu"
    player = None
    current_route = routes_data.get("routes", {}).get("Willowfen Village", {})
    name_input = ""
    selected_gender = None
    selected_starter = 0
    last_autosave = 0

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        fps = clock.get_fps()
        current_time = pygame.time.get_ticks()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            if state == "start_menu":
                (
                    state,
                    player,
                    current_route,
                    name_input,
                    selected_gender,
                    selected_starter,
                ) = handle_start_menu_events(event, player, current_route, routes_data)

            elif state == "name_gender":
                state, name_input, selected_gender, player = handle_name_gender_events(
                    event, name_input, selected_gender, player
                )

            elif state == "starter_select":
                state, selected_starter, player, current_route = (
                    handle_starter_select_events(
                        event, selected_starter, player, current_route, starters
                    )
                )

            elif state == "overworld":
                player, current_route = handle_overworld_events(
                    event, player, current_route, routes_data
                )

        # Update overworld
        if state == "overworld" and player:
            player, current_route = update_overworld(
                player, current_route, dt, current_time, last_autosave
            )
            last_autosave = player.last_autosave

        # Render
        screen.fill(WHITE)  # White background

        if state == "start_menu":
            render_start_menu(screen)
        elif state == "name_gender":
            render_name_gender(screen, name_input, selected_gender)
        elif state == "starter_select":
            render_starter_select(screen, starters, selected_starter)
        elif state == "overworld":
            if not player:
                state = "start_menu"
                continue
            render_overworld(screen, current_route, player, fps)

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
