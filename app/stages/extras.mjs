// Extras: titles.json (Claude sonnet, no tools, structured output) and the optional "Verify facts" run
// (sonnet + WebSearch, read-only, writes nothing; the app saves facts.json).
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { APP, episodeDir, rel } from "../lib/paths.mjs";
import { readJson, writeJson } from "../lib/store.mjs";
import { PREAMBLE } from "./prompts.mjs";
import { files as scriptFiles } from "./script.mjs";

export const CREDIT = " (elevenlabs.io)";
export const TITLES_SCHEMA = {
  type: "object",
  properties: {
    titles: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    description: { type: "string" },
  },
  required: ["titles", "description"],
};

export const fitTitles = (data, credit) => {
  const max = credit ? 60 - CREDIT.length : 60;
  const titles = (data?.titles ?? []).slice(0, 3).map((t) => {
    let s = String(t).replace(/\s+/g, " ").trim();
    if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
    return credit ? s + CREDIT : s;
  });
  let description = String(data?.description ?? "").trim();
  if (credit && !/elevenlabs\.io/i.test(description)) description += "\n\nVoice: elevenlabs.io";
  return { titles, description };
};

export const makeTitles = async (ctx) => {
  const p = ctx.project();
  const file = path.join(episodeDir(ctx.slug), "titles.json");
  const credit = !!p.voice?.credit;
  if (ctx.replay) {
    await ctx.claude({ prompt: "", replayAs: "titles" });
    const data = fitTitles(readJson(path.join(APP, "replays", "artifacts", "titles.json")), credit);
    writeJson(file, data);
    return data;
  }
  const lines = readJson(scriptFiles(ctx.slug).lines) ?? [];
  const max = credit ? 60 - CREDIT.length : 60;
  const res = await ctx.claude({
    model: "sonnet",
    effort: "medium",
    tools: "",
    replayAs: "titles",
    budget: 0.3,
    timeoutMs: 3 * 60 * 1000,
    jsonSchema: TITLES_SCHEMA,
    prompt: `${PREAMBLE}\nWrite 3 titles (each at most ${max} characters, curiosity + the key number, no clickbait lies, no emoji) and one 2-3 sentence description with 3-5 hashtags for this vertical survival short titled "${p.title}". English, US audience. Return them in the structured output.\n\nNarration:\n${lines.map((l) => l.text).join("\n")}`,
  });
  let data = fitTitles(res.structured, credit);
  if (data.titles.length < 3 || !data.description) {
    const again = await ctx.claude({ model: "sonnet", effort: "medium", tools: "", replayAs: "titles", budget: 0.2, timeoutMs: 2 * 60 * 1000, jsonSchema: TITLES_SCHEMA, resume: res.sessionId, prompt: `${PREAMBLE}\nReturn exactly 3 titles (each at most ${max} characters) and a description in the structured output.` });
    data = fitTitles(again.structured, credit);
    if (data.titles.length < 3) throw new Error("Claude did not return three titles.");
  }
  writeJson(file, data);
  return data;
};

export const FACTS_SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: { claim: { type: "string" }, verdict: { type: "string", enum: ["confirmed", "adjust", "unverified"] }, note: { type: "string" }, source: { type: "string" } },
        required: ["claim", "verdict", "note", "source"],
      },
    },
  },
  required: ["facts"],
};

// Optional: research the script's facts with WebSearch (researcher agent rules). Does not change files.
export const verifyFacts = async (ctx) => {
  const sf = scriptFiles(ctx.slug);
  const script = existsSync(sf.script) ? readFileSync(sf.script, "utf8").slice(0, 12000) : "";
  const file = path.join(episodeDir(ctx.slug), "facts.json");
  if (ctx.replay) {
    await ctx.claude({ prompt: "", replayAs: "verify" });
    const data = { facts: [{ claim: "Replay mode does not research facts.", verdict: "unverified", note: "Run Verify facts in live mode.", source: "" }] };
    writeJson(file, data);
    return data;
  }
  const res = await ctx.claude({
    model: "sonnet",
    effort: "medium",
    allowedTools: ["WebSearch", "WebFetch"],
    replayAs: "verify",
    budget: 1,
    timeoutMs: 8 * 60 * 1000,
    jsonSchema: FACTS_SCHEMA,
    prompt: `${PREAMBLE}\nAct as the studio's researcher (.claude/agents/researcher.md rules): check every factual claim and number in this script against official sources (government agencies, scientific bodies). For each: claim, verdict (confirmed / adjust / unverified), a one-line note (what to change if "adjust"), and the source URL. Flag anything unsafe as advice. Do not edit files.\n\n${script}`,
  });
  writeJson(file, res.structured);
  ctx.artifact("facts", rel(file));
  return res.structured;
};
