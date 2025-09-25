import json
import os
from .config import CREATURES_FILE, ROUTES_FILE


def load_json(file_path):
    """Load JSON file with fallback to empty dict."""
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return {}


# Load global data (imported once in main)
creatures_data = load_json(CREATURES_FILE)
routes_data = load_json(ROUTES_FILE)

# Prepare starters (first 3 creatures; fallback if data missing)
starters = (creatures_data[0], creatures_data[3], creatures_data[6])


def find_creature(name):
    """Helper to find a creature by name in the list."""
    if not creatures_data:
        return None
    for creature in creatures_data:
        if creature.get("name") == name:
            return creature
    return None
