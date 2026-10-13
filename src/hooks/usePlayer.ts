import { useState, useCallback, useRef, useEffect } from 'react';
import { Position, TilePosition, Direction, PlayerState } from '@/types/game';
import { getTileCenter } from '@/utils/tile-helpers';

interface UsePlayerOptions {
  initialTilePosition: TilePosition;
  tileSize: number;
  onMoveStart?: (direction: Direction) => void;
  onMoveComplete?: (position: TilePosition) => void;
  checkCollision: (tx: number, ty: number) => boolean;
  getExit: (tx: number, ty: number) => { destination: string; spawnPoint: string } | null;
  onExitTrigger?: (destination: string, spawnPoint: string) => void;
  getHeldDirection?: () => Direction | null;
  movementDelay?: number;
}

export function usePlayer({
  initialTilePosition,
  tileSize,
  onMoveStart,
  onMoveComplete,
  checkCollision,
  getExit,
  onExitTrigger,
  getHeldDirection,
  movementDelay = 150
}: UsePlayerOptions) {
  const initialPixelPos = getTileCenter(initialTilePosition, tileSize);
  
  const [state, setState] = useState<PlayerState>({
    position: initialPixelPos,
    tilePosition: initialTilePosition,
    direction: 'down',
    isMoving: false,
    animationFrame: 0
  });

  const isMovingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const pendingDirection = useRef<Direction | null>(null);
  const tilePositionRef = useRef<TilePosition>(initialTilePosition);

  // Update position when initial position changes (route transitions)
  useEffect(() => {
    const pixelPos = getTileCenter(initialTilePosition, tileSize);
    setState(prev => ({
      ...prev,
      position: pixelPos,
      tilePosition: initialTilePosition,
      isMoving: false,
      animationFrame: 0
    }));
    tilePositionRef.current = initialTilePosition;
    isMovingRef.current = false;
    pendingDirection.current = null;
  }, [initialTilePosition, tileSize]);

  // Keep tilePositionRef in sync with state
  useEffect(() => {
    tilePositionRef.current = state.tilePosition;
  }, [state.tilePosition]);

  const animateMovement = useCallback((
    fromPos: Position,
    toPos: Position,
    direction: Direction,
    onComplete: () => void
  ) => {
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / movementDelay, 1);
      
      // Calculate current position with ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentX = fromPos.x + (toPos.x - fromPos.x) * easeProgress;
      const currentY = fromPos.y + (toPos.y - fromPos.y) * easeProgress;
      
      // Update animation frame (8 frames for walking - cycles through 0-7)
      const frameIndex = Math.floor(progress * 8) % 8;
      
      setState(prev => ({
        ...prev,
        position: { x: currentX, y: currentY },
        animationFrame: frameIndex,
        direction
      }));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [movementDelay]);

  const performMove = useCallback((direction: Direction): boolean => {
    if (isMovingRef.current) {
      // Queue the direction for after current movement
      pendingDirection.current = direction;
      return false;
    }

    // Use ref to get current position (avoids closure stale state)
    const currentPos = tilePositionRef.current;
    let nextTx = currentPos.tx;
    let nextTy = currentPos.ty;

    switch (direction) {
      case 'up': nextTy--; break;
      case 'down': nextTy++; break;
      case 'left': nextTx--; break;
      case 'right': nextTx++; break;
    }

    // Check collision
    if (checkCollision(nextTx, nextTy)) {
      // Just change direction if blocked
      setState(prev => ({ ...prev, direction }));
      return false;
    }

    isMovingRef.current = true;
    setState(prev => ({ ...prev, direction, isMoving: true }));
    onMoveStart?.(direction);

    const fromPos = getTileCenter(currentPos, tileSize);
    const toPos = getTileCenter({ tx: nextTx, ty: nextTy }, tileSize);

    animateMovement(fromPos, toPos, direction, () => {
      const newTilePos = { tx: nextTx, ty: nextTy };
      
      // Check for exit
      const exit = getExit(nextTx, nextTy);
      if (exit && onExitTrigger) {
        onExitTrigger(exit.destination, exit.spawnPoint);
        return; // Don't continue if we exited
      }

      // Check if we're continuing to move
      const heldDir = getHeldDirection?.();
      const willContinue = !!heldDir;
      
      setState(prev => ({
        ...prev,
        tilePosition: newTilePos,
        isMoving: willContinue, // Keep animating if continuing
        animationFrame: willContinue ? prev.animationFrame : 0, // Don't reset if continuing
        position: toPos
      }));
      
      // Update ref immediately so next move starts from correct position
      tilePositionRef.current = newTilePos;
      isMovingRef.current = false;
      onMoveComplete?.(newTilePos);

      // Continue moving immediately if key is still held
      if (heldDir) {
        performMove(heldDir);
      }
    });

    return true;
  }, [tileSize, checkCollision, getExit, onExitTrigger, onMoveStart, onMoveComplete, animateMovement, getHeldDirection]);

  const move = useCallback((direction: Direction) => {
    return performMove(direction);
  }, [performMove]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    position: state.position,
    tilePosition: state.tilePosition,
    direction: state.direction,
    isMoving: state.isMoving,
    animationFrame: state.animationFrame,
    move
  };
}
