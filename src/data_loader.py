import json
import os
from typing import Any
import random
from .config import CREATURES_FILE, ROUTES_FILE, MOVES_FILE
from .models import Creature, CreaturesData, RoutesData, Move, MovesData


def load_json(file_path: str) -> Any:
    """Load JSON file with fallback to empty dict."""
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return {}


# Load global data (imported once in main)
raw_moves = load_json(MOVES_FILE)
moves_data = MovesData.model_validate(raw_moves)

raw_creatures = load_json(CREATURES_FILE)
creatures_data = CreaturesData.model_validate(raw_creatures)

raw_routes = load_json(ROUTES_FILE)
routes_data = RoutesData.model_validate(raw_routes)

# Prepare starters (first 3 creatures; fallback if data missing)
starters: list[Creature] = [
    creatures_data.get_by_name("Aquapup"),
    creatures_data.get_by_name("Flamcub"),
    creatures_data.get_by_name("Terraplant"),
]


def find_creature(name: str) -> Creature:
    """Helper to find a creature by name in the list."""
    return creatures_data.get_by_name(name)


def calculate_stats_based_on_level(
    creature: Creature, level: int
) -> tuple[int, int, int, int, int, int]:
    """This is the base stats of the creature and we modify this based on the level. There is a random change for some states to move up and down for every level between 0 and 2 points.
    We return the HP, Attack, Defence, Special attack, Special Defence and speed for this calculation"""
    if level < 1:
        level = 1
    base_stats = creature.base_stats
    base_hp = base_stats.hp
    base_attack = base_stats.attack
    base_defense = base_stats.defense
    base_sp_attack = base_stats.sp_attack
    base_sp_defense = base_stats.sp_defense
    base_speed = base_stats.speed
    iv_hp = random.randint(0, 31)
    iv_attack = random.randint(0, 31)
    iv_defense = random.randint(0, 31)
    iv_sp_attack = random.randint(0, 31)
    iv_sp_defense = random.randint(0, 31)
    iv_speed = random.randint(0, 31)
    hp = int((2 * base_hp + iv_hp) * level / 100) + level + 10
    attack = int((2 * base_attack + iv_attack) * level / 100 + 5)
    defense = int((2 * base_defense + iv_defense) * level / 100 + 5)
    sp_attack = int((2 * base_sp_attack + iv_sp_attack) * level / 100 + 5)
    sp_defense = int((2 * base_sp_defense + iv_sp_defense) * level / 100 + 5)
    speed = int((2 * base_speed + iv_speed) * level / 100 + 5)
    return (hp, attack, defense, sp_attack, sp_defense, speed)


def generate_moves(creature: Creature, level: int) -> list[Move]:
    def weighted_sample(population, weights, k):
        selected = []
        remaining = list(zip(population, weights))
        while len(selected) < k and remaining:
            total_weight = sum(w for _, w in remaining)
            if total_weight == 0:
                break
            probs = [w / total_weight for _, w in remaining]
            choice_idx = random.choices(range(len(remaining)), weights=probs)[0]
            selected.append(remaining.pop(choice_idx)[0])
        return selected

    available_moves: list[Move] = []
    weights: list[int] = []
    for creature_move in creature.moveset:
        if creature_move.level <= level:
            try:
                move_definition = moves_data.get_by_key(creature_move.move_key)
            except Exception:
                continue
            move_instance = Move(
                name=move_definition.name,
                uses=move_definition.uses,
                max_uses=move_definition.max_uses,
                power=move_definition.power,
                accuracy=move_definition.accuracy,
                type=move_definition.type,
                category=move_definition.category,
                learned_at_level=creature_move.level,
            )
            available_moves.append(move_instance)
            weights.append(creature_move.level)

    if len(available_moves) <= 4:
        return available_moves
    else:
        return weighted_sample(available_moves, weights, 4)
