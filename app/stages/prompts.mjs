// Shared prompt pieces. The creative rules live in the skills (story-explainer-2d, survival-short,
// cinematic-director); prompts name the exact reference files to read so runs stay cheap.
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP } from "../lib/paths.mjs";
import { FORMATS, LENGTHS } from "../lib/store.mjs";

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
- Exactly two people: Eli (adult, orange jacket, ice picks around his neck) and his brother. Poses include walking, running, standing, in the water, arms on the ice, kicking flat, sliding on the stomach, lying/rolling, panic and a red dashed "mistake" ghost.
- Story devices: callouts with arrows, stamps ("STEP 1"), tags, speech bubbles, a freeze-frame blue "paused" look, white flash, whip-zoom, shake, snow.
- HUD pills: a December clock (DEC · h:mm), an ice-thickness pill, a water-temperature/in-water timer and a 1-10-1 phase strip, a "brother distance" pill.
- Cards: an angle meter (generic), a swatch chip with custom text (generic), the 1-10-1 card, a 911-call card, a Minnesota DNR ice-thickness ladder, a title card and a "PART 2" end card that both have fixed text.
So topics must be winter / cold-water / frozen-lake survival that can be told with Eli and/or his brother on this lake (e.g. rescuing someone who fell through, reading ice, getting out, cold shock, hypothermia after, ice-shack safety, a whiteout on the ice).`;

export const formatText = (f) => FORMATS[f] ?? FORMATS.story;
export const lengthText = (n) => {
  const [lo, hi] = LENGTHS[n] ?? LENGTHS[90];
  return `~${n} s, ${lo}-${hi} words of narration at 2.4-2.7 words per second`;
};
