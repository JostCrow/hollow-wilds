"""
Script to update creatures.json with move types and categories.
Run this once to add type and category fields to all moves.
"""

import json

# Define move types and categories based on move names
MOVE_DATA = {
    # Fire moves
    "Ember": {"type": "Fire", "category": "special"},
    "Flame Burst": {"type": "Fire", "category": "special"},
    "Fire Fang": {"type": "Fire", "category": "physical"},
    "Heat Wave": {"type": "Fire", "category": "special"},
    "Flare Blitz": {"type": "Fire", "category": "physical"},
    
    # Water moves
    "Water Gun": {"type": "Water", "category": "special"},
    "Bubble Beam": {"type": "Water", "category": "special"},
    "Aqua Tail": {"type": "Water", "category": "physical"},
    "Surf": {"type": "Water", "category": "special"},
    "Hydro Pump": {"type": "Water", "category": "special"},
    
    # Grass moves
    "Vine Whip": {"type": "Grass", "category": "physical"},
    "Razor Leaf": {"type": "Grass", "category": "physical"},
    "Seed Bomb": {"type": "Grass", "category": "physical"},
    "Leaf Blade": {"type": "Grass", "category": "physical"},
    "Solar Beam": {"type": "Grass", "category": "special"},
    
    # Light Magic moves
    "Light Beam": {"type": "Light Magic", "category": "special"},
    "Solar Flare": {"type": "Light Magic", "category": "special"},
    "Holy Nova": {"type": "Light Magic", "category": "special"},
    "Judgment Ray": {"type": "Light Magic", "category": "special"},
    "Eternal Dawn": {"type": "Light Magic", "category": "special"},
    
    # Dark Magic moves
    "Shadow Claw": {"type": "Dark Magic", "category": "physical"},
    "Night Slash": {"type": "Dark Magic", "category": "physical"},
    "Dark Pulse": {"type": "Dark Magic", "category": "special"},
    "Abyssal Crush": {"type": "Dark Magic", "category": "physical"},
    "Eternal Eclipse": {"type": "Dark Magic", "category": "special"},
    
    # Ground moves
    "Mud Slap": {"type": "Ground", "category": "special"},
    "Rock Throw": {"type": "Rock", "category": "physical"},
    "Earthquake": {"type": "Ground", "category": "physical"},
    "Sandstorm": {"type": "Rock", "category": "status"},
    "Gaia Crush": {"type": "Ground", "category": "physical"},
    
    # Normal moves
    "Tackle": {"type": "Normal", "category": "physical"},
    "Quick Attack": {"type": "Normal", "category": "physical"},
    "Bite": {"type": "Normal", "category": "physical"},
    "Body Slam": {"type": "Normal", "category": "physical"},
    "Hyper Beam": {"type": "Normal", "category": "special"},
}


def update_creatures_json():
    """Update creatures.json with type and category for all moves."""
    # Read the JSON file
    with open("data/creatures.json", "r") as f:
        creatures = json.load(f)
    
    # Update each creature's moves
    for creature in creatures:
        for move in creature.get("moveset", []):
            move_name = move["name"]
            if move_name in MOVE_DATA:
                move["type"] = MOVE_DATA[move_name]["type"]
                move["category"] = MOVE_DATA[move_name]["category"]
            else:
                print(f"Warning: No data for move '{move_name}'")
                move["type"] = "Normal"
                move["category"] = "physical"
    
    # Write back to the file
    with open("data/creatures.json", "w") as f:
        json.dump(creatures, f, indent=2)
    
    print("✓ Successfully updated creatures.json with move types and categories!")


if __name__ == "__main__":
    update_creatures_json()