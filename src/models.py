from enum import Enum
import enum
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
    PARTY_MENU = "party_menu"
    POKEMON_STATS = "pokemon_stats"


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


class MoveCategory(str, Enum):
    PHYSICAL = "physical"
    SPECIAL = "special"
    STATUS = "status"


class EvolutionType(str, Enum):
    LEVEL = "level"
    STONE = "stone"


class EvolutionRequirement(BaseModel):
    type: EvolutionType
    level: int | None = None  # For level-based evolution
    stone: str | None = None  # For stone-based evolution (e.g., "fire_stone")
    evolves_to: str  # The name of the creature it evolves into


class MoveDefinition(BaseModel):
    name: str
    uses: int
    max_uses: int
    power: int
    accuracy: int = Field(default=100)
    type: str  # Move type (Fire, Water, etc.)
    category: MoveCategory = Field(default=MoveCategory.PHYSICAL)


class CreatureMove(BaseModel):
    move_key: str
    level: int = Field(..., ge=1)


class Move(BaseModel):
    name: str
    uses: int
    max_uses: int
    power: int
    accuracy: int = Field(default=100)
    type: str  # Move type (Fire, Water, etc.)
    category: MoveCategory = Field(default=MoveCategory.PHYSICAL)
    learned_at_level: int | None = None


class Creature(BaseModel):
    name: str
    sprite: str
    typing: list[str]
    base_stats: BaseStats
    shiny_boost: ShinyBoost | None = None
    abilities: list[str] = Field(default_factory=list)
    moveset: list[CreatureMove] = Field(default_factory=list)
    evolves_to: str | list[str] | None = None  # Keep for backwards compatibility
    evolution_requirements: list[EvolutionRequirement] = Field(default_factory=list)
    legendary: bool = False
    mythical: bool = False

    def can_evolve_at_level(self, level: int) -> EvolutionRequirement | None:
        """Check if the creature can evolve at the given level."""
        for req in self.evolution_requirements:
            if req.type == EvolutionType.LEVEL and req.level and level >= req.level:
                return req
        return None

    def can_evolve_with_stone(self, stone: str) -> EvolutionRequirement | None:
        """Check if the creature can evolve with the given stone."""
        for req in self.evolution_requirements:
            if req.type == EvolutionType.STONE and req.stone == stone:
                return req
        return None

    def get_all_evolution_options(self) -> list[EvolutionRequirement]:
        """Get all possible evolution requirements for this creature."""
        return self.evolution_requirements


class CreaturesData(RootModel[list[Creature]]):
    def get_by_name(self, name: str) -> Creature:
        """Find and return a Creature instance by name from the list, or None if not found."""
        for creature in self.root:
            if creature.name == name:
                return creature
        raise Exception("Creature not found")


class MovesData(RootModel[dict[str, MoveDefinition]]):
    def get_by_key(self, key: str) -> MoveDefinition:
        if key in self.root:
            return self.root[key]
        raise Exception("Move not found")


class PartyCreature(BaseModel):
    creature: Creature
    level: int = Field(min=1, max=100, default=1)  # pyright: ignore[reportCallIssue]
    moves: list[Move]
    hp: int
    damage: int
    attack: int
    defence: int
    special_attack: int
    special_defence: int
    speed: int
    shiny: bool = Field(default=False)
    experience: int = Field(default=0, ge=0)  # Experience points

    def can_evolve_at_current_level(self) -> EvolutionRequirement | None:
        """Check if this party creature can evolve at its current level."""
        return self.creature.can_evolve_at_level(self.level)

    def can_evolve_with_stone(self, stone: str) -> EvolutionRequirement | None:
        """Check if this party creature can evolve with the given stone."""
        return self.creature.can_evolve_with_stone(stone)

    def get_evolution_options(self) -> list[EvolutionRequirement]:
        """Get all available evolution options for this party creature."""
        options = []
        # Level-based evolutions
        level_req = self.can_evolve_at_current_level()
        if level_req:
            options.append(level_req)
        # Stone-based evolutions (always available if creature supports it)
        for req in self.creature.evolution_requirements:
            if req.type == EvolutionType.STONE:
                options.append(req)
        return options


class RouteLocation(BaseModel):
    x: float
    y: float


class WildSpawn(BaseModel):
    tx: int
    ty: int
    creature: PartyCreature
    spawn_time: int
    duration: int


class ItemType(str, Enum):
    CATCHING = "Catching"
    HEALING = "Healing"
    BATTLE = "Battle"
    EVOLUTION = "Evolution"


class Items(BaseModel):
    key: str
    name: str
    quantity: int
    type: ItemType
    description: str


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
    items: list[Items] = Field(default_factory=list)
    speed: int = Field(default=128)
    reset_spawn_route: str | None = Field(
        default=None
    )  # Route key to respawn at on game over
    reset_spawn_point: str | None = Field(
        default=None
    )  # Spawn point name to respawn at
    last_move_time: int = Field(
        default=0
    )  # Last time the player moved (in milliseconds)
    is_tweening: bool = Field(default=False)  # True while interpolating between tiles
    tween_start_time: int = Field(default=0)  # Tween start time in milliseconds
    tween_duration: int = Field(default=250)  # Duration of tile-to-tile tween in ms
    tween_start_x: float = Field(default=0.0)
    tween_start_y: float = Field(default=0.0)
    tween_target_x: float = Field(default=0.0)
    tween_target_y: float = Field(default=0.0)
    tween_progress: float = Field(default=0.0)

    @property
    def grid_x(self) -> int:
        return int(self.location.x // TILE_SIZE)

    @property
    def grid_y(self) -> int:
        return int(self.location.y // TILE_SIZE)

    def get_item_by_key(self, item_key: str) -> Items | None:
        """Get an item by its unique key (e.g., 'poke_ball')."""
        for item in self.items:
            if item.key == item_key:
                return item
        return None

    def remove_item_by_key(self, item_key: str) -> None:
        """Remove an item by its unique key (e.g., 'poke_ball')."""
        for item in self.items:
            if item.key == item_key:
                self.items.remove(item)
                break

    def move(self, dx: float, dy: float, current_map: Route) -> None:
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
            self.location.x = new_x
            self.location.y = new_y
            print(f"Position updated: x={self.location.x}, y={self.location.y}")

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

    def ensure_valid_position(self, current_route: Route) -> None:
        """Ensure the player's position is valid within the route's map. If not, teleport to default spawn."""
        tile_map = current_route.tiles.map
        grid_x = self.grid_x
        grid_y = self.grid_y

        in_bounds = False
        is_wall = False
        if tile_map:
            if 0 <= grid_y < len(tile_map):
                row_len = len(tile_map[grid_y])
                if 0 <= grid_x < row_len:
                    in_bounds = True
                    if tile_map[grid_y][grid_x] == "w":
                        is_wall = True

        if not in_bounds or is_wall:
            # Set to default spawn point
            default_spawn = current_route.spawn.get("default", Position(tx=0, ty=0))
            self.location.x = default_spawn.tx * TILE_SIZE
            self.location.y = default_spawn.ty * TILE_SIZE

    def start_tween(
        self, target_x: float, target_y: float, duration: int | None = None
    ) -> None:
        self.is_tweening = True
        self.tween_start_time = pygame.time.get_ticks()
        self.tween_duration = duration if duration is not None else self.tween_duration
        self.tween_start_x = self.location.x
        self.tween_start_y = self.location.y
        self.tween_target_x = target_x
        self.tween_target_y = target_y
        self.tween_progress = 0.0

    def update_tween(self, current_time: int) -> None:
        if not self.is_tweening:
            return

        elapsed = current_time - self.tween_start_time
        duration = max(1, self.tween_duration)
        progress = min(1.0, elapsed / duration)
        self.tween_progress = progress

        self.location.x = (
            self.tween_start_x + (self.tween_target_x - self.tween_start_x) * progress
        )
        self.location.y = (
            self.tween_start_y + (self.tween_target_y - self.tween_start_y) * progress
        )

        if progress >= 1.0:
            self.is_tweening = False
            self.location.x = self.tween_target_x
            self.location.y = self.tween_target_y

    def cancel_tween(self) -> None:
        self.is_tweening = False
        self.tween_progress = 0.0

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

    def evolve_creature_with_stone(
        self, party_index: int, stone_key: str, creatures_data
    ) -> bool:
        """Evolve a creature in the party using an evolution stone."""
        if not (0 <= party_index < len(self.party)):
            return False

        creature = self.party[party_index]
        evolution_req = creature.can_evolve_with_stone(stone_key)

        if not evolution_req:
            return False

        # Check if player has the stone
        stone_item = self.get_item_by_key(stone_key)
        if not stone_item or stone_item.quantity <= 0:
            return False

        # Get the evolved creature data
        try:
            evolved_creature_data = creatures_data.get_by_name(evolution_req.evolves_to)
        except:
            return False

        # Create evolved creature
        evolved_creature = PartyCreature(
            creature=evolved_creature_data,
            level=creature.level,
            moves=creature.moves[:4],  # Keep current moves, limit to 4
            hp=creature.hp,
            damage=creature.damage,
            attack=creature.attack,
            defence=creature.defence,
            special_attack=creature.special_attack,
            special_defence=creature.special_defence,
            speed=creature.speed,
            shiny=creature.shiny,
            experience=creature.experience,
        )

        # Replace the creature in party
        self.party[party_index] = evolved_creature

        # Consume the stone
        stone_item.quantity -= 1
        if stone_item.quantity <= 0:
            self.remove_item_by_key(stone_key)

        return True

    def evolve_creature_at_level(self, party_index: int, creatures_data) -> bool:
        """Evolve a creature in the party if it can evolve at its current level."""
        if not (0 <= party_index < len(self.party)):
            return False

        creature = self.party[party_index]
        evolution_req = creature.can_evolve_at_current_level()

        if not evolution_req:
            return False

        # Get the evolved creature data
        try:
            evolved_creature_data = creatures_data.get_by_name(evolution_req.evolves_to)
        except:
            return False

        # Create evolved creature
        evolved_creature = PartyCreature(
            creature=evolved_creature_data,
            level=creature.level,
            moves=creature.moves[:4],  # Keep current moves, limit to 4
            hp=creature.hp,
            damage=creature.damage,
            attack=creature.attack,
            defence=creature.defence,
            special_attack=creature.special_attack,
            special_defence=creature.special_defence,
            speed=creature.speed,
            shiny=creature.shiny,
            experience=creature.experience,
        )

        # Replace the creature in party
        self.party[party_index] = evolved_creature
        return True

    def check_for_level_evolutions(self, creatures_data) -> list[int]:
        """Check all party creatures for level-based evolutions and return indices of creatures that can evolve."""
        evolution_candidates = []
        for i, creature in enumerate(self.party):
            if creature.can_evolve_at_current_level():
                evolution_candidates.append(i)
        return evolution_candidates

    def get_evolution_stones_in_inventory(self) -> list[Items]:
        """Get all evolution stones in the player's inventory."""
        return [item for item in self.items if item.type == ItemType.EVOLUTION]
