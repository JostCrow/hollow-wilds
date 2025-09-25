import json
import os
from datetime import datetime
from .config import SAVE_FILE, TILE_SIZE
from .player import Player


def save_game(player, current_route):
    """Save player state to JSON."""
    save_data = {
        "name": player.name,
        "gender": player.gender,
        "party": player.party,
        "current_route": current_route,
        "position": {"tx": player.grid_x, "ty": player.grid_y},
        "timestamp": datetime.now().isoformat(),
        "last_autosave": player.last_autosave,
    }
    with open(SAVE_FILE, "w") as f:
        json.dump(save_data, f, indent=4)
    print("Game saved.")


def load_game():
    """Load player state from JSON, or return None if no save."""
    if os.path.exists(SAVE_FILE):
        with open(SAVE_FILE, "r") as f:
            data = json.load(f)
        player = Player(data["name"], data["gender"], data["party"])
        player.grid_x = data["position"]["tx"]
        player.grid_y = data["position"]["ty"]
        player.x = player.grid_x * TILE_SIZE + TILE_SIZE // 2
        player.y = player.grid_y * TILE_SIZE + TILE_SIZE // 2
        player.last_autosave = data.get("last_autosave", 0)
        return player, data["current_route"]
    return None, None
