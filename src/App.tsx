import React, { useEffect } from "react";
import { Overworld } from "./components/overworld";
import { Loading } from "@/components/loading";
import { MainMenu } from "./components/main_menu";
import { CharacterSelect } from "./components/character_select";
import { InGameMenu } from "./components/in_game_menu";
import { Pokedex } from "./components/pokedex";
import { TypeChart } from "./components/type_chart";
import { ThemeProvider } from "@/components/theme-provider";
import { useSessionStore } from "@/stores/session-store";
import { usePlayerStore } from "@/stores/player-store";
import { useGameDataStore } from "@/stores/game-data-store";
import { BattleScene } from "@/components/battle/battle-scene";

function App() {
  const view = useSessionStore((state) => state.view);
  const isBooting = useSessionStore((state) => state.isBooting);
  const progress = useSessionStore((state) => state.loadingProgress);
  const setBooting = useSessionStore((state) => state.setBooting);
  const setLoadingProgress = useSessionStore(
    (state) => state.setLoadingProgress,
  );
  const toggleInGameMenu = useSessionStore((state) => state.toggleInGameMenu);
  const closePokedex = useSessionStore((state) => state.closePokedex);
  const playerSave = usePlayerStore((state) => state.playerSave);
  const hydrated = usePlayerStore((state) => state.hydrated);
  const routes = useGameDataStore((state) => state.routes);
  const status = useGameDataStore((state) => state.status);
  const error = useGameDataStore((state) => state.error);
  const loadRoutes = useGameDataStore((state) => state.loadRoutes);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    setBooting(true);
    setLoadingProgress(0);

    const loadingInterval = window.setInterval(() => {
      setLoadingProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);

    return () => {
      window.clearInterval(loadingInterval);
    };
  }, [setBooting, setLoadingProgress]);

  useEffect(() => {
    if (!hydrated || status !== "loaded") {
      return;
    }

    setLoadingProgress(100);
    const timer = window.setTimeout(() => {
      setBooting(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [hydrated, status, setBooting, setLoadingProgress]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        toggleInGameMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleInGameMenu]);

  if (status === "error") {
    return (
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
          Failed to load game data: {error}
        </div>
      </ThemeProvider>
    );
  }

  const shouldShowLoading = isBooting || status !== "loaded" || !hydrated;

  if (shouldShowLoading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Loading progress={progress} />
      </ThemeProvider>
    );
  }

  let content: React.ReactNode;

  switch (view) {
    case "character_select":
      content = <CharacterSelect />;
      break;
    case "overworld":
      if (!routes || !playerSave) {
        content = (
          <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
            Error: Missing game data
          </div>
        );
      } else {
        content = (
          <div className="relative">
            <Overworld routes={routes} playerSave={playerSave} />
          </div>
        );
      }
      break;
    case "in_game_menu":
      content = <InGameMenu />;
      break;
    case "pokedex":
      content = (
        <Pokedex playerPokedex={playerSave?.pokedex} onClose={closePokedex} />
      );
      break;
    case "battle":
      content = <BattleScene />;
      break;
    case "type_chart":
      content = <TypeChart />;
      break;
    default:
      content = <MainMenu />;
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      {content}
    </ThemeProvider>
  );
}

export default App;
