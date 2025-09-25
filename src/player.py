import os
import pygame
import random
from .config import TILE_SIZE, WALK_SPEED, ASSETS_PATH
from .data_loader import creatures_data, find_creature


class Player:
    def __init__(self, name="", gender="male", party=[], x=0, y=0):
        self.name = name
        self.gender = gender
        self.party = (
            party  # List of dicts: {"name": str, "level": int, "hp": int, etc.}
        )
        self.x = x  # Pixel x
        self.y = y  # Pixel y
        self.grid_x = 0  # Tile x (tx)
        self.grid_y = 0  # Tile y (ty)
        self.facing = "down"
        self.speed = WALK_SPEED
        self.sprite = None
        self.last_autosave = 0  # For autosave tracking
        self.shake_active = False  # For camera shake on block
        self.shake_timer = 0.0
        self.update_sprite()

    def update_sprite(self):
        # Load sprite based on facing direction
        if self.facing == "down":
            sprite_name = f"{self.gender}-front.png"
        elif self.facing == "up":
            sprite_name = f"{self.gender}-back.png"
        elif self.facing == "left":
            sprite_name = f"{self.gender}-left.png"
        elif self.facing == "right":
            sprite_name = f"{self.gender}-right.png"
        else:
            sprite_name = f"{self.gender}-front.png"  # Default fallback

        sprite_path = os.path.join(ASSETS_PATH, "player", sprite_name)
        if os.path.exists(sprite_path):
            loaded_img = pygame.image.load(sprite_path)
            self.sprite = pygame.transform.scale(loaded_img, (32, 48))
        else:
            # Fallback: Try mirroring front for sides if missing
            front_path = os.path.join(ASSETS_PATH, "player", f"{self.gender}-front.png")
            if os.path.exists(front_path) and (self.facing in ["left", "right"]):
                front_img = pygame.image.load(front_path)
                scaled_front = pygame.transform.scale(front_img, (32, 48))
                if self.facing == "left":
                    self.sprite = pygame.transform.flip(
                        scaled_front, True, False
                    )  # Horizontal flip
                else:  # right
                    self.sprite = scaled_front
            else:
                # Ultimate fallback: Blue rectangle
                self.sprite = pygame.Surface((32, 48))
                self.sprite.fill((0, 0, 255))

    def move(self, dx, dy, current_map):
        new_x = self.x + dx
        new_y = self.y + dy
        new_grid_x = int(new_x // TILE_SIZE)
        new_grid_y = int(new_y // TILE_SIZE)
        print(
            f"Attempting move: dx={dx}, dy={dy}, new_x={new_x}, new_y={new_y}, new_grid=({new_grid_x}, {new_grid_y})"
        )

        # Pre-check map existence and bounds
        tile_map = current_map.get("tiles", {}).get("map", [])
        map_bounds_ok = (
            bool(tile_map)
            and 0 <= new_grid_x < len(tile_map[0])
            and 0 <= new_grid_y < len(tile_map)
        )

        # Check map bounds
        tile_map = current_map.get("tiles", {}).get("map", [])
        if (
            tile_map
            and 0 <= new_grid_x < len(tile_map[0])
            and 0 <= new_grid_y < len(tile_map)
            and in_bounds
            and not_in_blocked
            and no_npc_collision
        ):
            self.x = new_x
            self.y = new_y
            self.grid_x = new_grid_x
            self.grid_y = new_grid_y
            print(
                f"Position updated: x={self.x}, y={self.y}, grid=({self.grid_x}, {self.grid_y})"
            )

            # Stub: Grass encounter check
            if (
                0 <= new_grid_y < len(tile_map)
                and 0 <= new_grid_x < len(tile_map[new_grid_y])
                and tile_map[new_grid_y][new_grid_x] == "g"
            ):  # Grass tile
                if random.random() < 0.1:  # 10% chance
                    creatures = current_map.get("creatures", {}).get("grass", [])
                    if creatures:
                        print(f"Wild encounter! (Stub: {random.choice(creatures)})")
        else:
            # Determine specific block reason
            if not map_bounds_ok:
                reason = "map bounds"
            elif not in_bounds:
                reason = "not walkable"
            elif not not_in_blocked:
                reason = "blocked area"
            elif not no_npc_collision:
                reason = "NPC collision"
            else:
                reason = "unknown"

            print(f"Move blocked: {reason}")

            # Trigger shake for visual feedback
            self.shake_active = True  # Flag for rendering to apply camera shake

    def add_starter(self, creature):
        """Add a starter Pokémon to the party at level 5."""
        base = find_creature(creature["name"]) or creature
        party_member = {
            "name": base["name"],
            "level": 5,
            "current_hp": base["base_stats"]["hp"],
            "max_hp": base["base_stats"]["hp"],
            "moves": [base["moveset"][0]["name"]] if base.get("moveset") else [],
            # Expand with full stats/moves later
        }
        self.party.append(party_member)
