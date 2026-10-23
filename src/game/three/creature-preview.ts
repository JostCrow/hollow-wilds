import * as THREE from "three";
import { anatomicalBounds, createCreature } from "./creatures";
import { disposeObject } from "./resources";
import type { Traits } from "../traits";

// All cards share one WebGL context. Copy each rendered model into its own canvas
// so a full catalogue can coexist with the island and battle renderers.
let renderer: THREE.WebGLRenderer | undefined;
let frame = 0;
const pending = new Set<() => void>();
function schedule(draw: () => void) {
  pending.add(draw);
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const batch = [...pending].slice(0, 4);
    batch.forEach((render) => pending.delete(render));
    batch.forEach((render) => render());
    if (pending.size) schedule(pending.values().next().value!);
  });
}

export function createCreaturePreview(
  canvas: HTMLCanvasElement,
  name: string,
  traits: Traits,
  interactive: boolean,
  onReady: () => void,
  onError: () => void,
) {
  renderer ??= new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas previews are unavailable");
  const model = createCreature(name, traits);
  const scene = new THREE.Scene();
  scene.add(model.root, new THREE.HemisphereLight("#fff4df", "#82967c", 2));
  const sun = new THREE.DirectionalLight("#fff1d9", 2.5);
  sun.position.set(-3, 6, 8);
  scene.add(sun);
  const bounds = anatomicalBounds(model.root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  // Reserve the same space for both forms so alpha remains visibly larger.
  size.divideScalar(traits.alpha ? 1.2 : 1);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let disposed = false;
  let angle = -0.35;
  let lastDraw = 0;
  let ready = false;

  const draw = () => {
    if (disposed || !visible || document.hidden) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const now = performance.now();
    if (interactive && !reduced.matches && now - lastDraw < 1000 / 30) {
      schedule(draw);
      return;
    }
    lastDraw = now;
    try {
      if (renderer!.getContext().isContextLost()) throw new Error("Preview context lost");
      const aspect = width / height;
      const radius = Math.hypot(size.x, size.z) / 2;
      const halfHeight = Math.max(size.y * 0.55, radius / aspect) * 1.3;
      Object.assign(camera, {
        left: -halfHeight * aspect, right: halfHeight * aspect,
        top: halfHeight, bottom: -halfHeight,
        far: Math.max(100, size.length() * 10),
      });
      camera.updateProjectionMatrix();
      const distance = Math.max(4, size.length() * 3);
      camera.position.copy(center).add(new THREE.Vector3(
        Math.sin(angle) * distance, distance * 0.14, Math.cos(angle) * distance,
      ));
      camera.lookAt(center);
      model.animate(interactive && !reduced.matches ? now / 1000 : 0);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.min(768, Math.round(width * ratio));
      const pixelHeight = Math.min(768, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      renderer!.setSize(pixelWidth, pixelHeight, false);
      renderer!.render(scene, camera);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.drawImage(renderer!.domElement, 0, 0);
      if (!ready) { ready = true; onReady(); }
      if (interactive && !reduced.matches) schedule(draw);
    } catch {
      dispose();
      onError();
    }
  };
  const resize = new ResizeObserver(() => schedule(draw));
  resize.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule(draw);
    else pending.delete(draw);
  });
  intersection.observe(canvas);
  const refresh = () => schedule(draw);
  document.addEventListener("visibilitychange", refresh);
  reduced.addEventListener("change", refresh);
  function dispose() {
    disposed = true;
    pending.delete(draw);
    resize.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", refresh);
    reduced.removeEventListener("change", refresh);
    disposeObject(scene);
  }
  return {
    rotate(delta: number) { angle += delta; schedule(draw); },
    reset() { angle = -0.35; schedule(draw); },
    dispose,
  };
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame);
  pending.clear();
  renderer?.dispose();
});
