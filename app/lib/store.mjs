// Project state: episodes/<slug>/state.json. Stages are resumable from this file; nothing secret is stored.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, statSync } from "node:fs";
import { elevenKey } from "./secrets.mjs";
import path from "node:path";
import { CAST_MODES, randomCast, normalizeCast } from "./cast-data.mjs";
import { EPISODES, EXAMPLE_SLUG, episodeDir } from "./paths.mjs";

export const STAGES = ["ideas", "script", "shots", "voice", "render"];
export const STAGE_LABELS = { ideas: "Ideas", script: "Script", shots: "Storyboard", voice: "Voice", render: "Render" };
export const FORMATS = {
  story: "Survival story — first person, past tense, one character's mistake and how they got out",
  what: "What would you do? — second person, the viewer is in the situation, choices with consequences",
  myth: "Myth vs fact — a common belief, why it is wrong, what really works",
};
// Video length in seconds is free (MIN_SECONDS..MAX_SECONDS). Narration runs ~2.6 words/s plus pauses.
export const MIN_SECONDS = 20;
export const MAX_SECONDS = 180;
export const PRESET_LENGTHS = [30, 60, 90, 120];
export const clampSeconds = (n) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, v)) : 90;
};
export const wordRange = (sec) => { const s = clampSeconds(sec); return [Math.round(s * 2.56), Math.round(s * 3.11)]; };
// Narration lines (caption beats) scale with length: ~one line per 5-7.5 s.
export const lineRange = (sec) => { const s = clampSeconds(sec); return [Math.max(4, Math.round(s / 7.5)), Math.max(6, Math.round(s / 5))]; };

// Visual styles. Only "flat" has finished art; the others change tone, captions, stamps and colours.
export const STYLES = {
  flat: { name: "Flat 2D", ready: true },
  cartoon: { name: "Cartoon", ready: false },
  paper: { name: "Paper cut-out", ready: false },
  comic: { name: "Comic ink", ready: false },
  chalk: { name: "Chalkboard", ready: false },
};
export const normalizeStyle = (s) => (Object.hasOwn(STYLES, s) ? s : "flat");

// Output formats: named presets (platform) and aspect ratios (with a custom size).
export const OUTPUT_PRESETS = {
  tiktok: { name: "TikTok", ratio: "9:16", width: 1080, height: 1920 },
  shorts: { name: "YouTube Shorts", ratio: "9:16", width: 1080, height: 1920 },
  reels: { name: "Instagram Reels", ratio: "9:16", width: 1080, height: 1920 },
  youtube: { name: "YouTube", ratio: "16:9", width: 1920, height: 1080 },
  feed: { name: "Instagram feed", ratio: "4:5", width: 1080, height: 1350 },
  square: { name: "Square", ratio: "1:1", width: 1080, height: 1080 },
};
export const RATIOS = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "16:10": { width: 1920, height: 1200 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  custom: { width: 1080, height: 1920 },
};
const evenSize = (n, fallback) => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.round(Math.min(3840, Math.max(480, v)) / 2) * 2;
};
export const normalizeOutput = (o) => {
  const preset = o && typeof o === "object" && typeof o.preset === "string" && Object.hasOwn(OUTPUT_PRESETS, o.preset) ? o.preset : null;
  if (preset) { const { ratio, width, height } = OUTPUT_PRESETS[preset]; return { preset, ratio, width, height }; }
  const ratio = o && typeof o === "object" && typeof o.ratio === "string" && Object.hasOwn(RATIOS, o.ratio) ? o.ratio : null;
  if (ratio === "custom") return { preset: null, ratio, width: evenSize(o.width, 1080), height: evenSize(o.height, 1920) };
  if (ratio) return { preset: null, ratio, ...RATIOS[ratio] };
  return normalizeOutput({ preset: "tiktok" });
};
// Old state.json files have no style/output: default to flat + TikTok.
export const VOICE_PROVIDERS = ["elevenlabs", "placeholder", "none"];
export const normalizeVoiceProvider = (p) => (VOICE_PROVIDERS.includes(p) ? p : null);
const withDefaults = (s) => {
  s.style = normalizeStyle(s.style);
  s.output = normalizeOutput(s.output);
  s.voice = { voiceId: null, provider: null, model: null, credit: false, ...(s.voice ?? {}) };
  // chosen provider (elevenlabs | placeholder | none); a run records what it actually used in the same field
  if (!normalizeVoiceProvider(s.voice.provider) && !/^elevenlabs/.test(s.voice.provider ?? "")) s.voice.provider = elevenKey() ? "elevenlabs" : "placeholder";
  // cast: null on old projects = the legacy look; new projects always have one
  if (s.cast === undefined || (s.cast !== null && typeof s.cast !== "object")) s.cast = null;
  if (!CAST_MODES.includes(s.castMode)) s.castMode = "random";
  return s;
};

export const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "episode";

const stamp = () => new Date().toISOString().replace(/[-:T]/g, "").slice(2, 12); // yymmddhhmm

export const writeJson = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
};
export const readJson = (file, fallback = null) => {
  try {
    return JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
};

const stateFile = (slug) => path.join(episodeDir(slug), "state.json");

export const blankStage = () => ({ status: "idle", sessionId: null, cost: 0, startedAt: null, endedAt: null, error: null, warnings: [], attempts: 0 });

export const createProject = ({ topic, surprise, format = "story", length = 90, mode = "live", style, output, seed, entry, series, voice, cast, castMode, theme }) => {
  const base = surprise || !topic ? "surprise" : slugify(topic).split("-").slice(0, 5).join("-");
  let slug = `${base}-${stamp()}`;
  let n = 2;
  while (existsSync(episodeDir(slug))) slug = `${base}-${stamp()}-${n++}`;
  const picked = cast ? normalizeCast(cast) : null;
  const cMode = CAST_MODES.includes(castMode) ? castMode : picked && !picked.errors.length ? "manual" : "random";
  const castState = picked && !picked.errors.length ? picked.cast : { ...randomCast(slug), theme: "auto", particles: "auto" };
  if (theme && castState.theme === "auto") castState.theme = normalizeCast({ ...castState, theme }).cast.theme;
  const state = {
    version: 1,
    slug,
    title: null,
    topic: surprise ? "" : String(topic ?? "").slice(0, 300),
    surprise: !!surprise || !topic,
    format: FORMATS[format] ? format : "story",
    length: clampSeconds(length),
    pack: "winter-lake",
    style: normalizeStyle(style),
    output: normalizeOutput(output),
    ...(seed ? { seed: String(seed).slice(0, 2000) } : {}),
    ...(series ? { series } : {}), // { parent, episode, title, previously } for "Make the next episode"
    entry: entry === "own" ? "own" : "generate",
    mode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pick: null,
    cast: castState,
    castMode: cMode,
    voice: { voiceId: null, provider: normalizeVoiceProvider(voice?.provider), model: null, credit: false },
    stages: Object.fromEntries(STAGES.map((s) => [s, blankStage()])),
  };
  save(state);
  return state;
};

export const load = (slug) => {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const s = readJson(stateFile(slug));
  if (!s) return null;
  for (const st of STAGES) s.stages[st] = { ...blankStage(), ...(s.stages?.[st] ?? {}) };
  return withDefaults(s);
};

export const save = (state) => {
  state.updatedAt = new Date().toISOString();
  writeJson(stateFile(state.slug), state);
  return state;
};

export const update = (slug, fn) => {
  const s = load(slug);
  if (!s) throw Object.assign(new Error(`No project ${slug}`), { status: 404 });
  fn(s);
  return save(s);
};

// The next stage the user has to act on.
export const currentStage = (s) => {
  for (const st of STAGES) if (s.stages[st].status !== "approved") return st;
  return "done";
};

// A project is "after" a stage once that stage is approved; editing an earlier stage resets later ones.
export const resetFrom = (s, stage) => {
  const i = STAGES.indexOf(stage);
  for (const st of STAGES.slice(i)) s.stages[st] = { ...blankStage(), cost: s.stages[st].cost };
};

export const list = () => {
  if (!existsSync(EPISODES)) return [];
  const out = [];
  for (const d of readdirSync(EPISODES)) {
    const s = load(d);
    if (s && !d.startsWith("_")) {
      const dir = episodeDir(d);
      out.push({
        slug: s.slug,
        title: s.title,
        topic: s.topic,
        surprise: s.surprise,
        mode: s.mode,
        style: s.style,
        output: s.output,
        stage: currentStage(s),
        updatedAt: s.updatedAt,
        cover: existsSync(path.join(dir, "cover.png")) ? `episodes/${d}/cover.png` : null,
        episode: s.series?.episode ?? null,
        cost: Object.values(s.stages).reduce((a, x) => a + (x.cost || 0), 0),
      });
    }
  }
  out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  // The finished example episode that ships with the kit (read-only).
  const ex = episodeDir(EXAMPLE_SLUG);
  if (existsSync(ex)) {
    out.push({
      slug: EXAMPLE_SLUG,
      title: "Ten Minutes Under",
      topic: "Falling through lake ice — the 1-10-1 rule",
      example: true,
      stage: "done",
      updatedAt: statSync(ex).mtime.toISOString(),
      cover: existsSync(path.join(ex, "cover.png")) ? `episodes/${EXAMPLE_SLUG}/cover.png` : null,
      cost: 0,
    });
  }
  return out;
};
