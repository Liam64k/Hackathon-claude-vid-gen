import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AngleCard, LadderCard, OneTenOneCard, Part2Card, Phone911Card, SwatchChip, TitleCard } from "../art/Diagrams";
import { UI_FONT } from "../art/fonts";
import { camAt } from "../camAt";
import { shakeAt } from "../camera";
import { shotAt } from "../timeline";
import type { Ev } from "../types";

// The UI layer: callouts (leader lines to world points), stamps, stage-direction tags, delta chips under the HUD,
// speech bubbles and the diagram cards. `at` = fraction of the shot; everything is a function of the frame.
const PLATE = "rgba(15,18,28,0.9)";
const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const DEFAULT_DUR: Record<string, number> = { callout: 1.7, stamp: 1.4, tag: 1.5, delta: 2.0, bubble: 1.6, tick: 0.3 };

export const Events = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = shotAt(frame);
  const local = frame - s.start;
  const cam = camAt(frame);
  const { dx, dy } = shakeAt(local, s.shake ?? 0);
  const proj = (wx: number, wy: number): [number, number] => [540 + dx + (wx - cam.x) * cam.zoom, 960 + dy + (wy - cam.y) * cam.zoom];
  const evs = (s.events ?? []).map((e, i) => {
    const start = s.start + Math.round(e.at * s.len);
    const dur = e.kind === "card" ? (e.dur ? e.dur * FPS : s.start + s.len - start) : (e.dur ?? DEFAULT_DUR[e.kind] ?? 1.5) * FPS;
    return { e, i, start, end: start + Math.round(dur) };
  });
  const live = evs.filter((v) => v.e.kind !== "tick" && frame >= v.start && frame < v.end);

  return (
    <>
      {live
        .filter((v) => v.e.kind === "card")
        .map((v) => {
          const e = v.e as Extract<Ev, { kind: "card" }>;
          const f = frame - v.start;
          const len = v.end - v.start;
          const dim = (e.dim ?? 0) * Math.min(1, f / 8) * (1 - Math.max(0, (f - (len - 8)) / 8));
          return (
            <div key={`c${v.i}`}>
              {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,10,18,${dim})` }} />}
              {e.card === "title" && <TitleCard f={f} len={len} cont={Boolean(e.opts?.cont)} />}
              {e.card === "ladder" && <LadderCard f={f} len={len} />}
              {e.card === "oneTenOne" && <OneTenOneCard f={f} len={len} opts={e.opts ?? {}} />}
              {e.card === "phone911" && <Phone911Card f={f} len={len} />}
              {e.card === "angle" && <AngleCard f={f} len={len} opts={e.opts ?? {}} />}
              {e.card === "part2" && <Part2Card f={f} len={len} />}
              {e.card === "swatch" && <SwatchChip f={f} len={len} opts={e.opts ?? {}} />}
            </div>
          );
        })}
      {live
        .filter((v) => v.e.kind !== "card")
        .map((v) => {
          const f = frame - v.start;
          const left = v.end - frame;
          const fade = Math.min(1, left / 6);
          const e = v.e;
          if (e.kind === "callout") {
            const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
            const [px, py] = [Math.round(e.pos[0]), Math.round(e.pos[1])];
            const tgt = e.target ? proj(e.target[0], e.target[1]) : null;
            const col = e.color ?? "#ffffff";
            if (e.mark) {
              const [mx, my] = tgt ?? [px, py];
              return (
                <div key={v.i} style={{ position: "absolute", left: Math.round(mx), top: Math.round(my), width: 130, height: 130, marginLeft: -65, marginTop: -65, borderRadius: 65, background: "#F5C518", border: "8px solid #12101a", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: UI_FONT, fontWeight: 900, fontSize: 96, color: "#12101a", transform: `scale(${pop})`, opacity: fade, boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
                  {e.text}
                </div>
              );
            }
            const draw = interpolate(f, [2, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            return (
              <div key={v.i} style={{ opacity: fade }}>
                {tgt && (
                  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
                    <line x1={px} y1={py} x2={px + (tgt[0] - px) * draw} y2={py + (tgt[1] - py) * draw} stroke={col} strokeWidth={5} strokeDasharray="12 9" strokeLinecap="round" />
                    <circle cx={tgt[0]} cy={tgt[1]} r={12 * draw} fill={col} stroke="#12101a" strokeWidth={3} />
                  </svg>
                )}
                <div style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * pop})`, opacity: pop, background: PLATE, border: `5px solid ${col}`, borderRadius: 22, padding: "16px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, lineHeight: 1, fontFamily: UI_FONT, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
                  <div style={{ fontSize: 46 }}>{e.text}</div>
                  {e.sub && <div style={{ fontSize: 34, color: "#cfd6e4", fontWeight: 800 }}>{e.sub}</div>}
                </div>
              </div>
            );
          }
          if (e.kind === "stamp") {
            const slam = interpolate(f, [0, 5], [1.45, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
            const sh = f < 7 ? Math.sin(f * 2.4) * 8 * (1 - f / 7) : 0;
            const [px, py] = e.pos ?? [540, 480];
            const size = e.size ?? (e.text.length > 14 ? 60 : 78);
            return (
              <div key={v.i} style={{ position: "absolute", left: Math.round(px), top: Math.round(py), width: 960, marginLeft: -480, display: "flex", justifyContent: "center", opacity: Math.min(1, f / 2) * fade, transform: `translate(${sh}px,${-sh}px) rotate(-5deg) scale(${slam})` }}>
                <div style={{ background: e.color, border: "7px solid #fff", borderRadius: 22, padding: "16px 34px", fontFamily: UI_FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, textAlign: "center", color: "#fff", WebkitTextStroke: "0px", textShadow: "0 4px 0 rgba(0,0,0,0.3)", boxShadow: "0 12px 0 rgba(0,0,0,0.4)", maxWidth: 900 }}>{e.text}</div>
              </div>
            );
          }
          if (e.kind === "tag") {
            const pop = spring({ frame: f, fps, config: { damping: 14, stiffness: 160 } });
            const [px, py] = e.pos ?? [540, 330];
            return (
              <div key={v.i} style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-50%) scale(${0.9 + 0.1 * pop})`, opacity: pop * fade, background: e.color ?? "#fff", color: "#12101a", borderRadius: 14, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: UI_FONT, fontWeight: 900, fontSize: 38, whiteSpace: "nowrap", boxShadow: "0 6px 0 rgba(0,0,0,0.3)" }}>
                {e.text}
              </div>
            );
          }
          if (e.kind === "delta") {
            const pop = spring({ frame: f, fps, config: { damping: 13, stiffness: 170 } });
            const col = e.color ?? "#2FD27A";
            return (
              <div key={v.i} style={{ position: "absolute", left: 0, right: 0, top: 284, display: "flex", justifyContent: "center", opacity: pop * fade, transform: `translateY(${Math.round((1 - pop) * -20)}px)` }}>
                <div style={{ background: PLATE, border: `4px solid ${col}`, borderRadius: 16, padding: "10px 24px", fontFamily: UI_FONT, fontWeight: 900, fontSize: 36, color: col, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{e.text}</div>
              </div>
            );
          }
          if (e.kind === "bubble") {
            const pop = spring({ frame: f, fps, config: { damping: 11 } });
            const [px, py] = e.pos;
            const right = (e.side ?? "right") === "right";
            return (
              <div key={v.i} style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-50%) scale(${pop})`, opacity: fade, transformOrigin: right ? "100% 50%" : "0% 50%" }}>
                <div style={{ position: "relative", background: "#fff", color: "#12101a", border: "7px solid #12101a", borderRadius: 40, padding: "18px 38px", fontFamily: UI_FONT, fontWeight: 900, fontSize: 72, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {e.text}
                  <div style={{ position: "absolute", top: "50%", [right ? "right" : "left"]: -40, marginTop: -22, width: 0, height: 0, borderTop: "22px solid transparent", borderBottom: "22px solid transparent", [right ? "borderLeft" : "borderRight"]: "40px solid #12101a" }} />
                </div>
              </div>
            );
          }
          return null;
        })}
    </>
  );
};
