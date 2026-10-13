import creatureData from "../../data/creatures.json" with { type: "json" };
import stoneData from "../../data/evolution_stones.json" with { type: "json" };
import moveData from "../../data/moves.json" with { type: "json" };
import typeData from "../../data/types.json" with { type: "json" };
import type { Creature, MovesFile, TypeChart } from "../types/schemas.ts";

export const creatures = creatureData.map((c) => ({
  ...c,
  evolves_to: c.evolves_to ?? undefined,
})) as unknown as Creature[];
export const moves = moveData as MovesFile;
export const types = typeData as TypeChart;
export const species = Object.fromEntries(creatures.map((c) => [c.name, c]));
export const typeColors: Record<string, string> = {
  Normal: "#9c9f8c",
  Fire: "#e78c5b",
  Water: "#689fb8",
  Plant: "#7a9d60",
  Electric: "#c3a145",
  Ground: "#b39772",
  Air: "#8eabbe",
  Ice: "#77b6b9",
  Toxic: "#a088b4",
  Metal: "#83999d",
  Light: "#c8ae68",
  Dark: "#706d80",
  Ghost: "#9287b5",
};
export function effectiveness(type: string, defender: string[]) {
  return defender.reduce(
    (n, t) => n * (types.data[type]?.effectiveness[t] ?? 1),
    1,
  );
}

// Only sell stones that have a matching evolution in the creature data.
export const evolutionStones = stoneData
  .filter((stone) =>
    creatures.some((c) =>
      c.evolution_requirements?.some(
        (e) =>
          e.type === "stone" && e.stone === stone.key && species[e.evolves_to],
      ),
    ),
  )
  .map((stone) => ({ ...stone, price: 300 }));
export const stoneByKey = Object.fromEntries(
  evolutionStones.map((stone) => [stone.key, stone]),
);
