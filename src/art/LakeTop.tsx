// Plan view of the same lake (TOP plate) and the close-up boot-print plate. World coordinates, 1080 x 1920 home.
// Map scale: ~15 px per metre (60 m = shack door to hole). People are drawn as map symbols at true scale,
// so the middle shots zoom in 5x.
import { castTheme } from "../cast";
import { useMemo } from "react";
import { OUT, rand, shade } from "./kit";
import { HEROES } from "./heroes";
import { castLook } from "../cast";
import { lerp, mix, palette } from "./color";
import type { World } from "../types";

export const T_HOLE: [number, number] = [540, 1150];
export const T_DOOR: [number, number] = [952, 428];
const X0 = -900;
const X1 = 2000;
const Y0 = -700;
const Y1 = 2700;

const dist = Math.hypot(T_DOOR[0] - T_HOLE[0], T_DOOR[1] - T_HOLE[1]);
export const T_U: [number, number] = [(T_DOOR[0] - T_HOLE[0]) / dist, (T_DOOR[1] - T_HOLE[1]) / dist]; // unit vector hole -> shack
export const M_PX = dist / 60; // pixels per metre
const along = (m: number): [number, number] => [T_HOLE[0] + T_U[0] * m * M_PX, T_HOLE[1] + T_U[1] * m * M_PX];

const lookOf = (id: "eli" | "brother") => ({ ...HEROES[id], ...castLook(id, HEROES[id]) });

const GOLDEN = "#F5C518";

// ---- top-down people ---------------------------------------------------------------------------
const TopEli = ({ x, y, ang, roll, spread, frame }: { x: number; y: number; ang: number; roll: number; spread: number; frame: number }) => {
  // symbol drawn in design units (body axis along +y = head at -y), scaled so that Eli is ~26 px long.
  const sq = 0.45 + 0.55 * Math.abs(Math.cos(roll));
  const L = lookOf("eli");
  const wet = shade(L.coat, 0.2);
  return (
    <g transform={`translate(${x},${y}) rotate(${ang}) scale(0.27)`}>
      <ellipse cx={0} cy={6} rx={118} ry={150} fill="#000" opacity={0.18} />
      <g transform={`scale(${sq},1)`}>
        {/* legs */}
        {[-1, 1].map((k) => (
          <g key={k} transform={`rotate(${k * 18},0,40)`}>
            <rect x={-16} y={40} width={32} height={110} rx={15} fill={L.pants} stroke={OUT} strokeWidth={6} />
            <rect x={-20} y={134} width={40} height={34} rx={14} fill={L.boots} stroke={OUT} strokeWidth={6} />
          </g>
        ))}
        {/* arms spread */}
        {[-1, 1].map((k) => (
          <g key={k} transform={`rotate(${k * (118 + spread * 22)},0,-34)`}>
            <rect x={-18} y={-34} width={36} height={122} rx={17} fill={wet} stroke={OUT} strokeWidth={6} />
            <circle cx={0} cy={96} r={20} fill={L.gloves} stroke={OUT} strokeWidth={6} />
          </g>
        ))}
        {/* torso (ember puffy jacket) */}
        <rect x={-48} y={-62} width={96} height={112} rx={36} fill={L.coat} stroke={OUT} strokeWidth={6} />
        {[-24, 6, 36].map((yy) => (
          <path key={yy} d={`M-46,${yy} Q0,${yy + 10} 46,${yy}`} stroke={shade(L.coat, 0.3)} strokeWidth={5} fill="none" />
        ))}
        {/* head + beanie + pompom */}
        <circle cx={0} cy={-86} r={44} fill={L.hat === "none" || L.hat === "cap" ? L.hair : L.hatColor} stroke={OUT} strokeWidth={6} />
        <circle cx={0} cy={-86} r={26} fill="none" stroke={L.hatBand} strokeWidth={8} opacity={0.9} />
        <circle cx={0} cy={-86} r={16} fill={L.hatBand} stroke={OUT} strokeWidth={5} />
      </g>
      {spread > 0 &&
        // spread-weight circles under arms and legs (green = weight shared over more ice)
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sy], i) => {
          const pulse = 0.85 + 0.15 * Math.sin(frame / 6 + i);
          return <circle key={i} cx={sx * 150} cy={sy * 110 + (sy > 0 ? 40 : -20)} r={64 * pulse * spread} fill="#2fd27a" opacity={0.28 * spread} stroke="#2fd27a" strokeWidth={8} strokeDasharray="14 10" />;
        })}
    </g>
  );
};

const TopBrother = ({ x, y, ang, frame }: { x: number; y: number; ang: number; frame: number }) => {
  const s = Math.sin(frame * 0.55);
  const L = lookOf("brother");
  return (
    <g transform={`translate(${x},${y}) rotate(${ang}) scale(0.3)`}>
      <ellipse cx={0} cy={0} rx={120} ry={130} fill="#000" opacity={0.2} />
      {[-1, 1].map((k) => (
        <rect key={k} x={k * 28 - 20} y={30 + k * s * 28} width={40} height={120} rx={18} fill={L.pants} stroke={OUT} strokeWidth={6} />
      ))}
      {[-1, 1].map((k) => (
        <g key={k} transform={`rotate(${-k * s * 26},${k * 70},-30)`}>
          <rect x={k * 70 - 20} y={-100} width={40} height={110} rx={18} fill={L.coat} stroke={OUT} strokeWidth={6} />
          <circle cx={k * 70} cy={-104} r={18} fill={L.gloves} stroke={OUT} strokeWidth={5} />
        </g>
      ))}
      <rect x={-72} y={-62} width={144} height={100} rx={34} fill={L.coat} stroke={OUT} strokeWidth={6} />
      <path d="M-70,-30 H70 M-70,2 H70 M-40,-60 V36 M0,-60 V36 M40,-60 V36" stroke={shade(L.coat, 0.35)} strokeWidth={5} opacity={0.7} />
      <circle cx={0} cy={-70} r={56} fill={L.hat === "trapper" || L.hat === "hood" ? L.hatBand : L.hat === "none" ? L.hair : L.hatColor} stroke={OUT} strokeWidth={6} />
      <circle cx={0} cy={-70} r={40} fill={L.hat === "none" ? L.hair : L.hatColor} stroke={OUT} strokeWidth={5} />
      <rect x={-12} y={-96} width={24} height={52} rx={8} fill="#4A2E1E" opacity={0.5} />
    </g>
  );
};

const Hut = ({ x, y, w, h, body, lit, glow, door, frame, smoke }: { x: number; y: number; w: number; h: number; body: string; lit: string; glow: number; door: number; frame: number; smoke?: boolean }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-w / 2 + 4} y={-h / 2 + 6} width={w} height={h} rx={5} fill="#000" opacity={0.2} />
    {door > 0 && <path d={`M${-w / 2},${h / 2 - 6} L${-w / 2 - 6},${h / 2 + 90} L${w / 2 + 14},${h / 2 + 90} L${w / 2},${h / 2 - 6} Z`} fill={lit} opacity={0.4 * door} />}
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5} fill={body} stroke={OUT} strokeWidth={3} />
    <path d={`M0,${-h / 2} V${h / 2}`} stroke="#000" strokeOpacity={0.25} strokeWidth={3} />
    <rect x={-w / 2 + 3} y={-h / 2 + 3} width={w / 2 - 3} height={h - 6} fill="#fff" opacity={0.1} />
    <circle cx={w * 0.22} cy={-h * 0.22} r={6} fill="#3a3f4b" stroke={OUT} strokeWidth={2} />
    {smoke && <circle cx={w * 0.22 + 8 + Math.sin(frame / 15) * 4} cy={-h * 0.22 - 10 - (frame % 50) * 0.3} r={9 + (frame % 50) * 0.18} fill="#f4eaf0" opacity={0.5 * (1 - (frame % 50) / 50)} />}
    <circle cx={0} cy={h / 2 + 8} r={26} fill={lit} opacity={glow * 0.3} style={{ mixBlendMode: "screen" }} />
    <rect x={-10} y={h / 2 - 3} width={22} height={8} fill={lit} stroke={OUT} strokeWidth={2} />
  </g>
);

const Pines = ({ pts, color, hi }: { pts: [number, number, number][]; color: string; hi: string }) => (
  <g>
    {pts.map(([x, y, r], i) => (
      <g key={i}>
        <circle cx={x + 5} cy={y + 7} r={r} fill="#0b1520" opacity={0.28} />
        <circle cx={x} cy={y} r={r} fill={color} />
        <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.55} fill={hi} opacity={0.5} />
        <circle cx={x} cy={y} r={r * 0.16} fill={OUT} opacity={0.35} />
      </g>
    ))}
  </g>
);

export const LakeTop = ({ frame, local, len, world, props = {} }: { frame: number; local: number; len: number; world: World; props?: Record<string, number | boolean | string> }) => {
  const P = palette(world.dusk, castTheme());
  const t = Math.min(1, local / Math.max(1, len - 1));
  const hole = world.hole;
  const ramp = (name: string, w = 0.12) => (props[`${name}At`] !== undefined ? Math.max(0, Math.min(1, (t - Number(props[`${name}At`])) / w)) : Number(props[name] ?? 0));
  const arrows = ramp("arrows", 0.1);
  const keep = ramp("keep", 0.15); // 0..1 only the green TURN BACK arrow remains
  const path = Number(props.broPath ?? 0);
  const b0 = Number(props.bro0 ?? 0);
  const b1 = Number(props.bro1 ?? b0);
  const bro = Number(props.broShow ?? 0);
  const roll0 = Number(props.roll0 ?? 0);
  const roll1 = Number(props.roll1 ?? roll0);
  const eli = Boolean(props.eli);
  const spread = Number(props.spread ?? 0);
  const glow = ramp("trailGlow", 0.15);
  const door = Number(props.door ?? 0);

  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let x = X0; x < X1; x += 38) {
      const yy = 190 + Math.sin(x / 130) * 26 + rand(x) * 22;
      out.push([x + rand(x * 1.1) * 22, yy - 40 - rand(x * 2.1) * 40, 26 + rand(x * 3.3) * 18]);
      out.push([x + 18 + rand(x * 1.7) * 20, yy - 100 - rand(x * 2.9) * 60, 28 + rand(x * 4.4) * 16]);
    }
    for (let y = 120; y < Y1; y += 40) {
      out.push([-20 + Math.sin(y / 110) * 22 - rand(y) * 28, y, 28 + rand(y * 3.1) * 16]);
      out.push([-90 - rand(y * 2.2) * 40, y + 12, 30 + rand(y * 5.1) * 14]);
      out.push([1115 + Math.sin(y / 100) * 22 + rand(y) * 28, y + 20, 28 + rand(y * 3.7) * 16]);
      out.push([1190 + rand(y * 2.7) * 40, y - 8, 30 + rand(y * 4.1) * 14]);
    }
    return out.filter((p) => !(p[0] > 360 && p[0] < 480 && p[1] > -300 && p[1] < 300)); // creek gap
  }, []);
  const specks = useMemo(() => Array.from({ length: 420 }, (_, i) => ({ x: -100 + rand(i * 2.1) * 1300, y: 200 + rand(i * 3.9) * 2300, r: 1.2 + rand(i * 5.3) * 2.2 })), []);
  const drifts = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: -100 + rand(i * 7.7) * 1300, y: 260 + rand(i * 1.3) * 2200, w: 80 + rand(i * 4.7) * 260, rot: (rand(i * 9.1) - 0.5) * 50 })), []);

  // creek tongue along a cubic centre line
  const centre = (u: number): [number, number] => {
    const a = 1 - u;
    const C = [[420, 255], [430, 640], [560, 820], [540, 1150]] as const;
    return [a * a * a * C[0][0] + 3 * a * a * u * C[1][0] + 3 * a * u * u * C[2][0] + u * u * u * C[3][0], a * a * a * C[0][1] + 3 * a * a * u * C[1][1] + 3 * a * u * u * C[2][1] + u * u * u * C[3][1]];
  };
  const tongue = (() => {
    const L: string[] = [];
    const R: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const [x, y] = centre(u);
      const [x2, y2] = centre(Math.min(1, u + 0.02));
      const [x1, y1] = centre(Math.max(0, u - 0.02));
      const tx = x2 - x1;
      const ty = y2 - y1;
      const n = Math.hypot(tx, ty) || 1;
      const w = lerp(20, 62, Math.pow(u, 0.8));
      L.push(`${x + (ty / n) * w},${y - (tx / n) * w}`);
      R.push(`${x - (ty / n) * w},${y + (tx / n) * w}`);
    }
    return `M${L.join(" L")} L${R.reverse().join(" L")} Z`;
  })();

  // footprints from the shack door to the hole
  const N = 62;
  const prints = Array.from({ length: N }, (_, i) => {
    const u = i / (N - 1);
    const px = lerp(T_DOOR[0], T_HOLE[0], u) + Math.sin(u * 9) * 5;
    const py = lerp(T_DOOR[1] + 40, T_HOLE[1], u);
    const side = i % 2 ? 1 : -1;
    return { x: px + side * 5 * -T_U[1] * 1.2, y: py + side * 5 * T_U[0] * 1.2 };
  });
  const ang = (Math.atan2(T_U[1], T_U[0]) * 180) / Math.PI + 90; // glyph rotation so "up" points along the trail to the shack

  // brother on his straight path
  const bp = lerp(b0, b1, t);
  const bx = lerp(T_DOOR[0], T_HOLE[0], bp);
  const by = lerp(T_DOOR[1] + 40, T_HOLE[1], bp);
  const rollP = lerp(roll0, roll1, t);
  const [ex, ey] = along(1.6 + rollP * 3);
  const rotAng = ang + 90; // body axis perpendicular to the roll direction

  return (
    <g>
      <defs>
        <linearGradient id="tpIce" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="2400">
          <stop offset={0} stopColor={P.iceTop} />
          <stop offset={1} stopColor={P.iceBot} />
        </linearGradient>
        <linearGradient id="tpTongue" gradientUnits="userSpaceOnUse" x1="0" y1="255" x2="0" y2="1200">
          <stop offset={0} stopColor={P.tongueTop} />
          <stop offset={1} stopColor={P.tongueBot} />
        </linearGradient>
        <radialGradient id="tpWarm" cx="0.1" cy="0.3" r="0.9">
          <stop offset={0} stopColor={P.sun} stopOpacity={0.35 * P.sunA} />
          <stop offset={1} stopColor={P.sun} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill={P.deep} />
      {/* shore: snowy trees all round the top and sides */}
      <rect x={X0} y={Y0} width={X1 - X0} height={420 - Y0} fill={P.pinesFar} />
      <Pines pts={trees} color={P.pines} hi={P.pinesFar} />
      {/* lake */}
      <path d={`M-30,330 Q120,${250 + Math.sin(0) * 10} 300,262 L${X1},262 L${X1},${Y1} L-30,${Y1} Z`} fill="url(#tpIce)" />
      <rect x={-60} y={262} width={1260} height={2450} fill="url(#tpIce)" />
      <rect x={-60} y={262} width={1260} height={2450} fill="url(#tpWarm)" />
      {drifts.map((d, i) => (
        <ellipse key={i} cx={d.x} cy={d.y} rx={d.w} ry={d.w * 0.12} fill={P.drift} opacity={0.5} transform={`rotate(${d.rot},${d.x},${d.y})`} />
      ))}
      {specks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.28} />
      ))}
      {/* creek flowing into the lake + the thin clear-ice tongue */}
      <path d="M392,-400 L392,60 Q388,200 392,300 L448,300 Q452,200 448,60 L448,-400 Z" fill={P.creek} />
      <path d={`M${392},-400 L392,300 M448,-400 L448,300`} stroke="#dfeaf6" strokeWidth={5} opacity={0.6} />
      <path d={tongue} fill="url(#tpTongue)" />
      <path d={tongue} fill="none" stroke="#dfeaf6" strokeWidth={4} opacity={0.6} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const [cx, cy] = centre(0.15 + i * 0.14);
        return <path key={i} d={`M${cx - 40},${cy} q22,-8 44,2 l20,-4`} stroke="#aac4de" strokeWidth={3} fill="none" opacity={0.35} />;
      })}

      {/* shack row (plan) */}
      <Hut x={770} y={372} w={74} h={58} body={P.shacks[0][0]} lit={P.window} glow={P.winGlow * 0.5} door={0} frame={frame} />
      <Hut x={862} y={364} w={78} h={60} body={P.shacks[1][0]} lit={P.window} glow={P.winGlow * 0.5} door={0} frame={frame} />
      <Hut x={952} y={368} w={84} h={64} body={P.shacks[2][0]} lit={P.shackLit} glow={1.2} door={door} frame={frame} smoke />
      {/* fishing holes + old tracks scattered over the lake */}
      {Array.from({ length: 16 }, (_, i) => {
        const hx = 120 + rand(i * 5.3) * 880;
        const hy = 520 + rand(i * 3.7) * 1500;
        if (Math.hypot(hx - T_HOLE[0], hy - T_HOLE[1]) < 120) return null;
        return (
          <g key={`fh${i}`}>
            <circle cx={hx} cy={hy} r={13} fill="#f4f6fb" opacity={0.7} />
            <circle cx={hx} cy={hy} r={8} fill="#1b2a42" />
            <path d={`M${hx + 14},${hy + 10} q${40 + rand(i) * 60},${30 + rand(i * 2) * 80} ${rand(i * 9) * 160 - 60},${150 + rand(i * 4) * 120}`} stroke={P.print} strokeWidth={5} strokeDasharray="2 14" strokeLinecap="round" fill="none" opacity={0.6} />
          </g>
        );
      })}
      {/* scuffed paths between the huts */}
      <path d="M770,410 Q860,430 952,412" stroke={P.print} strokeWidth={6} strokeDasharray="2 12" strokeLinecap="round" fill="none" opacity={0.7} />

      {/* footprints, hole to door */}
      {glow > 0 && <path d={`M${T_DOOR[0]},${T_DOOR[1] + 40} L${T_HOLE[0]},${T_HOLE[1]}`} stroke="#2fd27a" strokeWidth={30} strokeLinecap="round" opacity={0.3 * glow} />}
      {glow > 0 && <path d={`M${T_DOOR[0]},${T_DOOR[1] + 40} L${T_HOLE[0]},${T_HOLE[1]}`} stroke="#2fd27a" strokeWidth={10} strokeLinecap="round" opacity={0.4 * glow} />}
      {prints.map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y}) rotate(${ang})`}>
          <ellipse cx={0} cy={-4} rx={7} ry={12} fill={glow > 0 ? "#2fd27a" : P.print} opacity={0.95} />
          <ellipse cx={0} cy={12} rx={5.5} ry={7} fill={glow > 0 ? "#2fd27a" : P.print} opacity={0.95} />
        </g>
      ))}
      {world.wet > 0.02 && (
        <path d={`M${T_HOLE[0] + 6},${T_HOLE[1] - 12} L${ex},${ey}`} stroke="#27345a" strokeWidth={14} strokeLinecap="round" opacity={0.75 * Math.min(1, world.wet)} />
      )}

      {/* cracks around the hole */}
      {hole > 0 && (
        <g transform={`translate(${T_HOLE[0]},${T_HOLE[1]})`} stroke="#eaf3ff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.9}>
          {Array.from({ length: 11 }, (_, i) => {
            const a = (i / 11) * Math.PI * 2 + rand(i * 2.1) * 0.3;
            const L = 55 + rand(i * 4.7) * 70;
            return <path key={i} d={`M0,0 L${Math.cos(a) * L * 0.5},${Math.sin(a) * L * 0.5} L${Math.cos(a + 0.2) * L},${Math.sin(a + 0.2) * L}`} />;
          })}
        </g>
      )}
      {/* the hole */}
      {hole > 0.02 && (
        <g transform={`translate(${T_HOLE[0]},${T_HOLE[1]})`}>
          <circle r={19 * hole} fill="#e6eef8" stroke={OUT} strokeWidth={2.5} />
          <circle r={15 * hole} fill="#0F1B2B" />
          <ellipse cx={-4} cy={-4} rx={6 * hole} ry={3 * hole} fill={P.skyMid} opacity={0.3} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = i * 1.05 + 0.4;
            return <path key={i} d={`M${Math.cos(a) * 22},${Math.sin(a) * 22} l9,-4 l4,8 l-9,5 Z`} fill="#f2f6fb" stroke={OUT} strokeWidth={1.8} transform={`translate(0,${Math.sin(frame / 9 + i) * 1.2})`} />;
          })}
        </g>
      )}

      {/* four faint direction arrows from the hole; three fade, the green one follows the footprints */}
      {arrows > 0 &&
        [0, 1, 2, 3].map((i) => {
          const isKeep = i === 0;
          const a = isKeep ? Math.atan2(T_U[1], T_U[0]) : Math.atan2(T_U[1], T_U[0]) + (i * Math.PI) / 2;
          const op = isKeep ? 1 : 1 - keep;
          const col = isKeep && keep > 0 ? "#2fd27a" : "#dfe8f5";
          const len2 = isKeep && keep > 0 ? 170 : 130;
          const x1 = Math.cos(a) * 34;
          const y1 = Math.sin(a) * 34;
          const x2 = Math.cos(a) * (34 + len2 * arrows);
          const y2 = Math.sin(a) * (34 + len2 * arrows);
          return (
            <g key={i} transform={`translate(${T_HOLE[0]},${T_HOLE[1]})`} opacity={op * arrows * (isKeep && keep > 0 ? 1 : 0.7)}>
              <path d={`M${x1},${y1} L${x2},${y2}`} stroke={OUT} strokeWidth={isKeep && keep > 0 ? 16 : 12} strokeLinecap="round" />
              <path d={`M${x1},${y1} L${x2},${y2}`} stroke={col} strokeWidth={isKeep && keep > 0 ? 10 : 7} strokeLinecap="round" />
              <path d={`M${x2 + Math.cos(a) * 22},${y2 + Math.sin(a) * 22} L${x2 + Math.cos(a + 2.3) * 22},${y2 + Math.sin(a + 2.3) * 22} L${x2 + Math.cos(a - 2.3) * 22},${y2 + Math.sin(a - 2.3) * 22} Z`} fill={col} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            </g>
          );
        })}

      {/* brother's red dashed path + the runner */}
      {path > 0 && (
        <g opacity={path}>
          <path d={`M${T_DOOR[0] - 4},${T_DOOR[1] + 44} L${T_HOLE[0] + 6},${T_HOLE[1] - 20}`} stroke="#e53935" strokeWidth={9} strokeDasharray="22 16" strokeLinecap="round" opacity={0.95} />
          <circle cx={T_HOLE[0]} cy={T_HOLE[1]} r={46} fill="none" stroke="#e53935" strokeWidth={6} strokeDasharray="10 8" opacity={0.9} />
        </g>
      )}
      {bro > 0 && (
        <g opacity={bro}>
          <TopBrother x={bx} y={by} ang={ang + 180} frame={frame} />
        </g>
      )}
      {eli && <TopEli x={ex} y={ey} ang={rotAng} roll={rollP * 15} spread={spread} frame={frame} />}
    </g>
  );
};

// ---------------------------------------------------------------------------------------------
// Close-up plate: one boot print in pink-lit snow (Eli's, with boots stepping in + crack star; or the
// brother's, bigger, with a different tread and no crack).
// ---------------------------------------------------------------------------------------------
const PrintShape = ({ who, fill, hi }: { who: "eli" | "brother"; fill: string; hi: string }) => {
  const k = who === "brother" ? 1.18 : 1;
  const lug = who === "brother";
  return (
    <g transform={`scale(${k})`}>
      <path d="M-70,-120 Q-84,-250 0,-262 Q84,-250 70,-120 Q64,-40 40,10 L40,40 Q60,70 56,150 Q50,208 0,210 Q-50,208 -56,150 Q-60,70 -40,40 L-40,10 Q-64,-40 -70,-120 Z" fill={fill} />
      <path d="M-70,-120 Q-84,-250 0,-262" stroke={hi} strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M-56,150 Q-50,208 0,210" stroke={hi} strokeWidth={8} fill="none" strokeLinecap="round" />
      {/* tread */}
      <g stroke={hi} strokeWidth={7} strokeLinecap="round" opacity={0.7} fill="none">
        {lug
          ? Array.from({ length: 6 }, (_, i) => <path key={i} d={`M-52,${-210 + i * 36} l26,16 l26,-16 l26,16 l26,-16`} />)
          : Array.from({ length: 7 }, (_, i) => <path key={i} d={`M-54,${-210 + i * 30} q54,16 108,0`} />)}
        {Array.from({ length: 3 }, (_, i) => (
          <path key={`h${i}`} d={lug ? `M-34,${100 + i * 34} l17,-10 l17,10 l17,-10 l17,10` : `M-36,${96 + i * 34} q36,12 72,0`} />
        ))}
      </g>
    </g>
  );
};

const Boot = ({ x, y, s, ang, front }: { x: number; y: number; s: number; ang: number; front?: boolean }) => (
  <g transform={`translate(${x},${y}) rotate(${ang}) scale(${s})`}>
    <ellipse cx={14} cy={20} rx={96} ry={170} fill="#000" opacity={front ? 0.3 : 0.2} />
    <path d="M-64,-110 Q-76,-230 0,-244 Q76,-230 64,-110 Q58,-30 38,10 L38,60 Q54,70 50,140 Q44,198 0,200 Q-44,198 -50,140 Q-54,70 -38,60 L-38,10 Q-58,-30 -64,-110 Z" fill="#2A2626" stroke={OUT} strokeWidth={7} />
    <path d="M-50,-112 Q-60,-212 0,-224 Q60,-212 50,-112 Q46,-40 28,0 L-28,0 Q-46,-40 -50,-112 Z" fill="#6B4A32" stroke={OUT} strokeWidth={6} />
    <path d="M-44,-170 Q0,-150 44,-170 M-40,-120 Q0,-100 40,-120" stroke="#3b2a1d" strokeWidth={6} fill="none" />
    <rect x={-44} y={-70} width={88} height={64} rx={14} fill="#8a6446" stroke={OUT} strokeWidth={6} />
    <path d="M-30,-56 H30 M-30,-36 H30 M-30,-18 H30" stroke="#3b2a1d" strokeWidth={5} strokeLinecap="round" />
    {/* cuff + trouser leg seen from above */}
    <circle cx={0} cy={48} r={66} fill="#EFE6D2" stroke={OUT} strokeWidth={7} />
    <circle cx={0} cy={48} r={50} fill="#2E3546" stroke={OUT} strokeWidth={6} />
    <path d="M-34,34 Q-6,14 22,26" stroke="#4a5472" strokeWidth={8} fill="none" strokeLinecap="round" />
  </g>
);

const lift = (c: string) => mix(c, "#b9c4ee", 0.35);

export const LakePrint = ({ frame, local, len, world, props = {} }: { frame: number; local: number; len: number; world: World; props?: Record<string, number | boolean | string> }) => {
  const P = palette(world.dusk, castTheme());
  const who = props.who === "brother" ? "brother" : "eli";
  const t = Math.min(1, local / Math.max(1, len - 1));
  const step = who === "eli" ? Math.min(1, t * 1.9) : 0;
  const crack = world.crack;
  const specks = useMemo(() => Array.from({ length: 220 }, (_, i) => ({ x: -300 + rand(i * 2.7) * 1700, y: -300 + rand(i * 4.3) * 2500, r: 1.6 + rand(i * 8.1) * 3 })), []);
  const drifts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: -200 + rand(i * 6.3) * 1500, y: -200 + rand(i * 1.9) * 2300, w: 160 + rand(i * 5.1) * 320, rot: (rand(i * 9.7) - 0.5) * 30 })), []);
  const rays = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + (rand(i * 3.1) - 0.5) * 0.35;
        const L = 320 + rand(i * 5.7) * 380;
        const pts = Array.from({ length: 6 }, (_, j) => {
          const ja = a + (rand(i * 11 + j) - 0.5) * 0.3;
          return [Math.cos(ja) * (L * j) / 5, Math.sin(ja) * (L * j) / 5] as [number, number];
        });
        return { a, L, pts, br: rand(i * 4.4) };
      }),
    [],
  );
  const cx = 540;
  const cy = 980;
  const brotherSnow = who === "brother";
  return (
    <g>
      <defs>
        <linearGradient id="prSnow" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="2200">
          <stop offset={0} stopColor={lift(P.drift)} />
          <stop offset={1} stopColor={lift(P.iceTop)} />
        </linearGradient>
      </defs>
      <rect x={-600} y={-600} width={2300} height={3200} fill="url(#prSnow)" />
      <rect x={-600} y={-600} width={2300} height={3200} fill={P.sun} opacity={0.12 * P.sunA} />
      {drifts.map((d, i) => (
        <ellipse key={i} cx={d.x} cy={d.y} rx={d.w} ry={d.w * 0.1} fill="#fff" opacity={0.28} transform={`rotate(${d.rot},${d.x},${d.y})`} />
      ))}
      {specks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.4} />
      ))}
      {/* cracks radiating from the print */}
      {crack > 0.01 && (
        <g transform={`translate(${cx},${cy + 10})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {rays.map((r, i) => {
            const g = Math.min(1, crack * (0.65 + r.br * 0.6)) * 5;
            const n = Math.ceil(g);
            const pts = r.pts.slice(0, n + 1);
            const prev = pts[pts.length - 2];
            const last = pts[pts.length - 1];
            const fr = g - (n - 1);
            const end: [number, number] = [prev[0] + (last[0] - prev[0]) * fr, prev[1] + (last[1] - prev[1]) * fr];
            const d = `M0,0 ${pts.slice(1, -1).map((p) => `L${p[0]},${p[1]}`).join(" ")} L${end[0]},${end[1]}`;
            const bp = pts[Math.min(2, pts.length - 1)];
            const br = `M${bp[0]},${bp[1]} l${Math.cos(r.a + 0.9) * 120 * crack},${Math.sin(r.a + 0.9) * 120 * crack}`;
            return (
              <g key={i}>
                <path d={d} stroke="#3b3a6e" strokeWidth={12} opacity={0.6} />
                <path d={br} stroke="#3b3a6e" strokeWidth={9} opacity={0.5} />
                <path d={d} stroke="#f4fbff" strokeWidth={6} />
                <path d={br} stroke="#f4fbff" strokeWidth={4.5} />
              </g>
            );
          })}
        </g>
      )}
      {/* the print */}
      <g transform={`translate(${cx},${cy}) rotate(${who === "eli" ? -4 : 6})`}>
        <PrintShape who={who} fill={mix(P.print, "#1d2447", 0.45)} hi={lift(P.drift)} />
      </g>
      {who === "eli" && (
        <>
          {/* left boot already planted beside, right boot stepping into the print */}
          <Boot x={cx - 250} y={cy + 150 + 30} s={1.0} ang={-6} />
          <Boot x={cx} y={cy - 40 * (1 - step) + 6} s={1 + 0.22 * (1 - step)} ang={-4} front />
        </>
      )}
      {brotherSnow && (
        <g>
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={cx + (rand(i * 3.3) - 0.5) * 520} cy={cy + (rand(i * 5.1) - 0.5) * 760} r={5 + rand(i) * 9} fill="#fff" opacity={0.7} />
          ))}
        </g>
      )}
      <g opacity={0} transform={`translate(${frame},0)`} />
    </g>
  );
};
