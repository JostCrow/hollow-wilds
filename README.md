# The Hollow Wilds

A playable, local browser adventure built around the existing 93 creatures, 183 moves, and 13 types. Pick a starter, explore 15 towns and 50 wild areas, catch visible wild creatures, train a team, and earn the Wildflower Badge.

## Run

Requires Node.js 22.6+ (Node 22.18+ recommended for the built-in TypeScript test runner).

```sh
npm install
npm run dev
```

Open **http://localhost:3003**. The app also runs as a static production build:

```sh
npm run build
npm run preview
```

## Play

- **WASD / arrows:** walk. **Shift:** run. **E / Space:** interact.
- **Click or tap the world:** walk to a location. Clicking a creature, person, or building finds a path to it and interacts on arrival.
- On a phone, use the directional pad and interaction button.
- Follow named north, south, east, and west exits to change areas. Click an arrow on the local minimap to walk to that exit. The regional map lets you revisit discovered locations.
- Walk into a wild creature to battle. Weaken it, then use a capture orb. A full team sends new captures into storage.
- Pink-roofed Healing Houses restore all HP and PP for free. Blue-roofed shops sell orbs, potions, and evolution stones (300 coins each). Trail treasures provide supplies.
- Find Pupawn on Sunpetal Trail or in Bramble Orchard. In **My team**, choose a compatible stone and evolution, then use the evolution button. One stone is consumed; level and experience are kept. Pupawn has 14 stone evolutions. Older version 2 saves load with an empty stone inventory.
- Register three species and win three battles, then speak to Ranger Elowen in Larkspur for the final challenge. Exploration continues after earning the badge.
- The sidebar opens the team, field journal, regional map, creature guide, move library, type matchup chart, and sortable base stats.

## Graphics

The world uses painted scenery sprites and the original illustrated player sprites, with a painted woodland background for battles. Environment artwork was generated using the original hollowing images as style references: dark illustrated contours, organic foliage, detailed materials, and dimensional colored shading. Trees, cottages, landmarks, bridges, and trail treasures are drawn from transparent sprite atlases, with depth ordering so characters can walk behind scenery. Original creature artwork is preserved across the overworld, battles, starter selection, team, and guide, including shiny and alpha forms.

Wild hollowings take short, smooth walks, turn as they move, and pause naturally. They avoid obstacles and each other, and pause near you or when clicked so you can approach and interact. Roaming pauses during battles, dialogue, and other screens. Reduced-motion settings keep roaming active with immediate position changes and no hopping.

All images are bundled with the app, without external image requests or a 3D dependency. Static scenery is cached and refreshed when artwork finishes loading. Reduced-motion preferences disable ambient animation. Generated artwork and its exact prompts are in `assets/world/`.

## Audio

Original synthesized music changes between towns, trails, and battles. Footsteps, encounters, attacks, capture orbs, healing, treasures, evolution, and battle results have their own sound cues. Audio starts with the first click or keypress and pauses while the tab is hidden.

Use the speaker button in the top bar or battle header to mute everything. **Settings & saves** has separate music and sound-effect volume sliders. Preferences are stored separately under `hollow-wilds-audio-v1`, so importing or restarting an adventure keeps your audio settings. No external audio files or network requests are needed.

## Saves

Progress autosaves to the browser under `hollow-wilds-adventure-v2`. Settings exports/imports validated version 2 JSON saves. Importing replaces the current adventure, so export a backup first. Old game files and legacy local-storage keys are not overwritten; their schema differs from the new game and they are not imported automatically.

The region has 65 connected maps: 15 towns with healing and shops, and 50 wild areas spanning woodland, orchards, lakes, river deltas, mountain switchbacks, snowy passes, and meadows. Areas range from 26×24 to 66×38 tiles, with a 30×64 mountain pass. Branches and loops connect the region in all four directions. Scroll the regional map, use Locate me, or search and filter its area directory. Travel buttons revisit discovered locations.

Four of the wild areas are dedicated guardian habitats:

| Habitat | Guardian | Kind |
| --- | --- | --- |
| Sunfire Sanctum | Solarius | Legendary |
| Dawnlight Spire | Lumidrake | Legendary |
| Nightveil Hollow | Umbradrake | Legendary |
| Eclipse Threshold | Eclipserion | Mythical |

Each guardian appears at its sanctuary’s eastern encounter spot at levels 35–40. Sanctuaries are reachable on foot without a badge gate. Guardians return through normal respawning or revisiting, so fleeing or defeating one does not permanently lose the encounter.

## Shiny and alpha forms

Wild creatures roll independent traits when they appear: **shiny 1 in 2 (50%)**, **alpha 1 in 20 (5%)**, and **both 1 in 40 (2.5%)**. These are probabilities per spawn, not a guarantee every second creature is shiny. Starters and trainer opponents remain ordinary. Change the odds and alpha multiplier in `data/encounter-settings.json`; the shiny rate is deliberately high for testing.

Shiny creatures use their species’ existing `shiny_boost` stat and bonus. Species without a defined boost receive +10 to all six base stats. Alpha multiplies each base stat by 1.2 **after** the shiny bonus, rounded down. These effective stats drive HP, physical/special damage, defenses, and turn order. For example, Solarius’s base special attack is 140, shiny is 155, alpha is 168, and shiny alpha is 186.

Shiny forms have an alternate color palette and a star marker; alphas are larger with an alpha marker. Both badges appear in battle, the team, and storage. Team cards show effective base stats, Settings shows encounter odds, and the field journal counts owned shiny and alpha companions. The creature guide and base-stat table have independent Shiny and Alpha preview switches.

Traits survive capture, storage transfers, healing, leveling, evolution, autosave, and JSON export/import. Older version 2 saves load with both traits set to false; existing companions are never rerolled.

Existing version 2 saves remain compatible with the expanded region; positions made inaccessible by changed terrain recover at the area’s safe starting point.

A fainted team returns to Willowfen fully healed. Save validation also recovers a fainted team or an invalid spawn position, preventing soft locks.

## Data and implementation

- `data/creatures.json`, `data/moves.json`, `data/types.json`: original source data, imported directly. Changes here appear on the next build; the new game does not read stale duplicates in `public/data`.
- `data/encounter-settings.json`: independent shiny/alpha odds and trait strength.
- `src/game/traits.ts`: shared trait rolls, stat bonuses, labels, and palette.
- `data/world.json`: individual dimensions, cardinal exits, authored trails, terrain patches, landmarks, services, encounter pools, and levels.
- `src/game/world.ts`: deterministic terrain, collisions, services, pickups, visible spawns, and pathfinding.
- `src/game/engine.ts`: pure battle resolution, capture, PP, leveling, level evolution, and JSON save validation.
- `src/game/store.ts`: game state, exploration interactions, inventory, and persistence.
- `src/game/WorldCanvas.tsx`: depth-sorted canvas scene, camera, keyboard/touch/click controls, and roaming creatures.
- `src/game/world-renderer.ts`: cached terrain and scenery illustrations, characters, and trail treasures.
- `src/game/world-art.ts`: illustrated atlas loading, measured crop bounds, transparency trimming, original character sprites, and terrain textures.
- `assets/world/`: two transparent environment atlases, the painted battle backdrop, and `art-prompts.txt` recording references and prompts.
- `src/game/roaming.ts`: individual roaming schedules, valid neighboring steps, and occupancy checks.
- Original monster images are loaded through `src/game/sprites.ts`. Missing artwork gets a type-colored field sketch. All 93 species remain available in the guide, even when not in the current region's encounter pools.

Combat includes move accuracy, physical/special stats, type effectiveness, same-type bonuses, PP, switching, potions, fleeing, and simplified status effects. Status effects are intentionally simplified; abilities, trade evolutions, and other advanced mechanics are reference data only. Undefined move references are labeled in the guide and excluded from playable learnsets; every creature always has a damaging move available. Level-up learning automatically keeps the latest four available moves, retaining at least one attack.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run validate-data
npm run build
```

Tests cover all starters, every species' playable learnsets, type matchups, capture/storage, invalid actions, PP exhaustion, fainting/recovery, evolution, the badge, save validation, reachability of every area's services, exits, NPCs, pickups, and encounter slots, the 65-area network and guardian habitats, independent trait odds, stacked combat stats, trait persistence, and legacy save migration.
