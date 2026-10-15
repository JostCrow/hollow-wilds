import { existsSync } from "node:fs";
import { creatures, moves, types, species } from "../src/game/data.ts";
import {
  CreatureSchema,
  MovesFileSchema,
  TypeChartSchema,
} from "../src/types/schemas.ts";
import {
  zones,
  createSpawns,
  getWorld,
  findPath,
  exitPoint,
  opposite,
} from "../src/game/world.ts";

const errors: string[] = [];
const duplicates = creatures.filter(
  (c, i) => creatures.findIndex((other) => other.name === c.name) !== i,
);
if (duplicates.length)
  errors.push(`Duplicate species: ${duplicates.map((c) => c.name).join(", ")}`);
for (const c of creatures) {
  const result = CreatureSchema.safeParse(c);
  if (!result.success) errors.push(`${c.name}: ${result.error.message}`);
  for (const evolution of c.evolution_requirements ?? [])
    if (!species[evolution.evolves_to])
      errors.push(
        `${c.name} evolves into unknown species ${evolution.evolves_to}`,
      );
}
if (!MovesFileSchema.safeParse(moves).success)
  errors.push("Move data does not match its schema.");
if (!TypeChartSchema.safeParse(types).success)
  errors.push("Type chart does not match its schema.");
for (const zone of zones) {
  const world = getWorld(zone.id);
  for (const exit of zone.exits) {
    const target = zones.find((z) => z.id === exit.target);
    if (
      !target?.exits.some(
        (e) => e.target === zone.id && e.direction === opposite[exit.direction],
      )
    )
      errors.push(`${zone.name}: missing return route from ${exit.target}`);
    if (!findPath(world, world.spawn, exitPoint(zone, exit)).length)
      errors.push(`${zone.name}: unreachable ${exit.direction} exit`);
  }
  for (const name of zone.encounters)
    if (!species[name]) errors.push(`${zone.name}: unknown species ${name}`);
  for (const spawn of createSpawns(zone.id))
    if (!findPath(world, world.spawn, spawn).length)
      errors.push(`${zone.name}: unreachable ${spawn.species}`);
}
const missingMoves = [
  ...new Set(
    creatures.flatMap((c) =>
      c.moveset.filter((m) => !moves[m.move_key]).map((m) => m.move_key),
    ),
  ),
];
const missingArt = creatures.filter(
  (c) => !existsSync(new URL(`../assets/monster/${c.sprite}`, import.meta.url)),
);
console.log(
  `${creatures.length} hollowings · ${Object.keys(moves).length} moves · ${types.types.length} types · ${zones.length} connected areas`,
);
if (missingMoves.length)
  console.warn(
    `Data warning: ${missingMoves.length} referenced moves are undefined. These remain visible in the guide and are excluded from playable learnsets.`,
  );
if (missingArt.length)
  console.warn(
    `Art warning: ${missingArt.length} hollowings use field-sketch placeholders: ${missingArt.map((c) => c.name).join(", ")}`,
  );
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("Data validation passed.");
