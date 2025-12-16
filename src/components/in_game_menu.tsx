import React from "react";
import { Button } from "./ui/button";
import { useSessionStore } from "@/stores/session-store";

export const InGameMenu: React.FC = () => {
  const setView = useSessionStore((state) => state.setView);
  const openPokedex = useSessionStore((state) => state.openPokedex);
  const returnToMainMenu = useSessionStore((state) => state.returnToMainMenu);

  const handleBackToGame = () => setView("overworld");

  return (
    <div className="h-screen bg-background flex flex-col gap-4 justify-center items-center">
      <h2 className="text-3xl font-bold">In-Game Menu</h2>

      <Button variant="outline">Show Party</Button>
      <Button variant="outline" onClick={openPokedex}>
        Show Pokédex
      </Button>
      <Button variant="outline">Show items</Button>
      <Button variant="outline">Save</Button>
      <Button variant="outline" onClick={returnToMainMenu}>
        Return to main menu
      </Button>
      <Button variant="secondary" onClick={handleBackToGame}>
        Back to game (Esc)
      </Button>

      <p className="mt-3 text-xs text-gray-500">
        Press Escape to toggle this menu while in the overworld.
      </p>
    </div>
  );
};
