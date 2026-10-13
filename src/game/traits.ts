import settings from "../../data/encounter-settings.json" with { type: "json" };
import { species } from "./data.ts";

export const encounterSettings = settings;
export type Traits = { shiny: boolean; alpha: boolean };
export const statKeys = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"] as const;
export type Stat = (typeof statKeys)[number];
export const statLabels: Record<Stat, string> = {
  hp: "HP", attack: "Attack", defense: "Defense",
  sp_attack: "Sp. attack", sp_defense: "Sp. defense", speed: "Speed",
};
export function rollTraits(rng = Math.random): Traits {
  return {
    shiny: rng() < 1 / settings.shinyOdds,
    alpha: rng() < 1 / settings.alphaOdds,
  };
}
// Apply the species' authored shiny bonus first, then the alpha multiplier.
// Species without an authored shiny boost receive a bonus to all six stats.
export function effectiveBaseStat(name: string, stat: Stat, traits: Partial<Traits> = {}) {
  const creature = species[name], boost = creature.shiny_boost;
  const bonus = !traits.shiny ? 0 : !boost ? settings.fallbackShinyBonus : boost.stat === stat ? boost.bonus : 0;
  return Math.floor((creature.base_stats[stat] + bonus) * (traits.alpha ? settings.alphaStatMultiplier : 1));
}
export function traitLabel(traits: Partial<Traits>) {
  return [traits.shiny && "Shiny", traits.alpha && "Alpha"].filter(Boolean).join(" · ");
}
export function shinyDescription(name: string) {
  const boost = species[name].shiny_boost;
  return boost ? `+${boost.bonus} base ${statLabels[boost.stat as Stat]}` : `+${settings.fallbackShinyBonus} to all base stats`;
}
export const SHINY_FILTER = "hue-rotate(125deg) saturate(1.5)";
