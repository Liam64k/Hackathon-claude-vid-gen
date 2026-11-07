// "Make the next episode": a finished (or scripted) project becomes episode N+1 of a series. The new
// project keeps the look, shape, format and length, and carries a short "previously" brief that the
// Ideas and Script prompts use: same cast and world, one callback to the last episode, a new danger and
// a new lesson. No Claude call here; the Ideas stage starts as usual.
import path from "node:path";
import { APP, EXAMPLE_SLUG, episodeDir } from "../lib/paths.mjs";
import * as store from "../lib/store.mjs";
import { httpError } from "../lib/errors.mjs";

const EXAMPLE = { title: "Ten Minutes Under", premise: "Eli falls through thin ice over a creek and gets himself out with the 1-10-1 rule." };
const clip = (s, n) => (String(s ?? "").length > n ? `${String(s).slice(0, n - 1).trimEnd()}…` : String(s ?? ""));

// What the next episode needs to know about this one. Throws an httpError when there is no story yet.
export const previously = (slug) => {
  if (slug === EXAMPLE_SLUG) {
    const lines = store.readJson(path.join(APP, "replays", "artifacts", "lines.json")) ?? [];
    return { slug, episode: 1, ...EXAMPLE, seriesTitle: EXAMPLE.title, lines: lines.map((l) => l.text), style: "flat", format: "story", length: 90, output: null };
  }
  const s = store.load(slug);
  if (!s) throw httpError(404, "No such project");
  if (s.stages.script.status !== "approved") throw httpError(409, "Approve this episode's script before making the next one.");
  const d = episodeDir(slug);
  const idea = store.readJson(path.join(d, "ideas.json"))?.ideas?.[s.pick ?? 0] ?? {};
  const lines = (store.readJson(path.join(d, "lines.json")) ?? []).map((l) => l.text);
  const title = s.title ?? idea.title ?? s.topic;
  return { slug, episode: s.series?.episode ?? 1, title, seriesTitle: s.series?.title ?? title, premise: idea.premise ?? s.topic, lines, style: s.style, format: s.format, length: s.length, output: s.output, cast: s.cast ?? null };
};

// The brief both prompts quote. Kept short: the hook and the ending carry the story; the middle is skipped.
export const previouslyText = (prev) => {
  const ls = prev.lines.length > 4 ? [...prev.lines.slice(0, 2), "…", ...prev.lines.slice(-2)] : prev.lines;
  return clip(`"${prev.title}" (episode ${prev.episode}). ${prev.premise}\nIts narration began and ended:\n${ls.map((l) => `  ${l}`).join("\n")}`, 1400);
};

export const createSequel = (parentSlug, { mode, length, format } = {}) => {
  const prev = previously(parentSlug);
  const episode = prev.episode + 1;
  const series = { parent: prev.slug, episode, title: prev.seriesTitle, previously: previouslyText(prev) };
  return store.createProject({
    topic: clip(`${prev.title}, episode ${episode}: what happens next`, 300),
    format: format ?? prev.format,
    length: length ?? prev.length,
    style: prev.style,
    output: prev.output ?? undefined,
    mode,
    series,
    // same characters and place as the last episode (old projects without a cast get a new one)
    ...(prev.cast ? { cast: prev.cast, castMode: "manual" } : {}),
  });
};

// One block for the Ideas and Script prompts; empty for a stand-alone video.
export const seriesText = (series) =>
  series
    ? `SERIES: this is episode ${series.episode} of "${series.title}". Previously:
${series.previously}
Keep the same main characters, names and world. Open with ONE short callback to the last episode (a line or an object, not a recap), then a NEW danger with a NEW lesson. Never repeat the last episode's mistake, twist or rule.`
    : "";
