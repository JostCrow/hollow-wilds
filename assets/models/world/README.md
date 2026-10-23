# Island scenery kit

28 Blender-authored assets share the explorer's warm plaster, carved timber,
aged brass, muted canvas, stone, and foliage palette. The kit replaces the existing
world scenery in place; island geography, building collision footprints, door
locations, services, landmarks, and procedural decoration positions are preserved.

```sh
blender --background --python scripts/build-world-assets.py
```

The script uses only Blender's bundled Python. It writes:

- `world-kit.blend`: editable assets, grouped and arranged as a library.
- Individual `.glb` files: portable models, each exported at its own origin.
- `world-kit.json`: indexed geometry with baked bevels and normals, batched by
  material for synchronous use in the browser.

Source coordinates are Z up and -Y forward. Exports are Y up and +Z forward, in
metres. `cottage` has a 5.75 × 4.60 m wall footprint; the runtime scales X/Z to each
existing building's dimensions. Roof materials retain each building's service
color, and signs/awnings distinguish healing, supply, gym, and champion buildings.

The kit includes the cottage and service details, broadleaf and pine crowns,
snow-covered crowns and rocks, a branched trunk, grass, flowers, and all existing
landmark types: oak, reeds, mushrooms, camp, fountain, cart, bench, shrine, ruins,
crystals, windmill, and boat. Bridge planks/posts/rails and trail treasure caches
complete the set.

`src/game/three/world-assets.ts` shares immutable geometry while each actor/chunk
owns its materials. Streamed vegetation and spatial bridge batches use instancing;
crowns remain separate for camera occlusion handling. Ground and water use small,
deterministic local textures from `world-surfaces.ts`, with no external downloads.

For a close visual review while Vite is running, open
`http://localhost:3003/artifacts/world/review.html`. The review page uses the actual
runtime models and island terrain, with village, woodland, snow, landmark,
building, and bridge views.
