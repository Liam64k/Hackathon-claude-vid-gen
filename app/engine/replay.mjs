// Provider "replay": plays back recorded stage runs (app/replays/<stage>.ndjson) with realistic,
// compressed timing and makes ZERO Claude calls. The stage modules copy the cached artifacts of the
// finished "Ten Minutes Under" episode. The UI always shows a "Replay" pill; nothing pretends to be live.
//
// STUDIO_RECORD=1 during a live run saves that run's activity to app/replays/<stage>.ndjson.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { REPLAYS, ROOT } from "../lib/paths.mjs";

// Max seconds a replayed Claude run takes (the whole replay demo must finish in < 2 minutes).
const CAP = { ideas: 14, script: 16, shots: 18, titles: 4, verify: 6, repair: 6 };
const speed = () => Math.max(0.05, Number(process.env.STUDIO_REPLAY_SPEED ?? 1));
export const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms / speed());
    signal?.addEventListener?.("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });

// Fallback scripts if a recording is missing (still labelled replay; same shape as a recording).
const FALLBACK = {
  ideas: [
    "Reading skill: survival-short", "Reading story-explainer-2d › survival-format.md", "Reading story-explainer-2d › premise-lists.md", "Writing results",
  ],
  script: [
    "Reading survival-short › story.md", "Reading story-explainer-2d › scene-planning.md", "Writing episodes/{slug}/script.md", "Writing episodes/{slug}/lines.json", "Writing episodes/{slug}/shotlist.md",
  ],
  shots: ["Reading src/shots.ts", "Reading src/types.ts", "Editing src/shots.ts", "Editing src/shots.ts", "Editing src/shots.ts", "Running typecheck"],
  titles: ["Writing results"],
  verify: ["Searching the web", "Opening official sources", "Writing results"],
};

export const loadRecording = (stage) => {
  const f = path.join(REPLAYS, `${stage}.ndjson`);
  if (existsSync(f)) {
    const evs = readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    if (evs.length) return { recorded: true, evs };
  }
  const steps = FALLBACK[stage] ?? ["Working"];
  const evs = steps.map((text, i) => ({ t: 1500 + i * 2200, ev: { type: "activity", tool: text.split(" ")[0], text } }));
  evs.push({ t: 1500 + steps.length * 2200, ev: { type: "result", ok: true, cost: 0 } });
  return { recorded: false, evs };
};

export const replay = {
  name: "replay",
  run(stage, _prompt, opts = {}) {
    const ac = new AbortController();
    const key = opts.replayAs ?? stage;
    const { evs, recorded } = loadRecording(key);
    const span = Math.max(1, evs[evs.length - 1]?.t ?? 1);
    const scale = Math.min(1, ((CAP[key] ?? 12) * 1000) / span);
    const slug = opts.slug ?? "replay";
    async function* events() {
      yield { type: "init", sessionId: `replay-${key}`, model: "replay", apiKeySource: "none", replay: true, recorded };
      let last = 0;
      for (const { t, ev } of evs) {
        await sleep((t - last) * scale, ac.signal);
        last = t;
        if (ac.signal.aborted) {
          yield { type: "result", ok: false, cost: 0, denials: [], error: { code: "cancelled", message: "Stopped." } };
          return;
        }
        const e = JSON.parse(JSON.stringify(ev).replaceAll("{slug}", slug));
        if (e.type === "result") {
          yield { ...e, ok: true, cost: 0, recordedCost: ev.cost ?? null, sessionId: `replay-${key}`, denials: [], error: null, replay: true };
          return;
        }
        yield e;
      }
      yield { type: "result", ok: true, cost: 0, sessionId: `replay-${key}`, denials: [], error: null, replay: true };
    }
    return { events: events(), cancel: () => ac.abort() };
  },
};

// Recorder for STUDIO_RECORD=1 (live runs only). Keeps activity + the final cost; drops streamed text
// (it is topic-specific) and never writes anything credential-like (the stream contains none).
export const createRecorder = (stage, slug) => {
  if (process.env.STUDIO_RECORD !== "1") return { add() {}, save() {} };
  const t0 = Date.now();
  const lines = [];
  const clean = (s) => s.replaceAll(ROOT.replace(/\\/g, "/"), "").replaceAll(ROOT, "").replaceAll(slug, "{slug}");
  return {
    add(ev) {
      if (!["activity", "denied", "result", "thinking"].includes(ev.type)) return;
      const keep = ev.type === "result" ? { type: "result", cost: ev.cost, durationMs: ev.durationMs, turns: ev.turns } : ev.type === "thinking" ? { type: "thinking" } : { type: ev.type, tool: ev.tool, text: clean(String(ev.text ?? "")) };
      lines.push(JSON.stringify({ t: Date.now() - t0, ev: keep }));
    },
    save() {
      if (!lines.length) return;
      mkdirSync(REPLAYS, { recursive: true });
      writeFileSync(path.join(REPLAYS, `${stage}.ndjson`), lines.join("\n") + "\n");
    },
  };
};
