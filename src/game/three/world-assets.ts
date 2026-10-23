import * as THREE from "three";
import kit from "../../../assets/models/world/world-kit.json" with { type: "json" };
import { reusableGeometry } from "./primitives.ts";
import type { WorldBuilding } from "../worlds/types.ts";

export type WorldAssetName = keyof typeof kit.assets;
type AssetOptions = { roof?: string; flower?: string; shadow?: boolean };
const assets = new Map(
  Object.entries(kit.assets).map(([name, meshes]) => [
    name,
    meshes.map((mesh) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
      geometry.setIndex(mesh.indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return { geometry: reusableGeometry(geometry), material: mesh.material };
    }),
  ]),
);

function material(name: string, options: AssetOptions) {
  const source = kit.materials[name as keyof typeof kit.materials];
  const mat = new THREE.MeshStandardMaterial({ ...source, name });
  if (options.roof && name.startsWith("roof")) {
    mat.color.set(options.roof);
    if (name === "roof_light") mat.color.offsetHSL(0, -0.02, 0.045);
    if (name === "roof_dark") mat.color.offsetHSL(0, -0.01, -0.065);
  }
  if (options.flower && name === "petal") mat.color.set(options.flower);
  // Folded leaf geometry remains volumetric when viewed from either side.
  if (name.startsWith("leaf")) mat.side = THREE.DoubleSide;
  return mat;
}

export function createWorldAsset(name: WorldAssetName, options: AssetOptions = {}) {
  const root = new THREE.Group();
  root.name = name;
  for (const batch of assets.get(name)!) {
    const mesh = new THREE.Mesh(batch.geometry, material(batch.material, options));
    mesh.name = `${name}_${batch.material}`;
    mesh.castShadow = options.shadow !== false;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

/** Repeated scenery shares baked geometry and one draw per material per chunk. */
export function instanceWorldAsset(
  parent: THREE.Object3D,
  name: WorldAssetName,
  transforms: THREE.Matrix4[],
  options: AssetOptions = {},
) {
  const meshes: THREE.InstancedMesh[] = [];
  if (!transforms.length) return meshes;
  for (const batch of assets.get(name)!) {
    const mesh = new THREE.InstancedMesh(
      batch.geometry,
      material(batch.material, options),
      transforms.length,
    );
    mesh.name = `${name}_${batch.material}`;
    transforms.forEach((transform, i) => mesh.setMatrixAt(i, transform));
    mesh.castShadow = options.shadow !== false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

export function createWorldBuilding(building: WorldBuilding) {
  const root = createWorldAsset("cottage", { roof: building.roof });
  root.name = building.name;
  root.scale.set(building.halfWidth / 2.875, 1, building.halfDepth / 2.3);
  const sign = building.service === "heal" ? "heal-sign"
    : building.service === "shop" ? "shop-awning"
    : building.service === "gym" ? "guild-sign"
    : building.service === "champion" ? "champion-sign" : null;
  if (sign) root.add(createWorldAsset(sign));
  return root;
}

export function createWorldLandmark(kind: string) {
  if (kind === "oak") {
    const root = createWorldAsset("tree-trunk");
    const crown = createWorldAsset("tree-crown");
    crown.position.y = 3;
    root.add(crown);
    root.scale.setScalar(1.2);
    return root;
  }
  return createWorldAsset((kind in kit.assets ? kind : "bench") as WorldAssetName);
}
