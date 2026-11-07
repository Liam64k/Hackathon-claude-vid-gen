// Quick visual check of the cast + theme system. For each seed it writes src/cast.json from
// randomCast(seed) + a theme, renders the CastSheet and two Storyboard stills (a side shot and a
// top shot), then restores src/cast.json to null.
//   node app/scripts/cast-preview.mjs [outDir] [seed:theme ...]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../lib/paths.mjs";
import { randomCast } from "../lib/cast-data.mjs";
import { remotion } from "../lib/proc.mjs";

const out = path.resolve(process.argv[2] ?? path.join(ROOT, "out", "cast"));
const plan = process.argv.slice(3).length
  ? process.argv.slice(3).map((a) => a.split(":"))
  : [["alpha", "summer"], ["bravo", "storm"], ["charlie", "wildfire"]];
const PARTICLES = { winter: "snow", storm: "rain", wildfire: "ash", fallout: "ash" };
const CAST_JSON = path.join(ROOT, "src", "cast.json");
mkdirSync(out, { recursive: true });

const still = async (comp, file, frame, scale) => {
  const p = remotion(["still", "src/index.ts", comp, file, `--frame=${frame}`, "--scale=" + scale, "--log=error"], { keep: 20, timeoutMs: 5 * 60 * 1000 });
  const r = await p.done;
  if (r.code !== 0) throw new Error(`${comp} failed:\n${r.tail.join("\n")}`);
};

try {
  for (const [seed, theme] of plan) {
    const c = randomCast(seed);
    writeFileSync(CAST_JSON, JSON.stringify({ ...c, theme, particles: PARTICLES[theme] ?? "none" }, null, 2) + "\n");
    console.log(seed, theme, c.lead.name, c.second.name);
    await still("CastSheet", path.join(out, `${seed}-cast.png`), 0, 0.5);
    await still("Storyboard", path.join(out, `${seed}-side.png`), 0, 0.5);
    await still("Storyboard", path.join(out, `${seed}-top.png`), 4, 0.5);
  }
} finally {
  writeFileSync(CAST_JSON, "null\n");
}
