import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PlayerSave, PlayerSaveSchema } from "@/types";

type ProgressUpdater = number | ((prev: number) => number);

type PlayerStoreState = {
  playerSave: PlayerSave | null;
  hydrated: boolean;
  error?: string;
  startNewGame: (save: PlayerSave) => void;
  setPlayerSave: (save: PlayerSave | null) => void;
  updatePlayerPosition: (routeKey: string, x: number, y: number) => void;
  updatePlaytime: (updater: ProgressUpdater) => void;
  clearSave: () => void;
  markHydrated: () => void;
  recordError: (message?: string) => void;
};

const storageAvailable = typeof window !== "undefined";

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set, get) => ({
      playerSave: null,
      hydrated: !storageAvailable,
      error: undefined,
      startNewGame: (save) => {
        const parsed = PlayerSaveSchema.safeParse(save);
        if (!parsed.success) {
          console.error("Refusing to start game with invalid save", parsed.error);
          set({ error: "Invalid save data", playerSave: null });
          return;
        }

        set({ playerSave: parsed.data, error: undefined });
      },
      setPlayerSave: (save) => {
        if (save === null) {
          set({ playerSave: null });
          return;
        }

        const parsed = PlayerSaveSchema.safeParse(save);
        if (!parsed.success) {
          console.error("Attempted to set invalid player save", parsed.error);
          return;
        }

        set({ playerSave: parsed.data });
      },
      updatePlayerPosition: (routeKey, x, y) => {
        set((state) => {
          if (!state.playerSave) return state;

          return {
            ...state,
            playerSave: {
              ...state.playerSave,
              currentRoute: routeKey,
              playerPosition: { tx: x, ty: y },
            },
          };
        });
      },
      updatePlaytime: (updater) => {
        set((state) => {
          if (!state.playerSave) return state;

          const nextPlaytime =
            typeof updater === "function"
              ? updater(state.playerSave.playtime)
              : updater;

          return {
            ...state,
            playerSave: {
              ...state.playerSave,
              playtime: Math.max(0, nextPlaytime),
            },
          };
        });
      },
      clearSave: () => set({ playerSave: null }),
      markHydrated: () => set({ hydrated: true }),
      recordError: (message) => set({ error: message }),
    }),
    {
      name: "player-save",
      version: 1,
      storage: storageAvailable
        ? createJSONStorage(() => localStorage)
        : undefined,
      partialize: (state) => ({ playerSave: state.playerSave }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to rehydrate player save", error);
          state?.recordError("Unable to load save data");
        } else if (state?.playerSave) {
          const parsed = PlayerSaveSchema.safeParse(state.playerSave);
          if (!parsed.success) {
            console.warn("Invalid save detected on hydration, clearing state");
            state?.setPlayerSave?.(null);
            state?.recordError?.("Corrupted save data cleared");
          }
        }

        state?.markHydrated?.();
      },
    },
  ),
);

