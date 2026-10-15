import { test } from "node:test";
import assert from "node:assert/strict";
import { islandCircuit, islandRoutePath, islandShore } from "./island.ts";
import { zones, zoneById, isTown, getWorld, findPath, exitPoint, opposite } from "./world.ts";
import { newSave, travel } from "./engine.ts";

test("every town lies on one continuous, walkable island circuit", () => {
  assert.equal(new Set(islandCircuit).size, islandCircuit.length);
  for (const town of zones.filter(isTown)) assert.ok(islandCircuit.includes(town.id), town.name);
  let save = newSave("Flarepib", "Island walker");
  for (let i = 0; i < islandCircuit.length; i++) {
    const source = zoneById(islandCircuit[i]);
    const target = islandCircuit[(i + 1) % islandCircuit.length];
    assert.equal(save.zone, source.id);
    const road = source.exits.find((e) => e.target === target);
    assert.ok(road, `${source.id} continues around the island to ${target}`);
    assert.ok(findPath(getWorld(source.id), save, exitPoint(source, road)).length);
    save = travel(save, target, opposite[road.direction]);
  }
  assert.equal(save.zone, islandCircuit[0]);
});

test("outer trails end in plausible habitats and sanctuaries remain optional", () => {
  const deadEnds = zones.filter((z) => z.exits.length === 1);
  assert.ok(deadEnds.length >= 8);
  assert.ok(deadEnds.every((z) => !isTown(z) && !islandCircuit.includes(z.id)));
  for (const z of zones.filter((z) => z.sanctuary)) assert.equal(z.exits.length, 1, z.name);
  for (const kind of ["snow", "highland", "forest", "wetland", "orchard", "glade"])
    assert.ok(deadEnds.some((z) => z.kind === kind), `${kind} trail has a natural destination`);
  // Removing optional dead ends still leaves every town and junction connected.
  const found = new Set(["willowfen"]), queue = [zoneById("willowfen")];
  for (const z of queue) for (const exit of z.exits) {
    const target = zoneById(exit.target);
    if (target.exits.length > 1 && !found.has(target.id)) {
      found.add(target.id); queue.push(target);
    }
  }
  assert.equal(found.size, zones.length - deadEnds.length);
});

test("walking signposts agree with the island's north, south, east, and west", () => {
  for (const source of zones) for (const road of source.exits) {
    const target = zoneById(road.target);
    const delta = { north: source.mapY - target.mapY, south: target.mapY - source.mapY,
      west: source.mapX - target.mapX, east: target.mapX - source.mapX }[road.direction];
    assert.ok(delta > 0, `${source.id}: ${road.direction} to ${target.id}`);
  }
});

const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
const shoreNumbers = islandShore.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
const shoreline: number[][] = [shoreNumbers.slice(0, 2)];
for (let i = 2; i < shoreNumbers.length; i += 6) {
  const [x, y] = shoreline.at(-1)!;
  const [cx, cy, dx, dy, tx, ty] = shoreNumbers.slice(i, i + 6);
  for (let step = 1; step <= 20; step++) {
    const t = step / 20;
    shoreline.push([cubic(x, cx, dx, tx, t), cubic(y, cy, dy, ty, t)]);
  }
}
function onLand(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = shoreline.length - 1; i < shoreline.length; j = i++) {
    const [ix, iy] = shoreline[i], [jx, jy] = shoreline[j];
    if ((iy > y) !== (jy > y) && x < (jx - ix) * (y - iy) / (jy - iy) + ix)
      inside = !inside;
  }
  return inside;
}
test("all places and their curved walking trails stay inside the shoreline", () => {
  for (const z of zones) {
    assert.ok(onLand(z.mapX * 10, z.mapY * 10), `${z.name} lies on the island`);
    for (const road of z.exits) {
      const target = zoneById(road.target);
      const [x, y, cx, cy, dx, dy, tx, ty] = islandRoutePath(z, road, target).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        assert.ok(onLand(cubic(x, cx, dx, tx, t), cubic(y, cy, dy, ty, t)), `${z.id} → ${target.id} stays on land`);
      }
    }
  }
});
