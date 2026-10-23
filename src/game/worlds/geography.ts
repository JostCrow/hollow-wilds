import type { WorldDefinition, WorldPoint, WorldRoad } from "./types.ts";
import {
  insidePolygon,
  distanceToLine,
  projectSegment,
  distance,
  hashRandom,
} from "./geometry.ts";

export const CHUNK_SIZE = 48;
type Segment = {
  a: WorldPoint & { height: number };
  b: WorldPoint & { height: number };
  road: WorldRoad;
};
const indices = new WeakMap<WorldDefinition, Map<string, Segment[]>>();
function roadIndex(world: WorldDefinition) {
  let index = indices.get(world);
  if (index) return index;
  index = new Map();
  for (const road of world.roads)
    for (let i = 1; i < road.points.length; i++) {
      const segment = { a: road.points[i - 1], b: road.points[i], road };
      const minX = Math.floor(Math.min(segment.a.x, segment.b.x) / 24),
        maxX = Math.floor(Math.max(segment.a.x, segment.b.x) / 24),
        minZ = Math.floor(Math.min(segment.a.z, segment.b.z) / 24),
        maxZ = Math.floor(Math.max(segment.a.z, segment.b.z) / 24);
      for (let x = minX; x <= maxX; x++)
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x}:${z}`;
          const list = index.get(key) ?? [];
          list.push(segment);
          index.set(key, list);
        }
    }
  indices.set(world, index);
  return index;
}
export function roadAt(world: WorldDefinition, x: number, z: number) {
  const index = roadIndex(world),
    cx = Math.floor(x / 24),
    cz = Math.floor(z / 24),
    p = { x, z };
  let best = Infinity,
    height = 0,
    width = 3.8;
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      for (const segment of index.get(`${cx + dx}:${cz + dz}`) ?? []) {
        const hit = projectSegment(p, segment.a, segment.b);
        if (hit.distance < best) {
          best = hit.distance;
          height =
            segment.a.height + (segment.b.height - segment.a.height) * hit.t;
          width = segment.road.width;
        }
      }
  return { distance: best, height, width };
}
export function biomeWeights(world: WorldDefinition, x: number, z: number) {
  return world.biomes.map((b) => ({
    biome: b,
    weight: Math.exp(
      -2 * (((x - b.x) / b.radiusX) ** 2 + ((z - b.z) / b.radiusZ) ** 2),
    ),
  }));
}
export function biomeAt(world: WorldDefinition, x: number, z: number) {
  const weighted = biomeWeights(world, x, z);
  return weighted.reduce((best, b) => (b.weight > best.weight ? b : best), {
    biome: world.biomes[0] ?? {
      x: 0,
      z: 0,
      kind: "meadow",
      radiusX: 1,
      radiusZ: 1,
      color: world.groundColor,
      treeDensity: 20,
    },
    weight: 0,
  });
}
export function nearestPlace(world: WorldDefinition, point: WorldPoint) {
  return world.places.reduce(
    (best, p) => (distance(point, p) < distance(point, best) ? p : best),
    world.places[0],
  );
}
export function shoreDistance(world: WorldDefinition, x: number, z: number) {
  const p = { x, z },
    d = distanceToLine(p, world.shore, true);
  return insidePolygon(p, world.shore) ? d : -d;
}
export function waterAt(world: WorldDefinition, x: number, z: number) {
  const point = { x, z };
  if (insidePolygon(point, world.lake))
    return { kind: "lake" as const, level: 4 };
  const d = distanceToLine(point, world.river);
  if (d < 8.5)
    return { kind: "river" as const, level: world.heightAt(x, z) - 0.8 };
  return null;
}
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
export function terrainHeight(world: WorldDefinition, x: number, z: number) {
  const shore = shoreDistance(world, x, z);
  if (shore < 0) return Math.max(-9, shore * 0.2);
  let base = world.heightAt(x, z);
  const place = nearestPlace(world, { x, z });
  if (place.kind === "town" || place.kind === "coast") {
    const t = 1 - smooth(22, 45, distance(place, { x, z }));
    base = base * (1 - t) + world.heightAt(place.x, place.z) * t;
  }
  const road = roadAt(world, x, z);
  if (road.distance < 7) {
    const t = 1 - smooth(road.width / 2, 7, road.distance);
    base = base * (1 - t) + road.height * t;
  }
  const lakeDist = distanceToLine({ x, z }, world.lake, true),
    inLake = insidePolygon({ x, z }, world.lake);
  if (inLake) base = 2;
  else if (lakeDist < 9) {
    const t = 1 - smooth(0, 9, lakeDist);
    base = base * (1 - t) + 4.35 * t;
  }
  const riverDist = distanceToLine({ x, z }, world.river),
    riverLevel = world.heightAt(x, z) - 0.8;
  if (riverDist < 8.5) base = riverLevel - 0.7;
  else if (riverDist < 13) {
    const t = 1 - smooth(8.5, 13, riverDist);
    base = base * (1 - t) + (riverLevel + 0.2) * t;
  }
  return base * smooth(0, 12, shore) + 0.1;
}
export function groundHeight(world: WorldDefinition, x: number, z: number) {
  const water = waterAt(world, x, z);
  if (water) {
    const road = roadAt(world, x, z);
    if (road.distance < road.width / 2 + 0.1) return water.level + 0.65;
  }
  const road = roadAt(world, x, z);
  return (
    terrainHeight(world, x, z) +
    (road.distance < road.width / 2 + 0.04 ? 0.12 : 0)
  );
}
export function onLand(world: WorldDefinition, x: number, z: number) {
  if (shoreDistance(world, x, z) < 0.6) return false;
  if (waterAt(world, x, z)) {
    const road = roadAt(world, x, z);
    return road.distance < road.width / 2 - 0.2;
  }
  return true;
}
export type Decoration = {
  x: number;
  z: number;
  height: number;
  scale: number;
  kind: "tree" | "rock";
  radius: number;
};
const decorations = new WeakMap<WorldDefinition, Map<string, Decoration[]>>();
export function chunkDecorations(
  world: WorldDefinition,
  cx: number,
  cz: number,
) {
  let cache = decorations.get(world);
  if (!cache) {
    cache = new Map();
    decorations.set(world, cache);
  }
  const key = `${cx}:${cz}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const rng = hashRandom(
      world.seed ^ Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663),
    ),
    items: Decoration[] = [];
  for (let i = 0; i < 100; i++) {
    const x = (cx + rng()) * CHUNK_SIZE,
      z = (cz + rng()) * CHUNK_SIZE,
      place = nearestPlace(world, { x, z });
    const climate = biomeAt(world, x, z);
    const density =
      20 * (1 - climate.weight) + climate.biome.treeDensity * climate.weight;
    if (i > density) continue;
    if (
      !onLand(world, x, z) ||
      roadAt(world, x, z).distance < 4.3 ||
      distance(place, { x, z }) <
        (place.kind === "town" || place.kind === "coast" ? 28 : 7) ||
      world.buildings.some(
        (b) =>
          Math.abs(x - b.x) < b.halfWidth + 2 &&
          Math.abs(z - b.z) < b.halfDepth + 2,
      ) ||
      world.npcs.some((n) => distance(n, { x, z }) < 2) ||
      world.residents.some((r) => distance(r, { x, z }) < 4.5)
    )
      continue;
    if (items.some((item) => Math.hypot(item.x - x, item.z - z) < 2.8))
      continue;
    const rock = i % 19 === 0,
      scale = 0.8 + rng() * 0.6;
    items.push({
      x,
      z,
      height: terrainHeight(world, x, z),
      scale,
      kind: rock ? "rock" : "tree",
      radius: rock ? 0.65 * scale : 0.22 * scale,
    });
  }
  cache.set(key, items);
  return items;
}
export function canStand(world: WorldDefinition, point: WorldPoint) {
  if (!onLand(world, point.x, point.z)) return false;
  if (
    world.buildings.some(
      (b) =>
        Math.abs(point.x - b.x) < b.halfWidth + 0.23 &&
        Math.abs(point.z - b.z) < b.halfDepth + 0.23,
    )
  )
    return false;
  if (world.npcs.some((n) => distance(n, point) < 0.43)) return false;
  const cx = Math.floor(point.x / CHUNK_SIZE),
    cz = Math.floor(point.z / CHUNK_SIZE);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      if (
        chunkDecorations(world, cx + dx, cz + dz).some(
          (d) => distance(d, point) < d.radius + 0.23,
        )
      )
        return false;
  return true;
}
export function moveFreely(
  world: WorldDefinition,
  position: WorldPoint,
  dx: number,
  dz: number,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.22));
  let { x, z } = position;
  const valid = (nx: number, nz: number) =>
    canStand(world, { x: nx, z: nz }) &&
    (roadAt(world, nx, nz).distance < 3 ||
      Math.abs(groundHeight(world, nx, nz) - groundHeight(world, x, z)) < 0.22);
  for (let i = 0; i < steps; i++) {
    if (valid(x + dx / steps, z)) x += dx / steps;
    if (valid(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
/** Route waypoints follow the original curved trail graph, with no navigation grid. */
export function walkingRoute(
  world: WorldDefinition,
  start: WorldPoint,
  target: WorldPoint,
) {
  const from = nearestPlace(world, start),
    to = nearestPlace(world, target);
  if (from.id === to.id) {
    const building = world.buildings.find(
      (b) => distance(b.door, target) < 0.2,
    );
    if (building) {
      const branch = world.roads.find((r) => r.id === `walkway:${building.id}`);
      return [...(branch?.points ?? []), target];
    }
    return [target];
  }
  const costs = new Map<string, number>([[from.id, 0]]),
    previous = new Map<string, { id: string; road: WorldRoad }>(),
    queue = new Set(world.places.map((p) => p.id));
  while (queue.size) {
    const current = [...queue].reduce((best, id) =>
      (costs.get(id) ?? Infinity) < (costs.get(best) ?? Infinity) ? id : best,
    );
    queue.delete(current);
    if (current === to.id || !costs.has(current)) break;
    for (const road of world.roads) {
      if (road.from === road.to) continue;
      const neighbor =
        road.from === current
          ? road.to
          : road.to === current
            ? road.from
            : null;
      if (!neighbor || !queue.has(neighbor)) continue;
      const length = road.points.reduce(
          (sum, p, i) => sum + (i ? distance(p, road.points[i - 1]) : 0),
          0,
        ),
        cost = costs.get(current)! + length;
      if (cost < (costs.get(neighbor) ?? Infinity)) {
        costs.set(neighbor, cost);
        previous.set(neighbor, { id: current, road });
      }
    }
  }
  const segments: WorldPoint[][] = [];
  let current = to.id;
  while (current !== from.id) {
    const link = previous.get(current);
    if (!link) return [target];
    segments.unshift(
      link.road.from === link.id
        ? link.road.points
        : [...link.road.points].reverse(),
    );
    current = link.id;
  }
  return [from, ...segments.flat(), target];
}
