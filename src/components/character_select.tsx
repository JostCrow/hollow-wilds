import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlayerSave, PlayerCreature, Creature } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { usePlayerStore } from "@/stores/player-store";
import { useSessionStore } from "@/stores/session-store";

import { useBattleStore } from "@/stores/battle-store";

import { generateOpponent, createPokemon, calculateMaxHp, calculateStat, generateIVs } from "@/utils/battle-logic";

// Placeholder for next step
const STARTER_POKEMON = ["Flarepib", "Verdreep", "Rivanos"] as const;

export function CharacterSelect() {
  const [playerName, setPlayerName] = useState("");
  const [playerGender, setPlayerGender] = useState<"male" | "female" | null>(
    null,
  );
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const [step, setStep] = useState<"name-gender" | "pokemon-selection">(
    "name-gender",
  );
  const [creaturesData, setCreaturesData] = useState<any[]>([]);
  const startNewGame = usePlayerStore((state) => state.startNewGame);
  const recordError = usePlayerStore((state) => state.recordError);
  const setView = useSessionStore((state) => state.setView);

  // State for persistent IVs for the 3 starters
  const [starterIVs, setStarterIVs] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/data/creatures.json")
      .then((response) => response.json())
      .then((data) => {
        setCreaturesData(data);
        // Initialize IVs
        const ivs: Record<string, any> = {};
        STARTER_POKEMON.forEach(name => {
          ivs[name] = generateIVs();
        });
        setStarterIVs(ivs);
      })
      .catch((error) => console.error("Error loading hollowings:", error));
  }, []);

  const handleReroll = () => {
    const newIVs: Record<string, any> = {};
    STARTER_POKEMON.forEach(name => {
      newIVs[name] = generateIVs();
    });
    setStarterIVs(newIVs);
  };

  const starterCreatures = creaturesData.filter((creature: any) =>
    STARTER_POKEMON.includes(creature.name),
  ) as Creature[];

  const handleNameGenderSubmit = () => {
    if (playerName.trim() && playerGender) {
      setStep("pokemon-selection");
    }
  };

  const handlePokemonSelection = (pokemonName: string) => {
    setSelectedPokemon(pokemonName);
  };

  const { startBattle } = useBattleStore(); // Import battle store

  const handleStartGame = () => {
    if (!selectedPokemon || !playerGender) return;

    const selectedCreature = starterCreatures.find(
      (c) => c.name === selectedPokemon,
    );
    if (!selectedCreature) return;

    // Use the specific IVs we generated
    const ivs = starterIVs[selectedPokemon] || generateIVs();
    const starterPokemon: PlayerCreature = createPokemon(selectedCreature.name, 5, ivs);

    const playerSave: PlayerSave = {
      version: "1.0.0",
      playerName: playerName.trim(),
      playerGender,
      money: 3000,
      badges: [],
      currentRoute: "willowfen-village",
      playerPosition: { tx: 5, ty: 5 },
      party: [starterPokemon],
      pc: [],
      bag: {
        potion: 5,
        poke_ball: 10,
      },
      flags: {},
      playtime: 0,
      pokedex: {},
    };

    try {
      startNewGame(playerSave);

      // Check if we are in Infinite Battle mode
      // NOTE: We need a way to know if we came here for "Infinite Battle" or "New Game".
      // Session store view state "character_select" implies both?
      // We can check if "previous view" or passed prop?
      // Or cleaner: MainMenu sets a flag in SessionStore `gameMode`.
      // For now, let's assume if we are creating a character, we go to Overworld usually.
      // But if user clicked "Infinite Battle", we probably want to skip overworld.
      // Let's use `useSessionStore` to check a transient flag or just default to overworld.
      // Actually, the user asked: "Allow us to choose the starter pokemon when we are starting. That will be Flarepib, Verdreep or Rivanos. We already have a starter selection screen available."
      // This implies replacing the random starter logic in "Infinite Battle" with this screen.

      const { gameMode } = useSessionStore.getState();

      if (gameMode === "infinite_battle") {
        // Initialize Battle
        const battlePlayer: any = {
          ...starterPokemon,
          sprite: selectedCreature.sprite,
          typing: selectedCreature.typing,
          base_stats: selectedCreature.base_stats,
          currentHp: starterPokemon.hp
        };
        const opponent = generateOpponent(5);

        startBattle(battlePlayer, opponent);
        setView("battle");
      } else {
        setView("overworld");
      }

    } catch (error) {
      console.error("Failed to start new game:", error);
      recordError("Unable to start new game. Please try again.");
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Fire: "bg-red-500",
      Water: "bg-blue-500",
      Plant: "bg-green-500",
      Normal: "bg-gray-500",
      Electric: "bg-yellow-500",
      Ground: "bg-amber-600",
      Dark: "bg-purple-900",
      Light: "bg-yellow-300",
      Ghost: "bg-purple-600",
      Ice: "bg-cyan-400",
      Air: "bg-sky-400",
      Toxic: "bg-purple-700",
      Metal: "bg-gray-600",
    };
    return colors[type] || "bg-gray-500";
  };

  if (step === "name-gender") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Create Your Trainer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label>Trainer Name</Label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            <div className="mb-6">
              <Label>Gender</Label>
              <ButtonGroup>
                <Button
                  onClick={() => setPlayerGender("male")}
                  variant="outline"
                  className={
                    playerGender === "male"
                      ? "bg-blue-900 text-white border-black"
                      : ""
                  }
                >
                  Male
                </Button>
                <Button
                  onClick={() => setPlayerGender("female")}
                  variant="outline"
                  className={
                    playerGender === "female"
                      ? "bg-blue-900 text-white border-black"
                      : ""
                  }
                >
                  Female
                </Button>
              </ButtonGroup>
            </div>

            <Button
              onClick={handleNameGenderSubmit}
              disabled={!playerName.trim() || !playerGender}
              variant="outline"
              className="w-full"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-between items-center px-4">
            <CardTitle>Choose Your Starter Pokémon</CardTitle>
            <Button
              onClick={handleReroll}
              variant="secondary"
              size="sm"
              className="ml-4"
            >
              🎲 Reroll Stats
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-4">
            {starterCreatures.map((creature) => {
              const ivs = starterIVs[creature.name] || { hp: 15, attack: 15, defense: 15, sp_attack: 15, sp_defense: 15, speed: 15 };
              return (
                <div
                  key={creature.name}
                  onClick={() => handlePokemonSelection(creature.name)}
                  className={`rounded-lg w-80 p-4 cursor-pointer transition-all ${selectedPokemon === creature.name
                    ? "ring-4 ring-blue-500 transform scale-105"
                    : "hover:scale-102"
                    }`}
                >
                  <div className="flex justify-center mb-4">
                    <img
                      src={`/monster/${creature.sprite}`}
                      alt={creature.name}
                      className="w-32 h-32 object-contain"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-center mb-2">
                    {creature.name}
                  </h3>

                  <div className="flex justify-center gap-2 mb-3">
                    {creature.typing.map((type) => (
                      <span
                        key={type}
                        className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm text-center">
                    <p className="mb-2">{creature.description}</p>
                    <div className="text-xs grid grid-cols-2 gap-x-2 gap-y-1">
                      <p>HP: {calculateMaxHp(creature.base_stats.hp, 5, ivs.hp)}</p>
                      <p>Atk: {calculateStat(creature.base_stats.attack, 5, ivs.attack)}</p>
                      <p>Def: {calculateStat(creature.base_stats.defense, 5, ivs.defense)}</p>
                      <p>Sp.Atk: {calculateStat(creature.base_stats.sp_attack, 5, ivs.sp_attack)}</p>
                      <p>Sp.Def: {calculateStat(creature.base_stats.sp_defense, 5, ivs.sp_defense)}</p>
                      <p>Spd: {calculateStat(creature.base_stats.speed, 5, ivs.speed)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10">
            <Button
              onClick={handleStartGame}
              disabled={!selectedPokemon}
              variant="outline"
            >
              Start Adventure!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
