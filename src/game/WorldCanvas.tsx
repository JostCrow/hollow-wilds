import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Expand,
  Hand,
} from "lucide-react";
import { useAdventure } from "./store";
import {
  findPath,
  getWorld,
  TILE,
  walkable,
  exitPoint,
  zoneById,
} from "./world";
import type { Point, World } from "./world";
import { SHINY_FILTER, traitLabel } from "./traits";
import { spriteImage } from "./sprites";
import { drawPerson, drawPickup, landscape } from "./world-renderer";
import type { DepthItem } from "./world-renderer";
import { createRoamSchedule, roamCreatures } from "./roaming";

function areaMap(world: World) {
  const canvas = document.createElement("canvas");
  canvas.width = world.width * 3;
  canvas.height = world.height * 3;
  const c = canvas.getContext("2d")!;
  const colors: Record<string, string> = {
    grass: world.zone.kind === "snow" ? "#dce6e4" : "#afc18c",
    path: "#e0cc9d",
    tree: "#628264",
    tall: "#8aab6b",
    flowers: "#c4ca95",
    water: "#81b5bc",
    bridge: "#bba078",
    rock: "#9f9e92",
    sand: "#dccc9f",
    ice: "#b2d7df",
  };
  for (let y = 0; y < world.height; y++)
    for (let x = 0; x < world.width; x++) {
      c.fillStyle = colors[world.tiles[y][x]];
      c.fillRect(x * 3, y * 3, 3, 3);
    }
  for (const b of world.buildings) {
    c.fillStyle = b.roof;
    c.fillRect(b.x * 3, b.y * 3, b.w * 3, b.h * 3);
  }
  return canvas.toDataURL();
}
export function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    containerRef = useRef<HTMLDivElement>(null);
  const input = useRef({
    keys: new Set<string>(),
    path: [] as Point[],
    interactAtEnd: false,
    target: null as Point | null,
    wildTargetId: null as string | null,
    wildPositions: new Map<string, { x: number; y: number; width: number; height: number }>(),
    camera: { x: 0, y: 0 },
    zoom: 1,
  });
  const [full, setFull] = useState(false);
  const save = useAdventure((s) => s.save),
    spawns = useAdventure((s) => s.spawns);
  const world = getWorld(save?.zone ?? "willowfen");
  const miniMap = useMemo(() => areaMap(world), [world]);
  const distance = (p: Point) =>
    save ? Math.abs(p.x - save.x) + Math.abs(p.y - save.y) : Infinity;
  const nearbyWild = spawns.find((s) => distance(s) <= 2),
    nearbyPerson = world.npcs.find((n) => distance(n) <= 2);
  const nearbyBuilding =
    save &&
    world.buildings.find(
      (b) =>
        Math.abs(save.x - (b.x + Math.floor(b.w / 2))) <= 2 &&
        save.y >= b.y + b.h &&
        save.y <= b.y + b.h + 2,
    );
  const hint = nearbyWild
    ? `Meet ${nearbyWild.species}`
    : nearbyPerson
      ? `Talk to ${nearbyPerson.name}`
      : nearbyBuilding
        ? nearbyBuilding.service === "heal"
          ? "Heal your team"
          : nearbyBuilding.service === "shop"
            ? "Browse field supplies"
            : "Visit Ranger’s Rest"
        : null;
  useEffect(() => {
    const canvas = canvasRef.current!,
      host = containerRef.current!,
      ctx = canvas.getContext("2d")!;
    let frame = 0,
      w = 800,
      h = 540,
      lastStep = 0,
      lastZone = "",
      px = 0,
      py = 0,
      playerWalkDistance = 0,
      initialized = false;
    const resize = new ResizeObserver(() => {
      const bounds = host.getBoundingClientRect();
      w = bounds.width;
      h = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(host);
    const state = input.current;
    const roamSchedule = createRoamSchedule();
    const wildVisuals = new Map<string, {
      fromX: number; fromY: number; targetX: number; targetY: number;
      startedAt: number; facing: number;
    }>();
    let lastDrawTime = 0;
    const stepDuration = 360;
    const stepProgress = (startedAt: number, now: number) => Math.max(0, Math.min(1, (now - startedAt) / stepDuration));
    const easeStep = (progress: number) => (1 - Math.cos(progress * Math.PI)) / 2;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    const updateMotion = () => { reducedMotion = motionPreference.matches; };
    motionPreference.addEventListener("change", updateMotion);
    const keyDown = (e: KeyboardEvent) => {
      if (
        !(e.target instanceof HTMLElement) ||
        e.target.closest("input, textarea, select") ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (
        useAdventure.getState().panel !== "adventure" ||
        useAdventure.getState().battle ||
        useAdventure.getState().dialog ||
        !useAdventure.getState().save
      )
        return;
      if (e.key === " " && (e.target as HTMLElement).closest("button")) return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          " ",
          "w",
          "a",
          "s",
          "d",
          "W",
          "A",
          "S",
          "D",
          "Shift",
        ].includes(e.key)
      ) {
        e.preventDefault();
        state.keys.add(e.key.toLowerCase());
        state.path = [];
        state.interactAtEnd = false;
        state.target = null;
        state.wildTargetId = null;
        if (!e.repeat) {
          const direction = (
            {
              w: [0, -1],
              arrowup: [0, -1],
              s: [0, 1],
              arrowdown: [0, 1],
              a: [-1, 0],
              arrowleft: [-1, 0],
              d: [1, 0],
              arrowright: [1, 0],
            } as Record<string, number[]>
          )[e.key.toLowerCase()];
          if (direction) {
            useAdventure.getState().move(direction[0], direction[1]);
            lastStep = performance.now();
          }
        }
      }
      if ((e.key.toLowerCase() === "e" || e.key === " ") && !e.repeat)
        useAdventure.getState().interact();
    };
    const keyUp = (e: KeyboardEvent) => state.keys.delete(e.key.toLowerCase());
    const blur = () => {
      state.keys.clear();
      state.path = [];
      state.interactAtEnd = false;
      state.wildTargetId = null;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    const unsubscribe = useAdventure.subscribe((s, prev) => {
      if (
        s.panel !== prev.panel ||
        s.battle !== prev.battle ||
        s.dialog !== prev.dialog
      ) {
        state.keys.clear();
        state.path = [];
        state.interactAtEnd = false;
        state.target = null;
        state.wildTargetId = null;
      }
    });
    const draw = (time: number) => {
      const s = useAdventure.getState(),
        save = s.save,
        world = getWorld(save?.zone ?? "willowfen");
      const sx = save?.x ?? 20,
        sy = save?.y ?? 15;
      if (lastZone !== world.zone.id || !initialized) {
        px = sx * TILE + TILE / 2;
        py = sy * TILE + TILE / 2;
        playerWalkDistance = 0;
        lastZone = world.zone.id;
        wildVisuals.clear();
        state.wildPositions.clear();
        state.path = [];
        state.interactAtEnd = false;
        state.target = null;
        state.wildTargetId = null;
        initialized = true;
        state.camera = { x: px - w / 2, y: py - h / 2 };
      }
      const enabled = save && s.panel === "adventure" && !s.battle && !s.dialog;
      if (!enabled) {
        const elapsed = Math.max(0, time - lastDrawTime);
        for (const visual of wildVisuals.values()) visual.startedAt += elapsed;
      }
      lastDrawTime = time;
      const liveIds = new Set(s.spawns.map((wild) => wild.id));
      for (const id of wildVisuals.keys()) if (!liveIds.has(id)) {
        wildVisuals.delete(id);
        state.wildPositions.delete(id);
      }
      if (enabled && time - lastStep > (state.keys.has("shift") ? 90 : 155)) {
        let dx = 0,
          dy = 0;
        if (state.keys.has("w") || state.keys.has("arrowup")) dy = -1;
        else if (state.keys.has("s") || state.keys.has("arrowdown")) dy = 1;
        else if (state.keys.has("a") || state.keys.has("arrowleft")) dx = -1;
        else if (state.keys.has("d") || state.keys.has("arrowright")) dx = 1;
        else if (state.path.length) {
          const next = state.path.shift()!;
          dx = next.x - sx;
          dy = next.y - sy;
        }
        if (dx || dy) {
          if (Math.abs(dx) + Math.abs(dy) === 1) s.move(dx, dy);
          lastStep = time;
        } else if (state.interactAtEnd) {
          state.interactAtEnd = false;
          s.interact();
          state.wildTargetId = null;
        }
      }
      const moving =
        Math.abs(px - (sx * TILE + TILE / 2)) +
          Math.abs(py - (sy * TILE + TILE / 2)) >
        1;
      const movementEase = reducedMotion ? 1 : 0.24;
      const previousX = px, previousY = py;
      px += (sx * TILE + TILE / 2 - px) * movementEase;
      py += (sy * TILE + TILE / 2 - py) * movementEase;
      if (enabled && moving)
        playerWalkDistance += Math.hypot(px - previousX, py - previousY);
      const zoom = Math.max(
        w < 600 ? 1 : 1.2,
        w / (world.width * TILE),
        h / (world.height * TILE),
      );
      state.zoom = zoom;
      const vw = w / zoom,
        vh = h / zoom;
      const cx = Math.max(0, Math.min(world.width * TILE - vw, px - vw / 2)),
        cy = Math.max(0, Math.min(world.height * TILE - vh, py - vh / 2));
      const cameraEase = reducedMotion ? 1 : 0.1;
      state.camera.x += (cx - state.camera.x) * cameraEase;
      state.camera.y += (cy - state.camera.y) * cameraEase;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));
      ctx.imageSmoothingEnabled = true;
      const scene = landscape(world);
      ctx.drawImage(scene.ground, 0, 0);
      const animationTime = reducedMotion ? 0 : time;
      const items: DepthItem[] = [...scene.scenery];
      const labels: (() => void)[] = [];
      for (const p of world.pickups)
        if (!save?.collected.includes(p.id)) {
          const x = p.x * TILE + 16, y = p.y * TILE + 16;
          items.push({ x: x - 16, y: y + 12, width: 32, height: 36,
            draw: (c) => drawPickup(c, x, y, animationTime) });
        }
      for (const n of world.npcs) {
        const x = n.x * TILE + 16, y = n.y * TILE + 16;
        items.push({ x: x - 16, y: y + 13, width: 32, height: 60, draw: (c) => {
          drawPerson(c, x, y, "down", animationTime, false, n.color, true);
        }});
        labels.push(() => {
          const bubbleY = y - 46;
          ctx.fillStyle = "#fff4d9";
          ctx.beginPath(); ctx.ellipse(x, bubbleY, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#b4b18a"; ctx.lineWidth = 1; ctx.stroke();
          ctx.font = "600 11px system-ui"; ctx.fillStyle = "#7b8059"; ctx.textAlign = "center";
          ctx.fillText("!", x, bubbleY + 4);
        });
      }
      for (const wild of s.spawns) {
        const targetX = wild.x * TILE + 16, targetY = wild.y * TILE + 16;
        let visual = wildVisuals.get(wild.id);
        if (!visual) {
          visual = { fromX: targetX, fromY: targetY, targetX, targetY, startedAt: time - stepDuration, facing: 1 };
          wildVisuals.set(wild.id, visual);
        } else if (visual.targetX !== targetX || visual.targetY !== targetY) {
          const previousEase = easeStep(stepProgress(visual.startedAt, time));
          visual.fromX += (visual.targetX - visual.fromX) * previousEase;
          visual.fromY += (visual.targetY - visual.fromY) * previousEase;
          if (targetX !== visual.targetX) visual.facing = targetX > visual.targetX ? 1 : -1;
          visual.targetX = targetX; visual.targetY = targetY; visual.startedAt = time;
        }
        const progress = reducedMotion ? 1 : stepProgress(visual.startedAt, time);
        const ease = easeStep(progress);
        const x = visual.fromX + (visual.targetX - visual.fromX) * ease;
        const y = visual.fromY + (visual.targetY - visual.fromY) * ease;
        const hop = reducedMotion ? 0 : Math.sin(progress * Math.PI) * 3;
        const tilt = reducedMotion ? 0 : Math.sin(progress * Math.PI * 2) * .035;
        const facing = visual.facing;
        const size = wild.alpha ? 56 : 48;
        const img = spriteImage(wild.species);
        const imageScale = img.naturalWidth && img.naturalHeight
          ? Math.min(size / img.naturalWidth, size / img.naturalHeight) : 1;
        const imageWidth = img.naturalWidth ? img.naturalWidth * imageScale : size;
        const imageHeight = img.naturalHeight ? img.naturalHeight * imageScale : size;
        state.wildPositions.set(wild.id, { x, y: y + 12 - hop, width: imageWidth, height: imageHeight });
        items.push({ x: x - size / 2 - 8, y: y + 13, width: size + 16, height: size + 20, draw: (c) => {
          c.save(); c.translate(x + 3, y + 10); c.scale(1, .35);
          const shade = c.createRadialGradient(0, 0, 1, 0, 0, 17);
          shade.addColorStop(0, "#38584042"); shade.addColorStop(1, "#38584000");
          c.fillStyle = shade; c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.fill(); c.restore();
          if (img.complete && img.naturalWidth && img.naturalHeight) {
            c.save(); c.translate(x, y + 12 - hop); c.scale(facing, 1); c.rotate(tilt);
            if (wild.shiny) c.filter = SHINY_FILTER;
            c.drawImage(img, -imageWidth / 2, -imageHeight, imageWidth, imageHeight);
            c.restore();
          }
        }});
        labels.push(() => {
          if (wild.shiny || wild.alpha) {
            ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
            ctx.fillStyle = wild.shiny ? "#ffde69" : "#ef9b8e";
            ctx.strokeStyle = "#49394b"; ctx.lineWidth = 3;
            const mark = `${wild.shiny ? "✦" : ""}${wild.alpha ? "α" : ""}`;
            ctx.strokeText(mark, x + 20, y - 25); ctx.fillText(mark, x + 20, y - 25);
          }
          if (Math.abs(wild.x - sx) + Math.abs(wild.y - sy) < 5) {
            ctx.font = "600 9px system-ui"; ctx.textAlign = "center";
            const label = `${traitLabel(wild)} ${wild.species} · Lv.${wild.level}`.trim(), tw = ctx.measureText(label).width;
            ctx.fillStyle = "#fcf7e7ed";
            ctx.beginPath(); ctx.roundRect(x - tw / 2 - 7, y - 52, tw + 14, 16, 6); ctx.fill();
            ctx.fillStyle = "#47634b"; ctx.fillText(label, x, y - 41);
          }
        });
      }
      items.push({ x: px - 18, y: py + 13, width: 36, height: 58,
        // One alternating footfall per tile; faster travel naturally speeds the gait.
        draw: (c) => drawPerson(c, px, py, s.direction, playerWalkDistance * Math.PI / TILE * 80, !!enabled && moving && !reducedMotion) });
      // All scenery and actors share a foot-position painter order, so walking
      // behind a tree or cottage feels like moving through a small diorama.
      items.sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
      for (const item of items) {
        if (item.x + item.width < state.camera.x - 24 || item.x > state.camera.x + vw + 24 ||
            item.y < state.camera.y - 24 || item.y - item.height > state.camera.y + vh + 24) continue;
        item.draw(ctx);
      }
      labels.forEach((label) => label());
      if (state.target && state.path.length) {
        ctx.strokeStyle = "#fff5cf";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          state.target.x * TILE + 16,
          state.target.y * TILE + 18,
          9 + (reducedMotion ? 0 : Math.sin(time / 150) * 2),
          5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      // Quiet sunlit motes are disabled for reduced-motion preferences.
      for (let i = 0; !reducedMotion && i < 15; i++) {
        const x = (i * 103 + time / 70) % (world.width * TILE),
          y = (i * 73 + Math.sin(time / 3000 + i) * 20) % (world.height * TILE);
        ctx.fillStyle = "#fff5c66b";
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const roaming = setInterval(() => {
      const s = useAdventure.getState();
      if (!s.save) return;
      const active = !s.battle && !s.dialog && s.panel === "adventure" && !document.hidden;
      const spawns = roamCreatures(
        getWorld(s.save.zone), s.spawns, s.save, performance.now(), roamSchedule,
        active, Math.random, state.wildTargetId,
      );
      if (spawns !== s.spawns) useAdventure.setState({ spawns });
    }, 100);
    const replenishing = setInterval(() => {
      const s = useAdventure.getState();
      if (s.save && !s.battle && !s.dialog && s.panel === "adventure" && !document.hidden) s.replenish();
    }, 4500);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      motionPreference.removeEventListener("change", updateMotion);
      unsubscribe();
      clearInterval(roaming);
      clearInterval(replenishing);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const click = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const s = useAdventure.getState();
    if (!s.save || s.battle || s.dialog) return;
    const state = input.current,
      bounds = event.currentTarget.getBoundingClientRect();
    const worldX = (event.clientX - bounds.left) / state.zoom + state.camera.x;
    const worldY = (event.clientY - bounds.top) / state.zoom + state.camera.y;
    // Click the visible moving artwork, then approach its authoritative tile.
    const visibleWild = s.spawns.find((wild) => {
      const position = state.wildPositions.get(wild.id);
      return position && Math.abs(worldX - position.x) <= position.width / 2 &&
        worldY >= position.y - position.height && worldY <= position.y;
    });
    const target = visibleWild
      ? { x: visibleWild.x, y: visibleWild.y }
      : { x: Math.floor(worldX / TILE), y: Math.floor(worldY / TILE) };
    const world = getWorld(s.save.zone),
      building = world.buildings.find(
        (b) =>
          target.x >= b.x &&
          target.x < b.x + b.w &&
          target.y >= b.y &&
          target.y < b.y + b.h,
      );
    let dest = building
      ? {
          x: building.x + Math.floor(building.w / 2),
          y: building.y + building.h + 1,
        }
      : target;
    const clickedWild = visibleWild ?? s.spawns.find((n) => n.x === target.x && n.y === target.y);
    const entity =
      world.npcs.some((n) => n.x === target.x && n.y === target.y) ||
      !!clickedWild;
    if (entity) {
      const options = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]
        .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
        .filter((p) => walkable(world, p.x, p.y));
      options.sort(
        (a, b) =>
          Math.abs(a.x - s.save!.x) +
          Math.abs(a.y - s.save!.y) -
          (Math.abs(b.x - s.save!.x) + Math.abs(b.y - s.save!.y)),
      );
      dest =
        options.find(
          (p) =>
            (p.x === s.save!.x && p.y === s.save!.y) ||
            findPath(world, s.save!, p).length > 0,
        ) ?? target;
    }
    const path = findPath(world, s.save, dest);
    state.path = path;
    state.target = dest;
    state.wildTargetId = clickedWild?.id ?? null;
    state.interactAtEnd =
      !!(building || entity) &&
      (path.length > 0 || (dest.x === s.save.x && dest.y === s.save.y));
    if (!state.interactAtEnd) state.wildTargetId = null;
  };
  return (
    <div
      ref={containerRef}
      className={`world-canvas ${full ? "expanded" : ""}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={click}
        aria-label="Explorable world. Use WASD or arrow keys to walk, E to interact. You can also click the map to walk."
        tabIndex={0}
      />
      <button
        className="canvas-expand"
        aria-label={full ? "Exit expanded map" : "Expand map"}
        onClick={() => setFull(!full)}
      >
        <Expand size={17} />
      </button>
      <div className="world-vignette" />
      <div
        className="area-minimap"
        aria-label={`Local map of ${world.zone.name}`}
      >
        <div
          style={{
            aspectRatio: `${world.width} / ${world.height}`,
            width: `${Math.min(106, (106 * world.width) / world.height)}px`,
          }}
        >
          <img src={miniMap} alt="Local terrain and paths" />
          <i
            className="minimap-player"
            style={{
              left: `${(((save?.x ?? world.spawn.x) + 0.5) / world.width) * 100}%`,
              top: `${(((save?.y ?? world.spawn.y) + 0.5) / world.height) * 100}%`,
            }}
          />
          {world.zone.exits.map((exit) => {
            const p = exitPoint(world.zone, exit, 1);
            return (
              <button
                key={exit.direction}
                title={`${exit.direction}: ${zoneById(exit.target).name}`}
                aria-label={`Walk ${exit.direction} to ${zoneById(exit.target).name}`}
                style={{
                  left: `${((p.x + 0.5) / world.width) * 100}%`,
                  top: `${((p.y + 0.5) / world.height) * 100}%`,
                }}
                onClick={() => {
                  if (!save) return;
                  input.current.path = findPath(
                    world,
                    save,
                    exitPoint(world.zone, exit),
                  );
                  input.current.target = exitPoint(world.zone, exit);
                  input.current.interactAtEnd = false;
                  input.current.wildTargetId = null;
                }}
              >
                {
                  { north: "↑", south: "↓", east: "→", west: "←" }[
                    exit.direction
                  ]
                }
              </button>
            );
          })}
        </div>
        <span>
          {world.width} × {world.height} · LOCAL MAP
        </span>
      </div>
      {hint && (
        <button
          className="interaction-hint"
          onClick={() => useAdventure.getState().interact()}
        >
          <kbd>E</kbd>
          {hint}
        </button>
      )}
      <div className="touch-controls" aria-label="Movement controls">
        {[
          ["up", ArrowUp, "w"],
          ["left", ArrowLeft, "a"],
          ["down", ArrowDown, "s"],
          ["right", ArrowRight, "d"],
        ].map(([dir, Icon, key]) => {
          const I = Icon as typeof ArrowUp;
          return (
            <button
              key={String(dir)}
              className={`dpad-${dir}`}
              aria-label={`Walk ${dir}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.current.path = [];
                input.current.wildTargetId = null;
                input.current.keys.add(String(key));
              }}
              onPointerUp={() => input.current.keys.delete(String(key))}
              onPointerCancel={() => input.current.keys.delete(String(key))}
            >
              <I size={20} />
            </button>
          );
        })}
        <button
          className="dpad-action"
          aria-label="Interact"
          onClick={() => useAdventure.getState().interact()}
        >
          <Hand size={21} />
        </button>
      </div>
    </div>
  );
}
