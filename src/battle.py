"""
Battle system for Pokémon-style battles.
Handles damage calculation, AI move selection, and battle mechanics.
"""

import random
from enum import Enum

from src.models import Move, MoveCategory, PartyCreature
from src.type_chart import get_type_effectiveness, get_effectiveness_message

DamageEvent = tuple[PartyCreature, int]


class BattleDifficulty(str, Enum):
    EASY = "easy"
    NORMAL = "normal"
    HARD = "hard"


class BattleResult:
    """Result of a battle turn."""

    def __init__(self) -> None:
        self.attacker_name: str = ""
        self.defender_name: str = ""
        self.move_name: str = ""
        self.damage: int = 0
        self.hit: bool = True
        self.critical: bool = False
        self.effectiveness: float = 1.0
        self.struggle: bool = False
        self.messages: list[str] = []
        self.damage_events: list[DamageEvent] = []
        self.attacker: PartyCreature | None = None
        self.primary_target: PartyCreature | None = None

    def add_message(self, message: str) -> None:
        """Add a message to the battle result."""
        self.messages.append(message)

    def queue_damage(self, target: PartyCreature, amount: int) -> None:
        """Queue damage for later application and track the primary target."""
        if amount <= 0:
            return
        _add_pending_damage(target, amount)
        self.damage_events.append((target, amount))
        if self.primary_target is None:
            self.primary_target = target

    def commit_damage(self) -> None:
        """Apply queued damage to the associated creatures once."""
        if not self.damage_events:
            return
        for target, _ in self.damage_events:
            _apply_pending_damage(target)
        self.damage_events.clear()

    def has_pending_damage(self) -> bool:
        """Return True if this result has any queued damage."""
        return any(_get_pending_damage(target) > 0 for target, _ in self.damage_events)


def _get_pending_damage(creature: PartyCreature) -> int:
    """Return damage queued but not yet applied for a creature."""
    return getattr(creature, "_pending_damage", 0)


def _add_pending_damage(creature: PartyCreature, amount: int) -> None:
    """Accumulate pending damage on the creature."""
    if amount <= 0:
        return
    current = _get_pending_damage(creature)
    setattr(creature, "_pending_damage", current + amount)


def _apply_pending_damage(creature: PartyCreature) -> None:
    """Apply pending damage to the creature's actual HP damage tracker."""
    pending = _get_pending_damage(creature)
    if pending <= 0:
        return
    creature.damage = min(creature.hp, creature.damage + pending)
    setattr(creature, "_pending_damage", 0)


def _clear_pending_damage(creature: PartyCreature) -> None:
    """Reset any pending damage for the creature."""
    setattr(creature, "_pending_damage", 0)


def calculate_damage(
    attacker: PartyCreature,
    defender: PartyCreature,
    move: Move,
    is_critical: bool = False,
) -> int:
    """
    Calculate damage using the Pokémon damage formula.

    Damage = ((((2 * Level / 5) + 2) * Power * Attack / Defense) / 50 + 2) * Modifiers

    Modifiers include:
    - Type effectiveness (0x, 0.25x, 0.5x, 1x, 2x, 4x)
    - STAB (Same Type Attack Bonus): 1.5x
    - Critical hit: 1.5x
    - Random factor: 0.85-1.0
    """
    if move.power == 0:
        return 0  # Status moves don't deal damage

    # Base damage calculation
    level = attacker.level
    power = move.power

    # Determine attack and defense stats based on move category
    if move.category == MoveCategory.PHYSICAL:
        attack = attacker.attack
        defense = defender.defence
    elif move.category == MoveCategory.SPECIAL:
        attack = attacker.special_attack
        defense = defender.special_defence
    else:  # STATUS
        return 0

    # Base calculation
    base = ((2 * level / 5) + 2) * power * attack / defense
    base = (base / 50) + 2

    # Type effectiveness
    effectiveness = get_type_effectiveness(move.type, defender.creature.typing)

    # STAB (Same Type Attack Bonus)
    stab = 1.5 if move.type in attacker.creature.typing else 1.0

    # Critical hit
    critical_multiplier = 1.5 if is_critical else 1.0

    # Random factor (0.85 to 1.0)
    random_factor = random.uniform(0.85, 1.0)

    # Final damage
    damage = base * effectiveness * stab * critical_multiplier * random_factor
    damage = max(1, int(damage))  # Minimum 1 damage

    return damage


def check_accuracy(move: Move) -> bool:
    """Check if a move hits based on its accuracy."""
    if move.accuracy >= 100:
        return True
    return random.randint(1, 100) <= move.accuracy


def check_critical_hit() -> bool:
    """Check if an attack is a critical hit (1/16 chance)."""
    return random.randint(1, 16) == 1


def struggle_damage(attacker: PartyCreature, defender: PartyCreature) -> int:
    """
    Calculate struggle damage (when no moves have PP left).
    Random damage between 1% and 10% of defender's HP.
    """
    max_hp = defender.hp
    min_damage = max(1, int(max_hp * 0.01))
    max_damage = max(1, int(max_hp * 0.10))
    return random.randint(min_damage, max_damage)


def execute_move(
    attacker: PartyCreature, defender: PartyCreature, move: Move | None = None
) -> BattleResult:
    """
    Execute a move and return the battle result.

    Args:
        attacker: The attacking creature
        defender: The defending creature
        move: The move to use (None for struggle)

    Returns:
        BattleResult with damage, messages, and other info
    """
    result = BattleResult()
    result.attacker = attacker
    result.attacker_name = attacker.creature.name
    result.defender_name = defender.creature.name

    # Struggle if no move provided
    if move is None:
        result.struggle = True
        result.move_name = "Struggle"
        damage = struggle_damage(attacker, defender)
        result.damage = damage
        result.queue_damage(defender, damage)
        result.add_message(f"{attacker.creature.name} has no moves left!")
        result.add_message(f"{attacker.creature.name} struggles and hurts itself!")

        # Attacker also takes recoil damage
        recoil = struggle_damage(defender, attacker)
        result.queue_damage(attacker, recoil)
        result.add_message(f"{attacker.creature.name} is hurt by recoil!")

        return result

    # Deduct PP
    move.uses -= 1

    result.move_name = move.name
    result.add_message(f"{attacker.creature.name} used {move.name}!")

    # Check accuracy
    if not check_accuracy(move):
        result.hit = False
        result.add_message(f"{attacker.creature.name}'s attack missed!")
        return result

    # Check critical hit
    is_critical = check_critical_hit()
    result.critical = is_critical

    # Calculate damage
    damage = calculate_damage(attacker, defender, move, is_critical)
    result.damage = damage

    # Queue damage to be applied later
    result.queue_damage(defender, damage)

    # Get effectiveness
    result.effectiveness = get_type_effectiveness(move.type, defender.creature.typing)

    # Add messages
    if is_critical:
        result.add_message("A critical hit!")

    effectiveness_msg = get_effectiveness_message(result.effectiveness)
    if effectiveness_msg:
        result.add_message(effectiveness_msg)

    return result


def select_ai_move(
    attacker: PartyCreature,
    defender: PartyCreature,
    difficulty: BattleDifficulty = BattleDifficulty.EASY,
) -> Move | None:
    """
    AI selects a move based on difficulty.

    Args:
        attacker: The AI's creature
        defender: The opponent's creature
        difficulty: AI difficulty level

    Returns:
        Selected move, or None if no moves available
    """
    # Filter out moves with no PP left
    available_moves = [m for m in attacker.moves if m.uses > 0]

    if not available_moves:
        return None  # Struggle

    if difficulty == BattleDifficulty.EASY:
        # Easy: Random move
        return random.choice(available_moves)

    elif difficulty == BattleDifficulty.NORMAL:
        # Normal: Prefer super effective moves, otherwise random
        best_moves: list[Move] = []
        best_effectiveness = 0.0

        for move in available_moves:
            effectiveness = get_type_effectiveness(move.type, defender.creature.typing)
            if effectiveness > best_effectiveness:
                best_effectiveness = effectiveness
                best_moves = [move]
            elif effectiveness == best_effectiveness:
                best_moves.append(move)

        # 70% chance to use best move, 30% random
        if random.random() < 0.7 and best_moves:
            return random.choice(best_moves)
        return random.choice(available_moves)

    else:  # HARD
        # Hard: Always choose the best move (highest expected damage)
        best_move: Move | None = None
        best_score = 0.0

        for move in available_moves:
            # Calculate expected damage as a score
            effectiveness = get_type_effectiveness(move.type, defender.creature.typing)
            stab = 1.5 if move.type in attacker.creature.typing else 1.0

            # Use attack and defense stats
            if move.category == MoveCategory.PHYSICAL:
                attack_stat = attacker.attack
                defense_stat = defender.defence
            elif move.category == MoveCategory.SPECIAL:
                attack_stat = attacker.special_attack
                defense_stat = defender.special_defence
            else:
                continue  # Skip status moves

            # Simple damage estimate
            score = (
                move.power
                * (attack_stat / defense_stat)
                * effectiveness
                * stab
                * (move.accuracy / 100)
            )

            if score > best_score:
                best_score = score
                best_move = move

        return best_move if best_move else random.choice(available_moves)


def calculate_exp_gain(defeated: PartyCreature, is_wild: bool = True) -> int:
    """
    Calculate experience points gained from defeating a creature.

    Args:
        defeated: The defeated creature
        is_wild: Whether the defeated creature was wild (vs trainer)

    Returns:
        Experience points to award
    """
    # Base experience formula
    base_exp = defeated.creature.base_stats.total
    level = defeated.level

    # Wild Pokémon give less experience than trainer Pokémon
    trainer_modifier = 1.0 if is_wild else 1.5

    exp = int((base_exp * level * trainer_modifier) / 7)
    return max(1, exp)


def level_up(creature: PartyCreature) -> dict[str, int]:
    """
    Level up a creature and recalculate stats.

    Args:
        creature: The creature to level up

    Returns:
        Dictionary of stat increases
    """
    from src.data_loader import calculate_stats_based_on_level

    old_stats = {
        "hp": creature.hp,
        "attack": creature.attack,
        "defence": creature.defence,
        "special_attack": creature.special_attack,
        "special_defence": creature.special_defence,
        "speed": creature.speed,
    }

    creature.level += 1

    # Recalculate stats
    hp, attack, defence, special_attack, special_defence, speed = (
        calculate_stats_based_on_level(creature.creature, creature.level)
    )

    creature.hp = hp
    creature.attack = attack
    creature.defence = defence
    creature.special_attack = special_attack
    creature.special_defence = special_defence
    creature.speed = speed

    # Calculate stat gains
    stat_gains = {
        "hp": creature.hp - old_stats["hp"],
        "attack": creature.attack - old_stats["attack"],
        "defence": creature.defence - old_stats["defence"],
        "special_attack": creature.special_attack - old_stats["special_attack"],
        "special_defence": creature.special_defence - old_stats["special_defence"],
        "speed": creature.speed - old_stats["speed"],
    }

    return stat_gains


def is_fainted(creature: PartyCreature) -> bool:
    """Check if a creature has fainted (HP <= 0) including pending damage."""
    total_damage = creature.damage + _get_pending_damage(creature)
    return total_damage >= creature.hp


def heal_party(party: list[PartyCreature]) -> None:
    """Fully heal all creatures in the party and restore move PP."""
    for creature in party:
        creature.damage = 0
        _clear_pending_damage(creature)
        for move in creature.moves:
            move.uses = move.max_uses
