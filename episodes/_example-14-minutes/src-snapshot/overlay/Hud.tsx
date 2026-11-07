import { useCurrentFrame } from "remotion";
import { hudAt } from "../timeline";

const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

const Pill = ({ label, value, bg, wide = false, pulse = 0 }: { label: string; value: string; bg: string; wide?: boolean; pulse?: number }) => (
  <div
    style={{
      flex: wide ? 2 : 1,
      padding: wide ? "14px 18px" : "10px 8px",
      borderRadius: 22,
      background: bg,
      border: "5px solid rgba(255,255,255,0.85)",
      boxShadow: "0 8px 0 rgba(0,0,0,0.35)",
      color: "#fff",
      textAlign: "center",
      fontFamily: FONT,
      transform: `scale(${1 + pulse * 0.06})`,
    }}
  >
    <div style={{ fontSize: wide ? 30 : 22, letterSpacing: 2, opacity: 0.95 }}>{label}</div>
    <div style={{ fontSize: wide ? 96 : 54, lineHeight: 1.05, textShadow: "0 4px 0 rgba(0,0,0,0.35)" }}>{value}</div>
  </div>
);

const mmss = (s: number) => {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

export const Hud = () => {
  const frame = useCurrentFrame();
  const h = hudAt(frame);
  const tick = (frame % 30) / 30;
  if (h.phase === "countdown") {
    return (
      <div style={{ position: "absolute", top: 70, left: 40, right: 40, display: "flex", gap: 16 }}>
        <Pill label="IMPACT IN" value={mmss(h.impact ?? 0)} bg="#c62828" wide pulse={tick < 0.2 ? 1 - tick * 5 : 0} />
        <Pill label="PEOPLE" value={String(Math.round(h.people ?? 1))} bg="#5e35b1" />
      </div>
    );
  }
  const hour = Math.round(h.hour ?? 0);
  const rad = Math.round(h.rad ?? 100);
  const radColor = rad > 50 ? "#d32f2f" : rad > 5 ? "#f57c00" : "#2e7d32";
  return (
    <div style={{ position: "absolute", top: 70, left: 28, right: 28, display: "flex", gap: 12 }}>
      <Pill label={hour >= 48 ? "DAY" : "HOUR"} value={String(hour >= 48 ? Math.floor(hour / 24) + 1 : hour)} bg="#37474f" />
      <Pill label="FOOD" value={String(Math.round(h.food ?? 0))} bg="#b8860b" />
      <Pill label="PEOPLE" value={String(Math.round(h.people ?? 6))} bg="#5e35b1" />
      <Pill label="RADIATION" value={`${rad}%`} bg={radColor} />
    </div>
  );
};
