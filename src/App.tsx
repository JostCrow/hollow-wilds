import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Coins,
  Compass,
  Feather,
  FlaskConical,
  Heart,
  Gem,
  Leaf,
  Map as MapIcon,
  MapPin,
  Medal,
  PanelLeftClose,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Users,
  X,
} from "lucide-react";
import { useAdventure } from "./game/store";
import type { Panel } from "./game/store";
import { WorldCanvas } from "./game/WorldCanvas";
import { BattleView } from "./game/BattleView";
import { Encyclopedia } from "./game/Encyclopedia";
import {
  JournalPanel,
  MapPanel,
  objectives,
  SettingsPanel,
  TeamPanel,
} from "./game/Panels";
import { TraitBadges, CreatureArt, CreatureTypes, HpBar } from "./game/ui";
import { zoneById, isTown } from "./game/world";
import { evolutionStones } from "./game/data";
import { useGameAudio } from "./game/useGameAudio";
import { AudioToggle } from "./game/AudioControls";
import "./game/adventure.css";
import "./game/illustration.css";

const navigation = [
  { key: "adventure", name: "Explore", icon: Compass },
  { key: "team", name: "My team", icon: Users },
  { key: "journal", name: "Field journal", icon: Feather },
  { key: "map", name: "World map", icon: MapIcon },
  { key: "bestiary", name: "Creature guide", icon: BookOpen },
  { key: "moves", name: "Move library", icon: Swords },
  { key: "types", name: "Type chart", icon: Shield },
  { key: "stats", name: "Base stats", icon: BarChart3 },
] as const;
const pathPanels: Record<string, Panel> = {
  "/": "adventure",
  "/team": "team",
  "/journal": "journal",
  "/map": "map",
  "/pokedex": "bestiary",
  "/moves": "moves",
  "/typechart": "types",
  "/stats": "stats",
  "/settings": "settings",
};
const panelPaths = Object.fromEntries(
  Object.entries(pathPanels).map(([path, panel]) => [panel, path]),
);
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
function Explore() {
  const { save, setPanel, spawns, direction } = useAdventure();
  const zone = zoneById(save?.zone ?? "willowfen");
  const activeQuest = save
    ? objectives(save).find((q) => q.progress < q.total)
    : null;
  return (
    <>
      <div className="page-heading adventure-heading">
        <div>
          <span className="eyebrow">THE PATH IS YOURS</span>
          <h1>A little further into the wild.</h1>
          <p>No rush. There’s always something waiting around the bend.</p>
        </div>
        <span className="weather">
          <Sun size={22} />
          <span>
            A lovely day<small>Clear skies · The Hollow Wilds</small>
          </span>
        </span>
      </div>
      <div className="exploration-layout">
        <div className="exploration-main">
          <section className="world-frame">
            <div className="world-location">
              <span className="location-pin">
                <MapPin size={19} />
              </span>
              <div>
                <h2>{zone.name}</h2>
                <span>{zone.subtitle}</span>
              </div>
              <span className="live-world">
                <i />
                LIVE WORLD
              </span>
            </div>
            <WorldCanvas />
            <div className="world-footer">
              <div>
                <span className="key-group">
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </span>
                <span>move</span>
                <kbd>E</kbd>
                <span>interact</span>
                <span className="footer-click">or click to wander</span>
              </div>
              <button onClick={() => setPanel("map")}>
                World map <ArrowRight size={14} />
              </button>
            </div>
          </section>
          <div className="explore-bottom">
            <div className="trail-note">
              <span>
                <Leaf size={20} />
              </span>
              <div>
                <strong>A tip for the trail</strong>
                <p>
                  {isTown(zone)
                    ? "The pink-roofed Healing House restores your team for free. Click its front door to visit."
                    : "Use the local map’s arrow markers to follow an exit. Take the side paths to find creatures, landmarks, and trail treasures."}
                </p>
              </div>
            </div>
            <div className="explorer-coordinates">
              <Compass size={22} />
              <span>
                {String(save?.x ?? 20).padStart(2, "0")} :{" "}
                {String(save?.y ?? 15).padStart(2, "0")}
                <small>Facing {direction}</small>
              </span>
            </div>
          </div>
        </div>
        <aside className="adventure-rail">
          <section className="quest-card">
            <div className="rail-title">
              <span>
                <Feather size={16} />
                THE FIELD JOURNAL
              </span>
              <span>01</span>
            </div>
            <div className="quest-flower">
              <Leaf size={27} strokeWidth={1.3} />
              <i />
            </div>
            <span className="eyebrow">A NEW CHAPTER</span>
            <h2>
              {save?.badge ? "Wildflower Ranger" : "The Wildflower Trail"}
            </h2>
            <p>
              {activeQuest?.detail ??
                (save?.badge
                  ? "Your badge is only the beginning. There’s more out there to discover."
                  : "Every great adventure begins with a few small steps.")}
            </p>
            {activeQuest && (
              <div className="quest-progress">
                <div>
                  <span
                    style={{
                      width: `${(activeQuest.progress / activeQuest.total) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {activeQuest.progress}/{activeQuest.total}
                </small>
              </div>
            )}
            <button onClick={() => setPanel("journal")}>
              Open journal <ArrowRight size={14} />
            </button>
          </section>
          <section className="rail-team">
            <div className="section-heading">
              <h3>Your companions</h3>
              <span>{save?.party.length ?? 0} / 6</span>
            </div>
            {save?.party.map((c) => (
              <button
                className="mini-companion"
                key={c.id}
                onClick={() => setPanel("team")}
              >
                <CreatureArt name={c.species} shiny={c.shiny} alpha={c.alpha} />
                <div>
                  <span>
                    <strong>{c.species} <TraitBadges {...c} /></strong>
                    <small>Lv. {c.level}</small>
                  </span>
                  <HpBar hp={c.hp} max={c.maxHp} />
                  <small>
                    {c.hp} / {c.maxHp} HP
                  </small>
                </div>
                <ChevronRight size={14} />
              </button>
            ))}
            {!save && <p className="muted">A new friendship is just ahead.</p>}
            {save && save.party.length < 3 && (
              <button
                className="empty-companion"
                onClick={() => setPanel("team")}
              >
                <CircleDot size={20} />
                <span>A friend you haven’t met yet</span>
              </button>
            )}
            <button className="rail-link" onClick={() => setPanel("team")}>
              Manage team <ArrowRight size={14} />
            </button>
          </section>
          <section className="nearby-card">
            <div className="section-heading">
              <h3>Out in the wild</h3>
              <span className="live-dot" />
            </div>
            <p>Some of your neighbors here.</p>
            <div className="nearby-creatures">
              {[...new Set(spawns.map((s) => s.species))]
                .slice(0, 4)
                .map((name) => (
                  <button
                    key={name}
                    onClick={() => setPanel("bestiary")}
                    title={name}
                  >
                    <CreatureArt name={name} />
                    <small>{name}</small>
                  </button>
                ))}
            </div>
          </section>
          <div className="rail-footnote">
            <Heart size={12} />
            Take the long way home.
          </div>
        </aside>
      </div>
      {!save && <Starter />}
    </>
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
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    const pop = () =>
      useAdventure.setState({
        panel: pathPanels[window.location.pathname] ?? "adventure",
      });
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const path = panelPaths[panel];
    if (path && window.location.pathname !== path)
      window.history.pushState({}, "", path);
    setMobileNav(false);
  }, [panel]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useAdventure.setState({ notice: "" }), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useAdventure.getState();
      if (s.battle) return;
      if (document.querySelector(".creature-detail")) {
        (
          document.querySelector(
            ".creature-detail .close-button",
          ) as HTMLButtonElement
        )?.click();
        return;
      }
      if (s.dialog) s.dismiss();
      else if (s.save)
        s.setPanel(s.panel === "adventure" ? "journal" : "adventure");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="wilds">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setPanel("adventure");
          }}
        >
          <span className="brand-mark">
            <Leaf size={25} strokeWidth={1.5} />
          </span>
          <span>
            the hollow
            <br />
            <strong>
              wilds<span>✦</span>
            </strong>
          </span>
        </a>
        <span className="nav-label">YOUR ADVENTURE</span>
        <nav>
          {navigation.map((item, i) => (
            <div key={item.key}>
              {i === 4 && (
                <span className="nav-label library-label">
                  THE FIELD LIBRARY
                </span>
              )}
              <button
                className={`nav-item ${panel === item.key ? "active" : ""}`}
                onClick={() => {
                  setPanel(item.key);
                  setMobileNav(false);
                }}
                disabled={!!battle || !!dialog}
              >
                <item.icon size={19} strokeWidth={1.6} />
                <span>{item.name}</span>
                {panel === item.key && <span className="nav-active-dot" />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={17} />
            <p>
              A world of little wonders.
              <br />
              <span>Go find yours.</span>
            </p>
            <span className="note-leaf">
              <Leaf size={40} strokeWidth={0.8} />
            </span>
          </div>
          <button
            className={`nav-item ${panel === "settings" ? "active" : ""}`}
            onClick={() => setPanel("settings")}
            disabled={!!battle || !!dialog}
          >
            <Settings size={18} strokeWidth={1.5} />
            Settings & saves
          </button>
          <div className="trainer-profile">
            <div className="trainer-avatar">
              {(save?.trainer ?? "W")[0].toUpperCase()}
            </div>
            <div>
              <strong>{save?.trainer ?? "Wanderer"}</strong>
              <small>
                {save?.badge ? "Wildflower Ranger" : "A new adventure"}
              </small>
            </div>
            {save?.badge ? <Medal size={19} /> : <Leaf size={17} />}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <PanelLeftClose size={19} />
            </button>
            <span className="breadcrumb">
              The Hollow Wilds <ChevronRight size={13} />
              <strong>
                {navigation.find((n) => n.key === panel)?.name ??
                  "Settings & saves"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <AudioToggle />
            <span
              className={`autosave-label ${saveError ? "save-failed" : ""}`}
            >
              <i />
              {saveError
                ? "Save unavailable"
                : save
                  ? "Adventure saved"
                  : "Ready when you are"}
            </span>
            <span className="topbar-divider" />
            <span title="Coins">
              <Coins size={17} />
              {save?.money.toLocaleString() ?? "600"}
            </span>
            <span title="Capture orbs">
              <CircleDot size={17} />
              {save?.balls ?? 10}
            </span>
            <span title="Potions">
              <FlaskConical size={17} />
              {save?.potions ?? 5}
            </span>
          </div>
        </header>
        <main
          className={`page-content ${panel === "adventure" ? "explore-page" : ""}`}
        >
          {panel === "adventure" ? (
            <Explore />
          ) : panel === "team" ? (
            <TeamPanel />
          ) : panel === "map" ? (
            <MapPanel />
          ) : panel === "journal" ? (
            <JournalPanel />
          ) : panel === "settings" ? (
            <SettingsPanel />
          ) : (
            <Encyclopedia key={panel} mode={panel} />
          )}
        </main>
        <footer className="app-footer">
          <span>
            THE HOLLOW WILDS <i>·</i> A creature-collecting adventure
          </span>
          <span>
            Stay curious. Wander often. <Leaf size={12} />
          </span>
        </footer>
      </div>
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
              onClick={dialog.kind === "ranger" ? challenge : dismiss}
            >
              {dialog.kind === "ranger"
                ? "Take the challenge"
                : "Back to exploring"}
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
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
    </div>
  );
}
