import * as THREE from "three";
import type { WorldDefinition, WorldPoint } from "../worlds/types.ts";
import {
  biomeWeights,
  biomeAt,
  terrainHeight,
  groundHeight,
  waterAt,
  chunkDecorations,
  CHUNK_SIZE,
  roadAt,
  shoreDistance,
} from "../worlds/geography.ts";
import { hashRandom, distance } from "../worlds/geometry.ts";
import { createWorldBuilding, createWorldLandmark, instanceWorldAsset } from "./world-assets.ts";
import { groundMaterial, trailMaterial, waterMaterial, worldUV } from "./world-surfaces.ts";
import { makeLabel, disposeObject } from "./resources.ts";
function matrix(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  angle = 0,
) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
    new THREE.Vector3(sx, sy, sz),
  );
}
function groundColor(world: WorldDefinition, x: number, z: number) {
  const shore = shoreDistance(world, x, z),
    color = new THREE.Color(world.groundColor);
  for (const { biome, weight } of biomeWeights(world, x, z))
    color.lerp(new THREE.Color(biome.color), weight);
  if (shore < 14)
    color.lerp(new THREE.Color("#dacaa0"), Math.max(0, 1 - shore / 14));
  return color.multiplyScalar(
    0.99 + Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.018,
  );
}
function terrainMesh(
  world: WorldDefinition,
  x: number,
  z: number,
  size: number,
  segments: number,
  offset = 0,
) {
  const g = new THREE.PlaneGeometry(size, size, segments, segments);
  g.rotateX(-Math.PI / 2);
  const positions = g.attributes.position,
    colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const wx = positions.getX(i) + x,
      wz = positions.getZ(i) + z;
    positions.setY(i, terrainHeight(world, wx, wz) + offset);
    const c = groundColor(world, wx, wz);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  worldUV(g, 4);
  const mesh = new THREE.Mesh(
    g,
    groundMaterial(),
  );
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  mesh.userData.ground = true;
  return mesh;
}
export function createIslandLandscape(world: WorldDefinition) {
  const root = new THREE.Group();
  root.name = `Continuous world: ${world.id}`;
  const coarse = terrainMesh(world, 0, 0, world.size + 160, 256, -1.2);
  root.add(coarse);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(world.size * 4, world.size * 4),
    waterMaterial("#7ba8aa"),
  );
  ocean.position.y = 0.01;
  ocean.geometry.rotateX(-Math.PI / 2);
  worldUV(ocean.geometry, 8);
  ocean.userData.water = true;
  root.add(ocean);
  const lakeShape = new THREE.Shape(
    world.lake.map((p) => new THREE.Vector2(p.x, -p.z)),
  );
  const lake = new THREE.Mesh(
    new THREE.ShapeGeometry(lakeShape),
    waterMaterial("#84b3ad"),
  );
  lake.position.y = 4;
  lake.geometry.rotateX(-Math.PI / 2);
  worldUV(lake.geometry, 8);
  lake.userData.water = true;
  root.add(lake);
  const riverPos: number[] = [],
    riverIndices: number[] = [];
  for (let i = 0; i < world.river.length; i++) {
    const p = world.river[i],
      prev = world.river[Math.max(0, i - 1)],
      next = world.river[Math.min(world.river.length - 1, i + 1)],
      dx = next.x - prev.x,
      dz = next.z - prev.z,
      len = Math.hypot(dx, dz) || 1,
      h = world.heightAt(p.x, p.z) - 0.8;
    riverPos.push(
      p.x - (dz / len) * 8.55,
      h,
      p.z + (dx / len) * 8.55,
      p.x + (dz / len) * 8.55,
      h,
      p.z - (dx / len) * 8.55,
    );
    if (i < world.river.length - 1) {
      const a = i * 2;
      riverIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(riverPos, 3),
  );
  riverGeometry.setIndex(riverIndices);
  riverGeometry.computeVertexNormals();
  worldUV(riverGeometry, 8);
  const river = new THREE.Mesh(
    riverGeometry,
    waterMaterial("#83b1a9"),
  );
  river.userData.water = true;
  root.add(river);
  const roadPositions: number[] = [],
    roadColors: number[] = [];
  const planks: THREE.Matrix4[] = [],
    bridgePosts: THREE.Matrix4[] = [],
    bridgeRails: THREE.Matrix4[] = [];
  for (const road of world.roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz) || 1,
        nx = ((-dz / len) * road.width) / 2,
        nz = ((dx / len) * road.width) / 2;
      const water = waterAt(world, (a.x + b.x) / 2, (a.z + b.z) / 2),
        color = new THREE.Color(water ? "#a88d66" : "#c3ae87");
      const corners: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ] = [
        [a.x + nx, a.z + nz],
        [a.x - nx, a.z - nz],
        [b.x + nx, b.z + nz],
        [b.x - nx, b.z - nz],
      ];
      // Deck boards provide the walk surface over water. A flat trail strip
      // above them would hide their joints, grain and pegs.
      if (!water) {
        for (const index of [0, 2, 1, 1, 2, 3]) {
          const [x, z] = corners[index];
          roadPositions.push(x, groundHeight(world, x, z) + 0.015, z);
          roadColors.push(color.r, color.g, color.b);
        }
      }
      if (water) {
        for (const side of [-1, 1]) {
          const inset = Math.max(0, road.width / 2 - .1),
            ox = (-dz / len) * inset * side,
            oz = (dx / len) * inset * side,
            mx = (a.x + b.x) / 2 + ox,
            mz = (a.z + b.z) / 2 + oz;
          bridgeRails.push(matrix(mx, groundHeight(world, mx, mz) + .98, mz,
            len + .04, 1, 1, -Math.atan2(dz, dx)));
          if (i % 2 === 0 || !waterAt(world, a.x, a.z)) bridgePosts.push(matrix(a.x + ox,
            groundHeight(world, a.x + ox, a.z + oz), a.z + oz, 1, 1, 1));
        }
        const count = Math.max(1, Math.ceil(len / 0.38));
        for (let j = 0; j < count; j++) {
          const t = j / count,
            x = a.x + dx * t,
            z = a.z + dz * t;
          planks.push(
            matrix(
              x,
              groundHeight(world, x, z) - 0.07,
              z,
              road.width / 2,
              1,
              1,
              Math.atan2(dx, dz),
            ),
          );
        }
      }
    }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(roadPositions, 3),
  );
  roadGeo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(roadColors, 3),
  );
  roadGeo.computeVertexNormals();
  worldUV(roadGeo, 3);
  const trails = new THREE.Mesh(
    roadGeo,
    trailMaterial(),
  );
  trails.receiveShadow = true;
  trails.userData.ground = true;
  root.add(trails);
  // Spatial batches let the camera cull remote river crossings. One island-wide
  // instance bound would draw every detailed bridge even from the village.
  for (const [name, transforms] of [
    ["bridge-plank", planks], ["bridge-post", bridgePosts], ["bridge-rail", bridgeRails],
  ] as const) {
    const batches = new Map<string, THREE.Matrix4[]>();
    for (const transform of transforms) {
      const key = `${Math.floor(transform.elements[12] / CHUNK_SIZE)}:${Math.floor(transform.elements[14] / CHUNK_SIZE)}`;
      const list = batches.get(key) ?? [];
      list.push(transform);
      batches.set(key, list);
    }
    for (const batch of batches.values()) instanceWorldAsset(root, name, batch);
  }
  const labels: {
    sprite: THREE.Sprite;
    position: WorldPoint;
    range: number;
  }[] = [];
  for (const b of world.buildings) {
    const g = createWorldBuilding(b);
    g.position.set(b.x, terrainHeight(world, b.x, b.z), b.z);
    g.userData.target = b.id;
    root.add(g);
    const sign = makeLabel(b.name, Math.min(b.halfWidth * 1.6, 4));
    // Labels are outside the scaled building so names retain their proportions.
    sign.position.set(b.x, g.position.y + 4.9, b.z);
    root.add(sign);
    labels.push({ sprite: sign, position: b, range: 45 });
  }
  for (const p of world.places) {
    const sprite = makeLabel(
      p.name,
      p.kind === "town" || p.kind === "coast" ? 5.5 : 4,
    );
    sprite.position.set(p.x, groundHeight(world, p.x, p.z) + 5, p.z - 4);
    root.add(sprite);
    labels.push({ sprite, position: p, range: 75 });
  }
  for (const l of world.landmarks) {
    const g = createWorldLandmark(l.kind);
    g.position.set(l.x, terrainHeight(world, l.x, l.z), l.z);
    root.add(g);
    const label = makeLabel(l.name, 3);
    label.position.set(l.x, g.position.y + (l.kind === "oak" ? 6.3
      : l.kind === "windmill" ? 5.8 : 2.8), l.z);
    root.add(label);
    labels.push({ sprite: label, position: l, range: 28 });
  }
  type Chunk = {
    root: THREE.Group;
    crowns: { mesh: THREE.InstancedMesh; matrices: THREE.Matrix4[] }[];
    hidden: Set<string>;
  };
  const chunks = new Map<string, Chunk>();
  let currentChunk = "";
  function buildChunk(cx: number, cz: number): Chunk {
    const chunk = new THREE.Group();
    root.add(chunk);
    chunk.add(
      terrainMesh(
        world,
        (cx + 0.5) * CHUNK_SIZE,
        (cz + 0.5) * CHUNK_SIZE,
        CHUNK_SIZE,
        24,
        0.002,
      ),
    );
    const decorations = chunkDecorations(world, cx, cz),
      trunks: THREE.Matrix4[] = [], crowns: THREE.Matrix4[] = [],
      rocks: THREE.Matrix4[] = [], flowers: THREE.Matrix4[][] = [[], [], []],
      grass: THREE.Matrix4[] = [];
    const center = { x: (cx + .5) * CHUNK_SIZE, z: (cz + .5) * CHUNK_SIZE },
      climate = biomeAt(world, center.x, center.z),
      snow = climate.biome.kind === "snow" && climate.weight > .3,
      pine = snow || (climate.biome.kind === "highland" && climate.weight > .4);
    for (const d of decorations) {
      const angle = Math.sin(d.x * 7.1 + d.z * 11.3) * Math.PI;
      if (d.kind === "tree") {
        trunks.push(matrix(d.x, d.height, d.z, d.scale, d.scale, d.scale, angle));
        crowns.push(matrix(d.x, d.height + 3 * d.scale, d.z,
          d.scale, d.scale, d.scale, angle));
      } else rocks.push(matrix(d.x, d.height, d.z,
        d.scale, d.scale, d.scale, angle));
    }
    instanceWorldAsset(chunk, "tree-trunk", trunks);
    const crownMeshes = instanceWorldAsset(chunk, snow ? "snow-pine-crown"
      : pine ? "pine-crown" : "tree-crown", crowns);
    instanceWorldAsset(chunk, snow ? "snow-rock" : "rock", rocks);
    const rng = hashRandom((cx * 83492791) ^ (cz * 2971215073) ^ world.seed);
    for (let i = 0; i < 260; i++) {
      const x = (cx + rng()) * CHUNK_SIZE,
        z = (cz + rng()) * CHUNK_SIZE;
      if (shoreDistance(world, x, z) < 4 || waterAt(world, x, z) ||
        roadAt(world, x, z).distance < 2.4 ||
        world.buildings.some(b => Math.abs(x - b.x) < b.halfWidth + .4 &&
          Math.abs(z - b.z) < b.halfDepth + .4)) continue;
      const h = terrainHeight(world, x, z), angle = rng() * Math.PI * 2,
        scale = .7 + rng() * .65;
      if (!snow) grass.push(matrix(x, h, z, scale, scale, scale, angle));
      if (!snow && i % 13 === 0) flowers[Math.floor(i / 13) % 3].push(
        matrix(x + .15, h, z, scale, scale, scale, angle));
    }
    instanceWorldAsset(chunk, "grass", grass, { shadow: false });
    flowers.forEach((list, i) => instanceWorldAsset(chunk, "flower", list,
      { flower: ["#dac28b", "#c58b9b", "#a9a0be"][i], shadow: false }));
    return { root: chunk, crowns: crownMeshes.map(mesh => ({ mesh, matrices: crowns })),
      hidden: new Set() };
  }
  function update(
    player: WorldPoint,
    camera: THREE.Vector3,
    target: THREE.Vector3,
  ) {
    const cx = Math.floor(player.x / CHUNK_SIZE),
      cz = Math.floor(player.z / CHUNK_SIZE),
      key = `${cx}:${cz}`;
    if (currentChunk !== key) {
      currentChunk = key;
      const needed = new Set<string>();
      for (let x = cx - 2; x <= cx + 2; x++)
        for (let z = cz - 2; z <= cz + 2; z++) {
          const k = `${x}:${z}`;
          needed.add(k);
          if (!chunks.has(k)) chunks.set(k, buildChunk(x, z));
        }
      for (const [k, chunk] of chunks)
        if (!needed.has(k)) {
          disposeObject(chunk.root);
          chunks.delete(k);
        }
    }
    labels.forEach(({ sprite, position, range }) => {
      sprite.visible = distance(position, player) < range;
    });
    const vx = camera.x - target.x,
      vz = camera.z - target.z,
      len = vx * vx + vz * vz;
    for (const chunk of chunks.values()) {
      const hidden = new Set<string>();
      chunk.crowns.forEach(({ mesh, matrices }, tier) => {
        let changed = false;
        matrices.forEach((m, i) => {
          const x = m.elements[12],
            y = m.elements[13],
            z = m.elements[14],
            t = len ? ((x - target.x) * vx + (z - target.z) * vz) / len : 0,
            key = `${tier}:${i}`,
            hide =
              t > 0.05 &&
              t < 1.1 &&
              Math.hypot(x - target.x - vx * t, z - target.z - vz * t) < 1.5 &&
              Math.abs(y - (target.y + (camera.y - target.y) * t)) < 1.7;
          if (hide) hidden.add(key);
          if (hide !== chunk.hidden.has(key)) {
            mesh.setMatrixAt(
              i,
              hide
                ? m
                    .clone()
                    .multiply(new THREE.Matrix4().makeScale(0.02, 0.02, 0.02))
                : m,
            );
            changed = true;
          }
        });
        if (changed) mesh.instanceMatrix.needsUpdate = true;
      });
      chunk.hidden = hidden;
    }
  }
  return { root, coarse, update };
}
