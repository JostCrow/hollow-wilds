import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createCreature, createExplorer, anatomicalBounds } from "./creatures";
import { speciesData } from "./catalog";
import { disposeObject } from "./resources";
import { loadBlenderCreature } from "./blender-creatures.ts";
type Combatant = {
  species: string;
  hp: number;
  shiny: boolean;
  alpha: boolean;
};
type BattleStageProps = {
  ally: Combatant;
  enemy: Combatant;
  busy: boolean;
  caught: boolean;
};
export default function BattleStage(props: BattleStageProps) {
  const pair = `${props.ally.species}:${props.enemy.species}`;
  const [loadedPair, setLoadedPair] = useState("");
  const [loadError, setLoadError] = useState<{ pair: string; message: string } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([loadBlenderCreature(props.ally.species), loadBlenderCreature(props.enemy.species)])
      .then(() => { if (active) { setLoadedPair(pair); setLoadError(null); } })
      .catch(() => { if (active) setLoadError({ pair, message: "The battle models couldn’t load. Please reload and try again." }); });
    return () => { active = false; };
  }, [pair, props.ally.species, props.enemy.species]);
  if (loadError?.pair === pair) return <div className="battle-stage-loading" role="alert">{loadError.message}</div>;
  if (loadedPair !== pair) return <div className="battle-stage-loading" role="status">Preparing hollowings…</div>;
  return <LoadedBattleStage {...props} />;
}
function LoadedBattleStage(props: BattleStageProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    live = useRef(props);
  const [error, setError] = useState(false);
  useEffect(() => {
    live.current = props;
  }, [props]);
  useEffect(() => {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas.current!,
        antialias: true,
      });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d5e2ce");
    scene.fog = new THREE.Fog("#d5e2ce", 14, 40);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.06, 90);
    scene.add(new THREE.HemisphereLight("#fff2d3", "#789362", 1.6));
    const sun = new THREE.DirectionalLight("#ffedc6", 2);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
    });
    sun.shadow.normalBias = 0.05;
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(22, 64),
      new THREE.MeshLambertMaterial({ color: "#aec48b" }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    for (const x of [-1.8, 1.8]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.08, 48),
        new THREE.MeshBasicMaterial({
          color: "#ddd4a4",
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.015, 0);
      scene.add(ring);
    }
    const explorer = createExplorer();
    explorer.root.position.set(-3.2, 0, 1.1);
    explorer.root.rotation.y = 1;
    scene.add(explorer.root);
    let ally = createCreature(live.current.ally.species, live.current.ally),
      enemy = createCreature(live.current.enemy.species, live.current.enemy);
    scene.add(ally.root, enemy.root);
    let allyKey = "",
      enemyKey = "",
      frame = 0,
      start = 0,
      lastAttack = 0,
      wasBusy = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      const { width, height } = canvas.current!.getBoundingClientRect();
      if (width && height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.current!);
    resize();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!start) start = now;
      const t = reduced.matches ? 0 : (now - start) / 1000,
        s = live.current;
      const ak = `${s.ally.species}:${s.ally.shiny}:${s.ally.alpha}`,
        ek = `${s.enemy.species}:${s.enemy.shiny}:${s.enemy.alpha}`;
      if (ak !== allyKey) {
        disposeObject(ally.root);
        ally = createCreature(s.ally.species, s.ally);
        scene.add(ally.root);
        allyKey = ak;
      }
      if (ek !== enemyKey) {
        disposeObject(enemy.root);
        enemy = createCreature(s.enemy.species, s.enemy);
        scene.add(enemy.root);
        enemyKey = ek;
      }
      if (s.busy && !wasBusy) lastAttack = now;
      wasBusy = s.busy;
      const progress = Math.min(1, (now - lastAttack) / 550),
        lunge = reduced.matches ? 0 : Math.sin(progress * Math.PI) * 0.35;
      ally.root.position.set(-1.8 + lunge, 0, 0);
      ally.root.rotation.y = Math.PI / 2;
      enemy.root.position.set(1.8 - lunge * 0.5, 0, 0);
      enemy.root.rotation.y = -Math.PI / 2;
      ally.root.visible = s.ally.hp > 0;
      enemy.root.visible = s.enemy.hp > 0 && !s.caught;
      ally.animate(t);
      enemy.animate(t);
      explorer.animate(t);
      const maxHeight = Math.max(
        1.7,
        speciesData[s.ally.species].height * (s.ally.alpha ? 1.2 : 1),
        speciesData[s.enemy.species].height * (s.enemy.alpha ? 1.2 : 1),
      );
      const bounds = anatomicalBounds(ally.root).union(
        anatomicalBounds(enemy.root),
      );
      const width = bounds.max.x - bounds.min.x,
        radius = Math.max(8.4, maxHeight * 2.2, width * 1.4);
      camera.position.set(
        -radius * 0.12,
        maxHeight * 0.5 + radius * 0.42,
        radius * 0.88,
      );
      camera.lookAt(0, maxHeight * 0.45, 0);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeObject(scene);
      renderer.dispose();
    };
  }, []);
  if (error)
    return (
      <div className="battle-stage-loading" role="alert">
        The 3D battle couldn’t start. Enable WebGL and hardware acceleration in your browser.
      </div>
    );
  return (
    <canvas
      className="battle-3d-stage"
      ref={canvas}
      aria-label={`3D battle: ${props.ally.species} versus ${props.enemy.species}, at their recorded heights beside a 1.70 m explorer`}
    />
  );
}
