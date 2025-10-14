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
    """Tracks the current state of an ongoing battle.

    Notes:
    - `player_pokemon` may be omitted at construction time to force the
      player to choose which Pokémon to send out when the battle begins.
    - Internally we store the player's active Pokemon in `_player_pokemon`
      and expose a `player_pokemon` property that returns a safe placeholder
      when none has been selected yet so rendering code does not crash.
    """

    def __init__(
        self, wild_pokemon: PartyCreature, player_pokemon: PartyCreature | None = None
    ):
        self.wild_pokemon = wild_pokemon
        # Store internal reference so we can provide a safe placeholder via the property
        self._player_pokemon: PartyCreature | None = player_pokemon
        # If no player_pokemon provided, we require an initial choice from the player
        self.initial_choice_required: bool = player_pokemon is None

        # Battle phase tracking
        # If an initial choice is required, start in party selection mode
        self.phase = (
            BattlePhase.PARTY_SELECT
            if self.initial_choice_required
            else BattlePhase.MAIN_MENU
        )
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
        # If initial choice is required, force_switch is set so the UI will
        # present the party selection and prevent escaping the selection.
        self.force_switch = True if self.initial_choice_required else False
        self.pending_switch_index: Optional[int] = None

    @property
    def player_pokemon(self) -> PartyCreature:
        """
        Return the currently selected player Pokemon. If none has been selected yet
        (e.g., at the very start of a battle where we want the player to choose),
        return a minimal placeholder object so rendering and other logic that
        accesses attributes like `.creature` or `.hp` do not fail.

        The placeholder has:
          - creature.name == "Unknown"
          - creature.sprite == None
          - hp == 1, damage == 1 (so HP ratio calculations behave)
          - moves == []
          - speed == 0
        """
        if self._player_pokemon is not None:
            return self._player_pokemon

        # Lazy import to avoid adding top-level dependency clutter
        from types import SimpleNamespace

        creature_placeholder = SimpleNamespace(name="Unknown", sprite=None)
        placeholder = SimpleNamespace(
            creature=creature_placeholder,
            level=1,
            hp=1,
            damage=1,
            moves=[],
            speed=0,
        )
        return placeholder

    @player_pokemon.setter
    def player_pokemon(self, value: PartyCreature | None) -> None:
        """
        Set the active player Pokemon. If a real PartyCreature is provided,
        clear the `initial_choice_required` and `force_switch` flags so normal
        battle flow can continue.
        """
        self._player_pokemon = value
        if value is not None:
            # Player has selected a Pokemon to send out
            self.initial_choice_required = False
            # Unset forced switching if it was set for initial choice
            self.force_switch = False
            # If we were in the party selection phase solely for initial choice,
            # move back to the main battle menu so the player can act
            if self.phase == BattlePhase.PARTY_SELECT:
                self.phase = BattlePhase.MAIN_MENU

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
