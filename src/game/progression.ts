import worldData from "../../data/world.json" with { type: "json" };
import { creatures } from "./data.ts";

export type Opponent = {
  id: string;
  name: string;
  kind: "trainer" | "gym" | "champion";
  zone: string;
  team: { species: string; level: number }[];
  reward: number;
  badge?: string;
  types: string[];
};
export type Progress = { badges: string[]; defeatedTrainers: string[]; defeatedChampions: string[] };
const team = (names: string[], level: number) => names.map((species, i) => ({ species, level: level - Math.min(2, names.length - i - 1) }));
const gym = (zone: string, name: string, badge: string, level: number, types: string[], names: string[]): Opponent => ({
  id: `gym-${zone}`, name, kind: "gym", zone, badge, types, team: team(names, level), reward: level * 100,
});
export const gyms: Opponent[] = [
  gym("willowfen", "Leader Hazel", "Seedling", 8, ["Plant"], ["Verdreep", "Petal"]),
  gym("larkspur", "Leader Robin", "Breeze", 12, ["Air"], ["Tempestral", "Tempestral"]),
  gym("tidemere", "Leader Marina", "Tide", 17, ["Water"], ["Rivanos", "Pipereef", "Torrentis"]),
  gym("cedarwick", "Leader Flint", "Ember", 22, ["Fire"], ["Flarepib", "Embercub", "Ignisrael"]),
  gym("fernhollow", "Leader Terra", "Bedrock", 27, ["Ground"], ["Peblit", "Boulrock", "Gravulor"]),
  gym("dawnspire", "Leader Lux", "Voltage", 32, ["Electric"], ["Sparkbug", "Voltbeetle", "Sparkle", "Voltalis"]),
  gym("emberstead", "Leader Cinder", "Forge", 37, ["Fire", "Metal", "Ground"], ["Pyrocor", "Mechagrin", "Ironhide", "Infernursus"]),
  gym("copperleaf", "Leader Briar", "Canopy", 42, ["Plant", "Toxic", "Ghost"], ["Sporecrown", "Plaguewing", "Abyreedon", "Solbriar"]),
  gym("glassharbor", "Leader Current", "Tempest", 47, ["Water", "Electric", "Air"], ["Torrentis", "Reedmollusk", "Volteel", "Stormlord", "Ohm-Titan"]),
  gym("bellweather", "Leader Aurora", "Prism", 52, ["Light", "Dark", "Air"], ["Solarune", "Duskhound", "Radianthra", "Purlarcen", "Eclipsera"]),
  gym("snowbell", "Leader Neve", "Glacier", 56, ["Ice", "Metal", "Ghost", "Water"], ["Cryovelis", "Harefrost", "Glacimal", "Glub-Arctic", "Glacimite"]),
  gym("nightbrook", "Leader Vesper", "Eclipse", 60, ["Dark", "Ghost", "Fire", "Water", "Metal", "Light"], ["Nighterror", "Solamphibos", "Duskuragon", "Ferrimaw", "Phantgale", "Eclipsera"]),
];
export const champions: Opponent[] = [
  { id: "champion-starfall", name: "Champion Astra", zone: "starfall", kind: "champion", reward: 12000, types: [], team: team(["Solamphibos", "Torrentis", "Ohm-Titan", "Abyreedon", "Harefrost", "Duskhound"], 68) },
  { id: "champion-rosemere", name: "Champion Rowan", zone: "rosemere", kind: "champion", reward: 16000, types: [], team: team(["Infernursus", "Glub-Abyss", "Solbriar", "Stormlord", "Glacimal", "Mechagrin"], 73) },
  { id: "champion-everlight", name: "Champion Aurelia", zone: "everlight", kind: "champion", reward: 20000, types: [], team: team(["Eclipsera", "Duskuragon", "Radianthra", "Ironhide", "Sporecrown", "Cryovelis"], 78) },
];
// Each field NPC has a stable, area-qualified identity and a fixed regional team.
export const trainers: Opponent[] = worldData.zones.flatMap((zone) => zone.npcs
  .filter((npc) => npc.role === "camper")
  .map((npc) => {
    const level = Math.min(60, Math.max(5, 5 + Math.round((zone.level[0] - 3) * 55 / 32)));
    const habitat = zone.encounters.length ? zone.encounters
      : zone.exits.flatMap((exit) => worldData.zones.find((z) => z.id === exit.target)?.encounters ?? []);
    const pool = habitat.filter((name) => {
      const c = creatures.find((c) => c.name === name);
      return c && !c.legendary && !c.mythical;
    });
    const count = Math.min(5, 1 + Math.floor(level / 12));
    return { id: `trainer-${zone.id}-${npc.id}`, name: npc.name, kind: "trainer" as const, zone: zone.id, types: [], reward: level * 35,
      team: team(Array.from({ length: count }, (_, i) => pool[i % pool.length]), level) };
  }));
export const opponents = [...trainers, ...gyms, ...champions];
export const opponentById = (id: string) => opponents.find((o) => o.id === id);
export const leagueAt = (zone: string) => [...gyms, ...champions].find((o) => o.zone === zone);
export function lockReason(opponent: Opponent, progress: Progress): string | null {
  if (opponent.kind === "gym") {
    const missing = gyms.slice(0, gyms.findIndex((g) => g.id === opponent.id)).find((g) => !progress.badges.includes(g.id));
    if (missing) return `Earn the ${missing.badge} Badge from ${missing.name} first.`;
  }
  if (opponent.kind === "champion") {
    const remaining = gyms.filter((g) => !progress.badges.includes(g.id)).length;
    if (remaining) return `Earn all 12 gym badges to unlock the champions (${12 - remaining}/12 earned).`;
    const previous = champions.slice(0, champions.findIndex((c) => c.id === opponent.id)).find((c) => !progress.defeatedChampions.includes(c.id));
    if (previous) return `Defeat ${previous.name} first.`;
  }
  return null;
}
export const defeated = (o: Opponent, p: Progress) => (o.kind === "gym" ? p.badges : o.kind === "champion" ? p.defeatedChampions : p.defeatedTrainers).includes(o.id);
