export type {
  Move,
  MovesFile,
  Creature,
  Item,
  Items,
  Types,
  Route,
  Routes,
  EvolutionStone,
  TypeChart,
  PlayerCreature,
  PlayerSave,
  PokemonType,
  MoveCategory,
  StatName,
} from "./schemas";

// Export EvolutionRequirement type from schemas
import { z, EvolutionRequirementSchema } from "./schemas";
export type EvolutionRequirement = z.infer<typeof EvolutionRequirementSchema>;

// Re-export Zod schemas for validation
export {
  MoveSchema,
  MovesFileSchema,
  CreatureSchema,
  ItemSchema,
  ItemsSchema,
  TypesSchema,
  RouteSchema,
  RoutesSchema,
  EvolutionStoneSchema,
  PlayerCreatureSchema,
  PlayerSaveSchema,
  TypeChartSchema,
} from "./schemas";

import { Creature, PlayerCreature } from "./schemas";

export type BattleCreature = PlayerCreature & Pick<Creature, "sprite" | "typing" | "description" | "base_stats"> & {
  currentHp: number; // Ensuring this is explicit, though PlayerCreature has 'hp' (current/saved hp)
  // We can use 'hp' from PlayerCreature as current HP. But Battle needs ephemeral changes?
  // PlayerCreature.hp is current HP. maxHp is max.
};
