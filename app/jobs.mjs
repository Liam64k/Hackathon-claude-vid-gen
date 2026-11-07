// Job runner: one stage job at a time, cancel/pause, gates, usage, recording, friendly errors.
import * as bus from "./lib/bus.mjs";
import * as store from "./lib/store.mjs";
import * as usage from "./lib/usage.mjs";
import { claudeCli } from "./engine/claude.mjs";
import { replay, createRecorder } from "./engine/replay.mjs";
import { SYSTEM } from "./stages/prompts.mjs";

export const MODE = process.env.STUDIO_MODE === "replay" || process.argv.includes("--replay") ? "replay" : "live";

export class StageError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

// Provider interface { run(stage, prompt, opts) -> { events: AsyncIterable, cancel() } }.
// "anthropic-api-key" is documented in app/engine/index.mjs as a stub only (not built).
const providerFor = (mode) => (mode === "replay" ? replay : claudeCli);

let job = null;
export const current = () => (job ? { slug: job.slug, stage: job.stage, startedAt: job.startedAt, mode: job.mode } : null);

const STAGE_MODULES = {};
export const registerStage = (id, mod) => (STAGE_MODULES[id] = mod);

const needApproved = { ideas: [], script: ["ideas"], shots: ["ideas", "script"], voice: ["ideas", "script", "shots"], render: ["ideas", "script", "shots", "voice"] };

export const startStage = (slug, stage, opts = {}) => {
  if (job) throw Object.assign(new Error(`Studio is busy with ${job.stage} for another step. Wait for it or stop it first.`), { status: 409 });
  const mod = STAGE_MODULES[stage];
  if (!mod) throw Object.assign(new Error(`Unknown stage ${stage}`), { status: 404 });
  const project = store.load(slug);
  if (!project) throw Object.assign(new Error(`No project ${slug}`), { status: 404 });
  for (const p of needApproved[stage]) if (project.stages[p].status !== "approved") throw Object.assign(new Error(`Approve ${store.STAGE_LABELS[p]} first.`), { status: 409 });
  // A replay project never runs under the Live pill, and a live project never runs in Replay.
  const mode = MODE;
  if ((project.mode ?? "live") !== mode) throw Object.assign(new Error(`This project was made in ${project.mode} mode; Studio is running in ${MODE} mode.`), { status: 409 });

  const ac = new AbortController();
  const cancels = [];
  // Claim the job slot only once the state write succeeded (a failed write must not leave Studio "busy").
  store.update(slug, (s) => {
    const prevSession = s.stages[stage].sessionId;
    // Re-running a stage invalidates everything after it.
    const i = store.STAGES.indexOf(stage);
    for (const later of store.STAGES.slice(i + 1)) if (s.stages[later].status !== "idle") s.stages[later] = { ...store.blankStage(), cost: s.stages[later].cost };
    const st = s.stages[stage];
    Object.assign(st, { status: "running", startedAt: new Date().toISOString(), endedAt: null, error: null, warnings: [], attempts: (st.attempts ?? 0) + 1 });
    if (!opts.resume) st.sessionId = null;
    else st.sessionId = prevSession;
  });
  job = { slug, stage, mode, startedAt: Date.now(), ac, cancels };
  bus.send("stage", { slug, stage, status: "running" });

  const ctx = makeCtx({ slug, stage, mode, opts, ac, cancels });
  (async () => {
    try {
      await mod.run(ctx);
      if (ac.signal.aborted) throw new StageError("cancelled", "Stopped. Partial files were kept; press Resume to continue.");
      const s = store.update(slug, (s) => Object.assign(s.stages[stage], { status: "review", endedAt: new Date().toISOString(), error: null }));
      bus.send("stage", { slug, stage, status: "review" });
      bus.send("gate", { slug, stage, warnings: s.stages[stage].warnings });
    } catch (e) {
      const code = e.code ?? "error";
      const paused = ["cancelled", "rate_limit", "budget", "timeout"].includes(code);
      const status = paused ? "paused" : "error";
      try {
        store.update(slug, (s) => Object.assign(s.stages[stage], { status, endedAt: new Date().toISOString(), error: { code, message: e.message, tail: e.tail ?? null, resetsAt: e.resetsAt ?? null } }));
      } catch (writeErr) {
        console.error(`[${stage}] could not save the error state:`, writeErr.message);
      }
      bus.send("stage", { slug, stage, status });
      bus.send("error", { slug, stage, code, message: e.message, tail: e.tail ?? null, resetsAt: e.resetsAt ?? null });
      if (!(e instanceof StageError)) console.error(`[${stage}]`, e);
    } finally {
      job = null;
    }
  })().catch((e) => { job = null; console.error(`[${stage}] runner failed:`, e); });
  return store.load(slug);
};

// A side task (e.g. "verify" facts) that uses Claude but does not move the stage gates. Its events are
// tagged with a stage so the right screen shows them; its cost is added to that stage.
export const startTask = (slug, task, stage, fn) => {
  if (job) throw Object.assign(new Error(`Studio is busy with ${job.stage}. Wait for it or stop it first.`), { status: 409 });
  const project = store.load(slug);
  if (!project) throw Object.assign(new Error(`No project ${slug}`), { status: 404 });
  const mode = MODE;
  if ((project.mode ?? "live") !== mode) throw Object.assign(new Error(`This project was made in ${project.mode} mode; Studio is running in ${MODE} mode.`), { status: 409 });
  const ac = new AbortController();
  const cancels = [];
  job = { slug, stage: task, mode, startedAt: Date.now(), ac, cancels };
  const ctx = makeCtx({ slug, stage, mode, opts: {}, ac, cancels, task });
  bus.send("task", { slug, stage, task, status: "running" });
  (async () => {
    try {
      await fn(ctx);
      bus.send("task", { slug, stage, task, status: "done" });
    } catch (e) {
      bus.send("task", { slug, stage, task, status: "error" });
      bus.send("error", { slug, stage, code: e.code ?? "error", message: e.message });
    } finally {
      job = null;
    }
  })().catch((e) => { job = null; console.error(`[${task}] task failed:`, e); });
};

export const cancel = (slug) => {
  if (!job || (slug && job.slug !== slug)) return false;
  job.ac.abort();
  for (const fn of job.cancels) try { fn(); } catch { /* ignore */ }
  bus.send("activity", { slug: job.slug, stage: job.stage, text: "Stopping…", level: "warn" });
  return true;
};

function makeCtx({ slug, stage, mode, opts, ac, cancels, task = null }) {
  const emit = (type, data = {}) => bus.send(type, { slug, stage, ...data });
  const ctx = {
    slug, stage, mode, opts, signal: ac.signal,
    replay: mode === "replay",
    project: () => store.load(slug),
    update: (fn) => store.update(slug, fn),
    emit,
    activity: (text, extra = {}) => emit("activity", { text, ...extra }),
    progress: (value, label) => emit("progress", { value, label }),
    artifact: (name, path, extra = {}) => emit("artifact", { name, path, ...extra }),
    warn: (text) => { store.update(slug, (s) => s.stages[stage].warnings.push(text)); emit("activity", { text, level: "warn" }); },
    onCancel: (fn) => cancels.push(fn),
    checkAborted: () => { if (ac.signal.aborted) throw new StageError("cancelled", "Stopped. Partial files were kept; press Resume to continue."); },

    // Run Claude (or its replay) for this stage. Returns the result event; throws StageError on failure.
    async claude(spec) {
      ctx.checkAborted();
      const provider = providerFor(mode);
      const label = spec.replayAs ?? stage;
      const rec = mode === "live" ? createRecorder(label, slug) : { add() {}, save() {} };
      const handle = provider.run(label, spec.prompt, { ...spec, slug, systemPrompt: [SYSTEM, spec.system].filter(Boolean).join("\n\n") });
      cancels.push(() => handle.cancel());
      let result = null;
      let text = "";
      let lastTool = null;
      const flush = () => { const t = text.trim(); if (t) emit("log", { text: t.slice(0, 400) }); text = ""; };
      try {
      for await (const ev of handle.events) {
        rec.add(ev);
        switch (ev.type) {
          case "init":
            if (ev.sessionId && mode === "live" && !task) store.update(slug, (s) => (s.stages[stage].sessionId = ev.sessionId));
            emit("activity", { text: ev.replay ? `Replaying recorded ${label} run (no Claude call)` : `Claude started (${ev.model})`, tool: "init" });
            if (ev.apiKeySource && ev.apiKeySource !== "none") ctx.warn(`Claude reported an API-key credential source (${ev.apiKeySource}); Studio expects the subscription login.`);
            break;
          case "activity":
            lastTool = ev.tool;
            flush();
            emit("activity", { text: ev.text, tool: ev.tool, sub: ev.sub });
            spec.onActivity?.(ev);
            break;
          case "text":
            text += ev.delta;
            if (/\n/.test(ev.delta) || text.length > 300) flush();
            break;
          case "structured_partial":
            spec.onPartial?.(ev.json);
            break;
          case "denied":
            emit("activity", { text: `Blocked tool: ${ev.tool} (not allowed in the ${store.STAGE_LABELS[stage] ?? stage} stage)`, level: "warn" });
            break;
          case "thinking":
            if (lastTool !== "thinking") emit("activity", { text: spec.thinkingText ?? "Thinking…", tool: "thinking" });
            lastTool = "thinking";
            break;
          case "tool_stream": {
            const verb = ev.tool === "Edit" || ev.tool === "MultiEdit" ? "editing" : ev.tool === "Write" ? "writing" : `preparing ${ev.tool}`;
            emit("now", { text: `Claude is ${verb}${ev.file ? ` ${ev.file}` : ""} · ${Math.round(ev.bytes / 1024)} KB so far` });
            break;
          }
          case "tool_error":
            break;
          case "rate": {
            const r = usage.setRate(ev);
            emit("usage", { usage: usage.get(), rate: r });
            break;
          }
          case "result":
            result = ev;
            break;
          case "log":
            break;
        }
      }
      } finally {
        // anything thrown while handling events must not leave a Claude process running unattended
        if (!result) handle.cancel();
      }
      flush();
      // keep the recording of a clean first run; failed, cancelled and repair runs never overwrite it
      if (result?.ok && !spec.resume) rec.save();
      const cost = Number(result?.cost ?? 0);
      if (mode === "live") {
        usage.addRun(cost);
        store.update(slug, (s) => {
          s.stages[stage].cost = Math.round(((s.stages[stage].cost ?? 0) + cost) * 10000) / 10000;
          if (result?.sessionId && !task) s.stages[stage].sessionId = result.sessionId;
        });
      }
      emit("cost", { cost, replay: mode === "replay", recordedCost: result?.recordedCost ?? null, usage: usage.get() });
      if (!result) throw new StageError("crashed", "Claude stopped without a result.");
      if (result.denials?.length) {
        const list = [...new Set(result.denials.map((d) => `${d.tool}${d.input?.command ? ` (${String(d.input.command).slice(0, 60)})` : ""}`))].join(", ");
        ctx.warn(`Claude tried tools this stage does not allow: ${list}.`);
        if (spec.denialsFatal) throw new StageError("denied", `The ${store.STAGE_LABELS[stage]} stage needed a tool it is not allowed to use: ${list}.`);
      }
      if (!result.ok) {
        const e = result.error ?? { code: "claude_error", message: "Claude reported an error." };
        const rate = usage.get().rate;
        throw new StageError(e.code, e.message, { resetsAt: e.code === "rate_limit" ? rate?.resetsAt ?? null : null });
      }
      return result;
    },
  };
  return ctx;
}
