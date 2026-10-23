// Run batches concurrently; each owns disjoint species and an independent Blender process.
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
let blender = process.env.BLENDER_BIN;
if (!blender) {
  const mac = '/Applications/Blender.app/Contents/MacOS/blender';
  try { await access(mac); blender = mac; } catch { blender = 'blender'; }
}
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
await Promise.all(['a','b','c','d'].map(batch => run(blender, ['--background','--threads','2','--python',`scripts/creature-models/batch_${batch}.py`])));
await run(process.execPath, ['scripts/pack-creature-models.mjs']);
await run(process.execPath, ['--experimental-strip-types','scripts/export-creature-models.mjs']);
