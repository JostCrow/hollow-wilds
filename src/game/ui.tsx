import { type CSSProperties } from "react";
import { species, typeColors } from "./data";
import { spriteUrl } from "./sprites";
import { SHINY_FILTER, traitLabel } from "./traits";
import type { Traits } from "./traits";
export function CreatureArt({
  name,
  className = "",
  shiny = false,
  alpha = false,
}: {
  name: string;
  className?: string;
} & Partial<Traits>) {
  return (
    <img
      className={`creature-art ${alpha ? "alpha-art" : ""} ${className}`}
      style={shiny ? { filter: SHINY_FILTER } : undefined}
      src={spriteUrl(name)}
      alt={`${traitLabel({ shiny, alpha })} ${name}`.trim()}
      draggable={false}
      loading="lazy"
    />
  );
}
export function TraitBadges(traits: Partial<Traits>) {
  if (!traits.shiny && !traits.alpha) return null;
  return <span className="trait-badges">
    {traits.shiny && <span className="shiny-badge">✦ Shiny</span>}
    {traits.alpha && <span className="alpha-badge">α Alpha</span>}
  </span>;
}
export function TypePill({ type }: { type: string }) {
  return (
    <span
      className="type-pill"
      style={{ "--type": typeColors[type] ?? "#7a927d" } as CSSProperties}
    >
      <i />
      {type}
    </span>
  );
}
export function CreatureTypes({ name }: { name: string }) {
  return (
    <span className="type-pills">
      {species[name].typing.map((t) => (
        <TypePill key={t} type={t} />
      ))}
    </span>
  );
}
export function HpBar({
  hp,
  max,
  large = false,
}: {
  hp: number;
  max: number;
  large?: boolean;
}) {
  return (
    <div
      className={`hp-track ${large ? "large" : ""}`}
      role="meter"
      aria-label="Health"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={hp}
    >
      <span
        style={{
          width: `${(hp / max) * 100}%`,
          background:
            hp / max < 0.25
              ? "#c77a65"
              : hp / max < 0.5
                ? "#c6ac65"
                : undefined,
        }}
      />
    </div>
  );
}
