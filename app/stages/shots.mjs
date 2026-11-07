// Stage 3 — Shots + storyboard: Claude (sonnet, high) edits src/shots.ts DATA using only the Winter Lake
// pack catalog; the app then validates, typechecks (one --resume repair pass), renders the storyboard
// stills + contact sheet, and saves the build to episodes/<slug>/build/.
import path from "node:path";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { EDITS_JSON, OUT, SHOTS_TS, episodeDir, rel } from "../lib/paths.mjs";
import { summarizeRaw } from "../lib/edits.mjs";
import { readJson, writeJson } from "../lib/store.mjs";
import { loadShots, validateShots } from "../lib/validate.mjs";
import { checkout, saveCurrent, EXAMPLE_BUILD } from "../lib/workspace.mjs";
import { storyboard, typecheck } from "../lib/remotion-tasks.mjs";
import { StageError } from "../jobs.mjs";
import { sleep } from "../engine/replay.mjs";
import { PREAMBLE, packCatalog, styleText, outputText, castText, placeText } from "./prompts.mjs";
import { files as scriptFiles } from "./script.mjs";

export const prompt = (p, lines) => `${PREAMBLE}

STAGE 3 — SHOTS. Turn the approved script and beat board into src/shots.ts for the Winter Lake pack.
Episode slug: ${p.slug}
${styleText(p.style)}${outputText(p.output) ? `\n${outputText(p.output)}` : ""}${castText(p) ? `\n${castText(p)} Keep each person on the same figure id in every shot; callouts/stamps use their names.` : ""}${placeText(p) ? `\n${placeText(p)} Pick particles (or none) that fit this theme.` : ""}

APPROVED NARRATION — must become LINES exactly (same order, same text, same highlight arrays):
${JSON.stringify(lines, null, 1)}

BEAT BOARD: read ${rel(scriptFiles(p.slug).shotlist)} once.

src/shots.ts holds the template (the example episode "Ten Minutes Under", or this episode's previous version). Read it once. Keep its header comment style, the type-only imports, the helpers (v, eli = the lead, brother = the second, inHole, inCut), constants and colours. Replace TITLE (= "${p.slug}"), LINES and the RAW shot array for the new episode. Keep \`export const SHOTS = RAW.map(...)\`.

PACK CATALOG — the ONLY legal scenes, props, poses, views, expressions, events, cards and HUD fields (anything else fails typecheck or draws nothing):
${packCatalog()}

Rules:
- Edit only src/shots.ts. Read src/types.ts only if a catalog entry is unclear. Do not create files.
- 2-3 shots per line; weight = seconds (≈ words / 2.6 + 0.3 split over the line's shots); every shot 1.5-3.5 s.
- A UI change (callout, stamp, tag, tick, card, HUD value) about every 3 s; a camera move or cut at least every 6 s; vary scenes and shot sizes.
- Every number spoken appears on screen when said (digits + unit: "6 CM"). On-screen text uppercase, short (≤ 22 characters per callout).
- Cards with fixed text (title, ladder, part2, the oneTenOne chip, phone911) only where their text is literally true for THIS story; otherwise use callouts, stamps, tags, swatch with opts.text, angle.
- HUD: the clock pill always reads "DEC"; use water / phase / strip / brother (distance) fields only if the story really is that situation.
- Keep faces and the HUD out of the caption band (cap "mid" = 64 % height; use cap "high" when the action is low).
- When done, run exactly \`npm run typecheck\` (no pipes, no extra flags) and fix every error until it passes. Then stop.`;

const verify = async (ctx, lines) => {
  const errs = [];
  try {
    errs.push(...validateShots(await loadShots(), lines));
  } catch (e) {
    errs.push(`src/shots.ts does not load: ${e.message.split("\n")[0]}`);
  }
  ctx.activity("Running typecheck", { tool: "server" });
  const tc = await typecheck({ onCancel: ctx.onCancel });
  if (!tc.ok) errs.push(...(tc.errors.length ? tc.errors : tc.tail.slice(-6)));
  return errs;
};

// What the UI reads about the shots: shots.json (one row per rendered shot) and, from the unedited
// shots.ts, rawshots.json (the frame editor's base list).
const saveShotFiles = (slug, applied, raw = applied) => {
  const ep = episodeDir(slug);
  writeJson(path.join(ep, "shots.json"), applied.map((s) => ({ id: s.id, line: s.line, scene: s.scene, weight: s.weight })));
  writeJson(path.join(ep, "rawshots.json"), summarizeRaw(raw));
};

const copyStoryboard = (slug, stills) => {
  const dir = path.join(episodeDir(slug), "storyboard");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  stills.forEach((f, i) => copyFileSync(f, path.join(dir, `shot-${String(i).padStart(2, "0")}.png`)));
};

export const run = async (ctx) => {
  const p = ctx.project();
  const sf = scriptFiles(ctx.slug);
  const lines = readJson(sf.lines);
  if (!Array.isArray(lines)) throw new StageError("missing_input", "Approve the script first.");
  const ep = episodeDir(ctx.slug);

  if (ctx.replay) {
    // Replay never touches src/: it shows the cached storyboard of the finished episode.
    await ctx.claude({ prompt: "", replayAs: "shots" });
    ctx.activity("Typecheck passed (recorded)", { tool: "server" });
    const stills = readdirSync(path.join(EXAMPLE_BUILD, "storyboard")).filter((f) => f.endsWith(".png")).sort();
    for (let i = 0; i < stills.length && !ctx.signal.aborted; i += 3) {
      ctx.progress(i / stills.length, `Rendering stills ${i}/${stills.length} (replay)`);
      await sleep(180, ctx.signal);
    }
    ctx.checkAborted();
    copyStoryboard(ctx.slug, stills.map((f) => path.join(EXAMPLE_BUILD, "storyboard", f)));
    copyFileSync(path.join(EXAMPLE_BUILD, "storyboard.png"), path.join(ep, "storyboard.png"));
    mkdirSync(path.join(ep, "build"), { recursive: true });
    copyFileSync(path.join(EXAMPLE_BUILD, "shots.ts"), path.join(ep, "build", "shots.ts"));
    rmSync(path.join(ep, "build", "edits.json"), { force: true });
    const ex = await loadShots(path.join(EXAMPLE_BUILD, "shots.ts"));
    saveShotFiles(ctx.slug, ex.SHOTS);
    ctx.update((s) => (s.stages.shots.shots = ex.SHOTS.length));
    ctx.artifact("storyboard", rel(path.join(ep, "storyboard.png")), { stills: stills.length });
    return;
  }

  checkout(ctx.slug);
  // fresh shots from Claude: old frame/timing edits no longer match them
  writeFileSync(EDITS_JSON, "null\n");
  rmSync(path.join(ep, "build", "edits.json"), { force: true });
  ctx.activity(`Workspace: src/ now holds "${p.title ?? ctx.slug}"`, { tool: "server" });
  // If this run fails or is stopped, put back the last good shots.ts so a half-edited file never
  // reaches the project's saved build (saveCurrent runs when another project is checked out).
  const before = readFileSync(SHOTS_TS, "utf8");
  const spec = { model: "sonnet", effort: "high", allowedTools: ["Read", "Write", "Edit", "Bash(npm run typecheck)", "Bash(npm run typecheck *)"], budget: 6, thinkingText: "Claude is planning the shots", timeoutMs: 25 * 60 * 1000 };
  try {
    const res = await ctx.claude({ ...spec, prompt: prompt(p, lines) });
    ctx.checkAborted();
    let errs = await verify(ctx, lines);
    if (errs.length) {
      ctx.activity(`shots.ts has ${errs.length} problem(s) — one automatic repair pass`, { level: "warn" });
      await ctx.claude({ ...spec, budget: 2, resume: res.sessionId, prompt: `${PREAMBLE}\nThe app checked src/shots.ts and found:\n- ${errs.slice(0, 25).join("\n- ")}\nFix src/shots.ts, run exactly \`npm run typecheck\` until it passes, then stop.` });
      ctx.checkAborted();
      errs = await verify(ctx, lines);
      if (errs.length) throw new StageError("typecheck", `src/shots.ts still fails after one repair pass. The previous version was restored.`, { tail: errs.slice(0, 12) });
    }
  } catch (e) {
    writeFileSync(SHOTS_TS, before);
    throw e;
  }
  saveCurrent();
  const shots = await loadShots();
  saveShotFiles(ctx.slug, shots.SHOTS);
  ctx.update((s) => (s.stages.shots.shots = shots.SHOTS.length));
  ctx.artifact("shots", "src/shots.ts");

  ctx.activity(`Rendering storyboard (${shots.SHOTS.length} stills)`, { tool: "server" });
  await renderStills(ctx, shots.SHOTS.length);
};

// Render the stills of what src/ holds now and file them under the project.
const renderStills = async (ctx, count) => {
  const ep = episodeDir(ctx.slug);
  const sb = await storyboard(count, { onProgress: (v, l) => ctx.progress(v, l), onCancel: ctx.onCancel });
  ctx.checkAborted();
  if (!sb.ok) throw new StageError("storyboard", "The storyboard render failed.", { tail: sb.tail });
  copyStoryboard(ctx.slug, sb.stills);
  copyFileSync(path.join(OUT, "storyboard.png"), path.join(ep, "storyboard.png"));
  ctx.artifact("storyboard", rel(path.join(ep, "storyboard.png")), { stills: sb.tiles });
};

// Frame and timing edits from the storyboard editor (already validated): apply them in src/ and redraw.
export const renderEdits = async (ctx, { edits, applied, raw }) => {
  checkout(ctx.slug);
  writeFileSync(EDITS_JSON, JSON.stringify(edits) + "\n");
  ctx.activity(`Rendering ${applied.length} stills with your edits`, { tool: "server" });
  await renderStills(ctx, applied.length);
  saveShotFiles(ctx.slug, applied, raw);
  ctx.update((s) => (s.stages.shots.shots = applied.length));
};
