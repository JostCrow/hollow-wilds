#!/usr/bin/env python3
"""
Utility module for loading and resolving move data.
Provides functions to work with the separate moves database.
"""

import json
import os
from typing import Dict, List, Optional, Any

# Global cache for moves data
_moves_cache: Optional[Dict[str, Any]] = None


def load_moves_database(moves_file: str = "data/moves.json") -> Dict[str, Any]:
    """
    Load the moves database from JSON file.

    Args:
        moves_file: Path to the moves JSON file

    Returns:
        Dictionary containing all move data

    Raises:
        FileNotFoundError: If the moves file doesn't exist
        json.JSONDecodeError: If the JSON is invalid
    """
    global _moves_cache

    # Return cached data if available
    if _moves_cache is not None:
        return _moves_cache

    if not os.path.exists(moves_file):
        raise FileNotFoundError(f"Moves database not found: {moves_file}")

    try:
        with open(moves_file, "r") as f:
            _moves_cache = json.load(f)
        return _moves_cache
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(f"Invalid JSON in moves database: {e}")


def get_move_data(move_key: str) -> Optional[Dict[str, Any]]:
    """
    Get move data by move key.

    Args:
        move_key: The key identifier for the move

    Returns:
        Move data dictionary, or None if not found
    """
    try:
        moves_db = load_moves_database()
        return moves_db.get(move_key)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def get_move_name(move_key: str) -> str:
    """
    Get the display name of a move by its key.

    Args:
        move_key: The key identifier for the move

    Returns:
        Move name, or the key itself if move not found
    """
    move_data = get_move_data(move_key)
    if move_data:
        return move_data.get("name", move_key)
    return move_key


def resolve_creature_moves(moveset: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Resolve a creature's moveset by looking up full move data.

    Args:
        moveset: List of move references with 'move_key' and 'level'

    Returns:
        List of complete move dictionaries with all move data plus level
    """
    resolved_moves = []

    for move_ref in moveset:
        move_key = move_ref.get("move_key")
        level = move_ref.get("level", 1)

        if not move_key:
            continue

        move_data = get_move_data(move_key)
        if move_data:
            # Create a copy of move data and add the level
            complete_move = move_data.copy()
            complete_move["level"] = level
            resolved_moves.append(complete_move)
        else:
            # Fallback: create a basic move entry if data not found
            resolved_moves.append(
                {
                    "name": move_key.replace("_", " ").title(),
                    "level": level,
                    "uses": 10,
                    "max_uses": 10,
                    "power": 40,
                    "accuracy": 100,
                    "type": "Normal",
                    "category": "physical",
                }
            )

    return resolved_moves


def get_moves_by_type(move_type: str) -> Dict[str, Dict[str, Any]]:
    """
    Get all moves of a specific type.

    Args:
        move_type: The type of moves to filter by (e.g., "Fire", "Water")

    Returns:
        Dictionary of move_key -> move_data for moves of the specified type
    """
    try:
        moves_db = load_moves_database()
        return {
            key: data for key, data in moves_db.items() if data.get("type") == move_type
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def get_moves_by_category(category: str) -> Dict[str, Dict[str, Any]]:
    """
    Get all moves of a specific category.

    Args:
        category: The category to filter by ("physical", "special", "status")

    Returns:
        Dictionary of move_key -> move_data for moves of the specified category
    """
    try:
        moves_db = load_moves_database()
        return {
            key: data
            for key, data in moves_db.items()
            if data.get("category") == category
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def get_moves_by_power_range(
    min_power: int, max_power: int
) -> Dict[str, Dict[str, Any]]:
    """
    Get all moves within a specific power range.

    Args:
        min_power: Minimum power (inclusive)
        max_power: Maximum power (inclusive)

    Returns:
        Dictionary of move_key -> move_data for moves in the power range
    """
    try:
        moves_db = load_moves_database()
        return {
            key: data
            for key, data in moves_db.items()
            if min_power <= data.get("power", 0) <= max_power
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def list_all_move_keys() -> List[str]:
    """
    Get a list of all available move keys.

    Returns:
        List of all move keys in the database
    """
    try:
        moves_db = load_moves_database()
        return list(moves_db.keys())
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def validate_move_key(move_key: str) -> bool:
    """
    Check if a move key exists in the database.

    Args:
        move_key: The move key to validate

    Returns:
        True if the move exists, False otherwise
    """
    return get_move_data(move_key) is not None


def clear_moves_cache():
    """
    Clear the cached moves data, forcing a reload on next access.
    Useful for testing or if the moves file has been updated.
    """
    global _moves_cache
    _moves_cache = None


def get_database_stats() -> Dict[str, Any]:
    """
    Get statistics about the moves database.

    Returns:
        Dictionary with database statistics
    """
    try:
        moves_db = load_moves_database()

        # Count by type
        type_counts = {}
        category_counts = {}
        power_ranges = {"0": 0, "1-50": 0, "51-100": 0, "101+": 0}

        for move_data in moves_db.values():
            # Count types
            move_type = move_data.get("type", "Unknown")
            type_counts[move_type] = type_counts.get(move_type, 0) + 1

            # Count categories
            category = move_data.get("category", "Unknown")
            category_counts[category] = category_counts.get(category, 0) + 1

            # Count power ranges
            power = move_data.get("power", 0)
            if power == 0:
                power_ranges["0"] += 1
            elif power <= 50:
                power_ranges["1-50"] += 1
            elif power <= 100:
                power_ranges["51-100"] += 1
            else:
                power_ranges["101+"] += 1

        return {
            "total_moves": len(moves_db),
            "types": type_counts,
            "categories": category_counts,
            "power_ranges": power_ranges,
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {"error": "Could not load moves database"}


# Convenience function for backward compatibility
def get_creature_moveset(creature_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Get the resolved moveset for a creature.

    Args:
        creature_data: Creature data dictionary containing moveset

    Returns:
        List of complete move dictionaries
    """
    moveset = creature_data.get("moveset", [])
    return resolve_creature_moves(moveset)
