import { CAST, Character } from "./Character";
import { Block, Gradient, OUT, SignText, rand, shade } from "./kit";
import type { Actor } from "../types";

const CAN_COLORS = ["#d62828", "#f77f00", "#2a9d8f", "#e9c46a", "#8338ec", "#3a86ff"];

const Can = ({ x, y, k, glow }: { x: number; y: number; k: number; glow?: boolean }) => {
  const c = CAN_COLORS[k % CAN_COLORS.length];
  return (
    <g>
      {glow && <circle cx={x + 22} cy={y + 30} r={48} fill="#fff6a8" opacity={0.6} />}
      <rect x={x} y={y} width={44} height={60} rx={5} fill="#c9ced6" stroke={OUT} strokeWidth={3} />
      <rect x={x + 2} y={y + 14} width={40} height={32} fill={c} />
      <rect x={x + 30} y={y + 2} width={10} height={56} fill="#000" opacity={0.12} />
      <rect x={x + 8} y={y + 24} width={22} height={6} fill="#fff" opacity={0.8} />
    </g>
  );
};

// Shelter basement. World x -200..1280, y 0..1920, floor at y 1600.
export const Basement = ({
  frame,
  cast = [],
  cans = 38,
  counted = 0,
  bulb = true,
  candles = 0,
  doorShake = 0,
  wrapper = false,
  dustCoat = false,
  radioOn = false,
}: {
  frame: number;
  cast?: Actor[];
  cans?: number;
  counted?: number; // cans highlighted so far while counting
  bulb?: boolean;
  candles?: number; // 0 = none, 0..1 = remaining length
  doorShake?: number;
  wrapper?: boolean;
  dustCoat?: boolean;
  radioOn?: boolean;
}) => {
  const jiggle = doorShake ? Math.sin(frame * 2.3) * doorShake : 0;
  const swing = Math.sin(frame / 18) * 4;
  return (
    <g>
      <defs>
        <Gradient id="bWall" stops={[[0, "#56626d"], [1, "#6c7782"]]} />
        <radialGradient id="bulbGlow">
          <stop offset="0" stopColor="#fff2b0" stopOpacity={0.8} />
          <stop offset="1" stopColor="#fff2b0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="candleGlow">
          <stop offset="0" stopColor="#ffb347" stopOpacity={0.75} />
          <stop offset="1" stopColor="#ffb347" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* walls: concrete blocks */}
      <rect x={-300} y={-100} width={1700} height={1800} fill="url(#bWall)" />
      {Array.from({ length: 22 }, (_, r) =>
        Array.from({ length: 10 }, (_, c) => (
          <rect key={`${r}${c}`} x={-300 + c * 180 - (r % 2) * 90} y={-100 + r * 80} width={176} height={76} fill="none" stroke="#4a545e" strokeWidth={3} />
        )),
      )}
      {Array.from({ length: 60 }, (_, k) => (
        <circle key={k} cx={-250 + rand(k) * 1600} cy={rand(k + 3) * 1600} r={2 + rand(k + 5) * 4} fill="#3f4851" opacity={0.6} />
      ))}
      {/* ceiling pipes */}
      <rect x={-300} y={-100} width={1700} height={190} fill="#3c444c" />
      {[110, 150].map((y, k) => (
        <g key={y}>
          <rect x={-300} y={y} width={1700} height={28} fill={k ? "#b07040" : "#8a939b"} stroke={OUT} strokeWidth={4} />
          {Array.from({ length: 6 }, (_, j) => <rect key={j} x={-200 + j * 300} y={y - 6} width={20} height={40} fill="#555" stroke={OUT} strokeWidth={3} />)}
        </g>
      ))}
      {/* stairs to the door (top left) */}
      <rect x={-200} y={240} width={330} height={460} fill="#3a4d5e" stroke={OUT} strokeWidth={6} transform={`translate(${jiggle},0)`} />
      <rect x={-110} y={300} width={150} height={70} fill={doorShake ? "#9a9a9a" : "#1a1a1a"} stroke={OUT} strokeWidth={5} transform={`translate(${jiggle},0)`} />
      {doorShake > 0 && (
        <g transform={`translate(${jiggle - 36},300)`}>
          <circle cx={0} cy={36} r={24} fill="#7a7a7a" />
          <rect x={-30} y={50} width={60} height={30} fill="#6d6d6d" />
        </g>
      )}
      <rect x={-40} y={480} width={80} height={14} rx={5} fill="#c9a227" stroke={OUT} strokeWidth={3} />
      {Array.from({ length: 9 }, (_, k) => (
        <rect key={k} x={130 + k * 46} y={700 + k * 100} width={300 - k * 10} height={30} fill="#6b5a48" stroke={OUT} strokeWidth={3} />
      ))}
      <path d="M130,690 L560,1600" stroke={OUT} strokeWidth={10} />
      {/* boiler */}
      <Block x={-260} y={980} w={260} h={620} fill="#7a6f66" r={20} stroke={5} />
      <circle cx={-170} cy={1120} r={40} fill="#efe6d2" stroke={OUT} strokeWidth={5} />
      <line x1={-170} y1={1120} x2={-150} y2={1096} stroke="#c1121f" strokeWidth={5} />
      <rect x={-210} y={1420} width={120} height={80} fill="#2a1a10" stroke={OUT} strokeWidth={4} />
      {/* mattress + blanket */}
      <rect x={-120} y={1550} width={380} height={50} rx={18} fill="#d8d2c4" stroke={OUT} strokeWidth={4} />
      <path d="M0,1550 q80,-30 260,0 l0,50 l-260,0 Z" fill="#5b7bb5" stroke={OUT} strokeWidth={4} />
      {/* vending machine */}
      <Block x={480} y={1060} w={250} h={540} fill="#c1121f" r={10} stroke={5} />
      <rect x={505} y={1100} width={150} height={330} fill="#1b2a3a" stroke={OUT} strokeWidth={4} />
      {Array.from({ length: 12 }, (_, k) => (
        <rect key={k} x={515 + (k % 3) * 46} y={1112 + Math.floor(k / 3) * 78} width={36} height={56} rx={4} fill={CAN_COLORS[(k + 2) % 6]} stroke={OUT} strokeWidth={2} />
      ))}
      <rect x={668} y={1120} width={44} height={110} rx={4} fill="#333" stroke={OUT} strokeWidth={3} />
      <SignText x={605} y={1500} size={34} fill="#fff">SNACKS</SignText>
      {/* shelves with cans */}
      <g>
        {[0, 1, 2, 3].map((r) => (
          <rect key={r} x={780} y={850 + r * 190} width={440} height={16} fill="#9aa3ab" stroke={OUT} strokeWidth={4} />
        ))}
        <rect x={780} y={760} width={14} height={840} fill="#9aa3ab" stroke={OUT} strokeWidth={4} />
        <rect x={1206} y={760} width={14} height={840} fill="#9aa3ab" stroke={OUT} strokeWidth={4} />
        {Array.from({ length: 40 }, (_, k) => {
          if (k >= cans) return null;
          const r = Math.floor(k / 9);
          const c = k % 9;
          if (r > 3) return null;
          return <Can key={k} x={800 + c * 46} y={790 + r * 190} k={k} glow={counted > 0 && k === Math.floor(counted) - 1} />;
        })}
        {/* water jugs on the floor */}
        {[0, 1].map((k) => (
          <g key={k}>
            <rect x={820 + k * 120} y={1480} width={100} height={120} rx={20} fill="#9fd8ff" stroke={OUT} strokeWidth={4} opacity={0.9} />
            <rect x={850 + k * 120} y={1462} width={40} height={24} fill="#2a6fdb" stroke={OUT} strokeWidth={3} />
          </g>
        ))}
        <SignText x={1000} y={830} size={30} fill="#fff" stroke={4}>CIVIL DEFENSE 1962</SignText>
      </g>
      {/* radio on a crate */}
      <rect x={260} y={1510} width={170} height={90} fill="#8a6a44" stroke={OUT} strokeWidth={4} />
      <rect x={270} y={1440} width={150} height={74} rx={10} fill="#3b3b3b" stroke={OUT} strokeWidth={4} />
      <circle cx={310} cy={1477} r={22} fill="#777" stroke={OUT} strokeWidth={3} />
      <rect x={346} y={1460} width={58} height={16} fill={radioOn ? "#7CFC00" : "#203020"} stroke={OUT} strokeWidth={2} />
      <line x1={400} y1={1440} x2={430} y2={1380} stroke={OUT} strokeWidth={4} />
      {radioOn && [0, 1, 2].map((k) => <path key={k} d={`M${440 + k * 18},1440 q14,-20 0,-40`} stroke="#7CFC00" strokeWidth={4} fill="none" opacity={((frame / 6 + k) % 3) / 3} />)}
      {/* candles */}
      {candles > 0 &&
        [[200, 1600], [450, 1510], [740, 1600]].map(([cx, cy], k) => {
          const h = 70 * candles + 10;
          const flick = Math.sin(frame / 2 + k) * 3;
          return (
            <g key={k}>
              <circle cx={cx} cy={cy - h - 20} r={260} fill="url(#candleGlow)" />
              <rect x={cx - 10} y={cy - h} width={20} height={h} fill="#f4ecd6" stroke={OUT} strokeWidth={3} />
              <path d={`M${cx},${cy - h - 36 + flick} q10,18 0,30 q-10,-12 0,-30Z`} fill="#ffb347" stroke="#ff7b00" strokeWidth={2} />
            </g>
          );
        })}
      {/* bulb */}
      <g transform={`rotate(${swing},540,180)`}>
        <line x1={540} y1={180} x2={540} y2={320} stroke={OUT} strokeWidth={4} />
        {bulb && <circle cx={540} cy={350} r={300} fill="url(#bulbGlow)" />}
        <circle cx={540} cy={345} r={26} fill={bulb ? "#fff6c0" : "#6b6b6b"} stroke={OUT} strokeWidth={4} />
      </g>
      {wrapper && (
        <g transform="translate(1000,1590) rotate(-12)">
          <rect x={-70} y={-24} width={140} height={44} rx={6} fill="#5a2d0c" stroke={OUT} strokeWidth={4} />
          <rect x={-40} y={-24} width={80} height={44} fill="#d4af37" stroke={OUT} strokeWidth={3} />
          <SignText x={0} y={6} size={20} fill="#5a2d0c">CHOCO</SignText>
          <path d="M70,-24 l20,-10 l0,54 l-20,-10" fill="#c0c0c0" stroke={OUT} strokeWidth={3} />
        </g>
      )}
      {dustCoat && (
        <g transform="translate(60,1590)">
          <path d="M-60,0 L-40,-60 L40,-60 L60,0 Z" fill="#8a8a8a" stroke={OUT} strokeWidth={4} />
          {Array.from({ length: 8 }, (_, k) => <circle key={k} cx={-40 + k * 11} cy={-20 - (k % 3) * 10} r={4} fill="#ddd" />)}
        </g>
      )}
      {/* floor */}
      <rect x={-300} y={1600} width={1700} height={400} fill={shade("#7c838a", 0.1)} stroke={OUT} strokeWidth={4} />
      {cast.map((c, i) => (
        <Character key={c.id + i} look={CAST[c.id]} x={c.x} y={c.y} frame={frame} seed={i + 30} expr={c.expr} pose={c.pose} scale={c.scale ?? 0.8} flip={c.flip} />
      ))}
    </g>
  );
};
