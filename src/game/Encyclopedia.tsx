import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Check,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  creatures,
  moves,
  species,
  types,
  typeColors,
  stoneByKey,
} from "./data";
import { useAdventure } from "./store";
import { TraitBadges, CreatureArt, CreatureTypes, TypePill } from "./ui";
import { zones } from "./world";
import { effectiveBaseStat, statKeys, shinyDescription, encounterSettings } from "./traits";
import type { Stat, Traits } from "./traits";

function previewStat(name: string, key: string, traits: Traits) {
  return key === "total"
    ? statKeys.reduce((total, stat) => total + effectiveBaseStat(name, stat, traits), 0)
    : effectiveBaseStat(name, key as Stat, traits);
}

const habitats = Object.fromEntries(
  creatures.map((c) => [
    c.name,
    zones.filter((z) => z.encounters.includes(c.name)),
  ]),
);
const starterNames = ["Flarepib", "Verdreep", "Rivanos"];
function locationSummary(name: string) {
  const locations = habitats[name];
  if (!locations.length)
    return starterNames.includes(name)
      ? "Starter companion"
      : "No wild encounters";
  return (
    locations[0].name +
    (locations.length > 1 ? ` +${locations.length - 1} more` : "")
  );
}

const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  sp_attack: "Sp. Atk",
  sp_defense: "Sp. Def",
  speed: "Speed",
};
export function Encyclopedia({
  mode,
}: {
  mode: "bestiary" | "moves" | "types" | "stats";
}) {
  const save = useAdventure((s) => s.save);
  const discovered = useMemo(
    () => new Set([...(save?.seen ?? []), ...(save?.caught ?? [])]),
    [save?.seen, save?.caught],
  );
  const [shiny, setShiny] = useState(false);
  const [alpha, setAlpha] = useState(false);
  const traits = { shiny, alpha };
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [caughtOnly, setCaughtOnly] = useState(false),
    [sort, setSort] = useState("total"),
    [ascending, setAscending] = useState(false);
  const filtered = useMemo(
    () =>
      creatures.filter(
        (c) => {
          if (mode === "bestiary" && !discovered.has(c.name))
            return !query.trim() && type === "all" && !caughtOnly;
          return c.name.toLowerCase().includes(query.trim().toLowerCase()) &&
          (type === "all" ||
            c.typing.includes(type as (typeof c.typing)[number])) &&
          (!caughtOnly || save?.caught.includes(c.name));
        },
      ),
    [query, type, caughtOnly, save?.caught, mode, discovered],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          (sort === "name"
            ? a.name.localeCompare(b.name)
            : previewStat(a.name, sort, { shiny, alpha }) -
              previewStat(b.name, sort, { shiny, alpha })) *
          (ascending ? 1 : -1),
      ),
    [filtered, sort, ascending, shiny, alpha],
  );
  const filteredMoves = Object.entries(moves).filter(
    ([, m]) =>
      m.name.toLowerCase().includes(query.toLowerCase()) &&
      (type === "all" || m.type === type),
  );
  const creature = selected && (mode !== "bestiary" || discovered.has(selected))
    ? species[selected] : null;
  return (
    <div className="reference-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE FIELD LIBRARY</span>
          <h1>
            {mode === "bestiary"
              ? "Every hollowing has a story."
              : mode === "moves"
                ? "A move for every moment."
                : mode === "types"
                  ? "Know your strengths."
                  : "A closer look at the numbers."}
          </h1>
          <p>
            {mode === "bestiary"
              ? `${discovered.size} seen · ${save?.caught.length ?? 0} caught · ${creatures.length} hollowings to discover.`
              : mode === "moves"
                ? `Explore all ${Object.keys(moves).length} moves from your game data.`
                : mode === "types"
                  ? "Attacking types run down the side. Defending types run across the top."
                  : "Compare base stats and find your next traveling companion."}
          </p>
        </div>
        <BookOpen size={32} strokeWidth={1.2} />
      </div>
      {mode !== "types" && (
        <div className="library-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label={`Search ${mode}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "moves" ? "Find a move…" : "Find a hollowing…"
              }
            />
          </label>
          <select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All types</option>
            {types.types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {mode !== "moves" && (
            <button
              className={`filter-toggle ${caughtOnly ? "selected" : ""}`}
              onClick={() => setCaughtOnly(!caughtOnly)}
            >
              <Check size={15} /> Caught {save?.caught.length ?? 0}
            </button>
          )}
          <span className="result-count">
            {mode === "moves" ? filteredMoves.length : filtered.length} results
          </span>
        </div>
      )}
      {(mode === "bestiary" || mode === "stats") && (
        <div className="variant-preview" aria-label="Preview hollowing traits">
          <span>Preview forms</span>
          <label><input type="checkbox" checked={shiny} onChange={(e) => setShiny(e.target.checked)} /> Shiny</label>
          <label><input type="checkbox" checked={alpha} onChange={(e) => setAlpha(e.target.checked)} /> Alpha</label>
          <small>Select both to preview stacked bonuses. Your companions are unchanged.</small>
        </div>
      )}
      {mode === "bestiary" && (
        <>
          {!filtered.length && (
            <div className="hollowdex-empty" role="status">
              <BookOpen size={30} aria-hidden="true" />
              <h2>No discovered hollowings match your filters.</h2>
              <p>Try another name or type, or turn off the Caught filter.</p>
            </div>
          )}
          <div className="bestiary-grid">
            {filtered.map((c) => {
              const number = String(creatures.indexOf(c) + 1).padStart(3, "0");
              const caught = !!save?.caught.includes(c.name);
              if (!discovered.has(c.name)) return (
                <button className="species-card unseen" key={c.name} disabled
                  aria-label={`Entry ${number} · Unseen hollowing`}>
                  <div className="species-number">#{number}</div>
                  <span className="species-placeholder" aria-hidden="true">?</span>
                  <h3>Unknown hollowing</h3>
                  <span className="species-discovery">Not seen yet</span>
                </button>
              );
              return (
                <button
                  className={`species-card ${caught ? "caught" : "seen-only"}`}
                  key={c.name}
                  aria-label={`${c.name} · ${caught ? "Caught" : "Seen, not caught"}`}
                  onClick={() => setSelected(c.name)}
                  style={
                    {
                      "--creature-color": typeColors[c.typing[0]],
                    } as React.CSSProperties
                  }
                >
                  <div className="species-number">
                    #{number}
                    <span>
                      {caught ? <Check size={15} /> : c.legendary ? <Sparkles size={15} /> : ""}
                    </span>
                  </div>
                  <CreatureArt name={c.name} {...traits} />
                  <h3>{c.name}</h3>
                  <span className="species-discovery">{caught ? "Caught" : "Seen · Not caught"}</span>
                  <TraitBadges {...traits} />
                  <CreatureTypes name={c.name} />
                  <span className="species-habitat">
                    <MapPin size={12} aria-hidden="true" />
                    {locationSummary(c.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {mode === "moves" && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Move</th>
                <th>Type</th>
                <th>Category</th>
                <th>Power</th>
                <th>Accuracy</th>
                <th>PP</th>
              </tr>
            </thead>
            <tbody>
              {filteredMoves.map(([key, m]) => (
                <tr key={key}>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td>
                    <TypePill type={m.type} />
                  </td>
                  <td className="capitalize">{m.category}</td>
                  <td>{m.power || "—"}</td>
                  <td>{m.accuracy}%</td>
                  <td>{m.max_uses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === "stats" && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  ["name", "Hollowing"],
                  ...Object.entries(statLabels),
                  ["total", "Total"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button
                      onClick={() => {
                        if (sort === key) setAscending(!ascending);
                        else {
                          setSort(key);
                          setAscending(key === "name");
                        }
                      }}
                    >
                      {label}
                      <ArrowDownUp
                        size={12}
                        className={sort === key ? "sort-active" : ""}
                      />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.name}>
                  <td>
                    <button
                      className="table-creature"
                      onClick={() => setSelected(c.name)}
                    >
                      <CreatureArt name={c.name} {...traits} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.typing.join(" / ")}</small>
                      </span>
                    </button>
                  </td>
                  {Object.keys(statLabels).map((key) => (
                    <td key={key}>
                      {previewStat(c.name, key, traits)}
                    </td>
                  ))}
                  <td>
                    <strong>{previewStat(c.name, "total", traits)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === "types" && (
        <>
          <div className="type-legend">
            <span>
              <i className="eff-high">2</i> Super effective
            </span>
            <span>
              <i className="eff-low">½</i> Not very effective
            </span>
            <span>
              <i className="eff-zero">0</i> No effect
            </span>
            <span>
              <i>·</i> Normal damage
            </span>
          </div>
          <div className="table-card">
            <table className="type-table">
              <thead>
                <tr>
                  <th>ATK ↓ / DEF →</th>
                  {types.types.map((t) => (
                    <th key={t}>
                      <span style={{ color: typeColors[t] }}>{t}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {types.types.map((a) => (
                  <tr key={a}>
                    <th>
                      <TypePill type={a} />
                    </th>
                    {types.types.map((d) => {
                      const value = types.data[a].effectiveness[d] ?? 1;
                      return (
                        <td key={d} title={`${a} → ${d}: ${value}×`}>
                          <span
                            className={
                              value > 1
                                ? "eff-high"
                                : value === 0
                                  ? "eff-zero"
                                  : value < 1
                                    ? "eff-low"
                                    : ""
                            }
                          >
                            {value === 1 ? "·" : value === 0.5 ? "½" : value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="field-tip">
            <Sparkles size={19} />
            <p>
              Two types? Multiply both matchups. A Fire move against a Plant /
              Toxic hollowing uses Fire’s multiplier against each type.
            </p>
          </div>
        </>
      )}
      {mode !== "types" &&
        (mode === "moves" ? filteredMoves.length : filtered.length) === 0 && (
          <div className="empty-state">
            <Search size={30} />
            <h3>No discoveries here just yet.</h3>
            <p>Try another name or select all types.</p>
          </div>
        )}
      {creature && (
        <div className="modal-backdrop" onClick={() => setSelected(null)} onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setSelected(null);
          }
        }}>
          <section
            className={`creature-detail modal-card ${mode === "bestiary" && !save?.caught.includes(creature.name) ? "seen-only" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${creature.name} details`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              aria-label="Close hollowing details"
              autoFocus
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
            <div
              className="detail-hero"
              style={
                {
                  "--creature-color": typeColors[creature.typing[0]],
                } as React.CSSProperties
              }
            >
              <CreatureArt name={creature.name} {...traits} interactive />
              <div>
                <span className="eyebrow">
                  FIELD GUIDE · #
                  {String(creatures.indexOf(creature) + 1).padStart(3, "0")}
                </span>
                <h2>{creature.name}</h2>
                <TraitBadges {...traits} />
                <CreatureTypes name={creature.name} />
                <p>{creature.description}</p>
                <div className="detail-measures">
                  <span>{creature.height} m tall</span>
                  <span>{creature.weight} kg</span>
                  <span>
                    {save?.caught.includes(creature.name)
                      ? "Caught"
                      : discovered.has(creature.name) ? "Seen · Not caught" : "Undiscovered"}
                  </span>
                </div>
                <small className="muted">Drag the model or use ← / → to rotate. Home resets the view.</small>
              </div>
            </div>
            <div className="detail-body">
              <section
                className="detail-habitats"
                aria-label="Where to find this hollowing"
              >
                <div className="habitat-heading">
                  <h3>
                    <MapPin size={17} aria-hidden="true" /> Where to find
                  </h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected(null);
                      useAdventure.getState().setPanel("map");
                    }}
                  >
                    View world map <ArrowRight size={14} />
                  </button>
                </div>
                {habitats[creature.name].length ? (
                  <>
                    <ul className="habitat-list">
                      {habitats[creature.name].map((zone) => (
                        <li key={zone.id}>
                          <div>
                            <strong>{zone.name}</strong>
                            <small>{zone.subtitle}</small>
                          </div>
                          <span>
                            Lv. {zone.level[0]}–{zone.level[1]}
                            {save && (
                              <small>
                                {save.visited.includes(zone.id)
                                  ? "Discovered"
                                  : "Not yet visited"}
                              </small>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Look for roaming hollowings in these areas. Different
                      hollowings appear as the local population refreshes.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      {starterNames.includes(creature.name)
                        ? "Choose this hollowing as your starter when beginning an adventure. It does not appear in the wild."
                        : "This hollowing does not appear in the wild in the current region."}
                    </p>
                    {creatures.flatMap((parent) =>
                      (parent.evolution_requirements ?? [])
                        .filter(
                          (e) =>
                            e.evolves_to === creature.name &&
                            ((e.type === "level" && e.level) ||
                              (e.type === "stone" &&
                                e.stone &&
                                stoneByKey[e.stone])),
                        )
                        .map((e, i) => (
                          <p
                            key={`${parent.name}-${i}`}
                            className="habitat-evolution"
                          >
                            Evolve{" "}
                            <button
                              className="text-button"
                              disabled={mode === "bestiary" && !discovered.has(parent.name)}
                              onClick={() => setSelected(parent.name)}
                            >
                              {mode === "bestiary" && !discovered.has(parent.name) ? "Unknown hollowing" : parent.name}
                            </button>{" "}
                            {e.type === "stone"
                              ? `using a ${stoneByKey[e.stone!].name} from a town shop.`
                              : `at level ${e.level}.`}
                          </p>
                        )),
                    )}
                  </>
                )}
              </section>
              <div>
                <h3>Base stats {shiny || alpha ? "with traits" : ""}</h3>
                {shiny && <p>Shiny: {shinyDescription(creature.name)}.</p>}
                {alpha && <p>Alpha: +{Math.round((encounterSettings.alphaStatMultiplier - 1) * 100)}% after shiny bonuses.</p>}
                {Object.entries(statLabels).map(([key, label]) => (
                  <div className="stat-bar" key={key}>
                    <span>{label}</span>
                    <div>
                      <i
                        style={{
                          width: `${Math.min(100, (previewStat(creature.name, key, traits) / 220) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {previewStat(creature.name, key, traits)}
                    </strong>
                  </div>
                ))}
                <h3>Abilities</h3>
                <p>{creature.abilities.join(" · ")}</p>
                <h3>Evolution</h3>
                {creature.evolution_requirements?.length ? (
                  creature.evolution_requirements.map((e, i) => (
                    <p key={i} className="evolution-line">
                      <span>
                        {e.type === "level"
                          ? `Level ${e.level}`
                          : `${e.type}: ${stoneByKey[e.stone ?? ""]?.name ?? e.stone ?? "special condition"}`}
                      </span>
                      <ArrowRight size={14} />
                      <button
                        className="text-button"
                        disabled={mode === "bestiary" && !discovered.has(e.evolves_to)}
                        onClick={() => setSelected(e.evolves_to)}
                      >
                        {mode === "bestiary" && !discovered.has(e.evolves_to) ? "Unknown hollowing" : e.evolves_to}
                      </button>
                    </p>
                  ))
                ) : (
                  <p>No further evolution recorded.</p>
                )}
              </div>
              <div>
                <h3>Learnset</h3>
                <div className="learnset">
                  {creature.moveset.map((m, i) => (
                    <div key={`${m.move_key}-${i}`}>
                      <small>Lv. {m.level}</small>
                      <span>
                        {moves[m.move_key]?.name ??
                          m.move_key.replace(/_/g, " ")}
                      </span>
                      {moves[m.move_key] ? (
                        <TypePill type={moves[m.move_key].type} />
                      ) : (
                        <small>Not defined</small>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
