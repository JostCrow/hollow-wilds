import React, { useEffect, useRef, useState } from "react";
import { Routes, Route as RouteType, PlayerSave } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import { useWorldStore } from "@/stores/world-store";

interface OverworldProps {
  routes: Routes;
  playerSave: PlayerSave;
}

type Direction = "up" | "down" | "left" | "right";

export const Overworld: React.FC<OverworldProps> = ({ routes, playerSave }) => {
  // Player configuration
  const PLAYER_WIDTH = 32;
  const PLAYER_HEIGHT = 48;
  const PLAYER_STEP = 32;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  const [currentRoute, setCurrentRoute] = useState<RouteType | null>(null);
  const pendingSpawn = useWorldStore((state) => state.pendingSpawn);
  const setPendingSpawn = useWorldStore((state) => state.setPendingSpawn);
  const clearPendingSpawn = useWorldStore((state) => state.clearPendingSpawn);
  const lockMovement = useWorldStore((state) => state.lockMovement);
  const unlockMovement = useWorldStore((state) => state.unlockMovement);
  const movementLocked = useWorldStore((state) => state.isMovementLocked);
  const updatePlayerPosition = usePlayerStore(
    (state) => state.updatePlayerPosition,
  );

  // World size in pixels (from image)
  const [worldSize, setWorldSize] = useState({
    width: 0,
    height: 0,
    loaded: false,
  });

  // Full-screen viewport (in CSS pixels)
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });

  // Player position in world coordinates (bottom-center of sprite)
  const [playerPos, setPlayerPos] = useState({
    x: playerSave.playerPosition.tx,
    y: playerSave.playerPosition.ty,
  });
  const hasInitializedFromSaveRef = React.useRef(false);

  // Camera (top-left in world coordinates)
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // Movement / animation
  const [isMoving, setIsMoving] = useState(false);

  // 1. Resolve current route from save (only when currentRoute key changes)
  useEffect(() => {
    const route = routes.routes.find((r) => r.key === playerSave.currentRoute);
    setCurrentRoute(route ?? null);

    // Only initialize player position from save once per route load
    hasInitializedFromSaveRef.current = false;
  }, [routes, playerSave.currentRoute]);

  // 2. Load world background to determine world size
  const resolveBackgroundPath = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/${path}`;
  };

  const computeFallbackWorldSize = (route: RouteType | null) => {
    if (!route) {
      return { width: 1024, height: 768 };
    }

    let width = 1024;
    let height = 768;

    if (route.collisions?.length) {
      const maxX = Math.max(
        ...route.collisions.map((collision) => collision.x + collision.width),
      );
      const maxY = Math.max(
        ...route.collisions.map((collision) => collision.y + collision.height),
      );
      width = maxX;
      height = maxY;
    }

    if (route.boundaries) {
      const tileSize = route.tileSize || 32;
      const allBounds = [...(route.boundaries.walkable || []), ...(route.boundaries.blocked || [])];
      if (allBounds.length > 0) {
        const maxTx = Math.max(...allBounds.map(b => b.tx + b.w));
        const maxTy = Math.max(...allBounds.map(b => b.ty + b.h));
        width = Math.max(width, maxTx * tileSize);
        height = Math.max(height, maxTy * tileSize);
      }
    }

    return {
      width: Math.max(width, 512),
      height: Math.max(height, 512),
    };
  };

  useEffect(() => {
    if (!currentRoute) return;

    const resolvedBackground = resolveBackgroundPath(currentRoute.background);
    if (!resolvedBackground) {
      const fallback = computeFallbackWorldSize(currentRoute);
      setWorldSize({
        ...fallback,
        loaded: true,
      });
      return;
    }

    const img = new Image();
    img.src = resolvedBackground;
    img.onload = () => {
      setWorldSize({
        width: img.width,
        height: img.height,
        loaded: true,
      });
    };
    img.onerror = () => {
      const fallback = computeFallbackWorldSize(currentRoute);
      setWorldSize({
        ...fallback,
        loaded: true,
      });
    };
  }, [currentRoute]);

  // 3. Full-screen viewport based on window size
  useEffect(() => {
    const computeViewport = () => {
      if (typeof window === "undefined") {
        setViewportSize({ width: 0, height: 0 });
        return;
      }
      // Use the full available window size
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportSize({
        width: width > 0 ? width : 0,
        height: height > 0 ? height : 0,
      });
    };

    computeViewport();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", computeViewport);
      return () => {
        window.removeEventListener("resize", computeViewport);
      };
    }
  }, []);

  // 4. Choose spawn position when world is ready
  useEffect(() => {
    if (!worldSize.loaded || worldSize.width === 0 || worldSize.height === 0) {
      return;
    }

    if (!currentRoute) return;

    // Initialize position from save only once after route + world are ready
    if (!hasInitializedFromSaveRef.current) {
      hasInitializedFromSaveRef.current = true;

      const initialX = playerSave.playerPosition.tx;
      const initialY = playerSave.playerPosition.ty;

      // If save position is within world, use it; otherwise fall back to spawn logic below
      if (
        initialX >= 0 &&
        initialX <= worldSize.width &&
        initialY >= 0 &&
        initialY <= worldSize.height
      ) {
        const { x, y } = clampPlayer(initialX, initialY);
        setPlayerPos({ x, y });
        return;
      }
    }

    let spawnX: number | null = null;
    let spawnY: number | null = null;

    // Use a pending spawn (from an exit transition) if it matches this route
    if (pendingSpawn && pendingSpawn.routeKey === currentRoute.key) {
      spawnX = pendingSpawn.x;
      spawnY = pendingSpawn.y;
    } else if (currentRoute.spawn?.default) {
      spawnX = currentRoute.spawn.default.tx;
      spawnY = currentRoute.spawn.default.ty;
    }

    // Fallback to center if we cannot resolve a spawn
    if (spawnX === null) spawnX = worldSize.width / 2;
    if (spawnY === null) spawnY = worldSize.height / 2;

    // Clamp to keep player fully within world
    const halfW = PLAYER_WIDTH / 2;
    const fullH = PLAYER_HEIGHT;

    const clampedX = Math.max(halfW, Math.min(worldSize.width - halfW, spawnX));
    const clampedY = Math.max(fullH, Math.min(worldSize.height, spawnY));

    setPlayerPos({ x: clampedX, y: clampedY });

    // Clear pending spawn once we've used it for this route
    if (pendingSpawn && pendingSpawn.routeKey === currentRoute.key) {
      clearPendingSpawn();
      unlockMovement();
    }
  }, [
    worldSize.loaded,
    worldSize.width,
    worldSize.height,
    currentRoute,
    playerSave.playerPosition,
    pendingSpawn,
    clearPendingSpawn,
    unlockMovement,
  ]);

  // 5. Camera: center on player, clamped to world bounds, using full-screen viewport
  useEffect(() => {
    if (
      !worldSize.loaded ||
      worldSize.width === 0 ||
      worldSize.height === 0 ||
      viewportSize.width === 0 ||
      viewportSize.height === 0
    ) {
      return;
    }

    const { width: vw, height: vh } = viewportSize;
    const { width: ww, height: wh } = worldSize;
    const { x: px, y: py } = playerPos;

    // Ideal center
    let idealX = px - vw / 2;
    let idealY = py - vh / 2;

    // Clamp
    const maxCameraX = Math.max(0, ww - vw);
    const maxCameraY = Math.max(0, wh - vh);

    const camX = Math.max(0, Math.min(idealX, maxCameraX));
    const camY = Math.max(0, Math.min(idealY, maxCameraY));

    setCamera({ x: camX, y: camY });
  }, [playerPos, worldSize, viewportSize]);

  // 6. Helpers: clamp + collisions
  const clampPlayer = (x: number, y: number) => {
    const { width: ww, height: wh } = worldSize;
    const halfW = PLAYER_WIDTH / 2;
    const fullH = PLAYER_HEIGHT;

    if (!worldSize.loaded || ww === 0 || wh === 0) {
      return { x, y };
    }

    const clampedX = Math.max(halfW, Math.min(ww - halfW, x));
    const clampedY = Math.max(fullH, Math.min(wh, y));

    return { x: clampedX, y: clampedY };
  };

  const isBlocked = (x: number, y: number): boolean => {
    if (!worldSize.loaded || !currentRoute) {
      return false;
    }

    const feetX = x;
    const feetY = y;

    if (currentRoute.collisions) {
      for (const rect of currentRoute.collisions) {
        if (
          feetX >= rect.x &&
          feetX <= rect.x + rect.width &&
          feetY >= rect.y &&
          feetY <= rect.y + rect.height
        ) {
          return true;
        }
      }
    }

    if (currentRoute.boundaries) {
      const tileSize = currentRoute.tileSize || 32;

      if (currentRoute.boundaries.blocked) {
        for (const rect of currentRoute.boundaries.blocked) {
          const rectX = rect.tx * tileSize;
          const rectY = rect.ty * tileSize;
          const rectW = rect.w * tileSize;
          const rectH = rect.h * tileSize;

          if (feetX >= rectX && feetX <= rectX + rectW &&
            feetY >= rectY && feetY <= rectY + rectH) {
            return true;
          }
        }
      }

      if (currentRoute.boundaries.walkable && currentRoute.boundaries.walkable.length > 0) {
        let inWalkable = false;
        for (const rect of currentRoute.boundaries.walkable) {
          const rectX = rect.tx * tileSize;
          const rectY = rect.ty * tileSize;
          const rectW = rect.w * tileSize;
          const rectH = rect.h * tileSize;

          if (feetX >= rectX && feetX <= rectX + rectW &&
            feetY >= rectY && feetY <= rectY + rectH) {
            inWalkable = true;
            break;
          }
        }
        if (!inWalkable) return true;
      }
    }

    return false;
  };

  const findExitAt = (x: number, y: number) => {
    if (!currentRoute || !currentRoute.exits) return null;

    const feetX = x;
    const feetY = y;

    for (const exit of currentRoute.exits) {
      const { area } = exit;
      const rectX = area.tx;
      const rectY = area.ty;
      const rectW = area.w;
      const rectH = area.h;

      if (
        feetX >= rectX &&
        feetX <= rectX + rectW &&
        feetY >= rectY &&
        feetY <= rectY + rectH
      ) {
        return exit;
      }
    }

    return null;
  };

  const transitionToRoute = (
    exit: RouteType["exits"][number],
    _fromX: number,
    _fromY: number,
  ) => {
    const target = routes.routes.find((r) => r.key === exit.destination);
    if (!target) {
      console.warn("Exit to unknown route:", exit.destination);
      return;
    }

    // Resolve spawn point in target route
    const spawnKey = exit.spawnPoint;
    const spawn = target.spawn?.[spawnKey] ?? target.spawn?.default;
    if (!spawn) {
      console.warn(
        "No valid spawn point for exit to route:",
        exit.destination,
        "spawnKey:",
        spawnKey,
      );
      return;
    }

    setPendingSpawn({
      routeKey: target.key,
      x: spawn.tx,
      y: spawn.ty,
    });

    lockMovement();
    updatePlayerPosition(target.key, spawn.tx, spawn.ty);
    setCurrentRoute(target);
    setIsMoving(false);
  };

  // 7. Movement
  const movePlayer = (direction: Direction) => {
    if (!worldSize.loaded || isMoving || movementLocked) return;

    setIsMoving(true);

    setPlayerPos((prev) => {
      let nextX = prev.x;
      let nextY = prev.y;

      switch (direction) {
        case "up":
          nextY -= PLAYER_STEP;
          break;
        case "down":
          nextY += PLAYER_STEP;
          break;
        case "left":
          nextX -= PLAYER_STEP;
          break;
        case "right":
          nextX += PLAYER_STEP;
          break;
      }

      const candidate = clampPlayer(nextX, nextY);
      if (isBlocked(candidate.x, candidate.y)) {
        return prev;
      }

      // Check for exits at the new position
      const exit = findExitAt(candidate.x, candidate.y);
      if (exit) {
        transitionToRoute(exit, candidate.x, candidate.y);
        // Keep player visually at the exit position until new route loads and spawn is applied
        return candidate;
      }

      if (currentRoute) {
        // Emit the updated position on successful move
        updatePlayerPosition(currentRoute.key, candidate.x, candidate.y);
      }

      return candidate;
    });

    window.setTimeout(() => {
      setIsMoving(false);
    }, 160);
  };

  // 8. Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!worldSize.loaded) return;
      if (isMoving || movementLocked) return;

      const key = e.key;
      if (
        key === "ArrowUp" ||
        key === "w" ||
        key === "W" ||
        key === "ArrowDown" ||
        key === "s" ||
        key === "S" ||
        key === "ArrowLeft" ||
        key === "a" ||
        key === "A" ||
        key === "ArrowRight" ||
        key === "d" ||
        key === "D"
      ) {
        e.preventDefault();
      }

      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          movePlayer("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          movePlayer("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          movePlayer("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          movePlayer("right");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldSize.loaded, isMoving, movementLocked]);

  // 9. Styles
  const worldStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: worldSize.width || "100%",
    height: worldSize.height || "100%",
    backgroundImage: currentRoute?.background
      ? `url("${resolveBackgroundPath(currentRoute.background)}")`
      : undefined,
    backgroundRepeat: "no-repeat",
    backgroundSize:
      worldSize.width && worldSize.height
        ? `${worldSize.width}px ${worldSize.height}px`
        : "cover",
    transform: `translate(${-camera.x}px, ${-camera.y}px)`,
    transformOrigin: "top left",
    transition: isMoving ? "transform 0.16s linear" : "transform 0.16s linear",
  };

  const playerStyle: React.CSSProperties = {
    position: "absolute",
    width: `${PLAYER_WIDTH}px`,
    height: `${PLAYER_HEIGHT}px`,
    left: `${playerPos.x - PLAYER_WIDTH / 2}px`,
    top: `${playerPos.y - PLAYER_HEIGHT}px`,
    backgroundColor: "#ff3333",
    borderRadius: "4px",
    boxShadow: "0 0 4px rgba(0,0,0,0.5)",
    transition: isMoving ? "left 0.155s linear, top 0.155s linear" : "none",
    display: worldSize.loaded ? "block" : "none",
    zIndex: 10,
  };

  // 10. Loading state
  if (
    !worldSize.loaded ||
    viewportSize.width === 0 ||
    viewportSize.height === 0
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100">
        Loading overworld...
      </div>
    );
  }

  // 11. Render full-screen overworld
  return (
    <div className="overworld-container bg-background">
      <div
        ref={viewportRef}
        className="relative overflow-hidden w-screen h-screen"
      >
        <div ref={worldRef} style={worldStyle}>
          <div ref={playerRef} style={playerStyle} />
        </div>
        <div className="absolute top-4 left-4 bg-white/80 text-black text-xs px-3 py-2 rounded shadow">
          <div>Use Arrow keys or WASD to walk along the path.</div>
          {currentRoute && (
            <div className="mt-1 text-[10px] text-gray-700">
              Current area: {currentRoute.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
