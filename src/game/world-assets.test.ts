import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import kit from "../../assets/models/world/world-kit.json" with { type: "json" };
import {
  createWorldAsset, createWorldBuilding, createWorldLandmark, instanceWorldAsset,
} from "./three/world-assets.ts";
import { disposeObject } from "./three/resources.ts";
import { worldById } from "./worlds/registry.ts";
import { canStand } from "./worlds/geography.ts";

test("the Blender kit covers every existing landmark and exports finite indexed geometry", () => {
  for (const kind of new Set(worldById().landmarks.map(l => l.kind))) {
    assert.ok(kind === "oak" || kind in kit.assets, `${kind} has a real model`);
    const landmark = createWorldLandmark(kind);
    assert.ok(new THREE.Box3().setFromObject(landmark).max.y > .2);
    disposeObject(landmark);
  }
  for (const [asset, meshes] of Object.entries(kit.assets)) for (const mesh of meshes) {
    assert.ok(mesh.material in kit.materials, `${asset} has a known material`);
    assert.equal(mesh.positions.length, mesh.normals.length);
    assert.equal(mesh.positions.length % 3, 0);
    assert.equal(mesh.indices.length % 3, 0);
    assert.ok(mesh.positions.every(Number.isFinite), `${asset} positions are finite`);
    assert.ok(mesh.normals.every(Number.isFinite), `${asset} normals are finite`);
    assert.ok(mesh.indices.every(i => Number.isInteger(i) && i >= 0 && i < mesh.positions.length / 3));
  }
});

test("all existing building doors remain walkable and service colors stay isolated", () => {
  const world = worldById();
  for (const building of world.buildings) {
    assert.ok(canStand(world, building.door), `${building.id} door stays reachable`);
    const model = createWorldBuilding(building);
    assert.equal(model.scale.x, building.halfWidth / 2.875);
    assert.equal(model.scale.z, building.halfDepth / 2.3);
    const roof = model.getObjectByName("cottage_roof") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    assert.equal(roof.material.color.getHexString(), building.roof.slice(1));
    disposeObject(model);
  }
  const first = createWorldBuilding({ ...world.buildings[0], roof: "#cf7371" });
  const second = createWorldBuilding({ ...world.buildings[0], roof: "#6c92a6" });
  const a = first.getObjectByName("cottage_roof") as THREE.Mesh;
  const b = second.getObjectByName("cottage_roof") as THREE.Mesh;
  assert.equal(a.geometry, b.geometry);
  assert.notEqual(a.material, b.material);
  disposeObject(first);
  assert.equal((b.material as THREE.MeshStandardMaterial).color.getHexString(), "6c92a6");
  disposeObject(second);
});

test("unloading instanced scenery releases its materials without disposing shared kit geometry", () => {
  const chunk = new THREE.Group();
  const transforms = [new THREE.Matrix4().makeTranslation(12, 3, 15)];
  const meshes = instanceWorldAsset(chunk, "tree-crown", transforms);
  let disposedGeometry = 0, disposedMaterials = 0;
  const onGeometryDispose = () => disposedGeometry++;
  for (const mesh of meshes) {
    mesh.geometry.addEventListener("dispose", onGeometryDispose);
    (mesh.material as THREE.Material).addEventListener("dispose", () => disposedMaterials++);
    mesh.computeBoundingSphere();
    assert.ok(mesh.boundingSphere!.center.distanceTo(new THREE.Vector3(12, 3, 15)) < 2);
  }
  disposeObject(chunk);
  assert.equal(disposedGeometry, 0);
  assert.equal(disposedMaterials, meshes.length);
  for (const mesh of meshes) mesh.geometry.removeEventListener("dispose", onGeometryDispose);
  const replacement = createWorldAsset("tree-crown");
  assert.equal((replacement.children[0] as THREE.Mesh).geometry, meshes[0].geometry);
  disposeObject(replacement);
});

test("bridge deck exports keep their walkable surface thin and their boards close together", () => {
  const plank = createWorldAsset("bridge-plank");
  const bounds = new THREE.Box3().setFromObject(plank);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - 2) < .001);
  assert.ok(size.y < .17, "deck thickness uses the Y axis");
  assert.ok(size.z > .33 && size.z < .35, "boards fit the 0.38 m spacing");
  disposeObject(plank);
});
