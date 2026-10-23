# The Hollow Wilds

A playable, local browser adventure built around the existing 93 hollowings, 183 moves, and 13 types. Pick a starter, explore 15 towns and 50 wild areas, catch visible wild hollowings, train a team, and earn the Wildflower Badge.

## Run

Requires Node.js 22.18+ or Node.js 24+. Dependency versions are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open **http://localhost:3003**. The app also runs as a static production build:

```sh
npm run build
npm run preview
```

Typechecking and builds use TypeScript 7. ESLint uses the TypeScript 6 API through the compatibility alias recommended by [Microsoft](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0), so both tools can run together without conflicting compiler executables.

## The continuous 3D island

The game opens **The Hollow Wilds** as one continuous 3D open world, approximately 2.2 km across. The canvas fills the available browser viewport on desktop and mobile, with floating controls and no surrounding sidebar or scrolling page. The regional shoreline, 65 named places, and 74 curved trail connections share a single terrain surface. Towns, woodland, mountains, coastline, the central lake, and river crossings occupy their original island geography. Walking between places never loads a new area; place names are geographic labels.

- **W / ↑:** walk forward. **S / ↓:** walk backward. **A / ←** and **D / →:** turn left and right, including while walking. **Shift:** run.
- The camera stays behind the explorer and turns with them. Adjust **Camera tilt** and **Camera zoom** in **Menu → Settings**; preferences are saved on this browser. Mouse dragging and scrolling do not move the camera.
- Movement uses **WASD or arrow keys**. Buildings and trees use continuous geometric collision; the shoreline and water form natural boundaries. Road crossings over the river and lake become walkable bridges.
- **E:** interact with a nearby person, building, or wild hollowing. Captures, healing, shops, trainer challenges, inventory, and progression use the existing adventure rules. Battles render the 3D models at their relative sizes.
- **V:** study a nearby hollowing. The **3D field guide** also opens any of the 93 models beside the explorer, without adding it to the island.
- **View whole island:** inspect the single island from above. Return to the explorer or press a movement key to resume walking.
- The small map shows the whole island and your precise continuous position. It has no area-exit buttons. **Island map** opens the regional place directory.

**One world unit is one metre. The explorer is exactly 1.70 m tall.** Every hollowing is grounded and normalized to its `height` in `data/creatures.json`: Flarepib is 0.40 m, Verdreep 0.50 m, and Ohm-Titan 4.20 m. Free-floating decorative effects and outline shells do not inflate anatomical height. Alpha specimens are 20% larger; ordinary and shiny specimens retain the species height.

The library contains 93 Blender-authored, animated creatures. Each of the 76 illustrated species was modeled against its original image, with individual silhouettes, facial features, colors, markings, and appendages; the 17 species without artwork follow their appearance descriptions. Editable `.blend` files, portable GLBs, and compact indexed runtime geometry are retained. Original images in `assets/monster/` remain unchanged. The browser fetches each species when needed and shares its decoded geometry between actors. The island’s curated starting population is **19 residents across 17 species**; the full catalogue is available in the 3D field guide. These remain stylized sculptures; the reference illustrations are available beside them for comparison.

`worlds/registry.ts` selects world definitions independently of the creature library. A world supplies its identity, shoreline, elevation function, lakes, rivers, places, road curves, buildings, people, and resident list. Add another definition and register its ID to author a different island. Continuous position is saved as optional `openWorld: { worldId, x, z }`, and `worldVisits` records discoveries per world. Legacy version 2 saves still load; all existing team and progression data is retained. The game uses the 3D world exclusively, including battles. Older world-mode preferences have no effect.

- `src/game/worlds/hollow-island.ts`: first island geography and curated population, authored from the existing regional map.
- `src/game/worlds/geography.ts`, `geometry.ts`: continuous elevation, shoreline/water tests, geometric collision, deterministic scenery, and route waypoints. No gameplay grid or tile navigation is used by the 3D world.
- `src/game/three/island-landscape.ts`: one continuous terrain and road mesh, water, bridges, towns, and streamed vegetation detail. Rendering detail follows the camera without changing the world or player position.
- `src/game/three/scene.ts`: steering and forward/backward movement, fixed follow camera, continuous roaming, following companion, interactions, and position persistence.
- `src/game/three/catalog.ts`, `families.ts`, `creatures.ts`: per-species designs, shared anatomy, animations, and measured scaling.
- `src/game/three/model-stage.ts`, `BattleStage.tsx`: scale-comparison stage and 3D battle actors.
- `assets/models/`: 93 Blender-authored GLBs, editable sources and per-species runtime geometry in `creatures/`, and a manifest recording height and reference provenance. Rebuild all four batches in parallel with `npm run models:build` (Blender on PATH, the standard macOS install, or `BLENDER_BIN`). `npm run models:pack` checks library coverage; `npm run models:export` refreshes the manifest while retaining the full precision Blender GLBs. See [model authoring instructions](assets/models/README.md) for exporting manual Blender edits.
- `assets/models/explorer/`: Blender-authored playable character, editable source, portable GLB, and batched runtime geometry. Rebuild with `blender --background --python scripts/build-explorer.py`. The explorer has articulated idle/walk animation; town residents retain their original design.
- `assets/models/world/`: 28 matching Blender scenery assets, including the cottage/service kit, trees, rocks, vegetation, all existing landmarks, bridges, and treasure caches. Rebuild with `blender --background --python scripts/build-world-assets.py`. The runtime preserves existing geography and collision, instances repeated scenery, and uses local ground/water textures.

Three.js loads on demand. The world uses instanced vegetation, nearby detail streaming, a capped pixel ratio, local assets, and reduced-motion preferences. A WebGL failure explains how to enable WebGL or hardware acceleration and offers a retry button.

## In-game pages and controls

- The floating **Menu** button opens the team, field journal, regional map, Hollowdex, move library, type chart, base stats, 3D field guide, and settings as popups over the game. The world stays loaded, with movement and rendering paused while a popup is open.
- **Escape** opens or closes the game menu, or leaves a model study. **Back to adventure** closes a popup. Each visited page retains its filters and scroll position. Page URLs and browser Back/Forward also open and close the popups.
- **M:** world map. **H:** Hollowdex. **T:** my team. Shortcuts pause during battles and dialogue; letter shortcuts leave text fields alone.
- Use the sun/moon and speaker buttons in the floating controls to change menu appearance or mute audio. Settings also offers system appearance and separate volume sliders.
- Movement requires a keyboard. The canvas resizes with the browser viewport, including orientation changes.
- **3D field guide** opens the model catalogue as a popup. Choosing a species closes the guide and studies it beside the explorer in the existing scene.
- Pink-roofed Healing Houses restore all HP and PP for free. Blue-roofed shops sell orbs, potions, and evolution stones. Purple and gold halls offer gym and champion challenges.
- Captured hollowings join the team or storage. Manage companions, use potions, and evolve compatible species with stones from **My team**.
- The Hollowdex keeps a numbered slot for every hollowing. Unseen entries show a question mark; encountered hollowings appear in gray, and caught hollowings appear in full color. Your starter and evolved companions count as caught. Search and type filters reveal only discovered identities.

## Original artwork

Starter selection, team and storage cards, the Hollowdex, base-stat table, and 3D field guide use previews of the same Blender models as the world and battles. Hollowdex details and My team companions animate and support dragging or Left/Right arrow keys to rotate; Home resets the view. Visible previews load on demand and share one WebGL renderer. Shiny palettes, larger alpha forms, and discovery states are retained. Original illustrations remain in explicit reference panels and serve as a fallback if a preview cannot load. The previous canvas and tile-based overworld renderers, their walking and roaming helpers, and unused 2D engine dependencies have been removed.

All images are bundled locally. The 3D island loads Three.js on demand and respects reduced-motion preferences.

## Audio

Original synthesized music changes between towns, trails, and battles. Footsteps, encounters, attacks, capture orbs, healing, treasures, evolution, and battle results have their own sound cues. Audio starts with the first click or keypress and pauses while the tab is hidden.

Use the speaker button in the floating controls or battle header to mute everything. **Settings & saves** has separate music and sound-effect volume sliders. Preferences are stored separately under `hollow-wilds-audio-v1`, so importing or restarting an adventure keeps your audio settings. No external audio files or network requests are needed.

## Saves

Progress autosaves to the browser under `hollow-wilds-adventure-v2`. Settings exports/imports validated version 2 JSON saves. Importing replaces the current adventure, so export a backup first. Old game files and legacy local-storage keys are not overwritten; their schema differs from the new game and they are not imported automatically.

The region is an island with 65 named areas: 15 towns with healing and shops, and 50 wild areas spanning woodland, orchards, lakes, river deltas, mountain switchbacks, snowy passes, and meadows. A winding 32-area circuit connects every town; inland shortcuts and outer headland trails bring the network to 74 two-way connections. Nine optional trails end at habitat destinations, including all four guardian sanctuaries. The regional map shows the shoreline, forests, central lake and river, volcanic headlands, wetlands, and snowy peaks. View the whole island, zoom in, toggle place names, or use Locate me. Select any marker to inspect its walking connections; travel buttons revisit discovered locations. Search and filter the area directory below the map.

Four of the wild areas are dedicated guardian habitats:

| Habitat | Guardian | Kind |
| --- | --- | --- |
| Sunfire Sanctum | Solarius | Legendary |
| Dawnlight Spire | Lumidrake | Legendary |
| Nightveil Hollow | Umbradrake | Legendary |
| Eclipse Threshold | Eclipserion | Mythical |

Each guardian appears at its sanctuary’s eastern encounter spot at level 80. Sanctuaries are reachable on foot without a badge gate. Capture odds range from 2% at full HP to almost 18% near fainting. Once caught, that species never spawns again in the same adventure, including after travel, reload, or JSON import. Fleeing or defeating one allows another attempt; only one copy can roam a sanctuary at a time.

## Shiny and alpha forms

Wild hollowings roll independent traits when they appear: **shiny 1 in 2 (50%)**, **alpha 1 in 20 (5%)**, and **both 1 in 40 (2.5%)**. These are probabilities per spawn, not a guarantee every second hollowing is shiny. Starters and trainer opponents remain ordinary. Change the odds and alpha multiplier in `data/encounter-settings.json`; the shiny rate is deliberately high for testing.

Shiny hollowings use their species’ existing `shiny_boost` stat and bonus. Species without a defined boost receive +10 to all six base stats. Alpha multiplies each base stat by 1.2 **after** the shiny bonus, rounded down. These effective stats drive HP, physical/special damage, defenses, and turn order. For example, Solarius’s base special attack is 140, shiny is 155, alpha is 168, and shiny alpha is 186.

Shiny forms have an alternate color palette and a star marker; alphas are larger with an alpha marker. Both badges appear in battle, the team, and storage. Team cards show effective base stats, Settings shows encounter odds, and the field journal counts owned shiny and alpha companions. The hollowing guide and base-stat table have independent Shiny and Alpha preview switches.

Traits survive capture, storage transfers, healing, leveling, evolution, autosave, and JSON export/import. Older version 2 saves load with both traits set to false; existing companions are never rerolled.

Existing version 2 saves remain compatible with the expanded region; positions made inaccessible by changed terrain recover at the area’s safe starting point.

A fainted team returns to Willowfen fully healed. Save validation also recovers a fainted team or an invalid spawn position, preventing soft locks.

## Data and implementation

- `data/creatures.json`, `data/moves.json`, `data/types.json`: original source data, imported directly. Changes here appear on the next build; the new game does not read stale duplicates in `public/data`.
- `data/encounter-settings.json`: independent shiny/alpha odds and trait strength.
- `src/game/traits.ts`: shared trait rolls, stat bonuses, labels, and palette.
- `data/world.json`: the island circuit, regional positions, individual dimensions, cardinal exits, authored trails, terrain patches, landmarks, services, encounter pools, and levels.
- `src/game/IslandMap.tsx`, `src/game/island.ts`: island geography, curved trails, selectable locations, overview and zoom controls.
- `src/game/world.ts`: deterministic terrain, collisions, services, pickups, visible spawns, and pathfinding.
- `src/game/engine.ts`: pure battle resolution, capture, PP, leveling, level evolution, and JSON save validation.
- `src/game/store.ts`: game state, exploration interactions, inventory, and persistence.
- `assets/world/`: archived source artwork and generation prompts.
- Hollowing previews use the 3D library through `src/game/CreaturePreview.tsx`. If a model or WebGL is unavailable, `src/game/sprites.ts` supplies the original illustration or a type-colored field sketch. The Hollowdex includes numbered slots for all 93 species, revealing models and details as you encounter them.

Combat includes move accuracy, physical/special stats, type effectiveness, same-type bonuses, PP, switching, potions, fleeing, and simplified status effects. Status effects are intentionally simplified; abilities, trade evolutions, and other advanced mechanics are reference data only. Undefined move references are labeled in the guide and excluded from playable learnsets; every hollowing always has a damaging move available. Level-up learning automatically keeps the latest four available moves, retaining at least one attack.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run validate-data
npm run build
```

Tests cover all starters, every species' playable learnsets, type matchups, capture/storage, invalid actions, PP exhaustion, fainting/recovery, evolution, the badge, save validation, reachability of every area's services, exits, NPCs, pickups, and encounter slots, the 65-area network and guardian habitats, independent trait odds, stacked combat stats, trait persistence, and legacy save migration.

### Trainers and the badge circuit

Field NPCs marked with crossed swords offer trainer battles, with fixed regional parties from level 5 through 60. Defeat their whole party to earn coins; individual knockouts grant experience. Opposing trainers’ companions cannot be captured. Conceding or losing awards no money or progression. Winning rematches pays half the original prize.

Each town’s former rest hall is now a gym (purple roof) or Champion Hall (gold roof). Visit its front entrance and press E to preview the party and accept a challenge. The field journal lists the full circuit, locations, teams, rewards, and unlock requirements; the map also labels the halls.

Fight the 12 gyms in order: Willowfen (8), Larkspur (12), Tidemere (17), Cedarwick (22), Fernhollow (27), Dawnspire (32), Emberstead (37), Copperleaf (42), Glassharbor (47), Bellweather (52), Snowbell (56), and Nightbrook (60). Parentheses show the leader’s highest level. The first six gyms use strictly single-type teams. The remaining six combine types and grow to full parties.

All 12 badges unlock Champion Astra in Starfall (68), then Champion Rowan in Rosemere (73), and finally Champion Aurelia in Everlight (78). Each uses six hollowings with varied types and no type specialty. Elowen’s existing Wildflower ranger quest remains a separate introductory achievement. Existing version 2 saves receive empty league records and retain all other progress, including previously caught guardians.
