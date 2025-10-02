import pygame
import json
import os
from enum import Enum
from typing import Optional, List, Tuple
from src.models import (
    Player,
    PartyCreature,
    Creature,
    EvolutionRequirement,
    EvolutionType,
    CreaturesData,
    Items,
    ItemType,
)
from src.config import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT
from src.ui import draw_text, draw_button


class EvolutionState(str, Enum):
    CHECKING = "checking"
    CONFIRM = "confirm"
    EVOLVING = "evolving"
    COMPLETE = "complete"
    CANCELLED = "cancelled"


class EvolutionSystem:
    def __init__(self):
        self.state = EvolutionState.CHECKING
        self.evolution_queue: List[Tuple[int, EvolutionRequirement]] = []
        self.current_evolution: Optional[Tuple[int, EvolutionRequirement]] = None
        self.evolution_timer = 0.0
        self.evolution_duration = 3.0  # Evolution animation duration in seconds
        self.font = None
        self.small_font = None

        # Load evolution stones data
        self.evolution_stones = self._load_evolution_stones()

    def _get_font(self):
        """Lazy initialization of font."""
        if self.font is None:
            self.font = pygame.font.Font(None, 36)
        return self.font

    def _get_small_font(self):
        """Lazy initialization of small font."""
        if self.small_font is None:
            self.small_font = pygame.font.Font(None, 24)
        return self.small_font

    def _load_evolution_stones(self) -> List[Items]:
        """Load evolution stones from data file."""
        stones_path = os.path.join("python-version", "data", "evolution_stones.json")
        try:
            with open(stones_path, "r") as f:
                stones_data = json.load(f)
                return [Items(**stone) for stone in stones_data]
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def check_level_evolutions(
        self, player: Player, creatures_data: CreaturesData
    ) -> List[int]:
        """Check all party creatures for level-based evolutions."""
        evolution_candidates = []
        for i, party_creature in enumerate(player.party):
            evolution_req = party_creature.can_evolve_at_current_level()
            if evolution_req:
                evolution_candidates.append(i)
                self.evolution_queue.append((i, evolution_req))
        return evolution_candidates

    def check_stone_evolutions(
        self, player: Player, party_index: int
    ) -> List[EvolutionRequirement]:
        """Check what stone evolutions are available for a specific party creature."""
        if not (0 <= party_index < len(player.party)):
            return []

        creature = player.party[party_index]
        available_evolutions = []

        # Check each evolution stone the player has
        for stone_item in player.get_evolution_stones_in_inventory():
            if stone_item.quantity > 0:
                evolution_req = creature.can_evolve_with_stone(stone_item.key)
                if evolution_req:
                    available_evolutions.append(evolution_req)

        return available_evolutions

    def start_evolution(self, party_index: int, evolution_req: EvolutionRequirement):
        """Start the evolution process for a specific creature."""
        self.current_evolution = (party_index, evolution_req)
        self.state = EvolutionState.CONFIRM
        self.evolution_timer = 0.0

    def confirm_evolution(self, player: Player, creatures_data: CreaturesData) -> bool:
        """Confirm and execute the evolution."""
        if not self.current_evolution:
            return False

        party_index, evolution_req = self.current_evolution

        if evolution_req.type == EvolutionType.LEVEL:
            success = player.evolve_creature_at_level(party_index, creatures_data)
        else:  # Stone evolution
            success = player.evolve_creature_with_stone(
                party_index, evolution_req.stone, creatures_data
            )

        if success:
            self.state = EvolutionState.EVOLVING
            self.evolution_timer = 0.0
            return True
        else:
            self.state = EvolutionState.CANCELLED
            self.current_evolution = None
            return False

    def cancel_evolution(self):
        """Cancel the current evolution."""
        self.state = EvolutionState.CANCELLED
        self.current_evolution = None

    def update(self, dt: float) -> bool:
        """Update evolution system. Returns True if evolution is in progress."""
        if self.state == EvolutionState.EVOLVING:
            self.evolution_timer += dt
            if self.evolution_timer >= self.evolution_duration:
                self.state = EvolutionState.COMPLETE
                return False
            return True
        return False

    def draw_evolution_screen(self, screen: pygame.Surface, player: Player):
        """Draw the evolution confirmation or progress screen."""
        if not self.current_evolution:
            return

        party_index, evolution_req = self.current_evolution
        if party_index >= len(player.party):
            return

        creature = player.party[party_index]

        # Draw background overlay
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        overlay.fill((0, 0, 0))
        overlay.set_alpha(128)
        screen.blit(overlay, (0, 0))

        # Draw main evolution box
        box_width, box_height = 500, 300
        box_x = (SCREEN_WIDTH - box_width) // 2
        box_y = (SCREEN_HEIGHT - box_height) // 2

        pygame.draw.rect(screen, (255, 255, 255), (box_x, box_y, box_width, box_height))
        pygame.draw.rect(screen, (0, 0, 0), (box_x, box_y, box_width, box_height), 3)

        if self.state == EvolutionState.CONFIRM:
            self._draw_evolution_confirm(
                screen, creature, evolution_req, box_x, box_y, box_width, box_height
            )
        elif self.state == EvolutionState.EVOLVING:
            self._draw_evolution_progress(
                screen, creature, evolution_req, box_x, box_y, box_width, box_height
            )
        elif self.state == EvolutionState.COMPLETE:
            self._draw_evolution_complete(
                screen, creature, evolution_req, box_x, box_y, box_width, box_height
            )

    def _draw_evolution_confirm(
        self,
        screen: pygame.Surface,
        creature: PartyCreature,
        evolution_req: EvolutionRequirement,
        box_x: int,
        box_y: int,
        box_width: int,
        box_height: int,
    ):
        """Draw evolution confirmation dialog."""
        # Title
        title = f"{creature.creature.name} wants to evolve!"
        title_surface = self._get_font().render(title, True, (0, 0, 0))
        title_rect = title_surface.get_rect(center=(box_x + box_width // 2, box_y + 40))
        screen.blit(title_surface, title_rect)

        # Evolution info
        if evolution_req.type == EvolutionType.LEVEL:
            info_text = (
                f"Evolve to {evolution_req.evolves_to} at level {creature.level}?"
            )
        else:
            stone_name = evolution_req.stone.replace("_", " ").title()
            info_text = f"Use {stone_name} to evolve to {evolution_req.evolves_to}?"

        info_surface = self._get_small_font().render(info_text, True, (64, 64, 64))
        info_rect = info_surface.get_rect(center=(box_x + box_width // 2, box_y + 100))
        screen.blit(info_surface, info_rect)

        # Current creature sprite (if available)
        try:
            sprite_path = os.path.join(
                ASSETS_PATH, "creatures", creature.creature.sprite
            )
            if os.path.exists(sprite_path):
                sprite = pygame.image.load(sprite_path)
                sprite = pygame.transform.scale(sprite, (64, 64))
                sprite_rect = sprite.get_rect(
                    center=(box_x + box_width // 3, box_y + 150)
                )
                screen.blit(sprite, sprite_rect)
        except:
            # Fallback: draw a placeholder rectangle
            pygame.draw.rect(
                screen,
                (200, 200, 200),
                (box_x + box_width // 3 - 32, box_y + 150 - 32, 64, 64),
            )

        # Arrow
        arrow_text = "→"
        arrow_surface = self._get_font().render(arrow_text, True, (0, 0, 0))
        arrow_rect = arrow_surface.get_rect(
            center=(box_x + box_width // 2, box_y + 150)
        )
        screen.blit(arrow_surface, arrow_rect)

        # Question mark for evolved form (since we don't know the sprite)
        question_surface = self._get_font().render("?", True, (100, 100, 100))
        question_rect = question_surface.get_rect(
            center=(box_x + 2 * box_width // 3, box_y + 150)
        )
        screen.blit(question_surface, question_rect)

        # Buttons
        button_y = box_y + box_height - 60
        yes_button = pygame.Rect(box_x + 100, button_y, 80, 30)
        no_button = pygame.Rect(box_x + box_width - 180, button_y, 80, 30)

        draw_button(
            screen, "Yes", box_x + 100, button_y, 80, 30, (0, 200, 0), (255, 255, 255)
        )
        draw_button(
            screen,
            "No",
            box_x + box_width - 180,
            button_y,
            80,
            30,
            (200, 0, 0),
            (255, 255, 255),
        )

    def _draw_evolution_progress(
        self,
        screen: pygame.Surface,
        creature: PartyCreature,
        evolution_req: EvolutionRequirement,
        box_x: int,
        box_y: int,
        box_width: int,
        box_height: int,
    ):
        """Draw evolution progress animation."""
        # Title
        title = f"{creature.creature.name} is evolving!"
        title_surface = self._get_font().render(title, True, (0, 0, 0))
        title_rect = title_surface.get_rect(center=(box_x + box_width // 2, box_y + 40))
        screen.blit(title_surface, title_rect)

        # Progress bar
        progress = min(1.0, self.evolution_timer / self.evolution_duration)
        bar_width = 300
        bar_height = 20
        bar_x = box_x + (box_width - bar_width) // 2
        bar_y = box_y + 150

        # Background bar
        pygame.draw.rect(screen, (200, 200, 200), (bar_x, bar_y, bar_width, bar_height))
        # Progress bar
        pygame.draw.rect(
            screen, (0, 255, 0), (bar_x, bar_y, int(bar_width * progress), bar_height)
        )
        # Border
        pygame.draw.rect(screen, (0, 0, 0), (bar_x, bar_y, bar_width, bar_height), 2)

        # Sparkle effects (simple animation)
        sparkle_count = int(progress * 10)
        for i in range(sparkle_count):
            spark_x = box_x + 50 + (i * 40) % (box_width - 100)
            spark_y = box_y + 100 + (i * 20) % 100
            pygame.draw.circle(screen, (255, 255, 0), (spark_x, spark_y), 3)

    def _draw_evolution_complete(
        self,
        screen: pygame.Surface,
        creature: PartyCreature,
        evolution_req: EvolutionRequirement,
        box_x: int,
        box_y: int,
        box_width: int,
        box_height: int,
    ):
        """Draw evolution complete screen."""
        # Title
        title = f"Congratulations!"
        title_surface = self._get_font().render(title, True, (0, 0, 0))
        title_rect = title_surface.get_rect(center=(box_x + box_width // 2, box_y + 40))
        screen.blit(title_surface, title_rect)

        # Evolution complete message
        message = f"{creature.creature.name} evolved into {evolution_req.evolves_to}!"
        message_surface = self._get_small_font().render(message, True, (0, 100, 0))
        message_rect = message_surface.get_rect(
            center=(box_x + box_width // 2, box_y + 100)
        )
        screen.blit(message_surface, message_rect)

        # Continue button
        continue_button = pygame.Rect(
            box_x + box_width // 2 - 60, box_y + box_height - 60, 120, 30
        )
        draw_button(
            screen,
            "Continue",
            box_x + box_width // 2 - 60,
            box_y + box_height - 60,
            120,
            30,
            (0, 100, 200),
            (255, 255, 255),
        )

    def handle_evolution_click(
        self, pos: Tuple[int, int], player: Player, creatures_data: CreaturesData
    ) -> bool:
        """Handle mouse clicks on evolution screen. Returns True if click was handled."""
        if (
            self.state != EvolutionState.CONFIRM
            and self.state != EvolutionState.COMPLETE
        ):
            return False

        box_width, box_height = 500, 300
        box_x = (SCREEN_WIDTH - box_width) // 2
        box_y = (SCREEN_HEIGHT - box_height) // 2

        if self.state == EvolutionState.CONFIRM:
            # Check Yes button
            yes_button = pygame.Rect(box_x + 100, box_y + box_height - 60, 80, 30)
            if yes_button.collidepoint(pos):
                self.confirm_evolution(player, creatures_data)
                return True

            # Check No button
            no_button = pygame.Rect(
                box_x + box_width - 180, box_y + box_height - 60, 80, 30
            )
            if no_button.collidepoint(pos):
                self.cancel_evolution()
                return True

        elif self.state == EvolutionState.COMPLETE:
            # Check Continue button
            continue_button = pygame.Rect(
                box_x + box_width // 2 - 60, box_y + box_height - 60, 120, 30
            )
            if continue_button.collidepoint(pos):
                self.state = EvolutionState.CHECKING
                self.current_evolution = None
                return True

        return False

    def is_evolution_active(self) -> bool:
        """Check if evolution system is currently active."""
        return self.state in [
            EvolutionState.CONFIRM,
            EvolutionState.EVOLVING,
            EvolutionState.COMPLETE,
        ]

    def reset(self):
        """Reset evolution system state."""
        self.state = EvolutionState.CHECKING
        self.evolution_queue.clear()
        self.current_evolution = None
        self.evolution_timer = 0.0

    def process_level_up_evolutions(
        self, player: Player, creatures_data: CreaturesData
    ) -> bool:
        """Process any pending level-up evolutions. Returns True if evolution started."""
        if self.evolution_queue and self.state == EvolutionState.CHECKING:
            party_index, evolution_req = self.evolution_queue.pop(0)
            self.start_evolution(party_index, evolution_req)
            return True
        return False

    def show_stone_evolution_menu(
        self, screen: pygame.Surface, player: Player, party_index: int
    ) -> List[EvolutionRequirement]:
        """Show available stone evolutions for a creature."""
        available_evolutions = self.check_stone_evolutions(player, party_index)

        if not available_evolutions:
            return []

        # Draw stone evolution menu
        menu_width, menu_height = 400, 200 + (len(available_evolutions) * 40)
        menu_x = (SCREEN_WIDTH - menu_width) // 2
        menu_y = (SCREEN_HEIGHT - menu_height) // 2

        # Background
        pygame.draw.rect(
            screen, (255, 255, 255), (menu_x, menu_y, menu_width, menu_height)
        )
        pygame.draw.rect(
            screen, (0, 0, 0), (menu_x, menu_y, menu_width, menu_height), 3
        )

        # Title
        title = "Choose Evolution Stone:"
        title_surface = self._get_font().render(title, True, (0, 0, 0))
        title_rect = title_surface.get_rect(
            center=(menu_x + menu_width // 2, menu_y + 30)
        )
        screen.blit(title_surface, title_rect)

        # Evolution options
        for i, evolution_req in enumerate(available_evolutions):
            stone_name = evolution_req.stone.replace("_", " ").title()
            option_text = f"{stone_name} → {evolution_req.evolves_to}"
            option_y = menu_y + 80 + (i * 40)

            button_rect = pygame.Rect(menu_x + 20, option_y, menu_width - 40, 30)
            draw_button(
                screen,
                option_text,
                menu_x + 20,
                option_y,
                menu_width - 40,
                30,
                (100, 150, 255),
                (255, 255, 255),
            )

        # Cancel button
        cancel_rect = pygame.Rect(
            menu_x + menu_width // 2 - 50, menu_y + menu_height - 50, 100, 30
        )
        draw_button(
            screen,
            "Cancel",
            menu_x + menu_width // 2 - 50,
            menu_y + menu_height - 50,
            100,
            30,
            (200, 100, 100),
            (255, 255, 255),
        )

        return available_evolutions

    def handle_stone_menu_click(
        self,
        pos: Tuple[int, int],
        available_evolutions: List[EvolutionRequirement],
        party_index: int,
    ) -> Optional[EvolutionRequirement]:
        """Handle clicks on stone evolution menu."""
        if not available_evolutions:
            return None

        menu_width, menu_height = 400, 200 + (len(available_evolutions) * 40)
        menu_x = (SCREEN_WIDTH - menu_width) // 2
        menu_y = (SCREEN_HEIGHT - menu_height) // 2

        # Check evolution option buttons
        for i, evolution_req in enumerate(available_evolutions):
            option_y = menu_y + 80 + (i * 40)
            button_rect = pygame.Rect(menu_x + 20, option_y, menu_width - 40, 30)
            if button_rect.collidepoint(pos):
                self.start_evolution(party_index, evolution_req)
                return evolution_req

        # Check cancel button
        cancel_rect = pygame.Rect(
            menu_x + menu_width // 2 - 50, menu_y + menu_height - 50, 100, 30
        )
        if cancel_rect.collidepoint(pos):
            return None

        return None


# Global evolution system instance (lazy initialization)
evolution_system = None


def get_evolution_system():
    """Get the global evolution system instance, creating it if needed."""
    global evolution_system
    if evolution_system is None:
        evolution_system = EvolutionSystem()
    return evolution_system
