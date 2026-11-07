// Shared prompt pieces. The creative rules live in the skills (story-explainer-2d, survival-short,
// cinematic-director); prompts name the exact reference files to read so runs stay cheap.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP, EPISODES } from "../lib/paths.mjs";
import { FORMATS, clampSeconds, lineRange, wordRange } from "../lib/store.mjs";

// Every stage prompt starts with this (the studio CLAUDE.md says "stop for approval"; the app does that).
export const PREAMBLE = "The app handles approvals. Do only this stage, write the files named, then stop.";

// --append-system-prompt for every run.
export const SYSTEM = [
  "You are running inside Studio, a local app that drives this video studio one stage at a time.",
  "There is no human in this session: never ask questions, never wait for approval, never use the Skill tool, subagents or plan mode.",
  "Read only the files the prompt names (plus files you must edit). Do not run commands unless the prompt allows one.",
  "English only, US audience, metric units, numbers spelled out in narration.",
  "Safety: widely known, safe survival advice only. No chemistry, weapons, medicine doses, live electricity, no gore. Calm instructor tone.",
  "Facts: never invent statistics; name the organisation behind each number and flag it for verification.",
].join(" ");

export const packCatalog = () => readFileSync(path.join(APP, "pack-catalog.json"), "utf8");

// Short description of what the Winter Lake pack can show (for idea and script writing).
export const PACK_BRIEF = `ART PACK "Winter Lake" (fixed; no new art can be drawn):
- One frozen lake at sunset → blue hour → night, seen four ways: SIDE view (pine shore, three ice-fishing shacks, the brother's red shack, a footprint trail, a creek mouth with thin ice, a hole that can crack open), CUT cross-section under the ice (ice thickness ruler, moving current, trapped air in a jacket, a person in the water), TOP map view (shore, creek, shacks, footprints, the hole, arrows, a runner's path), and a boot-print close-up.
- Two figure rigs: "eli" (adult, orange jacket, ice picks around the neck) and "brother" (a second adult). These are only the drawings: the story may name them anything and make them anyone (friends, a parent, a coworker, a neighbour, a stranger, a ranger). Either can be the hero, the victim or the one who makes the mistake; one figure alone is fine. Only the HUD pill reads "BROTHER … M", so use it only when the second person really is a brother. Poses include walking, running, standing, in the water, arms on the ice, kicking flat, sliding on the stomach, lying/rolling, panic and a red dashed "mistake" ghost.
- Story devices: callouts with arrows, stamps ("STEP 1"), tags, speech bubbles, a freeze-frame blue "paused" look, white flash, whip-zoom, shake, snow.
- HUD pills: a December clock (DEC · h:mm), an ice-thickness pill, a water-temperature/in-water timer and a 1-10-1 phase strip, a "brother distance" pill.
- Cards: an angle meter (generic), a swatch chip with custom text (generic), the 1-10-1 card, a 911-call card, a Minnesota DNR ice-thickness ladder, a title card and a "PART 2" end card that both have fixed text.
So topics must be winter / cold-water survival that can be shown on this lake and shore. Falling through the ice is only one of many: also whiteouts and getting lost, frostbite, hypothermia hours later, a stalled walk home at night, a dog on the ice, pressure ridges and open leads, ice-shack heaters and fresh air, a snowmobile or car on the ice, a spring-thaw lake, a stranger in trouble, wet clothes, thin ice by inflow creeks.`;

// Video length in seconds (any value; clamped to the allowed range).
export const lengthText = (n) => {
  const s = clampSeconds(n);
  const [lo, hi] = wordRange(s);
  return `~${s} s, ${lo}-${hi} words of narration at 2.4-2.7 words per second`;
};
export const lineText = (n) => { const [lo, hi] = lineRange(n); return `${lo}-${hi} narration lines`; };

// Story angles: each idea run gets a fresh random mix so "Surprise me" doesn't land on the same plot.
export const ANGLES = [
  "the second person is the hero and the orange-jacket figure is the one who needs help",
  "nobody falls in: the danger is getting lost in a whiteout or at night",
  "the danger arrives hours later (hypothermia, wet clothes, the walk home)",
  "frostbite and keeping hands and feet working",
  "a dog or a pet runs onto the ice and the owner wants to follow",
  "the inside of an ice-fishing shack: heater, fresh air, carbon monoxide warning signs (no chemistry)",
  "reading the ice before stepping on it: colour, cracks, pressure ridges, inflow creeks",
  "a stranger across the lake is in trouble and the hero must call and guide, not run in",
  "a vehicle or snowmobile on the ice",
  "early-winter first ice or late-spring rotten ice",
  "a myth people repeat (alcohol warms you, rub frostbite, run to the hole)",
  "a told-backwards story: open on the rescue, then rewind to the first mistake",
  "a 'what would you do?' choice the viewer gets wrong",
  "two friends, not brothers; give them new names",
  "a parent and adult child on a weekend trip",
];
export const pickAngles = (n = 5, rnd = Math.random) => {
  const a = [...ANGLES];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

// Titles and premises of ideas already made in other projects, so new runs don't repeat them.
export const pastIdeas = (except, limit = 30) => {
  const out = [];
  if (!existsSync(EPISODES)) return out;
  for (const d of readdirSync(EPISODES)) {
    if (d === except) continue;
    try {
      const j = JSON.parse(readFileSync(path.join(EPISODES, d, "ideas.json"), "utf8"));
      for (const i of j.ideas ?? []) if (i?.title) out.push(`${i.title}${i.premise ? ` — ${String(i.premise).slice(0, 120)}` : ""}`);
    } catch { /* no ideas yet */ }
  }
  return [...new Set(out)].slice(-limit);
};

export const formatText = (f) => FORMATS[f] ?? FORMATS.story;
