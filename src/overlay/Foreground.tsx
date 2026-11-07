import { useCurrentFrame } from "remotion";
import { OUT, rand } from "../art/kit";
import { palette } from "../art/color";
import { camAt } from "../camAt";
import { shotAt, worldAt } from "../timeline";

// Screen-space foreground occluders (pine branch tips, snow ridge, ice chunks) drawn over the world with a
// stronger parallax than the world itself (they slide 40 % further as the camera moves).
const Branch = ({ mirror, c, hi }: { mirror?: boolean; c: string; hi: string }) => (
  <g transform={mirror ? "translate(1080,0) scale(-1,1)" : undefined}>
    <path d="M-60,560 Q80,520 170,430 Q230,370 300,330" stroke={c} strokeWidth={22} fill="none" strokeLinecap="round" />
    <path d="M-60,560 Q80,520 170,430 Q230,370 300,330" stroke={hi} strokeWidth={5} fill="none" strokeLinecap="round" transform="translate(-4,-9)" opacity={0.75} />
    {Array.from({ length: 34 }, (_, i) => {
      const t = i / 33;
      const bx = -40 + t * 330;
      const by = 548 - t * 220 - Math.sin(t * 3) * 22;
      const L = 90 + rand(i * 3.1) * 70;
      const a = -0.7 + (rand(i * 5.3) - 0.5) * 1.5 + (i % 2 ? 0.9 : -0.9);
      return <path key={i} d={`M${bx},${by} l${Math.cos(a) * L},${Math.sin(a) * L}`} stroke={i % 3 === 0 ? hi : c} strokeWidth={9} strokeLinecap="round" opacity={0.96} />;
    })}
    {[0.25, 0.6, 0.85].map((t, i) => (
      <ellipse key={i} cx={-40 + t * 330} cy={535 - t * 220} rx={44} ry={13} fill="#f4f6fb" stroke={OUT} strokeWidth={2.5} opacity={0.9} />
    ))}
  </g>
);

export const Foreground = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  if (!s.fg) return null;
  const cam = camAt(frame);
  const w = worldAt(frame);
  const P = palette(w.dusk);
  const off = Math.max(-130, Math.min(130, -(cam.x - s.from.x) * 0.4 * cam.zoom));
  const sway = Math.sin(frame / 40) * 6;
  const dark = P.pines;
  const hi = P.pinesFar;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${off + sway},${-sway * 0.5})`}>
        {s.fg === "pine" && <Branch c={dark} hi={hi} />}
        {s.fg === "pineR" && <Branch c={dark} hi={hi} mirror />}
        {s.fg === "ridge" && (
          <g transform="translate(0,-40)">
            <path d="M-120,1760 Q100,1590 330,1660 Q560,1560 800,1650 Q980,1590 1200,1700 L1200,1960 L-120,1960 Z" fill="#c9d3ea" stroke={OUT} strokeWidth={4} />
            <path d="M-120,1800 Q100,1650 330,1710 Q560,1620 800,1700 Q980,1650 1200,1750 L1200,1960 L-120,1960 Z" fill="#7b86ad" opacity={0.9} />
          </g>
        )}
        {s.fg === "chunks" && (
          <g>
            <path d="M-40,1640 L90,1560 L220,1600 L270,1700 L160,1760 L-40,1740 Z" fill="#e6eef8" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <path d="M-40,1740 L160,1760 L270,1700 L240,1730 L130,1800 L-40,1790 Z" fill="#9fc0dc" />
            <path d="M860,1690 L960,1610 L1100,1640 L1120,1760 L980,1790 Z" fill="#e6eef8" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <path d="M980,1790 L1120,1760 L1120,1800 L990,1830 Z" fill="#9fc0dc" />
          </g>
        )}
      </g>
    </svg>
  );
};
