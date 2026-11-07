// Shared prompt pieces. The creative rules live in the skills (story-explainer-2d, survival-short,
// cinematic-director); prompts name the exact reference files to read so runs stay cheap.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP, EPISODES } from "../lib/paths.mjs";
import { FORMATS, STYLES, clampSeconds, lineRange, wordRange } from "../lib/store.mjs";

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

// What the Winter Lake pack can show. The STORY comes from the topic; the pack only supplies the drawings,
// so this brief leads with "write the topic's story" and treats the lake as a set to borrow, never as the
// setting. (Earlier versions led with the lake, and every idea ended up being someone on the ice.)
export const PACK_BRIEF = `HOW STORY AND ART FIT TOGETHER: write the story the TOPIC asks for (any safe survival, disaster or preparedness scenario: nuclear war and fallout shelters, a zombie outbreak told as fiction that teaches real preparedness, blackouts, floods, wildfires, storms, heat, getting lost, winter and cold water). Its setting, characters and names come from the topic, never from the art. Only winter and cold-water topics are set on ice.
The drawings come from one fixed ART PACK, "Winter Lake" (no new art can be drawn). Later stages borrow it as a stage set: the red shack becomes a shelter, bunker or house; the shore and pines become a street edge or a horizon; the night sky becomes a blackout; stamps, tags, deltas, callouts and diagrams carry the countdowns, supplies and rules. Never claim art that does not exist, and note in "risk" how the topic will be shown with this set.
- Views: a SIDE view (pine shore, three small shacks, a red shack, a trail of footprints, open flat ground), a CUT cross-section (layers, a ruler, moving water), a TOP map view (shore, paths, buildings, arrows, a route) and a footprint close-up. Times of day: sunset, blue hour, night.
- Two figure drawings, "eli" (adult, orange jacket) and "brother" (a second adult). They are only puppets: name and cast them for THIS story (friends, a parent, a coworker, a neighbour, a stranger); do not call anyone Eli. One figure alone is fine. Poses: walking, running, standing, lying, rolling, panic, a red dashed "mistake" ghost (plus in-water poses for cold-water stories).
- Story devices that take ANY text, so they carry non-winter stories: callouts with arrows, stamps ("STEP 1", "RULE #2"), tags, delta pops ("+2 L", "-1 DAY"), ticks, speech/thought bubbles, a swatch chip with custom text; plus a freeze-frame "paused" look, white flash, whip-zoom, shake, snow.
- Fixed-text pieces, winter and cold-water stories only: the HUD pills (a "DEC" clock, ICE cm, WATER 0 °C, IN WATER / OUT timers, the 1-10-1 phase strip, BROTHER n M) and the title, ice-ladder, 1-10-1, 911 and "PART 2" cards. Other topics show countdowns, supplies and rules with stamps, tags, deltas and callouts instead.`;

// Video length in seconds (any value; clamped to the allowed range).
export const lengthText = (n) => {
  const s = clampSeconds(n);
  const [lo, hi] = wordRange(s);
  return `~${s} s, ${lo}-${hi} words of narration at 2.4-2.7 words per second`;
};
export const lineText = (n) => { const [lo, hi] = lineRange(n); return `${lo}-${hi} narration lines`; };

// Story angles: each idea run gets a fresh random mix so runs don't land on the same plot. Winter angles
// only reach winter topics (and at most two reach "Surprise me"); every other topic gets story angles.
export const STORY_ANGLES = [
  "the narrator is not the hero: they watch a friend make the mistake and must talk them out of it",
  "nobody gets hurt: the danger is one wrong decision in the first ten minutes",
  "the danger arrives hours later, after everyone thinks it is over",
  "a myth people repeat, and what really works",
  "told backwards: open on the safe ending, then rewind to the first mistake",
  "a 'what would you do?' choice the viewer gets wrong",
  "a stranger is in trouble and the hero must guide them by phone, not rush in",
  "a parent and a teenager with opposite instincts",
  "two coworkers stuck together; the cautious one is right",
  "a checklist story: three things they packed and the one they forgot",
  "a countdown: a fixed number of minutes to do three things in the right order",
  "a rumour spreads (radio, group chat) and the hero checks before acting",
  "a pet will not come, and the owner wants to go back for it",
  "the first night: dark, no phones, what matters most",
];
// Whole scenarios: only for "Surprise me" (for a typed topic they would pull the story off it).
export const SCENARIO_ANGLES = [
  "the first 48 hours in a fallout shelter: water, rationing, staying put, when to come out",
  "zombie outbreak, day one: fiction that teaches a real preparedness checklist",
  "a city blackout: cold, dark, no phones, what matters in the first night",
  "flood evacuation: the ten minutes to leave and what to carry",
  "wildfire go-bag: what is in it, where it sits, when to leave",
  "bunker supplies: what to stock, how much, and what people forget",
  "a heat wave: the quiet signs that someone is in trouble",
  "lost on a hike as the light goes: stop, stay, signal",
];
export const WINTER_ANGLES = [
  "the second person is the hero and the orange-jacket figure is the one who needs help",
  "nobody falls in: the danger is getting lost in a whiteout or at night",
  "the danger arrives hours later (hypothermia, wet clothes, the walk home)",
  "frostbite and keeping hands and feet working",
  "a dog runs onto the ice and the owner wants to follow",
  "the inside of an ice-fishing shack: heater, fresh air, carbon monoxide warning signs (no chemistry)",
  "reading the ice before stepping on it: colour, cracks, pressure ridges, inflow creeks",
  "a vehicle or snowmobile on the ice",
  "early-winter first ice or late-spring rotten ice",
  "a winter myth people repeat (alcohol warms you, rub frostbite, run to the hole)",
];
export const ANGLES = [...STORY_ANGLES, ...SCENARIO_ANGLES, ...WINTER_ANGLES];

const shuffle = (list, rnd) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// surprise: may use whole scenarios and at most 2 winter angles. A typed topic gets story angles only,
// plus up to 3 winter angles when the topic itself is about winter or cold water.
export const pickAngles = (n = 5, { surprise = true, winterTopic = false, rnd = Math.random } = {}) => {
  const maxWinter = winterTopic ? 3 : surprise ? 2 : 0;
  const w = shuffle(WINTER_ANGLES, rnd).slice(0, Math.floor(rnd() * (maxWinter + 1)));
  const pool = surprise ? [...STORY_ANGLES, ...SCENARIO_ANGLES] : STORY_ANGLES;
  return shuffle([...w, ...shuffle(pool, rnd).slice(0, n - w.length)], rnd);
};

// Titles only: whole premises of past (mostly winter) ideas pulled every new run back toward them.
export const pastIdeas = (except, limit = 30) => {
  const out = [];
  if (!existsSync(EPISODES)) return out;
  for (const d of readdirSync(EPISODES)) {
    if (d === except || d.startsWith("_")) continue; // _boards and other non-project folders
    try {
      const j = JSON.parse(readFileSync(path.join(EPISODES, d, "ideas.json"), "utf8"));
      for (const i of j.ideas ?? []) if (i?.title) out.push(String(i.title));
    } catch { /* no ideas yet */ }
  }
  return [...new Set(out)].slice(-limit);
};

export const formatText = (f) => FORMATS[f] ?? FORMATS.story;

// The project's visual style. Style sections live in the styles.md reference; flat needs no file read.
export const styleText = (style) => {
  const st = STYLES[style] ?? STYLES.flat;
  if (!STYLES[style] || style === "flat") return "Look: Flat 2D, the Winter Lake pack as drawn; no style file to read.";
  return `Look: ${st.name}. Read only the "## ${st.name}" section of .claude/skills/story-explainer-2d/references/styles.md and apply it to tone, captions, stamps and colours (scenes still use the Winter Lake pack).`;
};
// Output size note for the shots stage (only when not 9:16).
export const outputText = (o) =>
  !o || o.ratio === "9:16" ? "" : `The video is ${o.width}x${o.height}; the 9:16 scene is framed inside it, keep key action and text in the centre.`;
