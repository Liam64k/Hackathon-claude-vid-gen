// app/lib/timing.mjs must match src/timeline.ts frame for frame (the real TS is bundled with esbuild).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { ROOT, RUNTIME, SRC } from "../lib/paths.mjs";
import { EXAMPLE_BUILD } from "../lib/workspace.mjs";
import { computeTiming } from "../lib/timing.mjs";
import { loadShots } from "../lib/validate.mjs";
import { readJson } from "../lib/store.mjs";

const require = createRequire(path.join(ROOT, "package.json"));
let n = 0;
const runTs = async (edits) => {
  const dir = path.join(RUNTIME, `tl-${process.pid}-${n++}`);
  mkdirSync(dir, { recursive: true });
  for (const f of ["timeline.ts", "edits.ts", "types.ts"]) cpSync(path.join(SRC, f), path.join(dir, f));
  cpSync(path.join(EXAMPLE_BUILD, "shots.ts"), path.join(dir, "shots.ts"));
  cpSync(path.join(EXAMPLE_BUILD, "audio.json"), path.join(dir, "audio.json"));
  writeFileSync(path.join(dir, "edits.json"), JSON.stringify(edits));
  try {
    const code = require("esbuild").buildSync({ entryPoints: [path.join(dir, "timeline.ts")], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" }).outputFiles[0].text;
    const out = path.join(dir, "out.mjs");
    writeFileSync(out, code);
    return await import(pathToFileURL(out).href);
  } finally { /* keep until import finished */ rmSync(dir, { recursive: true, force: true }); }
};

const cases = {
  "no edits": null,
  "line sec + shot sec": { shots: null, lines: { 2: { sec: 9.5 } } },
  "fixed shots grow the line": "grow",
  "duplicate + reorder + sec": "dup",
};

for (const [name, spec] of Object.entries(cases)) {
  test(`timing mirror matches timeline.ts: ${name}`, async () => {
    const { SHOTS: raw, LINES } = await loadShots(path.join(EXAMPLE_BUILD, "shots.ts"));
    const audio = readJson(path.join(EXAMPLE_BUILD, "audio.json"));
    const all = raw.map((_, base) => ({ base }));
    let edits = spec;
    if (spec && spec.lines) edits = { shots: all.map((e, i) => (i === 5 ? { ...e, sec: 1.2 } : e)), lines: spec.lines };
    if (spec === "grow") edits = { shots: all.map((e) => (raw[e.base].line === 1 ? { ...e, sec: 4 } : e)) };
    if (spec === "dup") edits = { shots: [...all.slice(0, 4), { base: 2, sec: 2 }, { base: 3, line: 5 }, ...all.slice(4)], lines: { 0: { sec: 7 } } };
    const t = computeTiming({ lines: LINES, audio, shots: raw, edits });
    const ts = await runTs(edits);
    assert.equal(t.total, ts.TOTAL_FRAMES);
    assert.deepEqual(t.lines.map((l) => [l.start, l.end]), ts.TIMED_LINES.map((l) => [l.from, l.from + l.dur]));
    assert.deepEqual(t.shots.map((s) => [s.line, s.start, s.end]), ts.TIMED_SHOTS.map((s) => [s.line, s.start, s.start + s.len]));
    if (name === "line sec + shot sec") assert.equal(t.lines[2].end - t.lines[2].start, 285);
    if (name === "no edits") assert.equal(t.total, ts.TOTAL_FRAMES);
  });
}
