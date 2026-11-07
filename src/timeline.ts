import audio from "./audio.json";
import { LINES, SHOTS as RAW_SHOTS } from "./shots";
import { EDITS, applyEdits } from "./edits";
const SHOTS = applyEdits(RAW_SHOTS, EDITS);
import type { Hud, Shot, World } from "./types";

export const FPS = 30;
const GAP = 0.3; // seconds of air after each narration line
const WORDS_PER_SEC = 2.6; // estimate used until the real ElevenLabs voice arrives (audio.json is empty)

const voice = audio.voice as Record<string, number>;

export const lineSeconds = (i: number) => voice[i] ?? LINES[i].text.split(/\s+/).length / WORDS_PER_SEC;
export const hasVoice = (i: number) => voice[i] !== undefined;

export interface TimedLine {
  index: number;
  from: number;
  dur: number; // frames incl. gap
  speech: number; // frames of speech
}

const GAP_F = Math.round(GAP * FPS);

// Frame layout of one line: the line is voice + gap long (or edits.lines[i].sec if set). A shot with `sec`
// gets exactly round(sec*30) frames; the others share the rest by weight (min 1 frame each). If the fixed
// shots do not fit, the line grows. If every shot is fixed and short of the line, the last shot absorbs it.
export const layoutLine = (index: number): { speech: number; dur: number; lens: number[] } => {
  const shots = SHOTS.filter((s) => s.line === index);
  const speech = Math.round(lineSeconds(index) * FPS);
  const override = EDITS?.lines?.[String(index)]?.sec;
  let dur = override !== undefined ? Math.max(1, Math.round(override * FPS)) : speech + GAP_F;
  const fixed = shots.map((s) => (s.sec !== undefined ? Math.max(1, Math.round(s.sec * FPS)) : null));
  const free = shots.filter((_, k) => fixed[k] === null);
  const fixedSum = fixed.reduce<number>((a, f) => a + (f ?? 0), 0);
  if (free.length) dur = Math.max(dur, fixedSum + free.length);
  else dur = Math.max(dur, fixedSum);
  const rest = dur - fixedSum;
  const total = free.reduce((a, s) => a + (s.weight ?? 1), 0);
  let used = 0;
  let seen = 0;
  const lens = shots.map((s, k) => {
    if (fixed[k] !== null) return fixed[k] as number;
    seen++;
    const len = seen === free.length ? rest - used : Math.max(1, Math.round((rest * (s.weight ?? 1)) / total));
    used += len;
    return len;
  });
  if (!free.length && lens.length) lens[lens.length - 1] += dur - fixedSum;
  return { speech: Math.min(speech, dur), dur, lens };
};

let cursor = 0;
export const TIMED_LINES: TimedLine[] = LINES.map((_, index) => {
  const { speech, dur } = layoutLine(index);
  const t = { index, from: cursor, dur, speech };
  cursor += dur;
  return t;
});
export const TOTAL_FRAMES = cursor;

export const WORLD0: World = { dusk: 0, crack: 0, hole: 0, freeze: 0, wet: 0 };
export const HUD0: Hud = { mode: "clock", clock: 978, ice: undefined, water: false, phase: "none", strip: false, brother: null, ghost: true };

export interface TimedShot extends Shot {
  index: number;
  start: number;
  len: number;
  hudStart: Hud;
  hudEnd: Hud;
  worldStart: World;
  worldEnd: World;
}

// Split each line's frames across its shots by weight, and carry HUD + world state forward.
const build = (): TimedShot[] => {
  const out: TimedShot[] = [];
  let hud: Hud = HUD0;
  let world: World = WORLD0;
  for (const line of TIMED_LINES) {
    const shots = SHOTS.filter((s) => s.line === line.index);
    const { lens } = layoutLine(line.index);
    let at = line.from;
    shots.forEach((s, k) => {
      const len = lens[k];
      const hudStart = hud;
      const worldStart = world;
      hud = { ...hud, ...s.hud };
      world = { ...world, ...s.world };
      out.push({ ...s, index: out.length, start: at, len, hudStart, hudEnd: hud, worldStart, worldEnd: world });
      at += len;
    });
  }
  return out;
};
export const TIMED_SHOTS = build();

export const shotAt = (frame: number) =>
  TIMED_SHOTS.find((s) => frame >= s.start && frame < s.start + s.len) ?? TIMED_SHOTS[TIMED_SHOTS.length - 1];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const hudAt = (frame: number): Hud => {
  const s = shotAt(frame);
  const t = easeOut(Math.max(0, Math.min(1, (frame - s.start) / Math.max(1, s.len * (s.hudT ?? 0.6)))));
  const a = s.hudStart;
  const b = s.hudEnd;
  const num = (k: "clock" | "timer" | "ice" | "brother"): number | null | undefined => {
    const va = a[k];
    const vb = b[k];
    if (vb === undefined || vb === null) return vb;
    if (va === undefined || va === null) return vb;
    return lerp(va, vb, t);
  };
  // the timer "mode" switches at the START of its shot, numbers ease
  return { ...b, clock: num("clock") as number, timer: num("timer") as number, ice: num("ice") as number | null, brother: num("brother") as number | null };
};

export const worldAt = (frame: number): World => {
  const s = shotAt(frame);
  const t = easeOut(Math.max(0, Math.min(1, (frame - s.start) / Math.max(1, s.len * (s.worldT ?? 0.55)))));
  const a = s.worldStart;
  const b = s.worldEnd;
  return { dusk: lerp(a.dusk, b.dusk, t), crack: lerp(a.crack, b.crack, t), hole: lerp(a.hole, b.hole, t), freeze: lerp(a.freeze, b.freeze, t), wet: lerp(a.wet, b.wet, t) };
};

// Snow clock: advances every frame except while the world is frozen (flakes stop in mid-air).
let snowAcc = 0;
const SNOW_T: number[] = [];
for (let f = 0; f < TOTAL_FRAMES; f++) {
  snowAcc += worldAt(f).freeze > 0.5 ? 0 : 1;
  SNOW_T.push(snowAcc);
}
export const snowTime = (frame: number) => SNOW_T[Math.min(frame, SNOW_T.length - 1)] ?? 0;

// ---- captions: phrases of up to 6 words, whole phrase visible, word timings inside the line ----
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

export const phrases = (lineIndex: number): number[][] => {
  const words = LINES[lineIndex].text.split(/\s+/);
  const out: number[][] = [];
  let cur: number[] = [];
  let chars = 0;
  words.forEach((w, i) => {
    cur.push(i);
    chars += w.length + 1;
    const n = cur.length;
    const end = /[.?!:]$/.test(w);
    const comma = /,$/.test(w);
    if (n >= 6 || chars >= 30 || (end && n >= 2) || (comma && chars >= 16)) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
  });
  if (cur.length) {
    // never leave a lone trailing word: merge it into the previous phrase if it fits
    const last = out[out.length - 1];
    if (cur.length === 1 && last && last.length < 6 && last.reduce((a, i) => a + words[i].length + 1, 0) + words[cur[0]].length < 34) last.push(...cur);
    else out.push(cur);
  }
  return out;
};

// Split a phrase into at most two balanced rows (by character count).
export const rowsOf = (lineIndex: number, ph: number[]): number[][] => {
  const words = LINES[lineIndex].text.split(/\s+/);
  if (ph.length < 2) return [ph];
  const len = (r: number[]) => r.reduce((a, i) => a + words[i].length + 1, 0);
  if (len(ph) <= 17) return [ph];
  let best = 1;
  let bestScore = Infinity;
  for (let k = 1; k < ph.length; k++) {
    const sc = Math.max(len(ph.slice(0, k)), len(ph.slice(k)));
    if (sc < bestScore) {
      bestScore = sc;
      best = k;
    }
  }
  return [ph.slice(0, best), ph.slice(best)];
};
