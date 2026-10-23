# Explorer

The playable explorer is authored with Blender, with shaped garments, a curved
cap, facial features, hiking boots, a canvas rucksack and a bedroll. The game uses
11 articulated groups for idle breathing, arm swing, knee bending and pack motion.
Town residents and hollowing designs are unchanged.

- `explorer.blend`: editable model, with material batches parented to named pivots.
- `explorer.glb`: portable model with the same named hierarchy and PBR materials.
- `explorer.json`: indexed geometry and normals, batched by joint and material.
  The synchronous runtime factory uses this local asset without a loading flash.

Rebuild from the repository root with Blender 5.3:

```sh
blender --background --python scripts/build-explorer.py
```

The script needs only Blender's bundled Python. It exports all three assets and
renders front/back previews into `artifacts/explorer/`. The source scene uses Z up
and -Y forward; both game exports use Y up and +Z forward, in metres. The game
grounds and normalizes the complete explorer to exactly 1.70 m, using the same
height contract as its creature comparison stages.

Runtime integration is in `src/game/three/explorer.ts`. Geometry is shared between
explorer instances; materials belong to each instance and are disposed with it.
The GLB contains the rest pose; procedural game animations live in TypeScript.
