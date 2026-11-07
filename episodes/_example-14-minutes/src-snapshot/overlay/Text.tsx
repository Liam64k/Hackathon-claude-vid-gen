import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LINES } from "../shots";
import { TIMED_LINES, shotAt, wordTimes } from "../timeline";

const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const GOLD = "#ffd23f";

const stroke: React.CSSProperties = {
  fontFamily: FONT,
  color: "#fff",
  WebkitTextStroke: "12px #111",
  paintOrder: "stroke fill",
  textShadow: "0 6px 0 rgba(0,0,0,0.45)",
};

// Word-by-word captions: a window of up to 5 words around the spoken word.
export const Captions = () => {
  const frame = useCurrentFrame();
  const line = TIMED_LINES.find((l) => frame >= l.from && frame < l.from + l.dur);
  if (!line) return null;
  const local = frame - line.from;
  const words = wordTimes(line.index);
  const hl = LINES[line.index].highlight;
  let cur = words.findIndex((w) => local >= w.start && local < w.end);
  if (cur < 0) cur = local < 0 ? 0 : words.length - 1;
  const chunkStart = Math.floor(cur / 5) * 5;
  const chunk = words.slice(chunkStart, chunkStart + 5);
  const shot = shotAt(frame);
  const top = shot.scene === "phone" ? 1560 : 1330;
  return (
    <div style={{ position: "absolute", top, left: 50, right: 50, textAlign: "center", fontSize: 82, lineHeight: 1.12 }}>
      {chunk.map((w, i) => {
        const idx = chunkStart + i;
        const spoken = idx <= cur;
        const now = idx === cur;
        const isHl = hl.includes(w.word);
        return (
          <span key={idx} style={{ ...stroke, display: "inline-block", marginRight: 22, opacity: spoken ? 1 : 0.55, color: now || (spoken && isHl) ? GOLD : "#fff", transform: `scale(${now ? 1.1 : 1})` }}>
            {w.word.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
};

export const Stamp = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = shotAt(frame);
  if (!s.stamp) return null;
  const startAt = s.start + Math.round((s.stamp.at ?? 0.3) * s.len);
  if (frame < startAt) return null;
  const pop = spring({ frame: frame - startAt, fps, config: { damping: 9, stiffness: 170 } });
  const long = s.stamp.text.length > 16;
  return (
    <div style={{ position: "absolute", top: 330, left: 30, right: 30, display: "flex", justifyContent: "center", transform: `rotate(-5deg) scale(${pop})` }}>
      <div style={{ ...stroke, WebkitTextStroke: "0", background: s.stamp.color, border: "8px solid #fff", borderRadius: 24, padding: "14px 30px", fontSize: long ? 58 : 80, textAlign: "center", boxShadow: "0 12px 0 rgba(0,0,0,0.4)" }}>
        {s.stamp.text}
      </div>
    </div>
  );
};

export const Bubble = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = shotAt(frame);
  if (!s.bubble) return null;
  const pop = spring({ frame: frame - s.start - 6, fps, config: { damping: 11 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: s.bubble.y, display: "flex", justifyContent: "center", transform: `scale(${pop})` }}>
      <div style={{ position: "relative", background: "#fff", color: "#111", border: "7px solid #111", borderRadius: 40, padding: "20px 38px", fontFamily: FONT, fontSize: 60 }}>
        {s.bubble.text}
        <div style={{ position: "absolute", bottom: -38, left: "45%", width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderTop: "38px solid #111" }} />
      </div>
    </div>
  );
};
