import { z } from "zod";

// Base types
export const PokemonType = z.enum([
  "Normal",
  "Fire",
  "Water",
  "Ground",
  "Air",
  "Ice",
  "Electric",
  "Plant",
  "Toxic",
  "Metal",
  "Light",
  "Dark",
  "Ghost",
]);

export const MoveCategory = z.enum(["physical", "special", "status"]);

export const StatName = z.enum([
  "hp",
  "attack",
  "defense",
  "sp_attack",
  "sp_defense",
  "speed",
]);

// Move-related types
export const MoveEffectSchema = z.object({
  type: z.enum(["damage", "status", "stat_boost", "heal", "weather"]),
  value: z.number().optional(),
  status: z.string().optional(),
  stat: StatName.optional(),
  boost: z.number().optional(),
  target: z.enum(["self", "opponent", "all"]).optional(),
});

export const MoveSchema = z.object({
  name: z.string(),
  uses: z.number(),
  max_uses: z.number(),
  power: z.number(),
  accuracy: z.number(),
  type: PokemonType,
  category: MoveCategory,
  effect: MoveEffectSchema.optional(),
});

export type Move = z.infer<typeof MoveSchema>;

export const MovesFileSchema = z.record(MoveSchema);
export type MovesFile = z.infer<typeof MovesFileSchema>;

// Creature-related types
export const BaseStatsSchema = z.object({
  hp: z.number(),
  attack: z.number(),
  defense: z.number(),
  sp_attack: z.number(),
  sp_defense: z.number(),
  speed: z.number(),
  total: z.number(),
});

export const ShinyBoostSchema = z.object({
  stat: StatName,
  bonus: z.number(),
});

export const MoveLearnsetSchema = z.object({
  move_key: z.string(),
  level: z.number(),
});

export const EvolutionRequirementSchema = z.object({
  type: z.enum(["level", "stone", "trade", "friendship", "item"]),
  level: z.number().optional(),
  stone: z.string().optional(),
  evolves_to: z.string(),
});

export const CreatureSchema = z.object({
  name: z.string(),
  sprite: z.string(),
  typing: z.array(PokemonType),
  description: z.string(),
  appearance: z.string(),
  height: z.number(),
  weight: z.number(),
  base_stats: BaseStatsSchema,
  shiny_boost: ShinyBoostSchema.optional(),
  abilities: z.array(z.string()),
  moveset: z.array(MoveLearnsetSchema),
  evolves_to: z.string().optional(),
  evolution_mechanic: z.string().optional(),
  evolution_requirements: z.array(EvolutionRequirementSchema).optional(),
  legendary: z.boolean().default(false),
  mythical: z.boolean().default(false),
});

export type Creature = z.infer<typeof CreatureSchema>;

// Item-related types
export const ItemEffectSchema = z.object({
  type: z.enum([
    "capture",
    "heal",
    "cure_status",
    "evolution",
    "stat_boost",
    "repel",
    "escape",
  ]),
  catch_rate: z.number().optional(),
  hp_restore: z.number().optional(),
  hp_restore_percent: z.number().optional(),
  status: z.string().optional(),
  cure_all_status: z.boolean().optional(),
  trigger_types: z.array(PokemonType).optional(),
  stat: StatName.optional(),
  boost: z.number().optional(),
  duration: z.union([z.number(), z.enum(["battle"])]).optional(),
  target: z.enum(["single", "all"]).optional(),
  uses: z.number().optional(),
  strength: z.enum(["weak", "medium", "strong"]).optional(),
});

export const ItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  effect: ItemEffectSchema,
  price: z.number(),
  sell_price: z.number(),
  stackable: z.boolean(),
  consumable: z.boolean(),
  rare: z.boolean().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

export const ItemCategorySchema = z.object({
  description: z.string(),
  items: z.array(ItemSchema),
});

export const ItemsSchema = z.object({
  categories: z.record(z.string(), ItemCategorySchema),
});

export type Items = z.infer<typeof ItemsSchema>;

// Type effectiveness
export const TypeEffectivenessSchema = z.record(z.number());

export const TypeDataSchema = z.object({
  attackCategory: MoveCategory,
  defense: z.object({
    physical: z.number(),
    special: z.number(),
  }),
  effectiveness: TypeEffectivenessSchema,
});

export const TypesSchema = z.object({
  types: z.array(PokemonType),
  data: z.record(PokemonType, TypeDataSchema),
});

export type Types = z.infer<typeof TypesSchema>;

// Route and map types
export const TileLegendSchema = z.record(z.string(), z.string());

export const TileMapSchema = z.object({
  map: z.array(z.string()),
  legend: TileLegendSchema,
});

export const SpawnPointSchema = z.object({
  tx: z.number(),
  ty: z.number(),
});

export const SpawnPointsSchema = z.record(SpawnPointSchema);

export const BoundarySchema = z.object({
  tx: z.number(),
  ty: z.number(),
  w: z.number(),
  h: z.number(),
});

export const BoundariesSchema = z.object({
  walkable: z.array(BoundarySchema),
  blocked: z.array(BoundarySchema),
});

export const ExitSchema = z.object({
  id: z.string(),
  area: BoundarySchema,
  destination: z.string(),
  spawnPoint: z.string(),
});

export const CollisionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  name: z.string(),
});

export const WildEncounterSchema = z.object({
  name: z.string(),
  level: z.tuple([z.number(), z.number()]),
  chance: z.number(),
});

export const CreatureEncountersSchema = z.object({
  grass: z.array(WildEncounterSchema).optional(),
  water: z.array(WildEncounterSchema).optional(),
  cave: z.array(WildEncounterSchema).optional(),
});

export const MapObjectSchema = z.object({
  type: z.string(),
  tx: z.number(),
  ty: z.number(),
  w: z.number(),
  h: z.number(),
  blocks: z.boolean(),
  layer: z.enum(["below", "above", "collision"]),
  stretch: z.boolean().optional(),
});

export const NPCSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: SpawnPointSchema,
  sprite: z.string(),
  dialogue: z.string(),
});

export const RouteSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  battle: z.string().optional(),
  background: z.string(),
  collisions: z.array(CollisionSchema).optional(),
  spawn: SpawnPointsSchema,
  exits: z.array(ExitSchema),
  creatures: CreatureEncountersSchema.optional(),
  wildPokemon: CreatureEncountersSchema.optional(),
  npcs: z.array(NPCSchema).optional(),
  objects: z.array(MapObjectSchema).optional(),
  tileSize: z.number().optional(),
  tiles: TileMapSchema.optional(),
  boundaries: BoundariesSchema.optional(),
});

export type Route = z.infer<typeof RouteSchema>;

export const RoutesSchema = z.object({
  routes: z.array(RouteSchema),
  connections: z.record(z.array(z.string())),
  startingRoute: z.string(),
  playerConfig: z.object({
    walkSpeed: z.number(),
    runSpeed: z.number(),
    spriteSize: z.object({
      width: z.number(),
      height: z.number(),
    }),
    collisionSize: z.object({
      width: z.number(),
      height: z.number(),
    }),
    directions: z.record(
      z.object({
        frame: z.number(),
        walkFrames: z.array(z.number()),
      }),
    ),
  }),
});

export type Routes = z.infer<typeof RoutesSchema>;

// Evolution stones
export const EvolutionStoneSchema = z.object({
  key: z.string(),
  name: z.string(),
  quantity: z.number(),
  type: z.string(),
  description: z.string(),
});

export type EvolutionStone = z.infer<typeof EvolutionStoneSchema>;

// Player save data
export const PlayerCreatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: z.string(),
  level: z.number(),
  experience: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  moves: z.array(z.string()),
  ability: z.string(),
  nature: z.string().optional(),
  ivs: z.record(StatName, z.number()).optional(),
  evs: z.record(StatName, z.number()).optional(),
  shiny: z.boolean().default(false),
  status: z.string().optional(),
});

export type PlayerCreature = z.infer<typeof PlayerCreatureSchema>;

export const PlayerSaveSchema = z.object({
  version: z.string(),
  playerName: z.string(),
  playerGender: z.enum(["male", "female"]),
  money: z.number(),
  badges: z.array(z.string()),
  currentRoute: z.string(),
  playerPosition: SpawnPointSchema,
  party: z.array(PlayerCreatureSchema),
  pc: z.array(PlayerCreatureSchema),
  bag: z.record(z.string(), z.number()),
  flags: z.record(z.boolean()),
  playtime: z.number(),
  pokedex: z.record(z.string(), z.boolean()),
});

export type PlayerSave = z.infer<typeof PlayerSaveSchema>;
