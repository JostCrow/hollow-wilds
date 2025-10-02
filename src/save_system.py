import json
import os
from typing import Any

from pydantic.main import IncEx

from src.models import (
    Player,
    PartyCreature,
)
from src.config import SAVE_FILE


def save_game(player: Player, route_key: str):
    """Save player state to JSON."""
    save_data = player.model_dump(mode="json", exclude={"last_move_time"})
    save_data["route_key"] = route_key
    with open(SAVE_FILE, "w") as f:
        json.dump(save_data, f, indent=4)
    print("Game saved.")


def load_game() -> tuple[Player | None, str | None]:
    """Load player state from JSON, or return None if no save."""
    if not os.path.exists(SAVE_FILE):
        return None, None
    with open(SAVE_FILE, "r") as f:
        data = json.load(f)  # pyright: ignore[reportAny]
    try:
        player = Player(**data)  # pyright: ignore[reportAny]
        return player, data.get("route_key", None)  # pyright: ignore[reportAny]
    except (KeyError, Exception) as e:
        print(f"Error loading save: {e}")
        return None, None
