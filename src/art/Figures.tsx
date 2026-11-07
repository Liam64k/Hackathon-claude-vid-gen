// Renders a scripted Figure (Eli / brother): animation clock, planted-feet walking, water line clip,
// custom skeletons for the rescue poses, and the red dashed "ghost Eli" double.
import { castLook } from "../cast";
import { useId } from "react";
import { Easing, interpolate } from "remotion";
import { HEROES } from "./heroes";
import { heroPose, pelvisHeight, walkX, WALK_SPEED, type HeroPose } from "./heroPoses";
import { Hero, type HeroLook, type Rim, type Skel } from "./Rig";
import { OUT, rand } from "./kit";
import type { Figure } from "../types";

const GHOST = "#ff3b3b";

// Global defs for ghost rendering (once per svg): flat red fill + dilated ring that gets dashed by a mask.
export const GhostDefs = () => (
  <defs>
    <filter id="ghostFill" x="-700" y="-1000" width="1400" height="1300" filterUnits="userSpaceOnUse">
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.23  0 0 0 0 0.23  0 0 0 1 0" />
    </filter>
    <filter id="ghostRing" x="-700" y="-1000" width="1400" height="1300" filterUnits="userSpaceOnUse">
      <feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d" />
      <feComposite in="d" in2="SourceAlpha" operator="out" result="ring" />
      <feFlood floodColor={GHOST} result="c" />
      <feComposite in="c" in2="ring" operator="in" />
    </filter>
    <pattern id="ghostPat" patternUnits="userSpaceOnUse" width="30" height="30" patternTransform="rotate(38)">
      <rect width="17" height="30" fill="#fff" />
    </pattern>
    <mask id="ghostDash" maskUnits="userSpaceOnUse" x="-700" y="-1000" width="1400" height="1300">
      <rect x="-700" y="-1000" width="1400" height="1300" fill="url(#ghostPat)" />
    </mask>
  </defs>
);

// ---- skeleton helpers -------------------------------------------------------------------------
const mixNum = (a: number | undefined, b: number | undefined, t: number) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * t;
const mixObj = <T extends object>(a: T, b: T, t: number): T => {
  const out: Record<string, unknown> = {};
  const A = a as Record<string, unknown>;
  const B = b as Record<string, unknown>;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const va = A[k];
    const vb = B[k];
    if ((typeof va === "number" || va === undefined) && (typeof vb === "number" || vb === undefined)) out[k] = mixNum(va as number | undefined, vb as number | undefined, t);
    else if (typeof va === "object" && typeof vb === "object" && va && vb) out[k] = mixObj(va as object, vb as object, t);
    else out[k] = t < 0.5 ? va : vb;
  }
  return out as T;
};

const customSkel = (pose: string, frame: number, look: HeroLook, t: number, f: Figure): Skel | null => {
  const k = Math.sin(frame / 5);
  switch (pose) {
    case "waterThree": {
      // chest-deep, turning toward the footprints: 3/4 view, arms reaching forward
      return { view: "three", torso: 4, head: -4, aN: { sh: 58 + 5 * k, el: 30 }, aF: { sh: 48 - 5 * k, el: 34 }, lN: { hip: 10 + 6 * Math.sin(frame / 7), kn: -16 }, lF: { hip: 10 - 6 * Math.sin(frame / 7), kn: -16 } };
    }
    case "panic": {
      // ghost: flailing, splashing
      const a = Math.sin(frame * 0.95);
      const b = Math.cos(frame * 0.85);
      return { view: "front", torso: 6 * a, head: 8 * b, aN: { sh: 95 + 55 * a, el: 40 + 30 * b }, aF: { sh: 95 - 55 * b, el: 40 - 30 * a }, lN: { hip: 14 + 10 * a, kn: -22 }, lF: { hip: 14 - 10 * a, kn: -22 } };
    }
    case "zipper": {
      // ghost: both hands tugging at the zipper
      const a = Math.sin(frame * 0.8);
      return { view: "front", aN: { sh: 18, el: 118 + 8 * a }, aF: { sh: 18, el: 118 - 8 * a }, lN: { hip: 10, kn: -16 }, lF: { hip: 10, kn: -16 } };
    }
    case "waterPicks": {
      // picks in both fists, raised over the ice, chest-deep
      const a = Math.sin(frame / 18) * 4;
      return { view: "three", torso: 6, head: -8, aN: { sh: 120 + a, el: 26, wr: 180 }, aF: { sh: 130 - a, el: 20, wr: 180 }, lN: { hip: 12 + 6 * Math.sin(frame / 7), kn: -16 }, lF: { hip: 12 - 6 * Math.sin(frame / 7), kn: -16 }, hand: { n: "pick", f: "pick" } };
    }
    case "lie": {
      // out of the water, flat on the stomach, wet and shaking
      const slide = heroPose("slide", frame, look);
      return { ...slide, aN: { sh: 156, el: 30, wr: 0 }, aF: { sh: 150, el: 34, wr: 0 }, hand: { n: "mitt", f: "mitt" }, shiver: true };
    }
    case "kickMorph": {
      // upright-ish in the water -> kicking -> flat on the surface. t = 0..1 through the shot.
      const onIce = heroPose("onIce", frame, look);
      const kick = heroPose("kick", frame, look);
      const slide = heroPose("slide", frame, look);
      const a: Skel = { ...onIce, body: 14 };
      const b: Skel = { ...kick, body: 62 };
      const c: Skel = { ...slide, py: 0, body: 88 };
      const m = f.morph ?? [70, 0];
      void m;
      return t < 0.5 ? mixObj(a, b, t / 0.5) : mixObj(b, c, (t - 0.5) / 0.5);
    }
  }
  return null;
};

const ease = Easing.inOut(Easing.cubic);

const Shards = ({ p, seed }: { p: number; seed: number }) => (
  <g>
    {Array.from({ length: 26 }, (_, i) => {
      const a = rand(seed + i * 3.3) * Math.PI * 2;
      const r0 = rand(seed + i * 1.7) * 120;
      const x0 = Math.cos(a) * r0 * 0.7;
      const y0 = -170 - rand(seed + i * 5.1) * 250 + 40;
      const v = 120 + rand(seed + i * 9.3) * 260;
      const x = x0 + Math.cos(a) * v * p;
      const y = y0 + Math.sin(a) * v * p * 0.8 + 180 * p * p;
      const s = 16 + rand(seed + i * 2.9) * 26;
      const rot = (rand(seed + i) - 0.5) * 300 * p;
      return (
        <path key={i} d={`M${-s},${s * 0.5} L${s * 0.2},${-s} L${s},${s * 0.7} Z`} transform={`translate(${x},${y}) rotate(${rot})`} fill="rgba(255,59,59,0.28)" stroke={GHOST} strokeWidth={4} strokeDasharray="9 7" opacity={Math.max(0, 1 - p * 0.9)} />
      );
    })}
  </g>
);

export const FigureEl = ({ f, local, len, id, rim }: { f: Figure; frame?: number; local: number; len: number; id?: string; rim?: Rim | null }) => {
  const uid = `fg${useId().replace(/[^a-zA-Z0-9]/g, "")}${id ?? ""}`;
  const look: HeroLook = { ...HEROES[f.id], ...castLook(f.id, HEROES[f.id]) };
  const span = Math.max(1, len - 1);
  const lt = Math.min(local, (f.hold ?? 1) * span); // frozen local time
  const e = ease(lt / span);
  const scale0 = f.scale ?? 1;
  const scale = f.to?.scale !== undefined ? scale0 + (f.to.scale - scale0) * e : scale0;
  let x = f.x + ((f.to?.x ?? f.x) - f.x) * e;
  const y = f.y + ((f.to?.y ?? f.y) - f.y) * e;
  if (f.walk) x = walkX(f.x, lt, scale0, f.flip);
  const anim = Math.round(lt * (f.speed ?? 1) + (f.seed ?? 0) * 7);
  const skel = f.pose ? customSkel(f.pose, anim, look, lt / span, f) : null;
  const basePose = (skel ? "stand" : (f.pose ?? "stand")) as HeroPose;
  const hero = (ghost: boolean) => (
    <Hero
      look={look}
      x={0}
      y={0}
      frame={anim}
      seed={f.seed ?? (f.id === "eli" ? 3 : 8)}
      pose={basePose}
      view={f.view}
      skel={skel ?? undefined}
      expr={f.expr}
      talk={f.talk}
      scale={1}
      flip={f.flip}
      wet={f.wet}
      breath={f.breath}
      rim={ghost ? null : rim}
      shadow={false}
    />
  );
  const flipX = 1;
  void flipX;

  // ---- ghost ------------------------------------------------------------------------------
  if (f.ghost) {
    const rise = f.rise !== undefined ? interpolate(local / span, [0, f.rise], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 1;
    const shat = f.shatter !== undefined ? interpolate(local / span, [f.shatter, Math.min(1, f.shatter + 0.35)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const crossP = f.cross !== undefined ? interpolate(local / span, [f.cross, f.cross + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const op = (f.to === undefined ? 1 : 1) * rise * (1 - shat);
    const lift = (1 - rise) * 40; // starts inside the real figure and rises out
    const clipId = `${uid}c`;
    return (
      <g transform={`translate(${x},${y - lift}) scale(${scale})`} opacity={op}>
        {f.sub && (
          <defs>
            <clipPath id={clipId}>
              <path d={`M-9000,-9000 H9000 V${(f.sub.y - (y - lift)) / scale} H-9000 Z`} />
            </clipPath>
          </defs>
        )}
        <g clipPath={f.sub ? `url(#${clipId})` : undefined}>
          <g opacity={0.42}>{hero(true)}</g>
          <g opacity={0.14} filter="url(#ghostFill)">{hero(true)}</g>
          <g mask="url(#ghostDash)">
            <g filter="url(#ghostRing)">{hero(true)}</g>
          </g>
        </g>
        {crossP > 0 && (
          <g transform={`translate(0,${-pelvisHeight(look.dims) - 80}) scale(${crossP})`} stroke={GHOST} strokeWidth={30} strokeLinecap="round">
            <path d="M-110,-130 L110,130 M110,-130 L-110,130" stroke={OUT} strokeWidth={46} />
            <path d="M-110,-130 L110,130 M110,-130 L-110,130" />
          </g>
        )}
        {shat > 0 && <Shards p={shat} seed={(f.seed ?? 1) * 17} />}
      </g>
    );
  }

  // ---- real figure --------------------------------------------------------------------------
  const body = (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {f.sub && (
        <defs>
          <clipPath id={`${uid}s`}>
            <path
              d={
                f.sub.x === undefined
                  ? `M-9000,-9000 H9000 V${(f.sub.y - y) / scale} H-9000 Z`
                  : `M-9000,-9000 H9000 V9000 H${(f.sub.x - x) / scale} V${(f.sub.y - y) / scale} H-9000 Z`
              }
            />
          </clipPath>
        </defs>
      )}
      <g clipPath={f.sub && !f.sub.tint ? `url(#${uid}s)` : undefined}>{hero(false)}</g>
      {f.sub?.tint && (
        <rect x={-260 / scale} y={(f.sub.y - y) / scale} width={520 / scale} height={900 / scale} fill="#16263a" opacity={0.86} />
      )}
    </g>
  );
  return body;
};

export const figureStart = (f: Figure, local: number, len: number) => {
  const span = Math.max(1, len - 1);
  const lt = Math.min(local, (f.hold ?? 1) * span);
  const e = ease(lt / span);
  const scale0 = f.scale ?? 1;
  const scale = f.to?.scale !== undefined ? scale0 + (f.to.scale - scale0) * e : scale0;
  const x = f.walk ? walkX(f.x, lt, scale0, f.flip) : f.x + ((f.to?.x ?? f.x) - f.x) * e;
  const y = f.y + ((f.to?.y ?? f.y) - f.y) * e;
  return { x, y, scale };
};
export { WALK_SPEED };
