// Refresh provenance without replacing Blender's full precision GLBs with runtime quantization.
import { access, writeFile } from "node:fs/promises";
import { modelProfiles, speciesData, PLAYER_HEIGHT_METRES } from "../src/game/three/catalog.ts";
const directory = new URL("../assets/models/", import.meta.url);
const names = Object.keys(modelProfiles);
for (const name of names) {
  for (const file of [`${name.toLowerCase()}.glb`, `creatures/${name.toLowerCase()}.blend`, `creatures/${name.toLowerCase()}.json`]) {
    await access(new URL(file, directory));
  }
}
await writeFile(new URL("manifest.json", directory), JSON.stringify({
  units: "metres",
  upAxis: "Y",
  forwardAxis: "+Z",
  explorerHeight: PLAYER_HEIGHT_METRES,
  models: names.map((name) => ({
    name,
    file: `${name.toLowerCase()}.glb`,
    height: speciesData[name].height,
    family: modelProfiles[name].family,
    authoring: "Blender",
    editable: `creatures/${name.toLowerCase()}.blend`,
    runtime: `creatures/${name.toLowerCase()}.json`,
    designSource: modelProfiles[name].reference,
    reference: modelProfiles[name].reference === "illustration" ? `../monster/${speciesData[name].sprite}` : null,
    appearance: speciesData[name].appearance,
  })),
}, null, 2) + "\n");
console.log(`Verified ${names.length} Blender sources, GLBs and runtime assets; refreshed manifest.`);
