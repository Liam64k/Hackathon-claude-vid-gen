// "Let Claude cast it": one short Claude run (sonnet, low effort, no tools, $0.10), outside the stage machine.
// It derives two characters (age, role, outfit, colours) and the place look from the story. Output is
// validated with normalizeCast; a random cast is the fallback, so the pipeline never blocks.
// Replay mode returns a recorded cast (place look from the topic) and never calls Claude.
import { claudeCli } from "../engine/claude.mjs";
import * as usage from "../lib/usage.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { PREAMBLE, SYSTEM } from "./prompts.mjs";
import * as CD from "../lib/cast-data.mjs";
const { SKIN, HAIR, COATS, FACIAL, BUILDS, THEME_LIST, THEME_IDS, PARTICLES, normalizeCast, pickTheme, randomCast, themeParticles, describeLook } = CD;
// Newer rig fields (fall back to the old lists while cast-data.mjs is being extended).
const OUTFITS = CD.OUTFITS ?? CD.COAT_KINDS;
const HATS = CD.HATS;
const HAIR_STYLES = CD.HAIR_STYLES ?? null;
const AGES = CD.AGES ?? null;

const figure = (who) => ({
  type: "object",
  description: who,
  properties: {
    name: { type: "string", description: "first name, 1-20 letters" },
    role: { type: "string", description: "role first, max 60 chars: job/relation, age (\"night-shift nurse, 34\")" },
    ...(AGES && { age: { enum: AGES } }),
    outfit: { enum: OUTFITS },
    hat: { enum: HATS },
    ...(HAIR_STYLES && { hairStyle: { enum: HAIR_STYLES } }),
    glasses: { type: "boolean" },
    backpack: { type: "boolean" },
    skin: { enum: SKIN.map((x) => x.id) },
    hair: { enum: HAIR.map((x) => x.id) },
    coat: { enum: COATS.map((x) => x.id), description: "main clothing colour" },
    facial: { enum: FACIAL },
    build: { enum: BUILDS },
  },
  required: ["name", "role", ...(AGES ? ["age"] : []), "outfit", "hat", ...(HAIR_STYLES ? ["hairStyle"] : []), "glasses", "backpack", "skin", "hair", "coat", "facial", "build"],
});

export const CAST_SCHEMA = {
  type: "object",
  properties: {
    lead: figure("the person the story follows"),
    second: figure("the other person; different age/role and colour"),
    theme: { enum: THEME_IDS },
    particles: { enum: PARTICLES },
    why: { type: "string", description: "one short sentence" },
  },
  required: ["lead", "second", "theme", "particles", "why"],
};

// Replay: a recorded, non-winter cast (night-shift nurse + teen).
export const REPLAY_CAST = {
  lead: { name: "Maya", role: "night-shift nurse, 34", look: { skin: "#C68E62", hair: "#1E1A1A", coat: "#1F8A84", coatKind: "jacket", outfit: "scrubs", hat: "none", hairStyle: "bun", age: "adult", glasses: false, backpack: false, facial: "none", build: "average" } },
  second: { name: "Theo", role: "her neighbour's son, 15", look: { skin: "#87532F", hair: "#3B2619", coat: "#F2785C", coatKind: "jacket", outfit: "hoodie", hat: "cap", hairStyle: "curly", age: "teen", glasses: true, backpack: true, facial: "none", build: "short" } },
  theme: "nightCity", particles: "none", why: "Recorded cast for replay mode.",
};

const wintry = (t) => /snow|ice|winter|blizzard|frozen|cold|avalanche|frost|arctic/i.test(String(t ?? ""));

export const castPrompt = ({ topic, format, idea, lines, theme } = {}) => `${PREAMBLE}

CASTING: pick the two people on screen and the place look for this short 2D story video.
${[`Topic: ${JSON.stringify(topic ?? "")}`, format && `Format: ${format}`, idea && `Idea: ${JSON.stringify(idea)}`, lines?.length && `Script:\n${lines.slice(0, 30).join("\n")}`].filter(Boolean).join("\n")}

Derive each person from the story, not a default:
- age (kid/teen/adult/elder) and job or role -> outfit (nurse=scrubs, builder=hivis, shop owner=apron, office=suit, police/guard=uniform, kid=tshirt or hoodie; puffy/parka only for real cold), hat (hardhat for building sites, helmet for cycling, none indoors), glasses/backpack when they fit (a schoolkid has a backpack), hair style that fits age (elders grey/white, may be bald).
- Colours from the lists only; the two main colours must contrast clearly (different hue and lightness). Different builds.
- Names that fit the person and place; never real or famous people. Keep names/roles the idea gives.
- The second must differ from the lead in age or role when the story allows. If the story has only one person, make the second a plausible other (rescuer, neighbour, dispatcher, passer-by).
- Place: ${theme && theme !== "auto" ? `keep "${theme}"` : "the theme that fits the setting"}; particles to match. Themes: ${THEME_LIST.map((t) => t.id).join(", ")}.

Return only the structured output. Do not read or write files.`;

// Turn Claude's flat figures into a validated cast; null when anything is off.
export const castFromClaude = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const mk = (f) => {
    const outfit = f?.outfit ?? f?.coatKind;
    const look = { skin: f?.skin, hair: f?.hair, coat: f?.coat, outfit, coatKind: (CD.COAT_KINDS ?? []).includes(outfit) ? outfit : "jacket", hat: f?.hat, facial: f?.facial, build: f?.build };
    for (const k of ["hairStyle", "age", "glasses", "backpack"]) if (f?.[k] !== undefined) look[k] = f[k];
    return { name: f?.name, role: f?.role, look };
  };
  const { cast, errors } = normalizeCast({ lead: mk(raw.lead), second: mk(raw.second), theme: raw.theme, particles: raw.particles }, safetyIssues);
  if (errors.length || cast.lead.name.toLowerCase() === cast.second.name.toLowerCase()) return null;
  return { ...cast, why: String(raw.why ?? "").slice(0, 200) };
};

export const castWithClaude = async (input, { mode, seed, signal } = {}) => {
  const fallback = () => ({ ...randomCast(seed, { winter: wintry(`${input?.topic ?? ""} ${input?.idea?.premise ?? ""}`) }), theme: "auto", particles: "auto", why: "Random cast (Claude's answer was not usable).", fallback: true });
  if (mode === "replay") {
    const theme = input?.theme && input.theme !== "auto" ? input.theme : pickTheme(input?.topic);
    return { ...normalizeCast({ ...REPLAY_CAST, theme, particles: themeParticles(theme) }).cast, why: REPLAY_CAST.why, replay: true };
  }
  const handle = claudeCli.run("cast", castPrompt(input), {
    model: "sonnet", effort: "low", tools: "", budget: 0.1, jsonSchema: CAST_SCHEMA,
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
  if (result?.error?.code === "plan_limit") throw Object.assign(new Error(result?.error?.message ?? "Claude stopped without a result."), { status: 429, code: "plan_limit" });
  if (!result?.ok) return fallback(); // never block the pipeline
  return castFromClaude(result.structured) ?? fallback();
};

export { describeLook };
