import { hollowIsland } from "./hollow-island.ts";
import type { WorldDefinition } from "./types.ts";
export const worlds: Record<string, WorldDefinition> = {
  [hollowIsland.id]: hollowIsland,
};
export const defaultWorldId = hollowIsland.id;
export function worldById(id = defaultWorldId) {
  const world = worlds[id];
  if (!world) throw new Error(`Unknown open world: ${id}`);
  return world;
}
