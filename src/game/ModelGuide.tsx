import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Search } from "lucide-react";
import { CreatureArt } from "./ui";
import { modelProfiles, speciesData } from "./three/catalog";

const creatureNames = Object.keys(modelProfiles);

export function ModelGuide({ onStudy }: { onStudy: (species: string) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [newOnly, setNewOnly] = useState(false);
  const names = creatureNames.filter((name) =>
    (!newOnly || modelProfiles[name].reference === "description") &&
    `${name} ${speciesData[name].typing.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(names.length / 12));
  const shown = names.slice(page * 12, (page + 1) * 12);
  return (
      <section
        className="field-catalogue"
        aria-label="3D field guide"
      >
        <div className="field-study-heading">
          <div>
            <span className="eyebrow">FROM THE SKETCHBOOK, INTO THE WORLD</span>
            <h2>The whole wild, at its own size.</h2>
          </div>
          <span>
            {creatureNames.length} / {creatureNames.length} SPECIES IN 3D
            <i>·</i>EXPLORER: 1.70 m
          </span>
        </div>
        <p className="field-catalogue-intro">
          Study every hollowing beside a 1.70 m explorer. The model library is
          ready for future islands; this first island has a curated population.
        </p>
        <div className="field-catalogue-tools">
          <label>
            <Search size={15} />
            <input
              aria-label="Search 3D hollowings"
              placeholder="Search by name or type…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <button
            aria-pressed={newOnly}
            onClick={() => {
              setNewOnly(!newOnly);
              setPage(0);
            }}
          >
            {newOnly && <Check size={13} />}New designs · 17
          </button>
          <span>{names.length} hollowings</span>
        </div>
        <div className="field-species-grid">
          {shown.map((name) => (
            <button
              key={name}
              onClick={() => onStudy(name)}
            >
              <span className="field-species-thumb">
                <CreatureArt name={name} />
              </span>
              <span>
                <strong>{name}</strong>
                <small>
                  {speciesData[name].height.toFixed(2)} m ·{" "}
                  {speciesData[name].typing.join(" / ")}
                </small>
              </span>
              <Eye size={14} />
            </button>
          ))}
        </div>
        {!names.length && (
          <p className="muted">No hollowings match that search.</p>
        )}
        <div className="field-pagination">
          <button
            disabled={page === 0}
            aria-label="Previous species page"
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={14} />
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            aria-label="Next species page"
            onClick={() => setPage(page + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
  );
}
