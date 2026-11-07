import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEROES } from "../art/heroes";
import { Hero, HeroHead, type HeroExpr, type HeroProps } from "../art/Rig";
import { UI_FONT } from "../art/fonts";

// Dev-only pose / expression sheet for the channel heroes. 2160x1920: Eli left, brother right.
const INK = "#1d2433";

const Label = ({ x, y, children, size = 36 }: { x: number; y: number; children: string; size?: number }) => (
  <text x={x} y={y} fontSize={size} fontFamily={UI_FONT} fontWeight={900} textAnchor="middle" fill={INK}>
    {children}
  </text>
);

const Ground = ({ x0, x1, y }: { x0: number; x1: number; y: number }) => <line x1={x0} x2={x1} y1={y} y2={y} stroke="#9fb0c4" strokeWidth={4} />;

const Water = ({ x, y, w, h, a = 1 }: { x: number; y: number; w: number; h: number; a?: number }) => (
  <g opacity={a}>
    <rect x={x} y={y} width={w} height={h} fill="#16263a" />
    <rect x={x} y={y - 3} width={w} height={7} fill="#5e86a8" />
  </g>
);

const Ice = ({ x, y, w, h = 36 }: { x: number; y: number; w: number; h?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="#e9eef5" stroke="#1d1a24" strokeWidth={4} />
    <rect x={x} y={y + h - 12} width={w} height={12} fill="#b7c3d9" />
  </g>
);

const EXPRS: HeroExpr[] = ["calm", "scared", "focused", "relieved", "shouting", "closed"];

export const CastSheet = () => {
  const frame = useCurrentFrame();
  const eli = HEROES.eli;
  const bro = HEROES.brother;
  const E = (p: Omit<HeroProps, "look" | "frame"> & { frame?: number }) => <Hero look={eli} frame={frame} {...p} />;
  const B = (p: Omit<HeroProps, "look" | "frame"> & { frame?: number }) => <Hero look={bro} frame={frame} {...p} />;
  const s1 = 0.95;
  const s2 = 0.85;

  return (
    <AbsoluteFill style={{ background: "#cdd7e2" }}>
      <svg viewBox="0 0 2160 1920" width={2160} height={1920}>
        <rect x={1080} width={1080} height={1920} fill="#c3cfdc" />
        {/* ---------------- ELI ---------------- */}
        <Label x={540} y={86} size={54}>ELI · CHANNEL HERO</Label>
        {[0, 1, 2, 3].map((i) => <Ground key={i} x0={40 + i * 255} x1={250 + i * 255} y={600} />)}
        {E({ x: 150, y: 600, scale: s1, view: "front", seed: 1 })}
        {E({ x: 405, y: 600, scale: s1, view: "three", seed: 2 })}
        {E({ x: 650, y: 600, scale: s1, view: "side", seed: 3 })}
        {E({ x: 915, y: 600, scale: s1, view: "back", seed: 4 })}
        <Label x={150} y={652}>FRONT</Label>
        <Label x={405} y={652}>3/4</Label>
        <Label x={660} y={652}>PROFILE</Label>
        <Label x={915} y={652}>BACK</Label>

        {[0, 1, 2, 3].map((i) => <Ground key={i} x0={40 + i * 255} x1={250 + i * 255} y={1110} />)}
        {E({ x: 120, y: 1110, scale: s1, pose: "walk", seed: 5, breath: true })}
        {E({ x: 390, y: 1110, scale: s1, pose: "picks", expr: "focused", seed: 6 })}
        {E({ x: 620, y: 1110, scale: s1, pose: "point", expr: "shouting", seed: 7 })}
        {E({ x: 930, y: 1110, scale: s1, pose: "run", expr: "scared", seed: 8, frame: frame + 3 })}
        <Label x={150} y={1162}>WALK</Label>
        <Label x={400} y={1162}>PICKS</Label>
        <Label x={655} y={1162}>POINT</Label>
        <Label x={925} y={1162}>RUN</Label>

        {/* in-water poses: chest-deep, arms on ice, kick flat */}
        {E({ x: 148, y: 1560, scale: 0.76, pose: "water", expr: "scared", seed: 9 })}
        <Water x={22} y={1560 - 226 * 0.76} w={252} h={226 * 0.76 + 10} />
        {E({ x: 330, y: 1560, scale: s2, pose: "onIce", expr: "focused", seed: 10, shadow: false })}
        <Water x={280} y={1560 - 198 * s2} w={240} h={198 * s2 + 10} a={0.9} />
        <Ice x={330 + 55 * s2} y={1560 - 204 * s2} w={200 - 55 * s2} />
        {E({ x: 600, y: 1560, scale: s2, pose: "kick", expr: "focused", seed: 11, shadow: false })}
        <Water x={540} y={1560 - 154 * s2} w={260} h={154 * s2 + 10} a={0.55} />
        <Ice x={600 + 125 * s2} y={1560 - 156 * s2} w={200 - 125 * s2 + 60} />
        <Ground x0={830} x1={1050} y={1560} />
        {E({ x: 905, y: 1560, scale: s2, pose: "shiver", expr: "scared", seed: 12, wet: true })}
        <Label x={150} y={1612}>WATER</Label>
        <Label x={400} y={1612}>ON ICE</Label>
        <Label x={660} y={1612}>KICK</Label>
        <Label x={935} y={1612}>SHIVER</Label>

        <Ground x0={40} x1={520} y={1820} />
        {E({ x: 210, y: 1820, scale: 0.8, pose: "slide", expr: "focused", seed: 13, wet: true })}
        {E({ x: 760, y: 1800, scale: 0.8, pose: "roll", expr: "focused", seed: 14, shadow: false })}
        <Label x={280} y={1886}>SLIDE</Label>
        <Label x={800} y={1886}>ROLL (TOP VIEW)</Label>

        {/* ---------------- BROTHER ---------------- */}
        <Label x={1620} y={86} size={54}>BROTHER · PARKA</Label>
        {[0, 1, 2, 3].map((i) => <Ground key={i} x0={1120 + i * 255} x1={1330 + i * 255} y={640} />)}
        {B({ x: 1230, y: 640, scale: s1, view: "front", seed: 21 })}
        {B({ x: 1485, y: 640, scale: s1, view: "three", seed: 22 })}
        {B({ x: 1735, y: 640, scale: s1, view: "side", seed: 23 })}
        {B({ x: 1995, y: 640, scale: s1, view: "back", seed: 24 })}
        <Label x={1230} y={692}>FRONT</Label>
        <Label x={1485} y={692}>3/4</Label>
        <Label x={1740} y={692}>PROFILE</Label>
        <Label x={1995} y={692}>BACK</Label>

        {[0, 1, 2, 3].map((i) => <Ground key={i} x0={1120 + i * 255} x1={1330 + i * 255} y={1160} />)}
        {B({ x: 1230, y: 1160, scale: s1, pose: "run", expr: "shouting", seed: 25, breath: true, frame: frame + 8 })}
        {B({ x: 1455, y: 1160, scale: s1, pose: "point", expr: "shouting", seed: 26 })}
        {B({ x: 1720, y: 1160, scale: s1, pose: "walk", seed: 27 })}
        {B({ x: 1995, y: 1160, scale: s1, view: "front", expr: "calm", talk: true, seed: 28 })}
        <Label x={1230} y={1212}>RUN</Label>
        <Label x={1490} y={1212}>POINT</Label>
        <Label x={1745} y={1212}>WALK</Label>
        <Label x={1995} y={1212}>TALK</Label>

        {/* expressions: Eli then brother, 4 per row */}
        {[...EXPRS.map((e) => ({ look: eli, e })), ...EXPRS.map((e) => ({ look: bro, e }))].map(({ look, e }, i) => {
          const cx = 1080 + 135 + (i % 4) * 270;
          const cy = 1262 + Math.floor(i / 4) * 222;
          return (
            <g key={i}>
              <HeroHead look={look} x={cx} y={cy + 92} frame={frame} expr={e} view={i % 2 === 0 ? "front" : "three"} scale={0.82} seed={i} />
              <Label x={cx} y={cy + 206} size={34}>{e.toUpperCase()}</Label>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
