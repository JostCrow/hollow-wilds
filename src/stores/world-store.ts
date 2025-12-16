import { create } from "zustand";

type PendingSpawn = {
  routeKey: string;
  x: number;
  y: number;
} | null;

type WorldStoreState = {
  pendingSpawn: PendingSpawn;
  isMovementLocked: boolean;
  setPendingSpawn: (spawn: PendingSpawn) => void;
  clearPendingSpawn: () => void;
  lockMovement: () => void;
  unlockMovement: () => void;
};

export const useWorldStore = create<WorldStoreState>((set) => ({
  pendingSpawn: null,
  isMovementLocked: false,
  setPendingSpawn: (spawn) => set({ pendingSpawn: spawn }),
  clearPendingSpawn: () => set({ pendingSpawn: null }),
  lockMovement: () => set({ isMovementLocked: true }),
  unlockMovement: () => set({ isMovementLocked: false }),
}));

