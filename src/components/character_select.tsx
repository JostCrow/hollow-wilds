import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlayerSave, PlayerCreature, Creature } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { usePlayerStore } from "@/stores/player-store";
import { useSessionStore } from "@/stores/session-store";

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

  useEffect(() => {
    fetch("/data/creatures.json")
      .then((response) => response.json())
      .then((data) => setCreaturesData(data))
      .catch((error) => console.error("Error loading creatures:", error));
  }, []);

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

  const handleStartGame = () => {
    if (!selectedPokemon || !playerGender) return;

    const selectedCreature = starterCreatures.find(
      (c) => c.name === selectedPokemon,
    );
    if (!selectedCreature) return;

    const starterPokemon: PlayerCreature = {
      id: crypto.randomUUID(),
      name: selectedCreature.name,
      species: selectedCreature.name,
      level: 5,
      experience: 0,
      hp: selectedCreature.base_stats.hp,
      maxHp: selectedCreature.base_stats.hp,
      moves: selectedCreature.moveset
        .filter((move) => move.level <= 5)
        .slice(0, 4)
        .map((move) => move.move_key),
      ability: selectedCreature.abilities[0],
      shiny: false,
    };

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
      setView("overworld");
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
          <CardTitle>Choose Your Starter Pokémon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-4">
            {starterCreatures.map((creature) => (
              <div
                key={creature.name}
                onClick={() => handlePokemonSelection(creature.name)}
                className={`rounded-lg w-80 p-4 cursor-pointer transition-all ${
                  selectedPokemon === creature.name
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
                  <div className="text-xs">
                    <p>HP: {creature.base_stats.hp}</p>
                    <p>Attack: {creature.base_stats.attack}</p>
                    <p>Defense: {creature.base_stats.defense}</p>
                    <p>Special Attack: {creature.base_stats.sp_attack}</p>
                    <p>Special Defense: {creature.base_stats.sp_defense}</p>
                    <p>Speed: {creature.base_stats.speed}</p>
                  </div>
                </div>
              </div>
            ))}
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
