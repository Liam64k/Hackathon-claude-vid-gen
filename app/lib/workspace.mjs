// The Remotion project renders ONE episode at a time (src/shots.ts, src/audio.json, public/voice/*).
// The workspace manager checks a project's files in and out of those locations so several projects
// (and the finished example) can live side by side. Each project keeps its copy in
// episodes/<slug>/build/. The example's originals are snapshotted once, before anything is changed.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AUDIO_JSON, EDITS_JSON, EXAMPLE_DIR, EXAMPLE_SLUG, OUT, RUNTIME, SHOTS_TS, VOICE_DIR, episodeDir } from "./paths.mjs";
import { readJson, writeJson } from "./store.mjs";

const OWNER_FILE = path.join(RUNTIME, "workspace.json");
export const EXAMPLE_BUILD = path.join(EXAMPLE_DIR, "build");
const voiceClips = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /^line-\d+\.mp3$/.test(f)) : []);

export const owner = () => readJson(OWNER_FILE, { owner: null }).owner;
const setOwner = (slug) => writeJson(OWNER_FILE, { owner: slug });

// Snapshot the example episode exactly as shipped. Safe to call on every start.
export const ensureExampleSnapshot = () => {
  if (existsSync(path.join(EXAMPLE_BUILD, "shots.ts"))) return false;
  const src = readFileSync(SHOTS_TS, "utf8");
  if (!/TITLE\s*=\s*"ten-minutes-under"/.test(src)) return false; // workspace already changed by hand; don't guess
  mkdirSync(path.join(EXAMPLE_BUILD, "voice"), { recursive: true });
  copyFileSync(SHOTS_TS, path.join(EXAMPLE_BUILD, "shots.ts"));
  copyFileSync(AUDIO_JSON, path.join(EXAMPLE_BUILD, "audio.json"));
  for (const f of voiceClips(VOICE_DIR)) copyFileSync(path.join(VOICE_DIR, f), path.join(EXAMPLE_BUILD, "voice", f));
  for (const f of ["episode-phone.mp4", "storyboard.png"]) if (existsSync(path.join(OUT, f))) copyFileSync(path.join(OUT, f), path.join(EXAMPLE_BUILD, f));
  if (!owner()) setOwner(EXAMPLE_SLUG);
  return true;
};

const buildDir = (slug) => path.join(episodeDir(slug), "build");

// Save the current workspace into the owner's build folder.
export const saveCurrent = () => {
  const o = owner();
  if (!o) return;
  const dir = buildDir(o);
  mkdirSync(path.join(dir, "voice"), { recursive: true });
  copyFileSync(SHOTS_TS, path.join(dir, "shots.ts"));
  copyFileSync(AUDIO_JSON, path.join(dir, "audio.json"));
  if (existsSync(EDITS_JSON)) copyFileSync(EDITS_JSON, path.join(dir, "edits.json"));
  for (const f of voiceClips(path.join(dir, "voice"))) rmSync(path.join(dir, "voice", f));
  for (const f of voiceClips(VOICE_DIR)) copyFileSync(path.join(VOICE_DIR, f), path.join(dir, "voice", f));
};

// Make `slug` the project that src/ and public/voice/ belong to. A project with no build yet starts
// from the example's shots.ts (the template the shots stage edits), with no voice.
export const checkout = (slug) => {
  if (owner() === slug) return false;
  saveCurrent();
  const dir = existsSync(path.join(buildDir(slug), "shots.ts")) ? buildDir(slug) : null;
  copyFileSync(dir ? path.join(dir, "shots.ts") : path.join(EXAMPLE_BUILD, "shots.ts"), SHOTS_TS);
  const audio = dir && existsSync(path.join(dir, "audio.json")) ? readFileSync(path.join(dir, "audio.json")) : JSON.stringify({ voice: {}, sfx: {} }, null, 2) + "\n";
  writeFileSync(AUDIO_JSON, audio);
  writeFileSync(EDITS_JSON, dir && existsSync(path.join(dir, "edits.json")) ? readFileSync(path.join(dir, "edits.json")) : "null\n");
  for (const f of voiceClips(VOICE_DIR)) rmSync(path.join(VOICE_DIR, f));
  if (dir) for (const f of voiceClips(path.join(dir, "voice"))) copyFileSync(path.join(dir, "voice", f), path.join(VOICE_DIR, f));
  setOwner(slug);
  return true;
};

export { voiceClips };
