import * as THREE from "three";

// Small deterministic, tileable textures give the landscape fine surface detail
// without downloading images or changing any terrain/collision geometry.
const SIZE = 128;
function field(x: number, y: number) {
  const a = (x / SIZE) * Math.PI * 2, b = (y / SIZE) * Math.PI * 2;
  return Math.sin(a * 3 + Math.cos(b * 2)) * 0.35 +
    Math.cos(b * 5 + Math.sin(a * 4)) * 0.2 +
    Math.sin(a * 13 + b * 17) * 0.12;
}
function pixels(kind: "ground" | "trail" | "water") {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const noise = grain - Math.floor(grain);
    const value = kind === "water"
      ? 235 + Math.sin((x + Math.sin(y / SIZE * Math.PI * 4) * 4) / SIZE * Math.PI * 16) * 4
      : 240 + field(x, y) * (kind === "ground" ? 12 : 8) +
        (noise - .5) * (kind === "ground" ? 7 : 14);
    data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, value));
    data[i + 3] = 255;
  }
  return data;
}
const groundPixels = pixels("ground"), trailPixels = pixels("trail"), waterPixels = pixels("water");
function texture(data: Uint8Array) {
  // Each material owns its GPU texture; immutable pixel buffers can be shared.
  const map = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}
export function groundMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, map: texture(groundPixels),
  });
}
export function trailMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .98, map: texture(trailPixels),
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1,
  });
}
export function waterMaterial(color: string) {
  return new THREE.MeshStandardMaterial({
    color, roughness: .3, metalness: .12, map: texture(waterPixels),
    side: THREE.DoubleSide,
  });
}

export function worldUV(geometry: THREE.BufferGeometry, scale: number) {
  const positions = geometry.attributes.position;
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = positions.getX(i) / scale;
    uv[i * 2 + 1] = positions.getZ(i) / scale;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
