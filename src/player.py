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
        self.wild_spawns = []
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

        tile_map = current_map.get("tiles", {}).get("map", [])
        in_bounds = False
        if tile_map:
            if 0 <= new_grid_y < len(tile_map):
                row_len = len(tile_map[new_grid_y])
                if 0 <= new_grid_x < row_len:
                    in_bounds = True
        not_in_blocked = False
        if in_bounds:
            target_tile = tile_map[new_grid_y][new_grid_x]
            not_in_blocked = target_tile != "w"
        no_npc_collision = True
        npcs = current_map.get("npcs", [])
        for npc in npcs:
            position = npc.get("position", {})
            tx = position.get("tx", -1)
            ty = position.get("ty", -1)
            if tx == new_grid_x and ty == new_grid_y:
                no_npc_collision = False
                break

        no_object_collision = True
        objects = current_map.get("objects", [])
        for obj in objects:
            if obj.get("blocks", False):
                tx = obj.get("tx", 0)
                ty = obj.get("ty", 0)
                w = obj.get("w", 1)
                h = obj.get("h", 1)
                if tx <= new_grid_x < tx + w and ty <= new_grid_y < ty + h:
                    no_object_collision = False
                    break

        if in_bounds and not_in_blocked and no_npc_collision and no_object_collision:
            self.x = new_x
            self.y = new_y
            self.grid_x = new_grid_x
            self.grid_y = new_grid_y
            print(
                f"Position updated: x={self.x}, y={self.y}, grid=({self.grid_x}, {self.grid_y})"
            )

        else:
            # Determine specific block reason
            if not in_bounds:
                reason = "out of bounds"
            elif not not_in_blocked:
                reason = "blocked area"
            elif not no_npc_collision:
                reason = "NPC collision"
            elif not no_object_collision:
                reason = "object"
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
