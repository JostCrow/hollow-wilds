import * as THREE from "three";
import data from "../../../assets/models/explorer/explorer.json" with { type: "json" };
import type { CreatureModel } from "./creatures.ts";
import { reusableGeometry } from "./primitives.ts";

// Blender bakes garment bevels and normals, then batches each joint by material.
// Geometry is shared; each actor owns its materials so disposal remains isolated.
const geometry = data.nodes.map((node) =>
  node.meshes.map((mesh) => {
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(mesh.positions, 3),
    );
    buffer.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
    buffer.setIndex(mesh.indices);
    buffer.computeBoundingBox();
    buffer.computeBoundingSphere();
    return reusableGeometry(buffer);
  }),
);

export function buildExplorer(): CreatureModel {
  const root = new THREE.Group();
  root.name = "Blender explorer";
  const joints = new Map<string, THREE.Group>();
  const materials = new Map(
    Object.entries(data.materials).map(([name, material]) => [
      name,
      new THREE.MeshStandardMaterial({ ...material, name }),
    ]),
  );
  data.nodes.forEach((node, i) => {
    const group = new THREE.Group();
    group.name = node.name;
    group.position.fromArray(node.position);
    joints.set(node.name, group);
    (node.parent ? joints.get(node.parent)! : root).add(group);
    node.meshes.forEach((mesh, j) => {
      const part = new THREE.Mesh(geometry[i][j], materials.get(mesh.material));
      part.name = `${node.name}_${mesh.material}`;
      part.castShadow = true;
      part.receiveShadow = true;
      group.add(part);
    });
  });
  const body = joints.get("body")!;
  const head = joints.get("head")!;
  const pack = joints.get("pack")!;
  const bodyHeight = body.position.y;
  const packHeight = pack.position.y;
  return {
    root,
    animate(time, moving = false) {
      const pace = time * 10;
      body.position.y = bodyHeight +
        (moving ? Math.abs(Math.sin(pace)) * 0.018 : Math.sin(time * 2.1) * 0.004);
      body.rotation.x = moving ? 0.035 : 0;
      body.rotation.z = moving ? Math.sin(pace) * 0.018 : 0;
      head.rotation.y = moving ? Math.sin(pace) * 0.025 : Math.sin(time * 0.65) * 0.045;
      head.rotation.x = moving ? -0.035 : Math.sin(time * 1.3) * 0.012;
      pack.position.y = packHeight + (moving ? Math.sin(pace * 2 - 0.5) * 0.008 : 0);
      pack.rotation.x = moving ? Math.sin(pace - 0.4) * 0.018 : 0;
      ["left", "right"].forEach((side, i) => {
        const stride = Math.sin(pace + i * Math.PI);
        joints.get(`${side}Leg`)!.rotation.x = moving ? stride * 0.48 : 0;
        joints.get(`${side}Shin`)!.rotation.x = moving ? Math.max(0, -stride) * 0.62 : 0;
        const arm = joints.get(`${side}Arm`)!;
        arm.rotation.x = moving ? -stride * 0.34 : Math.sin(time * 2.1) * 0.015;
        arm.rotation.z = i === 0 ? -0.045 : 0.045;
        joints.get(`${side}Forearm`)!.rotation.x = moving
          ? -0.1 - Math.max(0, stride) * 0.17
          : -0.06;
      });
    },
  };
}
