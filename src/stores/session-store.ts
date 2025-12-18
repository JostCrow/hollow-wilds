import { create } from "zustand";

export type GameView =
  | "main_menu"
  | "character_select"
  | "overworld"
  | "in_game_menu"
  | "pokedex"
  | "battle"
  | "type_chart";

type ProgressUpdater = number | ((prev: number) => number);

type SessionStoreState = {
  view: GameView;
  gameMode: "new_game" | "infinite_battle";
  isBooting: boolean;
  loadingProgress: number;
  setView: (view: GameView) => void;
  setGameMode: (mode: "new_game" | "infinite_battle") => void;
  setBooting: (value: boolean) => void;
  setLoadingProgress: (value: ProgressUpdater) => void;
  toggleInGameMenu: () => void;
  openPokedex: () => void;
  closePokedex: () => void;
  returnToMainMenu: () => void;
};

export const useSessionStore = create<SessionStoreState>((set) => ({
  view: "main_menu",
  gameMode: "new_game",
  isBooting: true,
  loadingProgress: 0,
  setView: (view) => set({ view }),
  setGameMode: (gameMode) => set({ gameMode }),
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
