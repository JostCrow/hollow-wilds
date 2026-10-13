import { z } from "zod";
import {
  creatures,
  moves,
  species,
  effectiveness,
  stoneByKey,
} from "./data.ts";
import {
  zoneById,
  zones,
  getWorld,
  walkable,
  reachableTiles,
  exitPoint,
} from "./world.ts";
import type { Direction } from "./world.ts";

import { effectiveBaseStat, traitLabel } from "./traits.ts";
import type { Traits } from "./traits.ts";

export type Companion = Traits & {
  id: string;
  species: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  moves: string[];
  pp: Record<string, number>;
};
export type Save = {
  version: 2;
  trainer: string;
  party: Companion[];
  storage: Companion[];
  zone: string;
  x: number;
  y: number;
  money: number;
  balls: number;
  potions: number;
  stones: Record<string, number>;
  caught: string[];
  seen: string[];
  visited: string[];
  collected: string[];
  wins: number;
  badge: boolean;
  steps: number;
  savedAt: string;
};
export type Battle = {
  enemy: Companion;
  active: string;
  trainer: boolean;
  turn: number;
  log: string[];
  outcome: "won" | "caught" | "fled" | "lost" | null;
  stages: Record<string, { attack: number; defense: number; accuracy: number }>;
  conditions: Record<string, "poison" | "burn" | "stun">;
};
export type Action =
  | { type: "move"; key: string }
  | { type: "catch" }
  | { type: "potion" }
  | { type: "run" }
  | { type: "switch"; id: string };
export const SAVE_KEY = "hollow-wilds-adventure-v2";
export const xpNeeded = (level: number) => 30 + level * 14;
export const maxHp = (name: string, level: number, traits: Partial<Traits> = {}) =>
  Math.floor((effectiveBaseStat(name, "hp", traits) * level) / 50) + level + 18;
export function learnedMoves(name: string, level: number) {
  const available = [
    ...new Set(
      species[name].moveset
        .filter((m) => m.level <= level && moves[m.move_key])
        .map((m) => m.move_key),
    ),
  ];
  if (!available.some((key) => moves[key].power > 0))
    available.unshift("tackle");
  const latest = available.slice(-4);
  if (!latest.some((key) => moves[key].power > 0))
    latest[0] = available.find((key) => moves[key].power > 0)!;
  return latest;
}
export function makeCompanion(
  name: string,
  level: number,
  id = globalThis.crypto.randomUUID(),
  traits: Partial<Traits> = {},
): Companion {
  const keys = learnedMoves(name, level);
  return {
    id,
    species: name,
    shiny: traits.shiny ?? false,
    alpha: traits.alpha ?? false,
    level,
    xp: 0,
    hp: maxHp(name, level, traits),
    maxHp: maxHp(name, level, traits),
    moves: keys,
    pp: Object.fromEntries(keys.map((k) => [k, moves[k].max_uses])),
  };
}
export function newSave(starter: string, trainer: string): Save {
  if (!["Flarepib", "Verdreep", "Rivanos"].includes(starter))
    throw new Error("Choose a starter.");
  return {
    version: 2,
    trainer: trainer.trim().slice(0, 20) || "Wanderer",
    party: [makeCompanion(starter, 5)],
    storage: [],
    zone: "willowfen",
    x: 20,
    y: 15,
    money: 600,
    balls: 10,
    potions: 5,
    stones: {},
    caught: [starter],
    seen: [starter],
    visited: ["willowfen"],
    collected: [],
    wins: 0,
    badge: false,
    steps: 0,
    savedAt: new Date().toISOString(),
  };
}
export function heal(save: Save): Save {
  return {
    ...save,
    party: save.party.map((c) => ({
      ...c,
      hp: c.maxHp,
      pp: Object.fromEntries(c.moves.map((k) => [k, moves[k].max_uses])),
    })),
  };
}
const nonnegative = z.number().int().min(0).max(1e9);
const companionSchema = z.object({
  shiny: z.boolean().default(false),
  alpha: z.boolean().default(false),
  id: z.string().min(1).max(100),
  species: z.string().refine((n) => !!species[n]),
  level: z.number().int().min(1).max(100),
  xp: nonnegative,
  hp: nonnegative,
  maxHp: nonnegative,
  moves: z
    .array(z.string().refine((k) => !!moves[k]))
    .min(1)
    .max(4),
  pp: z.record(z.string(), nonnegative),
});
const names = z
  .array(z.string().refine((n) => !!species[n]))
  .max(creatures.length);
const zoneNames = z
  .array(z.string().refine((id) => zones.some((z) => z.id === id)))
  .max(zones.length);
const saveSchema = z.object({
  version: z.literal(2),
  trainer: z.string().min(1).max(20),
  party: z.array(companionSchema).min(1).max(6),
  storage: z.array(companionSchema).max(1000),
  zone: z.string().refine((id) => zones.some((z) => z.id === id)),
  x: z
    .number()
    .int()
    .min(0)
    .max(Math.max(...zones.map((z) => z.width)) - 1),
  y: z
    .number()
    .int()
    .min(0)
    .max(Math.max(...zones.map((z) => z.height)) - 1),
  money: nonnegative,
  balls: nonnegative,
  potions: nonnegative,
  stones: z
    .record(
      z
        .string()
        .refine((key) => Object.prototype.hasOwnProperty.call(stoneByKey, key)),
      nonnegative,
    )
    .default({}),
  caught: names,
  seen: names,
  visited: zoneNames,
  collected: z.array(z.string().max(60)).max(1000),
  wins: nonnegative,
  badge: z.boolean(),
  steps: nonnegative,
  savedAt: z.string(),
});
export function parseSave(input: unknown): Save {
  const result = saveSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      "This is not a valid Hollow Wilds adventure save (version 2). Your current adventure is safe.",
    );
  const save = result.data;
  const world = getWorld(save.zone);
  if (
    !walkable(world, save.x, save.y) ||
    !reachableTiles(world).has(save.y * world.width + save.x)
  ) {
    save.x = world.spawn.x;
    save.y = world.spawn.y;
  }
  const ids = new Set<string>();
  for (const c of [...save.party, ...save.storage]) {
    if (ids.has(c.id))
      throw new Error("This save contains duplicate companion IDs.");
    ids.add(c.id);
    c.maxHp = maxHp(c.species, c.level, c);
    c.hp = Math.min(c.hp, c.maxHp);
    c.xp = Math.min(c.xp, xpNeeded(c.level) - 1);
    c.pp = Object.fromEntries(
      c.moves.map((k) => [
        k,
        Math.min(c.pp[k] ?? moves[k].max_uses, moves[k].max_uses),
      ]),
    );
  }
  save.caught = [
    ...new Set([
      ...save.caught,
      ...save.party.map((c) => c.species),
      ...save.storage.map((c) => c.species),
    ]),
  ];
  save.seen = [...new Set([...save.seen, ...save.caught])];
  save.visited = [...new Set([...save.visited, save.zone])];
  return save.party.some((c) => c.hp > 0)
    ? save
    : heal({ ...save, zone: "willowfen", x: 20, y: 15 });
}
export function beginBattle(
  save: Save,
  name: string,
  level: number,
  trainer = false,
  traits: Partial<Traits> = {},
): Battle {
  return {
    enemy: makeCompanion(name, level, undefined, traits),
    active: (save.party.find((c) => c.hp > 0) ?? save.party[0]).id,
    trainer,
    turn: 0,
    log: [
      trainer
        ? `Ranger Elowen sends out ${name}. Show her what you have learned!`
        : `A wild ${traitLabel(traits) ? traitLabel(traits) + " " : ""}${name} steps out of the grass!`,
    ],
    outcome: null,
    stages: {},
    conditions: {},
  };
}
export function catchChance(enemy: Companion) {
  return Math.min(0.94, 0.22 + (1 - enemy.hp / enemy.maxHp) * 0.73);
}
function awardXp(c: Companion, amount: number, log: string[]) {
  c.xp += amount;
  log.push(`${c.species} gained ${amount} experience.`);
  while (c.xp >= xpNeeded(c.level) && c.level < 100) {
    c.xp -= xpNeeded(c.level);
    c.level++;
    const evolution = species[c.species].evolution_requirements?.find(
      (e) =>
        e.type === "level" &&
        (e.level ?? 101) <= c.level &&
        species[e.evolves_to],
    );
    if (evolution) {
      log.push(`${c.species} evolved into ${evolution.evolves_to}!`);
      c.species = evolution.evolves_to;
    }
    const nextHp = maxHp(c.species, c.level, c);
    c.hp = Math.max(1, Math.min(nextHp, c.hp + nextHp - c.maxHp));
    c.maxHp = nextHp;
    const keys = learnedMoves(c.species, c.level);
    for (const key of keys)
      if (!c.moves.includes(key))
        log.push(`${c.species} learned ${moves[key].name}!`);
    c.pp = Object.fromEntries(
      keys.map((k) => [k, c.pp[k] ?? moves[k].max_uses]),
    );
    c.moves = keys;
    log.push(`${c.species} reached level ${c.level}!`);
  }
}
export function takeTurn(
  original: Save,
  originalBattle: Battle,
  action: Action,
  rng = Math.random,
): { save: Save; battle: Battle } {
  const save: Save = structuredClone(original),
    battle: Battle = structuredClone(originalBattle);
  if (battle.outcome) return { save, battle };
  let active = save.party.find((c) => c.id === battle.active)!;
  const enemy = battle.enemy,
    log: string[] = [];
  const stage = (c: Companion) =>
    battle.stages[c.id] ??
    (battle.stages[c.id] = { attack: 1, defense: 1, accuracy: 1 });
  const finish = (outcome: Battle["outcome"]) => {
    battle.outcome = outcome;
    if (outcome === "won" || outcome === "caught") {
      awardXp(active, enemy.level * (battle.trainer ? 32 : 15) + 25, log);
      save.caught = [...new Set([...save.caught, active.species])];
      save.seen = [...new Set([...save.seen, active.species])];
      if (outcome === "won") {
        save.wins++;
        const reward = battle.trainer ? 450 : 35 + enemy.level * 8;
        save.money += reward;
        log.push(`You earned ${reward} coins.`);
      }
      if (battle.trainer) {
        save.badge = true;
        log.push(
          "Elowen awards you the Wildflower Badge! The whole region is yours to explore.",
        );
      }
    }
  };
  const check = () => {
    if (enemy.hp <= 0) {
      log.push(`${enemy.species} fainted. You won!`);
      finish("won");
      return true;
    }
    if (active.hp <= 0) {
      log.push(`${active.species} fainted.`);
      const next = save.party.find((c) => c.hp > 0);
      if (!next) {
        log.push(
          "Your team needs a rest. Professor Fern will bring you home and heal your companions.",
        );
        save.money = Math.max(0, save.money - 60);
        finish("lost");
        return true;
      }
      active = next;
      battle.active = next.id;
      log.push(`Go, ${next.species}!`);
    }
    return false;
  };
  const attack = (attacker: Companion, defender: Companion, key: string) => {
    const move =
      key === "struggle"
        ? {
            name: "Struggle",
            power: 40,
            type: "Normal",
            category: "physical",
            accuracy: 100,
          }
        : moves[key];
    if (!move) return;
    if (battle.conditions[attacker.id] === "stun" && rng() < 0.2) {
      log.push(`${attacker.species} is stunned and cannot move!`);
      return;
    }
    if (key !== "struggle")
      attacker.pp[key] = Math.max(0, attacker.pp[key] - 1);
    log.push(`${attacker.species} used ${move.name}.`);
    if (rng() * 100 >= move.accuracy * stage(attacker).accuracy) {
      log.push("The move missed!");
      return;
    }
    if (!move.power) {
      if (/heal|recover|rest|synthesis|moonlight|morning_sun/.test(key)) {
        const amount = Math.min(
          attacker.maxHp - attacker.hp,
          Math.ceil(attacker.maxHp * 0.4),
        );
        attacker.hp += amount;
        log.push(`Recovered ${amount} HP.`);
      } else if (/toxic|poison|wisp|thunder_wave|stun/.test(key)) {
        const status = /wisp/.test(key)
          ? "burn"
          : /thunder|stun/.test(key)
            ? "stun"
            : "poison";
        battle.conditions[defender.id] = status;
        log.push(`${defender.species} now has ${status}.`);
      } else if (/growl|charm|roar/.test(key)) {
        stage(defender).attack = Math.max(0.4, stage(defender).attack * 0.75);
        log.push(`${defender.species}'s attack fell.`);
      } else if (/sand|smoke|flash/.test(key)) {
        stage(defender).accuracy = Math.max(
          0.5,
          stage(defender).accuracy * 0.8,
        );
        log.push(`${defender.species}'s accuracy fell.`);
      } else if (/defense|harden|reflect|screen|protect/.test(key)) {
        stage(attacker).defense = Math.min(2.5, stage(attacker).defense * 1.3);
        log.push(`${attacker.species}'s defense rose.`);
      } else {
        stage(attacker).attack = Math.min(2.5, stage(attacker).attack * 1.3);
        log.push(`${attacker.species}'s attack rose.`);
      }
      return;
    }
    const a = species[attacker.species],
      d = species[defender.species],
      special = move.category === "special";
    const atk =
      ((effectiveBaseStat(attacker.species, special ? "sp_attack" : "attack", attacker) * attacker.level) / 50 +
        5) *
      stage(attacker).attack;
    const def =
      ((effectiveBaseStat(defender.species, special ? "sp_defense" : "defense", defender) * defender.level) /
        50 +
        5) *
      stage(defender).defense;
    const eff = effectiveness(move.type, d.typing);
    const damage =
      eff === 0
        ? 0
        : Math.max(
            1,
            Math.floor(
              ((((2 * attacker.level) / 5 + 2) * move.power * atk) / def / 50 +
                2) *
                eff *
                (a.typing.includes(move.type as (typeof a.typing)[number])
                  ? 1.5
                  : 1) *
                (0.88 + rng() * 0.12) *
                (battle.conditions[attacker.id] === "burn" && !special
                  ? 0.6
                  : 1),
            ),
          );
    defender.hp = Math.max(0, defender.hp - damage);
    log.push(
      `${damage} damage.${eff > 1 ? " Super effective!" : eff === 0 ? " It has no effect." : eff < 1 ? " Not very effective." : ""}`,
    );
    if (key === "struggle") {
      attacker.hp = Math.max(
        0,
        attacker.hp - Math.max(1, Math.floor(attacker.maxHp / 8)),
      );
      log.push("Struggle caused recoil.");
    }
  };
  const enemyAttack = () => {
    const available = enemy.moves.filter((k) => enemy.pp[k] > 0);
    const attacks = available.filter((k) => moves[k].power > 0);
    const options = attacks.length && rng() < 0.8 ? attacks : available;
    attack(
      enemy,
      active,
      options.length ? options[Math.floor(rng() * options.length)] : "struggle",
    );
  };
  if (action.type === "run") {
    if (battle.trainer) {
      log.push("You leave the ranger challenge. Come back when you are ready.");
    } else log.push("You slipped away safely.");
    finish("fled");
  } else if (action.type === "catch") {
    if (battle.trainer || save.balls <= 0 || save.storage.length >= 1000)
      return { save: original, battle: originalBattle };
    save.balls--;
    log.push("You threw a capture orb…");
    if (rng() < catchChance(enemy)) {
      const caught = structuredClone(enemy);
      caught.hp = Math.max(1, caught.hp);
      if (save.party.length < 6) save.party.push(caught);
      else save.storage.push(caught);
      save.caught = [...new Set([...save.caught, enemy.species])];
      log.push(
        `Gotcha! ${enemy.species} joined your ${save.party.length <= 6 && save.party.some((c) => c.id === caught.id) ? "team" : "storage"}.`,
      );
      finish("caught");
    } else {
      log.push(
        `${enemy.species} broke free! Weaken it to improve your chances.`,
      );
      enemyAttack();
      check();
    }
  } else if (action.type === "potion") {
    if (save.potions <= 0 || active.hp === active.maxHp)
      return { save: original, battle: originalBattle };
    save.potions--;
    const amount = Math.min(30, active.maxHp - active.hp);
    active.hp += amount;
    log.push(`${active.species} recovered ${amount} HP.`);
    enemyAttack();
    check();
  } else if (action.type === "switch") {
    const next = save.party.find(
      (c) => c.id === action.id && c.hp > 0 && c.id !== active.id,
    );
    if (!next) return { save: original, battle: originalBattle };
    active = next;
    battle.active = next.id;
    log.push(`Go, ${next.species}!`);
    enemyAttack();
    check();
  } else {
    if (
      action.key !== "struggle" &&
      (!active.moves.includes(action.key) || active.pp[action.key] <= 0)
    )
      return { save: original, battle: originalBattle };
    if (action.key === "struggle" && active.moves.some((k) => active.pp[k] > 0))
      return { save: original, battle: originalBattle };
    const first =
      action.key === "quick_attack" ||
      effectiveBaseStat(active.species, "speed", active) * active.level >=
        effectiveBaseStat(enemy.species, "speed", enemy) * enemy.level;
    if (first) {
      attack(active, enemy, action.key);
      if (!check()) {
        enemyAttack();
        check();
      }
    } else {
      const id = active.id;
      enemyAttack();
      if (!check() && active.id === id) {
        attack(active, enemy, action.key);
        check();
      }
    }
  }
  if (!battle.outcome && action.type !== "run") {
    for (const c of [active, enemy])
      if (
        battle.conditions[c.id] === "poison" ||
        battle.conditions[c.id] === "burn"
      ) {
        const damage = Math.max(1, Math.floor(c.maxHp / 12));
        c.hp = Math.max(0, c.hp - damage);
        log.push(
          `${c.species} took ${damage} ${battle.conditions[c.id]} damage.`,
        );
      }
    check();
  }
  battle.turn++;
  battle.log = [...battle.log, ...log].slice(-40);
  return { save, battle };
}
export function travel(save: Save, zone: string, from?: Direction): Save {
  const destination = zoneById(zone);
  const entrance = destination.exits.find(
    (e) => e.direction === from && e.target === save.zone,
  );
  const point = entrance
    ? exitPoint(destination, entrance, 3)
    : destination.spawn;
  return {
    ...save,
    zone: destination.id,
    ...point,
    visited: [...new Set([...save.visited, destination.id])],
  };
}

export function stoneEvolutions(name: string) {
  return (species[name]?.evolution_requirements ?? []).filter(
    (e) =>
      e.type === "stone" &&
      e.stone &&
      Object.prototype.hasOwnProperty.call(stoneByKey, e.stone) &&
      species[e.evolves_to],
  );
}

export function buyStone(save: Save, key: string): Save {
  if (!Object.prototype.hasOwnProperty.call(stoneByKey, key)) return save;
  const stone = stoneByKey[key];
  if (save.money < stone.price) return save;
  return {
    ...save,
    money: save.money - stone.price,
    stones: { ...save.stones, [key]: (save.stones[key] ?? 0) + 1 },
  };
}

export function evolveWithStone(
  save: Save,
  companionId: string,
  key: string,
): Save {
  const companion = save.party.find((c) => c.id === companionId);
  if (!companion || companion.hp <= 0 || !(save.stones[key] > 0)) return save;
  const evolution = stoneEvolutions(companion.species).find(
    (e) => e.stone === key,
  );
  if (!evolution) return save;
  const name = evolution.evolves_to,
    keys = learnedMoves(name, companion.level),
    nextHp = maxHp(name, companion.level, companion);
  const evolved = {
    ...companion,
    species: name,
    maxHp: nextHp,
    hp: Math.max(1, Math.min(nextHp, companion.hp + nextHp - companion.maxHp)),
    moves: keys,
    pp: Object.fromEntries(
      keys.map((k) => [
        k,
        Math.min(companion.pp[k] ?? moves[k].max_uses, moves[k].max_uses),
      ]),
    ),
  };
  return {
    ...save,
    party: save.party.map((c) => (c.id === companionId ? evolved : c)),
    stones: { ...save.stones, [key]: save.stones[key] - 1 },
    caught: [...new Set([...save.caught, name])],
    seen: [...new Set([...save.seen, name])],
  };
}
