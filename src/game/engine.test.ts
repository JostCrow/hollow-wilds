import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginBattle,
  buyStone,
  evolveWithStone,
  stoneEvolutions,
  catchChance,
  heal,
  learnedMoves,
  makeCompanion,
  newSave,
  parseSave,
  takeTurn,
  travel,
  xpNeeded,
} from "./engine.ts";
import { creatures, effectiveness, moves, evolutionStones } from "./data.ts";
import {
  zones,
  getWorld,
  findPath,
  createSpawns,
  walkable,
  exitPoint,
  exitAt,
  opposite,
  zoneById,
} from "./world.ts";

for (const starter of ["Flarepib", "Verdreep", "Rivanos"])
  test(`${starter}: new game, valid save, and first battle are playable`, () => {
    let save = newSave(starter, "Tester"),
      battle = beginBattle(save, "Niblet", 2);
    assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
    for (let i = 0; i < 40 && !battle.outcome; i++) {
      const active = save.party.find((c) => c.id === battle.active)!;
      const key =
        active.moves.find((k) => moves[k].power > 0 && active.pp[k] > 0) ??
        "struggle";
      ({ save, battle } = takeTurn(
        save,
        battle,
        { type: "move", key },
        () => 0.4,
      ));
    }
    assert.equal(battle.outcome, "won");
    assert.equal(save.wins, 1);
    assert.ok(save.money > 600);
    assert.ok(save.party[0].xp > 0);
  });

test("every JSON creature has usable stats and a legal damaging move at each level", () => {
  for (const c of creatures)
    for (const level of [1, 5, 10, 16, 36, 60, 100]) {
      const companion = makeCompanion(c.name, level);
      assert.ok(Number.isFinite(companion.hp) && companion.hp > 0, c.name);
      assert.ok(
        companion.moves.length > 0 && companion.moves.length <= 4,
        c.name,
      );
      assert.ok(
        companion.moves.some((k) => moves[k].power > 0),
        `${c.name} at level ${level}`,
      );
      assert.ok(
        companion.moves.every((k) => !!moves[k] && companion.pp[k] > 0),
        c.name,
      );
    }
});

test("type matchups come from the original type chart and multiply dual types", () => {
  assert.equal(effectiveness("Fire", ["Plant"]), 2);
  assert.equal(effectiveness("Fire", ["Plant", "Ice"]), 4);
  assert.equal(effectiveness("Water", ["Fire"]), 2);
});

test("capture consumes an orb, registers the species, and persists the companion", () => {
  const original = newSave("Flarepib", "Tester"),
    originalBattle = beginBattle(original, "Twigglo", 3);
  originalBattle.enemy.hp = 1;
  const { save, battle } = takeTurn(
    original,
    originalBattle,
    { type: "catch" },
    () => 0,
  );
  assert.equal(battle.outcome, "caught");
  assert.equal(save.balls, 9);
  assert.equal(save.party.length, 2);
  assert.ok(save.caught.includes("Twigglo"));
  assert.ok(save.seen.includes("Twigglo"));
  assert.ok(!original.seen.includes("Twigglo"));
  assert.equal(original.balls, 10);
  assert.equal(original.party.length, 1); // pure turn resolution
  assert.ok(catchChance(originalBattle.enemy) > 0.85);
  assert.equal(
    parseSave(JSON.parse(JSON.stringify(save))).party[1].species,
    "Twigglo",
  );
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))).seen, save.seen);
});

test("a full team sends captures to storage without dropping them", () => {
  const original = newSave("Flarepib", "Tester");
  original.party.push(
    ...Array.from({ length: 5 }, () => makeCompanion("Niblet", 3)),
  );
  const { save, battle } = takeTurn(
    original,
    beginBattle(original, "Puddlop", 3),
    { type: "catch" },
    () => 0,
  );
  assert.equal(battle.outcome, "caught");
  assert.equal(save.party.length, 6);
  assert.equal(save.storage.length, 1);
  assert.equal(save.storage[0].species, "Puddlop");
});

test("unavailable resources, illegal moves, and trainer captures cannot advance a turn", () => {
  const save = newSave("Flarepib", "Tester");
  save.balls = 0;
  save.potions = 0;
  const battle = beginBattle(save, "Niblet", 2);
  for (const action of [
    { type: "catch" },
    { type: "potion" },
    { type: "move", key: "surf" },
    { type: "move", key: "struggle" },
  ] as const)
    assert.equal(takeTurn(save, battle, action).battle.turn, 0);
  save.balls = 5;
  assert.equal(
    takeTurn(save, beginBattle(save, "Brambright", 10, true), { type: "catch" })
      .save.balls,
    5,
  );
});

test("fainting switches to the next healthy companion, and a total defeat has a recovery path", () => {
  const original = newSave("Flarepib", "Tester");
  original.party[0].hp = 1;
  original.party.push(makeCompanion("Rivanos", 5));
  const enemyBattle = beginBattle(original, "Brambright", 30);
  let { save, battle } = takeTurn(
    original,
    enemyBattle,
    { type: "move", key: "growl" },
    () => 0.1,
  );
  assert.equal(save.party[0].hp, 0);
  assert.equal(battle.active, save.party[1].id);
  save.party[1].hp = 1;
  ({ save, battle } = takeTurn(
    save,
    battle,
    { type: "move", key: save.party[1].moves[0] },
    () => 0.1,
  ));
  assert.equal(battle.outcome, "lost");
  const restored = parseSave(JSON.parse(JSON.stringify(save)));
  assert.equal(restored.zone, "willowfen");
  assert.ok(restored.party.every((c) => c.hp === c.maxHp));
});

test("PP depletion offers Struggle; free healing restores HP and PP", () => {
  const save = newSave("Flarepib", "Tester");
  save.party[0].hp = 10;
  save.party[0].pp = { ember: 0, growl: 0 };
  const result = takeTurn(
    save,
    beginBattle(save, "Niblet", 2),
    { type: "move", key: "struggle" },
    () => 0.4,
  );
  assert.equal(result.battle.turn, 1);
  assert.ok(result.battle.enemy.hp < result.battle.enemy.maxHp);
  const healed = heal(result.save);
  assert.equal(healed.party[0].hp, healed.party[0].maxHp);
  assert.equal(healed.party[0].pp.ember, moves.ember.max_uses);
});

test("experience unlocks level evolution and updates moves and health", () => {
  const save = newSave("Flarepib", "Tester");
  save.party[0] = makeCompanion("Flarepib", 15);
  save.party[0].xp = xpNeeded(15) - 1;
  const battle = beginBattle(save, "Niblet", 2);
  battle.enemy.hp = 1;
  const result = takeTurn(
    save,
    battle,
    { type: "move", key: save.party[0].moves.find((k) => moves[k].power > 0)! },
    () => 0.2,
  );
  assert.equal(result.battle.outcome, "won");
  assert.equal(result.save.party[0].species, "Lumacroak");
  assert.equal(result.save.party[0].level, 16);
  assert.deepEqual(result.save.party[0].moves, learnedMoves("Lumacroak", 16));
  assert.ok(result.save.caught.includes("Lumacroak"));
});

test("ranger victory grants the badge and survives serialization", () => {
  const save = newSave("Flarepib", "Tester");
  save.party[0] = makeCompanion("Flarepib", 10);
  const battle = beginBattle(save, "Brambright", 10, true);
  battle.enemy.hp = 1;
  const result = takeTurn(
    save,
    battle,
    { type: "move", key: "ember" },
    () => 0.2,
  );
  assert.equal(result.battle.outcome, "won");
  assert.equal(result.save.badge, true);
  assert.equal(parseSave(result.save).badge, true);
});

test("invalid saves are rejected; blocked positions and exhausted teams recover safely", () => {
  assert.throws(() => parseSave({ version: 1 }));
  const save = newSave("Flarepib", "Tester");
  assert.throws(() => parseSave({ ...save, zone: "missing" }));
  assert.throws(() => parseSave({ ...save, balls: -1 }));
  assert.throws(() =>
    parseSave({ ...save, party: [{ ...save.party[0], species: "Missing" }] }),
  );
  assert.throws(() =>
    parseSave({ ...save, party: [save.party[0], save.party[0]] }),
  );
  const recovered = parseSave({ ...save, x: 0, y: 0 });
  assert.equal(recovered.x, 20);
  assert.equal(recovered.y, 15);
});

for (const zone of zones)
  test(`${zone.name}: routes, services, pickups, NPCs, and encounters are reachable`, () => {
    const world = getWorld(zone.id),
      start = world.spawn;
    const reachable = (p: { x: number; y: number }) =>
      assert.ok(
        findPath(world, start, p).length ||
          (p.x === start.x && p.y === start.y),
        `${zone.id} ${JSON.stringify(p)}`,
      );
    for (const exit of zone.exits) reachable(exitPoint(zone, exit));
    for (const b of world.buildings) {
      reachable({ x: b.x + Math.floor(b.w / 2), y: b.y + b.h + 1 });
      assert.equal(walkable(world, b.x, b.y), false);
    }
    for (const npc of world.npcs) reachable({ x: npc.x, y: npc.y + 1 });
    world.pickups.forEach(reachable);
    for (let cycle = 0; cycle < 6; cycle++)
      createSpawns(zone.id, cycle).forEach(reachable);
    const arrived = travel(newSave("Flarepib", "Test"), zone.id);
    assert.ok(arrived.visited.includes(zone.id));
    assert.ok(walkable(world, arrived.x, arrived.y));
  });

test("every route connects both ways and arrives inside the matching entrance", () => {
  for (const zone of zones)
    for (const exit of zone.exits) {
      const destination = zoneById(exit.target);
      const entrance = destination.exits.find(
        (e) => e.target === zone.id && e.direction === opposite[exit.direction],
      );
      assert.ok(entrance, `${zone.id} -> ${exit.target} has a return route`);
      const save = { ...newSave("Flarepib", "Test"), zone: zone.id };
      const arrived = travel(save, exit.target, opposite[exit.direction]);
      assert.deepEqual(
        { x: arrived.x, y: arrived.y },
        exitPoint(destination, entrance, 3),
      );
      assert.ok(!exitAt(getWorld(destination.id), arrived.x, arrived.y));
      const back = travel(arrived, zone.id, exit.direction);
      assert.deepEqual({ x: back.x, y: back.y }, exitPoint(zone, exit, 3));
    }
});

test("the region is fully connected with branching paths and loops", () => {
  const reached = new Set([zones[0].id]),
    queue = [zones[0]];
  for (const z of queue)
    for (const e of z.exits)
      if (!reached.has(e.target)) {
        reached.add(e.target);
        queue.push(zoneById(e.target));
      }
  assert.equal(reached.size, zones.length);
  assert.ok(zones.some((z) => z.exits.length >= 4));
  assert.ok(zones.reduce((n, z) => n + z.exits.length, 0) / 2 >= zones.length);
  assert.ok(new Set(zones.map((z) => `${z.width}x${z.height}`)).size >= 6);
  assert.ok(zones.some((z) => z.height > z.width * 1.5));
  assert.ok(zones.some((z) => z.width > z.height * 1.5));
});

test("only marked exits open the boundary of each area", () => {
  for (const z of zones) {
    const w = getWorld(z.id);
    for (let y = 0; y < w.height; y++)
      for (let x = 0; x < w.width; x++) {
        if (x && y && x !== w.width - 1 && y !== w.height - 1) continue;
        assert.equal(
          walkable(w, x, y),
          Boolean(exitAt(w, x, y)),
          `${z.id} boundary ${x},${y}`,
        );
      }
  }
});

test("wide and tall route positions survive save export/import and pathfinding", () => {
  for (const id of ["reedwater", "frostpass"]) {
    const w = getWorld(id),
      end = w.encounterSpots.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b));
    assert.ok(end.x > 39 || end.y > 27);
    const path = findPath(w, w.spawn, end);
    assert.deepEqual(path.at(-1), end);
    for (let i = 0; i < path.length; i++) {
      const prev = path[i - 1] ?? w.spawn;
      assert.equal(
        Math.abs(path[i].x - prev.x) + Math.abs(path[i].y - prev.y),
        1,
      );
      assert.ok(walkable(w, path[i].x, path[i].y));
    }
    const save = { ...travel(newSave("Flarepib", "Test"), id), ...end };
    assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
  }
});

test("existing version 2 saves recover safely when terrain changes", () => {
  for (const zone of zones) {
    const old = { ...newSave("Flarepib", "Test"), zone: zone.id, x: 0, y: 0 };
    const recovered = parseSave(old);
    assert.deepEqual({ x: recovered.x, y: recovered.y }, zone.spawn);
    assert.deepEqual(recovered.party, old.party);
    assert.equal(recovered.money, old.money);
  }
});

test("Pupawn has reachable spawns in Sunpetal and Bramble on arrival", () => {
  for (const id of ["sunpetal", "bramble"]) {
    const world = getWorld(id),
      pupawn = createSpawns(id).find((s) => s.species === "Pupawn");
    assert.ok(pupawn, id);
    assert.ok(findPath(world, world.spawn, pupawn).length);
  }
});

test("old saves receive an empty stone bag; corrupt inventories are rejected", () => {
  const save = newSave("Flarepib", "Test");
  const old = { ...save } as Partial<typeof save>;
  delete old.stones;
  assert.deepEqual(parseSave(old).stones, {});
  assert.throws(() => parseSave({ ...save, stones: { fire_stone: -1 } }));
  assert.throws(() => parseSave({ ...save, stones: { fire_stone: 0.5 } }));
  assert.throws(() => parseSave({ ...save, stones: { missing_stone: 1 } }));
});

test("stones cost coins, persist, and cannot be bought with insufficient money", () => {
  for (const stone of evolutionStones) {
    const save = newSave("Flarepib", "Test");
    const purchased = buyStone(save, stone.key);
    assert.equal(purchased.money, save.money - stone.price);
    assert.equal(purchased.stones[stone.key], 1);
    assert.deepEqual(
      parseSave(JSON.parse(JSON.stringify(purchased))),
      purchased,
    );
    assert.deepEqual(save.stones, {});
    const poor = { ...save, money: stone.price - 1 };
    assert.equal(buyStone(poor, stone.key), poor);
  }
  const save = newSave("Flarepib", "Test");
  assert.equal(buyStone(save, "invalid"), save);
  assert.equal(buyStone(save, "__proto__"), save);
});

for (const evolution of stoneEvolutions("Pupawn"))
  test(`Pupawn evolves into ${evolution.evolves_to} using ${evolution.stone}`, () => {
    const original = newSave("Flarepib", "Test");
    original.seen.push("Pupawn");
    const battle = beginBattle(original, "Pupawn", 5);
    battle.enemy.hp = 1;
    const capture = takeTurn(original, battle, { type: "catch" }, () => 0);
    assert.equal(capture.battle.outcome, "caught");
    const pupawn = capture.save.party.find((c) => c.species === "Pupawn")!;
    pupawn.xp = 17;
    const save = buyStone(capture.save, evolution.stone!);
    const before = structuredClone(save);
    const result = evolveWithStone(save, pupawn.id, evolution.stone!);
    const evolved = result.party.find((c) => c.id === pupawn.id)!;
    assert.equal(evolved.species, evolution.evolves_to);
    assert.equal(evolved.level, pupawn.level);
    assert.equal(evolved.xp, 17);
    assert.ok(evolved.hp > 0 && evolved.hp <= evolved.maxHp);
    assert.deepEqual(
      evolved.moves,
      learnedMoves(evolution.evolves_to, pupawn.level),
    );
    assert.ok(evolved.moves.some((k) => moves[k].power > 0));
    assert.equal(result.stones[evolution.stone!], 0);
    assert.ok(result.caught.includes(evolution.evolves_to));
    assert.ok(result.seen.includes(evolution.evolves_to));
    assert.deepEqual(result.party[0], save.party[0]);
    assert.deepEqual(parseSave(JSON.parse(JSON.stringify(result))), result);
    assert.deepEqual(save, before);
    assert.equal(evolveWithStone(result, pupawn.id, evolution.stone!), result);
  });

test("stone evolution rejects incompatible, missing, stored, and fainted companions without spending stones", () => {
  let save = buyStone(newSave("Flarepib", "Test"), "water_stone");
  assert.equal(evolveWithStone(save, save.party[0].id, "water_stone"), save);
  assert.equal(evolveWithStone(save, save.party[0].id, "fire_stone"), save);
  assert.equal(evolveWithStone(save, "missing", "water_stone"), save);
  save.storage.push(makeCompanion("Pupawn", 5));
  assert.equal(evolveWithStone(save, save.storage[0].id, "water_stone"), save);
  save = buyStone(save, "fire_stone");
  save.party[0].hp = 0;
  assert.equal(evolveWithStone(save, save.party[0].id, "fire_stone"), save);
});

test("other stone evolutions work and preserve PP on shared moves", () => {
  for (const creature of creatures)
    for (const evolution of stoneEvolutions(creature.name)) {
      const save = newSave("Flarepib", "Test");
      const companion = makeCompanion(creature.name, 15);
      companion.hp = Math.max(1, companion.hp - 7);
      for (const key of companion.moves) companion.pp[key] = 0;
      save.party = [companion];
      save.stones[evolution.stone!] = 1;
      const result = evolveWithStone(save, companion.id, evolution.stone!);
      assert.equal(result.party[0].species, evolution.evolves_to);
      for (const key of result.party[0].moves)
        if (companion.moves.includes(key))
          assert.equal(result.party[0].pp[key], 0);
    }
});

// Trait odds are independent; a creature can carry neither, either, or both.
import { encounterSettings, rollTraits, effectiveBaseStat, statKeys } from "./traits.ts";
import { species } from "./data.ts";
import { isTown } from "./world.ts";

test("the expanded region has 15 towns, 50 wild areas, and dedicated guardian habitats", () => {
  assert.equal(zones.filter(isTown).length, 15);
  assert.equal(zones.filter((z) => !isTown(z)).length, 50);
  assert.equal(new Set(zones.map((z) => z.id)).size, 65);
  for (const town of zones.filter(isTown)) {
    assert.ok(town.buildings.some((b) => b.service === "heal"));
    assert.ok(town.buildings.some((b) => b.service === "shop"));
  }
  for (const guardian of creatures.filter((c) => c.legendary || c.mythical)) {
    const habitat = zones.find((z) => z.sanctuary?.species === guardian.name);
    assert.ok(habitat, guardian.name);
    for (let cycle = 0; cycle < 12; cycle++) {
      const spawns = createSpawns(habitat.id, cycle);
      assert.equal(spawns.filter((s) => s.species === guardian.name).length, 1);
      assert.deepEqual(
        { x: spawns[0].x, y: spawns[0].y },
        habitat.encounterSpots[0],
      );
    }
  }
  for (const z of zones) {
    assert.equal(new Set(z.exits.map((e) => e.direction)).size, z.exits.length);
    for (const spawn of createSpawns(z.id)) assert.ok(species[spawn.species]);
  }
});

test("shiny is 1 in 2 and alpha is independent, with exact threshold behavior", () => {
  assert.equal(encounterSettings.shinyOdds, 2);
  assert.equal(encounterSettings.alphaOdds, 20);
  for (const shiny of [false, true]) for (const alpha of [false, true]) {
    const rolls = [shiny ? 0.499999 : 0.5, alpha ? 0.049999 : 0.05];
    assert.deepEqual(rollTraits(() => rolls.shift()!), { shiny, alpha });
    const spawnRolls = () => {
      let i = 0;
      return () => [shiny ? 0 : 0.99, alpha ? 0 : 0.99][i++ % 2];
    };
    for (const spawn of createSpawns("sunpetal", 0, spawnRolls())) {
      assert.equal(spawn.shiny, shiny);
      assert.equal(spawn.alpha, alpha);
    }
  }
  let shinyCount = 0, alphaCount = 0, bothCount = 0;
  for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) {
    const rolls = [i / 100, j / 100];
    const traits = rollTraits(() => rolls.shift()!);
    shinyCount += Number(traits.shiny);
    alphaCount += Number(traits.alpha);
    bothCount += Number(traits.shiny && traits.alpha);
  }
  assert.deepEqual([shinyCount, alphaCount, bothCount], [5000, 500, 250]);
});

test("authored shiny bonuses and alpha strength stack for every species", () => {
  for (const creature of creatures) {
    let increased = false;
    for (const stat of statKeys) {
      const base = creature.base_stats[stat];
      const bonus = !creature.shiny_boost ? encounterSettings.fallbackShinyBonus
        : creature.shiny_boost.stat === stat ? creature.shiny_boost.bonus : 0;
      assert.equal(effectiveBaseStat(creature.name, stat), base);
      assert.equal(effectiveBaseStat(creature.name, stat, { shiny: true }), base + bonus);
      assert.equal(effectiveBaseStat(creature.name, stat, { alpha: true }), Math.floor(base * 1.2));
      assert.equal(effectiveBaseStat(creature.name, stat, { shiny: true, alpha: true }), Math.floor((base + bonus) * 1.2));
      increased ||= bonus > 0;
    }
    assert.ok(increased, `${creature.name} has a real shiny bonus`);
  }
});

test("all trait combinations survive battle, capture, storage, healing, and JSON saves", () => {
  for (const shiny of [false, true]) for (const alpha of [false, true]) {
    const original = newSave("Flarepib", "Test");
    original.party.push(...Array.from({ length: 5 }, () => makeCompanion("Niblet", 5)));
    const traits = { shiny, alpha };
    const battle = beginBattle(original, "Pupawn", 20, false, traits);
    assert.equal(battle.enemy.shiny, shiny);
    assert.equal(battle.enemy.alpha, alpha);
    battle.enemy.hp = 1;
    const result = takeTurn(original, battle, { type: "catch" }, () => 0);
    assert.equal(result.battle.outcome, "caught");
    const restored = parseSave(JSON.parse(JSON.stringify(heal(result.save))));
    assert.equal(restored.storage[0].shiny, shiny);
    assert.equal(restored.storage[0].alpha, alpha);
    assert.equal(restored.storage[0].maxHp, battle.enemy.maxHp);
    const evolved = evolveWithStone({ ...restored, party: [restored.storage[0]], storage: [], stones: { fire_stone: 1 } }, restored.storage[0].id, "fire_stone");
    assert.equal(evolved.party[0].species, "Ignisrael");
    assert.equal(evolved.party[0].shiny, shiny);
    assert.equal(evolved.party[0].alpha, alpha);
    assert.deepEqual(parseSave(JSON.parse(JSON.stringify(evolved))), evolved);
  }
});

test("legacy saves default to ordinary traits and malformed traits are rejected", () => {
  const save = newSave("Flarepib", "Test");
  const legacy = JSON.parse(JSON.stringify(save));
  delete legacy.party[0].shiny;
  delete legacy.party[0].alpha;
  assert.deepEqual(parseSave(legacy).party, save.party);
  for (const key of ["shiny", "alpha"])
    assert.throws(() => parseSave({ ...save, party: [{ ...save.party[0], [key]: "true" }] }));
});

test("shiny and alpha bonuses affect actual damage, defense, HP, and turn order", () => {
  const damage = (attacker: { shiny?: boolean; alpha?: boolean }, defender: { shiny?: boolean; alpha?: boolean }) => {
    const save = newSave("Flarepib", "Test");
    save.party = [makeCompanion("Flarepib", 40, undefined, attacker)];
    const battle = beginBattle(save, "Rivanos", 40, false, defender);
    const result = takeTurn(save, battle, { type: "move", key: "incinerate" }, () => 0.4);
    return battle.enemy.hp - result.battle.enemy.hp;
  };
  assert.ok(damage({ shiny: true }, {}) > damage({}, {}));
  assert.ok(damage({ shiny: true, alpha: true }, {}) > damage({ shiny: true }, {}));
  assert.ok(damage({}, { alpha: true }) < damage({}, {}));
  assert.ok(makeCompanion("Niblet", 40, undefined, { alpha: true }).maxHp > makeCompanion("Niblet", 40).maxHp);
  // Both use the same species and level; alpha's speed must reverse the tie.
  const save = newSave("Flarepib", "Test");
  save.party = [makeCompanion("Niblet", 20)];
  const battle = beginBattle(save, "Niblet", 20, false, { alpha: true });
  battle.enemy.moves = ["tackle"];
  battle.enemy.pp = { tackle: 30 };
  const result = takeTurn(save, battle, { type: "move", key: "headbutt" }, () => 0.4);
  assert.match(result.battle.log[1], /^Niblet used Tackle/);
});

test("level evolution keeps both traits and recalculates boosted HP", () => {
  const save = newSave("Flarepib", "Test");
  save.party = [makeCompanion("Flarepib", 15, undefined, { shiny: true, alpha: true })];
  save.party[0].xp = xpNeeded(15) - 1;
  const battle = beginBattle(save, "Niblet", 2);
  battle.enemy.hp = 1;
  const result = takeTurn(save, battle, { type: "move", key: "fire_spin" }, () => 0.2);
  assert.equal(result.save.party[0].species, "Lumacroak");
  assert.equal(result.save.party[0].shiny, true);
  assert.equal(result.save.party[0].alpha, true);
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(result.save))), result.save);
});
