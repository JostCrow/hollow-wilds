#!/usr/bin/env python3
"""
Script to automatically add evolution requirements to creatures in the JSON file.
"""

import json
import os
import shutil
from datetime import datetime


def get_stone_for_type(creature_types):
    """Get the appropriate evolution stone for a creature's types."""
    type_to_stone = {
        "Fire": "fire_stone",
        "Water": "water_stone",
        "Grass": "leaf_stone",
        "Ground": "earth_stone",
        "Light Magic": "light_stone",
        "Dark Magic": "dark_stone",
        "Electric": "thunder_stone",
        "Ice": "ice_stone",
        "Normal": "moon_stone",  # Generic stone for Normal types
    }

    # Use the first type's stone, or moon_stone as fallback
    primary_type = creature_types[0] if creature_types else "Normal"
    return type_to_stone.get(primary_type, "moon_stone")


def determine_evolution_level(creature_name, evolves_to, all_creature_names):
    """Determine what level a creature should evolve at based on its position in evolution chain."""
    # Count how many creatures in the evolution chain come before this one
    # This is a simple heuristic - first stage evolves at 16, second at 36

    # Check if this creature's name suggests it's a basic form
    basic_suffixes = ["cub", "pup", "plant", "ling", "kit"]
    intermediate_suffixes = ["on", "anis", "don"]

    name_lower = creature_name.lower()

    for suffix in basic_suffixes:
        if name_lower.endswith(suffix):
            return 16

    for suffix in intermediate_suffixes:
        if name_lower.endswith(suffix):
            return 36

    # Default: if we can't determine, use 16 for safety
    return 16


def update_evolution_requirements():
    """Update creatures.json to add missing evolution requirements."""

    # File paths
    creatures_file = "data/creatures.json"
    backup_file = (
        f"data/creatures_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    print(f"Creating backup at {backup_file}")
    shutil.copy2(creatures_file, backup_file)

    # Load creatures data
    with open(creatures_file, "r") as f:
        creatures = json.load(f)

    print(f"Loaded {len(creatures)} creatures")

    # Get all creature names for reference
    all_names = {creature["name"] for creature in creatures}

    updated_count = 0

    for creature in creatures:
        name = creature["name"]
        evolves_to = creature.get("evolves_to")
        existing_requirements = creature.get("evolution_requirements", [])

        # Skip if no evolution or already has requirements
        if not evolves_to or existing_requirements:
            # Ensure creatures that don't evolve have empty requirements array
            if not evolves_to and "evolution_requirements" not in creature:
                creature["evolution_requirements"] = []
                updated_count += 1
            continue

        # Skip creatures that evolve to multiple forms (special cases)
        if isinstance(evolves_to, list):
            print(f"Skipping {name} - has multiple evolution paths: {evolves_to}")
            creature["evolution_requirements"] = []
            continue

        # Determine evolution level and stone
        evolution_level = determine_evolution_level(name, evolves_to, all_names)
        stone = get_stone_for_type(creature["typing"])

        # Add evolution requirements
        evolution_requirements = [
            {"type": "level", "level": evolution_level, "evolves_to": evolves_to},
            {"type": "stone", "stone": stone, "evolves_to": evolves_to},
        ]

        creature["evolution_requirements"] = evolution_requirements
        updated_count += 1

        print(f"Updated {name}: level {evolution_level} or {stone} -> {evolves_to}")

    # Save updated data
    with open(creatures_file, "w") as f:
        json.dump(creatures, f, indent=2)

    print(f"\nUpdated {updated_count} creatures")
    print(f"Backup saved at {backup_file}")
    print("Evolution requirements update complete!")


if __name__ == "__main__":
    update_evolution_requirements()
