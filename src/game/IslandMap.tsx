import { useRef, useState } from "react";
import { Compass, Leaf, MapPin, Minus, Plus, Sparkles } from "lucide-react";
import { useAdventure } from "./store";
import { isTown, random, zones, zoneById } from "./world";
import { leagueAt } from "./progression";
import { islandRoutePath, islandShore } from "./island";
import "./island-map.css";

const forestPatches = [
  [175, 500, 95, 145], [325, 400, 112, 90], [443, 254, 95, 64],
  [730, 328, 62, 70], [352, 736, 80, 44], [175, 859, 57, 49],
];
const trees = forestPatches.flatMap(([cx, cy, rx, ry], patch) => {
  const rng = random(100 + patch);
  return Array.from({ length: 26 }, (_, i) => {
    const angle = rng() * Math.PI * 2, radius = Math.sqrt(rng());
    return { x: cx + Math.cos(angle) * radius * rx, y: cy + Math.sin(angle) * radius * ry, size: 9 + rng() * 7, id: `${patch}-${i}` };
  });
});
const mountains = [
  [695, 136, 26], [738, 96, 33], [798, 100, 28], [845, 203, 30],
  [896, 183, 26], [645, 511, 27], [700, 541, 21],
  [667, 810, 28], [714, 857, 33], [757, 887, 27],
];

function IslandTerrain() {
  return <>
    <defs>
      <linearGradient id="island-sea" x2=".8" y2="1">
        <stop stopColor="#c3e0dd" /><stop offset="1" stopColor="#9ec8ce" />
      </linearGradient>
      <linearGradient id="island-land" x2=".5" y2="1">
        <stop stopColor="#e2e7bd" /><stop offset=".5" stopColor="#dce5b9" /><stop offset="1" stopColor="#e7e4c8" />
      </linearGradient>
      <radialGradient id="island-woodland">
        <stop stopColor="#7d9d7378" /><stop offset="1" stopColor="#9cb28400" />
      </radialGradient>
      <pattern id="island-waves" width="65" height="52" patternUnits="userSpaceOnUse">
        <path d="M 12 23 q 8 5 16 0 t 16 0" fill="none" stroke="#f0fbef" strokeWidth="1.2" opacity=".35" />
      </pattern>
      <clipPath id="island-land-clip"><path d={islandShore} /></clipPath>
    </defs>
    <rect width="1000" height="1000" fill="url(#island-sea)" />
    <rect width="1000" height="1000" fill="url(#island-waves)" />
    <path d={islandShore} fill="none" stroke="#e9f3d7" strokeWidth="46" opacity=".3" />
    <path d={islandShore} fill="none" stroke="#eaf4df" strokeWidth="26" opacity=".65" />
    <path d={islandShore} fill="url(#island-land)" stroke="#e9d7a3" strokeWidth="13" />
    <g clipPath="url(#island-land-clip)">
      <path d="M 682 92 Q 806 16 929 164 L 948 267 Q 832 307 730 230 Z" fill="#d0b68e" opacity=".6" />
      <path d="M 786 71 Q 850 113 815 144 Q 774 174 746 133 Z" fill="#b99478" opacity=".7" />
      <path d="M 672 709 Q 752 713 803 823 Q 873 933 765 943 Q 666 942 592 791 Z" fill="#eaf0e4" />
      <path d="M 831 328 Q 938 321 965 422 Q 910 463 849 417 Z" fill="#aac4a08c" />
      <path d="M 129 630 Q 66 573 68 614 Q 45 680 140 724 Q 181 710 161 662 Z" fill="#b4c18480" />
      <path d="M 236 795 Q 217 841 154 852 Q 152 890 211 879 Q 283 866 305 789 Z" fill="#93ac9475" />
      {forestPatches.map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx * 1.3} ry={ry * 1.3} fill="url(#island-woodland)" />)}
      <path d="M 528 515 C 559 501 581 518 590 548 C 622 559 621 590 597 615 C 579 649 536 659 510 628 C 479 607 497 578 505 561 C 490 538 509 521 528 515 Z" fill="#9ac6c4" stroke="#d7e4bb" strokeWidth="8" />
      <path d="M 536 550 q 20 -7 33 4 m -49 31 q 32 -8 54 3 m -36 29 q 12 -4 24 -1" fill="none" stroke="#d9eeee" strokeWidth="2" />
      <path d="M 518 536 C 493 506 476 486 439 468 C 405 442 421 399 387 377 C 348 344 305 364 272 335 C 243 315 222 316 206 294" fill="none" stroke="#c2dab9" strokeWidth="17" />
      <path d="M 518 536 C 493 506 476 486 439 468 C 405 442 421 399 387 377 C 348 344 305 364 272 335 C 243 315 222 316 206 294" fill="none" stroke="#9fc6bf" strokeWidth="10" />
      <path d="M 846 394 Q 870 421 908 427 M 864 400 Q 884 385 929 404 M 885 416 Q 873 447 916 456" fill="none" stroke="#8eb7b3" strokeWidth="7" />
      <ellipse cx="909" cy="207" rx="26" ry="17" fill="#91b5a9" stroke="#bcab86" strokeWidth="4" />
      <ellipse cx="745" cy="890" rx="31" ry="19" fill="#a9cbd2" stroke="#faf6e8" strokeWidth="6" />
      {trees.map(({ x, y, size, id }) => <g key={id} transform={`translate(${x} ${y})`} opacity=".45">
        <path d={`M 0 ${size} v ${size * .5}`} stroke="#687d53" strokeWidth="2" />
        <path d={`M ${-size * .7} ${size} Q ${-size} ${size * .3} 0 ${-size} Q ${size} ${size * .3} ${size * .7} ${size} Z`} fill="#708d64" stroke="#5c7859" strokeWidth=".7" />
      </g>)}
      {mountains.map(([x, y, size], i) => <g key={i} transform={`translate(${x} ${y})`}>
        <path d={`M ${-size} ${size * .8} L 0 ${-size} L ${size} ${size * .8} Z`} fill={i > 6 ? "#b4c2b7" : "#a8957a"} stroke="#8c91776b" />
        <path d={`M 0 ${-size} L ${size} ${size * .8} L 3 ${size * .55} Z`} fill={i > 6 ? "#ced9cf" : "#c5b18e"} />
        <path d={`M ${-size * .35} ${-size * .36} L 0 ${-size} L ${size * .36} ${-size * .36} L 2 ${-size * .48} L -4 ${-size * .27} Z`} fill={i > 6 ? "#fffaf0" : "#e5d7b4"} />
      </g>)}
    </g>
    <g className="island-terrain-labels">
      <text x="750" y="178">SUNFIRE HEADLAND</text>
      <text x="323" y="492">CEDAR WILDS</text>
      <text x="546" y="593" className="island-lake-label">Stillwater</text>
      <text x="711" y="835">FROSTGLASS PEAKS</text>
      <text x="229" y="853">NIGHTVEIL</text>
      <text x="900" y="481" className="island-sea-label">EASTERN SEA</text>
      <text x="93" y="257" className="island-sea-label">TIDEMERE BAY</text>
    </g>
  </>;
}

export function IslandMap() {
  const { save, fastTravel } = useAdventure();
  const [zoom, setZoom] = useState(1);
  const [names, setNames] = useState(false);
  const [selection, setSelection] = useState(save?.zone ?? "willowfen");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = zoneById(selection);
  const visited = !!save?.visited.includes(selected.id);
  const locate = () => {
    if (!save) return;
    setSelection(save.zone);
    scrollRef.current?.querySelector(".current")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };
  return <>
    <div className="map-toolbar island-toolbar">
      <span>A circuit around the island. Side trails reward a little curiosity.</span>
      <div className="island-map-controls">
        <button className="secondary-button" onClick={() => setZoom(1)} disabled={zoom === 1}>Whole island</button>
        <button className="secondary-button" aria-label="Zoom out on island map" disabled={zoom === 1} onClick={() => setZoom(Math.max(1, zoom - .4))}><Minus size={15} /></button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button className="secondary-button" aria-label="Zoom in on island map" disabled={zoom >= 2.2} onClick={() => setZoom(Math.min(2.2, zoom + .4))}><Plus size={15} /></button>
        <button className="secondary-button" aria-pressed={names} onClick={() => setNames(!names)}>Place names</button>
        <button className="secondary-button" onClick={locate} disabled={!save}>Locate me <Compass size={15} /></button>
      </div>
    </div>
    <div className="region-map-scroll island-map-scroll" ref={scrollRef} style={{ maxHeight: zoom === 1 ? "none" : undefined }} tabIndex={0} role="region" aria-label="Island map. Zoom in for detail, or select a place to see its walking connections.">
      <div className={`region-map island-map ${names ? "show-place-names" : ""}`} style={{ width: `${zoom * 100}%` }}>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="An island surrounded by sea, with a winding circular town circuit, inland shortcuts, forests, rivers, mountains, snowy peaks, and paths ending at remote habitats.">
          <IslandTerrain />
          {zones.flatMap((z) => z.exits.filter((e) => z.id < e.target).map((exit) => {
            const dest = zoneById(exit.target), path = islandRoutePath(z, exit, dest);
            const active = z.id === selection || dest.id === selection;
            return <g key={`${z.id}-${dest.id}`} className={active ? "selected-island-route" : undefined}>
              <path className="island-route-edge" d={path} /><path className="island-route" d={path} />
            </g>;
          }))}
        </svg>
        <span className="map-watermark">THE HOLLOW WILDS<span>AN ISLAND TO WANDER</span></span>
        {zones.map((z) => {
          const town = isTown(z), dx = z.mapX - 50, dy = z.mapY - 49;
          const labelSide = Math.abs(dx) > Math.abs(dy) * 1.1 ? dx < 0 ? "west" : "east" : dy < 0 ? "north" : "south";
          return <button key={z.id}
            className={`map-stop island-stop label-${labelSide} ${town ? "town-stop" : "wild-stop"} ${z.sanctuary ? "sanctuary-stop" : ""} ${save?.visited.includes(z.id) ? "visited" : ""} ${save?.zone === z.id ? "current" : ""} ${selection === z.id ? "selected" : ""}`}
            style={{ left: `${z.mapX}%`, top: `${z.mapY}%` }}
            aria-label={`${z.name}${z.sanctuary ? `, ${z.sanctuary.species} sanctuary` : ""}${save?.zone === z.id ? ", you are here" : save?.visited.includes(z.id) ? ", discovered" : ", undiscovered"}${z.exits.length === 1 ? ", dead-end habitat" : ""}`}
            aria-pressed={selection === z.id} title={z.name} onClick={() => setSelection(z.id)}>
            <span>{z.sanctuary ? <Sparkles size={13} /> : town ? <MapPin size={14} /> : <Leaf size={9} />}</span>
            <strong>{z.name}</strong>
          </button>;
        })}
        <span className="map-compass">N<br />↑<br /><small>W + E</small><br />S</span>
        <span className="island-map-scale">WALK THE TRAILS · FOLLOW THE SIGNPOSTS</span>
      </div>
    </div>
    <div className="island-legend">
      <span><i className="legend-town" />Town</span><span><i className="legend-wild" />Wild area</span><span><i className="legend-sanctuary" />Guardian habitat</span><span><i className="legend-road" />Walking trail</span>
      <span>Select any place to see where its trails lead.</span>
    </div>
    <div className="island-place-detail" aria-live="polite">
      <div>
        <span className="eyebrow">{selected.sanctuary ? "GUARDIAN HABITAT" : isTown(selected) ? "ISLAND TOWN" : selected.exits.length === 1 ? "TRAIL’S END" : "WILD TRAIL"}{save?.zone === selected.id ? " · YOU ARE HERE" : ""}</span>
        <h3>{selected.name}</h3>
        <p>{selected.sanctuary ? `${selected.sanctuary.species} · Level 80 · ` : ""}{selected.kind} · {visited ? "Discovered" : "Follow the trails to discover"}{leagueAt(selected.id) ? ` · ${leagueAt(selected.id)!.kind === "gym" ? `${leagueAt(selected.id)!.badge} Gym` : leagueAt(selected.id)!.name}` : ""}</p>
        <div className="island-place-connections">{selected.exits.map((exit) => <button key={exit.target} onClick={() => setSelection(exit.target)}>{exit.direction} → {zoneById(exit.target).name}</button>)}</div>
      </div>
      {visited && <button className="secondary-button" disabled={save?.zone === selected.id} onClick={() => fastTravel(selected.id)}>Travel here <MapPin size={15} /></button>}
    </div>
  </>;
}
