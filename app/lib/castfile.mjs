// state.cast -> episodes/<slug>/build/cast.json (theme "auto" resolved from the topic), and into src/cast.json
// when this project owns the workspace. Call syncCast whenever state.cast changes and before shots/render.
import path from "node:path";
import { writeFileSync } from "node:fs";
import { SRC, episodeDir } from "./paths.mjs";
import * as store from "./store.mjs";
import { owner } from "./workspace.mjs";
import { pickTheme, themeParticles } from "./cast-data.mjs";

export const resolveCast = (s) => {
  const c = s?.cast;
  if (!c) return null;
  const theme = c.theme && c.theme !== "auto" ? c.theme : pickTheme(`${s.topic ?? ""} ${s.title ?? ""}`);
  const particles = c.particles && c.particles !== "auto" ? c.particles : themeParticles(theme);
  return { lead: c.lead, second: c.second, theme, particles };
};

export const syncCast = (slug) => {
  const s = store.load(slug);
  if (!s) return null;
  const file = resolveCast(s);
  store.writeJson(path.join(episodeDir(slug), "build", "cast.json"), file);
  if (owner() === slug) writeFileSync(path.join(SRC, "cast.json"), JSON.stringify(file, null, 2) + "\n");
  return file;
};
