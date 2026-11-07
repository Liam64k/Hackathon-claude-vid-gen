import { Layer } from "../camera";
import { Basement } from "./Basement";
import { CAST, Character, crowdLook } from "./Character";
import { Gradient, OUT, SignText, rand } from "./kit";
import type { Actor } from "../types";

const Facade = ({ x, w, h, color, burst, seed }: { x: number; w: number; h: number; color: string; burst: number; seed: number }) => (
  <g>
    <rect x={x} y={900 - h} width={w} height={h} fill={color} stroke={OUT} strokeWidth={4} />
    {Array.from({ length: Math.floor(h / 130) }, (_, r) =>
      Array.from({ length: Math.floor(w / 110) }, (_, c) => {
        const wx = x + 24 + c * 110;
        const wy = 900 - h + 30 + r * 130;
        const broken = burst > 0 && rand(seed + r * 7 + c) > 0.15;
        return (
          <g key={`${r}${c}`}>
            <rect x={wx} y={wy} width={70} height={90} fill={broken ? "#1b1b22" : "#9ec5e8"} stroke={OUT} strokeWidth={3} />
            {broken &&
              Array.from({ length: 4 }, (_, k) => {
                const t = burst;
                const dx = (rand(seed + k + c * 3) - 0.5) * 220 * t;
                const dy = rand(seed + k * 5 + r) * 260 * t;
                return <path key={k} d={`M${wx + 35 + dx},${wy + 45 + dy} l14,-22 l12,26 Z`} fill="#cfefff" stroke={OUT} strokeWidth={2} opacity={1 - t * 0.6} />;
              })}
          </g>
        );
      }),
    )}
  </g>
);

// Cross-section: street and facades above, the shelter below. World 0..1080 x 0..1920.
export const Cross = ({ frame, burst = 0, cast = [], after = false }: { frame: number; burst?: number; cast?: Actor[]; after?: boolean }) => (
  <g>
    <defs>
      <Gradient id="xSky" stops={after ? [[0, "#5a3020"], [1, "#e0703a"]] : [[0, "#4f9be6"], [1, "#cdeaff"]]} />
    </defs>
    <rect x={-300} y={-300} width={1700} height={1200} fill="url(#xSky)" />
    <Facade x={-120} w={460} h={700} color="#b5523b" burst={burst} seed={3} />
    <Facade x={360} w={380} h={820} color="#6d6f80" burst={burst} seed={9} />
    <Facade x={760} w={460} h={640} color="#8a5a44" burst={burst} seed={15} />
    <rect x={-300} y={900} width={1700} height={50} fill="#4a4e5a" stroke={OUT} strokeWidth={4} />
    <rect x={-300} y={950} width={1700} height={100} fill="#6b5a48" />
    {Array.from({ length: 30 }, (_, k) => <circle key={k} cx={-260 + k * 58} cy={990 + (k % 3) * 18} r={8} fill="#5a4a3a" />)}
    <SignText x={540} y={1030} size={32} fill="#fff" stroke={4}>12 FT OF EARTH + CONCRETE</SignText>
    <g transform="translate(150,1050) scale(0.5)">
      <Basement frame={frame} cast={cast} bulb={!after} />
    </g>
    <rect x={150} y={1050} width={740} height={960} fill="none" stroke={OUT} strokeWidth={8} />
  </g>
);

// Street after the blast: orange sky, grey snow, people outside still filming.
export const Fallout = ({ frame, cast = [] }: { frame: number; cast?: Actor[] }) => (
  <g>
    <defs>
      <Gradient id="fSky" stops={[[0, "#3b2018"], [0.5, "#b4552c"], [1, "#e9965a"]]} />
      <radialGradient id="cloud">
        <stop offset="0" stopColor="#d7a46a" />
        <stop offset="1" stopColor="#7a4a2a" stopOpacity={0} />
      </radialGradient>
    </defs>
    <Layer depth={0.2}>
      <rect x={-500} y={-400} width={2600} height={1800} fill="url(#fSky)" />
      {/* distant mushroom column */}
      <rect x={1050} y={160} width={120} height={700} fill="#8a5a3a" opacity={0.8} />
      <ellipse cx={1110} cy={180} rx={320} ry={150} fill="url(#cloud)" />
      <ellipse cx={1110} cy={150} rx={220} ry={110} fill="#c58a52" opacity={0.85} />
    </Layer>
    <Layer depth={0.6}>
      {[-300, 100, 480, 860, 1240].map((x, i) => (
        <g key={x}>
          <rect x={x} y={500 + (i % 2) * 120} width={360} height={900} fill={["#4a3a40", "#55444a", "#3f3238"][i % 3]} stroke={OUT} strokeWidth={4} />
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={x + 30 + (k % 3) * 110} y={560 + (i % 2) * 120 + Math.floor(k / 3) * 150} width={60} height={80} fill={rand(k + i * 9) > 0.3 ? "#16141a" : "#ff9a3c"} stroke={OUT} strokeWidth={3} />
          ))}
        </g>
      ))}
    </Layer>
    <rect x={-500} y={1400} width={2600} height={700} fill="#5a5552" />
    <rect x={-500} y={1400} width={2600} height={60} fill="#8f8a86" stroke={OUT} strokeWidth={3} />
    {/* grey dusting on the ground */}
    {Array.from({ length: 80 }, (_, k) => (
      <ellipse key={k} cx={-400 + rand(k) * 2400} cy={1420 + rand(k + 1) * 500} rx={10 + rand(k + 2) * 30} ry={4} fill="#cfcfcf" opacity={0.6} />
    ))}
    {/* abandoned taxi with door open */}
    <g transform="translate(980,1700)">
      <path d="M-150,-30 L-130,-80 L-60,-120 L70,-120 L120,-80 L160,-70 L160,-20 L-150,-20 Z" fill="#b9962a" stroke={OUT} strokeWidth={5} />
      <path d="M-50,-110 L60,-110 L100,-80 L-110,-80 Z" fill="#2a2a30" stroke={OUT} strokeWidth={4} />
      <circle cx={-90} cy={-14} r={30} fill="#222" stroke={OUT} strokeWidth={4} />
      <circle cx={100} cy={-14} r={30} fill="#222" stroke={OUT} strokeWidth={4} />
      <path d="M-40,-80 L-110,-150 L-110,-60 Z" fill="#b9962a" stroke={OUT} strokeWidth={4} />
    </g>
    {Array.from({ length: 9 }, (_, k) => (
      <Character key={k} look={crowdLook(k + 140)} x={-100 + k * 170} y={1500 + (k % 2) * 60} frame={frame} seed={k + 140} expr={k % 3 === 0 ? "shock" : "calm"} pose={k % 2 ? "hands" : "phone"} scale={0.55} flip={k % 2 === 0} />
    ))}
    {cast.map((c, i) => (
      <Character key={c.id + i} look={CAST[c.id]} x={c.x} y={c.y} frame={frame} seed={i + 90} expr={c.expr} pose={c.pose} scale={c.scale ?? 0.7} flip={c.flip} />
    ))}
    <rect x={-500} y={-400} width={2600} height={2600} fill="#c9a27a" opacity={0.18} />
  </g>
);
