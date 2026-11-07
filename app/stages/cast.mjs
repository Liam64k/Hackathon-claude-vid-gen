// "Let Claude cast it": one short Claude run (sonnet, low effort, no tools), outside the stage machine.
// Picks two characters + place look that fit the story. Output is validated; a random cast is the fallback.
// Replay mode returns a recorded cast and never calls Claude.
import { claudeCli } from "../engine/claude.mjs";
import * as usage from "../lib/usage.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { PREAMBLE, SYSTEM } from "./prompts.mjs";
import { SKIN, HAIR, COATS, HATS, FACIAL, COAT_KINDS, BUILDS, THEME_LIST, THEME_IDS, PARTICLES, NAMES, normalizeCast, randomCast, describeLook } from "../lib/cast-data.mjs";

const figure = (who) => ({
  type: "object",
  description: who,
  properties: {
    name: { type: "string", description: "US first name, 1-20 letters" },
    skin: { enum: SKIN.map((x) => x.id) },
    hair: { enum: HAIR.map((x) => x.id) },
    coat: { enum: COATS.map((x) => x.id) },
    coatKind: { enum: COAT_KINDS },
    hat: { enum: HATS },
    facial: { enum: FACIAL },
    build: { enum: BUILDS },
  },
  required: ["name", "skin", "hair", "coat", "coatKind", "hat", "facial", "build"],
});

export const CAST_SCHEMA = {
  type: "object",
  properties: {
    lead: figure("the main character (the narrator or the person in danger)"),
    second: figure("the second character; clearly different from the lead"),
    theme: { enum: THEME_IDS },
    particles: { enum: PARTICLES },
    why: { type: "string", description: "one short sentence on why this cast fits the story" },
  },
  required: ["lead", "second", "theme", "particles", "why"],
};

export const REPLAY_CAST = {
  lead: { name: "Maya", look: { skin: "#C68E62", hair: "#1E1A1A", coat: "#D63B34", coatKind: "puffy", hat: "beanie", facial: "none", build: "average" } },
  second: { name: "Omar", look: { skin: "#D9A27C", hair: "#3B2619", coat: "#27407A", coatKind: "parka", hat: "none", facial: "stubble", build: "tall" } },
  theme: "nightCity", particles: "none", why: "Recorded cast for replay mode.",
};

export const castPrompt = ({ topic, idea, lines } = {}) => `${PREAMBLE}

Cast a short 2D survival video: two characters and the look of the place.
Topic: ${JSON.stringify(topic ?? "")}
${idea ? `Chosen idea: ${JSON.stringify(idea)}` : ""}
${lines?.length ? `Script lines:\n${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}` : ""}

Rules: pick the figures a viewer would expect in this story (age, job and climate decide coat, hat and build); the two must look clearly different from each other (different coat colour, hat and build). Pick the theme and particles that fit the setting: ${THEME_LIST.map((t) => `${t.id} (${t.label}, ${t.particles})`).join("; ")}. Names are common US first names (for example ${NAMES.slice(0, 6).join(", ")}). Do not name real people.

Return only the structured output. Do not use any tools or write files.`;

// Turn Claude's flat figures into a validated cast; null when anything is off.
export const castFromClaude = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const mk = (f) => ({ name: f?.name, look: { skin: f?.skin, hair: f?.hair, coat: f?.coat, coatKind: f?.coatKind, hat: f?.hat, facial: f?.facial, build: f?.build } });
  const { cast, errors } = normalizeCast({ lead: mk(raw.lead), second: mk(raw.second), theme: raw.theme, particles: raw.particles }, safetyIssues);
  if (errors.length || cast.lead.name.toLowerCase() === cast.second.name.toLowerCase()) return null;
  return { ...cast, why: String(raw.why ?? "").slice(0, 200) };
};

export const castWithClaude = async (input, { mode, seed, signal } = {}) => {
  const fallback = () => ({ ...randomCast(seed), theme: "auto", particles: "auto", why: "Random cast (Claude's answer was not usable).", fallback: true });
  if (mode === "replay") return { ...normalizeCast(REPLAY_CAST).cast, why: REPLAY_CAST.why, replay: true };
  const handle = claudeCli.run("cast", castPrompt(input), {
    model: "sonnet", effort: "low", tools: "", budget: 0.1, jsonSchema: CAST_SCHEMA,
    systemPrompt: SYSTEM, timeoutMs: 2 * 60 * 1000,
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
  return castFromClaude(result.structured) ?? fallback();
};

export { describeLook };
