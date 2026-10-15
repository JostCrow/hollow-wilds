import worldData from "../../data/world.json" with { type: "json" };
import { leagueAt } from "./progression.ts";
import { species } from "./data.ts";
import { rollTraits } from "./traits.ts";
import type { Traits } from "./traits.ts";
export type Point = { x: number; y: number };
export type Direction = "north" | "south" | "east" | "west";
export type Tile =
  | "grass"
  | "path"
  | "flowers"
  | "tall"
  | "tree"
  | "water"
  | "bridge"
  | "rock"
  | "sand"
  | "ice";
export type Building = Point & {
  w: number;
  h: number;
  roof: string;
  name: string;
  service: "heal" | "shop" | "home" | "gym" | "champion";
};
export type Person = Point & {
  id: string;
  name: string;
  role: "guide" | "ranger" | "camper";
  color: string;
  dialogue: string;
};
export type Exit = { direction: Direction; target: string; at: number };
export type Landmark = Point & { label: string; kind: string };
export type Zone = Omit<
  (typeof worldData.zones)[number],
  "exits" | "buildings" | "npcs"
> & { exits: Exit[]; buildings: Building[]; npcs: Person[] };
export type World = {
  zone: Zone;
  tiles: Tile[][];
  buildings: Building[];
  npcs: Person[];
  pickups: (Point & { id: string })[];
  landmarks: Landmark[];
  encounterSpots: Point[];
  spawn: Point;
  width: number;
  height: number;
};
export const zones: Zone[] = worldData.zones.map((zone) => {
  const league = leagueAt(zone.id);
  return { ...zone, buildings: zone.buildings.map((b) => league && b.service === "home"
    ? { ...b, name: league.kind === "gym" ? `${league.badge!.toUpperCase()} GYM` : "CHAMPION HALL", service: league.kind as "gym" | "champion", roof: league.kind === "gym" ? "#8c79a6" : "#bd9949" } : b) } as Zone;
});
export const TILE = 32;
export const directions: Direction[] = ["north", "east", "south", "west"];
export const opposite: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};
export const zoneById = (id: string) =>
  zones.find((z) => z.id === id) ?? zones[0];
export const isTown = (zone: Zone) =>
  zone.kind === "town" || zone.kind === "coast";
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function exitPoint(zone: Zone, exit: Exit, inset = 0): Point {
  switch (exit.direction) {
    case "north":
      return { x: exit.at, y: inset };
    case "south":
      return { x: exit.at, y: zone.height - 1 - inset };
    case "west":
      return { x: inset, y: exit.at };
    case "east":
      return { x: zone.width - 1 - inset, y: exit.at };
  }
}
export function exitAt(world: World, x: number, y: number): Exit | undefined {
  return world.zone.exits.find((e) => {
    const p = exitPoint(world.zone, e);
    return e.direction === "north" || e.direction === "south"
      ? y === p.y && Math.abs(x - p.x) <= 1
      : x === p.x && Math.abs(y - p.y) <= 1;
  });
}
const cache = new Map<string, World>();
export function getWorld(id: string): World {
  const zone = zoneById(id);
  if (cache.has(zone.id)) return cache.get(zone.id)!;
  const { width, height } = zone,
    rng = random(zone.seed);
  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2)
        return zone.kind === "highland" || zone.kind === "snow"
          ? "rock"
          : "tree";
      if (zone.kind === "orchard" && x % 5 === 3 && y % 5 === 3) return "tree";
      const n = rng(),
        density =
          zone.kind === "forest"
            ? 0.34
            : zone.kind === "glade"
              ? 0.2
              : zone.kind === "orchard"
                ? 0.025
                : 0.07;
      return n < density
        ? zone.kind === "highland"
          ? "rock"
          : "tree"
        : n < density + 0.07
          ? "flowers"
          : "grass";
    }),
  );
  const paint = (x: number, y: number, tile: Tile) => {
    if (tiles[y]?.[x]) tiles[y][x] = tile;
  };
  for (const f of zone.terrain)
    for (let y = f.y; y < f.y + f.h; y++)
      for (let x = f.x; x < f.x + f.w; x++) {
        if (
          f.shape === "rect" ||
          ((x + 0.5 - f.x - f.w / 2) / (f.w / 2)) ** 2 +
            ((y + 0.5 - f.y - f.h / 2) / (f.h / 2)) ** 2 <=
            1
        )
          paint(x, y, f.tile as Tile);
      }
  // Authored polylines retain each area's shape. Only water crossings become bridges.
  for (const trail of zone.trails)
    for (let i = 1; i < trail.points.length; i++) {
      let [x, y] = trail.points[i - 1];
      const [tx, ty] = trail.points[i],
        radius = Math.floor(trail.width / 2);
      const stamp = () => {
        for (let dy = -radius - 1; dy <= radius + 1; dy++)
          for (let dx = -radius - 1; dx <= radius + 1; dx++) {
            const t = tiles[y + dy]?.[x + dx];
            if (!t) continue;
            if (Math.abs(dx) <= radius && Math.abs(dy) <= radius)
              paint(
                x + dx,
                y + dy,
                t === "water" || t === "bridge" ? "bridge" : "path",
              );
            else if (t === "tree" || t === "rock")
              paint(x + dx, y + dy, "grass");
          }
      };
      stamp();
      while (x !== tx || y !== ty) {
        if (x !== tx) x += Math.sign(tx - x);
        else y += Math.sign(ty - y);
        stamp();
      }
    }
  // Seal unused edges; an exit is a deliberate opening, not any edge tile.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
        paint(
          x,
          y,
          zone.kind === "snow" || zone.kind === "highland" ? "rock" : "tree",
        );
  for (const exit of zone.exits)
    for (let depth = 0; depth <= 3; depth++) {
      const p = exitPoint(zone, exit, depth);
      for (let side = -1; side <= 1; side++)
        paint(
          p.x +
            (exit.direction === "north" || exit.direction === "south"
              ? side
              : 0),
          p.y +
            (exit.direction === "east" || exit.direction === "west" ? side : 0),
          "path",
        );
    }
  // Local clearings and short spurs give creatures and supplies accessible habitat.
  const anchors = [
    ...zone.encounterSpots,
    ...zone.pickups,
    zone.spawn,
    ...zone.npcs.map((n) => ({ x: n.x, y: n.y + 1 })),
    ...zone.buildings.map((b) => ({
      x: b.x + Math.floor(b.w / 2),
      y: b.y + b.h + 1,
    })),
  ];
  for (const p of anchors) {
    if (p.x < 2 || p.y < 2 || p.x >= width - 2 || p.y >= height - 2)
      throw new Error(`Invalid point in ${zone.id}`);
    let nearest: Point = zone.spawn,
      best = Infinity;
    for (let y = 2; y < height - 2; y++)
      for (let x = 2; x < width - 2; x++)
        if (tiles[y][x] === "path") {
          const d = Math.abs(x - p.x) + Math.abs(y - p.y);
          if (d < best) {
            best = d;
            nearest = { x, y };
          }
        }
    let { x, y } = p;
    const clear = () => {
      const tile = tiles[y][x];
      if (tile === "tree" || tile === "rock") paint(x, y, "grass");
      else if (tile === "water") paint(x, y, "bridge");
    };
    clear();
    while (x !== nearest.x || y !== nearest.y) {
      if (x !== nearest.x) x += Math.sign(nearest.x - x);
      else y += Math.sign(nearest.y - y);
      clear();
    }
  }
  for (const n of zone.npcs) paint(n.x, n.y, "grass");
  const world: World = {
    zone,
    width,
    height,
    tiles,
    spawn: zone.spawn,
    buildings: zone.buildings,
    npcs: zone.npcs,
    landmarks: zone.landmarks,
    encounterSpots: zone.encounterSpots,
    pickups: zone.pickups.map((p, i) => ({ ...p, id: `${zone.id}-${i}` })),
  };
  cache.set(zone.id, world);
  return world;
}
export function walkable(world: World, x: number, y: number) {
  const tile = world.tiles[y]?.[x];
  return (
    !!tile &&
    tile !== "tree" &&
    tile !== "water" &&
    tile !== "rock" &&
    !world.buildings.some(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
    ) &&
    !world.npcs.some((n) => n.x === x && n.y === y)
  );
}
export function findPath(world: World, start: Point, target: Point): Point[] {
  if (!walkable(world, target.x, target.y)) return [];
  const key = (p: Point) => p.y * world.width + p.x;
  const queue = [start],
    visited = new Map<number, Point | null>([[key(start), null]]);
  let end: Point | undefined;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.x === target.x && p.y === target.y) {
      end = p;
      break;
    }
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (!visited.has(key(n)) && walkable(world, n.x, n.y)) {
        visited.set(key(n), p);
        queue.push(n);
      }
    }
  }
  const path: Point[] = [];
  while (end && key(end) !== key(start)) {
    path.unshift(end);
    end = visited.get(key(end)) ?? undefined;
  }
  return path;
}
// Used to migrate saves after a layout changes, including isolated old positions.
export function reachableTiles(world: World): Set<number> {
  const key = (p: Point) => p.y * world.width + p.x,
    found = new Set([key(world.spawn)]),
    queue = [world.spawn];
  for (let i = 0; i < queue.length; i++)
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const p = { x: queue[i].x + dx, y: queue[i].y + dy };
      if (walkable(world, p.x, p.y) && !found.has(key(p))) {
        found.add(key(p));
        queue.push(p);
      }
    }
  return found;
}
export type Spawn = Point & Traits & { id: string; species: string; level: number };
export function createSpawns(zoneId: string, cycle = 0, traitRng = Math.random, caught: readonly string[] = []): Spawn[] {
  const w = getWorld(zoneId),
    rng = random(w.zone.seed + cycle * 37),
    guardian = w.zone.sanctuary?.species,
    encounterPool = w.zone.encounters.filter((name) => name !== guardian);
  return w.encounterSpots
    .filter((p) => walkable(w, p.x, p.y))
    .map((p, i) => ({
      ...p,
      ...rollTraits(traitRng),
      id: `${w.zone.id}-${cycle}-${i}`,
      species: guardian && i === 0
        ? guardian
        : encounterPool[(i + cycle) % encounterPool.length],
      level:
        (guardian && i === 0 ? 80 : w.zone.level[0] +
        Math.floor(rng() * (w.zone.level[1] - w.zone.level[0] + 1))),
    })).filter((spawn) => !(species[spawn.species].legendary || species[spawn.species].mythical) || !caught.includes(spawn.species));
}
