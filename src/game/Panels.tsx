import { AudioSettingsCard } from "./AudioControls";
import { CameraSettingsCard } from "./CameraControls";
import { AppearanceSettingsCard } from "./ThemeControls";
import { useRef, useState } from "react";
import { IslandMap } from "./IslandMap";
import {
  ArrowRight,
  Check,
  CircleDot,
  Compass,
  Download,
  FlaskConical,
  Heart,
  Gem,
  Leaf,
  MapPin,
  Medal,
  Save as SaveIcon,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { useAdventure } from "./store";
import { TraitBadges, CreatureArt, CreatureTypes, HpBar } from "./ui";
import { creatures, moves, evolutionStones, stoneByKey } from "./data";
import { gyms, champions, leagueAt, lockReason, defeated } from "./progression";
import type { Companion } from "./engine";
import { xpNeeded, stoneEvolutions } from "./engine";
import { encounterSettings, effectiveBaseStat, statKeys, statLabels, shinyDescription, traitLabel } from "./traits";
import { zones, zoneById, isTown } from "./world";
export const objectives = (s: {
  caught: string[];
  wins: number;
  visited: string[];
  badge: boolean;
  badges: string[];
  defeatedChampions: string[];
}) => [
  {
    title: "Find your traveling companions",
    detail: "Register 3 different species in your field guide.",
    progress: Math.min(3, s.caught.length),
    total: 3,
  },
  {
    title: "Find your footing",
    detail: "Win 3 wild battles along the trails.",
    progress: Math.min(3, s.wins),
    total: 3,
  },
  {
    title: "Find Ranger Elowen in Larkspur",
    detail: "Follow Sunpetal Trail north through Mosswood Hollow.",
    progress: s.visited.includes("larkspur") ? 1 : 0,
    total: 1,
  },
  {
    title: "Earn the Wildflower Badge",
    detail: "Speak to Ranger Elowen in Larkspur and win her challenge.",
    progress: s.badge ? 1 : 0,
    total: 1,
  },
  { title: "Complete the gym circuit", detail: "Earn 12 badges, starting at the Seedling Gym in Willowfen. Follow the league tracker below.", progress: s.badges.length, total: gyms.length },
  { title: "Challenge the champions", detail: "Earn all 12 gym badges, then defeat Astra, Rowan, and Aurelia in order.", progress: s.defeatedChampions.length, total: champions.length },
];
function StoneEvolution({ companion }: { companion: Companion }) {
  const { save, evolve } = useAdventure();
  const [selected, setSelected] = useState("");
  const options = stoneEvolutions(companion.species);
  if (!save || !options.length) return null;
  const choice =
    options.find((e) => e.stone === selected) ??
    options.find((e) => (save.stones[e.stone!] ?? 0) > 0) ??
    options[0];
  const stone = stoneByKey[choice.stone!],
    quantity = save.stones[stone.key] ?? 0;
  return (
    <div className="stone-evolution">
      <h3>
        <Gem size={15} /> Stone evolution
      </h3>
      <select
        aria-label={`Evolution stone for ${companion.species}`}
        value={stone.key}
        onChange={(e) => setSelected(e.target.value)}
      >
        {options.map((e) => (
          <option key={e.stone} value={e.stone}>
            {stoneByKey[e.stone!].name} → {e.evolves_to} (
            {save.stones[e.stone!] ?? 0} owned)
          </option>
        ))}
      </select>
      <div className="evolution-preview">
        <CreatureArt name={choice.evolves_to} shiny={companion.shiny} alpha={companion.alpha} />
        <span>
          Use one {stone.name}
          <strong>
            {companion.species} → {choice.evolves_to}
          </strong>
        </span>
      </div>
      <button
        className="secondary-button"
        disabled={quantity < 1 || companion.hp <= 0}
        onClick={() => evolve(companion.id, stone.key)}
      >
        Evolve into {choice.evolves_to}
        <Sparkles size={14} />
      </button>
      <small>
        {companion.hp <= 0
          ? "Heal this companion before evolving."
          : quantity < 1
            ? `Buy a ${stone.name} at any town shop for ${stone.price} coins.`
            : "Keeps its level and experience. Consumes one stone."}
      </small>
    </div>
  );
}

function CompanionStats({ companion: c }: { companion: Companion }) {
  return <div className="companion-stats">
    {(c.shiny || c.alpha) && <p>
      {c.shiny && `Shiny: ${shinyDescription(c.species)}. `}
      {c.alpha && `Alpha: +${Math.round((encounterSettings.alphaStatMultiplier - 1) * 100)}% to all base stats, after shiny bonuses.`}
    </p>}
    <dl aria-label="Effective base stats">
      {statKeys.map((key) => <div key={key}><dt>{statLabels[key]}</dt><dd>{effectiveBaseStat(c.species, key, c)}</dd></div>)}
    </dl>
    <small>Base stats including traits · level determines battle stats</small>
  </div>;
}

export function TeamPanel() {
  const { save, reorder, potion, swap } = useAdventure();
  const [replaceId, setReplaceId] = useState("");
  if (!save) return <StartPrompt />;
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BETTER TOGETHER</span>
          <h1>Your traveling companions.</h1>
          <p>Six places on the team. Drag a companion’s model or use ← / → to rotate it.</p>
        </div>
        <span className="soft-badge">
          <FlaskConical size={16} />
          {save.potions} potions
        </span>
      </div>
      <div className="team-grid">
        {save.party.map((c, i) => (
          <article key={c.id} className="team-card">
            <div className="team-card-top">
              <span className="eyebrow">
                {i === 0 ? "LEAD COMPANION" : `COMPANION 0${i + 1}`}
              </span>
              <span>Lv. {c.level}</span>
            </div>
            <CreatureArt name={c.species} shiny={c.shiny} alpha={c.alpha} interactive />
            <h2>{c.species}</h2>
            <TraitBadges {...c} />
            <CompanionStats companion={c} />
            <CreatureTypes name={c.species} />
            <div className="health-label">
              <span>
                {c.hp === 0 ? "Fainted · visit a Healing House" : "Health"}
              </span>
              <strong>
                {c.hp} / {c.maxHp}
              </strong>
            </div>
            <HpBar hp={c.hp} max={c.maxHp} large />
            <div className="health-label">
              <span>Next level</span>
              <small>
                {c.xp} / {xpNeeded(c.level)} XP
              </small>
            </div>
            <div className="xp-track">
              <span style={{ width: `${(c.xp / xpNeeded(c.level)) * 100}%` }} />
            </div>
            <div className="team-moves">
              {c.moves.map((k) => (
                <span key={k}>
                  {moves[k].name}
                  <small>
                    {c.pp[k]}/{moves[k].max_uses} PP
                  </small>
                </span>
              ))}
            </div>
            <div className="team-card-actions">
              <button
                className="secondary-button"
                disabled={i === 0}
                onClick={() => reorder(c.id)}
              >
                <Compass size={14} />
                {i === 0 ? "Leading the way" : "Make leader"}
              </button>
              <button
                className="icon-button"
                title="Use potion (+30 HP)"
                aria-label={`Heal ${c.species}`}
                disabled={save.potions < 1 || c.hp === 0 || c.hp === c.maxHp}
                onClick={() => potion(c.id)}
              >
                <FlaskConical size={17} />
              </button>
            </div>
            <StoneEvolution key={c.species} companion={c} />
          </article>
        ))}
        {save.party.length < 6 && (
          <div className="team-empty">
            <CircleDot size={32} strokeWidth={1} />
            <h3>A friend you haven’t met yet.</h3>
            <p>
              Find a wild hollowing, weaken it in battle, and use a capture orb.
            </p>
          </div>
        )}
      </div>
      <section className="stone-bag" aria-label="Evolution stone bag">
        <h2>
          <Gem size={20} /> Evolution stones
        </h2>
        <p>
          Buy stones at any town shop for 300 coins each. Use them on compatible
          companions above; bring stored hollowings onto your team first.
        </p>
        <div>
          {evolutionStones
            .filter((stone) => save.stones[stone.key] > 0)
            .map((stone) => (
              <span key={stone.key}>
                {stone.name}
                <strong>×{save.stones[stone.key]}</strong>
              </span>
            ))}
        </div>
        {!evolutionStones.some((stone) => save.stones[stone.key] > 0) && (
          <small>No stones in your bag yet.</small>
        )}
      </section>
      <div className="section-heading">
        <h2>Hollowing storage</h2>
        <span>{save.storage.length} companions</span>
      </div>
      {save.storage.length ? (
        <>
          <p className="muted">
            {save.party.length >= 6
              ? "Choose a team member to exchange with a stored companion."
              : "Bring a stored companion onto your team."}
          </p>
          {save.party.length >= 6 && (
            <select
              aria-label="Team member to exchange"
              value={replaceId}
              onChange={(e) => setReplaceId(e.target.value)}
            >
              <option value="">Choose a companion to exchange</option>
              {save.party.map((c) => (
                <option key={c.id} value={c.id}>
                  {traitLabel(c)} {c.species} · Lv. {c.level}
                </option>
              ))}
            </select>
          )}
          <div className="storage-list">
            {save.storage.map((c) => (
              <button
                key={c.id}
                disabled={save.party.length >= 6 && !replaceId}
                onClick={() => swap(c.id, replaceId)}
              >
                <CreatureArt name={c.species} shiny={c.shiny} alpha={c.alpha} />
                <span>
                  {c.species} <TraitBadges {...c} />
                  <small>Lv. {c.level} · Add to team</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="quiet-card">
          When your team is full, new captures will be waiting here.
        </div>
      )}
    </div>
  );
}
export function MapPanel() {
  const { save, fastTravel } = useAdventure();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const listed = zones.filter((z) =>
    `${z.name} ${z.sanctuary?.species ?? ""} ${leagueAt(z.id)?.badge ?? ""} ${leagueAt(z.id)?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()) &&
    (category === "all" || (category === "towns" && isTown(z)) ||
      (category === "wild" && !isTown(z)) || (category === "sanctuaries" && z.sanctuary)),
  );
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEAVE A LITTLE ROOM FOR WONDER</span>
          <h1>The Hollow Wilds.</h1>
          <p>
            {zones.filter(isTown).length} towns · {zones.filter((z) => !isTown(z)).length} wild areas · {zones.filter((z) => z.sanctuary).length} legendary &amp; mythical sanctuaries.
          </p>
        </div>
        <span className="soft-badge">
          <MapPin size={16} />
          {save?.visited.length ?? 0} / {zones.length} discovered
        </span>
      </div>
      <IslandMap />
      <div className="field-tip">
        <Compass size={20} />
        <p>
          Walk the island circuit, take an inland shortcut, or follow a side trail
          to a crater, hidden grove, or frozen lake. Use WASD or the arrow keys to explore;
          discovered areas can be revisited here.
        </p>
      </div>
      <div className="map-filters">
        <input aria-label="Search areas or guardians" placeholder="Search areas or guardians…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Area category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All areas ({zones.length})</option>
          <option value="towns">Towns ({zones.filter(isTown).length})</option>
          <option value="wild">Wild areas ({zones.filter((z) => !isTown(z)).length})</option>
          <option value="sanctuaries">Legendary &amp; mythical sanctuaries</option>
        </select>
        <span>{listed.length} places</span>
      </div>
      <div className="zone-list">
        {!listed.length && <p>No areas match your search.</p>}
        {listed.map((z, i) => (
          <div key={z.id}>
            <span className="zone-index">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{z.name} {z.sanctuary && <span className="sanctuary-label">{z.sanctuary.category} · {z.sanctuary.species} · Lv. 80{save?.caught.includes(z.sanctuary.species) ? " · Caught permanently" : ""}</span>}</h3>
              <p>
                {isTown(z)
                  ? `Healing House · Supplies${leagueAt(z.id) ? ` · ${leagueAt(z.id)!.kind === "gym" ? `${leagueAt(z.id)!.badge} Gym` : leagueAt(z.id)!.name}` : ""}`
                  : `Wild hollowings · Levels ${z.level.join("–")}`}
                <span className="zone-connections">
                  {z.exits
                    .map((e) => `${e.direction}: ${zoneById(e.target).name}`)
                    .join(" · ")}
                </span>
              </p>
            </div>
            {save?.visited.includes(z.id) ? (
              <button className="secondary-button" onClick={() => fastTravel(z.id)}>Travel <ArrowRight size={14} /></button>
            ) : (
              <span className="muted">Explore to discover</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function LeagueTracker() {
  const { save, fastTravel } = useAdventure();
  if (!save) return null;
  return <section className="league-tracker" aria-label="Gym and champion progression">
    <div className="section-heading"><h2>The badge circuit</h2><span>{save.badges.length}/12 badges · {save.defeatedChampions.length}/3 champions</span></div>
    <p className="muted">Visit each gym’s purple-roofed hall in order. The first six test one type; later teams combine types. Earn all 12 badges to open the Champion Halls. Rematches pay half the original prize.</p>
    <div className="league-grid">{[...gyms, ...champions].map((opponent, i) => {
      const done = defeated(opponent, save), locked = lockReason(opponent, save);
      return <article className={`league-card ${done ? "complete" : ""}`} key={opponent.id}>
        <div className="section-heading"><span className="eyebrow">{opponent.kind === "gym" ? `GYM ${String(i + 1).padStart(2, "0")}` : "CHAMPION"}</span><span className="soft-badge">{done ? "✓ Defeated" : locked ? "Locked" : "Available"}</span></div>
        <h3>{opponent.badge ? `${opponent.badge} Badge` : opponent.name}</h3>
        <p>{opponent.kind === "gym" ? `${opponent.name} · ` : ""}{zoneById(opponent.zone).name}</p>
        <small>{opponent.types.length ? opponent.types.join(" / ") : "Mixed team · no type specialty"} · Lv. {opponent.team[0].level}–{opponent.team.at(-1)!.level} · {opponent.team.length} companions</small>
        <div className="league-team">{opponent.team.map((c, j) => <CreatureArt key={j} name={c.species} />)}</div>
        <p className="league-requirement">{locked ?? (done ? "Open for a rematch." : `Win ${opponent.reward.toLocaleString()} coins${opponent.badge ? " and a badge" : ""}.`)}</p>
        <button className="secondary-button" disabled={!save.visited.includes(opponent.zone)} onClick={() => fastTravel(opponent.zone)}>{save.visited.includes(opponent.zone) ? "Travel to town" : "Explore to discover"}<ArrowRight size={14} /></button>
      </article>;
    })}</div>
    <div className="field-tip"><Sparkles size={20} /><p>Legendary and mythical guardians are level 80. Weaken them before throwing orbs; even at low HP they are difficult to catch. A captured guardian never respawns in this adventure. Fleeing or defeating one allows another attempt.</p></div>
  </section>;
}
export function JournalPanel() {
  const save = useAdventure((s) => s.save);
  if (!save) return <StartPrompt />;
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR FIELD JOURNAL</span>
          <h1>Small steps. A grand adventure.</h1>
          <p>A record of the places, hollowings, and moments along the way.</p>
        </div>
        <Leaf size={32} strokeWidth={1.2} />
      </div>
      <div className="journal-banner">
        <div className="journal-seal">
          <Medal size={48} strokeWidth={1.2} />
        </div>
        <div>
          <span className="eyebrow">CHAPTER ONE</span>
          <h2>
            {save.badge ? "The Wildflower Ranger" : "The Wildflower Trail"}
          </h2>
          <p>
            {save.badge
              ? "You earned your place among the rangers. Keep exploring, growing your team, and filling your field guide."
              : "Set off from Willowfen, meet the hollowings of the Hollow Wilds, and earn Ranger Elowen’s trust."}
          </p>
        </div>
        <span className="journal-chapter">01</span>
      </div>
      <div className="quest-list">
        {objectives(save).map((q, i) => (
          <div
            className={q.progress === q.total ? "complete" : ""}
            key={q.title}
          >
            <span className="quest-check">
              {q.progress === q.total ? <Check size={20} /> : `0${i + 1}`}
            </span>
            <div>
              <h3>{q.title}</h3>
              <p>{q.detail}</p>
            </div>
            <strong>
              {q.progress} / {q.total}
            </strong>
          </div>
        ))}
      </div>
      <LeagueTracker />
      <div className="journey-stats">
        {[
          [save.caught.length, "species registered"],
          [save.wins, "battles won"],
          [save.visited.length, "places discovered"],
          [save.steps, "steps into the wild"],
          [[...save.party, ...save.storage].filter((c) => c.shiny).length, "shiny companions"],
          [[...save.party, ...save.storage].filter((c) => c.alpha).length, "alpha companions"],
        ].map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="field-tip">
        <Sparkles size={20} />
        <p>
          The adventure keeps going after your badge. Discover{" "}
          {creatures.length} species, train your companions, and watch them
          evolve when they reach the right level.
        </p>
      </div>
    </div>
  );
}
export function SettingsPanel() {
  const { save, saveError, importSave, toast } = useAdventure();
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(""),
    [confirmReset, setConfirmReset] = useState(false);
  const download = () => {
    if (!save) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { ...save, savedAt: new Date().toISOString() },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `hollow-wilds-${save.trainer.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Your adventure has been exported as a JSON file.");
  };
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>The practical little things.</h1>
          <p>Your adventure, saved for another day.</p>
        </div>
        <Settings size={30} strokeWidth={1.2} />
      </div>
      <div className="settings-grid">
        <AppearanceSettingsCard />
        <AudioSettingsCard />
        <CameraSettingsCard />
        <section className="settings-card">
          <SaveIcon size={25} />
          <h2>Save your journey</h2>
          <p>
            Progress is saved automatically on this browser. Download a JSON
            backup to take your adventure to another device.
          </p>
          <div className={`save-state ${saveError ? "error" : ""}`}>
            <i />
            {saveError ||
              (save
                ? "Autosave is on · your progress is up to date"
                : "Choose a starter to begin saving your adventure.")}
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={download}
              disabled={!save}
            >
              <Download size={17} />
              Download save
            </button>
            <button
              className="secondary-button"
              onClick={() => file.current?.click()}
            >
              <Upload size={17} />
              Import JSON
            </button>
          </div>
          <p className="small-note">
            Importing a valid version 2 save replaces the current adventure.
            Download your current save first if you want to keep both.
          </p>
          <input
            hidden
            ref={file}
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 2_000_000)
                  throw new Error(
                    "Please choose a save file smaller than 2 MB.",
                  );
                importSave(JSON.parse(await f.text()));
                setError("");
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to read that save file.",
                );
              }
              e.target.value = "";
            }}
          />
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </section>
        <section className="settings-card">
          <Compass size={25} />
          <h2>A few useful controls</h2>
          <dl className="controls-list">
            <div>
              <dt>Forward / backward</dt>
              <dd>
                <kbd>W</kbd>
                <kbd>S</kbd>
                or <kbd>↑</kbd><kbd>↓</kbd>
              </dd>
            </div>
            <div>
              <dt>Turn left / right</dt>
              <dd>
                <kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd>
              </dd>
            </div>
            <div>
              <dt>Run</dt>
              <dd>
                Hold <kbd>Shift</kbd> while moving
              </dd>
            </div>
            <div>
              <dt>Talk / interact</dt>
              <dd>
                <kbd>E</kbd>
              </dd>
            </div>
            <div>
              <dt>World map</dt>
              <dd>
                <kbd>M</kbd>
              </dd>
            </div>
            <div>
              <dt>Hollowdex</dt>
              <dd>
                <kbd>H</kbd>
              </dd>
            </div>
            <div>
              <dt>My team</dt>
              <dd>
                <kbd>T</kbd>
              </dd>
            </div>
            <div>
              <dt>Open / close menu</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
            <div>
              <dt>Camera</dt>
              <dd>Follows behind you. Adjust tilt and zoom in Settings.</dd>
            </div>
          </dl>
        </section>
        <section className="settings-card">
          <Sparkles size={25} />
          <h2>Shiny &amp; alpha encounters</h2>
          <p>Shiny: 1 in {encounterSettings.shinyOdds} ({100 / encounterSettings.shinyOdds}%). Alpha: 1 in {encounterSettings.alphaOdds} ({100 / encounterSettings.alphaOdds}%). Each trait rolls independently when a wild hollowing appears.</p>
          <p>Both traits: 1 in {encounterSettings.shinyOdds * encounterSettings.alphaOdds}. Shiny adds the species’ stat bonus (or +{encounterSettings.fallbackShinyBonus} to all base stats when none is listed). Alpha then adds {Math.round((encounterSettings.alphaStatMultiplier - 1) * 100)}% to every base stat. Traits stay through capture and evolution.</p>
          <small>Shiny odds are temporarily increased for testing.</small>
        </section>
        <section className="settings-card">
          <Heart size={25} />
          <h2>A world made to wander</h2>
          <p>
            The Hollow Wilds is a local, single-player adventure. Your
            hollowings, their types, base stats, learnsets, and moves come from
            the original game JSON.
          </p>
          <p>
            Level evolutions happen automatically. Buy evolution stones in town
            shops and use them from My team. Status moves use simplified battle
            effects; abilities and other special evolution methods remain
            reference data.
          </p>
        </section>
        {save && (
          <section className="settings-card">
            <Leaf size={25} />
            <h2>A new beginning</h2>
            <p>
              Choose a different starter and begin a fresh adventure. Download
              your current save above if you want to keep this journey.
            </p>
            {confirmReset ? (
              <>
                <p className="error-message">
                  This replaces your current local adventure. Your downloaded
                  backups will still work.
                </p>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={() => setConfirmReset(false)}
                  >
                    Keep this adventure
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => useAdventure.getState().reset()}
                  >
                    Start a new adventure
                  </button>
                </div>
              </>
            ) : (
              <button
                className="secondary-button"
                onClick={() => setConfirmReset(true)}
              >
                Start fresh
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
function StartPrompt() {
  return (
    <div className="empty-state">
      <Leaf size={35} />
      <h1>Your adventure is waiting.</h1>
      <p>Return to Explore and choose your first companion.</p>
      <button
        className="primary-button"
        onClick={() => useAdventure.getState().setPanel("adventure")}
      >
        Let’s begin <ArrowRight size={16} />
      </button>
    </div>
  );
}
