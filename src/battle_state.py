"""
Battle state management for tracking the current phase of battle.
"""

from enum import Enum
from typing import Optional

from src.models import Move, PartyCreature
from src.battle import BattleResult, BattleDifficulty


class BattlePhase(str, Enum):
    """Different phases of battle."""

    MAIN_MENU = "main_menu"  # FIGHT, BAG, Creatures, RUN
    MOVE_SELECT = "move_select"  # Selecting which move to use
    BAG_MENU = "bag_menu"  # Selecting items from bag
    PARTY_SELECT = "party_select"  # Selecting which party member to switch to
    EXECUTING = "executing"  # Executing the turn
    SHOWING_RESULTS = "showing_results"  # Showing battle results/messages
    VICTORY = "victory"  # Player won
    DEFEAT = "defeat"  # Player lost
    SWITCH_REQUIRED = "switch_required"  # Player's creature fainted, must switch


class BattleState:
    """Tracks the current state of an ongoing battle."""

    def __init__(self, wild_pokemon: PartyCreature, player_pokemon: PartyCreature):
        self.wild_pokemon = wild_pokemon
        self.player_pokemon = player_pokemon

        # Battle phase tracking
        self.phase = BattlePhase.MAIN_MENU
        self.selected_option = 0  # Index of currently selected option

        # Move selection
        self.player_move: Optional[Move] = None
        self.enemy_move: Optional[Move] = None

        # Battle results
        self.current_results: list[BattleResult] = []
        self.result_index = 0  # Which result message we're showing
        self.result_timer = 0.0  # Time to show current result

        # AI difficulty
        self.difficulty = BattleDifficulty.EASY

        # Experience and leveling
        self.exp_gained = 0
        self.leveled_up = False
        self.level_up_stats: dict[str, int] = {}

        # Switch tracking
        self.force_switch = False  # True when player must switch due to faint
        self.pending_switch_index: Optional[int] = None

    def reset_for_new_turn(self):
        """Reset state for a new turn."""
        self.phase = BattlePhase.MAIN_MENU
        self.selected_option = 0
        self.player_move = None
        self.enemy_move = None
        self.current_results = []
        self.result_index = 0
        self.result_timer = 0.0

    def add_result(self, result: BattleResult):
        """Add a battle result to display."""
        self.current_results.append(result)

    def has_more_results(self) -> bool:
        """Check if there are more results to show."""
        return self.result_index < len(self.current_results)

    def get_current_result(self) -> Optional[BattleResult]:
        """Get the current result being displayed."""
        if self.result_index < len(self.current_results):
            return self.current_results[self.result_index]
        return None

    def advance_result(self):
        """Move to the next result message."""
        self.result_index += 1
        self.result_timer = 0.0
