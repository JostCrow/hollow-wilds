import source from "../../../data/world.json" with { type: "json" };
import { islandShore } from "../island.ts";
import { leagueAt } from "../progression.ts";
import { cubic, samplePath } from "./geometry.ts";
import type {
  WorldDefinition,
  WorldPoint,
  WorldRoad,
  WorldBuilding,
  WorldNPC,
  WorldLandmark,
  WorldPickup,
  WorldResident,
} from "./types.ts";
export const HOLLOW_ISLAND_ID = "hollow-island";
const scale = 2.2,
  origin = 500;
const convert = (x: number, z: number): WorldPoint => ({
  x: (x - origin) * scale,
  z: (z - origin) * scale,
});
const directions: Record<string, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  west: [-1, 0],
  east: [1, 0],
};
export function rawHeight(x: number, z: number) {
  const bump = (cx: number, cz: number, r: number, h: number) =>
    h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return Math.max(
    2.2,
    4 +
      Math.sin(x * 0.009) * Math.cos(z * 0.007) * 2 +
      bump(630, -790, 180, 49) +
      bump(430, 740, 170, 68) +
      bump(170, 120, 170, 14),
  );
}
const places = source.zones.map((z) => ({
  ...convert(z.mapX * 10, z.mapY * 10),
  id: z.id,
  name: z.name,
  kind: z.kind,
  radius: z.kind === "town" || z.kind === "coast" ? 35 : 52,
  level: z.level as [number, number],
}));
const buildings: WorldBuilding[] = [],
  npcs: WorldNPC[] = [],
  landmarks: WorldLandmark[] = [],
  pickups: WorldPickup[] = [],
  roads: WorldRoad[] = [];
for (const z of source.zones) {
  const center = places.find((p) => p.id === z.id)!;
  const local = (x: number, y: number): WorldPoint => ({
    x: center.x + (x - z.spawn.x) * 1.15,
    z: center.z + (y - z.spawn.y) * 1.15,
  });
  const league = leagueAt(z.id);
  for (const b of z.buildings) {
    const location = local(b.x + b.w / 2, b.y + b.h / 2),
      service = league && b.service === "home" ? league.kind : b.service;
    const door = { x: location.x, z: location.z + (b.h * 1.15) / 2 + 0.8 };
    buildings.push({
      ...location,
      id: `${z.id}:building:${b.name}`,
      placeId: z.id,
      name: league && b.service === "home" ? league.name : b.name,
      service: service as WorldBuilding["service"],
      roof:
        league && b.service === "home"
          ? league.kind === "gym"
            ? "#8c79a6"
            : "#bd9949"
          : b.roof,
      halfWidth: (b.w * 1.15) / 2,
      halfDepth: (b.h * 1.15) / 2,
      door,
    });
  }
  for (const n of z.npcs)
    npcs.push({
      ...local(n.x, n.y),
      id: `${z.id}:npc:${n.id}`,
      sourceId: n.id,
      placeId: z.id,
      name: n.name,
      color: n.color,
      role: n.role as WorldNPC["role"],
      dialogue: n.dialogue,
    });
  for (const [i, l] of z.landmarks.entries())
    landmarks.push({
      ...local(l.x, l.y),
      id: `${z.id}:landmark:${i}`,
      placeId: z.id,
      name: l.label,
      kind: l.kind,
    });
  for (const [i, p] of z.pickups.entries())
    pickups.push({ ...local(p.x, p.y), id: `island:${z.id}:treasure:${i}` });
  for (const exit of z.exits) {
    if (z.id > exit.target) continue;
    const target = places.find((p) => p.id === exit.target)!;
    const bend = Math.hypot(target.x - center.x, target.z - center.z) * 0.38,
      [dx, dz] = directions[exit.direction];
    const b = { x: center.x + dx * bend, z: center.z + dz * bend },
      c = { x: target.x - dx * bend, z: target.z - dz * bend };
    const count = Math.ceil(
      Math.hypot(target.x - center.x, target.z - center.z) / 2.8,
    );
    const points = Array.from({ length: count + 1 }, (_, i) => {
      const p = cubic(center, b, c, target, i / count);
      return { ...p, height: rawHeight(p.x, p.z) };
    });
    roads.push({
      id: `${z.id}:${exit.target}`,
      from: z.id,
      to: exit.target,
      points,
      width: 3.8,
    });
  }
}
// Town walkways connect building doors to the continuous trail network.
for (const b of buildings) {
  const place = places.find((p) => p.id === b.placeId)!;
  const waypoints = [
    place,
    { x: place.x, z: b.door.z + 0.7 },
    { x: b.door.x, z: b.door.z + 0.7 },
    b.door,
  ];
  const points = waypoints.flatMap((a, index) => {
    if (index === 0) return [{ ...a, height: rawHeight(a.x, a.z) }];
    const start = waypoints[index - 1],
      count = Math.max(
        1,
        Math.ceil(Math.hypot(a.x - start.x, a.z - start.z) / 1.5),
      );
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / count,
        p = {
          x: start.x + (a.x - start.x) * t,
          z: start.z + (a.z - start.z) * t,
        };
      return { ...p, height: rawHeight(p.x, p.z) };
    });
  });
  roads.push({
    id: `walkway:${b.id}`,
    from: b.placeId,
    to: b.placeId,
    points,
    width: 1.8,
  });
}
const lake = samplePath(
  "M 528 515 C 559 501 581 518 590 548 C 622 559 621 590 597 615 C 579 649 536 659 510 628 C 479 607 497 578 505 561 C 490 538 509 521 528 515 Z",
  convert,
);
const river = samplePath(
  "M 518 536 C 493 506 476 486 439 468 C 405 442 421 399 387 377 C 348 344 305 364 272 335 C 243 315 222 316 206 294",
  convert,
  40,
);
// This island gets a curated population. Other models are ready for future worlds.
const roster: Record<string, string[]> = {
  willowfen: ["Niblet", "Twigglo"],
  sunpetal: ["Pupawn", "Cindlark", "Verdreep"],
  mosswood: ["Shroombud", "Nibbkit"],
  bramble: ["Twigglo", "Tindertail"],
  tidemere: ["Rivanos", "Pipereef"],
  reedwater: ["Puddlop"],
  cedarwick: ["Embercub"],
  fernhollow: ["Peblit"],
  snowbell: ["Snochi"],
  nightbrook: ["Noxling"],
  copperleaf: ["Sparkbug"],
  larkspur: ["Cindlark"],
  rosemere: ["Glimmoth"],
};
const residents: WorldResident[] = [];
for (const [placeId, names] of Object.entries(roster)) {
  const p = places.find((p) => p.id === placeId);
  if (!p) continue;
  for (const [i, name] of names.entries())
    residents.push({
      id: `${HOLLOW_ISLAND_ID}:${placeId}:${name}`,
      species: name,
      level: Math.min(14, p.level[0] + i),
      x: p.x + 9 + i * 5,
      z: p.z + 5 + i * 2,
      roamRadius: 3,
    });
}
const spawnPlace = places.find((p) => p.id === "willowfen")!;
export const hollowIsland: WorldDefinition = {
  groundColor: "#b0c18a",
  biomes: [
    ...[
      [175, 500, 95, 145],
      [325, 400, 112, 90],
      [443, 254, 95, 64],
      [730, 328, 62, 70],
      [352, 736, 80, 44],
      [175, 859, 57, 49],
    ].map(([x, z, rx, rz]) => ({
      ...convert(x, z),
      kind: "forest",
      radiusX: rx * scale,
      radiusZ: rz * scale,
      color: "#829c6b",
      treeDensity: 80,
    })),
    {
      ...convert(790, 155),
      kind: "highland",
      radiusX: 155 * scale,
      radiusZ: 100 * scale,
      color: "#b6aa83",
      treeDensity: 12,
    },
    {
      ...convert(722, 840),
      kind: "snow",
      radiusX: 95 * scale,
      radiusZ: 125 * scale,
      color: "#e3eae1",
      treeDensity: 16,
    },
    {
      ...convert(895, 398),
      kind: "wetland",
      radiusX: 65 * scale,
      radiusZ: 80 * scale,
      color: "#95b18b",
      treeDensity: 28,
    },
  ],
  heightAt: rawHeight,
  id: HOLLOW_ISLAND_ID,
  name: "The Hollow Wilds",
  seed: 12718,
  size: 2200,
  shore: samplePath(islandShore, convert, 18),
  shoreSVG: islandShore,
  mapScale: scale,
  mapOrigin: origin,
  places,
  roads,
  buildings,
  npcs,
  landmarks,
  pickups,
  residents,
  spawn: { x: spawnPlace.x, z: spawnPlace.z + 3 },
  lake,
  river,
};
