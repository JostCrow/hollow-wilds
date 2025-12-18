import { create } from "zustand";
import { Move, Item, BattleCreature } from "@/types";
import { calculateDamage, getBattleStat, getTypeEffectiveness, calculateMaxHp } from "@/utils/battle-logic";
import { getLearnableMoves, canLearnMove } from "@/utils/move-learning";
import { checkForEvolution, evolvePokemon } from "@/utils/evolution";
import { useGameDataStore } from "@/stores/game-data-store";
import { usePlayerStore } from "@/stores/player-store";

export type BattleTurn = "player" | "opponent" | "animating" | "ended" | "won" | "lost" | "caught" | "fainted";

export type BattleState = {
    playerPokemon: BattleCreature | null;
    opponentPokemon: BattleCreature | null;
    turn: BattleTurn;
    log: string[];
    battlesWon: number;
    activePokemonIndex: number;
    pendingMoveLearning: { pokemonIndex: number; newMove: string; moveOptions: string[] } | null;

    startBattle: (player: BattleCreature, opponent: BattleCreature, activeIndex?: number) => void;
    executeMove: (move: Move) => void;
    opponentTurn: () => void;
    useItem: (item: Item) => void;
    flee: () => void;
    catch: () => void;
    gainExperience: () => void;
    learnMove: (newMove: string, replaceMoveIndex?: number) => void;
    clearPendingMoveLearning: () => void;
};

export const useBattleStore = create<BattleState>((set, get) => ({
    playerPokemon: null,
    opponentPokemon: null,
    turn: "ended",
    log: [],
    battlesWon: 0,
    activePokemonIndex: 0,
    pendingMoveLearning: null,

    startBattle: (player, opponent, activeIndex = 0) => {
        set({
            playerPokemon: { ...player },
            opponentPokemon: { ...opponent },
            turn: "player",
            log: [`Battle started between ${player.name} and ${opponent.name}!`],
            activePokemonIndex: activeIndex,
        });
    },

    gainExperience: () => {
        const { playerPokemon, opponentPokemon, activePokemonIndex } = get();
        if (!playerPokemon || !opponentPokemon) return;

        // Calculate factors
        const opponentLevel = opponentPokemon.level;
        const opponentBST = opponentPokemon.base_stats.total;

        // Difficulty Multiplier based on Type Advantage (Opponent vs Player)
        // If Opponent has type advantage over Player, Difficulty is HIGHER -> More XP
        // If Opponent is resisted by Player, Difficulty is LOWER -> Less XP
        let maxEffectiveness = 0;
        opponentPokemon.typing.forEach(type => {
            // Check this type attacking the player
            const eff = getTypeEffectiveness(type, playerPokemon.typing);
            if (eff > maxEffectiveness) maxEffectiveness = eff;
        });

        let difficultyMult = 1.0;
        if (maxEffectiveness > 1) difficultyMult = 1.5; // Hard fight
        if (maxEffectiveness < 1 && maxEffectiveness > 0) difficultyMult = 0.8; // Easy fight

        // Base XP Calculation: (Opponent Level * BST) / 7
        const rawBaseXP = (opponentLevel * opponentBST) / 7;
        const adjustedBaseXP = rawBaseXP * difficultyMult;

        const { playerSave, updatePartyMember } = usePlayerStore.getState();
        if (!playerSave) return;

        const messages: string[] = [];

        // Distribute to Party
        playerSave.party.forEach((member, index) => {
            if (member.hp <= 0 && index !== activePokemonIndex) return; // Fainted bench members don't get XP usually? Let's say yes for now. Or standard is NO.
            // Let's assume fainted pokemon DON'T get XP.
            if (member.hp <= 0) return;

            // Share Multiplier
            // Active Pokemon gets 100%, Bench gets 50%
            const isParticipant = index === activePokemonIndex;
            const shareMult = isParticipant ? 1.0 : 0.5;

            // Level Scaling: Lower levels get MORE XP
            // Formula: ((2 * OppLevel + 10) / (OppLevel + MemberLevel + 10)) ^ 2.5
            const levelScale = Math.pow((2 * opponentLevel + 10) / (opponentLevel + member.level + 10), 2.5);

            const finalXP = Math.floor(adjustedBaseXP * shareMult * levelScale);

            // Apply XP
            let newExp = member.experience + finalXP;
            let newLevel = member.level;
            let leveledUp = false;

            // Level Up?
            const previousLevel = member.level;
            while (true) {
                // Base 20. Exp needed scales by 1.6 per level.
                // Lv 1->2: 20 * 1.6^0 = 20
                // Lv 2->3: 20 * 1.6^1 = 32
                // Lv 3->4: 20 * 1.6^2 = 51
                // Lv 4->5: 20 * 1.6^3 = 82
                // Lv 5->6: 20 * 1.6^4 = 131
                // Lv 6->7: 20 * 1.6^5 = 210
                const expNeeded = Math.floor(20 * Math.pow(1.6, newLevel - 1));

                if (newExp >= expNeeded) {
                    newExp -= expNeeded;
                    newLevel++;
                    leveledUp = true;
                } else {
                    break;
                }
            }

            // Check for learnable moves after leveling up
            let learnedMoves: string[] = [];

            if (finalXP > 0) {
                let msg = `${member.name} gained ${finalXP} EXP!`;
                if (leveledUp) msg += ` Grown to Lv.${newLevel}!`;
                messages.push(msg);
                
                // Add move learning messages
                learnedMoves.forEach(moveKey => {
                    const { moves } = useGameDataStore.getState();
                    const moveData = moves?.[moveKey];
                    const moveName = moveData?.name || moveKey;
                    messages.push(`${member.name} learned ${moveName}!`);
                });
            }

            // Handle Stat Updates
            let newMaxHp = member.maxHp;
            let currentHp = member.hp;
            if (leveledUp) {
                const { creatures } = useGameDataStore.getState();
                const baseData = creatures?.find(c => c.name === member.species);
                if (baseData) {
                    const hpIV = member.ivs ? member.ivs.hp : 0;
                    newMaxHp = calculateMaxHp(baseData.base_stats.hp, newLevel, hpIV);
                    currentHp += (newMaxHp - member.maxHp);
                }
            }

            // Check for evolution and moves after leveling up
            if (leveledUp && newLevel > previousLevel) {
                const { creatures } = useGameDataStore.getState();
                
                // Check for evolution first
                const evolutionCheck = checkForEvolution(member, creatures || []);
                
                if (evolutionCheck.canEvolve && evolutionCheck.evolvesTo) {
                    const oldSpecies = member.species;
                    member = evolvePokemon(member, evolutionCheck.evolvesTo, creatures || []);
                    messages.push(`${member.species} evolved from ${oldSpecies}!`);
                    
                    // Recalculate max HP after evolution
                    const evolvedBaseData = creatures?.find(c => c.name === member.species);
                    if (evolvedBaseData) {
                        const hpIV = member.ivs ? member.ivs.hp : 0;
                        newMaxHp = calculateMaxHp(evolvedBaseData.base_stats.hp, newLevel, hpIV);
                        currentHp = Math.min(currentHp, newMaxHp); // Don't exceed new max HP
                    }
                }
                
                // Check for learnable moves
                const learnableMoves = getLearnableMoves(member.species, newLevel, previousLevel, member.moves, creatures || []);
                
                for (const moveKey of learnableMoves) {
                    if (canLearnMove(member.moves)) {
                        member.moves.push(moveKey);
                        learnedMoves.push(moveKey);
                    } else {
                        // Pokemon has full moveset, need to choose replacement
                        set(state => ({
                            ...state,
                            pendingMoveLearning: {
                                pokemonIndex: index,
                                newMove: moveKey,
                                moveOptions: member.moves
                            }
                        }));
                    }
                }
            }

            // Update Store
            updatePartyMember(index, {
                level: newLevel,
                experience: newExp,
                hp: currentHp,
                maxHp: newMaxHp,
                moves: member.moves,
                species: member.species
            });

            // If this is the active pokemon, simplify the local state update too so UI reflects it immediately
            if (isParticipant) {
                set(state => ({
                    playerPokemon: {
                        ...state.playerPokemon!,
                        level: newLevel,
                        experience: newExp,
                        hp: currentHp,
                        maxHp: newMaxHp
                    }
                }));
            }
        });

        set(state => ({
            log: [...state.log, ...messages]
        }));
    },

    executeMove: (move) => {
        const { playerPokemon, opponentPokemon, turn } = get();
        if (turn !== "player" || !playerPokemon || !opponentPokemon) return;

        // Check PP
        if (move.uses <= 0) {
            set(state => ({ log: [...state.log, `${move.name} has no PP left!`] }));
            return;
        }

        set({ turn: "animating" });

        // Calculate Speeds
        const playerSpeed = getBattleStat(playerPokemon, "speed");
        const opponentSpeed = getBattleStat(opponentPokemon, "speed");

        // Speed check: Player moves first if Speed >= Opponent Speed
        // (Simplified tie-breaker: Player wins ties)
        const playerMovesFirst = playerSpeed >= opponentSpeed;

        const executePlayerAttack = () => {
            const { opponentPokemon: currentOpponent } = get();
            if (!currentOpponent || currentOpponent.hp <= 0) return; // Opponent already dead

            const result = calculateDamage(playerPokemon, currentOpponent, move);
            const damage = result.damage;
            const newOpponentHp = Math.max(0, currentOpponent.hp - damage);

            let logMsg = `${playerPokemon.name} used ${move.name}! Dealt ${damage} damage.`;
            if (result.isCritical) logMsg += " Critical Hit!";
            if (result.effectiveness > 1) logMsg += " It's super effective!";
            if (result.effectiveness < 1 && result.effectiveness > 0) logMsg += " It's not very effective...";
            if (result.effectiveness === 0) logMsg += " It had no effect!";

            set((state) => ({
                log: [...state.log, logMsg],
                opponentPokemon: state.opponentPokemon ? { ...state.opponentPokemon, hp: newOpponentHp } : null
            }));

            if (newOpponentHp <= 0) {
                handleWin();
            }
        };

        const executeOpponentAttack = () => {
            const { playerPokemon: currentPlayer, opponentPokemon: currentOpponent, activePokemonIndex } = get();
            // Check if battle already ended (player won)
            if (get().turn === "won") return;
            if (!currentPlayer || currentPlayer.hp <= 0) return; // Player already dead
            if (!currentOpponent || currentOpponent.hp <= 0) return; // Opponent is dead, can't move

            const { moves } = useGameDataStore.getState();
            const moveKeys = currentOpponent.moves || [];
            const availableMoves = moveKeys.map((key: string) => moves?.[key]).filter((m): m is Move => !!m);

            const opMove = availableMoves.length > 0
                ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
                : { name: "Struggle", power: 40, type: "Normal", category: "physical" } as Move;

            const result = calculateDamage(currentOpponent, currentPlayer, opMove);
            const damage = result.damage;
            const newPlayerHp = Math.max(0, currentPlayer.hp - damage);

            let logMsg = `(Speed ${opponentSpeed}) ${currentOpponent.name} used ${opMove.name}! Dealt ${damage} damage.`;
            if (result.isCritical) logMsg += " Critical Hit!";
            if (result.effectiveness > 1) logMsg += " It's super effective!";

            set((state) => ({
                log: [...state.log, logMsg],
                playerPokemon: state.playerPokemon ? { ...state.playerPokemon, hp: newPlayerHp } : null
            }));

            // Sync HP
            const { updatePartyMember } = usePlayerStore.getState();
            updatePartyMember(activePokemonIndex, { hp: newPlayerHp });

            if (newPlayerHp <= 0) {
                handleFaint();
            }
        };

        const handleWin = () => {
            const { opponentPokemon: faintedOpponent } = get();
            if (!faintedOpponent) return;

            // Gain XP (Calculation handles details)
            get().gainExperience();

            // Sync final HP state
            const { updatePartyMember } = usePlayerStore.getState();
            const { playerPokemon: finalPlayer, activePokemonIndex } = get();
            if (finalPlayer) {
                updatePartyMember(activePokemonIndex, { hp: finalPlayer.hp });
            }

            set((state) => ({
                turn: "won",
                log: [...state.log, `${faintedOpponent.name} fainted! You won!`],
                battlesWon: state.battlesWon + 1
            }));
        };

        const handleFaint = () => {
            const { playerPokemon } = get();
            set((state) => ({ log: [...state.log, `${playerPokemon?.name} fainted!`] }));

            // Check if there are other pokemon
            const { playerSave } = usePlayerStore.getState();
            const hasSurvivors = playerSave?.party.some(p => p.hp > 0);

            if (hasSurvivors) {
                set({ turn: "fainted" });
            } else {
                set({ turn: "lost", log: [...get().log, "You have no more Pokemon!"] });
            }
        };

        // Execution Flow
        if (playerMovesFirst) {
            executePlayerAttack();
            // If opponent still alive, they attack
            if (get().turn !== "won") {
                setTimeout(() => {
                    executeOpponentAttack();
                    // Reset turn to player if not lost or fainted
                    const currentTurn = get().turn;
                    if (currentTurn !== "lost" && currentTurn !== "fainted") {
                        set({ turn: "player" });
                    }
                }, 1000);
            }
        } else {
            // Opponent moves first
            set(state => ({ log: [...state.log, `Opponent is faster! (Speed ${opponentSpeed} vs ${playerSpeed})`] }));

            // Immediate opponent attack for flow (or small delay?)
            setTimeout(() => {
                executeOpponentAttack();

                // If player still alive and not fainted, player attacks
                const currentTurn = get().turn;
                if (currentTurn !== "lost" && currentTurn !== "fainted") {
                    setTimeout(() => {
                        executePlayerAttack();
                        // Reset turn to player if not won
                        if (get().turn !== "won") {
                            set({ turn: "player" });
                        }
                    }, 1000);
                }
            }, 500);
        }
    },

    opponentTurn: () => {
        const { playerPokemon, opponentPokemon, turn, activePokemonIndex } = get();
        if (turn === "won" || turn === "lost" || turn === "fainted" || !playerPokemon || !opponentPokemon) return;

        set({ turn: "opponent" });

        const { moves } = useGameDataStore.getState();
        const moveKeys = opponentPokemon.moves || [];
        const availableMoves = moveKeys.map((key: string) => moves?.[key]).filter((m): m is Move => !!m);

        const move = availableMoves.length > 0
            ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
            : { name: "Struggle", power: 40, type: "Normal", category: "physical" } as Move;

        const result = calculateDamage(opponentPokemon, playerPokemon, move);
        const damage = result.damage;
        const newPlayerHp = Math.max(0, playerPokemon.hp - damage);

        let logMsg = `${opponentPokemon.name} used ${move.name}! Dealt ${damage} damage.`;
        if (result.isCritical) logMsg += " Critical Hit!";
        if (result.effectiveness > 1) logMsg += " It's super effective!";
        if (result.effectiveness < 1 && result.effectiveness > 0) logMsg += " It's not very effective...";
        if (result.effectiveness === 0) logMsg += " It had no effect!";

        set((state) => ({
            log: [...state.log, logMsg],
            playerPokemon: state.playerPokemon ? { ...state.playerPokemon, hp: newPlayerHp } : null
        }));

        // Sync HP to PlayerStore immediately
        const { updatePartyMember } = usePlayerStore.getState();
        updatePartyMember(activePokemonIndex, { hp: newPlayerHp });

        if (newPlayerHp <= 0) {
            const { playerSave } = usePlayerStore.getState();
            const hasSurvivors = playerSave?.party.some(p => p.hp > 0);
            if (hasSurvivors) {
                set({
                    log: [...get().log, `${playerPokemon.name} fainted!`],
                    turn: "fainted"
                });
            } else {
                set((state) => ({
                    log: [...state.log, `${playerPokemon.name} fainted! You lost...`],
                    turn: "lost"
                }));
            }
        } else {
            set({ turn: "player" });
        }
    },

    useItem: (item) => {
        const { playerPokemon, turn } = get();
        if (turn !== "player" || !playerPokemon) return;

        set((state) => ({
            log: [...state.log, `Used ${item.name}!`],
            turn: "animating"
        }));

        // Heal logic
        const healAmount = item.effect.hp_restore || 0;
        if (healAmount > 0) {
            const newHp = Math.min(playerPokemon.maxHp, playerPokemon.hp + healAmount);
            set((state) => ({
                playerPokemon: state.playerPokemon ? { ...state.playerPokemon, hp: newHp } : null
            }));
        }

        setTimeout(() => {
            get().opponentTurn();
        }, 1000);
    },

    flee: () => {
        set((state) => ({
            log: [...state.log, "You ran away safely!"],
            turn: "ended"
        }));
    },

    catch: () => {
        const { opponentPokemon, turn } = get();
        if (turn !== "player" || !opponentPokemon) return;

        set((state) => ({
            log: [...state.log, "You threw a Pokeball!"],
            turn: "animating"
        }));

        const maxHp = opponentPokemon.maxHp || 20;
        const currentHp = opponentPokemon.hp;
        const catchRate = ((3 * maxHp - 2 * currentHp) * 1) / (3 * maxHp) * 255;

        const success = Math.random() * 255 < catchRate;

        setTimeout(() => {
            if (success) {
                set((state) => ({
                    log: [...state.log, `Gotcha! ${opponentPokemon.name} was caught!`],
                    turn: "caught"
                }));
                // Persist Code
                usePlayerStore.getState().catchPokemon(opponentPokemon);
            } else {
                set((state) => ({
                    log: [...state.log, `Darn! The Pokemon broke free!`],
                }));
                // Use simplified opponent turn flow since executeMove now handles complex turns
                // Or just call the old opponentTurn which we still need for this fallback?
                // The loop in executeMove is self-contained. `catch` is a separate action.
                // We should probably just call opponentTurn() here.
                get().opponentTurn();
            }
        }, 1000);
    },

    learnMove: (newMove: string, replaceMoveIndex?: number) => {
        const { pendingMoveLearning } = get();
        if (!pendingMoveLearning) return;

        const { updatePartyMember } = usePlayerStore.getState();
        const { playerSave } = usePlayerStore.getState();
        if (!playerSave) return;

        const pokemon = playerSave.party[pendingMoveLearning.pokemonIndex];
        let newMoves = [...pokemon.moves];

        if (replaceMoveIndex !== undefined) {
            newMoves[replaceMoveIndex] = newMove;
        } else {
            newMoves.push(newMove);
        }

        updatePartyMember(pendingMoveLearning.pokemonIndex, { moves: newMoves });

        set(state => {
            const { moves } = useGameDataStore.getState();
            const moveData = moves?.[newMove];
            const moveName = moveData?.name || newMove;
            const replaceMoveName = replaceMoveIndex !== undefined ? 
                (moves?.[pokemon.moves[replaceMoveIndex]]?.name || pokemon.moves[replaceMoveIndex]) : null;
            
            let message = `${pokemon.name} learned ${moveName}!`;
            if (replaceMoveName) {
                message = `${pokemon.name} forgot ${replaceMoveName} and learned ${moveName}!`;
            }

            return {
                ...state,
                log: [...state.log, message],
                pendingMoveLearning: null
            };
        });
    },

    clearPendingMoveLearning: () => {
        set({ pendingMoveLearning: null });
    },
}));
