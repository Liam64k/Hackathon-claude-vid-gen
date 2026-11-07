import { Layer } from "../camera";
import { CAST, Character, crowdLook } from "./Character";
import { Gradient, OUT, SignText, rand, shade } from "./kit";
import type { Actor } from "../types";

// Old fallout shelter sign: yellow, black trefoil-in-circle, rust streaks.
export const ShelterSign = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-170} y={-120} width={340} height={240} rx={8} fill="#f1c40f" stroke={OUT} strokeWidth={8} />
    <circle cx={0} cy={-40} r={62} fill="#111" />
    {[0, 120, 240].map((r) => (
      <path key={r} d="M0,-40 L-30,-92 A60,60 0 0 1 30,-92 Z" fill="#f1c40f" transform={`rotate(${r},0,-40)`} />
    ))}
    <circle cx={0} cy={-40} r={14} fill="#111" stroke="#f1c40f" strokeWidth={6} />
    <SignText x={0} y={68} size={44} fill="#111">FALLOUT</SignText>
    <SignText x={0} y={108} size={44} fill="#111">SHELTER</SignText>
    {[-120, -40, 90, 140].map((rx, k) => (
      <path key={rx} d={`M${rx},${-110 + k * 10} q6,${60 + k * 20} -4,${120 + k * 30}`} stroke="#9a4a1a" strokeWidth={6 + (k % 2) * 4} opacity={0.6} fill="none" />
    ))}
    {[[-150, -100], [150, -100], [-150, 100], [150, 100]].map(([bx, by]) => (
      <circle key={`${bx}${by}`} cx={bx} cy={by} r={8} fill="#7a5a3a" stroke={OUT} strokeWidth={3} />
    ))}
  </g>
);

const Brick = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="#b5523b" />
    {Array.from({ length: Math.ceil(h / 40) }, (_, r) =>
      Array.from({ length: Math.ceil(w / 90) + 1 }, (_, c) => (
        <rect key={`${r}-${c}`} x={x + c * 90 - (r % 2) * 45} y={y + r * 40} width={86} height={36} fill={rand(r * 50 + c) > 0.8 ? "#a3462f" : "#bd5a42"} stroke="#8e3b28" strokeWidth={2} />
      )),
    )}
  </g>
);

// 44th Street: brick facade with the old shelter sign, stairwell down to the basement door.
// World: x 0..1080, y 0..2700 (street at y 1500, door at y 2450).
export const Street44 = ({ frame, cast = [], panic = false }: { frame: number; cast?: Actor[]; panic?: boolean }) => (
  <g>
    <defs>
      <Gradient id="s44Sky" stops={[[0, "#4f9be6"], [1, "#cdeaff"]]} />
      <clipPath id="s44Clip"><rect x={-300} y={-300} width={1680} height={3400} /></clipPath>
    </defs>
    <g clipPath="url(#s44Clip)">
      <Layer depth={0.3}>
        <rect x={-300} y={-300} width={1680} height={900} fill="url(#s44Sky)" />
      </Layer>
      <Brick x={-300} y={100} w={1680} h={1400} />
      {/* windows with sills and AC units */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <g key={`${r}${c}`}>
            <rect x={-150 + c * 360} y={200 + r * 320} width={170} height={220} fill="#2b3b52" stroke={OUT} strokeWidth={5} />
            <rect x={-142 + c * 360} y={208 + r * 320} width={76} height={204} fill="#9ec5e8" opacity={0.7} />
            <rect x={-160 + c * 360} y={420 + r * 320} width={190} height={20} fill="#d8cfc0" stroke={OUT} strokeWidth={4} />
            {(r + c) % 3 === 0 && <rect x={-120 + c * 360} y={360 + r * 320} width={110} height={60} fill="#cfd6dc" stroke={OUT} strokeWidth={4} />}
          </g>
        )),
      )}
      {/* fire escape */}
      <g stroke={OUT} strokeWidth={6} fill="none">
        {[520, 840].map((y) => (
          <g key={y}>
            <rect x={560} y={y} width={420} height={16} fill="#2d3340" />
            <path d={`M560,${y} l0,-110 M980,${y} l0,-110 M560,${y - 110} l420,0`} />
            {Array.from({ length: 10 }, (_, k) => <line key={k} x1={580 + k * 42} y1={y} x2={580 + k * 42} y2={y - 110} />)}
          </g>
        ))}
        <path d="M600,840 L940,530" strokeWidth={10} />
      </g>
      <ShelterSign x={300} y={1180} s={1} />
      <SignText x={860} y={1300} size={44} fill="#fff" stroke={6}>W 44 ST</SignText>
      {/* sidewalk + street */}
      <rect x={-300} y={1500} width={1680} height={90} fill="#a7a9b4" stroke={OUT} strokeWidth={4} />
      <rect x={-300} y={1590} width={1680} height={60} fill="#4a4e5a" />
      {/* stairwell down */}
      <rect x={-300} y={1650} width={1680} height={1100} fill="#7c838a" />
      <path d="M140,1590 L140,2500 L1080,2500 L1080,1590" fill="#5b6670" stroke={OUT} strokeWidth={5} />
      {Array.from({ length: 10 }, (_, k) => (
        <rect key={k} x={140 + k * 50} y={1600 + k * 90} width={940 - k * 50} height={90} fill={k % 2 ? "#8a9299" : "#949ca3"} stroke={OUT} strokeWidth={3} />
      ))}
      {/* railing */}
      <g stroke="#1d1a24" strokeWidth={10} strokeLinecap="round" fill="none">
        <path d="M120,1500 L120,1420 L700,1420 L700,1500" />
        {Array.from({ length: 12 }, (_, k) => <line key={k} x1={150 + k * 48} y1={1420} x2={150 + k * 48} y2={1500} strokeWidth={5} />)}
      </g>
      {/* basement door */}
      <rect x={640} y={2120} width={300} height={380} fill="#3d5a73" stroke={OUT} strokeWidth={8} />
      <rect x={720} y={2170} width={140} height={60} fill="#111" stroke={OUT} strokeWidth={5} />
      <circle cx={900} cy={2330} r={14} fill="#d8b04a" stroke={OUT} strokeWidth={4} />
      <rect x={650} y={2380} width={280} height={20} fill={shade("#3d5a73", 0.2)} />
      <rect x={600} y={2080} width={380} height={40} fill="#5b6670" stroke={OUT} strokeWidth={5} />
      <circle cx={790} cy={2100} r={14} fill={frame % 30 < 15 ? "#ffef9a" : "#c9b45a"} stroke={OUT} strokeWidth={4} />
      {/* passers-by on the sidewalk */}
      {Array.from({ length: 6 }, (_, k) => (
        <Character key={k} look={crowdLook(k + 70)} x={((k * 260 + frame * (k % 2 ? 3 : -2)) % 1500) - 200} y={1560} frame={frame} seed={k + 70} pose={panic ? "run" : "phone"} expr={panic ? "fear" : "calm"} scale={0.48} flip={k % 2 === 1} />
      ))}
      {cast.map((c, i) => (
        <Character key={c.id + i} look={CAST[c.id]} x={c.x} y={c.y} frame={frame} seed={i + 20} expr={c.expr} pose={c.pose} scale={c.scale ?? 0.75} flip={c.flip} />
      ))}
    </g>
  </g>
);
