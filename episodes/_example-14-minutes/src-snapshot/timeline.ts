import audio from "./audio.json";
import { LINES, SHOTS } from "./shots";
import type { Hud, Shot } from "./types";

export const FPS = 30;
const GAP = 0.3; // seconds of air after each narration line
const WORDS_PER_SEC = 2.7; // ElevenLabs pace, used until the real voice arrives

const voice = audio.voice as Record<string, number>;

export const lineSeconds = (i: number) => voice[i] ?? LINES[i].text.split(/\s+/).length / WORDS_PER_SEC;
export const hasVoice = (i: number) => voice[i] !== undefined;

export interface TimedLine {
  index: number;
  from: number;
  dur: number; // frames incl. gap
  speech: number; // frames of speech
}

let cursor = 0;
export const TIMED_LINES: TimedLine[] = LINES.map((_, index) => {
  const speech = Math.round(lineSeconds(index) * FPS);
  const dur = speech + Math.round(GAP * FPS);
  const t = { index, from: cursor, dur, speech };
  cursor += dur;
  return t;
});
export const TOTAL_FRAMES = cursor;

export interface TimedShot extends Shot {
  index: number;
  start: number;
  len: number;
  hudEnd: Hud;
  hudStart: Hud;
}

// Split each line's frames across its shots by weight, and carry HUD state forward.
const build = (): TimedShot[] => {
  const out: TimedShot[] = [];
  let hud: Hud = { phase: "countdown", impact: 14 * 60, people: 1 };
  for (const line of TIMED_LINES) {
    const shots = SHOTS.filter((s) => s.line === line.index);
    const total = shots.reduce((a, s) => a + (s.weight ?? 1), 0);
    let at = line.from;
    shots.forEach((s, k) => {
      const len = k === shots.length - 1 ? line.from + line.dur - at : Math.round((line.dur * (s.weight ?? 1)) / total);
      const hudStart = hud;
      hud = { ...hud, ...s.hud };
      out.push({ ...s, index: out.length, start: at, len, hudStart, hudEnd: hud });
      at += len;
    });
  }
  return out;
};
export const TIMED_SHOTS = build();

export const shotAt = (frame: number) =>
  TIMED_SHOTS.find((s) => frame >= s.start && frame < s.start + s.len) ?? TIMED_SHOTS[TIMED_SHOTS.length - 1];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const hudAt = (frame: number): Hud => {
  const s = shotAt(frame);
  const t = Math.min(1, (frame - s.start) / Math.max(1, s.len * 0.6));
  const a = s.hudStart;
  const b = s.hudEnd;
  const num = (k: "impact" | "hour" | "food" | "people" | "rad") => {
    const va = a[k];
    const vb = b[k];
    if (vb === undefined) return va;
    if (va === undefined || a.phase !== b.phase) return vb;
    return lerp(va, vb, t);
  };
  return { phase: b.phase, impact: num("impact"), hour: num("hour"), food: num("food"), people: num("people"), rad: num("rad") };
};

// Word timings inside a line, proportional to characters with a pause after punctuation.
export const wordTimes = (lineIndex: number) => {
  const words = LINES[lineIndex].text.split(/\s+/);
  const weights = words.map((w) => w.length + 1 + (/[.,:?!]$/.test(w) ? 4 : 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  const speech = TIMED_LINES[lineIndex].speech;
  let acc = 0;
  return words.map((w, i) => {
    const start = (acc / sum) * speech;
    acc += weights[i];
    return { word: w, start, end: (acc / sum) * speech };
  });
};
