import { exitAt, walkable } from "./world.ts";
import type { Point, Spawn, World } from "./world.ts";

export type RoamSchedule = {
  zoneId: string;
  lastTick: number;
  timers: Map<string, { nextStep: number; heading: Point | null }>;
};

export function createRoamSchedule(): RoamSchedule {
  return { zoneId: "", lastTick: 0, timers: new Map() };
}

const directions = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];
const terrain = new Set(["grass", "tall", "flowers", "sand", "ice", "path"]);
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const cell = (p: Point) => `${p.x},${p.y}`;

/** Advance independent creature strolls while preserving authoritative tile positions. */
export function roamCreatures(
  world: World,
  spawns: Spawn[],
  player: Point,
  time: number,
  schedule: RoamSchedule,
  active: boolean,
  rng = Math.random,
  heldId: string | null = null,
): Spawn[] {
  if (schedule.zoneId !== world.zone.id) {
    schedule.zoneId = world.zone.id;
    schedule.timers.clear();
    schedule.lastTick = time;
  }
  const elapsed = Math.max(0, time - schedule.lastTick);
  schedule.lastTick = time;
  const ids = new Set(spawns.map((spawn) => spawn.id));
  for (const id of schedule.timers.keys()) if (!ids.has(id)) schedule.timers.delete(id);
  if (!active) {
    // Pause existing clocks without adding elapsed time to newly arrived creatures.
    for (const timer of schedule.timers.values()) timer.nextStep += elapsed;
  }
  for (const spawn of spawns) {
    if (!schedule.timers.has(spawn.id))
      schedule.timers.set(spawn.id, { nextStep: time + 150 + rng() * 650, heading: null });
  }
  if (!active) return spawns;
  // Reserve source cells for this tick too: creatures cannot swap through one another.
  const occupied = new Set(spawns.map(cell));
  let changed = false;
  const next = spawns.map((spawn) => {
    const timer = schedule.timers.get(spawn.id)!;
    if (time < timer.nextStep) return spawn;
    if (distance(spawn, player) <= 3 || spawn.id === heldId) {
      timer.nextStep = time + 350;
      return spawn;
    }
    const options = directions.filter((direction) => {
      const point = { x: spawn.x + direction.x, y: spawn.y + direction.y };
      return (
        point.x > 2 && point.x < world.width - 3 &&
        point.y > 2 && point.y < world.height - 3 &&
        walkable(world, point.x, point.y) &&
        terrain.has(world.tiles[point.y][point.x]) &&
        !occupied.has(cell(point)) && distance(point, player) > 3 &&
        !exitAt(world, point.x, point.y) &&
        !world.buildings.some((b) =>
          point.y === b.y + b.h && Math.abs(point.x - (b.x + Math.floor(b.w / 2))) <= 1,
        )
      );
    });
    // Prefer continuing a short walk to repeatedly turning back on the same spot.
    const continuing = timer.heading && options.find((option) =>
      option.x === timer.heading!.x && option.y === timer.heading!.y,
    );
    const direction = continuing && rng() < .65
      ? continuing
      : options[Math.floor(rng() * options.length)];
    timer.nextStep = time + 850 + rng() * 850 + (rng() < .16 ? 700 : 0);
    if (!direction) return spawn;
    timer.heading = direction;
    const result = { ...spawn, x: spawn.x + direction.x, y: spawn.y + direction.y };
    occupied.add(cell(result));
    changed = true;
    return result;
  });
  return changed ? next : spawns;
}
