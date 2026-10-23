import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleDot,
  Coins,
  Compass,
  FlaskConical,
  Eye,
  Leaf,
  Menu,
  RotateCcw,
  Users,
  Map as MapIcon,
} from "lucide-react";
import { useAdventure } from "./store";
import { spriteUrl, hasSprite } from "./sprites";
import { CreatureTypes } from "./ui";
import { worldById, defaultWorldId } from "./worlds/registry";
import { createField } from "./three/scene";
import type { FieldController, FieldState } from "./three/scene";
import {
  speciesData,
  PLAYER_HEIGHT_METRES,
} from "./three/catalog";
import { AudioToggle } from "./AudioControls";
import { ThemeToggle } from "./ThemeControls";
export default function World3D({ studyRequest }: { studyRequest: { species: string } | null }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    controller = useRef<FieldController | null>(null),
    inspectRef = useRef<string | null>(null);
  const { save, worldSpawns, saveError, battle, dialog, setPanel } = useAdventure();
  const world = worldById(save?.openWorld?.worldId ?? defaultWorldId);
  const [field, setField] = useState<FieldState>({
    x: save?.openWorld?.x ?? world.spawn.x,
    z: save?.openWorld?.z ?? world.spawn.z,
    worldId: world.id,
    placeId: save?.zone ?? "willowfen",
    placeName: "Willowfen Village",
    heading: 0.2,
    near: null,
    nearWild: null,
    moving: false,
    overview: false,
  });
  const [inspect, setInspect] = useState<string | null>(null),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const miniRoads = useMemo(
    () =>
      world.roads
        .filter((r) => r.from !== r.to)
        .map((r) => ({
          id: r.id,
          points: r.points
            .filter((_, i) => i % 5 === 0)
            .map(
              (p) =>
                `${p.x / world.mapScale + world.mapOrigin},${p.z / world.mapScale + world.mapOrigin}`,
            )
            .join(" "),
        })),
    [world],
  );

  useEffect(() => {
    try {
      controller.current = createField(canvas.current!, {
        onState: setField,
        onModelError: setError,
        onInspect: (name) => {
          inspectRef.current = name;
          setInspect(name);
        },
      });
      setReady(true);
    } catch (e) {
      console.error("3D world initialization failed", e);
      setError(
        "The 3D world couldn’t start. Enable WebGL and hardware acceleration in your browser, then try again.",
      );
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && useAdventure.getState().panel === "adventure") {
        if (inspectRef.current) controller.current?.inspect(null);
        else setPanel("team");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [setPanel]);
  useEffect(() => {
    if (ready && studyRequest) {
      controller.current?.inspect(studyRequest.species);
      canvas.current?.focus({ preventScroll: true });
    }
  }, [studyRequest, ready]);
  const study = (name: string) => controller.current?.inspect(name);
  const target = field.near;
  const npc = world.npcs.find((n) => n.id === target),
    building = world.buildings.find((b) => b.id === target),
    wild = worldSpawns.find((w) => w.id === target);
  const nearText = npc
    ? `Talk to ${npc.name}`
    : building
      ? `Visit ${building.name}`
      : wild
        ? `Meet ${wild.species}`
        : null;
  return (
    <section className="field-frame" aria-label={`${world.name} 3D world`}>
        <header className="field-titlebar">
          <div className="field-world-title">
            <Leaf size={22} />
            <div>
              <h1>{world.name}</h1>
              <p>{field.overview ? "The whole island" : field.placeName}</p>
            </div>
          </div>
          <div className="field-hud-controls">
            <div className="field-supplies" aria-label="Your supplies">
              <span title="Coins"><Coins size={15} />{save?.money.toLocaleString() ?? 600}</span>
              <span title="Capture orbs"><CircleDot size={15} />{save?.balls ?? 10}</span>
              <span title="Potions"><FlaskConical size={15} />{save?.potions ?? 5}</span>
            </div>
            <span className={`field-save-status ${saveError ? "save-failed" : ""}`} title={saveError || (save ? "Adventure saved automatically" : "Choose a starter to begin")} aria-label={saveError || (save ? "Adventure saved" : "Ready to begin")}><i /></span>
            <ThemeToggle />
            <AudioToggle />
            <button className="field-menu-button" aria-label="Open game menu" onClick={() => setPanel("team")} disabled={!!battle || !!dialog}>
              <Menu size={18} /><span>Menu</span>
            </button>
          </div>
        </header>
        <div className={`field-viewport ${inspect ? "is-inspecting" : ""}`}>
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="3D island world. W or Up to walk forward, S or Down to walk backward, A/D or Left/Right to turn, Shift to run, E to interact, V to study a nearby hollowing. Camera tilt and zoom are in Settings."
          />
          {!ready && !error && (
            <div className="field-loading" role="status">
              <Leaf size={30} />
              Opening your corner of the wild…
            </div>
          )}
          {error && (
            <div className="field-error" role="alert">
              <Compass size={30} />
              <p>{error}</p>
              <button className="primary-button" onClick={() => window.location.reload()}>
                Try again <RotateCcw size={16} />
              </button>
            </div>
          )}
          {ready && !inspect && (
            <>
              <button
                className="field-overview-toggle"
                onClick={() => controller.current?.toggleOverview()}
              >
                <MapIcon size={14} />
                {field.overview ? "Return to explorer" : "View whole island"}
              </button>
              <div className="field-compass" aria-label="Compass">
                <span style={{ transform: `rotate(${-field.heading}rad)` }}>
                  <b>N</b>
                  <Compass size={24} />
                </span>
              </div>
              <div className="field-task">
                <span className="field-task-icon">
                  <Users size={18} />
                </span>
                <div>
                  <small>YOUR JOURNEY CONTINUES</small>
                  <strong>
                    {save?.trainer ?? "Wanderer"} &amp; companions
                  </strong>
                  <span>
                    {save?.worldVisits?.[world.id]?.length ??
                      save?.visited.length ??
                      0}{" "}
                    / {world.places.length} places <i>·</i>
                    {save?.caught.length ?? 0} species registered
                  </span>
                </div>
              </div>
              <div
                className="field-map island-overview-map"
                aria-label={`Whole island map of ${world.name}`}
              >
                <div className="field-map-inner" style={{ aspectRatio: "1" }}>
                  <svg
                    viewBox="0 0 1000 1000"
                    aria-label="The complete island, merged routes, and your continuous position"
                  >
                    <rect width="1000" height="1000" fill="#8dbdc1" />
                    <path
                      d={world.shoreSVG}
                      fill="#a2b47b"
                      stroke="#e3d2a0"
                      strokeWidth="12"
                    />
                    {miniRoads.map((road) => (
                      <polyline
                        key={road.id}
                        points={road.points}
                        fill="none"
                        stroke="#e6d5a7"
                        strokeWidth="3"
                      />
                    ))}
                    {world.places
                      .filter((p) => p.kind === "town" || p.kind === "coast")
                      .map((p) => (
                        <circle
                          key={p.id}
                          cx={p.x / world.mapScale + world.mapOrigin}
                          cy={p.z / world.mapScale + world.mapOrigin}
                          r="7"
                          fill="#f9edc9"
                        />
                      ))}
                    <circle
                      className="island-continuous-position"
                      cx={field.x / world.mapScale + world.mapOrigin}
                      cy={field.z / world.mapScale + world.mapOrigin}
                      r="13"
                      fill="#ec975d"
                      stroke="#fff5d4"
                      strokeWidth="7"
                    />
                  </svg>
                </div>
                <span>
                  {field.x.toFixed(1)} : {field.z.toFixed(1)} m
                </span>
              </div>
              {nearText && (
                <button
                  className="field-interact"
                  onClick={() => controller.current?.interact()}
                >
                  <kbd>E</kbd>
                  {nearText}
                  <ArrowRight size={14} />
                </button>
              )}
              {field.nearWild && (
                <button
                  className="field-study-near"
                  onClick={() => study(field.nearWild!)}
                >
                  <kbd>V</kbd>Study {field.nearWild}
                  <Eye size={13} />
                </button>
              )}
              <div className="field-camera-actions">
                <button
                  aria-label="Open 3D field guide"
                  title="3D field guide"
                  onClick={() => setPanel("models")}
                >
                  <BookOpen size={17} />
                </button>
              </div>
            </>
          )}
          {inspect && (
            <>
              <div className="field-inspection-title">
                <span className="eyebrow">AT THE SAME SCALE</span>
                <h3>{inspect}</h3>
                <CreatureTypes name={inspect} />
              </div>
              <button
                className="field-back"
                onClick={() => controller.current?.inspect(null)}
              >
                <ArrowLeft size={15} />
                Back to wandering<kbd>esc</kbd>
              </button>
              <div className="field-reference">
                <span>
                  {hasSprite(inspect)
                    ? "ORIGINAL ILLUSTRATION"
                    : "NEW 3D DESIGN"}
                </span>
                {hasSprite(inspect) ? (
                  <img
                    src={spriteUrl(inspect)}
                    alt={`${inspect} original 2D reference`}
                  />
                ) : (
                  <div className="field-new-design">
                    <Leaf size={28} />
                    <small>Designed from the original species notes</small>
                  </div>
                )}
                <strong>{inspect}</strong>
                <p>{speciesData[inspect].appearance}</p>
                <div className="field-size-facts">
                  <b>{speciesData[inspect].height.toFixed(2)} m</b>
                  <span>{speciesData[inspect].weight} kg</span>
                </div>
                <small>
                  Explorer: {PLAYER_HEIGHT_METRES.toFixed(2)} m<br />
                  Both models shown at their actual relative height.
                </small>
              </div>
              <div className="field-orbit-hint">
                <Users size={14} />
                Scale comparison
              </div>
            </>
          )}
        </div>
        <footer className="field-toolbar" hidden={!!inspect}>
          <div>
            <span>
              <kbd>W</kbd>
              <kbd>S</kbd>
              Walk
            </span>
            <span>
              <kbd>A</kbd>
              <kbd>D</kbd>Turn
            </span>
            <span>
              <kbd>shift</kbd>Run
            </span>
            <span>
              <kbd>E</kbd>Interact
            </span>
            <span>
              <kbd>V</kbd>Study
            </span>
            <span className="field-mouse-hint">
              Camera options in Settings
            </span>
          </div>
          <button onClick={() => setPanel("map")}>
            <MapIcon size={14} />
            Island map
          </button>
        </footer>
    </section>
  );
}
