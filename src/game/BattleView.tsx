import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleDot,
  FlaskConical,
  Footprints,
  Repeat2,
  Sparkles,
  Swords,
} from "lucide-react";
import { useAdventure } from "./store";
import { AudioToggle } from "./AudioControls";
import { moves, species, effectiveness } from "./data";
import { catchChance, xpNeeded } from "./engine";
import type { Action } from "./engine";
import { TraitBadges, CreatureArt, CreatureTypes, HpBar, TypePill } from "./ui";
import battleGlade from "../../assets/world/battle-glade-v1.png";
import "./battle-art.css";

export function BattleView() {
  const { battle, save, act, closeBattle } = useAdventure();
  const [switching, setSwitching] = useState(false),
    [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [battle?.turn]);
  if (!battle || !save) return null;
  const active = save.party.find((c) => c.id === battle.active)!,
    enemy = battle.enemy;
  const action = (a: Action) => {
    if (busy || battle.outcome) return;
    setBusy(true);
    act(a);
    setSwitching(false);
    timer.current = setTimeout(() => setBusy(false), 600);
  };
  return (
    <div
      className="battle-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hollowing battle"
    >
      <div className="battle-card">
        <div className="battle-topline">
          <span>
            <Swords size={16} />
            {battle.opponent ? `${battle.opponent.kind.toUpperCase()} CHALLENGE` : battle.trainer ? "THE RANGER CHALLENGE" : "A WILD ENCOUNTER"}
          </span>
          <span>
            <AudioToggle />
            Turn {battle.turn + 1} <i />{" "}
            {battle.opponent ? `${battle.opponent.name} · ${battle.reserves.length + (battle.enemy.hp > 0 ? 1 : 0)}/${battle.opponent.team.length} remaining` : battle.trainer ? "Field test" : "Wild hollowing"}
          </span>
        </div>
        <div className={`battle-field ${busy ? "is-attacking" : ""}`}>
          <img className="battle-glade" src={battleGlade} alt="" aria-hidden="true" draggable={false} />
          <div className="enemy-info battle-info">
            <div>
              <strong>{enemy.species} <TraitBadges {...enemy} /></strong>
              <span>Lv. {enemy.level}</span>
            </div>
            <CreatureTypes name={enemy.species} />
            <HpBar hp={enemy.hp} max={enemy.maxHp} large />
            <small>
              {enemy.hp} / {enemy.maxHp} HP
              {battle.conditions[enemy.id] &&
                ` · ${battle.conditions[enemy.id]}`}
            </small>
          </div>
          <div
            className={`battle-enemy ${enemy.hp === 0 || battle.outcome === "caught" ? "fainted" : ""}`}
          >
            <CreatureArt name={enemy.species} shiny={enemy.shiny} alpha={enemy.alpha} />
          </div>
          <div className="battle-ally">
            <CreatureArt name={active.species} shiny={active.shiny} alpha={active.alpha} />
          </div>
          <div className="ally-info battle-info">
            <div>
              <strong>{active.species} <TraitBadges {...active} /></strong>
              <span>Lv. {active.level}</span>
            </div>
            <CreatureTypes name={active.species} />
            <HpBar hp={active.hp} max={active.maxHp} large />
            <small>
              {active.hp} / {active.maxHp} HP
              {battle.conditions[active.id] &&
                ` · ${battle.conditions[active.id]}`}
            </small>
            <div className="xp-track">
              <span
                style={{
                  width: `${(active.xp / xpNeeded(active.level)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="battle-bottom">
          <div
            className="battle-log"
            ref={logRef}
            role="log"
            aria-live="polite"
          >
            {battle.log.map((line, i) => (
              <p key={i} className={i >= battle.log.length - 3 ? "recent" : ""}>
                {line}
              </p>
            ))}
          </div>
          <div className="battle-actions">
            {battle.outcome ? (
              <div className="battle-result">
                <Sparkles size={25} />
                <h2>
                  {battle.outcome === "won"
                    ? battle.trainer
                      ? battle.opponent?.kind === "gym" ? `${battle.opponent.badge} Badge earned!` : battle.opponent?.kind === "champion" ? "A champion defeated!" : battle.opponent ? "Trainer defeated!" : "A ranger in the making."
                      : "That’s a little more experience."
                    : battle.outcome === "caught"
                      ? "A new friend for the journey."
                      : battle.outcome === "lost"
                        ? "Everyone needs a little rest."
                        : "Onward, wanderer."}
                </h2>
                <button className="primary-button" onClick={closeBattle}>
                  Back to the trail <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <>
                <div className="battle-prompt">
                  <strong>What will {active.species} do?</strong>
                  <span>
                    {switching ? "Choose a companion" : "Choose a move"}
                  </span>
                </div>
                {switching ? (
                  <div className="switch-list">
                    {save.party.map((c) => (
                      <button
                        key={c.id}
                        disabled={busy || c.hp === 0 || c.id === active.id}
                        onClick={() => action({ type: "switch", id: c.id })}
                      >
                        <CreatureArt name={c.species} shiny={c.shiny} alpha={c.alpha} />
                        <span>
                          {c.species} <TraitBadges {...c} />
                          <small>
                            Lv. {c.level} · {c.hp}/{c.maxHp} HP
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="move-grid">
                    {active.moves.map((key) => {
                      const move = moves[key],
                        mult = effectiveness(
                          move.type,
                          species[enemy.species].typing,
                        );
                      return (
                        <button
                          className="move-button"
                          disabled={busy || active.pp[key] === 0}
                          onClick={() => action({ type: "move", key })}
                          key={key}
                        >
                          <span>
                            <strong>{move.name}</strong>
                            <small>
                              {active.pp[key]}/{move.max_uses} PP
                            </small>
                          </span>
                          <span>
                            <TypePill type={move.type} />
                            <small>
                              {move.power
                                ? `${move.power} power${mult > 1 ? " · Effective!" : mult < 1 ? " · Resisted" : ""}`
                                : "Status move"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                    {!active.moves.some((k) => active.pp[k] > 0) && (
                      <button
                        className="move-button"
                        onClick={() =>
                          action({ type: "move", key: "struggle" })
                        }
                        disabled={busy}
                      >
                        Struggle · no PP required
                      </button>
                    )}
                  </div>
                )}
                <div className="battle-tools">
                  <button
                    disabled={busy || !save.balls || battle.trainer}
                    onClick={() => action({ type: "catch" })}
                  >
                    <CircleDot size={18} />
                    <span>
                      Capture{" "}
                      <small>
                        {save.balls} orbs ·{" "}
                        {Math.round(catchChance(enemy) * 100)}%
                      </small>
                    </span>
                  </button>
                  <button
                    disabled={
                      busy || !save.potions || active.hp === active.maxHp
                    }
                    onClick={() => action({ type: "potion" })}
                  >
                    <FlaskConical size={18} />
                    <span>
                      Potion <small>{save.potions} left · +30 HP</small>
                    </span>
                  </button>
                  <button
                    disabled={
                      busy || save.party.filter((c) => c.hp > 0).length < 2
                    }
                    onClick={() => setSwitching(!switching)}
                  >
                    <Repeat2 size={18} />
                    <span>{switching ? "Moves" : "Switch"}</span>
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => action({ type: "run" })}
                  >
                    <Footprints size={18} />
                    <span>{battle.trainer ? "Concede" : "Run"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
