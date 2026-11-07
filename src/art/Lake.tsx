// The persistent lake world, side view + cross-section in ONE canvas (world coordinates, y grows down):
//   sky / sun / pine shoreline / shack row (far)  ->  horizon y=760
//   lake plane in perspective                     ->  front edge y=1560
//   ice cross-section + moving creek water        ->  below y=1560 (same x as the plane above it)
// State comes from data (World: dusk, crack, hole, wet) so any frame can be rendered alone.
import { castTheme } from "../cast";
import { useContext, useMemo } from "react";
import { CamContext } from "../camera";
import { FigureEl, figureStart } from "./Figures";
import { OUT, rand } from "./kit";
import { lerp, palette } from "./color";
import type { Rim } from "./Rig";
import type { Figure, World } from "../types";

export const HZ = 760; // horizon
export const FE = 1560; // front edge of the lake surface = ice line of the cross-section
export const HX = 1000; // hole / creek mouth x
export const HY = 1330; // hole y on the plane
export const WATERLINE_CUT = FE + 60; // water under the thin ice
const X0 = -1800;
const X1 = 4600;

export const ks = (y: number) => 0.3 + ((y - HZ) / (FE - HZ)) * 1.5; // perspective scale of things standing at depth y

// Ice thickness (cut): thin over the creek mouth, thick elsewhere. 10 px = 1 cm in the diagram.
export const thick = (x: number) => {
  const d = Math.abs(x - HX);
  const k = Math.min(1, Math.max(0, (d - 340) / 220));
  return 60 + 90 * k * k * (3 - 2 * k);
};

// footprint trail: shack door -> point P where Eli leaves it for the creek-mouth shortcut
const TP = [
  [2330, 872],
  [2300, 1180],
  [2000, 1250],
  [1235, 1285],
] as const;
const bez = (t: number): [number, number] => {
  const u = 1 - t;
  const f = (i: 0 | 1) => u * u * u * TP[0][i] + 3 * u * u * t * TP[1][i] + 3 * u * t * t * TP[2][i] + t * t * t * TP[3][i];
  return [f(0), f(1)];
};
export const TRAIL_P: [number, number] = [TP[3][0], TP[3][1]];

const SUN_X = 1250;

// ---- static geometry (memoised) ---------------------------------------------------------------
const pineRow = (seed: number, step: number, hMin: number, hMax: number, gap?: [number, number]) => {
  let d = "";
  for (let x = X0; x < X1; x += step) {
    const xx = x + (rand(x * 0.13 + seed) - 0.5) * step * 0.8;
    if (gap && xx > gap[0] && xx < gap[1]) continue;
    const h = hMin + rand(xx * 0.07 + seed * 3) * (hMax - hMin);
    const w = h * 0.3;
    const b = HZ + 3;
    d += `M${xx - w},${b} L${xx - w * 0.5},${HZ - h * 0.36} L${xx - w * 0.78},${HZ - h * 0.36} L${xx - w * 0.3},${HZ - h * 0.68} L${xx - w * 0.52},${HZ - h * 0.68} L${xx},${HZ - h} L${xx + w * 0.52},${HZ - h * 0.68} L${xx + w * 0.3},${HZ - h * 0.68} L${xx + w * 0.78},${HZ - h * 0.36} L${xx + w * 0.5},${HZ - h * 0.36} L${xx + w},${b} Z `;
  }
  return d;
};
const PINES_BACK = pineRow(1, 20, 55, 105);
const PINES_FRONT = pineRow(2, 26, 80, 150, [938, 1062]);

const Plate = ({ x, y, w, bob, side = false }: { x: number; y: number; w: number; bob: number; side?: boolean }) => (
  <g transform={`translate(${x},${y + bob})`}>
    <path d={`M${-w},2 L${-w * 0.45},${side ? -5 : -8} L${w * 0.5},${side ? -4 : -7} L${w},3 L${w * 0.3},${side ? 8 : 16} L${-w * 0.55},${side ? 7 : 14} Z`} fill="#eef4fb" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
    <path d={`M${-w * 0.55},${side ? 7 : 14} L${w * 0.3},${side ? 8 : 16} L${w},3`} stroke="#9fc0dc" strokeWidth={side ? 4 : 7} fill="none" />
  </g>
);

const Shack = ({ x, y, s, body, roof, lit, glow, door = 0, smoke, frame }: { x: number; y: number; s: number; body: string; roof: string; lit: string; glow: number; door?: number; smoke?: boolean; frame: number }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={70} cy={4} rx={96} ry={9} fill="#000" opacity={0.2} />
    <rect x={-6} y={-6} width={146} height={10} rx={4} fill="#3a2e2a" stroke={OUT} strokeWidth={3} />
    <rect x={0} y={-104} width={132} height={100} fill={body} stroke={OUT} strokeWidth={3.5} />
    <rect x={92} y={-104} width={40} height={100} fill="#000" opacity={0.14} />
    <path d="M-12,-100 L120,-120 L146,-100 Z" fill={roof} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
    <rect x={98} y={-150} width={14} height={40} fill="#3a3f4b" stroke={OUT} strokeWidth={3} />
    {smoke &&
      [0, 1, 2, 3].map((i) => {
        const t = ((frame * 0.7 + i * 30) % 120) / 120;
        return <circle key={i} cx={105 + t * 60 + Math.sin(t * 6 + i) * 8} cy={-156 - t * 150} r={10 + t * 24} fill="#f4eaf0" opacity={0.55 * (1 - t)} />;
      })}
    <circle cx={44} cy={-62} r={70} fill={lit} opacity={glow * 0.35} style={{ mixBlendMode: "screen" }} />
    <rect x={22} y={-80} width={42} height={34} fill={lit} stroke={OUT} strokeWidth={3} />
    <path d="M43,-80 V-46 M22,-63 H64" stroke={OUT} strokeWidth={3} />
    {door > 0 ? (
      <g>
        <path d={`M${78},${-4} L${78},${-60} L${150 + 6},${-52} L${150 + 6},${-4} Z`} fill={lit} opacity={0.55 * door} />
        <path d={`M${78},${-4} L${78},${-60} L${78 - 24 * door},${-64} L${78 - 24 * door},${-6} Z`} fill={shadeDoor(body)} stroke={OUT} strokeWidth={3} />
        <path d={`M${80},${-2} L${150 + 80},${8} L${150 + 40},${40} L${80},${6} Z`} fill={lit} opacity={0.3 * door} transform="translate(0,0)" />
      </g>
    ) : (
      <rect x={78} y={-62} width={34} height={58} fill={shadeDoor(body)} stroke={OUT} strokeWidth={3} />
    )}
  </g>
);
const shadeDoor = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.62);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};

// Crack star on the plane (perspective: y squashed to 0.3). `a` = growth 0..1.
const Cracks = ({ a }: { a: number }) => {
  const rays = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const ang = (i / 11) * Math.PI * 2 + (rand(i * 2.1) - 0.5) * 0.4;
      const L = 150 + rand(i * 4.7) * 190;
      const pts = Array.from({ length: 5 }, (_, j) => {
        const ja = ang + (rand(i * 9 + j) - 0.5) * 0.35;
        const r = (L * j) / 4;
        return [Math.cos(ja) * r, Math.sin(ja) * r * 0.3] as [number, number];
      });
      return { ang, L, pts, br: rand(i * 6.3) };
    });
  }, []);
  if (a <= 0.001) return null;
  return (
    <g transform={`translate(${HX},${HY})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {rays.map((r, i) => {
        const n = Math.max(1, Math.ceil(a * 4 * (0.55 + r.br * 0.6)));
        const pts = r.pts.slice(0, n + 1);
        const last = pts[pts.length - 1];
        const frac = Math.min(1, a * 4 * (0.55 + r.br * 0.6)) - (n - 1);
        const prev = pts[pts.length - 2];
        const end: [number, number] = [prev[0] + (last[0] - prev[0]) * Math.min(1, frac), prev[1] + (last[1] - prev[1]) * Math.min(1, frac)];
        const d = `M0,0 ${pts.slice(1, -1).map((p) => `L${p[0]},${p[1]}`).join(" ")} L${end[0]},${end[1]}`;
        const bx = pts[Math.min(2, pts.length - 1)];
        const branch = `M${bx[0]},${bx[1]} l${Math.cos(r.ang + 0.9) * 60 * a},${Math.sin(r.ang + 0.9) * 60 * 0.3 * a}`;
        return (
          <g key={i}>
            <path d={d} stroke="#0c1424" strokeWidth={7} opacity={0.55} />
            <path d={branch} stroke="#0c1424" strokeWidth={5} opacity={0.5} />
            <path d={d} stroke="#eaf3ff" strokeWidth={3} />
            <path d={branch} stroke="#eaf3ff" strokeWidth={2.4} />
          </g>
        );
      })}
    </g>
  );
};

export const Lake = ({ frame, local, len, world, figures = [], props = {}, rim }: { frame: number; local: number; len: number; world: World; figures?: Figure[]; props?: Record<string, number | boolean | string>; rim?: Rim | null }) => {
  const { cam, home } = useContext(CamContext);
  const P = palette(world.dusk, castTheme());
  const dx = (cam.x - home.x) * 0.1; // far layers lag the camera a little
  const hole = world.hole;
  const gap = 150 * hole;
  const winGlow = P.winGlow;
  const eliFig = figures.find((f) => f.id === "eli" && !f.ghost);
  const eliX = eliFig ? figureStart(eliFig, local, len).x : HX;
  const trailGlow = Number(props.trailGlow ?? 0);
  const arrows = Number(props.current ?? 0.35);
  const ruler = Number(props.ruler ?? 0);
  const air = Number(props.air ?? 0);
  const plates = hole > 0.05;
  const doorOpen = Number(props.door ?? 0);

  // ---- cross-section geometry --------------------------------------------------------------
  const slabPath = (xa: number, xb: number, jaggedA: boolean, jaggedB: boolean) => {
    const step = 40;
    const xs: number[] = [xa];
    for (let x = Math.ceil((xa + 1) / step) * step; x < xb; x += step) xs.push(x);
    xs.push(xb);
    const top = xs.map((x) => `${x},${FE}`);
    const bot = [...xs].reverse().map((x) => `${x},${FE + thick(x)}`);
    // broken edge: zigzag on the gap side
    const zig = (x: number, dir: number) => {
      const t = thick(x);
      return [`${x + dir * 10},${FE + t * 0.35}`, `${x - dir * 4},${FE + t * 0.7}`];
    };
    let d = `M${top[0]} L${top.slice(1).join(" L")}`;
    if (jaggedB) d += ` L${zig(xb, 1).join(" L")}`;
    d += ` L${bot.join(" L")}`;
    if (jaggedA) d += ` L${zig(xa, -1).reverse().join(" L")}`;
    return d + " Z";
  };
  const slabs = gap > 4 ? [slabPath(X0, HX - gap, false, true), slabPath(HX + gap, X1, true, false)] : [slabPath(X0, X1, false, false)];

  // ---- bubbles in the ice (static) + current arrows ----------------------------------------
  const bubbles = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: X0 + 40 + (i * (X1 - X0)) / 70 + rand(i) * 40, y: 8 + rand(i * 3.3) * 40, h: 12 + rand(i * 5) * 40 })), []);
  const stones = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: X0 + rand(i * 2.7) * (X1 - X0), r: 30 + rand(i * 4.1) * 70 })), []);
  const drifts = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: X0 + rand(i * 3.3) * (X1 - X0), y: HZ + 18 + Math.pow(rand(i * 1.9), 1.4) * (FE - HZ - 60), w: 90 + rand(i * 7.1) * 300 })), []);
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({ x: X0 + rand(i * 5.9) * (X1 - X0), y: -300 + rand(i * 8.1) * 760, r: 1.4 + rand(i * 2.3) * 2.6 })), []);

  // footprints along the trail, visible only behind Eli (or all once the hole exists)
  const printCount = 46;
  const prints = Array.from({ length: printCount }, (_, i) => {
    const t = i / (printCount - 1);
    const [x, y] = bez(t);
    const k = ks(y);
    const side = i % 2 ? 1 : -1;
    return { x: x + side * 3, y: y + side * 8 * k, k };
  }).filter((p) => hole > 0.05 || p.x > eliX + 40);
  // the spur from P to the hole (Eli's shortcut)
  const spur = Array.from({ length: 8 }, (_, i) => {
    const t = (i + 1) / 9;
    const x = lerp(TRAIL_P[0], HX + 170, t);
    const y = lerp(TRAIL_P[1], HY + 6, t);
    const k = ks(y);
    const side = i % 2 ? 1 : -1;
    return { x, y: y + side * 8 * k, k };
  }).filter((p) => hole > 0.05 || p.x > eliX + 40);

  const bob = (i: number) => Math.sin(frame / 9 + i * 1.7) * 3;
  const sunA = P.sunA;

  return (
    <g>
      <defs>
        <linearGradient id="lkSky" gradientUnits="userSpaceOnUse" x1="0" y1="-120" x2="0" y2={HZ}>
          <stop offset={0} stopColor={P.skyTop} />
          <stop offset={0.62} stopColor={P.skyMid} />
          <stop offset={1} stopColor={P.skyLow} />
        </linearGradient>
        <radialGradient id="lkSun">
          <stop offset={0} stopColor={P.sun} stopOpacity={1} />
          <stop offset={0.2} stopColor={P.sun} stopOpacity={0.85} />
          <stop offset={0.26} stopColor={P.sun} stopOpacity={0.4} />
          <stop offset={1} stopColor={P.sun} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="lkIce" gradientUnits="userSpaceOnUse" x1="0" y1={HZ} x2="0" y2={FE}>
          <stop offset={0} stopColor={P.iceTop} />
          <stop offset={1} stopColor={P.iceBot} />
        </linearGradient>
        <linearGradient id="lkTongue" gradientUnits="userSpaceOnUse" x1="0" y1={HZ} x2="0" y2={FE}>
          <stop offset={0} stopColor={P.tongueTop} />
          <stop offset={1} stopColor={P.tongueBot} />
        </linearGradient>
        <linearGradient id="lkWater" gradientUnits="userSpaceOnUse" x1="0" y1={FE + 40} x2="0" y2="3700">
          <stop offset={0} stopColor={P.water0} />
          <stop offset={0.16} stopColor={P.water1} />
          <stop offset={0.7} stopColor={P.water2} />
          <stop offset={1} stopColor={P.water3} />
        </linearGradient>
        <linearGradient id="lkSlab" gradientUnits="userSpaceOnUse" x1="0" y1={FE} x2="0" y2={FE + 160}>
          <stop offset={0} stopColor={P.slabTop} />
          <stop offset={1} stopColor={P.slabBot} />
        </linearGradient>
        <linearGradient id="lkSlabX" gradientUnits="userSpaceOnUse" x1={HX - 640} y1="0" x2={HX + 640} y2="0">
          <stop offset={0} stopColor={P.slabSide} />
          <stop offset={0.2} stopColor={P.slabSide} />
          <stop offset={0.34} stopColor="#7eaad0" />
          <stop offset={0.66} stopColor="#7eaad0" />
          <stop offset={0.8} stopColor={P.slabSide} />
          <stop offset={1} stopColor={P.slabSide} />
        </linearGradient>
        <radialGradient id="lkGlint" cx="0.5" cy="0" r="0.8">
          <stop offset={0} stopColor={P.sun} stopOpacity={0.55} />
          <stop offset={1} stopColor={P.sun} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ---------------- sky, sun, stars, pines (far layer, lags the camera by 10 %) ---------------- */}
      <g transform={`translate(${dx},0)`}>
        <rect x={X0 - 400} y={-2400} width={X1 - X0 + 800} height={HZ + 2400 + 6} fill="url(#lkSky)" />
        {P.stars > 0.01 &&
          stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={P.stars * (0.45 + 0.55 * Math.abs(Math.sin(frame / 40 + i)))} />
          ))}
        {sunA > 0.01 && (
          <g opacity={sunA}>
            <circle cx={SUN_X} cy={P.sunY} r={420} fill="url(#lkSun)" />
            <circle cx={SUN_X} cy={P.sunY} r={62} fill={P.sunCore} />
          </g>
        )}
        <path d={PINES_BACK} fill={P.pinesFar} />
        <rect x={X0} y={HZ - 6} width={X1 - X0} height={10} fill={P.pinesFar} />
        <path d={PINES_FRONT} fill={P.pines} />
        <rect x={X0} y={HZ - 14} width={X1 - X0} height={20} fill={P.pines} />
      </g>
      {/* creek channel through the pines */}
      <g>
        <path d={`M${HX - 70},${HZ - 120} L${HX + 70},${HZ - 120} L${HX + 96},${HZ + 4} L${HX - 96},${HZ + 4} Z`} fill={P.pinesFar} opacity={0.85} />
        <path d={`M${HX - 36},${HZ - 100} L${HX + 36},${HZ - 100} L${HX + 62},${HZ + 4} L${HX - 62},${HZ + 4} Z`} fill={P.creek} />
        <path d={`M${HX - 12},${HZ - 98} L${HX + 12},${HZ - 98} L${HX + 20},${HZ + 4} L${HX - 20},${HZ + 4} Z`} fill={P.skyLow} opacity={0.35} />
      </g>

      {/* ---------------- lake plane ---------------- */}
      <rect x={X0} y={HZ} width={X1 - X0} height={FE - HZ} fill="url(#lkIce)" />
      {sunA > 0.01 && <ellipse cx={SUN_X} cy={HZ + 10} rx={120} ry={10} fill={P.sun} opacity={0.6 * sunA} />}
      {sunA > 0.01 && <path d={`M${SUN_X - 60},${HZ} L${SUN_X + 60},${HZ} L${SUN_X + 230},${HZ + 520} L${SUN_X - 230},${HZ + 520} Z`} fill="url(#lkGlint)" opacity={sunA * 0.75} />}
      {drifts.map((d, i) => {
        const k = ks(d.y);
        return <ellipse key={i} cx={d.x} cy={d.y} rx={d.w * (0.4 + k * 0.6)} ry={5 + 12 * k} fill={P.drift} opacity={0.55} />;
      })}
      {/* clear-ice tongue from the creek mouth (thin, moving water below) */}
      <g>
        <path d={`M${HX - 40},${HZ + 2} Q${HX - 80},1100 ${HX - 250},${FE - 32} L${HX + 250},${FE - 32} Q${HX + 80},1100 ${HX + 40},${HZ + 2} Z`} fill="url(#lkTongue)" />
        <path d={`M${HX - 40},${HZ + 2} Q${HX - 80},1100 ${HX - 250},${FE - 32} M${HX + 40},${HZ + 2} Q${HX + 80},1100 ${HX + 250},${FE - 32}`} stroke="#dfeaf6" strokeWidth={5} fill="none" opacity={0.7} />
        <path d={`M${HX - 14},${HZ + 6} Q${HX - 30},1100 ${HX - 150},${FE - 60} L${HX - 60},${FE - 60} Q${HX - 4},1100 ${HX - 4},${HZ + 6} Z`} fill={P.skyMid} opacity={0.2} />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${HX - 200 + i * 90},${1180 + i * 30} q40,-10 80,6 l30,-6`} stroke="#aac4de" strokeWidth={3} fill="none" opacity={0.35} />
        ))}
      </g>
      <Cracks a={world.crack} />

      {/* ---------------- shack row ---------------- */}
      <Shack x={1960} y={812} s={0.8} body={P.shacks[0][0]} roof={P.shacks[0][1]} lit={P.window} glow={winGlow * 0.6} frame={frame} />
      <Shack x={2130} y={818} s={0.85} body={P.shacks[1][0]} roof={P.shacks[1][1]} lit={P.window} glow={winGlow * 0.6} frame={frame} />
      <Shack x={2310} y={824} s={0.95} body={P.shacks[2][0]} roof={P.shacks[2][1]} lit={P.shackLit} glow={Math.max(0.8, winGlow * 1.3)} door={doorOpen} smoke frame={frame} />

      {/* ---------------- footprints + wet drag trail ---------------- */}
      {trailGlow > 0 && (
        <g opacity={trailGlow}>
          <path d={`M${bez(0)[0]},${bez(0)[1]} ${Array.from({ length: 24 }, (_, i) => `L${bez((i + 1) / 24)[0]},${bez((i + 1) / 24)[1]}`).join(" ")} L${HX + 170},${HY + 6}`} stroke="#2fd27a" strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.28} />
          <path d={`M${bez(0)[0]},${bez(0)[1]} ${Array.from({ length: 24 }, (_, i) => `L${bez((i + 1) / 24)[0]},${bez((i + 1) / 24)[1]}`).join(" ")} L${HX + 170},${HY + 6}`} stroke="#2fd27a" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.35} />
        </g>
      )}
      {[...prints, ...spur].map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          <ellipse cx={0} cy={0} rx={12 * p.k} ry={4.4 * p.k} fill={trailGlow > 0 ? mixGreen(P.print, trailGlow) : P.print} opacity={0.9} />
          <ellipse cx={14 * p.k} cy={0} rx={4.5 * p.k} ry={3 * p.k} fill={trailGlow > 0 ? mixGreen(P.print, trailGlow) : P.print} opacity={0.9} />
        </g>
      ))}
      {world.wet > 0.02 && (
        <g opacity={Math.min(1, world.wet) * 0.8}>
          <path d={`M${HX + 150},${HY + 14} Q${HX + 450},${HY + 40} ${HX + 700 * Math.min(1, world.wet)},1292`} stroke="#27345a" strokeWidth={26} strokeLinecap="round" fill="none" />
          <ellipse cx={HX + 190} cy={HY + 20} rx={90} ry={16} fill="#27345a" opacity={0.8} />
        </g>
      )}

      {/* ---------------- the hole (plane) ---------------- */}
      {hole > 0.02 && (
        <g>
          <ellipse cx={HX} cy={HY + 4} rx={(190 + 22) * hole} ry={(48 + 10) * hole} fill="#e6eef8" stroke={OUT} strokeWidth={3} />
          <ellipse cx={HX} cy={HY} rx={190 * hole} ry={48 * hole} fill="#0F1B2B" />
          <path d={`M${HX - 190 * hole},${HY} A${190 * hole},${48 * hole} 0 0 1 ${HX + 190 * hole},${HY} A${180 * hole},${32 * hole} 0 0 0 ${HX - 190 * hole},${HY} Z`} fill="#9fc0dc" />
          <ellipse cx={HX - 40 * hole} cy={HY + 14 * hole} rx={80 * hole} ry={9 * hole} fill={P.skyMid} opacity={0.25} />
          {plates &&
            [
              [-150, 4, 40],
              [128, -2, 44],
              [-70, 28, 38],
              [92, 26, 34],
              [-20, -16, 30],
            ].map(([px, py, w], i) => <Plate key={i} x={HX + px * hole} y={HY + py * hole} w={w * hole} bob={bob(i)} side />)}
        </g>
      )}

      {/* ---------------- cross-section ---------------- */}
      <g>
        <rect x={X0} y={FE - 4} width={X1 - X0} height={6} fill="#f6f9fc" />
        <rect x={X0} y={FE + 20} width={X1 - X0} height={3700 - FE} fill="url(#lkWater)" />
        {/* lake bed */}
        <rect x={X0} y={3520} width={X1 - X0} height={400} fill={P.water3} />
        {stones.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={3530} rx={s.r} ry={s.r * 0.35} fill="#13292c" />
        ))}
        {/* moving water: current arrows streaming right under the thin ice */}
        <g opacity={arrows} stroke="#6fb3ff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {[0, 1, 2, 3].map((row) =>
            Array.from({ length: 8 }, (_, i) => {
              const sp = 2.6 + row * 0.5;
              const x = X0 + 400 + ((i * 360 + frame * sp + row * 140) % 2880) - 1400 + 1400;
              const xx = HX - 900 + ((i * 260 + frame * sp + row * 90) % 2100);
              void x;
              const y = FE + 130 + row * 78 + Math.sin(frame / 20 + i + row) * 5;
              const a = Math.min(1, Math.max(0, 1 - Math.abs(xx - HX) / 1000));
              return (
                <g key={`${row}${i}`} opacity={a}>
                  <path d={`M${xx},${y} h90 M${xx + 74},${y - 13} L${xx + 94},${y} L${xx + 74},${y + 13}`} />
                </g>
              );
            }),
          )}
        </g>
        {/* bubbles drifting up through the water column */}
        {Array.from({ length: 18 }, (_, i) => {
          const bx = HX - 800 + rand(i * 4.3) * 1600 + Math.sin((frame + i * 20) / 30) * 12;
          const by = 3400 - ((frame * (0.9 + rand(i) * 0.8) + rand(i * 2.2) * 1700) % 1700);
          return <circle key={`b${i}`} cx={bx} cy={by} r={4 + rand(i * 7.7) * 7} fill="none" stroke="#8fc6ff" strokeWidth={2.5} opacity={0.35} />;
        })}
        {/* ice slab */}
        {slabs.map((d, i) => (
          <g key={i}>
            <path d={d} fill="url(#lkSlabX)" />
            <path d={d} fill="url(#lkSlab)" opacity={0.55} />
            <path d={d} fill="none" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
          </g>
        ))}
        {bubbles
          .filter((b) => !(gap > 4 && Math.abs(b.x - HX) < gap + 12))
          .map((b, i) => (
            <path key={i} d={`M${b.x},${FE + b.y} v${Math.min(b.h, thick(b.x) - b.y - 6)}`} stroke="#fff" strokeWidth={3} opacity={0.45} strokeLinecap="round" />
          ))}
        <rect x={X0} y={FE - 3} width={X1 - X0} height={8} fill="#f6f9fc" opacity={gap > 4 ? 0 : 0.0} />
        {/* hole gap: dark cavity above the waterline */}
        {gap > 4 && (
          <g>
            <rect x={HX - gap} y={FE - 2} width={gap * 2} height={WATERLINE_CUT - FE + 2} fill="#0d1826" opacity={0.95} />
            <rect x={HX - gap} y={WATERLINE_CUT} width={gap * 2} height={14} fill="#5e86a8" opacity={0.55} />
          </g>
        )}
      </g>

      {/* raised, unbroken ice edge beside the hole (forearms rest on it) */}
      {Number(props.edgeLip ?? 0) > 0 && hole > 0.9 && (
        <g>
          <path d={`M${HX + 168},${HY + 12} L${HX + 176},${HY - 34} Q${HX + 300},${HY - 62} ${HX + 470},${HY - 44} L${HX + 500},${HY + 14} Z`} fill="#eef4fb" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M${HX + 168},${HY + 12} L${HX + 500},${HY + 14} L${HX + 498},${HY + 32} L${HX + 172},${HY + 30} Z`} fill="#9fc0dc" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
        </g>
      )}

      {/* ---------------- figures ---------------- */}
      {figures
        .filter((f) => !f.ghost)
        .sort((a, b) => a.y - b.y)
        .map((f, i) => (
          <g key={i}>
            <FigureEl f={f} frame={frame} local={local} len={len} id={`${i}`} rim={rim} />
          </g>
        ))}

      {/* waterline ripples around figures standing in the hole (plane) */}
      {figures
        .filter((f) => f.sub && !f.sub.tint && !f.ghost)
        .map((f, i) => {
          const p = figureStart(f, local, len);
          const w = 78 * p.scale;
          const ph = (frame % 54) / 54;
          return (
            <g key={i}>
              <ellipse cx={p.x} cy={f.sub!.y + 4} rx={w * 1.15} ry={14 * p.scale} fill="#16263a" />
              <ellipse cx={p.x} cy={f.sub!.y + 2} rx={w * 1.15} ry={14 * p.scale} fill="none" stroke="#9fc0dc" strokeWidth={4} opacity={0.6} />
              <ellipse cx={p.x} cy={f.sub!.y + 8} rx={w * (1.2 + ph * 0.7)} ry={(14 + ph * 10) * p.scale} fill="none" stroke="#cfe3f5" strokeWidth={3} opacity={0.5 * (1 - ph)} />
            </g>
          );
        })}

      {/* trapped air: pale pockets in the submerged jacket + rising arrows */}
      {air > 0 && eliFig && (
        <g opacity={air}>
          {(() => {
            const p = figureStart(eliFig, local, len);
            return (
              <g transform={`translate(${p.x},${(eliFig.sub?.y ?? WATERLINE_CUT) + 22})`}>
                {[
                  [-44, 14, 26, 15],
                  [30, 24, 30, 17],
                  [-8, 44, 22, 13],
                  [52, 58, 20, 12],
                  [-56, 66, 22, 13],
                ].map(([x, y, rx, ry], i) => (
                  <ellipse key={i} cx={x} cy={y + Math.sin(frame / 12 + i) * 3} rx={rx} ry={ry} fill="#e8f6ff" stroke="#fff" strokeWidth={2.5} opacity={0.8} />
                ))}
                {[-60, 0, 60].map((x, i) => {
                  const t = ((frame * 1.2 + i * 22) % 66) / 66;
                  return (
                    <g key={i} transform={`translate(${x},${90 - t * 120})`} opacity={1 - t} stroke="#bfe8ff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d="M0,30 V0 M-14,14 L0,-2 L14,14" />
                    </g>
                  );
                })}
              </g>
            );
          })()}
        </g>
      )}

      {/* ice chips thrown by the pick tips */}
      {Number(props.chips ?? 0) > 0 && eliFig && (() => {
        const p = figureStart(eliFig, local, len);
        return (
          <g transform={`translate(${p.x + 330 * p.scale},${p.y - 30 * p.scale})`}>
            {Array.from({ length: 10 }, (_, i) => {
              const t = ((frame + i * 5) % 26) / 26;
              const vx = (rand(i * 3.1) - 0.2) * 150;
              return <path key={i} d="M-7,4 L0,-9 L8,5 Z" transform={`translate(${vx * t},${-t * 80 + t * t * 110}) rotate(${t * 240 * (i % 2 ? 1 : -1)})`} fill="#f4f8fc" stroke={OUT} strokeWidth={2.5} opacity={1 - t * t} />;
            })}
          </g>
        );
      })()}
      {/* distance dimension line: hole rim -> Eli (3 m) */}
      {Number(props.dim ?? 0) > 0 && eliFig && (() => {
        const p = figureStart(eliFig, local, len);
        const x0 = HX + 212;
        const x1 = p.x - 20;
        const y = HY + 130;
        return (
          <g stroke="#ffffff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9}>
            <path d={`M${x0},${y} H${x1} M${x0},${y - 22} V${y + 22} M${x1},${y - 22} V${y + 22}`} stroke={OUT} strokeWidth={9} />
            <path d={`M${x0},${y} H${x1} M${x0},${y - 22} V${y + 22} M${x1},${y - 22} V${y + 22}`} strokeDasharray="1 0" />
          </g>
        );
      })()}
      {/* red down arrow beside the ghost's jacket ("heavy jacket drags you down") */}
      {Number(props.dArrow ?? 0) > 0 && (
        <g transform={`translate(1350,${1545 + Math.sin(frame / 6) * 6})`} fill="rgba(255,59,59,0.35)" stroke="#ff3b3b" strokeWidth={6} strokeDasharray="14 9" strokeLinejoin="round">
          <path d="M-22,0 H22 V70 H48 L0,140 L-48,70 H-22 Z" />
        </g>
      )}

      {/* plates + ruler */}
      {gap > 4 &&
        [
          [-gap + 36, 0, 44],
          [gap - 40, 0, 46],
          [gap * 0.45, 0, 34],
        ].map(([px, , w], i) => <Plate key={i} x={HX + px} y={WATERLINE_CUT - 12} w={w} bob={bob(i + 3)} />)}
      {ruler > 0 && (
        <g opacity={Math.min(1, ruler * 2)}>
          <g transform={`translate(1262,${FE - 8})`}>
            <rect x={-5} y={0} width={26} height={110 * Math.min(1, ruler * 1.6)} rx={3} fill="#F5C518" stroke={OUT} strokeWidth={3} />
            {Array.from({ length: 11 }, (_, i) => (
              <path key={i} d={`M-5,${i * 10 + 8} h${i % 5 === 0 ? 22 : 12}`} stroke={OUT} strokeWidth={2.5} opacity={i * 10 + 8 < 110 * Math.min(1, ruler * 1.6) ? 1 : 0} />
            ))}
          </g>
          <path d={`M${HX + gap + 20},${FE + 60} H${1262 + 10}`} stroke="#F5C518" strokeWidth={4} strokeDasharray="10 7" />
        </g>
      )}
    </g>
  );
};

const mixGreen = (c: string, t: number) => {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (a: number, z: number) => Math.round(a + (z - a) * t * 0.9);
  return `#${[m(r, 47), m(g, 210), m(b, 122)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
