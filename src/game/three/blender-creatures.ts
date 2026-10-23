import * as THREE from "three";
import { reusableGeometry, toon } from "./primitives.ts";
import type { CreatureModel } from "./creatures.ts";
import { speciesData } from "./catalog.ts";

type PackedMesh = {
  color: string;
  opacity?: number;
  emission?: number;
  min: number[];
  extent: number[];
  positions: string;
  normals: string;
  indices: string;
  indexType: string;
};
export type AuthoredModel = {
  name: string;
  reference: string | null;
  nodes: {
    name: string;
    parent: string | null;
    position: number[];
    meshes: PackedMesh[];
  }[];
};
const models = new Map<string, AuthoredModel>();
const pending = new Map<string, Promise<void>>();

export function registerBlenderCreature(data: AuthoredModel) {
  if (!speciesData[data.name] || !data.nodes.some((node) => node.name === "body")) {
    throw new Error(`Invalid Blender creature: ${data.name}`);
  }
  models.set(data.name, data);
}
export function hasBlenderCreature(name: string) { return models.has(name); }
export function loadBlenderCreature(name: string): Promise<void> {
  if (models.has(name)) return Promise.resolve();
  if (!speciesData[name]) return Promise.reject(new Error(`Unknown creature: ${name}`));
  const existing = pending.get(name);
  if (existing) return existing;
  const slug = name.toLowerCase();
  const url = new URL(`../../../assets/models/creatures/${slug}.json`, import.meta.url);
  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
    const data = await response.json() as AuthoredModel;
    if (data.name !== name) throw new Error(`Wrong Blender asset for ${name}`);
    registerBlenderCreature(data);
  }).finally(() => pending.delete(name));
  pending.set(name, request);
  return request;
}
const geometryCache = new Map<string, { surface: THREE.BufferGeometry; outline: THREE.BufferGeometry }[][]>();
const authoredPalette = new Map<string, THREE.MeshToonMaterial>();
function authoredMaterial({ color, opacity = 1, emission = 0 }: PackedMesh) {
  const key = `${color}:${opacity}:${emission}`;
  let material = authoredPalette.get(key);
  if (!material) {
    material = toon(color).clone();
    // Wing membranes and painted mesh details must be visible from either side.
    material.side = THREE.DoubleSide;
    material.opacity = opacity;
    material.transparent = opacity < 1;
    material.depthWrite = opacity === 1;
    material.emissive.set(color);
    material.emissiveIntensity = emission;
    authoredPalette.set(key, material);
  }
  return material;
}
const outlineMaterial = new THREE.MeshBasicMaterial({ color: "#30372e", side: THREE.BackSide });

function outlinedGeometry(mesh: PackedMesh, thickness: number) {
  const surface = decodeGeometry(mesh);
  const outline = new THREE.BufferGeometry();
  const position = surface.getAttribute("position");
  const normal = surface.getAttribute("normal");
  const expanded = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    expanded[i * 3] = position.getX(i) + normal.getX(i) * thickness;
    expanded[i * 3 + 1] = position.getY(i) + normal.getY(i) * thickness;
    expanded[i * 3 + 2] = position.getZ(i) + normal.getZ(i) * thickness;
  }
  outline.setAttribute("position", new THREE.BufferAttribute(expanded, 3));
  outline.setIndex(surface.getIndex());
  return { surface, outline: reusableGeometry(outline) };
}

function bytes(encoded: string) {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function decodeGeometry(mesh: PackedMesh) {
  const packedPositions = bytes(mesh.positions);
  const quantized = new DataView(packedPositions.buffer);
  const positions = new Float32Array(packedPositions.length / 2);
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    positions[i] = mesh.min[axis] + (quantized.getUint16(i * 2, true) / 65535) * mesh.extent[axis];
  }
  const packedNormals = bytes(mesh.normals);
  const normals = new Int8Array(packedNormals.buffer);
  const packedIndices = bytes(mesh.indices);
  const indexView = new DataView(packedIndices.buffer);
  const indexSize = mesh.indexType === "u32" ? 4 : 2;
  const indices = indexSize === 4
    ? new Uint32Array(packedIndices.length / 4)
    : new Uint16Array(packedIndices.length / 2);
  for (let i = 0; i < indices.length; i++) {
    indices[i] = indexSize === 4
      ? indexView.getUint32(i * 4, true)
      : indexView.getUint16(i * 2, true);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3, true));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return reusableGeometry(geometry);
}

export const blenderCreatureNames = Object.keys(speciesData);

export function buildBlenderCreature(name: string): CreatureModel {
  const data = models.get(name);
  if (!data) throw new Error(`Load the Blender asset before creating ${name}`);
  let geometry = geometryCache.get(name);
  if (!geometry) {
    const height = Math.max(...data.nodes.flatMap((node) => node.meshes.map((mesh) => mesh.extent[1])), 0.1);
    geometry = data.nodes.map((node) => node.meshes.map((mesh) => outlinedGeometry(mesh, height * 0.0025)));
    geometryCache.set(name, geometry);
  }
  const root = new THREE.Group();
  root.userData.modelSource = "Blender";
  root.userData.reference = data.reference;
  const joints = new Map<string, THREE.Group>();
  data.nodes.forEach((node, i) => {
    const joint = new THREE.Group();
    joint.name = node.name;
    joint.position.fromArray(node.position);
    joints.set(node.name, joint);
    (node.parent ? joints.get(node.parent)! : root).add(joint);
    node.meshes.forEach((mesh, j) => {
      const part = new THREE.Mesh(geometry![i][j].surface, authoredMaterial(mesh));
      part.name = `${node.name}_${mesh.color}`;
      part.castShadow = (mesh.opacity ?? 1) === 1;
      part.receiveShadow = true;
      // An opaque expanded shell would fill the translucent vapor silhouette.
      if ((mesh.opacity ?? 1) === 1) {
        const outline = new THREE.Mesh(geometry![i][j].outline, outlineMaterial);
        outline.name = `${part.name}_outline`;
        outline.userData.outline = true;
        part.add(outline);
      }
      joint.add(part);
    });
  });
  const body = joints.get("body")!;
  const bodyY = body.position.y;
  const height = Math.max(...data.nodes.flatMap((node) => node.meshes.map((mesh) => mesh.extent[1])), 0.1);
  return {
    root,
    animate(time, moving = false) {
      const pace = time * 8;
      body.position.y = bodyY + (moving ? Math.abs(Math.sin(pace)) * height * 0.025 : Math.sin(time * 2) * height * 0.006);
      const head = joints.get("head");
      if (head) {
        head.rotation.y = Math.sin(time * 0.8) * 0.035;
        head.rotation.z = Math.sin(time * 1.3) * 0.012;
      }
      const tail = joints.get("tail");
      if (tail) tail.rotation.y = Math.sin(time * 2.2) * (moving ? 0.2 : 0.09);
      for (const [i, side] of ["left", "right"].entries()) {
        const stride = Math.sin(pace + i * Math.PI);
        const leg = joints.get(`${side}Leg`);
        if (leg) leg.rotation.x = moving ? stride * 0.3 : 0;
        const arm = joints.get(`${side}Arm`);
        if (arm) arm.rotation.x = moving ? -stride * 0.22 : Math.sin(time * 1.7 + i) * 0.018;
        const wing = joints.get(`${side}Wing`);
        if (wing) wing.rotation.z = Math.sin(time * (moving ? 7 : 2.5)) * 0.09 * (i === 0 ? -1 : 1);
      }
    },
  };
}
