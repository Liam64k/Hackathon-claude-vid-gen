// "Let Claude cast it": one short Claude run (sonnet, medium effort, Read only), outside the stage machine.
// It reads the studio's casting rules from the skills, then picks two characters (who they are + how they
// look) and the place look for the story. Output is validated; a random cast is the fallback.
// Replay mode returns a recorded cast (place look from the topic) and never calls Claude.
import { claudeCli } from "../engine/claude.mjs";
import * as usage from "../lib/usage.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { PREAMBLE, SYSTEM } from "./prompts.mjs";
import { SKIN, HAIR, COATS, HATS, FACIAL, COAT_KINDS, BUILDS, THEME_LIST, THEME_IDS, PARTICLES, normalizeCast, pickTheme, randomCast, themeParticles, describeLook } from "../lib/cast-data.mjs";

const figure = (who) => ({
  type: "object",
  description: who,
  properties: {
    name: { type: "string", description: "first name that fits this person, 1-20 letters" },
    role: { type: "string", description: "who they are in this story, role first: age, job or relation, max 60 characters (e.g. \"night-shift nurse, 34, Maya's sister\")" },
    skin: { enum: SKIN.map((x) => x.id) },
    hair: { enum: HAIR.map((x) => x.id) },
    coat: { enum: COATS.map((x) => x.id) },
    coatKind: { enum: COAT_KINDS },
    hat: { enum: HATS },
    facial: { enum: FACIAL },
    build: { enum: BUILDS },
  },
  required: ["name", "role", "skin", "hair", "coat", "coatKind", "hat", "facial", "build"],
});

export const CAST_SCHEMA = {
  type: "object",
  properties: {
    lead: figure("the main character (the narrator or the person in danger)"),
    second: figure("the second character; clearly different from the lead"),
    theme: { enum: THEME_IDS },
    particles: { enum: PARTICLES },
    why: { type: "string", description: "one sentence: why these two people, clothes and place fit the story" },
  },
  required: ["lead", "second", "theme", "particles", "why"],
};

export const REPLAY_CAST = {
  lead: { name: "Maya", role: "night-shift nurse, 34", look: { skin: "#C68E62", hair: "#1E1A1A", coat: "#D63B34", coatKind: "puffy", hat: "beanie", facial: "none", build: "average" } },
  second: { name: "Omar", role: "her neighbour, retired bus driver", look: { skin: "#D9A27C", hair: "#3B2619", coat: "#27407A", coatKind: "parka", hat: "none", facial: "stubble", build: "tall" } },
  theme: "nightCity", particles: "none", why: "Recorded cast for replay mode.",
};

// The casting rules live in the skills; the run reads exactly these (cheap, and the same rules as the
// script and storyboard stages).
export const CAST_SKILL_FILES = [
  ".claude/skills/story-explainer-2d/references/cast-and-theme.md",
  ".claude/skills/story-explainer-2d/references/visual-style.md (only the section \"## 1. Shapes and characters\")",
  ".claude/skills/survival-short/references/story.md",
];

export const castPrompt = ({ topic, format, idea, lines, theme } = {}) => `${PREAMBLE}

CASTING for a short narrated 2D survival video: choose the two people on screen and the look of the place.
${[`Topic: ${JSON.stringify(topic ?? "")}`, format && `Format: ${format}`, idea && `Chosen idea: ${JSON.stringify(idea)}`, lines?.length && `Script lines:\n${lines.slice(0, 40).map((l, i) => `${i + 1}. ${l}`).join("\n")}`].filter(Boolean).join("\n")}

Read these first (the studio's casting and character rules):
${CAST_SKILL_FILES.map((f) => `- ${f}`).join("\n")}

Then cast:
- WHO: the lead is the person the story follows; the second is the person they help, warn, follow or argue with. Give each a role, role first ("Ray, the building's janitor"): age, job or relation. Make them specific to this story and different from each other (age, job, temperament). If the idea names people, keep their names and roles.
- LOOK: identity by colour and silhouette. Each gets ONE signature coat colour (clearly different hues), a different build and a different hat (or none); clothes that fit the climate, the job and the time of day (a summer evening is no puffy coat and trapper hat; a blizzard is). Facial hair only if it suits the person.
- NAMES: first names that fit who they are and where they live; varied and not stereotyped; never real or famous people.
- PLACE: ${theme && theme !== "auto" ? `the user chose the place look "${theme}"; keep it` : "pick the theme that fits the setting"} and the particles that fit it. Themes: ${THEME_LIST.map((t) => `${t.id} (${t.label}, ${t.particles})`).join("; ")}.

Return only the structured output. Do not write files.`;

// Turn Claude's flat figures into a validated cast; null when anything is off.
export const castFromClaude = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const mk = (f) => ({ name: f?.name, role: f?.role, look: { skin: f?.skin, hair: f?.hair, coat: f?.coat, coatKind: f?.coatKind, hat: f?.hat, facial: f?.facial, build: f?.build } });
  const { cast, errors } = normalizeCast({ lead: mk(raw.lead), second: mk(raw.second), theme: raw.theme, particles: raw.particles }, safetyIssues);
  if (errors.length || cast.lead.name.toLowerCase() === cast.second.name.toLowerCase()) return null;
  return { ...cast, why: String(raw.why ?? "").slice(0, 200) };
};

export const castWithClaude = async (input, { mode, seed, signal } = {}) => {
  const fallback = () => ({ ...randomCast(seed), theme: "auto", particles: "auto", why: "Random cast (Claude's answer was not usable).", fallback: true });
  if (mode === "replay") {
    const theme = input?.theme && input.theme !== "auto" ? input.theme : pickTheme(input?.topic);
    return { ...normalizeCast({ ...REPLAY_CAST, theme, particles: themeParticles(theme) }).cast, why: REPLAY_CAST.why, replay: true };
  }
  const handle = claudeCli.run("cast", castPrompt(input), {
    model: "sonnet", effort: "medium", allowedTools: ["Read"], budget: 0.25, jsonSchema: CAST_SCHEMA,
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
  return castFromClaude(result.structured) ?? fallback();
};

export { describeLook };
