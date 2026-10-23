// Assemble Blender's per-species exports without bringing bpy into the app build.
import { readFile, writeFile } from 'node:fs/promises';
const directory = new URL('../assets/models/creatures/', import.meta.url);
const creatures = JSON.parse(await readFile(new URL('../data/creatures.json', import.meta.url), 'utf8'));
const library = {};
for (const {name} of creatures) {
  const file = new URL(`${name.toLowerCase()}.json`, directory);
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (data.name !== name || data.encoding !== 'quantized-v1' || !data.nodes?.length) {
    throw new Error(`Invalid Blender export for ${name}`);
  }
  library[name] = { file: `${name.toLowerCase()}.json`, reference: data.reference };
}
await writeFile(new URL('library.json', directory), JSON.stringify(library) + '\n');
console.log(`Packed ${Object.keys(library).length} Blender creatures`);
