import { test } from "node:test";
import * as THREE from "three";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadBlenderCreature, hasBlenderCreature, registerBlenderCreature } from "./three/blender-creatures.ts";
import { createCreature } from "./three/creatures.ts";
import { disposeObject } from "./three/resources.ts";

test("simultaneous actor requests share a download and create Blender geometry after loading", async (t) => {
  const data = await readFile(new URL("../../assets/models/creatures/pipereef.json", import.meta.url), "utf8");
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(data, { headers: { "Content-Type": "application/json" } });
  });
  assert.equal(hasBlenderCreature("Pipereef"), false);
  assert.throws(() => createCreature("Pipereef"), /Load the Blender asset/);
  await Promise.all([loadBlenderCreature("Pipereef"), loadBlenderCreature("Pipereef")]);
  assert.equal(requests, 1);
  await loadBlenderCreature("Pipereef");
  assert.equal(requests, 1);
  const model = createCreature("Pipereef");
  assert.equal(model.root.userData.modelSource, "Blender");
  disposeObject(model.root);
});

test("an unsuccessful download can be retried and cannot substitute the wrong species", async (t) => {
  const data = await readFile(new URL("../../assets/models/creatures/nibbkit.json", import.meta.url), "utf8");
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return requests === 1 ? new Response("Unavailable", { status: 503 }) : new Response(data);
  });
  await assert.rejects(loadBlenderCreature("Nibbkit"), /503/);
  assert.equal(hasBlenderCreature("Nibbkit"), false);
  await loadBlenderCreature("Nibbkit");
  assert.equal(hasBlenderCreature("Nibbkit"), true);
  assert.equal(requests, 2);
  await assert.rejects(loadBlenderCreature("Puddlop"), /Wrong Blender asset/);
  assert.equal(hasBlenderCreature("Puddlop"), false);
});

test("repeated actors share geometry while shiny colors and disposal stay isolated", () => {
  const standard = createCreature("Pipereef");
  const second = createCreature("Pipereef");
  const shiny = createCreature("Pipereef", { shiny: true });
  const surface = (root: THREE.Object3D) => {
    let result: THREE.Mesh | undefined;
    root.traverse((object) => {
      if (!result && object instanceof THREE.Mesh && !object.userData.outline) result = object;
    });
    return result!;
  };
  const a = surface(standard.root), b = surface(second.root), c = surface(shiny.root);
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.material, b.material);
  assert.notEqual(a.material, c.material);
  const ordinaryColor = (a.material as THREE.MeshToonMaterial).color.getHex();
  assert.notEqual(ordinaryColor, (c.material as THREE.MeshToonMaterial).color.getHex());
  let geometryDisposed = false;
  a.geometry.addEventListener("dispose", () => { geometryDisposed = true; });
  disposeObject(shiny.root);
  disposeObject(standard.root);
  assert.equal(geometryDisposed, false);
  assert.equal((b.material as THREE.MeshToonMaterial).color.getHex(), ordinaryColor);
  second.animate(2, true);
  disposeObject(second.root);
});

test("authored vapor stays translucent without an opaque outline, and legacy armor stays opaque", async () => {
  for (const name of ["Wraithound", "Ferronyx"]) {
    registerBlenderCreature(JSON.parse(await readFile(new URL(
      `../../assets/models/creatures/${name.toLowerCase()}.json`, import.meta.url,
    ), "utf8")));
  }
  const ghost = createCreature("Wraithound");
  let translucentParts = 0;
  ghost.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.outline) return;
    const material = object.material as THREE.MeshToonMaterial;
    if (material.opacity === 1) return;
    translucentParts++;
    assert.ok(material.opacity > 0 && material.opacity < 1);
    assert.equal(material.transparent, true);
    assert.equal(material.depthWrite, false);
    assert.equal(object.children.some((child) => child.userData.outline), false);
  });
  assert.ok(translucentParts > 0, "the exported smoke pigments retain alpha");
  const armor = createCreature("Ferronyx");
  armor.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.outline) return;
    const material = object.material as THREE.MeshToonMaterial;
    assert.equal(material.opacity, 1);
    assert.equal(material.transparent, false);
    assert.equal(material.depthWrite, true);
    assert.ok(object.children.some((child) => child.userData.outline));
  });
  disposeObject(ghost.root);
  disposeObject(armor.root);
});

test("glowing pigments share standard materials while shiny glow and alpha stay isolated", () => {
  const standard = createCreature("Wraithound");
  const second = createCreature("Wraithound");
  const shiny = createCreature("Wraithound", { shiny: true });
  const glowing = (root: THREE.Object3D) => {
    let result: THREE.Mesh | undefined;
    root.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.userData.outline &&
        (object.material as THREE.MeshToonMaterial).emissiveIntensity > 0) result ??= object;
    });
    assert.ok(result, "glow is preserved in the runtime export");
    return result;
  };
  const a = glowing(standard.root), b = glowing(second.root), c = glowing(shiny.root);
  const normal = a.material as THREE.MeshToonMaterial;
  const variant = c.material as THREE.MeshToonMaterial;
  const originalGlow = normal.emissive.getHex();
  assert.equal(a.material, b.material);
  assert.notEqual(a.material, c.material);
  assert.equal(normal.emissiveIntensity, variant.emissiveIntensity);
  assert.equal(normal.opacity, variant.opacity);
  assert.notEqual(normal.emissive.getHex(), variant.emissive.getHex());
  disposeObject(shiny.root);
  assert.equal(normal.emissive.getHex(), originalGlow);
  disposeObject(standard.root);
  disposeObject(second.root);
});
