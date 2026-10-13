import { useEffect, useCallback, useRef } from 'react';
import { Direction } from '@/types/game';

interface UseInputOptions {
  onMove: (direction: Direction) => void;
  enabled?: boolean;
}

const DIRECTION_KEYS: Record<string, Direction> = {
  'ArrowUp': 'up',
  'w': 'up',
  'W': 'up',
  'ArrowDown': 'down',
  's': 'down',
  'S': 'down',
  'ArrowLeft': 'left',
  'a': 'left',
  'A': 'left',
  'ArrowRight': 'right',
  'd': 'right',
  'D': 'right'
};

export function useInput({ onMove, enabled = true }: UseInputOptions) {
  const keysPressed = useRef<Set<string>>(new Set());
  const lastDirection = useRef<Direction | null>(null);

  const getHeldDirection = useCallback((): Direction | null => {
    // Priority: up, down, left, right (whichever was pressed last)
    const keys = Array.from(keysPressed.current);
    
    // Find the most recently pressed direction key
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      if (DIRECTION_KEYS[key]) {
        return DIRECTION_KEYS[key];
      }
    }
    
    return null;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const key = e.key;
    
    // Prevent default for game keys
    if (DIRECTION_KEYS[key]) {
      e.preventDefault();
    }

    if (keysPressed.current.has(key)) return;
    keysPressed.current.add(key);

    const direction = DIRECTION_KEYS[key];
    if (direction) {
      lastDirection.current = direction;
      onMove(direction);
    }
  }, [onMove, enabled]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    isKeyPressed: (key: string) => keysPressed.current.has(key),
    getHeldDirection
  };
}
