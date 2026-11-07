// User frame + timing edits on top of the Claude-written shots (src/edits.json, null = none).
// Applied in timeline.ts, so a regenerated shots.ts needs no change.
import edits from "./edits.json";
import type { Ev, Shot } from "./types";

export interface ShotEdit {
  base: number; // index into the raw shots from shots.ts; the same base twice = duplicate
  line?: number;
  scene?: Shot["scene"];
  zoom?: number;
  text?: string; // on-screen stamp text ("" removes stamps)
  sec?: number; // exact length of this shot in seconds
}
export interface Edits {
  shots?: ShotEdit[];
  lines?: Record<string, { sec: number }>; // whole line length in seconds, including the 0.3 s gap
}

export const EDITS = edits as Edits | null;

export const applyEdits = (raw: Shot[], e: Edits | null): Shot[] => {
  if (!e || !Array.isArray(e.shots)) return raw;
  const out: Shot[] = [];
  for (const ed of e.shots) {
    const b = raw[ed.base];
    if (!b) continue;
    let s: Shot = { ...b };
    if (ed.line !== undefined) s.line = ed.line;
    if (ed.scene) s.scene = ed.scene;
    if (ed.zoom !== undefined) {
      const k = b.from.zoom ? ed.zoom / b.from.zoom : 1;
      s.from = { ...b.from, zoom: ed.zoom };
      if (b.to) s.to = { ...b.to, zoom: b.to.zoom * k };
    }
    if (ed.text !== undefined) {
      const keep = (b.events ?? []).filter((v) => v.kind !== "stamp");
      const stamp: Ev[] = ed.text ? [{ at: 0.15, kind: "stamp", text: ed.text, color: "#d99a00", pos: [540, 470], dur: 1.5 }] : [];
      s.events = [...keep, ...stamp];
    }
    if (ed.sec !== undefined) s.sec = ed.sec;
    out.push(s);
  }
  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.line - b.s.line || a.i - b.i)
    .map((x) => x.s);
};
