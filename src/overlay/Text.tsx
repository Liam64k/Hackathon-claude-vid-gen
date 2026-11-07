import { useCurrentFrame } from "remotion";
import { UI_FONT } from "../art/fonts";
import { LINES } from "../shots";
import { TIMED_LINES, phrases, rowsOf, shotAt, wordTimes } from "../timeline";

const COLORS: Record<string, string> = { "": "#F5C518", r: "#FF5A52", g: "#2FD27A", p: "#B79CFF" };
const base = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");

// Karaoke captions: the whole phrase (<= 6 words, 2 lines) is visible; the spoken word is bright and a touch bigger,
// upcoming words are grey, and at most ONE word per phrase carries a colour (gold / red / green).
export const Captions = () => {
  const frame = useCurrentFrame();
  const line = TIMED_LINES.find((l) => frame >= l.from && frame < l.from + l.dur);
  if (!line) return null;
  const local = frame - line.from;
  const words = wordTimes(line.index);
  let cur = words.findIndex((w) => local >= w.start && local < w.end);
  if (cur < 0) cur = local < 0 ? 0 : words.length - 1;
  const ph = phrases(line.index).find((p) => p.includes(cur)) ?? [cur];
  const hl = LINES[line.index].highlight.map((h) => {
    const [w, c = ""] = h.split(":");
    return { w: base(w), c };
  });
  const colored = [...ph].reverse().find((i) => hl.some((h) => h.w === base(words[i].word)));
  const hlc = colored !== undefined ? COLORS[hl.find((h) => h.w === base(words[colored].word))!.c] : "";
  const shot = shotAt(frame);
  const top = shot.cap === "high" ? 340 : 1150;
  const rows = rowsOf(line.index, ph);
  const pin = Math.min(1, (local - words[ph[0]].start + 4) / 5);
  return (
    <div style={{ position: "absolute", top, left: 40, right: 40, height: 156, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: UI_FONT, fontWeight: 900, fontSize: 64, lineHeight: 1.1, transform: `scale(${0.95 + 0.05 * Math.max(0, pin)})` }}>
      {rows.map((r, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 26, whiteSpace: "nowrap" }}>
          {r.map((idx) => {
            const spoken = idx <= cur;
            const now = idx === cur;
            const isC = idx === colored && spoken;
            return (
              <span key={idx} style={{ display: "inline-block", color: isC ? hlc : spoken ? "#fff" : "rgba(255,255,255,0.5)", WebkitTextStroke: "11px #12101a", paintOrder: "stroke fill", textShadow: "0 6px 14px rgba(0,0,0,0.55)", transform: `scale(${now ? 1.07 : 1})`, transformOrigin: "50% 80%" }}>
                {words[idx].word.toUpperCase()}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
