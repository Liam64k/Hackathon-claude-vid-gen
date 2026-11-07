import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEROES } from "../art/heroes";
import { MONO_FONT, UI_FONT } from "../art/fonts";
import { Gradient, rand } from "../art/kit";
import { Hero, type Rim } from "../art/Rig";
import { LightStack } from "../overlay/LightStack";

// Channel style test frames: Eli on a plain frozen lake, DAY and DUSK. Not the episode world.
type Mode = "day" | "dusk";

const PAL: Record<Mode, { sky: [string, string, string]; sun: string; sunXY: [number, number]; pines: string; haze: number; ice: [string, string]; drift: string; print: string; shadow: string; rim: Rim; tint?: { color: string; a: number }; tag: string }> = {
  day: {
    sky: ["#7fb6e6", "#b9d9f1", "#d9ecf7"],
    sun: "#fff3b0",
    sunXY: [860, 300],
    pines: "#3e5f57",
    haze: 0.35,
    ice: ["#eef3f9", "#c9d6e6"],
    drift: "#f8fafd",
    print: "#aebdd3",
    shadow: "#7d8fb3",
    rim: { color: "#fff1d6", side: 1, w: 4 },
    tag: "DEC · 13:05",
  },
  dusk: {
    sky: ["#7d6fb0", "#f4a6b8", "#ffd6a0"],
    sun: "#ffd6a0",
    sunXY: [210, 712],
    pines: "#24453a",
    haze: 0.28,
    ice: ["#f1cdd4", "#8e8fb8"],
    drift: "#f6dde2",
    print: "#7f7fae",
    shadow: "#5d5a92",
    rim: { color: "#ffb86b", side: -1, w: 10 },
    tint: { color: "#f08a5d", a: 0.08 },
    tag: "DEC · 16:18",
  },
};

const HORIZON = 800;

export const IceTest = ({ mode }: { mode: Mode }) => {
  const frame = useCurrentFrame();
  const P = PAL[mode];
  const [sx, sy] = P.sunXY;
  const eliX = 650;
  const eliY = 1300;
  const s = 1.6;
  return (
    <AbsoluteFill style={{ background: P.sky[0] }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <defs>
          <Gradient id={`sky${mode}`} stops={[[0, P.sky[0]], [0.7, P.sky[1]], [1, P.sky[2]]]} />
          <Gradient id={`ice${mode}`} stops={[[0, P.ice[0]], [1, P.ice[1]]]} />
          <radialGradient id={`sun${mode}`}>
            <stop offset={0} stopColor={P.sun} stopOpacity={1} />
            <stop offset={0.25} stopColor={P.sun} stopOpacity={0.9} />
            <stop offset={0.32} stopColor={P.sun} stopOpacity={0.4} />
            <stop offset={1} stopColor={P.sun} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* 1. sky + sun disc with a 40 % halo */}
        <rect width={1080} height={HORIZON + 10} fill={`url(#sky${mode})`} />
        <circle cx={sx} cy={sy} r={mode === "day" ? 220 : 300} fill={`url(#sun${mode})`} />
        {/* 2. far pine shoreline, hazed toward the sky colour */}
        <g>
          {Array.from({ length: 46 }, (_, i) => {
            const x = -20 + i * 25 + rand(i * 2.3) * 10;
            const h = 50 + rand(i * 5.1) * 70 + (i > 30 ? 30 : 0);
            return <path key={i} d={`M${x - 20},${HORIZON} L${x},${HORIZON - h} L${x + 20},${HORIZON} Z`} fill={P.pines} />;
          })}
          <rect y={HORIZON - 30} width={1080} height={32} fill={P.pines} />
          <rect y={HORIZON - 160} width={1080} height={162} fill={P.sky[2]} opacity={P.haze} />
        </g>
        {/* lake: snow-ice plane, low drifts, footprint trail */}
        <rect y={HORIZON} width={1080} height={1920 - HORIZON} fill={`url(#ice${mode})`} />
        {mode === "dusk" && <rect y={HORIZON} width={1080} height={10} fill={P.sun} opacity={0.55} />}
        {Array.from({ length: 9 }, (_, i) => {
          const y = HORIZON + 30 + i * i * 14 + rand(i) * 20;
          const k = (y - HORIZON) / 1100;
          return <ellipse key={i} cx={rand(i * 3.3) * 1080} cy={y} rx={120 + 400 * k} ry={6 + 22 * k} fill={P.drift} opacity={0.7} />;
        })}
        {Array.from({ length: 14 }, (_, i) => {
          // trail from far right toward Eli's boots, perspective-scaled
          const t = i / 13;
          const x = 980 - t * (980 - eliX - 60) + (i % 2 ? 14 : -14) * (0.4 + t);
          const y = HORIZON + 40 + t * (eliY - HORIZON - 50);
          const k = 0.3 + t * 1.2;
          return <ellipse key={i} cx={x} cy={y} rx={13 * k} ry={5 * k} fill={P.print} opacity={0.8} />;
        })}
        {/* long cast shadow away from the sun */}
        <ellipse
          cx={eliX + (mode === "dusk" ? 260 : -30)}
          cy={eliY + 10}
          rx={mode === "dusk" ? 320 : 150}
          ry={26}
          fill={P.shadow}
          opacity={0.45}
          transform={mode === "dusk" ? `rotate(8,${eliX},${eliY})` : undefined}
        />
        <Hero look={HEROES.eli} x={eliX} y={eliY} frame={frame} view="three" expr="calm" scale={s} rim={P.rim} breath seed={3} shadow={false} />
        {/* lighting stack */}
        <LightStack
          frame={frame}
          glow={{ x: sx, y: sy, r: mode === "day" ? 520 : 620, color: P.sun, a: mode === "day" ? 0.35 : 0.5 }}
          tint={P.tint}
          bottom={0.85}
          vignette={mode === "day" ? 0.26 : 0.34}
          grain={0.05}
          specks={mode === "dusk" ? 30 : 18}
        />
        {/* UI: location/time tag (top band) + name callout */}
        <g>
          <rect x={48} y={150} width={360} height={74} rx={18} fill="rgba(15,18,28,0.85)" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={3} />
          <text x={228} y={201} fontSize={40} fontFamily={MONO_FONT} fontWeight={700} textAnchor="middle" fill="#ffffff">
            {P.tag}
          </text>
        </g>
        <g>
          <line x1={eliX - 120} y1={eliY - 660} x2={eliX - 230} y2={eliY - 760} stroke={HEROES.eli.coat} strokeWidth={4} strokeDasharray="10 8" />
          <rect x={eliX - 398} y={eliY - 826} width={176} height={78} rx={20} fill="rgba(15,18,28,0.85)" stroke={HEROES.eli.coat} strokeWidth={5} />
          <text x={eliX - 310} y={eliY - 772} fontSize={46} fontFamily={UI_FONT} fontWeight={900} textAnchor="middle" fill="#ffffff">
            ELI
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
