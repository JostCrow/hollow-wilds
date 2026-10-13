import { 
  Position, 
  TilePosition, 
  ProcessedMap, 
  RouteData,
  Exit,
  NPC,
  MapObject,
  TILE_DEFINITIONS 
} from '@/types/game';

export function pixelsToTiles(pixels: Position, tileSize: number): TilePosition {
  return {
    tx: Math.floor(pixels.x / tileSize),
    ty: Math.floor(pixels.y / tileSize)
  };
}

export function tilesToPixels(tiles: TilePosition, tileSize: number): Position {
  return {
    x: tiles.tx * tileSize,
    y: tiles.ty * tileSize
  };
}

export function getTileCenter(tiles: TilePosition, tileSize: number): Position {
  return {
    x: tiles.tx * tileSize + tileSize / 2,
    y: tiles.ty * tileSize + tileSize / 2
  };
}

export function processTileMap(routeData: RouteData): ProcessedMap {
  const { tiles, tileSize } = routeData;
  const width = tiles.map[0]?.length || 0;
  const height = tiles.map.length;

  const collisionMap: boolean[][] = [];
  const encounterMap: boolean[][] = [];
  const exitMap: (string | null)[][] = [];
  const groundTypeMap: string[][] = [];

  for (let y = 0; y < height; y++) {
    collisionMap[y] = [];
    encounterMap[y] = [];
    exitMap[y] = [];
    groundTypeMap[y] = [];

    const row = tiles.map[y];
    for (let x = 0; x < width; x++) {
      const tileChar = row[x];
      const tileType = tiles.legend[tileChar];
      const properties = tileType ? TILE_DEFINITIONS[tileType] : null;

      collisionMap[y][x] = properties?.blocks || false;
      encounterMap[y][x] = properties?.triggersEncounter || false;
      exitMap[y][x] = properties?.isExit ? 'exit' : null;
      groundTypeMap[y][x] = properties?.type || 'unknown';
    }
  }

  return {
    width,
    height,
    tileSize,
    collisionMap,
    encounterMap,
    exitMap,
    groundTypeMap,
    tileProperties: TILE_DEFINITIONS
  };
}

export function isValidPosition(
  tx: number, 
  ty: number, 
  map: ProcessedMap
): boolean {
  return tx >= 0 && tx < map.width && ty >= 0 && ty < map.height;
}

export function isBlocked(
  tx: number, 
  ty: number, 
  map: ProcessedMap,
  objects: MapObject[],
  npcs: NPC[]
): boolean {
  if (!isValidPosition(tx, ty, map)) {
    return true;
  }

  // Check tile collision
  if (map.collisionMap[ty][tx]) {
    return true;
  }

  // Check object collision
  for (const obj of objects) {
    if (obj.blocks && obj.layer !== 'below') {
      if (tx >= obj.tx && tx < obj.tx + obj.w &&
          ty >= obj.ty && ty < obj.ty + obj.h) {
        return true;
      }
    }
  }

  // Check NPC collision
  for (const npc of npcs) {
    if (npc.position.tx === tx && npc.position.ty === ty) {
      return true;
    }
  }

  return false;
}

export function findExitAt(
  tx: number,
  ty: number,
  exits: Exit[]
): Exit | null {
  for (const exit of exits) {
    const { area } = exit;
    if (tx >= area.tx && tx < area.tx + area.w &&
        ty >= area.ty && ty < area.ty + area.h) {
      return exit;
    }
  }
  return null;
}

export function shouldTriggerEncounter(
  tx: number,
  ty: number,
  map: ProcessedMap
): boolean {
  if (!isValidPosition(tx, ty, map)) {
    return false;
  }
  return map.encounterMap[ty][tx];
}

export function getGroundType(
  tx: number,
  ty: number,
  map: ProcessedMap
): string {
  if (!isValidPosition(tx, ty, map)) {
    return 'unknown';
  }
  return map.groundTypeMap[ty][tx];
}

export function getTileProperty(
  tileChar: string,
  legend: Record<string, string>
): typeof TILE_DEFINITIONS[keyof typeof TILE_DEFINITIONS] | null {
  const tileType = legend[tileChar];
  if (!tileType) return null;
  return TILE_DEFINITIONS[tileType] || null;
}

export function clampCamera(
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  const maxX = Math.max(0, mapWidth - viewportWidth);
  const maxY = Math.max(0, mapHeight - viewportHeight);

  return {
    x: Math.max(0, Math.min(cameraX, maxX)),
    y: Math.max(0, Math.min(cameraY, maxY))
  };
}

export function calculateCameraPosition(
  playerX: number,
  playerY: number,
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  // Center the camera on the player
  let cameraX = playerX - viewportWidth / 2;
  let cameraY = playerY - viewportHeight / 2;

  // Clamp to map bounds
  return clampCamera(cameraX, cameraY, viewportWidth, viewportHeight, mapWidth, mapHeight);
}
