// Weave an inspiration board into one story outline: one short Claude run (sonnet, low effort, no tools),
// outside the stage machine. Replay mode returns a labelled canned story and never calls Claude.
import { claudeCli } from "../engine/claude.mjs";
import * as usage from "../lib/usage.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { PREAMBLE, SYSTEM } from "./prompts.mjs";

export const STORY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "2-5 word title" },
    logline: { type: "string", description: "one sentence: who, the danger, the clock" },
    beats: {
      type: "array", minItems: 4, maxItems: 7,
      items: {
        type: "object",
        properties: {
          part: { type: "string", description: "Hook | Mistake | What really happens | What to do | Twist" },
          text: { type: "string", description: "1-2 sentences" },
          uses: { type: "array", items: { type: "integer" }, description: "1-based numbers of the fragments this beat uses" },
        },
        required: ["part", "text", "uses"],
      },
    },
  },
  required: ["title", "logline", "beats"],
};

// Angles a remix can take; a remix never repeats the previous one.
export const WEAVE_ANGLES = [
  "told from the point of view of the person who made the mistake",
  "open on the rescue or the aftermath, then rewind to the first mistake",
  "a calm helper talks one frightened person through it step by step",
  "the danger arrives later than anyone expects, so the clock is the villain",
  "a myth everyone repeats turns out to be the real danger",
  "two people with opposite instincts, and only one is right",
];
export const pickWeaveAngle = (last, rnd = Math.random) => {
  const pool = WEAVE_ANGLES.filter((a) => a !== last);
  return pool[Math.floor(rnd() * pool.length)];
};

export const weavePrompt = (fragments, { angle, previous } = {}) => {
  const pinned = fragments.map((f, i) => (f.pin ? i + 1 : 0)).filter(Boolean);
  return `${PREAMBLE}

Weave these inspiration fragments into ONE story outline for a short narrated 2D survival video (hook, mistake, what really happens, what to do, twist). Use as many fragments as fit; never invent facts or statistics; keep it safe, widely known advice. Each beat lists the fragment numbers it uses.${pinned.length ? `\nPINNED fragments (${pinned.join(", ")}) are mandatory: the story MUST use every one of them, and the beats' "uses" must include each pinned number.` : ""}${angle ? `\nANGLE: ${angle}.` : ""}${previous ? `\nThis is a fresh take, different from: ${previous}` : ""}

FRAGMENTS:
${fragments.map((f, i) => `${i + 1}. [${f.kind}${f.pin ? ", PINNED" : ""}] ${f.text}`).join("\n")}

Return only the structured output. Do not use any tools or write files.`;
};

export const REPLAY_STORY = {
  title: "The Quiet Hour",
  logline: "Two neighbours wait out a night-long blackout and learn which small habits keep them safe.",
  beats: [
    { part: "Hook", text: "The lights go out and nobody knows for how long.", uses: [] },
    { part: "Mistake", text: "One neighbour burns a grill indoors to stay warm.", uses: [] },
    { part: "What really happens", text: "Fresh air is the first thing to run out, not warmth.", uses: [] },
    { part: "What to do", text: "Layer up, share one room, keep a window cracked.", uses: [] },
    { part: "Twist", text: "The calmest person in the building was the one who stayed put.", uses: [] },
  ],
  replay: true,
};

const normalize = (raw, n) => {
  if (!raw || typeof raw.title !== "string" || typeof raw.logline !== "string" || !Array.isArray(raw.beats) || !raw.beats.length) return null;
  const beats = raw.beats.slice(0, 8).map((b) => ({
    part: String(b?.part ?? "").slice(0, 40),
    text: String(b?.text ?? "").slice(0, 400),
    uses: [...new Set((Array.isArray(b?.uses) ? b.uses : []).map(Number).filter((k) => Number.isInteger(k) && k >= 1 && k <= n))],
  })).filter((b) => b.text);
  return beats.length ? { title: raw.title.trim().slice(0, 80), logline: raw.logline.trim().slice(0, 240), beats } : null;
};

const REMIX_TITLES = ["Second Take", "The Long Way Round", "Before Dawn", "What Nobody Said", "Turn It Over", "One Small Choice"];

// Soft check: a warning (not an error) for each pinned fragment no beat uses.
export const pinWarnings = (fragments, story) => {
  const used = new Set(story.beats.flatMap((b) => b.uses));
  return fragments.map((f, i) => (f.pin && !used.has(i + 1) ? `Pinned fragment ${i + 1} was not used.` : null)).filter(Boolean);
};

export const weave = async (fragments, { mode, signal, angle, previous } = {}) => {
  if (!fragments.length) throw Object.assign(new Error("Add at least one fragment first."), { status: 400 });
  if (mode === "replay") {
    const pins = fragments.map((f, i) => (f.pin ? i + 1 : 0)).filter(Boolean);
    const story = { ...REPLAY_STORY, beats: REPLAY_STORY.beats.map((b, i) => (i === 0 ? { ...b, uses: pins } : { ...b })) };
    if (angle) {
      const k = Math.max(0, WEAVE_ANGLES.indexOf(angle));
      story.title = REMIX_TITLES[k % REMIX_TITLES.length];
      story.logline = `${REPLAY_STORY.logline.replace(/\.$/, "")}, ${angle}.`;
      story.angle = angle;
    }
    return story;
  }
  const handle = claudeCli.run("weave", weavePrompt(fragments, { angle, previous }), {
    model: "sonnet", effort: "low", tools: "", budget: 0.3, jsonSchema: STORY_SCHEMA,
    systemPrompt: SYSTEM, timeoutMs: 3 * 60 * 1000,
  });
  signal?.addEventListener("abort", () => handle.cancel(), { once: true });
  let result = null;
  try {
    for await (const ev of handle.events) if (ev.type === "result") result = ev;
  } finally {
    if (!result) handle.cancel();
  }
  if (result) usage.addRun(Number(result.cost ?? 0));
  if (!result?.ok) throw Object.assign(new Error(result?.error?.message ?? "Claude stopped without a result."), { status: result?.error?.code === "plan_limit" ? 429 : 502, code: result?.error?.code ?? "claude_error" });
  const story = normalize(result.structured, fragments.length);
  if (!story) throw Object.assign(new Error("Claude's story did not have the expected shape. Try again."), { status: 502, code: "invalid_output" });
  const unsafe = safetyIssues([story.title, story.logline, ...story.beats.map((b) => b.text)].join(" "));
  if (unsafe.length) throw Object.assign(new Error(`The woven story touches ${unsafe.join(", ")}, which Studio does not make videos about.`), { status: 422, code: "unsafe_story" });
  if (angle) story.angle = angle;
  const warnings = pinWarnings(fragments, story);
  if (warnings.length) story.warnings = warnings;
  return story;
};
