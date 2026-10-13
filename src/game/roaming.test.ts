import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoamSchedule, roamCreatures } from "./roaming.ts";
import { createSpawns, getWorld, random, walkable, zones } from "./world.ts";
import type { Spawn, Tile, World } from "./world.ts";

function clearing(): World {
  const original = getWorld("willowfen");
  return {
    ...original,
    width: 14, height: 14,
    tiles: Array.from({ length: 14 }, () => Array<Tile>(14).fill("grass")),
    buildings: [], npcs: [],
    zone: { ...original.zone, id: "roam-test", width: 14, height: 14, exits: [] },
  };
}
function creature(id: string, x = 5, y = 5): Spawn {
  return { id, x, y, species: "Flarepib", level: 4, shiny: true, alpha: false };
}
const distantPlayer = { x: 3, y: 10 };

function firstStep(world: World, spawns: Spawn[]) {
  const schedule = createRoamSchedule();
  roamCreatures(world, spawns, distantPlayer, 0, schedule, true, () => 0);
  return roamCreatures(world, spawns, distantPlayer, 1000, schedule, true, () => 0);
}

test("creatures begin with staggered steps within the first second", () => {
  const world = clearing(), schedule = createRoamSchedule();
  const spawns = [creature("one"), creature("two", 9, 9)];
  let calls = 0;
  assert.equal(roamCreatures(world, spawns, distantPlayer, 0, schedule, true, () => calls++ * .8), spawns);
  const timers = [...schedule.timers.values()].map((timer) => timer.nextStep);
  assert.equal(timers[0], 150);
  assert.ok(timers[1] > timers[0] && timers[1] < 1000);
  assert.notDeepEqual(firstStep(world, spawns)[0], spawns[0]);
});

test("a creature chooses an available neighbor instead of failing a blocked random direction", () => {
  const world = clearing();
  world.tiles.forEach((row) => row.fill("water"));
  world.tiles[5][5] = "grass";
  world.tiles[5][6] = "path";
  const original = creature("walker");
  const [moved] = firstStep(world, [original]);
  assert.equal(moved.x, 6);
  assert.equal(moved.y, 5);
  assert.equal(moved.id, original.id);
  assert.equal(moved.shiny, original.shiny);
  assert.equal(moved.level, original.level);
});

test("creatures cannot claim the same destination or swap through occupied source cells", () => {
  const world = clearing();
  world.tiles.forEach((row) => row.fill("water"));
  for (const x of [5, 6, 7]) world.tiles[5][x] = "grass";
  const [first, second] = firstStep(world, [creature("first", 5, 5), creature("second", 7, 5)]);
  assert.equal(first.x, 6);
  assert.equal(second.x, 7);
  const adjacent = firstStep(world, [creature("first", 5, 5), creature("second", 6, 5)]);
  assert.equal(adjacent[0].x, 5);
});

test("creatures rest near the player and stay still while selected for approach", () => {
  const world = clearing(), schedule = createRoamSchedule();
  const spawns = [creature("near", 3, 7), creature("selected", 9, 5)];
  roamCreatures(world, spawns, distantPlayer, 0, schedule, true, () => 0);
  const next = roamCreatures(world, spawns, distantPlayer, 1000, schedule, true, () => 0, "selected");
  assert.equal(next, spawns);
  const edge = [creature("edge", 6, 10)];
  assert.equal(firstStep(world, edge), edge);
});

for (const tile of ["grass", "tall", "flowers", "sand", "ice", "path", "water", "bridge", "tree", "rock"] as Tile[]) {
  test(`roaming respects ${tile} terrain`, () => {
    const world = clearing();
    world.tiles.forEach((row) => row.fill("water"));
    world.tiles[5][5] = "grass";
    world.tiles[6][5] = tile;
    const [next] = firstStep(world, [creature("walker")]);
    assert.equal(next.y, ["grass", "tall", "flowers", "sand", "ice", "path"].includes(tile) ? 6 : 5);
  });
}

test("roaming avoids NPCs, building footprints, doorsteps, and map boundaries", () => {
  const world = clearing();
  world.tiles.forEach((row) => row.fill("water"));
  world.tiles[5][5] = "grass";
  world.tiles[6][5] = "grass";
  world.npcs = [{ ...getWorld("willowfen").npcs[0], x: 5, y: 6 }];
  assert.equal(firstStep(world, [creature("walker")])[0].y, 5);
  world.npcs = [];
  world.buildings = [{ ...getWorld("willowfen").buildings[0], x: 4, y: 6, w: 3, h: 2 }];
  assert.equal(firstStep(world, [creature("walker")])[0].y, 5);
  world.buildings[0].y = 4;
  assert.equal(firstStep(world, [creature("walker")])[0].y, 5);
  const edgeWorld = clearing();
  edgeWorld.tiles.forEach((row) => row.fill("water"));
  edgeWorld.tiles[3][5] = "grass"; edgeWorld.tiles[2][5] = "path";
  edgeWorld.zone.exits = [{ direction: "north", target: "sunpetal", at: 5 }];
  assert.equal(firstStep(edgeWorld, [creature("edge", 5, 3)])[0].y, 3);
});

test("inactive exploration pauses positions and remaining timers", () => {
  const world = clearing(), schedule = createRoamSchedule(), spawns = [creature("one")];
  roamCreatures(world, spawns, distantPlayer, 0, schedule, true, () => 0);
  assert.equal(roamCreatures(world, spawns, distantPlayer, 1000, schedule, false, () => 0), spawns);
  assert.equal(roamCreatures(world, spawns, distantPlayer, 1001, schedule, true, () => 0), spawns);
  assert.notEqual(roamCreatures(world, spawns, distantPlayer, 1200, schedule, true, () => 0), spawns);
});

test("roaming removes old spawn schedules and resets them on zone changes", () => {
  const world = clearing(), schedule = createRoamSchedule();
  roamCreatures(world, [creature("old")], distantPlayer, 0, schedule, true, () => 0);
  roamCreatures(world, [creature("new")], distantPlayer, 100, schedule, true, () => 0);
  assert.deepEqual([...schedule.timers.keys()], ["new"]);
  const other = { ...world, zone: { ...world.zone, id: "next-zone" } };
  roamCreatures(other, [creature("new")], distantPlayer, 5000, schedule, true, () => 0);
  assert.equal(schedule.zoneId, "next-zone");
  assert.equal(schedule.timers.get("new")?.nextStep, 5150);
});

test("strolling through every authored area retains safe positions and creature traits", () => {
  for (const zone of zones) {
    const world = getWorld(zone.id), schedule = createRoamSchedule(), rng = random(zone.seed);
    let spawns = createSpawns(zone.id, 0, () => .5);
    const original = new Map(spawns.map((spawn) => [spawn.id, spawn]));
    for (let time = 0; time <= 12000; time += 500) {
      const previous = spawns;
      spawns = roamCreatures(world, spawns, world.spawn, time, schedule, true, rng);
      assert.equal(new Set(spawns.map((spawn) => `${spawn.x},${spawn.y}`)).size, spawns.length, zone.id);
      for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i], before = previous[i], source = original.get(spawn.id)!;
        assert.ok(walkable(world, spawn.x, spawn.y), `${zone.id}: ${spawn.id}`);
        assert.ok(Math.abs(spawn.x - before.x) + Math.abs(spawn.y - before.y) <= 1);
        assert.deepEqual({ ...spawn, x: source.x, y: source.y }, source);
      }
    }
  }
});
