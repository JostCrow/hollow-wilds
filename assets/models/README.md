# Hollowing 3D library

All 93 creatures are modeled in Blender. The 76 original illustrations in `assets/monster/` were inspected and used as the visual references; 17 creatures have no illustration and follow their original appearance descriptions. The models are stylized sculptures with individually authored anatomy, faces, markings, and appendages.

Each creature has:

- `{species-lowercase}.glb`: a portable model exported directly from Blender.
- `creatures/{species-lowercase}.blend`: editable sculpture and animation joint hierarchy.
- `creatures/{species-lowercase}.json`: indexed, material-batched geometry used by the game.
- An original/reference comparison render in `artifacts/creatures/`.

[`manifest.json`](manifest.json) records species height, anatomical family, artwork provenance, and the editable/runtime paths. `creatures/library.json` is a compact completeness index, not a combined geometry payload.

One unit is one metre, Y is up, and game models face +Z. The Blender authoring API in [`common.py`](../../scripts/creature-models/common.py) accepts those same coordinates and converts them to Blender's Z-up, -Y-forward convention. Export normalizes anatomy to each species' recorded height. The explorer is 1.70 m tall; alpha creatures are 20% larger. Runtime outlines and floating effects are excluded from anatomical measurements.

The browser fetches each creature's geometry on demand. Positions use 16-bit quantization, normals use signed bytes, and indexed meshes are batched by joint and pigment. Decoded buffers and toon palettes are shared by repeated actors. The game adds dark contour outlines, idle/walk motion, articulated heads, tails, limbs and wings, and isolated shiny palettes. The GLB keeps full precision standard materials; procedural animation and toon outlines belong to the game renderer.

## Rebuild from the authored scripts

Requires Blender on PATH, `/Applications/Blender.app`, or an explicit `BLENDER_BIN`:

```sh
npm run models:build
```

The four batches run in independent Blender processes. `batch_a.py`, `batch_b.py`, and `batch_c.py` cover the 76 illustrated species; `batch_d.py` covers the 17 appearance-only designs. Every batch retains the `.blend`, exports GLB/runtime data, and renders a studio PNG for review. The source images remain unchanged and are never used as gameplay billboards.

A single species can be rebuilt without regenerating the whole library:

```sh
blender --background --python scripts/creature-models/batch_a.py -- Flarepib
npm run models:pack
npm run models:export
```

Ferronyx has a dedicated reference-led sculpture in `scripts/creature-models/ferronyx.py`, invoked by batch A. Its open cog assemblies, chamfered overlapping armor, snarling jaw, individual fangs and talons, and segmented blade tail are modeled as geometry. The seven existing animation joints are retained. Rebuild it with `batch_a.py -- Ferronyx`, then run the pack/export commands above. `render_ferronyx.py` renders the saved Blender file from four review angles into `artifacts/creatures/ferronyx-review/` without changing the asset.

The other thirteen Pupawn evolutions are independently authored in `pupawn_evolutions.py`, using the sculpting and fitted surface-marking tools in `pupawn_anatomy.py`. Batch A dispatches to these builders, so full library rebuilds retain the new models. Each form has reference-specific proportions, coat construction, mane, face and tail; Tempestral also retains its two wing joints. Wraithound's pigments export optional `opacity`, and glowing eyes, runes and veins export optional `emission`. Older assets default to opaque, non-emissive toon shading. Shiny forms tint emission independently, and translucent vapor omits opaque outlines and shadow casting.

```sh
# Build all thirteen remaining evolution forms (Ferronyx is preserved).
blender --background --python scripts/creature-models/pupawn_evolutions.py
# Or pass individual species after --, as with batch A.
blender --background --python scripts/creature-models/pupawn_evolutions.py -- Runaris Verdama
# Render additional angles from saved sources without rebuilding geometry.
blender --background --python scripts/creature-models/pupawn_review.py -- Runaris Verdama --views=front,rear
npm run models:pack
npm run models:export
```

Family review renders and the interactive before/reference/after comparison live in `artifacts/creatures/pupawn-evolutions-review/`. All new forms use the original head, tail and four limb joints, preserving the game's idle and walking animation.

## Export manual Blender edits

Edit the creature's `.blend` file and retain its `body` root, named joint hierarchy, and colored materials. Then export that edited file rather than rerunning the authoring script:

```sh
blender --background --python scripts/creature-models/export_blends.py -- Flarepib
npm run models:pack
npm run models:export
```

Omit species names to refresh all saved Blender files. Add `--no-render` to skip studio evidence. `models:pack` verifies that all 93 species have runtime data; `models:export` refreshes the manifest and preserves the full precision Blender GLBs.
