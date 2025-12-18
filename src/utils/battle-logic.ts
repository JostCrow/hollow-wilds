import { Move, BattleCreature } from "@/types";
import { useGameDataStore } from "@/stores/game-data-store";
import { getAvailableCreaturesForLevel } from "@/utils/evolution";

const generateId = () => Math.random().toString(36).substring(2, 9);



// Returns detailed damage info
export type DamageResult = {
    damage: number;
    isCritical: boolean;
    effectiveness: number;
};

// Helper to generate random IVs (0-31)
export const generateIVs = () => ({
    hp: Math.floor(Math.random() * 32),
    attack: Math.floor(Math.random() * 32),
    defense: Math.floor(Math.random() * 32),
    sp_attack: Math.floor(Math.random() * 32),
    sp_defense: Math.floor(Math.random() * 32),
    speed: Math.floor(Math.random() * 32),
});

export const calculateMaxHp = (base: number, level: number, iv: number = 0) => {
    // HP = ((2 * Base + IV) * Level / 100) + Level + 10
    return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
};

export const calculateStat = (base: number, level: number, iv: number = 0) => {
    // Stat = ((2 * Base + IV) * Level / 100) + 5
    return Math.floor(((2 * base + iv) * level) / 100) + 5;
};

export const getBattleStat = (mon: BattleCreature, stat: Exclude<keyof BattleCreature["base_stats"], "total">) => {
    const base = mon.base_stats[stat];
    const iv = mon.ivs ? mon.ivs[stat] : 0;
    return calculateStat(base, mon.level, iv);
};

// XP Calculation Helper - Updated to 1.6 scaling to match BattleStore
export const getExpForNextLevel = (currentLevel: number) => {
    return Math.floor(20 * Math.pow(1.6, currentLevel - 1));
};

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
    const { types } = useGameDataStore.getState();
    let typeEffectiveness = 1.0;

    if (types && types.data) {
        const moveTypeData = types.data[moveType];
        if (moveTypeData && moveTypeData.effectiveness) {
            defenderTypes.forEach(defenderType => {
                const multiplier = moveTypeData.effectiveness[defenderType];
                if (multiplier !== undefined) {
                    typeEffectiveness *= multiplier;
                }
            });
        }
    }
    return typeEffectiveness;
}

export function calculateDamage(attacker: BattleCreature, defender: BattleCreature, move: Move): DamageResult {
    const { types } = useGameDataStore.getState();
    const level = attacker.level;
    const power = move.power || 0;

    // Status moves deal 0 damage
    if (move.category === "status" || power === 0) {
        return { damage: 0, isCritical: false, effectiveness: 1 };
    }

    const isSpecial = move.category === "special";

    const atk = getBattleStat(attacker, isSpecial ? "sp_attack" : "attack");
    const def = getBattleStat(defender, isSpecial ? "sp_defense" : "defense");

    // Base Damage Correlation
    const baseDamage = Math.floor((((2 * level / 5 + 2) * power * atk / def) / 50) + 2);

    // Multipliers

    // 1. Critical Hit (1/16 chance)
    const isCritical = Math.random() < 0.0625;
    const critMultiplier = isCritical ? 1.5 : 1.0;

    // 2. STAB (Same Type Attack Bonus)
    const isSTAB = attacker.typing.includes(move.type);
    const stabMultiplier = isSTAB ? 1.5 : 1.0;

    // 3. Type Effectiveness & Defense Category
    let typeEffectiveness = getTypeEffectiveness(move.type, defender.typing);
    let defenseCategoryMultiplier = 1.0;

    if (types && types.data) {
        // Defense Category: Defender Type properties vs Move Category
        defender.typing.forEach(defenderType => {
            const typeData = types.data[defenderType];
            if (typeData) {
                const category = move.category as "physical" | "special";
                if (typeData.defense && typeData.defense[category] !== undefined) {
                    defenseCategoryMultiplier *= typeData.defense[category];
                }
            }
        });
    }

    // 4. Random Variance (0.85 - 1.00)
    const variance = (Math.floor(Math.random() * 16) + 85) / 100;

    // Total Damage
    let totalDamage = Math.floor(baseDamage * critMultiplier * stabMultiplier * typeEffectiveness * defenseCategoryMultiplier * variance);

    // Prevent 0 damage if logic says it should be >0, unless immunity (effectiveness 0 or defense 0)
    if (typeEffectiveness === 0 || defenseCategoryMultiplier === 0) {
        totalDamage = 0;
    } else {
        totalDamage = Math.max(1, totalDamage);
    }

    return {
        damage: totalDamage,
        isCritical,
        effectiveness: typeEffectiveness
    };
}

// Unified Creature Creator
export function createPokemon(speciesName: string, level: number, ivs?: any): BattleCreature {
    const { creatures } = useGameDataStore.getState();
    if (!creatures || creatures.length === 0) {
        throw new Error("Game data not loaded");
    }

    const template = creatures.find(c => c.name === speciesName);
    if (!template) {
        throw new Error(`Creature ${speciesName} not found`);
    }

    const finalIVs = ivs || generateIVs();
    const maxHp = calculateMaxHp(template.base_stats.hp, level, finalIVs.hp);

    return {
        id: generateId(),
        name: template.name,
        species: template.name,
        level,
        experience: 0,
        hp: maxHp,
        maxHp: maxHp,
        moves: template.moveset.filter(m => m.level <= level).slice(-4).map(m => m.move_key),
        ability: template.abilities[0],
        shiny: false,
        ivs: finalIVs,
        evs: { hp: 0, attack: 0, defense: 0, sp_attack: 0, sp_defense: 0, speed: 0 } as any,
        status: "",
        sprite: template.sprite,
        typing: template.typing,
        description: template.description,
        base_stats: template.base_stats,
        currentHp: maxHp
    } as BattleCreature;
}

export function generateOpponent(playerLevel: number): BattleCreature {
    const { creatures } = useGameDataStore.getState();
    if (!creatures || creatures.length === 0) throw new Error("Game data not loaded");

    // Get available creatures based on player level
    const availableCreatures = getAvailableCreaturesForLevel(creatures, playerLevel);
    if (availableCreatures.length === 0) throw new Error("No available creatures for player level");

    // Pick random creature from available ones
    const randomCreature = availableCreatures[Math.floor(Math.random() * availableCreatures.length)];

    // Determine level: playerLevel - 2 to playerLevel + 1
    const minLevel = Math.max(1, playerLevel - 2);
    const maxLevel = Math.max(1, playerLevel + 1);
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

    return createPokemon(randomCreature.name, level);
}

export function generatePlayerStarter(): BattleCreature {
    const { creatures } = useGameDataStore.getState();
    if (!creatures || creatures.length === 0) throw new Error("Game data not loaded");

    // Try to find Charmander, Squirtle, or Bulbasaur
    const starters = creatures.filter(c => ["Charmander", "Squirtle", "Bulbasaur"].includes(c.name));
    const template = starters.length > 0 ? starters[Math.floor(Math.random() * starters.length)] : creatures[0];

    return createPokemon(template.name, 5);
}
