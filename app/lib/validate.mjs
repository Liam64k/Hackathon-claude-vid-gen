// Validation of stage outputs (ideas.json, lines.json, src/shots.ts) and the survival safety rules.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { ROOT, RUNTIME, SHOTS_TS, APP } from "./paths.mjs";
import { lineRange, wordRange } from "./store.mjs";

// ---- safety (BUILD-PROMPT §3.7) -------------------------------------------------------------------
// Survival topics: safe, widely known advice only. No chemistry, weapons, medicine doses, live
// electricity, gore. Used on the topic before any Claude run and on every script line after.
// "bomb" is only a scenario word when it is a nuclear/atomic one ("what to do if a nuclear bomb goes off")
// or a "bomb cyclone" storm, and never when the text is about making or building one.
const unsafeBomb = (s) => {
  const t = s.replace(/\bbomb cyclones?\b/gi, "");
  if (!/\bbomb/i.test(t)) return false;
  if (/\b(make|making|build|building|assemble|assembling|construct\w*|diy)\b(\s+\S+){0,3}\s+bombs?\b|\bbomb[- ]?making\b/i.test(t)) return true;
  const bombs = t.match(/\b\w+\s+bombs?\b/gi) ?? [];
  return !bombs.every((b) => /^(nuclear|atomic)\s/i.test(b)) || /^\s*bombs?\b/i.test(t);
};
const UNSAFE = [
  [/\b(explosive|detonat|gunpowder|thermite|napalm|molotov)\w*/i, "explosives"],
  [(s) => unsafeBomb(s), "explosives"],
  [/\b(gun|rifle|pistol|firearm|ammo|ammunition|shoot(ing)? (someone|people)|weapon)s?\b/i, "weapons"],
  // (carbon-monoxide *poisoning* in an ice shack is widely known safety advice, so "poisoning" is allowed)
  [/\b(make|making|brew|brewing) (a )?poison\b|\b(chlorine gas|bleach (and|\+) ammonia|mix(ing)? (household )?chemicals|synthesi[sz]e)\b/i, "chemistry / poisons"],
  [/\b(\d+\s?(mg|milligrams?|pills?|tablets?)|mg|milligrams?|dosage|overdose|doses? of (medicine|medication|pills|tablets|painkillers?)|how many (pills|tablets)|ibuprofen|acetaminophen|paracetamol|aspirin|tylenol|advil|painkillers?|opioids?|sedatives?)\b/i, "medicine doses"],
  [/\b(live wire|power line|downed line|high voltage|electrocut\w*|jump[- ]?start)\b/i, "live electricity"],
  [/\b(gore|gory|dismember\w*|decapitat\w*|blood(y)? (pool|spray|everywhere)|corpse|mutilat\w*)\b/i, "gore"],
  [/\b(suicide|self[- ]harm|kill (myself|yourself))\b/i, "self-harm"],
];
export const safetyIssues = (text) => {
  const s = String(text ?? "");
  return UNSAFE.filter(([re]) => (typeof re === "function" ? re(s) : re.test(s))).map(([, label]) => label);
};

// ---- ideas ---------------------------------------------------------------------------------------
export const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "2-5 word episode title" },
          premise: { type: "string", description: "one sentence: WHO + CONSTRAINT + CLOCK + RESOURCE" },
          hook: { type: "string", description: "the first spoken line, under 14 words" },
          twist: { type: "string", description: "the non-obvious turn or myth it busts" },
          world: { type: "string", description: "setting, time of day and the main characters with their names and relationship" },
          diagrams: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5, description: "3-5 on-screen explainers" },
          fact: { type: "string", description: "the key real fact or number, with the organisation that publishes it" },
          verify: { type: "string", description: "what must be fact-checked before publishing" },
          risk: { type: "string", description: "safety / originality / sensitivity risk, or 'low'" },
          score: { type: "integer", minimum: 0, maximum: 9, description: "0-9: clear in 1 s + non-obvious twist + stakes the viewer feels" },
        },
        required: ["title", "premise", "hook", "twist", "world", "diagrams", "fact", "verify", "risk", "score"],
      },
    },
  },
  required: ["ideas"],
};

// Ice / frozen-lake stories. Winter topics may have them; other topics must not drift onto the ice.
const WINTER_WORDS = /\b(ice|icy|frozen|freez\w*|lake|winter|snow\w*|blizzard|whiteout|frost\w*|hypotherm\w*|cold[- ]water|sled\w*|ski\w*|avalanche)\b/i;
const ICE_STORY = /\b(ice|icy|frozen|lake|ice[- ]fishing|creek mouth|1-10-1|eli)\b/i;
export const isWinterTopic = (text) => WINTER_WORDS.test(String(text ?? ""));
export const icyIdeas = (ideas) => (ideas ?? []).map((it, i) => (ICE_STORY.test(`${it?.title} ${it?.premise} ${it?.hook}`) ? i : -1)).filter((i) => i >= 0);

// winterOk: the topic is about winter (ice ideas allowed). surprise: Surprise me (at most two).
export const validateIdeas = (data, { winterOk = true, surprise = false } = {}) => {
  const errs = [];
  const ideas = data?.ideas;
  if (!Array.isArray(ideas)) return ["ideas must be an array"];
  if (ideas.length !== 5) errs.push(`expected 5 ideas, got ${ideas.length}`);
  ideas.forEach((it, i) => {
    for (const k of IDEAS_SCHEMA.properties.ideas.items.required) if (it?.[k] === undefined || it[k] === "") errs.push(`idea ${i + 1}: missing ${k}`);
    if (it?.diagrams && !Array.isArray(it.diagrams)) errs.push(`idea ${i + 1}: diagrams must be a list`);
    const unsafe = safetyIssues(`${it?.premise} ${it?.hook} ${it?.twist}`);
    if (unsafe.length) errs.push(`idea ${i + 1}: unsafe content (${unsafe.join(", ")})`);
  });
  const icy = icyIdeas(ideas);
  const maxIcy = winterOk ? 5 : surprise ? 2 : 0;
  if (icy.length > maxIcy) errs.push(`ideas ${icy.map((i) => i + 1).join(", ")} are set on ice or a frozen lake, but ${surprise ? "at most two Surprise me ideas may be" : "this topic is not about winter"}: replace ${maxIcy ? "the extra ones" : "them"} with ideas about the topic itself, with new characters`);
  return errs;
};

// ---- lines.json ----------------------------------------------------------------------------------
export const wordCount = (lines) => lines.reduce((a, l) => a + String(l.text).trim().split(/\s+/).filter(Boolean).length, 0);
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9'’-]/g, "");

export const validateLines = (lines, length = 90) => {
  const errs = [];
  if (!Array.isArray(lines)) return { errors: ["lines.json must be a JSON array"], words: 0 };
  const [minL, maxL] = lineRange(length);
  const lmin = Math.max(3, minL - 4), lmax = maxL + 6;
  if (lines.length < lmin || lines.length > lmax) errs.push(`expected ${lmin}-${lmax} lines for ~${length} s, got ${lines.length}`);
  lines.forEach((l, i) => {
    if (!l || typeof l.text !== "string" || !l.text.trim()) return errs.push(`line ${i}: text missing`);
    if (!Array.isArray(l.highlight)) return errs.push(`line ${i}: highlight must be an array of words`);
    if (/\d/.test(l.text)) errs.push(`line ${i}: spell numbers out for the voice ("${l.text.match(/\S*\d\S*/)[0]}")`);
    if (l.text.split(/\s+/).length > 34) errs.push(`line ${i}: too long for one caption beat (${l.text.split(/\s+/).length} words, max 34)`);
    const words = new Set(l.text.split(/\s+/).map(norm));
    for (const h of l.highlight) {
      const w = norm(String(h).replace(/:(r|g|p)$/, ""));
      if (!words.has(w)) errs.push(`line ${i}: highlight "${h}" is not a word in the line`);
    }
    const unsafe = safetyIssues(l.text);
    if (unsafe.length) errs.push(`line ${i}: unsafe content (${unsafe.join(", ")})`);
  });
  const words = wordCount(lines.filter((l) => l && typeof l.text === "string"));
  const [lo, hi] = wordRange(length);
  if (words < lo || words > hi) errs.push(`script is ${words} words; target ${lo}-${hi} for ~${length} s`);
  return { errors: errs, words };
};

// ---- src/shots.ts --------------------------------------------------------------------------------
// shots.ts is type-import-only by design, so we transpile it with the project's TypeScript and import it.
const require = createRequire(path.join(ROOT, "package.json"));
export const loadShots = async (file = SHOTS_TS) => {
  const ts = require("typescript");
  const js = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  mkdirSync(RUNTIME, { recursive: true });
  const tmp = path.join(RUNTIME, `shots-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(tmp, js);
  try {
    const m = await import(pathToFileURL(tmp).href);
    return { TITLE: m.TITLE, LINES: m.LINES, SHOTS: m.SHOTS };
  } finally {
    rmSync(tmp, { force: true });
  }
};

// src/edits.ts bundled with esbuild (it imports edits.json); gives the real applyEdits to the server.
let editsMod = null;
export const applyEditsTs = async (raw, edits) => {
  if (!editsMod) {
    const { buildSync } = require("esbuild");
    const out = buildSync({ entryPoints: [path.join(ROOT, "src", "edits.ts")], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" }).outputFiles[0].text;
    mkdirSync(RUNTIME, { recursive: true });
    const tmp = path.join(RUNTIME, `edits-${process.pid}-${Date.now()}.mjs`);
    writeFileSync(tmp, out);
    try { editsMod = await import(pathToFileURL(tmp).href); } finally { rmSync(tmp, { force: true }); }
  }
  return editsMod.applyEdits(raw, edits);
};

export const catalogScenes = () => Object.keys(catalog().scenes ?? {});
const catalog = () => JSON.parse(readFileSync(path.join(APP, "pack-catalog.json"), "utf8"));

export const validateShots = ({ LINES, SHOTS }, lines) => {
  const errs = [];
  const cat = catalog();
  const scenes = new Set(Object.keys(cat.scenes ?? {}));
  if (!Array.isArray(LINES) || !Array.isArray(SHOTS)) return ["shots.ts must export LINES and SHOTS arrays"];
  if (lines) {
    if (LINES.length !== lines.length) errs.push(`LINES has ${LINES.length} entries but the approved script has ${lines.length}`);
    lines.forEach((l, i) => { if (LINES[i] && LINES[i].text.trim() !== l.text.trim()) errs.push(`LINES[${i}] text differs from the approved script`); });
  }
  const used = new Set();
  SHOTS.forEach((s, i) => {
    if (!Number.isInteger(s.line) || s.line < 0 || s.line >= LINES.length) errs.push(`shot ${s.id ?? i}: line ${s.line} does not exist`);
    used.add(s.line);
    if (scenes.size && !scenes.has(s.scene)) errs.push(`shot ${s.id ?? i}: unknown scene "${s.scene}"`);
    if (!s.from || typeof s.from.zoom !== "number") errs.push(`shot ${s.id ?? i}: camera "from" missing`);
  });
  LINES.forEach((_, i) => { if (!used.has(i)) errs.push(`line ${i} has no shot`); });
  const smin = Math.max(4, LINES.length), smax = Math.max(60, LINES.length * 4);
  if (SHOTS.length < smin || SHOTS.length > smax) errs.push(`expected ${smin}-${smax} shots, got ${SHOTS.length}`);
  return errs;
};
