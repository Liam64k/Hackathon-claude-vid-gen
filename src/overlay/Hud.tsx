import { useCurrentFrame } from "remotion";
import { MONO_FONT, UI_FONT } from "../art/fonts";
import { hudAt, shotAt } from "../timeline";

// Ice HUD (top 14 % of the frame = y < 269): row 1 clock/timer + ICE + WATER, row 2 phase + brother,
// row 3 the pinned 1-10-1 strip. Counters ease; a pill flashes when its text changes or a tick event fires.
const PLATE = "rgba(15,18,28,0.88)";
const RED = "#E53935";
const OK = "#2FD27A";
const INFO = "#4DA3FF";
const AMBER = "#F59E0B";
const PURPLE = "#8e6bd8";

const mm = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
const clock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m) % 60).padStart(2, "0")}`;

type PillData = { key: string; text: string; border: string; bg?: string; color?: string; mono?: boolean; size?: number; opacity?: number };

const textsAt = (frame: number) => {
  const h = hudAt(frame);
  const mode = h.mode ?? "clock";
  const pills: PillData[] = [];
  if (mode === "clock") pills.push({ key: "clock", text: `DEC · ${clock(h.clock ?? 978)}`, border: "rgba(255,255,255,0.35)", mono: true, size: 44, opacity: h.ghost ? 0.35 : 1 });
  else if (mode === "water") pills.push({ key: "clock", text: `IN WATER ${mm(h.timer ?? 0)}`, border: RED, mono: true, size: 42 });
  else if (mode === "paused") pills.push({ key: "clock", text: `PAUSED ${mm(h.timer ?? 0)}`, border: INFO, bg: "rgba(24,52,100,0.92)", mono: true, size: 42 });
  else pills.push({ key: "clock", text: `OUT ${mm(h.timer ?? 0)}`, border: OK, bg: "rgba(18,70,48,0.92)", mono: true, size: 42 });
  const ice = h.ice;
  if (ice !== undefined)
    pills.push({ key: "ice", text: ice === null || ice === undefined ? "ICE -- cm" : `ICE ${Math.round(ice)} cm`, border: ice !== null && ice !== undefined && ice < 10 ? RED : "rgba(255,255,255,0.35)", bg: ice !== null && ice !== undefined && ice < 10 ? "rgba(120,20,24,0.92)" : undefined, size: 38 });
  if (h.water) pills.push({ key: "water", text: "WATER ≈0 °C", border: "#5cc8ff", bg: "rgba(12,56,86,0.92)", size: 38 });
  return { h, pills };
};

const Pill = ({ p, flash }: { p: PillData; flash: number }) => (
  <div
    style={{
      height: 76,
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
      boxSizing: "border-box",
      borderRadius: 20,
      background: p.bg ?? PLATE,
      border: `5px solid ${flash > 0 ? "#fff" : p.border}`,
      color: p.color ?? "#fff",
      fontFamily: p.mono ? MONO_FONT : UI_FONT,
      fontWeight: p.mono ? 700 : 900,
      fontSize: p.size ?? 38,
      whiteSpace: "nowrap",
      opacity: p.opacity ?? 1,
      transform: `scale(${1 + flash * 0.06})`,
      boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
    }}
  >
    {p.text}
  </div>
);

const Strip = ({ timer, pulse1, pulse2 }: { timer: number; pulse1: number; pulse2: number }) => {
  const f2 = Math.max(0, Math.min(1, (timer - 60) / 540));
  const done1 = timer >= 60;
  const seg = (w: string, bg: string, border: string, children: React.ReactNode, extra?: React.ReactNode) => (
    <div style={{ width: w, height: 54, position: "relative", overflow: "hidden", boxSizing: "border-box", borderRadius: 12, border: `4px solid ${border}`, background: bg, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 34, color: "#fff", whiteSpace: "nowrap" }}>
      {extra}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 202, left: 40, right: 40, display: "flex", gap: 8 }}>
      {seg("17%", OK, pulse1 > 0 ? "#fff" : "#b8f5d2", <>1 MIN{done1 ? " ✓" : ""}</>)}
      {seg("47%", "#3a2d12", pulse2 > 0 ? "#fff" : "#f0b13a", "≈10 MIN · GET OUT", <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(f2 * 100)}%`, background: AMBER, opacity: 0.85 }} />)}
      {seg("36%", "#2a2148", PURPLE, "≈1 HR · PASS OUT")}
    </div>
  );
};

export const Hud = () => {
  const frame = useCurrentFrame();
  const { h, pills } = textsAt(frame);
  const prev = textsAt(Math.max(0, frame - 6));
  const s = shotAt(frame);
  const ticks = (s.events ?? []).filter((e) => e.kind === "tick").map((e) => ({ pill: (e as { pill: string }).pill, at: s.start + Math.round(e.at * s.len) }));
  const hot = (key: string, text: string, prevText?: string) => (ticks.some((k) => k.pill === key && frame >= k.at && frame < k.at + 9) || (prevText !== undefined && prevText !== text) ? 1 : 0);
  const timer = h.timer ?? 0;
  const phase = h.phase ?? "none";
  const phaseP: PillData | null =
    phase === "breathe" ? { key: "phase", text: "MIN 1 · BREATHE", border: OK, size: 38 }
    : phase === "getout" ? { key: "phase", text: "MIN 10 · GET OUT", border: AMBER, size: 38 }
    : phase === "out" ? { key: "phase", text: "OUT ✓", border: "#b8f5d2", bg: "rgba(18,110,70,0.95)", size: 40 }
    : null;
  const brother = h.brother !== null && h.brother !== undefined ? { key: "brother", text: `BROTHER ${Math.round(h.brother)} M`, border: RED, bg: "rgba(120,20,24,0.92)", mono: true, size: 38 } : null;
  const prevPhase = prev.h.phase;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 269, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 34, left: 40, right: 40, display: "flex", gap: 12, alignItems: "center" }}>
        {pills.map((p, i) => (
          <Pill key={p.key} p={p} flash={hot(p.key, p.text, prev.pills[i]?.key === p.key ? prev.pills[i].text : p.text)} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 120, left: 40, right: 40, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>{phaseP && <Pill p={{ ...phaseP, size: 36 }} flash={hot("phase", phaseP.text, prevPhase !== phase ? "" : phaseP.text)} />}</div>
        <div>{brother && <Pill p={brother} flash={ticks.some((k) => k.pill === "brother" && frame >= k.at && frame < k.at + 9) ? 1 : 0} />}</div>
      </div>
      {h.strip && <Strip timer={timer} pulse1={ticks.some((k) => k.pill === "strip" && frame >= k.at && frame < k.at + 9) ? 1 : 0} pulse2={0} />}
    </div>
  );
};
