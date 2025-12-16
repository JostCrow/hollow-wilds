import { create } from "zustand";

export type GameView =
  | "main_menu"
  | "character_select"
  | "overworld"
  | "in_game_menu"
  | "pokedex";

type ProgressUpdater = number | ((prev: number) => number);

type SessionStoreState = {
  view: GameView;
  isBooting: boolean;
  loadingProgress: number;
  setView: (view: GameView) => void;
  setBooting: (value: boolean) => void;
  setLoadingProgress: (value: ProgressUpdater) => void;
  toggleInGameMenu: () => void;
  openPokedex: () => void;
  closePokedex: () => void;
  returnToMainMenu: () => void;
};

export const useSessionStore = create<SessionStoreState>((set) => ({
  view: "main_menu",
  isBooting: true,
  loadingProgress: 0,
  setView: (view) => set({ view }),
  setBooting: (value) => set({ isBooting: value }),
  setLoadingProgress: (value) =>
    set((state) => ({
      loadingProgress:
        typeof value === "function" ? value(state.loadingProgress) : value,
    })),
  toggleInGameMenu: () =>
    set((state) => {
      if (state.view === "overworld") {
        return { view: "in_game_menu" };
      }
      if (state.view === "in_game_menu") {
        return { view: "overworld" };
      }
      return {};
    }),
  openPokedex: () => set({ view: "pokedex" }),
  closePokedex: () => set({ view: "in_game_menu" }),
  returnToMainMenu: () => set({ view: "main_menu" }),
}));

