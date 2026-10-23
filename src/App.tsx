import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Check, CircleDot, Coins, FlaskConical, Gem, Leaf, Medal, X } from "lucide-react";
import { useAdventure } from "./game/store";
import { BattleView } from "./game/BattleView";
import { GameMenu } from "./game/GameMenu";
import { keyboardPanels, pathPanels, panelPaths } from "./game/navigation";
import { CreatureArt, CreatureTypes } from "./game/ui";
import { opponentById } from "./game/progression";
import { evolutionStones } from "./game/data";
import { useGameAudio } from "./game/useGameAudio";
import "./game/adventure.css";
import "./game/illustration.css";
import "./game/themes.css";
import "./game/game-menu.css";
import "./game/three/field.css";
import "./game/fullscreen.css";

const World3D = lazy(() => import("./game/World3D"));

function Starter() {
  const start = useAdventure((s) => s.start);
  const [selected, setSelected] = useState("Flarepib"),
    [name, setName] = useState("");
  return (
    <div className="starter-overlay">
      <section className="starter-card" aria-label="Choose your starter">
        <span className="starter-leaf">
          <Leaf size={24} />
        </span>
        <span className="eyebrow">EVERY GOOD STORY STARTS WITH A FRIEND</span>
        <h2>Who’s coming with you?</h2>
        <p>
          Choose your first companion. There’s a whole world waiting for you
          both.
        </p>
        <div className="starter-options">
          {[
            ["Flarepib", "A little spark of courage."],
            ["Verdreep", "Rooted in quiet curiosity."],
            ["Rivanos", "Go where the current takes you."],
          ].map(([n, description]) => (
            <button
              key={n}
              className={`starter-option ${selected === n ? "selected" : ""}`}
              onClick={() => setSelected(n)}
              aria-pressed={selected === n}
            >
              <span className="starter-check">
                {selected === n && <Check size={12} />}
              </span>
              <CreatureArt name={n} />
              <h3>{n}</h3>
              <CreatureTypes name={n} />
              <small>{description}</small>
            </button>
          ))}
        </div>
        <div className="starter-bottom">
          <label>
            <span>What should we call you?</span>
            <input
              maxLength={20}
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") start(selected, name);
              }}
            />
          </label>
          <button
            className="primary-button"
            onClick={() => start(selected, name)}
          >
            Let’s wander <ArrowRight size={18} />
          </button>
        </div>
        <small className="starter-footnote">
          Play at your own pace. Your journey saves automatically.
        </small>
      </section>
    </div>
  );
}
export default function App() {
  useGameAudio();
  const {
    panel,
    save,
    battle,
    dialog,
    notice,
    saveError,
    setPanel,
    dismiss,
    buy,
    challenge,
  } = useAdventure();
  const [studyRequest, setStudyRequest] = useState<{ species: string } | null>(null);
  useEffect(() => {
    const pop = () => {
      const state = useAdventure.getState();
      state.setPanel(pathPanels[window.location.pathname] ?? "adventure");
      if (state.battle || state.dialog)
        window.history.replaceState({}, "", panelPaths[state.panel]);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const path = panelPaths[panel];
    if (path && window.location.pathname !== path)
      window.history.pushState({}, "", path);
  }, [panel]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useAdventure.setState({ notice: "" }), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey)
        return;
      const s = useAdventure.getState();
      if (s.battle) return;
      if (e.key === "Escape") {
        if (s.dialog) {
          e.preventDefault();
          s.dismiss();
        } else if (s.panel !== "adventure") {
          e.preventDefault();
          s.setPanel("adventure");
        }
        return;
      }
      if (s.dialog || (e.target instanceof HTMLElement &&
        (e.target.isContentEditable || e.target.closest("input, textarea, select, [role='textbox']"))))
        return;
      const destination = keyboardPanels[e.key.toLowerCase()];
      if (destination) {
        e.preventDefault();
        s.setPanel(destination);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const notifications = (
    <>
      {notice && (
        <div className="toast" role="status">
          <Leaf size={17} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => useAdventure.setState({ notice: "" })}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {saveError && (
        <div className="save-warning" role="alert">
          {saveError}
        </div>
      )}
    </>
  );
  return (
    <div className="wilds game-shell">
      <main className="game-world" aria-label="The Hollow Wilds adventure">
        <Suspense fallback={<div className="game-loading" role="status"><Leaf size={30} />Opening your corner of the wild…</div>}>
          <World3D studyRequest={studyRequest} />
        </Suspense>
      </main>
      {!save && <Starter />}
      <GameMenu onStudy={(species) => {
        setStudyRequest({ species });
        setPanel("adventure");
      }}>{panel !== "adventure" && notifications}</GameMenu>
      {battle && <BattleView />}
      {dialog && (
        <div className="modal-backdrop">
          <section
            className="dialog-card modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="close-button"
              aria-label="Close dialogue"
              onClick={dismiss}
            >
              <X size={20} />
            </button>
            <span className="dialog-icon">
              {dialog.kind === "shop" ? (
                <FlaskConical size={27} />
              ) : dialog.kind === "ranger" ? (
                <Medal size={27} />
              ) : (
                <Leaf size={27} />
              )}
            </span>
            <span className="eyebrow">A MOMENT ON THE TRAIL</span>
            <h2 id="dialog-title">{dialog.title}</h2>
            <p>{dialog.text}</p>
            {dialog.opponentId && <div className="opponent-preview">
              {opponentById(dialog.opponentId)?.team.map((c, i) => <div key={i}>
                <CreatureArt name={c.species} /><strong>{c.species}</strong><small>Lv. {c.level}</small>
              </div>)}
            </div>}
            {dialog.kind === "shop" && (
              <div className="shop-items">
                <button
                  disabled={!save || save.money < 80}
                  onClick={() => buy("balls")}
                >
                  <CircleDot size={23} />
                  <span>
                    Capture orb<small>In bag: {save?.balls}</small>
                  </span>
                  <strong>
                    80 <Coins size={13} />
                  </strong>
                </button>
                <button
                  disabled={!save || save.money < 60}
                  onClick={() => buy("potions")}
                >
                  <FlaskConical size={23} />
                  <span>
                    Potion<small>In bag: {save?.potions}</small>
                  </span>
                  <strong>
                    60 <Coins size={13} />
                  </strong>
                </button>
                <details className="shop-stones">
                  <summary>
                    <Gem size={17} /> Evolution stones · 300 coins each
                  </summary>
                  <p>Use stones from My team. Coins available: {save?.money}</p>
                  <div className="shop-items stone-shop-list">
                    {evolutionStones.map((stone) => (
                      <button
                        key={stone.key}
                        aria-label={`Buy ${stone.name}`}
                        disabled={!save || save.money < stone.price}
                        onClick={() =>
                          useAdventure.getState().buyEvolutionStone(stone.key)
                        }
                        title={stone.description}
                      >
                        <Gem size={20} />
                        <span>
                          {stone.name}
                          <small>In bag: {save?.stones[stone.key] ?? 0}</small>
                        </span>
                        <strong>
                          {stone.price} <Coins size={13} />
                        </strong>
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            )}
            <button
              className="primary-button"
              onClick={dialog.kind === "ranger" || dialog.kind === "opponent" ? challenge : dismiss}
            >
              {dialog.kind === "ranger" || dialog.kind === "opponent"
                ? "Take the challenge"
                : "Back to exploring"}
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {panel === "adventure" && notifications}
    </div>
  );
}
