// Stage 2 — Script + beat board: episodes/<slug>/script.md, lines.json [{text, highlight[]}], shotlist.md.
// Live: Claude (opus, high), tools Read,Write. One automatic repair pass (--resume) if lines.json fails.
import path from "node:path";
import { copyFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { APP, EXAMPLE_DIR, episodeDir, rel } from "../lib/paths.mjs";
import { readJson, writeJson } from "../lib/store.mjs";
import { validateLines, wordCount } from "../lib/validate.mjs";
import { StageError } from "../jobs.mjs";
import { PACK_BRIEF, PREAMBLE, formatText, lengthText } from "./prompts.mjs";

export const files = (slug) => {
  const d = episodeDir(slug);
  return { script: path.join(d, "script.md"), lines: path.join(d, "lines.json"), shotlist: path.join(d, "shotlist.md") };
};

export const prompt = (p, idea) => {
  const f = files(p.slug);
  return `${PREAMBLE}

STAGE 2 — SCRIPT + BEAT BOARD for the approved idea. Episode slug: ${p.slug}
Approved idea: ${JSON.stringify(idea)}
Format: ${formatText(p.format)}
Length: ${lengthText(p.length)}

${PACK_BRIEF}

Read only:
- .claude/skills/survival-short/references/story.md (spine, pacing)
- .claude/skills/story-explainer-2d/references/survival-format.md (five-part skeleton, safety)
- .claude/skills/survival-short/references/shots.md (2D shot grammar)
- the first 70 lines of episodes/ten-minutes-under/script.md (FORMAT reference only; never copy its story or lines)

Write exactly these three files:
1. ${rel(f.lines)} — a JSON array: [{"text": "...", "highlight": ["word", "word:r"]}, ...]. 12-18 narration lines of 1-3 sentences, ${lengthText(p.length)}. Every number spelled out in words ("ten centimeters", "nine-one-one"); no digits anywhere. highlight = 1-3 words copied exactly from that line, lowercase, punctuation removed ("brother's" keeps its apostrophe); add ":r" for danger words, ":g" for the correct action, default gold. One coloured word per caption phrase of about six words.
2. ${rel(f.script)} — title, premise, the five-part skeleton as a table (hook / everyone's mistake / what really happens / what to do / twist or part two), the narration as ONE block with one blank line between lines (identical text to lines.json), and "Facts to verify": each fact, its number and the organisation that publishes it.
3. ${rel(f.shotlist)} — the beat board: for every narration line, 2-3 shots in a table: id (1a, 1b...), seconds, scene (lakeSide | lakeCut | lakeTop | lakePrint), camera (size + move), figures + pose, on-screen UI (callout / stamp / card / HUD change), purpose. Every number spoken appears on screen when it is said; a UI change every ~3 s; at least three explanatory diagrams in the video.

No web research. Then stop.`;
};

const check = (ctx, p) => {
  const f = files(ctx.slug);
  if (!existsSync(f.lines)) return { errors: [`${rel(f.lines)} was not written`] };
  let lines;
  try {
    lines = JSON.parse(readFileSync(f.lines, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    return { errors: [`${rel(f.lines)} is not valid JSON (${e.message})`] };
  }
  const v = validateLines(lines, p.length);
  for (const k of ["script", "shotlist"]) if (!existsSync(f[k])) v.errors.push(`${rel(f[k])} was not written`);
  return { ...v, lines };
};

export const run = async (ctx) => {
  const p = ctx.project();
  const ideas = readJson(path.join(episodeDir(ctx.slug), "ideas.json"));
  const idea = ideas?.ideas?.[p.pick ?? 0];
  if (!idea) throw new StageError("missing_input", "Pick an idea first.");
  const f = files(ctx.slug);

  if (ctx.replay) {
    await ctx.claude({ prompt: "", replayAs: "script" });
    ctx.checkAborted();
    copyFileSync(path.join(EXAMPLE_DIR, "script.md"), f.script);
    copyFileSync(path.join(EXAMPLE_DIR, "shotlist.md"), f.shotlist);
    copyFileSync(path.join(APP, "replays", "artifacts", "lines.json"), f.lines);
  } else {
    // a rewrite starts clean: a previous run's files must never pass the checks for this run
    for (const k of ["lines", "script", "shotlist"]) rmSync(f[k], { force: true });
    const spec = { model: "opus", effort: "high", allowedTools: ["Read", "Write"], budget: 3, thinkingText: "Claude is drafting the narration and beats", timeoutMs: 15 * 60 * 1000 };
    const res = await ctx.claude({ ...spec, prompt: prompt(p, idea) });
    let v = check(ctx, p);
    if (v.errors.length) {
      ctx.activity(`Script needs a fix (${v.errors.length} issue${v.errors.length > 1 ? "s" : ""}) — one automatic repair pass`, { level: "warn" });
      await ctx.claude({ ...spec, budget: 1.5, resume: res.sessionId, prompt: `${PREAMBLE}\nThe files failed these checks:\n- ${v.errors.join("\n- ")}\nFix ${rel(f.lines)} (and the narration block in ${rel(f.script)} so it stays identical). Then stop.` });
      v = check(ctx, p);
    }
    if (!v.lines) throw new StageError("invalid_output", v.errors.join("; "));
    // Structural problems block; a word count slightly out of range is left for the user to edit.
    const blocking = v.errors.filter((e) => !/^script is \d+ words/.test(e));
    if (blocking.length) throw new StageError("invalid_output", `The script still fails ${blocking.length} check(s): ${blocking.slice(0, 3).join("; ")}`);
    for (const e of v.errors) ctx.warn(e);
  }
  const lines = readJson(f.lines);
  ctx.update((s) => (s.stages.script.words = wordCount(lines)));
  ctx.artifact("lines", rel(f.lines));
  ctx.artifact("script", rel(f.script));
  ctx.artifact("shotlist", rel(f.shotlist));
};

// User edits from the Script screen. Returns validation result; writes only valid structure.
export const saveLines = (slug, lines, length) => {
  const clean = (Array.isArray(lines) ? lines : []).map((l) => ({ text: String(l?.text ?? "").replace(/\s+/g, " ").trim(), highlight: (Array.isArray(l?.highlight) ? l.highlight : []).map(String).filter(Boolean).slice(0, 4) }));
  const v = validateLines(clean, length);
  const blocking = v.errors.filter((e) => !/^script is \d+ words/.test(e));
  if (!blocking.length) writeJson(files(slug).lines, clean);
  return { ...v, saved: !blocking.length };
};
