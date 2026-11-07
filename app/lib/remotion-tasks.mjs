// Mechanical Remotion runs (same commands as package.json scripts, invoked through node directly so they
// work without sh/swift on every platform): storyboard, render, phone copy, cover, ffprobe, typecheck.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OUT, ROOT } from "./paths.mjs";
import { contactSheet } from "./png.mjs";
import { remotion, tsc } from "./proc.mjs";

const progressOf = (line) => {
  const m = /(Rendered|Encoded|Stitched)\s+(\d+)\s*\/\s*(\d+)/i.exec(line);
  return m ? { phase: m[1].toLowerCase(), done: Number(m[2]), total: Number(m[3]) } : null;
};
export const parseProgress = progressOf;

// --- output size: src/format.json is read by src/Root.tsx for the Episode composition ---
export const DEFAULT_FORMAT = { width: 1080, height: 1920 };
export const FORMAT_FILE = path.join(ROOT, "src", "format.json");

// Valid even integer dimensions, else the 9:16 default (old projects have no `output`).
export const normalizeFormat = (o) => {
  const ok = (n) => Number.isInteger(n) && n >= 2 && n <= 8192;
  if (!o || !ok(o.width) || !ok(o.height)) return { ...DEFAULT_FORMAT };
  return { width: o.width - (o.width % 2), height: o.height - (o.height % 2) };
};
export const writeFormat = (o, file = FORMAT_FILE) => {
  const f = normalizeFormat(o);
  writeFileSync(file, JSON.stringify(f) + "\n");
  return f;
};
export const restoreFormat = (file = FORMAT_FILE) => writeFormat(DEFAULT_FORMAT, file);
export const readFormat = (file = FORMAT_FILE) => {
  try { return normalizeFormat(JSON.parse(readFileSync(file, "utf8"))); } catch { return { ...DEFAULT_FORMAT }; }
};
// Phone-copy size: long side at most 1920, aspect kept, even dimensions.
export const phoneSize = ({ width, height }, max = 1920) => {
  const k = Math.min(1, max / Math.max(width, height));
  const even = (n) => Math.max(2, Math.round((n * k) / 2) * 2);
  return { width: even(width), height: even(height) };
};

export const typecheck = async ({ onCancel } = {}) => {
  const p = tsc(["--noEmit", "-p", path.join(ROOT, "tsconfig.json")], { keep: 60, timeoutMs: 5 * 60 * 1000 });
  onCancel?.(p.kill);
  const r = await p.done;
  return { ok: r.code === 0, errors: r.tail.filter((l) => /error TS\d+/.test(l)).slice(0, 25), tail: r.tail.slice(-25) };
};

// One still per shot (Storyboard composition, frame k = shot k at 70 %), then a 6-wide contact sheet.
export const storyboard = async (shotCount, { onProgress, onCancel, dir = path.join(OUT, "storyboard"), sheet = path.join(OUT, "storyboard.png") } = {}) => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const p = remotion(
    ["render", "src/index.ts", "Storyboard", dir, "--sequence", `--frames=0-${shotCount - 1}`, "--image-format=png", "--scale=0.25", "--log=info"],
    { keep: 30, timeoutMs: 15 * 60 * 1000, onLine: (l) => { const pr = progressOf(l); if (pr) onProgress?.(pr.done / Math.max(1, pr.total), `Rendering stills ${pr.done}/${pr.total}`); } },
  );
  onCancel?.(p.kill);
  const r = await p.done;
  const stills = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).sort((a, b) => Number(a.match(/(\d+)\.png$/)?.[1] ?? 0) - Number(b.match(/(\d+)\.png$/)?.[1] ?? 0)) : [];
  if (r.code !== 0 || !stills.length) return { ok: false, tail: r.tail.slice(-15), stills: [] };
  const info = contactSheet(stills.map((f) => path.join(dir, f)), sheet, 6);
  return { ok: true, stills: stills.map((f) => path.join(dir, f)), sheet, ...info };
};

export const renderEpisode = async ({ onProgress, onCancel, out = path.join(OUT, "episode.mp4") } = {}) => {
  const p = remotion(["render", "src/index.ts", "Episode", out, "--log=info"], {
    keep: 40,
    timeoutMs: 60 * 60 * 1000,
    onLine: (l) => {
      const pr = progressOf(l);
      if (!pr) return;
      // rendering is ~85 % of the wall time, encoding the rest
      const f = pr.done / Math.max(1, pr.total);
      onProgress?.(pr.phase === "rendered" ? f * 0.85 : 0.85 + f * 0.15, `${pr.phase === "rendered" ? "Rendering frames" : "Encoding"} ${pr.done}/${pr.total}`);
    },
  });
  onCancel?.(p.kill);
  const r = await p.done;
  return { ok: r.code === 0 && existsSync(out), tail: r.tail.slice(-15), file: out };
};

// Same arguments as `npm run phone`.
export const phoneCopy = async ({ onCancel, input = path.join(OUT, "episode.mp4"), out = path.join(OUT, "episode-phone.mp4") } = {}) => {
  const p = remotion(["ffmpeg", "-y", "-i", input, "-vf", "scale='if(gte(iw,ih),min(iw,1920),-2)':'if(gte(iw,ih),-2,min(ih,1920))'", "-c:v", "libx264", "-crf", "26", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], { keep: 15, timeoutMs: 20 * 60 * 1000 });
  onCancel?.(p.kill);
  const r = await p.done;
  return { ok: r.code === 0 && existsSync(out), tail: r.tail.slice(-10), file: out, mb: existsSync(out) ? statSync(out).size / 1e6 : 0 };
};

export const cover = async ({ input = path.join(OUT, "episode.mp4"), out = path.join(OUT, "cover.png"), at = 3 } = {}) => {
  const r = await remotion(["ffmpeg", "-y", "-ss", String(at), "-i", input, "-frames:v", "1", out], { keep: 10, timeoutMs: 60000 }).done;
  return { ok: r.code === 0 && existsSync(out), file: out, tail: r.tail.slice(-5) };
};

export const duration = async (file) => {
  const r = await remotion(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { keep: 5, timeoutMs: 30000 }).done;
  const n = Number.parseFloat(r.out.trim().split(/\s+/).find((s) => /^\d+(\.\d+)?$/.test(s)) ?? "");
  return Number.isFinite(n) ? n : null;
};

export const probe = async (file) => {
  const r = await remotion(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", file], { keep: 5, timeoutMs: 30000 }).done;
  try {
    const j = JSON.parse(r.out.slice(r.out.indexOf("{")));
    const v = j.streams.find((s) => s.codec_type === "video");
    return { width: v?.width, height: v?.height, fps: v?.r_frame_rate, audio: j.streams.some((s) => s.codec_type === "audio"), duration: Number(j.format?.duration) };
  } catch {
    return null;
  }
};

// Convert any audio file to the voice clip format (mp3 44.1 kHz 128k).
export const toMp3 = async (input, out) => {
  const r = await remotion(["ffmpeg", "-y", "-i", input, "-ar", "44100", "-b:a", "128k", out], { keep: 10, timeoutMs: 60000 }).done;
  return r.code === 0 && existsSync(out);
};
