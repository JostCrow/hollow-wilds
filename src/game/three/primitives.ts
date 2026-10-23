import * as THREE from "three";

const outlineMaterial = new THREE.MeshBasicMaterial({
  color: "#3b3021",
  side: THREE.BackSide,
});
const sphere = new THREE.SphereGeometry(1, 28, 20);
const palette = new Map<string, THREE.MeshToonMaterial>();
// A warm four-step ramp retains the flat colored shading in the illustrations.
const ramp = new THREE.DataTexture(
  new Uint8Array([90, 145, 205, 255]),
  4,
  1,
  THREE.RedFormat,
);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
export function toon(color: string) {
  if (!palette.has(color))
    palette.set(
      color,
      new THREE.MeshToonMaterial({ color, gradientMap: ramp }),
    );
  return palette.get(color)!;
}
export function part(
  parent: THREE.Object3D,
  color: string,
  position: [number, number, number],
  scale: [number, number, number],
  outlined = true,
  geometry: THREE.BufferGeometry = sphere,
) {
  const mesh = new THREE.Mesh(geometry, toon(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outlined) {
    const outline = new THREE.Mesh(geometry, outlineMaterial);
    outline.scale.setScalar(1.025);
    outline.userData.outline = true;
    mesh.add(outline);
  }
  parent.add(mesh);
  return mesh;
}
export function line(
  parent: THREE.Object3D,
  points: [number, number, number][],
  radius = 0.012,
  color = "#3b3021",
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  return part(
    parent,
    color,
    [0, 0, 0],
    [1, 1, 1],
    false,
    new THREE.TubeGeometry(curve, 20, radius, 6, false),
  );
}
export function eye(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  green = false,
) {
  part(parent, green ? "#eff3c5" : "#f9b836", [x, y, z], [0.17, 0.265, 0.085]);
  part(
    parent,
    green ? "#223e32" : "#442b17",
    [x + 0.012, y + 0.018, z + 0.06],
    [0.093, 0.184, 0.055],
    false,
  );
  part(
    parent,
    "#fff8ce",
    [x + 0.025, y + 0.105, z + 0.104],
    [0.048, 0.077, 0.023],
    false,
  );
  if (green)
    part(
      parent,
      "#80b6a6",
      [x + 0.01, y - 0.095, z + 0.103],
      [0.048, 0.035, 0.015],
      false,
    );
}
function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.45, 0.3, -0.35, 0.78, 0, 1.2);
  shape.bezierCurveTo(0.35, 0.78, 0.45, 0.3, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.04,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -0.03);
  return geometry;
}
const leafShape = leafGeometry();
export const sharedCreatureGeometries = new Set<THREE.BufferGeometry>([
  sphere,
  leafShape,
]);
export function leaf(
  parent: THREE.Object3D,
  color: string,
  pos: [number, number, number],
  scale: number,
  rot: [number, number, number],
) {
  const mesh = part(parent, color, pos, [scale, scale, scale], true, leafShape);
  mesh.rotation.set(...rot);
  return mesh;
}

export function reusableGeometry<T extends THREE.BufferGeometry>(
  geometry: T,
): T {
  sharedCreatureGeometries.add(geometry);
  return geometry;
}
