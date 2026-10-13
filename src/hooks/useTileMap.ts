import { useMemo, useCallback } from 'react';
import { RouteData, ProcessedMap, Exit, TileProperties } from '@/types/game';
import { processTileMap, isBlocked, findExitAt, shouldTriggerEncounter, getGroundType, isValidPosition } from '@/utils/tile-helpers';

export function useTileMap(routeData: RouteData | null) {
  const processedMap: ProcessedMap | null = useMemo(() => {
    if (!routeData) return null;
    return processTileMap(routeData);
  }, [routeData]);

  const mapWidth = useMemo(() => {
    if (!processedMap) return 0;
    return processedMap.width * processedMap.tileSize;
  }, [processedMap]);

  const mapHeight = useMemo(() => {
    if (!processedMap) return 0;
    return processedMap.height * processedMap.tileSize;
  }, [processedMap]);

  const tileSize = processedMap?.tileSize || 32;

  const getTileProperties = useCallback((tx: number, ty: number): TileProperties | null => {
    if (!routeData || !isValidPosition(tx, ty, processedMap!)) return null;
    const tileChar = routeData.tiles.map[ty][tx];
    const tileType = routeData.tiles.legend[tileChar];
    return processedMap?.tileProperties[tileType] || null;
  }, [routeData, processedMap]);

  const checkCollision = useCallback((tx: number, ty: number): boolean => {
    if (!processedMap || !routeData) return true;
    return isBlocked(tx, ty, processedMap, routeData.objects || [], routeData.npcs || []);
  }, [processedMap, routeData]);

  const getExit = useCallback((tx: number, ty: number): Exit | null => {
    if (!routeData) return null;
    return findExitAt(tx, ty, routeData.exits || []);
  }, [routeData]);

  const checkEncounter = useCallback((tx: number, ty: number): boolean => {
    if (!processedMap) return false;
    return shouldTriggerEncounter(tx, ty, processedMap);
  }, [processedMap]);

  const getGround = useCallback((tx: number, ty: number): string => {
    if (!processedMap) return 'unknown';
    return getGroundType(tx, ty, processedMap);
  }, [processedMap]);

  const getTileChar = useCallback((tx: number, ty: number): string | null => {
    if (!routeData || !processedMap || !isValidPosition(tx, ty, processedMap)) return null;
    return routeData.tiles.map[ty][tx];
  }, [routeData, processedMap]);

  return {
    processedMap,
    mapWidth,
    mapHeight,
    tileSize,
    getTileProperties,
    checkCollision,
    getExit,
    checkEncounter,
    getGround,
    getTileChar,
    npcs: routeData?.npcs || [],
    objects: routeData?.objects || [],
    exits: routeData?.exits || [],
  };
}
