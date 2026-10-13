import { create } from "zustand";
import { gameAudio } from "./audio";
import { battleCues } from "./audio-cues";
import { stoneByKey } from "./data";
import {
  beginBattle,
  buyStone,
  evolveWithStone,
  heal,
  newSave,
  parseSave,
  SAVE_KEY,
  takeTurn,
  travel,
} from "./engine";
import type { Action, Battle, Save } from "./engine";
import {
  createSpawns,
  getWorld,
  walkable,
  zoneById,
  exitAt,
  opposite,
} from "./world";
import type { Spawn } from "./world";
export type Panel =
  | "adventure"
  | "team"
  | "journal"
  | "map"
  | "bestiary"
  | "moves"
  | "types"
  | "stats"
  | "settings";
export type Dialog = { title: string; text: string; kind?: "shop" | "ranger" };
let initial: Save | null = null,
  initialError = "";
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) initial = parseSave(JSON.parse(raw));
} catch {
  initialError =
    "The local save could not be read. You can import a backup from Settings or start a new adventure.";
}
interface Adventure {
  save: Save | null;
  panel: Panel;
  battle: Battle | null;
  dialog: Dialog | null;
  spawns: Spawn[];
  notice: string;
  saveError: string;
  cycle: number;
  direction: "up" | "down" | "left" | "right";
  start: (starter: string, name: string) => void;
  reset: () => void;
  setPanel: (panel: Panel) => void;
  move: (dx: number, dy: number) => boolean;
  interact: () => void;
  encounter: (spawn: Spawn) => void;
  act: (action: Action) => void;
  closeBattle: () => void;
  dismiss: () => void;
  buy: (item: "balls" | "potions") => void;
  buyEvolutionStone: (key: string) => void;
  evolve: (id: string, key: string) => void;
  challenge: () => void;
  reorder: (id: string) => void;
  potion: (id: string) => void;
  swap: (storageId: string, partyId?: string) => void;
  fastTravel: (id: string) => void;
  importSave: (input: unknown) => void;
  replenish: () => void;
  toast: (text: string) => void;
}
export const useAdventure = create<Adventure>((set, get) => ({
  save: initial,
  panel:
    (
      {
        "/team": "team",
        "/journal": "journal",
        "/map": "map",
        "/pokedex": "bestiary",
        "/moves": "moves",
        "/typechart": "types",
        "/stats": "stats",
        "/settings": "settings",
      } as Record<string, Panel>
    )[window.location.pathname] ?? "adventure",
  battle: null,
  dialog: null,
  spawns: createSpawns(initial?.zone ?? "willowfen"),
  notice: initialError,
  saveError: "",
  cycle: 0,
  direction: "down",
  start: (starter, name) => {
    set({
      save: newSave(starter, name),
      spawns: createSpawns("willowfen"),
      panel: "adventure",
      battle: null,
      dialog: null,
      notice:
        "Your adventure begins. Talk to Professor Fern, or follow the path east!",
    });
  },
  reset: () => {
    clearTimeout(pendingSave);
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* The next game can still be played without persistence. */
    }
    set({
      save: null,
      panel: "adventure",
      battle: null,
      dialog: null,
      spawns: createSpawns("willowfen"),
      cycle: 0,
      notice: "",
      saveError: "",
    });
  },
  setPanel: (panel) => {
    if (!get().battle && !get().dialog) set({ panel });
  },
  toast: (notice) => set({ notice }),
  move: (dx, dy) => {
    const { save, panel, battle, dialog, spawns } = get();
    if (!save || panel !== "adventure" || battle || dialog) return false;
    set({
      direction: dx > 0 ? "right" : dx < 0 ? "left" : dy < 0 ? "up" : "down",
    });
    const x = save.x + dx,
      y = save.y + dy,
      world = getWorld(save.zone);
    if (!walkable(world, x, y)) return false;
    const wild = spawns.find((s) => s.x === x && s.y === y);
    if (wild) {
      get().encounter(wild);
      return false;
    }
    const exit = exitAt(world, x, y);
    if (exit) {
      const target = exit.target;
      set({
        save: travel(
          { ...save, steps: save.steps + 1 },
          target,
          opposite[exit.direction],
        ),
        spawns: createSpawns(target, get().cycle),
        notice: `Welcome to ${zoneById(target).name}.`,
      });
    } else {
      const pickup = world.pickups.find(
        (p) => p.x === x && p.y === y && !save.collected.includes(p.id),
      );
      set({
        save: {
          ...save,
          x,
          y,
          steps: save.steps + 1,
          ...(pickup
            ? {
                collected: [...save.collected, pickup.id],
                balls: save.balls + 2,
                potions: save.potions + 1,
              }
            : {}),
        },
        ...(pickup
          ? { notice: "A little trail treasure! +2 capture orbs · +1 potion" }
          : {}),
      });
    }
    return true;
  },
  interact: () => {
    const { save, battle, dialog, panel } = get();
    if (!save || battle || dialog || panel !== "adventure") return;
    const world = getWorld(save.zone);
    const near = (p: { x: number; y: number }) =>
      Math.abs(p.x - save.x) + Math.abs(p.y - save.y);
    const wild = get().spawns.find((s) => near(s) <= 2);
    if (wild) {
      get().encounter(wild);
      return;
    }
    const npc = world.npcs.find((n) => near(n) <= 2);
    if (npc) {
      if (npc.role === "ranger") {
        set({
          dialog: {
            title: "Ranger Elowen",
            kind:
              save.caught.length >= 3 && save.wins >= 3 ? "ranger" : undefined,
            text: save.badge
              ? "A Wildflower Badge looks good on you! Want a friendly rematch? There are still so many creatures out there to meet."
              : save.caught.length >= 3 && save.wins >= 3
                ? "Three species registered and three battles won. You have the heart of a ranger. Ready for your final field test?"
                : `Welcome to Larkspur! Register 3 species (${Math.min(3, save.caught.length)}/3) and win 3 wild battles (${Math.min(3, save.wins)}/3), then challenge me for the Wildflower Badge.`,
          },
        });
      } else
        set({
          dialog: {
            title: npc.name,
            text: npc.dialogue,
          },
        });
      return;
    }
    const building = world.buildings.find(
      (b) =>
        Math.abs(save.x - (b.x + Math.floor(b.w / 2))) <= 2 &&
        save.y >= b.y + b.h &&
        save.y <= b.y + b.h + 2,
    );
    if (building?.service === "heal") {
      set({
        save: heal(save),
        dialog: {
          title: "Rest easy, little wanderers.",
          text: "Your whole team is feeling wonderful again. All HP and move PP restored, free of charge. You are always welcome here.",
        },
      });
    } else if (building?.service === "shop")
      set({
        dialog: {
          title: "Field Supplies",
          text: "A few essentials for the road. Capture orbs cost 80 coins, potions restore 30 HP for 60 coins, and evolution stones cost 300 coins. Use stones from My team.",
          kind: "shop",
        },
      });
    else if (building)
      set({
        dialog: {
          title: "Ranger's Rest",
          text: "A warm cup of tea, a well-worn map, and the smell of cedar. Your journey is saved automatically as you explore. Visit Settings to download a JSON backup.",
        },
      });
    else
      set({
        notice:
          "Move next to a creature, person, or building entrance, then press E.",
      });
  },
  encounter: (spawn) => {
    const { save, battle } = get();
    if (!save || battle) return;
    set({
      save: { ...save, seen: [...new Set([...save.seen, spawn.species])] },
      battle: beginBattle(save, spawn.species, spawn.level, false, spawn),
      spawns: get().spawns.filter((s) => s.id !== spawn.id),
      notice: "",
    });
  },
  act: (action) => {
    const { save, battle } = get();
    if (save && battle) {
      const next = takeTurn(save, battle, action);
      set(next);
      gameAudio.playCues(battleCues({ save, battle }, next, action));
    }
  },
  closeBattle: () => {
    const { save, battle } = get();
    if (!save || !battle?.outcome) return;
    if (battle.outcome === "lost" || !save.party.some((c) => c.hp > 0))
      set({
        save: heal(travel(save, "willowfen")),
        spawns: createSpawns("willowfen"),
        notice:
          "Back in Willowfen. Your team is healed and ready for another adventure.",
      });
    else
      set({
        notice:
          battle.outcome === "caught"
            ? `${battle.enemy.species} is now part of your adventure!`
            : battle.outcome === "won"
              ? "A little stronger. A little further. Keep exploring!"
              : "Back on the trail.",
      });
    set({ battle: null });
  },
  dismiss: () => set({ dialog: null }),
  buy: (item) => {
    const save = get().save;
    if (!save || get().dialog?.kind !== "shop") return;
    const price = item === "balls" ? 80 : 60;
    if (save.money < price) {
      set({ notice: "Not enough coins. Wild battles earn more." });
      return;
    }
    set({
      save: { ...save, money: save.money - price, [item]: save[item] + 1 },
      notice: `Added ${item === "balls" ? "a capture orb" : "a potion"} to your bag.`,
    });
  },
  buyEvolutionStone: (key) => {
    const { save, battle, dialog } = get();
    if (!save || battle || dialog?.kind !== "shop") return;
    const next = buyStone(save, key);
    if (next === save) {
      set({ notice: "You need more coins to buy that stone." });
      return;
    }
    set({
      save: next,
      notice: `${stoneByKey[key].name} added to your bag. Use it from My team.`,
    });
  },
  evolve: (id, key) => {
    const { save, battle, dialog } = get();
    if (!save || battle || dialog) return;
    const next = evolveWithStone(save, id, key);
    if (next === save) return;
    const before = save.party.find((c) => c.id === id)!,
      after = next.party.find((c) => c.id === id)!;
    set({
      save: next,
      notice: `${before.species} evolved into ${after.species}! Used one ${stoneByKey[key].name}.`,
    });
  },
  challenge: () => {
    const save = get().save;
    if (!save || get().dialog?.kind !== "ranger") return;
    set({
      dialog: null,
      battle: beginBattle(save, "Brambright", 10, true),
      save: { ...save, seen: [...new Set([...save.seen, "Brambright"])] },
    });
  },
  reorder: (id) => {
    const save = get().save;
    if (!save || get().battle) return;
    const c = save.party.find((p) => p.id === id);
    if (c)
      set({
        save: { ...save, party: [c, ...save.party.filter((p) => p.id !== id)] },
      });
  },
  potion: (id) => {
    const save = get().save;
    if (!save || save.potions < 1 || get().battle) return;
    const c = save.party.find((c) => c.id === id);
    if (!c || c.hp <= 0 || c.hp === c.maxHp) return;
    set({
      save: {
        ...save,
        potions: save.potions - 1,
        party: save.party.map((c) =>
          c.id === id ? { ...c, hp: Math.min(c.maxHp, c.hp + 30) } : c,
        ),
      },
      notice: `${c.species} feels better. +30 HP (up to maximum).`,
    });
  },
  swap: (storageId, partyId) => {
    const save = get().save;
    if (!save || get().battle) return;
    const c = save.storage.find((p) => p.id === storageId);
    if (!c) return;
    if (save.party.length < 6)
      set({
        save: {
          ...save,
          party: [...save.party, c],
          storage: save.storage.filter((p) => p.id !== storageId),
        },
      });
    else {
      const replaced = save.party.find((p) => p.id === partyId);
      if (
        !replaced ||
        (!c.hp && !save.party.some((p) => p.id !== partyId && p.hp > 0))
      )
        return;
      set({
        save: {
          ...save,
          party: save.party.map((p) => (p.id === partyId ? c : p)),
          storage: [
            ...save.storage.filter((p) => p.id !== storageId),
            replaced,
          ],
        },
      });
    }
  },
  fastTravel: (id) => {
    const save = get().save;
    if (!save || !save.visited.includes(id) || get().battle) return;
    set({
      save: travel(save, id),
      spawns: createSpawns(id, get().cycle),
      panel: "adventure",
      notice: `Arrived in ${zoneById(id).name}.`,
    });
  },
  importSave: (input) => {
    const save = parseSave(input);
    set({
      save,
      spawns: createSpawns(save.zone),
      battle: null,
      dialog: null,
      panel: "adventure",
      notice: "Your adventure has been restored from JSON.",
    });
  },
  replenish: () => {
    const { save, panel, battle, dialog, spawns, cycle } = get();
    if (!save || panel !== "adventure" || battle || dialog) return;
    const candidates = createSpawns(save.zone, cycle + 1).filter(
      (s) =>
        Math.abs(s.x - save.x) + Math.abs(s.y - save.y) > 3 &&
        !spawns.some((p) => Math.abs(p.x - s.x) + Math.abs(p.y - s.y) < 3),
    );
    if (spawns.length < getWorld(save.zone).encounterSpots.length)
      set({ spawns: [...spawns, ...candidates.slice(0, 1)], cycle: cycle + 1 });
  },
}));
let pendingSave: ReturnType<typeof setTimeout> | undefined;
function persist(save: Save) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...save, savedAt: new Date().toISOString() }),
    );
    if (useAdventure.getState().saveError)
      useAdventure.setState({ saveError: "" });
  } catch {
    useAdventure.setState({
      saveError:
        "Autosave is unavailable. Download a JSON backup in Settings to keep your progress.",
    });
  }
}
const unsubscribePersistence = useAdventure.subscribe((state, previous) => {
  if (state.save && state.save !== previous.save) {
    clearTimeout(pendingSave);
    pendingSave = setTimeout(() => {
      pendingSave = undefined;
      persist(state.save!);
    }, 250);
  }
});
function flushPendingSave() {
  if (!pendingSave) return;
  clearTimeout(pendingSave);
  pendingSave = undefined;
  const save = useAdventure.getState().save;
  if (save) persist(save);
}
window.addEventListener("pagehide", flushPendingSave);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    flushPendingSave();
    unsubscribePersistence();
    window.removeEventListener("pagehide", flushPendingSave);
  });
}
