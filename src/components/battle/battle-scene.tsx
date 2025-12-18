import React, { useEffect, useState } from "react";
import { useBattleStore } from "@/stores/battle-store";
import { useSessionStore } from "@/stores/session-store";
import { useGameDataStore } from "@/stores/game-data-store";
import { usePlayerStore } from "@/stores/player-store";
import { Button } from "@/components/ui/button";
import { Move } from "@/types";
import { generateOpponent, getExpForNextLevel } from "@/utils/battle-logic";
import { Badge } from "../ui/badge";

const HealthBar = ({ current, max }: { current: number; max: number }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const color =
    percentage > 50
      ? "bg-green-500"
      : percentage > 20
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="h-4 w-full bg-slate-700 rounded-full overflow-hidden border border-slate-600">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export function BattleScene() {
  const returnToMainMenu = useSessionStore((state) => state.returnToMainMenu);
  const { playerSave } = usePlayerStore();
  const {
    playerPokemon,
    opponentPokemon,
    log,
    turn,
    battlesWon,
    activePokemonIndex,
    executeMove,
    startBattle,
    flee,
    catch: tryCatch,
    pendingMoveLearning,
    learnMove,
    clearPendingMoveLearning,
  } = useBattleStore();
  const { moves, creatures } = useGameDataStore();

  const [menuState, setMenuState] = useState<
    "main" | "fight" | "pokemon" | "bag"
  >("main");

  // Auto-scroll log
  const logEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Force open Pokemon menu if current pokemon faints and we have others
  useEffect(() => {
    if (turn === "fainted") {
      setMenuState("pokemon");
    }
  }, [turn]);

  if (!playerPokemon || !opponentPokemon) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h2 className="text-xl">No active battle</h2>
        <Button onClick={returnToMainMenu} className="mt-4">
          Return to Main Menu
        </Button>
      </div>
    );
  }

  // Helper to get sprite for party members (PlayerCreature doesn't store sprite directly)
  const getSprite = (speciesName: string) => {
    const found = creatures?.find((c) => c.name === speciesName);
    return found?.sprite || "unknown.png";
  };

  const handleNextBattle = () => {
    if (!playerSave || playerSave.party.length === 0) {
      console.error("Player save missing or empty");
      return;
    }

    try {
      console.log("Starting Next Battle...");
      // Find first conscious party member if current is dead
      let nextActiveIndex = activePokemonIndex;
      if (playerPokemon.hp <= 0) {
        const firstAliveIndex = playerSave.party.findIndex((p) => p.hp > 0);
        if (firstAliveIndex !== -1) {
          nextActiveIndex = firstAliveIndex;
        } else {
          returnToMainMenu();
          return;
        }
      }

      const activeMember = playerSave.party[nextActiveIndex];
      console.log("Next Active Member:", activeMember.name);

      // Convert PlayerCreature to BattleCreature
      const battlePlayer: any = {
        ...activeMember,
        currentHp: activeMember.hp,
      };
      // Add visual props from generic data
      const baseCreature = creatures?.find(
        (c) => c.name === activeMember.species,
      );
      if (baseCreature) {
        battlePlayer.sprite = baseCreature.sprite;
        battlePlayer.typing = baseCreature.typing;
        battlePlayer.description = baseCreature.description;
        battlePlayer.base_stats = baseCreature.base_stats;
      } else {
        console.warn("Base creature not found for:", activeMember.species);
      }

      console.log("Generating Opponent...");
      const nextOpponent = generateOpponent(activeMember.level);
      console.log("Opponent Generated:", nextOpponent.name);

      startBattle(battlePlayer, nextOpponent, nextActiveIndex);
      setMenuState("main");
    } catch (e: any) {
      console.error("Failed to generate next battle", e);
      alert(`Error starting next battle: ${e.message}`);
    }
  };

  const handleHealParty = () => {
    usePlayerStore.getState().healParty();
    // Since we healed, update local state if we are between battles or just finished
    // If we are in "won" state, the next battle start will pull fresh data.
  };

  // Resolve player moves
  const playerMoves: Move[] = (playerPokemon.moves || [])
    .map((key: string) => moves?.[key])
    .filter((m): m is Move => !!m);

  const handleMoveClick = (move: Move) => {
    executeMove(move);
    setMenuState("main");
  };

  const handleSwitchPokemon = (index: number) => {
    if (!playerSave) return;
    const member = playerSave.party[index];
    if (member.hp <= 0) return; // Can't switch to fainted

    // Fetch base data for sprite/stats not in PlayerSave
    const baseCreature = creatures?.find((c) => c.name === member.species);

    const battlePlayer: any = {
      ...member,
      currentHp: member.hp,
      sprite: baseCreature?.sprite, // Add sprite
      typing: baseCreature?.typing || [],
      base_stats: baseCreature?.base_stats,
    };

    const wasFainted = turn === "fainted";

    // Manual override for Switch (hacky but works for now without new store action)
    useBattleStore.setState((state) => ({
      ...state,
      playerPokemon: battlePlayer,
      activePokemonIndex: index,
      turn: wasFainted ? "player" : "opponent", // If fainted, new mon gets to move. If switch, lose turn.
      log: [...state.log, `Go! ${member.name}!`],
    }));

    // If it wasn't a forced switch, trigger opponent turn
    // If it WAS a forced switch, it's now player's turn to choose a move.
    if (!wasFainted) {
      setTimeout(() => useBattleStore.getState().opponentTurn(), 1000);
    }

    setMenuState("main");
  };

  const handleFightClick = () => setMenuState("fight");
  const handlePokemonClick = () => setMenuState("pokemon");
  const handleBagClick = () => setMenuState("bag");
  const handleRunClick = () => {
    flee();
    setTimeout(handleNextBattle, 1500);
  };

  // Simple item handlers for now
  const handleUsePotion = () => {
    const potion: any = { name: "Potion", effect: { hp_restore: 20 } };
    useBattleStore.getState().useItem(potion);
    setMenuState("main");
  };

  const handleUsePokeball = () => {
    tryCatch();
    setMenuState("main");
  };

  const getCategoryColor = (category?: string) => {
    return category === "physical"
      ? "bg-orange-600"
      : category === "special"
        ? "bg-blue-600"
        : "bg-gray-500";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Fire: "bg-red-500",
      Water: "bg-blue-500",
      Plant: "bg-green-500",
      Normal: "bg-gray-500",
      Electric: "bg-yellow-500",
      Ghost: "bg-purple-600",
      Ice: "bg-cyan-400",
      Air: "bg-sky-400",
      Toxic: "bg-purple-700",
      Ground: "bg-amber-600",
    };
    return colors[type] || "bg-slate-600";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-800 text-white font-sans select-none">
      {/* Turn Indicator / Overlays */}
      {["won", "caught", "ended"].includes(turn) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 gap-6 animate-in fade-in duration-300">
          <div
            className={`text-5xl font-bold ${turn === "won" ? "text-yellow-400" : turn === "caught" ? "text-blue-400" : "text-white"}`}
          >
            {turn === "won"
              ? "VICTORY!"
              : turn === "caught"
                ? "CAUGHT!"
                : "ESCAPED"}
          </div>
          {/* XP / Level Up Messages are in the log, we could show them here too */}

          {/* Healing Option every 5 wins */}
          {turn === "won" && battlesWon > 0 && battlesWon % 5 === 0 && (
            <div className="flex flex-col gap-2 items-center">
              <span className="text-green-400 font-bold text-lg">
                Win Streak: {battlesWon}
              </span>
              <Button
                onClick={handleHealParty}
                className="bg-green-600 hover:bg-green-700 text-xl px-8 py-4"
              >
                Rest & Heal Party
              </Button>
            </div>
          )}

          <Button onClick={handleNextBattle} className="text-xl px-8 py-6">
            Next Battle
          </Button>
          <Button
            onClick={returnToMainMenu}
            variant="outline"
            className="text-lg"
          >
            Return to Menu
          </Button>
        </div>
      )}
      {turn === "lost" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 gap-6 text-red-500 animate-in fade-in duration-500">
          <div className="text-5xl font-bold">DEFEATED...</div>
          <Button
            onClick={returnToMainMenu}
            variant="destructive"
            className="text-xl px-8 py-6"
          >
            Return to Main Menu
          </Button>
        </div>
      )}

      {/* Move Learning Modal */}
      {pendingMoveLearning && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-in fade-in duration-300">
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">
              Learn New Move!
            </h3>

            <div className="mb-4">
              <p className="text-center text-white mb-2">
                {playerSave?.party[pendingMoveLearning.pokemonIndex].name} wants
                to learn a new move!
              </p>
              <div className="bg-slate-700 p-3 rounded-lg text-center">
                <p className="text-blue-400 font-bold text-lg">
                  {moves?.[pendingMoveLearning.newMove]?.name ||
                    pendingMoveLearning.newMove}
                </p>
                <p className="text-sm opacity-70 mt-1">
                  Type:{" "}
                  {moves?.[pendingMoveLearning.newMove]?.type || "Unknown"} |
                  Power: {moves?.[pendingMoveLearning.newMove]?.power || "-"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-center text-red-400 mb-2">
                Moveset is full! Choose a move to forget:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingMoveLearning.moveOptions.map((moveKey, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      learnMove(pendingMoveLearning.newMove, index)
                    }
                    className="w-full p-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-left flex justify-between items-center transition-colors"
                  >
                    <span className="font-bold">
                      {moves?.[moveKey]?.name || moveKey}
                    </span>
                    <span className="text-xs opacity-70">
                      {moves?.[moveKey]?.type} |{" "}
                      {moves?.[moveKey]?.power || "-"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearPendingMoveLearning}
                className="flex-1 bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
              >
                Don't Learn
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-[url('/assets/backgrounds/battle-bg.png')] bg-cover bg-center">
        {/* Opponent (Top Right) */}
        <div className="absolute top-10 right-10 flex gap-4 items-end">
          <div className="flex flex-col items-end bg-slate-900/80 p-4 rounded-xl shadow-lg w-64">
            <div className="flex justify-between w-full mb-1">
              <span className="font-bold text-lg">{opponentPokemon.name}</span>
              <span className="text-sm text-gray-300">
                Lv.{opponentPokemon.level}
              </span>
            </div>
            {/* Opponent Type Display */}
            <div className="flex gap-1 mb-1">
              {opponentPokemon.typing.map((t) => (
                <Badge key={t} className={getTypeColor(t)}>
                  {t}
                </Badge>
              ))}
            </div>

            <HealthBar
              current={opponentPokemon.hp || 0}
              max={opponentPokemon.maxHp || 20}
            />
            <span className="text-xs text-gray-300 mt-1">
              {Math.ceil(opponentPokemon.hp)} / {opponentPokemon.maxHp}
            </span>
          </div>
          <img
            src={
              opponentPokemon.sprite
                ? `/assets/monster/${opponentPokemon.sprite}`
                : "/assets/monster/unknown.png"
            }
            alt={opponentPokemon.name}
            className={`w-48 h-48 object-contain scale-x-[-1] drop-shadow-2xl transition-opacity duration-300 animate-float`}
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Player (Bottom Left) */}
        <div className="absolute bottom-10 left-10 flex gap-4 items-end">
          <img
            src={
              playerPokemon.sprite
                ? `/assets/monster/${playerPokemon.sprite}`
                : "/assets/monster/unknown.png"
            }
            alt={playerPokemon.name}
            className={`w-56 h-56 object-contain drop-shadow-2xl transition-opacity duration-300 animate-float`}
            style={{ imageRendering: "pixelated" }}
          />
          <div className="flex flex-col items-start bg-slate-900/80 p-4 rounded-xl shadow-lg w-64">
            <div className="flex justify-between w-full mb-1">
              <span className="font-bold text-lg">{playerPokemon.name}</span>
              <span className="text-sm text-gray-300">
                Lv.{playerPokemon.level}
              </span>
            </div>

            <div className="flex gap-1 mb-1">
              {playerPokemon.typing.map((t) => (
                <Badge key={t} className={getTypeColor(t)}>
                  {t}
                </Badge>
              ))}
            </div>

            <HealthBar
              current={playerPokemon.hp || 0}
              max={playerPokemon.maxHp || 20}
            />
            <span className="text-xs text-gray-300 mt-1">
              {Math.floor(playerPokemon.hp)} / {playerPokemon.maxHp}
            </span>
            <div className="w-full text-right text-xs text-blue-300 mt-1">
              Exp: {playerPokemon.experience}/
              {getExpForNextLevel(playerPokemon.level)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="h-60 bg-slate-900 border-t-4 border-slate-700 flex">
        {/* Log */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm border-r border-slate-700 bg-black/20">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">
              {entry}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Action Menu */}
        <div className="w-1/2 p-4 grid grid-cols-2 gap-4">
          {menuState === "main" ? (
            <>
              <Button
                onClick={handleFightClick}
                className="bg-red-600 hover:bg-red-700 h-full text-xl font-bold rounded-xl"
                disabled={turn !== "player"}
              >
                FIGHT
              </Button>
              <Button
                onClick={handleBagClick}
                className="bg-yellow-600 hover:bg-yellow-700 h-full text-xl font-bold rounded-xl"
                disabled={turn !== "player"}
              >
                BAG
              </Button>
              <Button
                onClick={handlePokemonClick}
                className="bg-green-600 hover:bg-green-700 h-full text-xl font-bold rounded-xl"
                disabled={turn !== "player"}
              >
                POKEMON
              </Button>
              <Button
                onClick={handleRunClick}
                className="bg-blue-600 hover:bg-blue-700 h-full text-xl font-bold rounded-xl"
                disabled={turn !== "player"}
              >
                RUN
              </Button>
              <Button
                onClick={() => returnToMainMenu()}
                className="col-span-2 bg-gray-600 hover:bg-gray-500 h-10 mt-auto"
              >
                Stop Fighting
              </Button>
            </>
          ) : menuState === "fight" ? (
            <>
              {playerMoves.map((move, i) => (
                <Button
                  key={i}
                  onClick={() => handleMoveClick(move)}
                  className="bg-slate-700 hover:bg-slate-600 h-full flex flex-col items-start p-2 relative"
                  disabled={move.uses <= 0}
                >
                  <div className="flex justify-between w-full">
                    <span className="font-bold">{move.name}</span>
                    <div className="flex gap-2">
                      <Badge className={getCategoryColor(move.category)}>
                        {move.category}
                      </Badge>
                      <Badge className={getTypeColor(move.type)}>
                        {move.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between w-full text-xs opacity-70 mt-1">
                    <span>Power: {move.power || "-"}</span>
                    <span className={move.uses === 0 ? "text-red-400" : ""}>
                      {move.uses}/{move.max_uses} PP
                    </span>
                  </div>
                </Button>
              ))}
              <Button
                onClick={() => setMenuState("main")}
                className="col-span-2 bg-gray-600 hover:bg-gray-500 h-10 mt-auto"
              >
                Cancel
              </Button>
            </>
          ) : menuState === "bag" ? (
            // Bag Menu
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <Button
                onClick={handleUsePotion}
                className="bg-blue-600 hover:bg-blue-700 h-full text-xl flex flex-col gap-1"
              >
                <span className="font-bold">Potion</span>
                <span className="text-xs opacity-80">Heal 20 HP</span>
              </Button>
              <Button
                onClick={handleUsePokeball}
                className="bg-red-600 hover:bg-red-700 h-full text-xl flex flex-col gap-1"
              >
                <span className="font-bold">Pokéball</span>
                <span className="text-xs opacity-80">Catch Rate x1.0</span>
              </Button>
              <Button
                onClick={() => setMenuState("main")}
                className="col-span-2 bg-gray-600 hover:bg-gray-500 h-10 mt-auto"
              >
                Cancel
              </Button>
            </div>
          ) : (
            // Pokemon Selection Menu
            <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto">
              {playerSave?.party.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    idx !== activePokemonIndex && handleSwitchPokemon(idx)
                  }
                  className={`p-2 rounded flex justify-between items-center ${idx === activePokemonIndex ? "bg-slate-600 border border-green-400" : "bg-slate-700 hover:bg-slate-600 cursor-pointer"}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`/assets/monster/${getSprite(p.species)}`}
                      className="w-8 h-8 object-contain animate-float"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold">{p.name}</span>
                      <span className="text-xs">Lv.{p.level}</span>
                    </div>
                  </div>
                  <div className="w-24">
                    <HealthBar current={p.hp} max={p.maxHp} />
                    <div className="text-xs text-right opacity-70">
                      {p.hp}/{p.maxHp}
                    </div>
                  </div>
                </div>
              ))}
              {turn !== "fainted" && (
                <Button
                  onClick={() => setMenuState("main")}
                  className="bg-gray-600 hover:bg-gray-500 h-8 mt-auto"
                >
                  Back
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
