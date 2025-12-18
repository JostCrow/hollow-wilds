export function getLearnableMoves(
  speciesName: string,
  currentLevel: number,
  previousLevel: number,
  currentMoves: string[],
  creaturesData: any[]
) {
  const creatureData = creaturesData.find(c => c.name === speciesName);
  if (!creatureData) return [];

  const learnableMoves = creatureData.moveset
    .filter((moveEntry: any) => {
      return moveEntry.level > previousLevel && moveEntry.level <= currentLevel;
    })
    .map((moveEntry: any) => moveEntry.move_key);

  return learnableMoves.filter((move: string) => !currentMoves.includes(move));
}

export function canLearnMove(currentMoves: string[]): boolean {
  return currentMoves.length < 4;
}

export function needsMoveReplacement(currentMoves: string[]): boolean {
  return currentMoves.length >= 4;
}