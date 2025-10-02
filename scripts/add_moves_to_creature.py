#!/usr/bin/env python3
"""
Utility script for adding moves to creatures.
Makes it easy to add new moves to specific creatures using the refactored move system.
"""

import json
import sys
from moves_utils import validate_move_key, get_move_data, list_all_move_keys


def load_creatures():
    """Load creatures data"""
    try:
        with open("data/creatures.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: creatures.json not found")
        return None
    except json.JSONDecodeError:
        print("Error: Invalid JSON in creatures.json")
        return None


def save_creatures(creatures):
    """Save creatures data"""
    try:
        with open("data/creatures.json", "w") as f:
            json.dump(creatures, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving creatures.json: {e}")
        return False


def find_creature_by_name(creatures, name):
    """Find a creature by name (case-insensitive)"""
    name_lower = name.lower()
    for i, creature in enumerate(creatures):
        if creature["name"].lower() == name_lower:
            return i, creature
    return None, None


def list_creature_names(creatures):
    """List all creature names"""
    names = [creature["name"] for creature in creatures]
    return sorted(names)


def show_creature_moves(creature):
    """Show current moves for a creature"""
    print(f"\nCurrent moves for {creature['name']}:")
    print("-" * 40)

    moveset = creature.get("moveset", [])
    if not moveset:
        print("  No moves currently learned")
        return

    # Sort by level
    sorted_moves = sorted(moveset, key=lambda x: x.get("level", 1))

    for move_ref in sorted_moves:
        move_key = move_ref.get("move_key", "unknown")
        level = move_ref.get("level", 1)

        # Get move details
        move_data = get_move_data(move_key)
        if move_data:
            move_name = move_data["name"]
            power = move_data.get("power", 0)
            move_type = move_data.get("type", "Unknown")
            print(
                f"  Level {level:2d}: {move_name} (Power: {power}, Type: {move_type})"
            )
        else:
            print(f"  Level {level:2d}: {move_key} (Move not found in database)")


def add_move_to_creature(creature, move_key, level):
    """Add a move to a creature's moveset"""
    moveset = creature.get("moveset", [])

    # Check if move already exists
    for move_ref in moveset:
        if move_ref.get("move_key") == move_key:
            print(f"Warning: {creature['name']} already knows {move_key}")
            return False

    # Add the new move
    new_move = {"move_key": move_key, "level": level}
    moveset.append(new_move)
    creature["moveset"] = moveset

    return True


def remove_move_from_creature(creature, move_key):
    """Remove a move from a creature's moveset"""
    moveset = creature.get("moveset", [])

    # Find and remove the move
    for i, move_ref in enumerate(moveset):
        if move_ref.get("move_key") == move_key:
            removed_move = moveset.pop(i)
            creature["moveset"] = moveset
            return True, removed_move

    return False, None


def interactive_mode():
    """Run in interactive mode"""
    print("Pokemon Browser - Move Manager")
    print("=" * 40)

    creatures = load_creatures()
    if not creatures:
        return 1

    print(f"Loaded {len(creatures)} creatures")

    while True:
        print("\nOptions:")
        print("1. List all creatures")
        print("2. Show creature moves")
        print("3. Add move to creature")
        print("4. Remove move from creature")
        print("5. List available moves")
        print("6. Search moves by type")
        print("7. Quit")

        choice = input("\nEnter choice (1-7): ").strip()

        if choice == "1":
            names = list_creature_names(creatures)
            print(f"\nAll creatures ({len(names)}):")
            for i, name in enumerate(names, 1):
                print(f"{i:2d}. {name}")

        elif choice == "2":
            creature_name = input("Enter creature name: ").strip()
            idx, creature = find_creature_by_name(creatures, creature_name)
            if creature:
                show_creature_moves(creature)
            else:
                print(f"Creature '{creature_name}' not found")

        elif choice == "3":
            creature_name = input("Enter creature name: ").strip()
            idx, creature = find_creature_by_name(creatures, creature_name)
            if not creature:
                print(f"Creature '{creature_name}' not found")
                continue

            move_key = input("Enter move key: ").strip().lower()
            if not validate_move_key(move_key):
                print(f"Move '{move_key}' not found in moves database")
                print("Use option 5 to see available moves")
                continue

            try:
                level = int(input("Enter learning level: ").strip())
            except ValueError:
                print("Invalid level. Please enter a number.")
                continue

            if add_move_to_creature(creature, move_key, level):
                move_data = get_move_data(move_key)
                move_name = move_data["name"] if move_data else move_key
                print(f"Added {move_name} (level {level}) to {creature['name']}")

                # Save changes
                if save_creatures(creatures):
                    print("Changes saved successfully!")
                else:
                    print("Failed to save changes")

        elif choice == "4":
            creature_name = input("Enter creature name: ").strip()
            idx, creature = find_creature_by_name(creatures, creature_name)
            if not creature:
                print(f"Creature '{creature_name}' not found")
                continue

            show_creature_moves(creature)
            move_key = input("Enter move key to remove: ").strip().lower()

            success, removed_move = remove_move_from_creature(creature, move_key)
            if success:
                print(f"Removed {move_key} from {creature['name']}")
                if save_creatures(creatures):
                    print("Changes saved successfully!")
                else:
                    print("Failed to save changes")
            else:
                print(f"{creature['name']} doesn't know {move_key}")

        elif choice == "5":
            move_keys = list_all_move_keys()
            print(f"\nAll available moves ({len(move_keys)}):")

            # Group by first letter for easier reading
            current_letter = ""
            for move_key in sorted(move_keys):
                first_letter = move_key[0].upper()
                if first_letter != current_letter:
                    current_letter = first_letter
                    print(f"\n{first_letter}:")

                move_data = get_move_data(move_key)
                if move_data:
                    print(
                        f"  {move_key} -> {move_data['name']} (Power: {move_data.get('power', 0)}, Type: {move_data.get('type', 'Unknown')})"
                    )
                else:
                    print(f"  {move_key}")

        elif choice == "6":
            move_type = input("Enter move type (e.g., Fire, Water, Electric): ").strip()
            from moves_utils import get_moves_by_type

            type_moves = get_moves_by_type(move_type)

            if type_moves:
                print(f"\n{move_type} moves ({len(type_moves)}):")
                for move_key, move_data in sorted(type_moves.items()):
                    print(
                        f"  {move_key} -> {move_data['name']} (Power: {move_data.get('power', 0)})"
                    )
            else:
                print(f"No moves found for type '{move_type}'")

        elif choice == "7":
            print("Goodbye!")
            break

        else:
            print("Invalid choice. Please enter 1-7.")


def command_line_mode():
    """Run with command line arguments"""
    if len(sys.argv) < 4:
        print(
            "Usage: python add_moves_to_creature.py <creature_name> <move_key> <level>"
        )
        print(
            "   or: python add_moves_to_creature.py --remove <creature_name> <move_key>"
        )
        print("   or: python add_moves_to_creature.py --interactive")
        return 1

    creatures = load_creatures()
    if not creatures:
        return 1

    if sys.argv[1] == "--remove" and len(sys.argv) >= 4:
        creature_name = sys.argv[2]
        move_key = sys.argv[3].lower()

        idx, creature = find_creature_by_name(creatures, creature_name)
        if not creature:
            print(f"Creature '{creature_name}' not found")
            return 1

        success, removed_move = remove_move_from_creature(creature, move_key)
        if success:
            print(f"Removed {move_key} from {creature['name']}")
            if save_creatures(creatures):
                print("Changes saved successfully!")
                return 0
            else:
                print("Failed to save changes")
                return 1
        else:
            print(f"{creature['name']} doesn't know {move_key}")
            return 1

    else:
        creature_name = sys.argv[1]
        move_key = sys.argv[2].lower()

        try:
            level = int(sys.argv[3])
        except ValueError:
            print("Invalid level. Please enter a number.")
            return 1

        # Find creature
        idx, creature = find_creature_by_name(creatures, creature_name)
        if not creature:
            print(f"Creature '{creature_name}' not found")
            return 1

        # Validate move
        if not validate_move_key(move_key):
            print(f"Move '{move_key}' not found in moves database")
            return 1

        # Add move
        if add_move_to_creature(creature, move_key, level):
            move_data = get_move_data(move_key)
            move_name = move_data["name"] if move_data else move_key
            print(f"Added {move_name} (level {level}) to {creature['name']}")

            # Save changes
            if save_creatures(creatures):
                print("Changes saved successfully!")
                return 0
            else:
                print("Failed to save changes")
                return 1
        else:
            return 1


def main():
    """Main function"""
    if len(sys.argv) == 1 or (len(sys.argv) == 2 and sys.argv[1] == "--interactive"):
        return interactive_mode()
    else:
        return command_line_mode()


if __name__ == "__main__":
    sys.exit(main())
