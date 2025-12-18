import { Button } from "./ui/button";
import { useSessionStore } from "@/stores/session-store";
import { usePlayerStore } from "@/stores/player-store";
import { useGameDataStore } from "@/stores/game-data-store";

export function MainMenu() {
  const { setView, setGameMode } = useSessionStore();
  const hydrated = usePlayerStore((state) => state.hydrated);
  const { creatures } = useGameDataStore();

  if (!hydrated || !creatures) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="h-screen bg-background flex flex-col justify-center items-center gap-4">
      <h1 className="text-5xl font-bold">Pokémon Browser</h1>
      <div className="flex flex-col gap-4 w-64">
        <Button
          onClick={() => {
            setGameMode("new_game");
            setView("character_select");
          }}
          className="text-xl py-6"
        >
          New Game
        </Button>
        <Button disabled variant="secondary" className="text-xl py-6">
          Load Game
        </Button>
        <Button
          onClick={() => {
            setGameMode("infinite_battle");
            setView("character_select");
          }}
          className="text-xl py-6 bg-red-900 hover:bg-red-800"
        >
          Infinite Battle
        </Button>
        <Button
          onClick={() => {
            setView("pokedex");
          }}
          className="text-xl py-6"
        >
          Pokédex
        </Button>
        <Button
          onClick={() => {
            setView("type_chart");
          }}
          className="text-xl py-6"
        >
          Type Chart
        </Button>
      </div>
    </div>
  );
}
