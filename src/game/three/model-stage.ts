import * as THREE from "three";
import {
  createCreature,
  createExplorer,
  anatomicalBounds,
} from "./creatures.ts";
import { makeLabel } from "./resources.ts";
import { speciesData } from "./catalog.ts";
export function createModelStage(name: string) {
  const root = new THREE.Group();
  root.name = "Scale comparison";
  const model = createCreature(name),
    explorer = createExplorer();
  root.add(model.root, explorer.root);
  const body = anatomicalBounds(model.root),
    width = body.max.x - body.min.x;
  explorer.root.position.x = body.min.x - 0.85;
  const bounds = anatomicalBounds(root),
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3());
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(
      Math.max(3, size.x * 0.75),
      Math.max(3, size.x * 0.75) + 0.1,
      0.1,
      64,
    ),
    new THREE.MeshLambertMaterial({ color: "#c3cfab" }),
  );
  platform.position.set(center.x, -0.06, center.z);
  platform.receiveShadow = true;
  root.add(platform);
  const modelLabel = makeLabel(
    `${name} · ${speciesData[name].height.toFixed(2)} m`,
    Math.max(1.6, Math.min(3, width + 1)),
  );
  modelLabel.position.set(0, body.max.y + 0.4, body.max.z * 0.3);
  root.add(modelLabel);
  const playerLabel = makeLabel("Explorer · 1.70 m", 1.8);
  playerLabel.position.set(explorer.root.position.x, 2.1, 0);
  root.add(playerLabel);
  const rulerX = body.max.x + 0.45,
    height = Math.max(1.7, speciesData[name].height);
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, height, 0.016),
    new THREE.MeshBasicMaterial({ color: "#758363" }),
  );
  post.position.set(rulerX, height / 2, 0);
  root.add(post);
  for (let y = 0; y <= height + 0.001; y += 0.5) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.015, 0.015),
      new THREE.MeshBasicMaterial({ color: "#758363" }),
    );
    tick.position.set(rulerX, y, 0);
    root.add(tick);
  }
  return {
    root,
    model,
    explorer,
    center: new THREE.Vector3(center.x, Math.max(1, height * 0.5), center.z),
    radius: Math.max(5.2, height * 1.9, size.x * 1.15, size.z * 1.6),
    animate(time: number) {
      model.animate(time);
      explorer.animate(time);
    },
  };
}
