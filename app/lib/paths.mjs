// Every path the app touches, resolved from the studio root (the folder that holds package.json).
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const APP = path.join(ROOT, "app");
export const UI = path.join(APP, "ui");
export const EPISODES = path.join(ROOT, "episodes");
export const OUT = path.join(ROOT, "out");
export const PUBLIC = path.join(ROOT, "public");
export const VOICE_DIR = path.join(PUBLIC, "voice");
export const SRC = path.join(ROOT, "src");
export const SHOTS_TS = path.join(SRC, "shots.ts");
export const EDITS_JSON = path.join(SRC, "edits.json");
export const AUDIO_JSON = path.join(SRC, "audio.json");
export const SKILLS = path.join(ROOT, ".claude", "skills");
export const REPLAYS = path.join(APP, "replays");
export const EXAMPLE_SLUG = "ten-minutes-under";
export const EXAMPLE_DIR = path.join(EPISODES, EXAMPLE_SLUG);
export const RUNTIME = path.join(APP, ".runtime"); // usage meter + workspace owner (gitignored, never secrets)

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
export const episodeDir = (slug) => path.join(EPISODES, slug);

// Only these top-level folders may be served by /files/... (read-only).
export const SERVED_ROOTS = ["episodes", "out", "public"];

// Resolve a /files/<rel> request safely: must stay inside one of SERVED_ROOTS.
export const resolveServed = (relPath) => {
  let clean;
  try {
    clean = decodeURIComponent(relPath).replace(/\\/g, "/");
  } catch {
    return null; // malformed %-escape: refuse, don't throw
  }
  if (clean.includes("\0")) return null;
  const abs = path.resolve(ROOT, clean);
  const ok = SERVED_ROOTS.some((r) => {
    const base = path.join(ROOT, r) + path.sep;
    return abs.startsWith(base);
  });
  return ok ? abs : null;
};
