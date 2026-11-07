// Stage 5 — Render: Remotion render with a progress bar, phone copy (< 30 MB), cover at 3 s,
// titles.json (3 titles ≤ 60 chars + description). Outputs are also copied to episodes/<slug>/.
import path from "node:path";
import { copyFileSync, existsSync, rmSync, statSync } from "node:fs";
import { OUT, episodeDir, rel } from "../lib/paths.mjs";
import { checkout } from "../lib/workspace.mjs";
import { cover, phoneCopy, probe, renderEpisode, restoreFormat, writeFormat } from "../lib/remotion-tasks.mjs";
import { StageError } from "../jobs.mjs";
import { sleep } from "../engine/replay.mjs";
import { EXAMPLE_BUILD } from "../lib/workspace.mjs";
import { EXAMPLE_DIR } from "../lib/paths.mjs";
import { makeTitles } from "./extras.mjs";

export const outputs = (slug) => {
  const d = episodeDir(slug);
  return { mp4: path.join(d, "episode.mp4"), phone: path.join(d, "episode-phone.mp4"), cover: path.join(d, "cover.png"), titles: path.join(d, "titles.json") };
};

export const run = async (ctx) => {
  const o = outputs(ctx.slug);

  if (ctx.replay) {
    ctx.activity("Replaying the cached render of “Ten Minutes Under” (no render runs)", { tool: "render" });
    const total = 3225;
    for (let f = 0; f <= total && !ctx.signal.aborted; f += 129) {
      ctx.progress((f / total) * 0.85, `Rendering frames ${f}/${total} (replay)`);
      await sleep(320, ctx.signal);
    }
    ctx.progress(0.95, "Encoding (replay)");
    await sleep(800, ctx.signal);
    ctx.checkAborted();
    copyFileSync(path.join(EXAMPLE_BUILD, "episode-phone.mp4"), o.phone);
    copyFileSync(path.join(EXAMPLE_BUILD, "episode-phone.mp4"), o.mp4); // the kit ships only the phone copy
    copyFileSync(path.join(EXAMPLE_DIR, "cover.png"), o.cover);
    ctx.artifact("video", rel(o.mp4), { replay: true });
    ctx.artifact("cover", rel(o.cover));
    await makeTitles(ctx);
    ctx.artifact("titles", rel(o.titles));
    ctx.progress(1, "Done (replay)");
    return;
  }

  checkout(ctx.slug);
  // never offer an older run's files as this run's downloads
  for (const f of [o.mp4, o.phone, o.cover, o.titles]) rmSync(f, { force: true });
  const fmt = writeFormat(ctx.project().output);
  ctx.activity(`Rendering the episode with Remotion (${fmt.width}×${fmt.height}, 30 fps)`, { tool: "render" });
  let r;
  try {
    r = await renderEpisode({ onProgress: (v, l) => ctx.progress(v, l), onCancel: ctx.onCancel });
  } finally {
    restoreFormat();
  }
  ctx.checkAborted();
  if (!r.ok) throw new StageError("render", "The render failed. The last log lines are below; press Retry.", { tail: r.tail });
  copyFileSync(r.file, o.mp4);
  const info = await probe(o.mp4);
  if (info) ctx.activity(`Rendered ${info.width}×${info.height}, ${info.fps} fps, ${info.duration?.toFixed(1)} s, audio ${info.audio ? "yes" : "NO"}`, { tool: "render" });
  if (info && !info.audio) ctx.warn("The MP4 has no audio stream.");
  ctx.update((s) => (s.stages.render.info = info));
  ctx.artifact("video", rel(o.mp4));

  ctx.activity("Making the phone copy", { tool: "render" });
  const ph = await phoneCopy({ onCancel: ctx.onCancel });
  if (ph.ok) {
    copyFileSync(ph.file, o.phone);
    ctx.artifact("phone", rel(o.phone), { mb: Math.round(ph.mb * 10) / 10 });
    if (ph.mb > 30) ctx.warn(`The phone copy is ${ph.mb.toFixed(1)} MB (target under 30 MB); some apps may reject it.`);
  } else ctx.warn(`Phone copy failed: ${ph.tail.slice(-1)[0] ?? ""}`);

  const cv = await cover({ input: o.mp4, out: path.join(OUT, "cover.png") });
  if (cv.ok) {
    copyFileSync(cv.file, o.cover);
    ctx.artifact("cover", rel(o.cover));
  } else ctx.warn("Cover extraction failed.");

  try {
    ctx.activity("Writing titles", { tool: "titles" });
    await makeTitles(ctx);
    ctx.artifact("titles", rel(o.titles));
  } catch (e) {
    ctx.warn(`Titles skipped: ${e.message}`);
  }
  ctx.progress(1, "Done");
};

export const sizeMb = (f) => (existsSync(f) ? Math.round((statSync(f).size / 1e6) * 10) / 10 : null);
