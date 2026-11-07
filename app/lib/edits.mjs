// Frame + timing edits (build/edits.json -> src/edits.json): validation and the raw-shot summary for the editor.
import path from "node:path";
import { existsSync } from "node:fs";
import { episodeDir } from "./paths.mjs";
import { readJson, writeJson } from "./store.mjs";
import { applyEditsTs, catalogScenes, loadShots, safetyIssues, validateShots } from "./validate.mjs";
import { computeTiming } from "./timing.mjs";

export const summarizeRaw = (SHOTS) =>
  SHOTS.map((s, base) => ({ base, id: s.id ?? null, line: s.line, scene: s.scene, zoom: s.from?.zoom ?? 1, text: (s.events ?? []).find((e) => e.kind === "stamp")?.text ?? null, weight: s.weight ?? 1 }));

export const rawFile = (slug) => path.join(episodeDir(slug), "rawshots.json");
export const buildShotsFile = (slug) => path.join(episodeDir(slug), "build", "shots.ts");
export const editsFile = (slug) => path.join(episodeDir(slug), "build", "edits.json");

export const ensureRawShots = async (slug) => {
  if (existsSync(rawFile(slug)) || !existsSync(buildShotsFile(slug))) return;
  try { writeJson(rawFile(slug), summarizeRaw((await loadShots(buildShotsFile(slug))).SHOTS)); } catch { /* shown as no editor */ }
};

const num = (v) => typeof v === "number" && Number.isFinite(v);

// Returns { errors, edits } (edits = cleaned copy, null stays null).
export const checkEdits = (edits, { rawCount, lineCount }) => {
  if (edits === null || edits === undefined) return { errors: [], edits: null };
  const errors = [];
  if (typeof edits !== "object" || Array.isArray(edits)) return { errors: ["edits must be an object or null"], edits: null };
  const scenes = new Set(catalogScenes());
  const clean = {};
  if (edits.shots !== undefined) {
    if (!Array.isArray(edits.shots)) errors.push("edits.shots must be a list");
    else {
      clean.shots = edits.shots.map((e, k) => {
        const o = { base: e?.base };
        if (!Number.isInteger(e?.base) || e.base < 0 || e.base >= rawCount) errors.push(`shot ${k}: base ${e?.base} is not a shot of this episode`);
        if (e?.line !== undefined) { if (!Number.isInteger(e.line) || e.line < 0 || e.line >= lineCount) errors.push(`shot ${k}: line ${e.line} does not exist`); else o.line = e.line; }
        if (e?.scene !== undefined) { if (!scenes.has(e.scene)) errors.push(`shot ${k}: unknown scene "${e.scene}"`); else o.scene = e.scene; }
        if (e?.zoom !== undefined) { if (!num(e.zoom) || e.zoom < 0.5 || e.zoom > 3) errors.push(`shot ${k}: zoom must be 0.5-3`); else o.zoom = e.zoom; }
        if (e?.text !== undefined) {
          if (typeof e.text !== "string" || e.text.length > 60) errors.push(`shot ${k}: text must be at most 60 characters`);
          else if (safetyIssues(e.text).length) errors.push(`shot ${k}: text touches ${safetyIssues(e.text).join(", ")}`);
          else o.text = e.text;
        }
        if (e?.sec !== undefined) { if (!num(e.sec) || e.sec < 0.5 || e.sec > 30) errors.push(`shot ${k}: sec must be 0.5-30`); else o.sec = e.sec; }
        return o;
      });
    }
  }
  if (edits.lines !== undefined) {
    if (!edits.lines || typeof edits.lines !== "object" || Array.isArray(edits.lines)) errors.push("edits.lines must be an object");
    else {
      clean.lines = {};
      for (const [k, v] of Object.entries(edits.lines)) {
        if (!/^\d+$/.test(k) || Number(k) >= lineCount) errors.push(`lines: line ${k} does not exist`);
        else if (!num(v?.sec) || v.sec < 0.5 || v.sec > 60) errors.push(`line ${k}: sec must be 0.5-60`);
        else clean.lines[k] = { sec: v.sec };
      }
    }
  }
  return { errors, edits: clean };
};

// Full validation incl. validateShots on the applied result. Returns { errors, edits, applied }.
export const validateEdits = async (edits, { raw, lines }) => {
  const c = checkEdits(edits, { rawCount: raw.length, lineCount: lines.length });
  if (c.errors.length) return c;
  const applied = await applyEditsTs(raw, c.edits);
  const errors = c.edits?.shots ? validateShots({ LINES: lines, SHOTS: applied }, lines) : [];
  return { errors, edits: c.edits, applied };
};

export const timingFor = (slug) => {
  const d = episodeDir(slug);
  const lines = readJson(path.join(d, "lines.json"));
  const raw = readJson(rawFile(slug));
  if (!Array.isArray(lines) || !Array.isArray(raw)) return null;
  return computeTiming({ lines, audio: readJson(path.join(d, "audio.json"), { voice: {} }), shots: raw, edits: readJson(editsFile(slug), null) });
};
