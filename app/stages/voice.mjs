// Stage 4 — Voice (server, no Claude): one ElevenLabs call per line of lines.json with previous/next
// text stitching, eleven_v4 (falls back to eleven_multilingual_v2 on a model error), stability 0.5,
// similarity 0.75, mp3_44100_128. Clips are measured with ffprobe and src/audio.json is rewritten in the
// existing format { "voice": { "0": 4.31, ... }, "sfx": {} } so the timeline re-times from it.
// No key → a clearly labelled placeholder voice from the OS speech engine (macOS `say`, Windows SAPI).
import path from "node:path";
import os from "node:os";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AUDIO_JSON, VOICE_DIR, episodeDir, rel } from "../lib/paths.mjs";
import { readJson, writeJson } from "../lib/store.mjs";
import { checkout, saveCurrent, EXAMPLE_BUILD } from "../lib/workspace.mjs";
import { createHash } from "node:crypto";
import { duration, toMp3 } from "../lib/remotion-tasks.mjs";
import { elevenKey, redact } from "../lib/secrets.mjs";
import { run as runProc, isWin } from "../lib/proc.mjs";
import { childEnv } from "../lib/env.mjs";
import { StageError } from "../jobs.mjs";
import { sleep } from "../engine/replay.mjs";
import { files as scriptFiles } from "./script.mjs";

// The skill's voice IDs (elevenlabs-text-to-speech/SKILL.md) + a custom field in the UI.
export const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", note: "male, narrative" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", note: "male, authoritative" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", note: "female, soft" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", note: "female, conversational" },
];
export const MODEL = "eleven_v4";
export const FALLBACK_MODEL = "eleven_multilingual_v2";
export const SETTINGS = { stability: 0.5, similarityBoost: 0.75 };
export const FORMAT = "mp3_44100_128";

const friendly = (e) => {
  const code = e?.statusCode;
  const body = JSON.stringify(e?.body ?? "");
  // quota first: ElevenLabs can report "quota_exceeded" with a 401, which is not a bad key
  if (/quota|credits|character_limit/i.test(body)) return new StageError("eleven_quota", "Your ElevenLabs plan is out of characters for this period. Clips already made are kept.");
  if (code === 401) return new StageError("eleven_key", "ElevenLabs rejected the API key. Check it and try again, or use the placeholder voice.");
  if (code === 429) return new StageError("rate_limit", "ElevenLabs is rate-limiting this key. Wait a minute and run the voice again; finished lines are not re-billed.");
  if (code === 404 || /voice_not_found/i.test(body)) return new StageError("eleven_voice", "ElevenLabs could not find that voice ID.");
  return new StageError("eleven_error", redact(`ElevenLabs error${code ? ` ${code}` : ""}: ${e?.message ?? e}`).slice(0, 300));
};
const isModelError = (e) => [400, 422].includes(e?.statusCode) && /model/i.test(JSON.stringify(e?.body ?? e?.message ?? ""));

export const placeholderEngine = () => (process.platform === "darwin" ? "say" : isWin ? "windows-sapi" : "espeak");

// OS text-to-speech → wav/aiff → mp3. Text goes through a temp file (never interpolated into a command).
const speakPlaceholder = async (text, outMp3, tmp, i) => {
  const txt = path.join(tmp, `line-${i}.txt`);
  writeFileSync(txt, text, "utf8");
  let raw;
  let r;
  if (process.platform === "darwin") {
    raw = path.join(tmp, `line-${i}.aiff`);
    r = await runProc("say", ["-r", "175", "-o", raw, "-f", txt], { timeoutMs: 60000 }).done;
  } else if (isWin) {
    raw = path.join(tmp, `line-${i}.wav`);
    const ps = "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.SetOutputToWaveFile($env:STUDIO_TTS_OUT); $s.Speak([IO.File]::ReadAllText($env:STUDIO_TTS_IN)); $s.Dispose()";
    r = await runProc("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { env: { ...childEnv(), STUDIO_TTS_IN: txt, STUDIO_TTS_OUT: raw }, timeoutMs: 60000 }).done;
  } else {
    raw = path.join(tmp, `line-${i}.wav`);
    r = await runProc("espeak-ng", ["-w", raw, "-f", txt], { timeoutMs: 60000 }).done;
    if (r.code !== 0) r = await runProc("espeak", ["-w", raw, "-f", txt], { timeoutMs: 60000 }).done;
  }
  if (r.code !== 0 || !existsSync(raw)) throw new StageError("placeholder_voice", `The placeholder voice (${placeholderEngine()}) failed: ${r.tail.slice(-2).join(" ")}`);
  if (!(await toMp3(raw, outMp3))) throw new StageError("placeholder_voice", "Could not convert the placeholder voice to MP3.");
};

export const freePlan = async (client) => {
  try {
    const sub = await client.user.subscription.get();
    return { tier: sub?.tier ?? null, credit: !sub?.tier || /free/i.test(sub.tier) };
  } catch {
    return { tier: null, credit: true }; // unknown (key without user_read): show the reminder anyway
  }
};

const publish = (ctx, n, durations) => {
  const ep = path.join(episodeDir(ctx.slug), "voice");
  rmSync(ep, { recursive: true, force: true });
  mkdirSync(ep, { recursive: true });
  for (let i = 0; i < n; i++) if (existsSync(path.join(VOICE_DIR, `line-${i}.mp3`))) copyFileSync(path.join(VOICE_DIR, `line-${i}.mp3`), path.join(ep, `line-${i}.mp3`));
  writeJson(path.join(episodeDir(ctx.slug), "audio.json"), { voice: durations, sfx: {} });
};

export const run = async (ctx) => {
  const lines = readJson(scriptFiles(ctx.slug).lines);
  if (!Array.isArray(lines)) throw new StageError("missing_input", "Approve the script first.");
  const provider = ctx.opts.provider === "placeholder" || (!elevenKey() && !ctx.replay) ? "placeholder" : "elevenlabs";
  const voiceId = String(ctx.opts.voiceId || VOICES[0].id).replace(/[^A-Za-z0-9]/g, "").slice(0, 40);

  if (ctx.replay) {
    const audio = readJson(path.join(EXAMPLE_BUILD, "audio.json"));
    const dir = path.join(episodeDir(ctx.slug), "voice");
    mkdirSync(dir, { recursive: true });
    ctx.activity("Replaying the recorded ElevenLabs voice (no API call)", { tool: "voice" });
    for (let i = 0; i < lines.length; i++) {
      ctx.checkAborted();
      await sleep(420, ctx.signal);
      copyFileSync(path.join(EXAMPLE_BUILD, "voice", `line-${i}.mp3`), path.join(dir, `line-${i}.mp3`));
      ctx.progress((i + 1) / lines.length, `Line ${i + 1}/${lines.length}`);
      ctx.artifact("voice-line", rel(path.join(dir, `line-${i}.mp3`)), { index: i, seconds: audio.voice[i] });
    }
    writeJson(path.join(episodeDir(ctx.slug), "audio.json"), audio);
    ctx.update((s) => (s.voice = { voiceId: VOICES[0].id, provider: "elevenlabs (recorded)", model: MODEL, credit: true, tier: null }));
    return;
  }

  checkout(ctx.slug);
  // Clips are cached per line (engine + voice + text + neighbours used for stitching). Resuming after a
  // rate limit or quota stop only pays for the lines that are still missing or changed.
  for (const f of readdirSync(VOICE_DIR).filter((f) => /^line-(\d+)\.mp3$/.test(f) && Number(f.slice(5, -4)) >= lines.length)) rmSync(path.join(VOICE_DIR, f));
  const cacheFile = path.join(episodeDir(ctx.slug), "voice-cache.json");
  const cache = readJson(cacheFile) ?? {};
  const keyFor = (i, engine) => createHash("sha1").update(JSON.stringify([engine, voiceId, lines[i].text, lines[i - 1]?.text ?? null, lines[i + 1]?.text ?? null])).digest("hex");
  const cached = (i, key) => (cache[i]?.key === key && existsSync(path.join(VOICE_DIR, `line-${i}.mp3`)) ? cache[i].seconds : null);
  const remember = (i, key, seconds) => { cache[i] = { key, seconds }; writeJson(cacheFile, cache); };
  const durations = {};
  let model = MODEL;
  let tier = null;
  let credit = false;
  let reused = 0;

  if (provider === "elevenlabs") {
    const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");
    const client = new ElevenLabsClient({ apiKey: elevenKey() });
    ({ tier, credit } = await freePlan(client));
    ctx.activity(`ElevenLabs voice ${voiceId}, model ${model}${tier ? `, plan ${tier}` : ""}`, { tool: "voice" });
    const convert = async (m, body) => {
      try {
        return await client.textToSpeech.convert(voiceId, body(m));
      } catch (e) {
        if (e?.statusCode !== 429) throw e;
        ctx.activity("ElevenLabs asked to slow down; retrying in 5 s", { level: "warn" });
        await new Promise((r) => setTimeout(r, 5000));
        return client.textToSpeech.convert(voiceId, body(m)); // a second 429 surfaces as "paused"
      }
    };
    for (let i = 0; i < lines.length; i++) {
      ctx.checkAborted();
      const out = path.join(VOICE_DIR, `line-${i}.mp3`);
      const key = keyFor(i, `eleven:${model}`);
      const hit = cached(i, key);
      if (hit) {
        durations[i] = hit;
        reused++;
        ctx.progress((i + 1) / lines.length, `Line ${i + 1}/${lines.length} (already made)`);
        ctx.artifact("voice-line", rel(out), { index: i, seconds: hit });
        continue;
      }
      const req = (m) => ({
        text: lines[i].text,
        modelId: m,
        outputFormat: FORMAT,
        voiceSettings: SETTINGS,
        ...(i > 0 ? { previousText: lines[i - 1].text } : {}),
        ...(i < lines.length - 1 ? { nextText: lines[i + 1].text } : {}),
      });
      let audio;
      try {
        audio = await convert(model, req);
      } catch (e) {
        if (model === MODEL && isModelError(e)) {
          model = FALLBACK_MODEL;
          ctx.warn(`${MODEL} was not accepted for this key; using ${FALLBACK_MODEL}.`);
          try { audio = await convert(model, req); } catch (e2) { throw friendly(e2); }
        } else throw friendly(e);
      }
      await pipeline(Readable.fromWeb(audio), createWriteStream(out));
      durations[i] = Math.round(((await duration(out)) ?? 0) * 100) / 100;
      if (durations[i]) remember(i, keyFor(i, `eleven:${model}`), durations[i]);
      ctx.progress((i + 1) / lines.length, `Line ${i + 1}/${lines.length}`);
      ctx.artifact("voice-line", rel(out), { index: i, seconds: durations[i] });
    }
  } else {
    model = placeholderEngine();
    credit = false;
    ctx.activity(`No ElevenLabs key — generating a PLACEHOLDER voice with ${model}`, { tool: "voice", level: "warn" });
    const tmp = mkdtempSync(path.join(os.tmpdir(), "studio-voice-"));
    try {
      for (let i = 0; i < lines.length; i++) {
        ctx.checkAborted();
        const out = path.join(VOICE_DIR, `line-${i}.mp3`);
        const key = keyFor(i, `placeholder:${model}`);
        const hit = cached(i, key);
        if (hit) { durations[i] = hit; reused++; ctx.artifact("voice-line", rel(out), { index: i, seconds: hit }); continue; }
        await speakPlaceholder(lines[i].text, out, tmp, i);
        durations[i] = Math.round(((await duration(out)) ?? 0) * 100) / 100;
        if (durations[i]) remember(i, key, durations[i]);
        ctx.progress((i + 1) / lines.length, `Line ${i + 1}/${lines.length} (placeholder)`);
        ctx.artifact("voice-line", rel(out), { index: i, seconds: durations[i] });
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  const missing = lines.map((_, i) => i).filter((i) => !durations[i]);
  if (missing.length) throw new StageError("voice_measure", `Could not measure clip(s) ${missing.join(", ")}.`);
  writeFileSync(AUDIO_JSON, JSON.stringify({ voice: Object.fromEntries(Object.entries(durations).map(([k, v]) => [String(k), v])), sfx: {} }, null, 2) + "\n");
  saveCurrent();
  publish(ctx, lines.length, durations);
  const total = Object.values(durations).reduce((a, b) => a + b, 0);
  ctx.activity(`Voice ready: ${lines.length} clips${reused ? ` (${reused} reused, not re-billed)` : ""}, ${total.toFixed(1)} s; src/audio.json updated`, { tool: "voice" });
  ctx.update((s) => (s.voice = { voiceId: provider === "elevenlabs" ? voiceId : null, provider, model, credit, tier, seconds: Math.round(total * 10) / 10 }));
};

export const clipsFor = (slug) => {
  const dir = path.join(episodeDir(slug), "voice");
  return existsSync(dir) ? readdirSync(dir).filter((f) => /^line-\d+\.mp3$/.test(f)).length : 0;
};
