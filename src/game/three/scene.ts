import * as THREE from "three";
import { useCameraSettings } from "../CameraControls";
import { steer } from "./movement.ts";
import { createCreature, createExplorer, createResidentExplorer } from "./creatures.ts";
import type { CreatureModel } from "./creatures.ts";
import { speciesData } from "./catalog.ts";
import { createIslandLandscape } from "./island-landscape.ts";
import { createModelStage } from "./model-stage.ts";
import { hasBlenderCreature, loadBlenderCreature } from "./blender-creatures.ts";
import { disposeObject, makeLabel } from "./resources.ts";
import { useAdventure } from "../store";
import { worldById, defaultWorldId } from "../worlds/registry.ts";
import {
  canStand,
  moveFreely,
  groundHeight,
  terrainHeight,
  nearestPlace,
} from "../worlds/geography.ts";
import { distance, hashRandom } from "../worlds/geometry.ts";
import type { WorldPoint, OpenWorldPosition } from "../worlds/types.ts";
import { toon } from "./primitives.ts";
import { createWorldAsset } from "./world-assets.ts";
export type FieldState = {
  x: number;
  z: number;
  heading: number;
  worldId: string;
  placeId: string;
  placeName: string;
  near: string | null;
  nearWild: string | null;
  moving: boolean;
  overview: boolean;
};
export type FieldOptions = {
  onState: (state: FieldState) => void;
  onInspect: (name: string | null) => void;
  onModelError?: (message: string) => void;
};
export type FieldController = {
  interact: () => void;
  toggleOverview: () => void;
  inspect: (name: string | null) => void;
  dispose: () => void;
};
type Actor = {
  model: CreatureModel;
  label: THREE.Sprite;
  species: string;
  shiny: boolean;
  alpha: boolean;
  heading: number;
  home: WorldPoint;
  target: WorldPoint;
  nextStep: number;
};
export function createField(
  canvas: HTMLCanvasElement,
  options: FieldOptions,
): FieldController {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(48, 1, 0.06, 400);
  scene.background = new THREE.Color("#d5e3d8");
  scene.fog = new THREE.Fog("#d5e3d8", 100, 230);
  scene.add(new THREE.HemisphereLight("#fff2d2", "#7d986b", 1.55));
  const sun = new THREE.DirectionalLight("#ffefc9", 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -24,
    right: 24,
    top: 24,
    bottom: -24,
    near: 1,
    far: 85,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  let world = worldById(
      useAdventure.getState().save?.openWorld?.worldId ?? defaultWorldId,
    ),
    landscape = createIslandLandscape(world);
  scene.add(landscape.root);
  canvas.dataset.worldId = world.id;
  canvas.dataset.sceneId = landscape.root.uuid;
  const actorsRoot = new THREE.Group();
  scene.add(actorsRoot);
  const explorer = createExplorer();
  actorsRoot.add(explorer.root);
  const player = new THREE.Vector3(),
    lookAt = new THREE.Vector3(),
    cameraGoal = new THREE.Vector3(),
    goal = new THREE.Vector3();
  const keys = new Set<string>(),
    moveKeys = new Set([
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ]),
    wildActors = new Map<string, Actor>(),
    npcActors = new Map<string, CreatureModel>(),
    pickups = new Map<string, THREE.Group>();
  const rng = hashRandom(world.seed + 7),
    motion = matchMedia("(prefers-reduced-motion: reduce)");
  let heading = -Math.PI + 0.2,
    frame = 0,
    lastTime = 0,
    time = 0,
    lastReport = 0,
    lastPersist = 0,
    travelled = 0,
    inspect: string | null = null,
    near: string | null = null,
    nearWild: string | null = null,
    overview = false;
  let companion: Actor | null = null,
    stage: ReturnType<typeof createModelStage> | null = null,
    lastStored: OpenWorldPosition | undefined =
      useAdventure.getState().save?.openWorld;
  const enabled = () => {
    const s = useAdventure.getState();
    return (
      !!s.save &&
      s.panel === "adventure" &&
      !s.battle &&
      !s.dialog &&
      !inspect &&
      !document.hidden
    );
  };
  const clear = () => {
    keys.clear();
  };
  const persist = () => {
    if (!useAdventure.getState().save || inspect) return;
    useAdventure
      .getState()
      .updateOpenWorld(
        { worldId: world.id, x: player.x, z: player.z },
        travelled,
      );
    travelled = 0;
    lastPersist = performance.now();
    lastStored = useAdventure.getState().save?.openWorld;
  };
  const resetPlayer = () => {
    const save = useAdventure.getState().save,
      place = world.places.find((p) => p.id === save?.zone);
    let point =
      save?.openWorld?.worldId === world.id
        ? save.openWorld
        : !place || place.id === "willowfen"
          ? world.spawn
          : place;
    if (!canStand(world, point)) {
      point = world.spawn;
    }
    player.set(point.x, groundHeight(world, point.x, point.z), point.z);
    lookAt.copy(player).y += 0.9;
    clear();
    if (companion) companion.model.root.position.copy(player);
  };
  resetPlayer();
  const actor = (
    name: string,
    traits: { shiny?: boolean; alpha?: boolean },
    home: WorldPoint,
    labelText: string,
  ): Actor => {
    const model = createCreature(name, traits),
      label = makeLabel(
        labelText,
        Math.max(1.35, Math.min(2.7, speciesData[name].height + 1)),
      );
    label.position.set(
      0,
      speciesData[name].height * (traits.alpha ? 1.2 : 1) + 0.4,
      0,
    );
    model.root.add(label);
    model.root.position.set(
      home.x,
      groundHeight(world, home.x, home.z),
      home.z,
    );
    model.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.receiveShadow = false;
    });
    actorsRoot.add(model.root);
    return {
      model,
      label,
      species: name,
      shiny: !!traits.shiny,
      alpha: !!traits.alpha,
      heading: 0,
      home: { ...home },
      target: { ...home },
      nextStep: 0,
    };
  };
  function populate() {
    for (const model of npcActors.values()) disposeObject(model.root);
    npcActors.clear();
    for (const group of pickups.values()) disposeObject(group);
    pickups.clear();
    for (const n of world.npcs) {
      const model = createResidentExplorer();
      model.root.position.set(n.x, groundHeight(world, n.x, n.z), n.z);
      model.root.userData.target = n.id;
      model.root.traverse((o) => {
        if (o instanceof THREE.Mesh && !o.userData.outline) {
          const mat = o.material as THREE.MeshToonMaterial;
          if (["e95443", "ee5746"].includes(mat.color?.getHexString()))
            o.material = toon(n.color);
        }
      });
      const label = makeLabel(
        `${n.role === "camper" ? "⚔" : "!"} ${n.name}`,
        2.5,
      );
      label.position.set(0, 2.15, 0);
      model.root.add(label);
      actorsRoot.add(model.root);
      npcActors.set(n.id, model);
    }
    for (const p of world.pickups) {
      const g = createWorldAsset("treasure");
      g.position.set(p.x, groundHeight(world, p.x, p.z) + 0.25, p.z);
      actorsRoot.add(g);
      pickups.set(p.id, g);
    }
  }
  populate();
  let disposed = false, inspectRequest = 0;
  const requestedModels = new Map<string, Promise<void>>();
  const failedModels = new Map<string, number>();
  const requestModel = (name: string) => {
    let request = requestedModels.get(name);
    if (!request) {
      if ((failedModels.get(name) ?? 0) > performance.now()) return Promise.resolve();
      request = loadBlenderCreature(name).then(() => {
        const recovered = failedModels.delete(name);
        if (!disposed && recovered && !failedModels.size) options.onModelError?.("");
      }).catch((error: unknown) => {
        failedModels.set(name, performance.now() + 5000);
        if (!disposed) options.onModelError?.(`The model for ${name} couldn’t load. Please try again.`);
        console.error(error);
      }).finally(() => requestedModels.delete(name));
      requestedModels.set(name, request);
    }
    return request;
  };
  const setInspect = (name: string | null) => {
    const request = ++inspectRequest;
    if (name && speciesData[name] && !hasBlenderCreature(name)) {
      clear();
      void requestModel(name).then(() => {
        if (!disposed && request === inspectRequest && hasBlenderCreature(name)) setInspect(name);
      });
      return;
    }
    if (name && !speciesData[name]) return;
    if (name) persist();
    inspect = name;
    clear();
    if (stage) {
      disposeObject(stage.root);
      stage = null;
    }
    if (name) {
      stage = createModelStage(name);
      scene.add(stage.root);
    }
    landscape.root.visible = !name;
    actorsRoot.visible = !name;
    options.onInspect(name);
  };
  function interact(targetId: string) {
    persist();
    const state = useAdventure.getState();
    if (state.worldSpawns.some((w) => w.id === targetId))
      state.encounterOpenWorld(targetId);
    else state.interactOpenWorld(targetId);
  }
  const editable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    !!target.closest(
      "input,textarea,select,[contenteditable='true'],[role='textbox']",
    );
  const down = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || editable(e.target) || !enabled())
      return;
    const key = e.key.toLowerCase();
    if (moveKeys.has(key) || key === "shift") {
      e.preventDefault();
      overview = false;
      keys.add(key);
    }
    if (key === "e" && !e.repeat && near) {
      e.preventDefault();
      interact(near);
    }
    if (key === "v" && !e.repeat && nearWild) {
      e.preventDefault();
      setInspect(nearWild);
    }
  };
  const up = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keys.delete(key);
    if (
      moveKeys.has(key) &&
      ![...keys].some((k) => moveKeys.has(k)) &&
      travelled > 0
    )
      persist();
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", persist);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", clear);
  const unsubscribe = useAdventure.subscribe((s, previous) => {
    if (s.panel !== "adventure" || s.battle || s.dialog) inspectRequest++;
    if (s.panel !== "adventure" && previous.panel === "adventure") persist();
    if (
      s.panel !== previous.panel ||
      s.battle !== previous.battle ||
      s.dialog !== previous.dialog
    )
      clear();
  });
  const replenish = setInterval(() => {
    if (enabled()) useAdventure.getState().replenishOpenWorld();
  }, 12000);
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    // Retain the WebGL scene and camera while in-game pages cover the world.
    if (document.hidden || useAdventure.getState().panel !== "adventure") return;
    time += dt;
    let state = useAdventure.getState();
    const worldId = state.save?.openWorld?.worldId ?? defaultWorldId;
    if (world.id !== worldId) {
      disposeObject(landscape.root);
      world = worldById(worldId);
      landscape = createIslandLandscape(world);
      scene.add(landscape.root);
      canvas.dataset.worldId = world.id;
      canvas.dataset.sceneId = landscape.root.uuid;
      for (const a of wildActors.values()) disposeObject(a.model.root);
      wildActors.clear();
      populate();
      resetPlayer();
    }
    if (state.save?.openWorld !== lastStored) {
      lastStored = state.save?.openWorld;
      if (!lastStored || distance(lastStored, player) > 2) resetPlayer();
    }
    const before = { x: player.x, z: player.z };
    let dx = 0,
      dz = 0;
    if (enabled()) {
      const h =
          Number(keys.has("d") || keys.has("arrowright")) -
          Number(keys.has("a") || keys.has("arrowleft")),
        v =
          Number(keys.has("w") || keys.has("arrowup")) -
          Number(keys.has("s") || keys.has("arrowdown"));
      const speed = keys.has("shift") ? 6.3 : 3.2;
      if (h || v) {
        const step = steer(heading, h, v, speed, dt);
        heading = step.heading;
        dx = step.dx;
        dz = step.dz;
      }
    }
    const next = moveFreely(world, before, dx, dz);
    const moved = distance(before, next),
      moving = moved > 0.0001;
    travelled += moved;
    player.set(next.x, groundHeight(world, next.x, next.z), next.z);
    explorer.root.position.copy(player);
    explorer.root.rotation.y = heading;
    explorer.animate(motion.matches ? 0 : time, moving && !motion.matches);
    if (
      enabled() &&
      (moving || !state.save?.openWorld) &&
      now - lastPersist > 450
    )
      persist();
    state = useAdventure.getState();
    near = null;
    nearWild = null;
    let nearDistance = 2.8;
    const liveIds = new Set(state.worldSpawns.map((s) => s.id));
    for (const [id, a] of wildActors)
      if (!liveIds.has(id)) {
        disposeObject(a.model.root);
        wildActors.delete(id);
      }
    for (const wild of state.worldSpawns) {
      if (!hasBlenderCreature(wild.species)) { void requestModel(wild.species); continue; }
      let a = wildActors.get(wild.id);
      if (
        !a ||
        a.species !== wild.species ||
        a.shiny !== wild.shiny ||
        a.alpha !== wild.alpha
      ) {
        if (a) disposeObject(a.model.root);
        a = actor(
          wild.species,
          wild,
          wild,
          `${wild.shiny ? "✦ " : ""}${wild.alpha ? "α " : ""}${wild.species} · Lv.${wild.level}`,
        );
        a.model.root.userData.target = wild.id;
        wildActors.set(wild.id, a);
      }
      const range = distance(player, a.model.root.position);
      let strolling = false;
      if (enabled() && range > 4) {
        if (now > a.nextStep) {
          const angle = rng() * Math.PI * 2,
            radius = rng() * wild.roamRadius;
          a.target = {
            x: a.home.x + Math.sin(angle) * radius,
            z: a.home.z + Math.cos(angle) * radius,
          };
          a.nextStep = now + 2200 + rng() * 3000;
        }
        const len = distance(a.model.root.position, a.target);
        if (len > 0.08) {
          const amount = Math.min(len, dt * 0.55),
            next = moveFreely(
              world,
              a.model.root.position,
              ((a.target.x - a.model.root.position.x) / len) * amount,
              ((a.target.z - a.model.root.position.z) / len) * amount,
            );
          strolling = distance(next, a.model.root.position) > 0.001;
          if (strolling)
            a.heading = Math.atan2(
              next.x - a.model.root.position.x,
              next.z - a.model.root.position.z,
            );
          a.model.root.position.set(
            next.x,
            groundHeight(world, next.x, next.z),
            next.z,
          );
        }
      } else if (range < 4)
        a.heading = Math.atan2(
          player.x - a.model.root.position.x,
          player.z - a.model.root.position.z,
        );
      const turn = Math.atan2(
        Math.sin(a.heading - a.model.root.rotation.y),
        Math.cos(a.heading - a.model.root.rotation.y),
      );
      a.model.root.rotation.y += turn * Math.min(1, dt * 5);
      a.model.animate(motion.matches ? 0 : time, strolling && !motion.matches);
      a.label.visible = range < 13;
      if (range < nearDistance) {
        nearDistance = range;
        near = wild.id;
        nearWild = wild.species;
      }
    }
    for (const n of world.npcs) {
      const d = distance(n, player),
        model = npcActors.get(n.id)!;
      model.root.children.forEach((child) => {
        if (child instanceof THREE.Sprite) child.visible = d < 20;
      });
      if (d < 3 && d < nearDistance) {
        near = n.id;
        nearDistance = d;
      }
    }
    for (const b of world.buildings) {
      const d = distance(b.door, player);
      if (d < 3 && d < nearDistance) {
        near = b.id;
        nearDistance = d;
      }
    }
    for (const [id, g] of pickups) {
      g.visible = !state.save?.collected.includes(id);
      if (!motion.matches) g.rotation.y = time * 0.7;
      if (g.visible && enabled() && distance(g.position, player) < 0.85) {
        const save = useAdventure.getState().save!;
        useAdventure.setState({
          save: {
            ...save,
            collected: [...save.collected, id],
            balls: save.balls + 2,
            potions: save.potions + 1,
          },
          notice: "A little trail treasure! +2 capture orbs · +1 potion",
        });
      }
    }
    const lead = state.save?.party.find((c) => c.hp > 0);
    if (lead && !hasBlenderCreature(lead.species)) void requestModel(lead.species);
    if (lead && hasBlenderCreature(lead.species)) {
      if (
        !companion ||
        companion.species !== lead.species ||
        companion.shiny !== lead.shiny ||
        companion.alpha !== lead.alpha
      ) {
        if (companion) disposeObject(companion.model.root);
        companion = actor(
          lead.species,
          lead,
          player,
          `${lead.species} · ${speciesData[lead.species].height.toFixed(2)} m`,
        );
      }
      const target = {
        x: player.x - Math.sin(heading) * 1.15 + 0.35,
        z: player.z - Math.cos(heading) * 1.15,
      };
      if (!canStand(world, target)) {
        target.x = player.x;
        target.z = player.z;
      }
      const f = motion.matches ? 1 : 1 - Math.exp(-dt * 5),
        x =
          companion.model.root.position.x +
          (target.x - companion.model.root.position.x) * f,
        z =
          companion.model.root.position.z +
          (target.z - companion.model.root.position.z) * f;
      companion.model.root.position.set(x, groundHeight(world, x, z), z);
      companion.model.root.rotation.y = heading;
      companion.model.animate(
        motion.matches ? 0 : time,
        moving && !motion.matches,
      );
    } else if (companion) {
      disposeObject(companion.model.root);
      companion = null;
    }
    const center = stage
      ? stage.center
      : goal.set(
          player.x + Math.sin(heading) * 0.7,
          player.y + 0.9,
          player.z + Math.cos(heading) * 0.7,
        );
    lookAt.copy(center);
    const settings = useCameraSettings.getState();
    const yaw = stage ? 0.58 : heading + Math.PI;
    const pitch = stage ? 1.22 : Math.PI / 2 - settings.tilt * Math.PI / 180;
    const radius = stage
      ? stage.radius * Math.max(1, 1 / camera.aspect)
      : settings.distance;
    cameraGoal.set(
      lookAt.x + Math.sin(yaw) * Math.sin(pitch) * radius,
      lookAt.y + Math.cos(pitch) * radius,
      lookAt.z + Math.cos(yaw) * Math.sin(pitch) * radius,
    );
    if (!stage)
      cameraGoal.y = Math.max(
        cameraGoal.y,
        terrainHeight(world, cameraGoal.x, cameraGoal.z) + 0.7,
      );
    if (overview && !stage) {
      cameraGoal.set(0, world.size * 1.15, world.size * 0.75);
      lookAt.set(0, 0, 0);
      scene.fog = new THREE.Fog("#d5e3d8", world.size * 1.4, world.size * 3);
    } else if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = 100;
      scene.fog.far = 230;
    }
    const overviewCamera = overview && !stage,
      nearPlane = overviewCamera ? 100 : 0.06,
      farPlane = overviewCamera ? world.size * 3 : 400;
    if (camera.near !== nearPlane || camera.far !== farPlane) {
      camera.near = nearPlane;
      camera.far = farPlane;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(cameraGoal);
    camera.lookAt(lookAt);
    if (!stage)
      landscape.update(
        player,
        camera.position,
        player.clone().add(new THREE.Vector3(0, 1, 0)),
      );
    else stage.animate(motion.matches ? 0 : time);
    const lightAt = stage ? stage.center : player;
    sun.position.set(lightAt.x - 15, lightAt.y + 28, lightAt.z + 14);
    sun.target.position.copy(lightAt);
    if (now - lastReport > 100) {
      lastReport = now;
      const place = nearestPlace(world, player);
      options.onState({
        x: player.x,
        z: player.z,
        heading: yaw,
        worldId: world.id,
        placeId: place.id,
        placeName: place.name,
        near,
        nearWild,
        moving,
        overview,
      });
    }
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);
  return {
    toggleOverview() {
      overview = !overview;
      clear();
    },
    interact: () => {
      if (near) interact(near);
    },
    inspect: setInspect,
    dispose() {
      disposed = true;
      inspectRequest++;
      persist();
      cancelAnimationFrame(frame);
      clearInterval(replenish);
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", persist);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      disposeObject(scene);
      renderer.dispose();
    },
  };
}
