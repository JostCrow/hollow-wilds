from enum import Enum
import os
from pydantic import BaseModel, Field, RootModel
import pygame

from src.config import ASSETS_PATH, TILE_SIZE


class States(str, Enum):
    START_MENU = "start_menu"
    NAME_GENDER = "name_gender"
    STARTER_SELECT = "starter_select"
    OVERWORLD = "overworld"
    BATTLE = "battle"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class Position(BaseModel):
    tx: int = Field(..., ge=0)
    ty: int = Field(..., ge=0)


class Area(BaseModel):
    tx: int = Field(..., ge=0)
    ty: int = Field(..., ge=0)
    w: int = Field(..., ge=1)
    h: int = Field(..., ge=1)


class Exit(BaseModel):
    id: str
    area: Area
    destination: str
    spawnPoint: str


class CreatureEncounter(BaseModel):
    name: str
    level: list[int]
    chance: float = Field(..., ge=0, le=100)


class Object(BaseModel):
    type: str
    tx: int = Field(..., ge=0)
    ty: int = Field(..., ge=0)
    w: int = Field(default=1, ge=1)
    h: int = Field(default=1, ge=1)
    blocks: bool = False
    layer: str = Field(default="below")  # e.g., "below", "above"


class NPC(BaseModel):
    id: str
    name: str
    position: Position
    sprite: str
    dialogue: str


class Tiles(BaseModel):
    map: list[str]
    legend: dict[str, str]


class Boundaries(BaseModel):
    walkable: list[Area] = Field(default_factory=list)
    blocked: list[Area] = Field(default_factory=list)


class Route(BaseModel):
    key: str
    name: str
    description: str
    tileSize: int = Field(..., ge=1)
    tiles: Tiles
    spawn: dict[str, Position]
    boundaries: Boundaries
    exits: list[Exit] = Field(default_factory=list)

    # Optional fields
    background: str | None = None
    battle: str | None = None

    creatures: dict[str, list[CreatureEncounter]] | None = None
    objects: list[Object] | None = None
    npcs: list[NPC] | None = None


class PlayerConfig(BaseModel):
    walkSpeed: int = Field(ge=0)
    runSpeed: int = Field(ge=0)
    spriteSize: dict[str, int]
    collisionSize: dict[str, int]
    directions: dict[str, dict[str, list[int] | int]]


class RoutesData(BaseModel):
    routes: list[Route]
    connections: dict[str, list[str]]
    startingRoute: str
    playerConfig: PlayerConfig

    def get_route_by_key(self, key: str) -> Route:
        for route in self.routes:
            if route.key == key:
                return route
        raise Exception("Unknown Route")


class BaseStats(BaseModel):
    hp: int = Field(..., ge=1)
    attack: int = Field(..., ge=1)
    defense: int = Field(..., ge=1)
    sp_attack: int = Field(..., ge=1)
    sp_defense: int = Field(..., ge=1)
    speed: int = Field(..., ge=1)
    total: int = Field(..., ge=1)


class ShinyBoost(BaseModel):
    stat: str
    bonus: int = Field(..., ge=0)


class Move(BaseModel):
    name: str
    level: int = Field(..., ge=1)
    uses: int
    max_uses: int
    power: int
    accuracy: int = Field(default=100)


class Creature(BaseModel):
    name: str
    sprite: str
    typing: list[str]
    base_stats: BaseStats
    shiny_boost: ShinyBoost | None = None
    abilities: list[str] = Field(default_factory=list)
    moveset: list[Move] = Field(default_factory=list)
    evolves_to: str | list[str] | None = None
    legendary: bool = False
    mythical: bool = False


class CreaturesData(RootModel[list[Creature]]):
    def get_by_name(self, name: str) -> Creature:
        """Find and return a Creature instance by name from the list, or None if not found."""
        for creature in self.root:
            if creature.name == name:
                return creature
        raise Exception("Creature not found")


class PartyCreature(BaseModel):
    creature: Creature
    level: int = Field(min=1, max=100, default=1)  # pyright: ignore[reportCallIssue]
    moves: list[Move]
    hp: int
    max_hp: int
    attack: int
    defence: int
    special_attack: int
    special_defence: int
    speed: int
    shiny: bool = Field(default=False)


class RouteLocation(BaseModel):
    x: int
    y: int


class WildSpawn(BaseModel):
    tx: int
    ty: int
    creature: PartyCreature
    spawn_time: int
    duration: int


class Player(BaseModel):
    name: str
    gender: Gender
    party: list[PartyCreature] = Field(default_factory=list)
    boxed: list[PartyCreature] = Field(default_factory=list)
    route: Route
    location: RouteLocation
    wild_spawns: list[WildSpawn] = Field(default_factory=list)
    last_autosave: int = Field(default=0)
    shake_timer: float = Field(default=0.0)
    shake_active: bool = Field(default=False)
    facing: str = Field(default="down")
    speed: int = Field(default=32)

    def move(self, dx, dy, current_map: Route):
        new_x = self.location.x + dx
        new_y = self.location.y + dy
        new_grid_x = int(new_x // TILE_SIZE)
        new_grid_y = int(new_y // TILE_SIZE)
        print(
            f"Attempting move: dx={dx}, dy={dy}, new_x={new_x}, new_y={new_y}, new_grid=({new_grid_x}, {new_grid_y})"
        )

        tile_map = current_map.tiles.map
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
        npcs = current_map.npcs or []
        for npc in npcs:
            position = npc.position
            tx = position.tx
            ty = position.ty
            if tx == new_grid_x and ty == new_grid_y:
                no_npc_collision = False
                break

        no_object_collision = True
        objects = current_map.objects or []
        for obj in objects:
            if obj.blocks:
                tx = obj.tx
                ty = obj.ty
                w = obj.w
                h = obj.h
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

    @property
    def sprite(self):
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
            return pygame.transform.scale(loaded_img, (32, 48))
        else:
            # Fallback: Try mirroring front for sides if missing
            front_path = os.path.join(ASSETS_PATH, "player", f"{self.gender}-front.png")
            if os.path.exists(front_path) and (self.facing in ["left", "right"]):
                front_img = pygame.image.load(front_path)
                scaled_front = pygame.transform.scale(front_img, (32, 48))
                if self.facing == "left":
                    return pygame.transform.flip(
                        scaled_front, True, False
                    )  # Horizontal flip
                else:  # right
                    return scaled_front
            else:
                # Ultimate fallback: Blue rectangle
                return pygame.Surface((32, 48))

    def capture_creature(self, creature: PartyCreature):
        if len(self.party) == 6:
            self.boxed.append(creature)
        else:
            self.party.append(creature)
