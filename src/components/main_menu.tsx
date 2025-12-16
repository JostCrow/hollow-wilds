import { Button } from "./ui/button";
import { useSessionStore } from "@/stores/session-store";
import { usePlayerStore } from "@/stores/player-store";

export function MainMenu() {
  const setView = useSessionStore((state) => state.setView);
  const playerSave = usePlayerStore((state) => state.playerSave);
  const hydrated = usePlayerStore((state) => state.hydrated);

  const handleNewGame = () => {
    setView("character_select");
  };

  const handleLoadStoredGame = () => {
    if (!hydrated) {
      console.warn("Save data is still loading.");
      return;
    }

    if (!playerSave) {
      console.warn("No stored game found.");
      return;
    }

    setView("overworld");
  };

  const handleLoadSavedGame = () => {
    console.log("External save slots not implemented yet.");
  };

  return (
    <div className="h-screen bg-background flex flex-col justify-center items-center gap-4">
      <h1 className="text-5xl font-bold">Pokémon Browser</h1>
      <Button onClick={handleNewGame} variant="outline">
        New Game
      </Button>
      <Button onClick={handleLoadStoredGame} variant="outline">
        Load Stored Game
      </Button>
      <Button onClick={handleLoadSavedGame} variant="outline">
        Load Saved Game
      </Button>
    </div>
  );
}
