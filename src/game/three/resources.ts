import * as THREE from "three";
import { sharedCreatureGeometries } from "./primitives.ts";
export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    }
    if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (m instanceof THREE.MeshToonMaterial && !o.userData.ownedMaterial)
          continue;
        if (m.side === THREE.BackSide) continue;
        materials.add(m);
        const map = (m as THREE.MeshBasicMaterial).map;
        if (map) textures.add(map);
      }
    }
  });
  geometries.forEach((g) => {
    if (!sharedCreatureGeometries.has(g)) g.dispose();
  });
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  root.removeFromParent();
}
export function makeLabel(text: string, width = 3) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fcf7e8";
  ctx.beginPath();
  ctx.roundRect(8, 8, 752, 108, 24);
  ctx.fill();
  ctx.strokeStyle = "#81956b";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "600 38px Georgia";
  ctx.textAlign = "center";
  ctx.fillStyle = "#405c3f";
  ctx.fillText(text, 384, 77, 710);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, depthTest: true }),
  );
  label.scale.set(width, width / 6, 1);
  return label;
}
