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

export const weavePrompt = (fragments) => `${PREAMBLE}

Weave these inspiration fragments into ONE story outline for a short narrated 2D survival video (hook, mistake, what really happens, what to do, twist). Use as many fragments as fit; never invent facts or statistics; keep it safe, widely known advice. Each beat lists the fragment numbers it uses.

FRAGMENTS:
${fragments.map((f, i) => `${i + 1}. [${f.kind}] ${f.text}`).join("\n")}

Return only the structured output. Do not use any tools or write files.`;

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

export const weave = async (fragments, { mode, signal } = {}) => {
  if (!fragments.length) throw Object.assign(new Error("Add at least one fragment first."), { status: 400 });
  if (mode === "replay") return { ...REPLAY_STORY };
  const handle = claudeCli.run("weave", weavePrompt(fragments), {
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
  if (!result?.ok) throw Object.assign(new Error(result?.error?.message ?? "Claude stopped without a result."), { status: 502, code: result?.error?.code ?? "claude_error" });
  const story = normalize(result.structured, fragments.length);
  if (!story) throw Object.assign(new Error("Claude's story did not have the expected shape. Try again."), { status: 502, code: "invalid_output" });
  const unsafe = safetyIssues([story.title, story.logline, ...story.beats.map((b) => b.text)].join(" "));
  if (unsafe.length) throw Object.assign(new Error(`The woven story touches ${unsafe.join(", ")}, which Studio does not make videos about.`), { status: 422, code: "unsafe_story" });
  return story;
};
