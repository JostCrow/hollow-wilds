import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, PlayerSave } from '@/types';
import { Direction, TilePosition, RouteData } from '@/types/game';
import { usePlayerStore } from '@/stores/player-store';
import { useWorldStore } from '@/stores/world-store';
import { useTileMap } from '@/hooks/useTileMap';
import { usePlayer } from '@/hooks/usePlayer';
import { useCamera } from '@/hooks/useCamera';
import { useInput } from '@/hooks/useInput';
import { GameViewport } from '@/components/overworld/GameViewport';
import { TileMap } from '@/components/overworld/TileMap';
import { Player } from '@/components/overworld/Player';
import { NPCs } from '@/components/overworld/NPCs';
import { TILE_DEFINITIONS } from '@/types/game';

interface OverworldProps {
  routes: Routes;
  playerSave: PlayerSave;
}

export const Overworld: React.FC<OverworldProps> = ({ routes, playerSave }) => {
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [currentRouteData, setCurrentRouteData] = useState<RouteData | null>(null);
  const [spawnPosition, setSpawnPosition] = useState<TilePosition>({ tx: 0, ty: 0 });
  const hasInitializedSpawn = useRef<string | null>(null);
  
  const pendingSpawn = useWorldStore((state) => state.pendingSpawn);
  const setPendingSpawn = useWorldStore((state) => state.setPendingSpawn);
  const clearPendingSpawn = useWorldStore((state) => state.clearPendingSpawn);
  const movementLocked = useWorldStore((state) => state.isMovementLocked);
  const lockMovement = useWorldStore((state) => state.lockMovement);
  const unlockMovement = useWorldStore((state) => state.unlockMovement);
  const updatePlayerPosition = usePlayerStore((state) => state.updatePlayerPosition);

  // Load current route
  useEffect(() => {
    const route = routes.routes.find((r) => r.key === playerSave.currentRoute);
    setCurrentRoute(route ?? null);
    
    if (route) {
      // Convert to RouteData format
      const routeData: RouteData = {
        key: route.key,
        name: route.name,
        description: route.description,
        tileSize: route.tileSize || 32,
        tiles: route.tiles || { map: [], legend: {} },
        spawn: route.spawn,
        exits: route.exits || [],
        npcs: route.npcs || [],
        objects: (route.objects || []).map(obj => ({
          ...obj,
          layer: obj.layer as 'below' | 'above' | 'collision'
        })),
        creatures: route.creatures
      };
      setCurrentRouteData(routeData);
    }
  }, [routes, playerSave.currentRoute]);

  // Use tile map hook
  const {
    processedMap,
    mapWidth,
    mapHeight,
    tileSize,
    checkCollision,
    getExit,
    checkEncounter,
    getGround,
    npcs
  } = useTileMap(currentRouteData);

  // Update spawn position when route changes (only once per route)
  useEffect(() => {
    if (!processedMap || !currentRoute) return;
    
    // Prevent re-initialization for the same route
    const routeKey = `${currentRoute.key}-${pendingSpawn?.routeKey || 'none'}-${pendingSpawn?.x || 0}-${pendingSpawn?.y || 0}`;
    if (hasInitializedSpawn.current === routeKey) return;
    hasInitializedSpawn.current = routeKey;
    
    // Determine initial spawn position
    let pos: TilePosition;
    if (pendingSpawn && pendingSpawn.routeKey === currentRoute.key) {
      pos = {
        tx: Math.floor(pendingSpawn.x / tileSize),
        ty: Math.floor(pendingSpawn.y / tileSize)
      };
    } else {
      pos = {
        tx: Math.floor(playerSave.playerPosition.tx / tileSize),
        ty: Math.floor(playerSave.playerPosition.ty / tileSize)
      };
    }
    
    // Clamp to bounds
    const clampedPos = {
      tx: Math.max(0, Math.min(pos.tx, processedMap.width - 1)),
      ty: Math.max(0, Math.min(pos.ty, processedMap.height - 1))
    };
    
    // Find valid spawn position if blocked
    let validPos = clampedPos;
    if (checkCollision(clampedPos.tx, clampedPos.ty)) {
      const maxSearchRadius = 5;
      let found = false;
      for (let radius = 1; radius <= maxSearchRadius && !found; radius++) {
        for (let dy = -radius; dy <= radius && !found; dy++) {
          for (let dx = -radius; dx <= radius && !found; dx++) {
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            const testPos = { tx: clampedPos.tx + dx, ty: clampedPos.ty + dy };
            if (!checkCollision(testPos.tx, testPos.ty)) {
              validPos = testPos;
              found = true;
            }
          }
        }
      }
      if (!found) {
        console.warn('Could not find valid spawn position near', clampedPos);
      }
    }
    
    setSpawnPosition(validPos);
    
    // Clear pending spawn after using it
    if (pendingSpawn && pendingSpawn.routeKey === currentRoute.key) {
      clearPendingSpawn();
      unlockMovement();
    }
  }, [processedMap?.width, processedMap?.height, currentRoute?.key, pendingSpawn?.routeKey, pendingSpawn?.x, pendingSpawn?.y, tileSize, playerSave.playerPosition.tx, playerSave.playerPosition.ty, checkCollision, clearPendingSpawn, unlockMovement]);

  // Handle exit transition
  const handleExitTrigger = useCallback((destination: string, spawnPoint: string) => {
    const targetRoute = routes.routes.find((r) => r.key === destination);
    if (!targetRoute) {
      console.warn('Exit to unknown route:', destination);
      return;
    }

    // Find spawn point
    const spawn = targetRoute.spawn?.[spawnPoint] ?? targetRoute.spawn?.default;
    if (!spawn) {
      console.warn('No valid spawn point for route:', destination);
      return;
    }

    // Set pending spawn
    setPendingSpawn({
      routeKey: targetRoute.key,
      x: spawn.tx,
      y: spawn.ty
    });

    // Lock movement and transition
    lockMovement();
    updatePlayerPosition(targetRoute.key, spawn.tx, spawn.ty);
    setCurrentRoute(targetRoute);
  }, [routes.routes, setPendingSpawn, lockMovement, updatePlayerPosition]);

  // Handle encounter trigger
  const handleMoveComplete = useCallback((position: TilePosition) => {
    // Update player position in store
    if (currentRoute) {
      const pixelX = position.tx * tileSize + tileSize / 2;
      const pixelY = position.ty * tileSize + tileSize / 2;
      updatePlayerPosition(currentRoute.key, pixelX, pixelY);
    }

    // Check for wild encounter
    if (checkEncounter(position.tx, position.ty)) {
      console.log('Encounter triggered at:', position.tx, position.ty);
      // TODO: Trigger battle system
    }
  }, [currentRoute, tileSize, checkEncounter, updatePlayerPosition]);

  // Handle input (must be before usePlayer)
  const { getHeldDirection } = useInput({
    onMove: (dir: Direction) => {
      if (!movementLocked) {
        move(dir);
      }
    },
    enabled: !!processedMap && !movementLocked
  });

  // Use player hook
  const {
    position: playerPosition,
    tilePosition: playerTilePosition,
    direction,
    isMoving,
    animationFrame,
    move
  } = usePlayer({
    initialTilePosition: spawnPosition,
    tileSize,
    checkCollision,
    getExit,
    onExitTrigger: handleExitTrigger,
    onMoveComplete: handleMoveComplete,
    getHeldDirection,
    movementDelay: 150
  });

  // Use camera hook
  const { camera, updateCamera, getVisibleTileRange } = useCamera({
    mapWidth,
    mapHeight,
    tileSize
  });

  // Update camera when player moves
  useEffect(() => {
    updateCamera(playerPosition);
  }, [playerPosition, updateCamera]);

  // Get visible tile range for culling
  const visibleRange = getVisibleTileRange();

  // Get current ground type
  const currentGround = getGround(playerTilePosition.tx, playerTilePosition.ty);

  // Loading state
  if (!processedMap || !currentRouteData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100">
        Loading overworld...
      </div>
    );
  }

  return (
    <div className="overworld-container">
      <GameViewport
        camera={camera}
        mapWidth={mapWidth}
        mapHeight={mapHeight}
      >
        {/* Ground layer */}
        <TileMap
          tiles={currentRouteData.tiles}
          tileSize={tileSize}
          legend={TILE_DEFINITIONS}
          layer="ground"
          visibleRange={visibleRange}
        />

        {/* Object layer (below player) */}
        <TileMap
          tiles={currentRouteData.tiles}
          tileSize={tileSize}
          legend={TILE_DEFINITIONS}
          layer="object"
          visibleRange={visibleRange}
        />

        {/* NPCs */}
        <NPCs npcs={npcs} tileSize={tileSize} />

        {/* Player */}
        <Player
          position={playerPosition}
          direction={direction}
          isMoving={isMoving}
          animationFrame={animationFrame}
          tileSize={tileSize}
        />

        {/* Above layer */}
        <TileMap
          tiles={currentRouteData.tiles}
          tileSize={tileSize}
          legend={TILE_DEFINITIONS}
          layer="above"
          visibleRange={visibleRange}
        />
      </GameViewport>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg shadow-lg backdrop-blur-sm">
        <div className="text-sm font-medium">
          <div>Location: {currentRoute?.name}</div>
          <div className="text-gray-300 mt-1">
            Position: ({playerTilePosition.tx}, {playerTilePosition.ty})
          </div>
          <div className="text-gray-300">
            Ground: {currentGround}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg shadow-lg backdrop-blur-sm">
        <div className="text-xs text-gray-300">
          Use Arrow keys or WASD to move
        </div>
      </div>
    </div>
  );
};

export default Overworld;
