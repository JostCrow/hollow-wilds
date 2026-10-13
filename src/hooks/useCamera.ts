import { useState, useEffect, useCallback } from 'react';
import { Position } from '@/types/game';
import { calculateCameraPosition } from '@/utils/tile-helpers';

interface UseCameraOptions {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
}

export function useCamera({ mapWidth, mapHeight, tileSize }: UseCameraOptions) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // Update viewport size on mount and resize
  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Update camera position when player moves
  const updateCamera = useCallback((playerPosition: Position) => {
    if (viewport.width === 0 || viewport.height === 0) return;

    const newCamera = calculateCameraPosition(
      playerPosition.x,
      playerPosition.y,
      viewport.width,
      viewport.height,
      mapWidth,
      mapHeight
    );

    setCamera(newCamera);
  }, [viewport, mapWidth, mapHeight]);

  // Convert world position to screen position
  const worldToScreen = useCallback((worldPos: Position): Position => {
    return {
      x: worldPos.x - camera.x,
      y: worldPos.y - camera.y
    };
  }, [camera]);

  // Convert screen position to world position
  const screenToWorld = useCallback((screenPos: Position): Position => {
    return {
      x: screenPos.x + camera.x,
      y: screenPos.y + camera.y
    };
  }, [camera]);

  // Get visible tile range for culling
  const getVisibleTileRange = useCallback(() => {
    const startTx = Math.floor(camera.x / tileSize);
    const startTy = Math.floor(camera.y / tileSize);
    const endTx = Math.ceil((camera.x + viewport.width) / tileSize);
    const endTy = Math.ceil((camera.y + viewport.height) / tileSize);

    return {
      startTx: Math.max(0, startTx),
      startTy: Math.max(0, startTy),
      endTx: Math.min(endTx, Math.floor(mapWidth / tileSize)),
      endTy: Math.min(endTy, Math.floor(mapHeight / tileSize))
    };
  }, [camera, viewport, tileSize, mapWidth, mapHeight]);

  return {
    camera,
    viewport,
    updateCamera,
    worldToScreen,
    screenToWorld,
    getVisibleTileRange
  };
}
