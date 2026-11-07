// Stage 1 — Ideas: five premises with title, hook, twist, world, diagrams, fact, risk, score.
// Live: Claude (opus, high) with --json-schema; the app writes episodes/<slug>/ideas.json from the
// structured output and streams each card to the UI as soon as it is complete in the stream.
import path from "node:path";
import { readFileSync } from "node:fs";
import { APP, episodeDir, rel } from "../lib/paths.mjs";
import { writeJson } from "../lib/store.mjs";
import { completedItems } from "../engine/parse.mjs";
import { IDEAS_SCHEMA, isWinterTopic, safetyIssues, validateIdeas } from "../lib/validate.mjs";
import { StageError } from "../jobs.mjs";
import { sleep } from "../engine/replay.mjs";
import { PACK_BRIEF, PREAMBLE, formatText, styleText, lengthText, pastIdeas, pickAngles, castText, placeText, settingDice } from "./prompts.mjs";
import { seriesText } from "./sequel.mjs";

// How much winter a project may have: Surprise me, a winter topic (or a winter series), or none.
export const iceRules = (p) => {
  const surprise = !!p.surprise && !p.seed && !p.series;
  const winterOk = isWinterTopic(`${p.topic} ${p.seed ?? ""} ${p.series?.previously ?? ""}`);
  return { surprise, winterOk };
};

export const prompt = (p, angles = pickAngles(5, { surprise: iceRules(p).surprise, winterTopic: iceRules(p).winterOk }), past = pastIdeas(p.slug)) => `${PREAMBLE}

STAGE 1 — IDEAS for a vertical (9:16) narrated 2D survival short.
${p.surprise ? "Topic: SURPRISE ME — pick the five strongest premises yourself." : `Topic from the user: ${JSON.stringify(p.topic)}. Keep the user's scenario; show it with this pack's devices (say in "risk" what is adapted).`}${p.seed ? `\nBuild idea 1 on this story outline:\n${p.seed}\nIdeas 2-5 are variations of it.` : ""}${p.series ? `\n${seriesText(p.series)}\nAll five ideas are candidates for this next episode.` : ""}
${styleText(p.style)}
Format: ${formatText(p.format)}
Length: ${lengthText(p.length)}

${PACK_BRIEF}${castText(p) ? `\n${castText(p)} Ideas may change the lead's age, job and situation but keep these names.` : ""}${placeText(p) ? `\n${placeText(p)}` : ""}

Read only these two files first:
- .claude/skills/story-explainer-2d/references/survival-format.md
- .claude/skills/survival-short/references/story.md

Then return exactly 5 clearly different ideas in the structured output (best first):
- premise = WHO + CONSTRAINT + CLOCK + RESOURCE in one sentence a ten-year-old gets; it must pass the "wait, then what?" test.
- hook = the first spoken line, under 14 words, using one of the skill's hook formulas.
- twist = the common mistake or myth it busts, with the correct safe action.
- world = the setting, time of day and the main characters (fresh names fitting the story, and their relationship).
- diagrams = 3-5 on-screen explainers this pack can show.
- fact = the key real number and the organisation that publishes it; verify = what must be checked before publishing.
- score 0-9 = clear in 1 s (0-3) + non-obvious twist (0-3) + stakes the viewer feels (0-3).
VARIETY (important): the five ideas must differ in situation, danger, setting and protagonist (age, job, situation); never reuse a protagonist or setting from the used titles below. ${iceRules(p).winterOk ? "At most ONE idea may involve someone falling through the ice." : iceRules(p).surprise ? "At most TWO ideas may be set on ice or a frozen lake; the others are other survival scenarios." : "This topic is NOT about winter: no idea may be set on ice or a frozen lake."} Build idea N on angle N below (bend it to fit the topic):
${angles.map((a, i) => `${i + 1}. ${a}`).join("\n")}
Optional setting dice (inspiration only, skip if off-topic): ${settingDice().join("; ")}.
Titles already used (do not reuse them or remake their stories): ${["Ten Minutes Under", ...past].join("; ")}
No web research. Do not write any files; the app saves your structured output.`;

const streamCards = (ctx) => {
  let sent = 0;
  return (json) => {
    const items = completedItems(json, "ideas");
    while (sent < items.length) {
      ctx.emit("partial", { kind: "idea", index: sent, idea: items[sent] });
      ctx.activity(`Idea ${sent + 1}: ${items[sent].title ?? ""}`, { tool: "idea" });
      sent++;
    }
  };
};

export const run = async (ctx) => {
  const p = ctx.project();
  const file = path.join(episodeDir(ctx.slug), "ideas.json");

  if (ctx.replay) {
    const data = JSON.parse(readFileSync(path.join(APP, "replays", "artifacts", "ideas.json"), "utf8"));
    // replayed activity + the cached cards dripping in alongside it
    const drip = (async () => {
      await sleep(2500, ctx.signal);
      for (let i = 0; i < data.ideas.length && !ctx.signal.aborted; i++) {
        ctx.emit("partial", { kind: "idea", index: i, idea: data.ideas[i] });
        await sleep(1600, ctx.signal);
      }
    })();
    await ctx.claude({ prompt: "", replayAs: "ideas" });
    await drip;
    ctx.checkAborted();
    writeJson(file, data);
    ctx.artifact("ideas", rel(file));
    return;
  }

  const unsafe = safetyIssues(p.topic);
  if (unsafe.length) throw new StageError("unsafe_topic", `That topic touches ${unsafe.join(", ")}, which Studio does not make videos about. Try a survival or disaster-preparedness topic.`);

  const spec = { model: "opus", effort: "high", allowedTools: ["Read"], budget: 1.5, thinkingText: "Claude is weighing premises, hooks and twists", jsonSchema: IDEAS_SCHEMA, timeoutMs: 8 * 60 * 1000 };
  let res = await ctx.claude({ ...spec, prompt: prompt(p), onPartial: streamCards(ctx) });
  const rules = iceRules(p);
  let errs = validateIdeas(res.structured, rules);
  if (errs.length) {
    ctx.activity(`Ideas need a fix: ${errs.slice(0, 2).join("; ")} — asking Claude once more`, { level: "warn" });
    res = await ctx.claude({ ...spec, resume: res.sessionId, prompt: `${PREAMBLE}\nYour ideas failed these checks:\n- ${errs.join("\n- ")}\nReturn all 5 corrected ideas in the structured output.`, onPartial: streamCards(ctx) });
    errs = validateIdeas(res.structured, rules);
    if (errs.length) throw new StageError("invalid_output", `Claude's ideas did not pass the checks: ${errs.slice(0, 3).join("; ")}`);
  }
  writeJson(file, res.structured);
  ctx.artifact("ideas", rel(file));
};
