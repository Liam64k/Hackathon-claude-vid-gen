// Hook lab: three alternative opening lines for a video. One short Claude run (sonnet, low effort, no tools),
// outside the stage machine; it never changes stage statuses. Replay mode returns three recorded hooks.
import { claudeCli } from "../engine/claude.mjs";
import * as usage from "../lib/usage.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { PREAMBLE, SYSTEM } from "./prompts.mjs";

export const HOOKS_SCHEMA = {
  type: "object",
  properties: { hooks: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } } },
  required: ["hooks"],
};

export const REPLAY_HOOKS = [
  "Would you notice the ice going quiet before it breaks?",
  "The scariest part of thin ice is how normal it looks.",
  "You are halfway across the lake when you hear the first crack.",
];

export const hooksPrompt = ({ title, premise, hook, line, topic } = {}) => `${PREAMBLE}

Write exactly 3 alternative opening hooks (the first narrated line) for a short 2D survival video.
${line ? `Current first line: ${JSON.stringify(line)}` : `Idea: ${JSON.stringify(title ?? "")}. Premise: ${JSON.stringify(premise ?? "")}. Current hook: ${JSON.stringify(hook ?? "")}`}
${topic ? `Topic: ${JSON.stringify(topic)}` : ""}

Rules: each hook is at most 20 words; no digits (spell every number out as words); safe, widely known advice only; never invent facts or statistics. The three hooks must open differently: 1) a question, 2) a bold claim, 3) a you-are-there moment.

Return only the structured output. Do not use any tools or write files.`;

// Keep only usable hooks: strings, <= 20 words, no digits, safe, no duplicates.
export const cleanHooks = (raw) => {
  const out = [];
  for (const h of Array.isArray(raw) ? raw : []) {
    const t = String(h ?? "").trim().replace(/\s+/g, " ");
    if (!t || t.split(" ").length > 20 || /\d/.test(t) || safetyIssues(t).length || out.includes(t)) continue;
    out.push(t);
  }
  return out.slice(0, 3);
};

export const hooks = async (input, { mode, signal } = {}) => {
  if (mode === "replay") return { hooks: [...REPLAY_HOOKS], replay: true };
  const handle = claudeCli.run("hooks", hooksPrompt(input), {
    model: "sonnet", effort: "low", tools: "", budget: 0.1, jsonSchema: HOOKS_SCHEMA,
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
  if (!result?.ok) throw Object.assign(new Error(result?.error?.message ?? "Claude stopped without a result."), { status: 502, code: result?.error?.code ?? "claude_error" });
  const list = cleanHooks(result.structured?.hooks);
  if (!list.length) throw Object.assign(new Error("Claude's hooks did not pass the checks. Try again."), { status: 502, code: "invalid_output" });
  return { hooks: list };
};
