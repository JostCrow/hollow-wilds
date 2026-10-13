import type { Action, Battle, Save } from "./engine.ts";
import type { SoundCue } from "./audio.ts";

export type AudioState = { save: Save | null; battle: Battle | null; panel: string; dialog: unknown };

// Compare accepted game changes, so blocked moves and invalid actions stay silent.
export function worldCues(previous: AudioState, next: AudioState): SoundCue[] {
  if (!next.save) return [];
  if (!previous.save) return [{ sound: "travel" }];
  if (next.battle && !previous.battle) return [{ sound: "encounter" }];
  if (next.battle) return [];
  if (previous.battle) return previous.battle.outcome === "lost" ? [{ sound: "heal" }] : [];
  const before = previous.save;
  const after = next.save;
  if (before.zone !== after.zone) return [{ sound: "travel" }];
  if (after.collected.length > before.collected.length) return [{ sound: "treasure" }];
  if (after.steps > before.steps) return [{ sound: "step" }];
  if (after.party.some((c) => before.party.some((p) => p.id === c.id && p.species !== c.species)))
    return [{ sound: "evolve" }];
  if (after.party.some((c) => before.party.some((p) => p.id === c.id &&
    (p.hp < c.hp || c.moves.some((key) => c.pp[key] > (p.pp[key] ?? 0))))))
    return [{ sound: "heal" }];
  if (after.money < before.money) return [{ sound: "treasure" }];
  if (next.dialog && next.dialog !== previous.dialog) return [{ sound: "select" }];
  return [];
}

export function battleCues(
  before: { save: Save; battle: Battle },
  after: { save: Save; battle: Battle },
  action: Action,
): SoundCue[] {
  if (before.battle.outcome || after.battle.turn === before.battle.turn) return [];
  const cues: SoundCue[] = [];
  if (action.type === "catch") cues.push({ sound: "throw" });
  else if (action.type === "potion") cues.push({ sound: "heal" });
  else if (action.type === "switch") cues.push({ sound: "switch" });
  else if (action.type === "run") cues.push({ sound: "escape" });
  else cues.push({ sound: after.battle.enemy.hp < before.battle.enemy.hp ? "hit" : "status" });
  if (after.save.party.some((c) => before.save.party.some((p) => p.id === c.id && p.hp > c.hp)))
    cues.push({ sound: "hit", delay: 0.22 });
  const outcome = after.battle.outcome;
  if (outcome && outcome !== "fled") cues.push({
    sound: outcome === "won" ? "victory" : outcome === "caught" ? "capture" : "defeat",
    delay: 0.4,
  });
  const evolved = after.save.party.some((c) => before.save.party.some((p) => p.id === c.id && p.species !== c.species));
  const leveled = after.save.party.some((c) => before.save.party.some((p) => p.id === c.id && p.level < c.level));
  if (evolved || leveled) cues.push({ sound: evolved ? "evolve" : "level", delay: 1.4 });
  return cues;
}
