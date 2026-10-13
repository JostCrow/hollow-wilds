import { PlayerCreature, Creature } from "@/types";

export function checkForEvolution(
  pokemon: PlayerCreature,
  creatures: Creature[]
): { canEvolve: boolean; evolvesTo?: string; evolutionType?: string } {
  const creatureData = creatures.find(c => c.name === pokemon.species);
  if (!creatureData || !creatureData.evolution_requirements) {
    return { canEvolve: false };
  }

  for (const requirement of creatureData.evolution_requirements) {
    if (requirement.type === "level" && requirement.level && pokemon.level >= requirement.level) {
      return {
        canEvolve: true,
        evolvesTo: requirement.evolves_to,
        evolutionType: "level"
      };
    }
  }

  return { canEvolve: false };
}

export function evolvePokemon(
  pokemon: PlayerCreature,
  evolvesTo: string,
  creatures: Creature[]
): PlayerCreature {
  const newCreatureData = creatures.find(c => c.name === evolvesTo);
  if (!newCreatureData) {
    throw new Error(`Evolution target ${evolvesTo} not found`);
  }

  return {
    ...pokemon,
    species: evolvesTo,
    // Keep current HP but recalculate max HP based on new base stats
    hp: pokemon.hp,
    // Calculate new max HP using evolution base stats
    // This will be recalculated in the battle logic
  };
}

export function getAvailableCreaturesForLevel(
  creatures: Creature[],
  playerLevel: number
): Creature[] {
  return creatures.filter(creature => {
    const bst = creature.base_stats.total;

    // 1. BST Constraints
    // Up to level 20: BST <= 300
    if (playerLevel <= 20 && bst > 300) {
      return false;
    }
    // Up to level 40: BST <= 450
    if (playerLevel <= 40 && bst > 450) {
      return false;
    }

    // 2. Rarity Constraints
    // Legendary and Mythical only after level 50 (i.e., playerLevel > 50)
    if ((creature.legendary || creature.mythical) && playerLevel <= 50) {
      return false;
    }

    // 3. Evolution Logic (Keep existing logic for variety and progression)
    // Check if creature has level-based evolution requirements
    if (creature.evolution_requirements && creature.evolution_requirements.length > 0) {
      const hasLevelEvolution = creature.evolution_requirements.some(req => req.type === "level");

      // If no level evolution (but has other evolution requirements), only show from level 35 onwards
      if (!hasLevelEvolution && playerLevel < 35) {
        return false;
      }

      // If has level evolution, check if player has reached the required level
      if (hasLevelEvolution) {
        const minLevel = Math.min(...creature.evolution_requirements
          .filter(req => req.type === "level" && req.level)
          .map(req => req.level!));

        // Show evolution forms a bit earlier (within 5 levels) to add challenge
        if (playerLevel < minLevel - 5) {
          return false;
        }
      }
    }

    return true;
  });
}
