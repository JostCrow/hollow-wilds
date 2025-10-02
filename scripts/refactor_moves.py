#!/usr/bin/env python3
import json
import re


def name_to_key(name):
    """Convert a move name to a key format"""
    # Convert to lowercase and replace spaces/hyphens with underscores
    key = re.sub(r"[^a-zA-Z0-9\s-]", "", name.lower())
    key = re.sub(r"[\s-]+", "_", key)
    return key


def load_json_file(filepath):
    """Load a JSON file"""
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: {filepath} not found")
        return None
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {filepath}")
        return None


def save_json_file(data, filepath):
    """Save data to a JSON file"""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def refactor_creatures():
    """Refactor creatures.json to use move references"""

    # Load the files
    creatures = load_json_file("data/creatures.json")
    moves = load_json_file("data/moves.json")

    if not creatures or not moves:
        print("Failed to load required files")
        return

    print(f"Loaded {len(creatures)} creatures and {len(moves)} moves")

    # Keep track of missing moves
    missing_moves = set()
    move_mappings = {}

    # Process each creature
    for creature in creatures:
        new_moveset = []

        for move in creature["moveset"]:
            move_name = move["name"]
            move_key = name_to_key(move_name)
            level = move["level"]

            # Check if the move exists in our moves database
            if move_key in moves:
                new_moveset.append({"move_key": move_key, "level": level})
                move_mappings[move_name] = move_key
            else:
                # Try some alternative mappings for common variations
                alt_mappings = {"x_scissor": "x_scissor", "will_o_wisp": "will_o_wisp"}

                found = False
                for alt_name, alt_key in alt_mappings.items():
                    if move_key == alt_name and alt_key in moves:
                        new_moveset.append({"move_key": alt_key, "level": level})
                        move_mappings[move_name] = alt_key
                        found = True
                        break

                if not found:
                    missing_moves.add(move_name)
                    print(
                        f"Warning: Move '{move_name}' (key: {move_key}) not found in moves database"
                    )

                    # Add a placeholder move (tackle) so the creature still has moves
                    new_moveset.append({"move_key": "tackle", "level": level})

        # Update the creature's moveset
        creature["moveset"] = new_moveset

    # Save the refactored creatures file
    save_json_file(creatures, "data/creatures.json")

    print(f"\nRefactoring complete!")
    print(f"Successfully mapped {len(move_mappings)} moves")

    if missing_moves:
        print(f"\nMissing moves ({len(missing_moves)}):")
        for move in sorted(missing_moves):
            print(f"  - {move}")
        print("\nThese moves were replaced with 'tackle' as a placeholder")

    print(f"\nMove mappings:")
    for original, key in sorted(move_mappings.items()):
        print(f"  {original} -> {key}")

    print(f"\nRefactored creatures saved to data/creatures.json")
    print(
        f"Original file backed up as data/creatures_backup_before_moves_refactor.json"
    )


if __name__ == "__main__":
    refactor_creatures()
