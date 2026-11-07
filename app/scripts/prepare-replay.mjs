// One-off/maintenance: snapshot the example episode and render its storyboard stills for replay mode.
// Usage: node app/scripts/prepare-replay.mjs
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { ensureExampleSnapshot, EXAMPLE_BUILD, owner, checkout } from "../lib/workspace.mjs";
import { loadShots, validateShots } from "../lib/validate.mjs";
import { storyboard } from "../lib/remotion-tasks.mjs";
import { APP, EXAMPLE_SLUG } from "../lib/paths.mjs";

console.log("snapshot created:", ensureExampleSnapshot(), "owner:", owner());
checkout(EXAMPLE_SLUG);
const shots = await loadShots();
console.log("TITLE", shots.TITLE, "lines", shots.LINES.length, "shots", shots.SHOTS.length);
console.log("validate:", validateShots(shots, shots.LINES.map((l) => ({ text: l.text }))));
const art = path.join(APP, "replays", "artifacts");
mkdirSync(art, { recursive: true });
writeFileSync(path.join(art, "lines.json"), JSON.stringify(shots.LINES, null, 2) + "\n");
const t0 = Date.now();
const r = await storyboard(shots.SHOTS.length, {
  dir: path.join(EXAMPLE_BUILD, "storyboard"),
  sheet: path.join(EXAMPLE_BUILD, "storyboard-contact.png"),
  onProgress: (v, l) => process.stdout.write(`\r${l}   `),
});
console.log("\nstoryboard", r.ok, r.width, r.height, r.tiles, `${((Date.now() - t0) / 1000).toFixed(1)} s`, r.ok ? "" : r.tail.join("\n"));
