import { Layer } from "../camera";
import { CAST, Character, crowdLook } from "./Character";
import { Block, Gradient, OUT, SignText, rand, shade } from "./kit";
import type { Actor } from "../types";

// Generic billboards: no real brands.
const BOARDS = [
  { x: 60, y: 260, w: 420, h: 300, bg: "#ff4d8d", title: "BIG", sub: "SHOW TONIGHT" },
  { x: 560, y: 120, w: 460, h: 420, bg: "#111827", title: "ALERT", sub: "", screen: true },
  { x: 1100, y: 300, w: 380, h: 260, bg: "#29d3ff", title: "NEW", sub: "PHONE X" },
  { x: 1560, y: 180, w: 460, h: 340, bg: "#ffd23f", title: "SALE", sub: "50% OFF" },
  { x: 120, y: 640, w: 300, h: 160, bg: "#7c4dff", title: "PIZZA", sub: "$1 SLICE" },
  { x: 1180, y: 640, w: 320, h: 180, bg: "#2fbf71", title: "MUSICAL", sub: "NOW PLAYING" },
];

const Building = ({ x, w, h, color, seed }: { x: number; w: number; h: number; color: string; seed: number }) => {
  const top = 1240 - h;
  const cols = Math.floor(w / 70);
  const rows = Math.floor(h / 90);
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill={color} stroke={OUT} strokeWidth={3} />
      <rect x={x + w * 0.78} y={top} width={w * 0.22} height={h} fill={shade(color, 0.15)} />
      <rect x={x - 8} y={top - 14} width={w + 16} height={18} fill={shade(color, 0.25)} stroke={OUT} strokeWidth={3} />
      {Array.from({ length: rows * cols }, (_, k) => {
        const c = k % cols;
        const r = Math.floor(k / cols);
        const lit = rand(seed * 31 + k) > 0.55;
        return <rect key={k} x={x + 18 + c * 70} y={top + 30 + r * 90} width={36} height={52} rx={3} fill={lit ? "#fff1b8" : "#9ec5e8"} stroke={OUT} strokeWidth={2} opacity={0.95} />;
      })}
    </g>
  );
};

const Taxi = ({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) => (
  <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`}>
    <path d="M-150,-30 L-130,-80 L-60,-120 L70,-120 L120,-80 L160,-70 L160,-20 L-150,-20 Z" fill="#f6c21c" stroke={OUT} strokeWidth={5} />
    <path d="M-50,-110 L60,-110 L100,-80 L-110,-80 Z" fill="#9ed7ff" stroke={OUT} strokeWidth={4} />
    <line x1={10} y1={-110} x2={10} y2={-80} stroke={OUT} strokeWidth={4} />
    <rect x={-30} y={-148} width={60} height={26} rx={5} fill="#fff" stroke={OUT} strokeWidth={4} />
    <SignText x={0} y={-128} size={20} fill={OUT}>TAXI</SignText>
    <g>{Array.from({ length: 12 }, (_, k) => <rect key={k} x={-140 + k * 24} y={-60} width={12} height={12} fill={k % 2 ? OUT : "#fff"} />)}</g>
    {[-90, 100].map((wx) => (
      <g key={wx}>
        <circle cx={wx} cy={-14} r={30} fill="#222" stroke={OUT} strokeWidth={4} />
        <circle cx={wx} cy={-14} r={12} fill="#bbb" />
      </g>
    ))}
    <rect x={150} y={-64} width={14} height={14} fill="#fff5c0" stroke={OUT} strokeWidth={2} />
  </g>
);

export const TimesSquare = ({ frame, alert, cast = [], crowd = 34, mood = "calm" }: { frame: number; alert: boolean; cast?: Actor[]; crowd?: number; mood?: "calm" | "laugh" }) => {
  const pulse = frame % 16 < 8;
  return (
    <g>
      <defs>
        <Gradient id="tsSky" stops={[[0, "#3f8fe0"], [0.6, "#8fd0ff"], [1, "#d7f0ff"]]} />
      </defs>
      <Layer depth={0.2}>
        <rect x={-400} y={-400} width={3000} height={1700} fill="url(#tsSky)" />
        <circle cx={1700} cy={180} r={90} fill="#fff3b0" />
        <circle cx={1700} cy={180} r={140} fill="#fff3b0" opacity={0.25} />
        {[200, 900, 1500].map((cx, i) => (
          <g key={cx} fill="#fff" opacity={0.85} transform={`translate(${(frame * 0.3 + i * 200) % 300},0)`}>
            <ellipse cx={cx} cy={120 + i * 40} rx={90} ry={28} />
            <ellipse cx={cx + 60} cy={104 + i * 40} rx={60} ry={30} />
          </g>
        ))}
      </Layer>
      <Layer depth={0.45}>
        {[-200, 160, 520, 900, 1300, 1700, 2100].map((x, i) => (
          <rect key={x} x={x} y={400 - (i % 3) * 140} width={300} height={1000} fill={["#7d8fb3", "#8a9cc0", "#6f81a6"][i % 3]} opacity={0.9} />
        ))}
      </Layer>
      <Layer depth={0.75}>
        <Building x={-40} w={520} h={1180} color="#5b4a7a" seed={1} />
        <Building x={520} w={520} h={1220} color="#37578a" seed={2} />
        <Building x={1080} w={460} h={1100} color="#6d4c8f" seed={3} />
        <Building x={1540} w={560} h={1160} color="#455a9a" seed={4} />
        {BOARDS.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={b.screen && alert ? (pulse ? "#d90429" : "#8d0000") : b.bg} stroke={OUT} strokeWidth={6} />
            <rect x={b.x + 10} y={b.y + 10} width={b.w - 20} height={b.h - 20} rx={4} fill="#fff" opacity={0.12} />
            {b.screen ? (
              alert ? (
                <g>
                  <SignText x={b.x + b.w / 2} y={b.y + 120} size={56} fill="#fff">⚠ EMERGENCY</SignText>
                  <SignText x={b.x + b.w / 2} y={b.y + 200} size={44} fill="#fff">MISSILE ALERT</SignText>
                  <SignText x={b.x + b.w / 2} y={b.y + 300} size={40} fill="#ffd23f">SEEK SHELTER</SignText>
                </g>
              ) : (
                <g>
                  <circle cx={b.x + b.w / 2} cy={b.y + 180} r={90} fill="#ffd23f" />
                  <SignText x={b.x + b.w / 2} y={b.y + 340} size={48} fill="#fff">FRESH COFFEE</SignText>
                </g>
              )
            ) : (
              <g>
                <SignText x={b.x + b.w / 2} y={b.y + b.h * 0.5} size={b.h * 0.3} fill="#fff" stroke={6}>{b.title}</SignText>
                <SignText x={b.x + b.w / 2} y={b.y + b.h * 0.8} size={b.h * 0.14} fill="#fff" stroke={4}>{b.sub}</SignText>
              </g>
            )}
          </g>
        ))}
        {/* LED ticker */}
        <rect x={-40} y={880} width={2200} height={70} fill="#111" stroke={OUT} strokeWidth={4} />
        <SignText x={((-frame * 9) % 2200) + 2200} y={932} size={48} fill={alert ? "#ff4d4d" : "#7CFC00"} anchor="start">
          {alert ? "BREAKING: BALLISTIC MISSILE THREAT • SEEK IMMEDIATE SHELTER • THIS IS NOT A DRILL •" : "DOW +0.4% • SUNNY 78°F • SHOW TIMES 7PM •"}
        </SignText>
      </Layer>
      {/* street */}
      <rect x={-400} y={1240} width={3000} height={900} fill="#4a4e5a" />
      <rect x={-400} y={1240} width={3000} height={70} fill="#a7a9b4" stroke={OUT} strokeWidth={3} />
      {Array.from({ length: 12 }, (_, k) => (
        <rect key={k} x={-200 + k * 200} y={1520} width={120} height={26} fill="#f2f2f2" opacity={0.85} />
      ))}
      <Taxi x={300} y={1640} />
      <Taxi x={1500} y={1660} flip />
      {/* steam from manhole */}
      <ellipse cx={940} cy={1700} rx={60} ry={14} fill="#333" stroke={OUT} strokeWidth={3} />
      {Array.from({ length: 5 }, (_, k) => {
        const t = ((frame + k * 18) % 90) / 90;
        return <circle key={k} cx={940 + Math.sin(t * 6 + k) * 30} cy={1690 - t * 380} r={30 + t * 70} fill="#fff" opacity={0.35 * (1 - t)} />;
      })}
      {/* crowd with phones up */}
      {Array.from({ length: crowd }, (_, k) => {
        const row = k % 3;
        const x = -100 + ((k * 137) % 2300);
        const y = 1330 + row * 70;
        return (
          <Character key={k} look={crowdLook(k + 7)} x={x} y={y} frame={frame} seed={k} expr={mood === "laugh" && k % 3 === 0 ? "laugh" : rand(k) > 0.6 ? "sly" : "calm"} pose={alert && rand(k + 2) > 0.25 ? "phone" : "stand"} scale={0.42 + row * 0.05} flip={rand(k + 9) > 0.5} />
        );
      })}
      {cast.map((c, i) => (
        <Character key={c.id + i} look={CAST[c.id]} x={c.x} y={c.y} frame={frame} seed={i + 50} expr={c.expr} pose={c.pose} scale={c.scale ?? 0.7} flip={c.flip} />
      ))}
      {/* pigeons */}
      {Array.from({ length: 4 }, (_, k) => (
        <g key={k} transform={`translate(${200 + k * 450 + ((frame * (2 + k)) % 200)},${1300 - ((frame * 3 + k * 40) % 300)})`}>
          <path d={`M-14,0 Q0,${frame % 8 < 4 ? -14 : 6} 14,0`} stroke={OUT} strokeWidth={5} fill="none" />
        </g>
      ))}
      <Layer depth={1.35}>
        {/* foreground lamp post */}
        <rect x={1030} y={700} width={30} height={1400} fill="#2d3340" stroke={OUT} strokeWidth={4} />
        <rect x={980} y={690} width={130} height={30} rx={8} fill="#2d3340" stroke={OUT} strokeWidth={4} />
        <Block x={990} y={980} w={110} h={150} fill="#1b8f4c" r={6} />
        <SignText x={1045} y={1050} size={30}>44 ST</SignText>
        <SignText x={1045} y={1095} size={26}>W</SignText>
      </Layer>
    </g>
  );
};
