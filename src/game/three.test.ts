import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerBlenderCreature } from "./three/blender-creatures.ts";
// Exercise precisely the per-species assets fetched by the browser.
for (const name of creatureNames) {
  registerBlenderCreature(JSON.parse(await readFile(new URL(`../../assets/models/creatures/${name.toLowerCase()}.json`, import.meta.url), "utf8")));
}
import {
  createCreature,
  createExplorer,
  anatomicalBounds,
  creatureNames,
} from "./three/creatures.ts";
import {
  speciesData,
  modelProfiles,
  PLAYER_HEIGHT_METRES,
} from "./three/catalog.ts";
import { worldById, defaultWorldId, worlds } from "./worlds/registry.ts";
import {
  canStand,
  groundHeight,
  moveFreely,
  onLand,
  walkingRoute,
  shoreDistance,
} from "./worlds/geography.ts";
import { distance } from "./worlds/geometry.ts";
import { newSave, parseSave } from "./engine.ts";
import { disposeObject } from "./three/resources.ts";
import { steer, TURN_SPEED } from "./three/movement.ts";
import { DEFAULT_CAMERA, parseCameraSettings } from "./three/camera.ts";

test("all 93 species have distinct authored 3D profiles, including 17 new designs", () => {
  assert.equal(creatureNames.length, 93);
  assert.deepEqual(new Set(creatureNames), new Set(Object.keys(speciesData)));
  assert.equal(
    Object.values(modelProfiles).filter((p) => p.reference === "description")
      .length,
    17,
  );
  assert.equal(
    new Set(Object.values(modelProfiles).map((p) => JSON.stringify(p))).size,
    93,
  );
});
test("every model is grounded and scaled to its recorded height relative to a 1.70 m explorer", () => {
  const explorer = createExplorer(),
    bounds = anatomicalBounds(explorer.root);
  assert.equal(PLAYER_HEIGHT_METRES, 1.7);
  assert.ok(Math.abs(bounds.min.y) < 1e-9);
  assert.ok(Math.abs(bounds.max.y - 1.7) < 1e-9);
  disposeObject(explorer.root);
  for (const name of creatureNames) {
    const model = createCreature(name),
      b = anatomicalBounds(model.root);
    assert.ok(Math.abs(b.min.y) < 1e-8, `${name} is grounded`);
    assert.ok(
      Math.abs(b.max.y - speciesData[name].height) < 1e-8,
      `${name} has its recorded height`,
    );
    assert.equal(model.root.userData.species, name);
    assert.equal(model.root.userData.modelSource, "Blender");
    model.animate(1, true);
    disposeObject(model.root);
  }
  assert.ok(speciesData.Flarepib.height < PLAYER_HEIGHT_METRES / 4);
  assert.ok(speciesData["Ohm-Titan"].height > PLAYER_HEIGHT_METRES * 2);
});
test("shiny palettes are isolated; alpha models are 20% larger without changing base species heights", () => {
  for (const name of ["Flarepib", "Puddlop", "Solarius", "Ohm-Titan"]) {
    const standard = createCreature(name),
      shiny = createCreature(name, { shiny: true, alpha: true });
    assert.ok(
      Math.abs(
        anatomicalBounds(shiny.root).max.y - speciesData[name].height * 1.2,
      ) < 1e-8,
    );
    assert.ok(
      Math.abs(
        anatomicalBounds(standard.root).max.y - speciesData[name].height,
      ) < 1e-8,
    );
    disposeObject(standard.root);
    disposeObject(shiny.root);
  }
});
test("the island merges all 65 geographic places into one continuous connected world", () => {
  const world = worldById();
  assert.equal(world.places.length, 65);
  assert.ok(world.size >= 2000);
  const visited = new Set([world.places[0].id]);
  let count = 0;
  while (count !== visited.size) {
    count = visited.size;
    for (const road of world.roads) {
      if (visited.has(road.from)) visited.add(road.to);
      if (visited.has(road.to)) visited.add(road.from);
    }
  }
  assert.equal(visited.size, world.places.length);
  for (const road of world.roads.filter((r) => r.from !== r.to))
    for (let i = 0; i < road.points.length; i += 8) {
      const p = road.points[i];
      assert.ok(
        shoreDistance(world, p.x, p.z) > 0,
        `${road.id} stays on the island`,
      );
      assert.ok(
        onLand(world, p.x, p.z),
        `${road.id} crosses water on a bridge`,
      );
    }
});
test("free movement uses fractional metres and diagonal travel, with natural shore and water boundaries", () => {
  const world = worldById(),
    start = world.spawn;
  assert.ok(canStand(world, start));
  const next = moveFreely(world, start, 0.37, 0.63);
  assert.ok(Math.abs(next.x - start.x - 0.37) < 1e-9);
  assert.ok(Math.abs(next.z - start.z - 0.63) < 1e-9);
  assert.ok(!Number.isInteger(next.x));
  assert.equal(onLand(world, -world.size, -world.size), false);
  assert.equal(
    onLand(
      world,
      (546 - world.mapOrigin) * world.mapScale,
      (584 - world.mapOrigin) * world.mapScale,
    ),
    false,
  );
  const path = walkingRoute(
    world,
    world.spawn,
    world.places.find((p) => p.id === "sunpetal")!,
  );
  assert.ok(path.length > 10);
  assert.ok(distance(path[0], world.spawn) < 5);
});
test("the first island has a curated roster, independent of the complete 93-model library", () => {
  const world = worldById();
  assert.ok(world.residents.length > 5);
  assert.ok(new Set(world.residents.map((r) => r.species)).size < 30);
  for (const r of world.residents) assert.ok(modelProfiles[r.species]);
  assert.equal(worldById(defaultWorldId), world);
});
test("saves preserve exact continuous world coordinates while legacy saves still load", () => {
  const save = newSave("Flarepib", "Explorer"),
    world = worldById();
  const position = {
    worldId: world.id,
    x: world.spawn.x + 0.173,
    z: world.spawn.z + 0.291,
  };
  save.openWorld = position;
  assert.deepEqual(
    parseSave(JSON.parse(JSON.stringify(save))).openWorld,
    position,
  );
  delete save.openWorld;
  assert.equal(parseSave(save).openWorld, undefined);
});

test("forward and backward follow the explorer heading without turning on reversal", () => {
  for (const heading of [0, Math.PI / 2, -Math.PI + 0.01]) {
    const forward = steer(heading, 0, 1, 3.2, 0.5);
    const backward = steer(heading, 0, -1, 3.2, 0.5);
    assert.ok(Math.abs(forward.dx - Math.sin(heading) * 1.6) < 1e-10);
    assert.ok(Math.abs(forward.dz - Math.cos(heading) * 1.6) < 1e-10);
    assert.equal(backward.heading, forward.heading);
    assert.equal(backward.dx, -forward.dx);
    assert.equal(backward.dz, -forward.dz);
  }
});

test("left and right turn in place and steer the walking direction", () => {
  const left = steer(0, -1, 0, 3.2, 0.25);
  const right = steer(0, 1, 0, 3.2, 0.25);
  assert.ok(left.heading > 0);
  assert.equal(right.heading, -left.heading);
  assert.equal(Math.hypot(left.dx, left.dz), 0);
  assert.equal(Math.hypot(right.dx, right.dz), 0);
  assert.ok(steer(0, -1, 1, 3.2, 0.25).dx > 0);
  assert.ok(steer(0, 1, 1, 3.2, 0.25).dx < 0);
  assert.equal(steer(0, 0, 1, 6.3, 1).dz, 6.3);
});

test("steering follows the same arc at different frame rates and across the angle boundary", () => {
  function walk(fps: number) {
    let heading = Math.PI - 0.01, x = 0, z = 0;
    for (let i = 0; i < fps; i++) {
      const step = steer(heading, -1, 1, 3.2, 1 / fps);
      heading = step.heading;
      x += step.dx;
      z += step.dz;
    }
    return { heading, x, z };
  }
  const fine = walk(60), coarse = walk(30);
  for (const key of ["heading", "x", "z"] as const)
    assert.ok(Math.abs(fine[key] - coarse[key]) < 1e-10);
  assert.ok(Math.abs(fine.heading - (Math.PI - 0.01 + TURN_SPEED - 2 * Math.PI)) < 1e-10);
});

test("camera preferences reject invalid values and keep zoom and tilt within their limits", () => {
  for (const invalid of [null, [], "bad", { tilt: NaN, distance: Infinity }])
    assert.deepEqual(parseCameraSettings(invalid), DEFAULT_CAMERA);
  assert.deepEqual(parseCameraSettings({ tilt: -50, distance: 100 }), { tilt: 15, distance: 24 });
  assert.deepEqual(parseCameraSettings({ tilt: 90, distance: -1 }), { tilt: 60, distance: 5.5 });
  assert.deepEqual(parseCameraSettings({ tilt: 45, distance: 12 }), { tilt: 45, distance: 12 });
});

test("world identity, terrain, residents, and saved position are independent for future islands", () => {
  const first = worldById(),
    second = {
      ...first,
      id: "test-second-island",
      seed: 891,
      roads: first.roads.map((road) => ({
        ...road,
        points: road.points.map((p) => ({ ...p, height: 12 })),
      })),
      biomes: [],
      residents: [],
      heightAt: () => 12,
    };
  worlds[second.id] = second;
  try {
    assert.equal(worldById(second.id), second);
    assert.equal(second.residents.length, 0);
    assert.ok(groundHeight(second, second.spawn.x, second.spawn.z) > 10);
    const save = newSave("Verdreep", "Explorer");
    save.openWorld = { worldId: second.id, ...second.spawn };
    save.worldVisits = { [second.id]: [second.places[0].id] };
    const restored = parseSave(JSON.parse(JSON.stringify(save)));
    assert.equal(restored.openWorld!.worldId, second.id);
    assert.deepEqual(restored.worldVisits, save.worldVisits);
    assert.equal(worldById().id, first.id);
  } finally {
    delete worlds[second.id];
  }
});
