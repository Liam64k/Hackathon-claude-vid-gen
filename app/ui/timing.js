// Plain-JS mirror of src/timeline.ts (frame layout) and src/edits.ts (shot ordering). Keep in sync;
// app/test/timing.test.mjs checks it against the real TS on the example episode.
export const FPS = 30;
const GAP_F = Math.round(0.3 * FPS);
const WORDS_PER_SEC = 2.6;

// Same ordering rules as applyEdits in src/edits.ts, on the fields timing cares about.
export const expandShots = (raw, edits) => {
  if (!edits || !Array.isArray(edits.shots)) return raw.map((s, base) => ({ ...s, base }));
  const out = [];
  for (const ed of edits.shots) {
    const b = raw[ed.base];
    if (!b) continue;
    out.push({ ...b, base: ed.base, ...(ed.line !== undefined ? { line: ed.line } : {}), ...(ed.sec !== undefined ? { sec: ed.sec } : {}) });
  }
  return out.map((s, i) => ({ s, i })).sort((a, b) => a.s.line - b.s.line || a.i - b.i).map((x) => x.s);
};

export const layoutLine = ({ shots, speech, override }) => {
  let dur = override !== undefined ? Math.max(1, Math.round(override * FPS)) : speech + GAP_F;
  const fixed = shots.map((s) => (s.sec !== undefined ? Math.max(1, Math.round(s.sec * FPS)) : null));
  const free = shots.filter((_, k) => fixed[k] === null);
  const fixedSum = fixed.reduce((a, f) => a + (f ?? 0), 0);
  dur = free.length ? Math.max(dur, fixedSum + free.length) : Math.max(dur, fixedSum);
  const rest = dur - fixedSum;
  const total = free.reduce((a, s) => a + (s.weight ?? 1), 0);
  let used = 0, seen = 0;
  const lens = shots.map((s, k) => {
    if (fixed[k] !== null) return fixed[k];
    seen++;
    const len = seen === free.length ? rest - used : Math.max(1, Math.round((rest * (s.weight ?? 1)) / total));
    used += len;
    return len;
  });
  if (!free.length && lens.length) lens[lens.length - 1] += dur - fixedSum;
  return { dur, lens, speech: Math.min(speech, dur) };
};

// lines: [{text}], audio: {voice:{i:sec}}, shots: RAW shots from shots.ts [{line, weight?, sec?}], edits: Edits|null
export const computeTiming = ({ lines, audio, shots, edits = null }) => {
  const voice = audio?.voice ?? {};
  const list = expandShots(shots, edits);
  const outLines = [], outShots = [];
  let cursor = 0;
  lines.forEach((l, i) => {
    const sec = voice[i] ?? String(l.text).split(/\s+/).length / WORDS_PER_SEC;
    const mine = list.filter((s) => s.line === i);
    const { dur, lens } = layoutLine({ shots: mine, speech: Math.round(sec * FPS), override: edits?.lines?.[String(i)]?.sec });
    outLines.push({ i, start: cursor, end: cursor + dur, voiceSec: voice[i] ?? null });
    let at = cursor;
    mine.forEach((s, k) => { outShots.push({ idx: outShots.length, base: s.base, line: i, start: at, end: at + lens[k] }); at += lens[k]; });
    cursor += dur;
  });
  return { fps: FPS, total: cursor, totalSec: cursor / FPS, lines: outLines, shots: outShots };
};
