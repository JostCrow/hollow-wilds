import * as THREE from "three";
import { part } from "./primitives.ts";
import { buildExplorer } from "./explorer.ts";
import { buildBlenderCreature } from "./blender-creatures.ts";
import { modelProfiles, speciesData, PLAYER_HEIGHT_METRES } from "./catalog.ts";
export { part, toon, sharedCreatureGeometries } from "./primitives.ts";
export type CreatureName = string;
export const creatureNames = Object.keys(modelProfiles);
export interface CreatureModel {
  root: THREE.Group;
  animate: (time: number, moving?: boolean) => void;
}
/** Geometry height excludes outlines and free-floating effects. One unit is one metre. */
export function anatomicalBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.outline) return;
    for (
      let ancestor: THREE.Object3D | null = object;
      ancestor;
      ancestor = ancestor.parent
    )
      if (ancestor.userData.effect) return;
    object.geometry.computeBoundingBox();
    bounds.union(
      object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld),
    );
  });
  return bounds;
}
function atHeight(model: CreatureModel, height: number): CreatureModel {
  const bounds = anatomicalBounds(model.root),
    factor = height / (bounds.max.y - bounds.min.y);
  const root = new THREE.Group();
  model.root.scale.multiplyScalar(factor);
  model.root.position.y -= bounds.min.y * factor;
  root.add(model.root);
  Object.assign(root.userData, model.root.userData);
  root.userData.heightMetres = height;
  return { root, animate: model.animate };
}
export function createCreature(
  name: CreatureName,
  traits: { shiny?: boolean; alpha?: boolean } = {},
): CreatureModel {
  const profile = modelProfiles[name],
    data = speciesData[name];
  if (!profile || !data) throw new Error(`No 3D design registered for ${name}`);
  const raw = buildBlenderCreature(name);
  const model = atHeight(raw, data.height * (traits.alpha ? 1.2 : 1));
  model.root.name = name;
  model.root.userData.species = name;
  if (traits.shiny)
    model.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.outline) return;
      const material = o.material as THREE.MeshToonMaterial;
      if (!material.color) return;
      const tinted = material.clone();
      tinted.color.offsetHSL(125 / 360, 0.05, 0.03);
      if (tinted.emissiveIntensity > 0)
        tinted.emissive.offsetHSL(125 / 360, 0.05, 0.03);
      o.material = tinted;
      o.userData.ownedMaterial = true;
    });
  return model;
}
function explorerGeometry(): CreatureModel {
  const root = new THREE.Group();
  part(root, "#e95443", [0, 0.91, 0], [0.24, 0.3, 0.17]);
  part(root, "#f8cd9c", [0, 1.4, 0], [0.27, 0.29, 0.23]);
  part(root, "#50352a", [0, 1.48, -0.07], [0.278, 0.23, 0.2]);
  part(root, "#ee5746", [0, 1.63, 0], [0.3, 0.18, 0.26]);
  part(root, "#d23e32", [0, 1.58, 0.23], [0.31, 0.04, 0.19]);
  for (const s of [-1, 1]) {
    part(
      root,
      "#fff8d6",
      [s * 0.098, 1.42, 0.21],
      [0.052, 0.073, 0.026],
      false,
    );
    part(
      root,
      "#3b3028",
      [s * 0.098, 1.42, 0.232],
      [0.025, 0.053, 0.016],
      false,
    );
  }
  part(root, "#f4bf42", [0, 0.61, 0], [0.26, 0.16, 0.19]);
  part(root, "#7c7451", [0, 0.97, -0.19], [0.2, 0.23, 0.1]);
  const limbs = [-1, 1].map((s) => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.13, 0.56, 0);
    root.add(leg);
    part(leg, "#efbf8e", [0, -0.22, 0], [0.09, 0.24, 0.09]);
    part(leg, "#f4efe0", [0, -0.4, 0], [0.09, 0.07, 0.09]);
    part(leg, "#d94a3c", [0, -0.48, 0.055], [0.12, 0.07, 0.19]);
    const arm = new THREE.Group();
    arm.position.set(s * 0.27, 1.08, 0);
    root.add(arm);
    part(arm, "#fff5d9", [0, -0.06, 0], [0.11, 0.14, 0.12]);
    part(arm, "#f4c393", [0, -0.28, 0], [0.075, 0.17, 0.075]);
    return { leg, arm };
  });
  return {
    root,
    animate(time, moving = false) {
      limbs.forEach(({ leg, arm }, i) => {
        const stride = moving ? Math.sin(time * 10 + i * Math.PI) * 0.55 : 0;
        leg.rotation.x = stride;
        arm.rotation.x = -stride * 0.7;
      });
    },
  };
}

export function createExplorer(): CreatureModel {
  return atHeight(buildExplorer(), PLAYER_HEIGHT_METRES);
}

/** Town residents retain their existing design and individual color palettes. */
export function createResidentExplorer(): CreatureModel {
  return atHeight(explorerGeometry(), PLAYER_HEIGHT_METRES);
}
