// Channel hero rig (Eli + brother). Forward-kinematics SVG puppet: every body part is its own
// pivot group (pelvis > torso > head / upper arm > forearm > hand; pelvis > thigh > shin > foot),
// eyes / brows / mouth are separate elements. Everything is a pure function of the frame.
// Origin = between the feet on the ground; facing +x in side and 3/4 views.
import { useId, type ReactNode } from "react";
import { OUT, rand, shade } from "./kit";
import { heroPose, pelvisHeight, type HeroPose } from "./heroPoses";

export type View = "front" | "three" | "side" | "back";
export type HeroExpr = "calm" | "scared" | "focused" | "relieved" | "shouting" | "closed";
export type HandKind = "mitt" | "point" | "pick";

export type Outfit = "puffy" | "parka" | "jacket" | "tshirt" | "hoodie" | "scrubs" | "suit" | "hivis" | "uniform" | "apron" | "dress";
export type HairStyle = "short" | "long" | "bun" | "curly" | "buzz" | "bald";
export type Age = "kid" | "teen" | "adult" | "elder";
const WINTER = ["puffy", "parka", "jacket"];
export const outfitOf = (l: HeroLook): Outfit => (l.outfit ?? l.coatKind ?? "jacket") as Outfit;

// Age scales the body dims; kids keep a proportionally bigger head (~0.62 of adult height).
const AGE: Record<Age, { b: number; r: number; w: number; a: number; k: number }> = {
  kid: { b: 0.5, r: 0.9, w: 0.72, a: 0.72, k: 0.66 },
  teen: { b: 0.85, r: 0.94, w: 0.88, a: 0.9, k: 0.9 },
  adult: { b: 1, r: 1, w: 1, a: 1, k: 1 },
  elder: { b: 0.96, r: 1, w: 1, a: 0.95, k: 1 },
};
const ageLook = (l: HeroLook): HeroLook => {
  const A = AGE[l.age ?? "adult"];
  if (!A || l.age === undefined || l.age === "adult") return l;
  const d = l.dims;
  const dims: Dims = { R: Math.round(d.R * A.r), T: Math.round(d.T * A.b), W: Math.round(d.W * A.w), hem: Math.round(d.hem * A.b), upper: Math.round(d.upper * A.b), fore: Math.round(d.fore * A.b), thigh: Math.round(d.thigh * A.b), shin: Math.round(d.shin * A.b), armW: Math.round(d.armW * A.a), legW: Math.round(d.legW * A.a) };
  return { ...l, dims, facial: l.age === "kid" ? "none" : l.facial };
};
const kOf = (l: HeroLook) => AGE[l.age ?? "adult"]?.k ?? 1;

export interface Arm { sh: number; el: number; wr?: number; az?: number }
export interface Leg { hip: number; kn: number; an?: number; fs?: number; fz?: number }
export interface Skel {
  view: View;
  px?: number;
  py?: number; // pelvis drop from its standing height (+ = lower)
  body?: number;
  torso?: number;
  head?: number;
  aN: Arm; // near arm (front/back view: screen-right arm)
  aF: Arm;
  lN: Leg;
  lF: Leg;
  hand?: { n?: HandKind; f?: HandKind };
  shiver?: boolean;
  squash?: number;
}

export interface Dims { R: number; T: number; W: number; hem: number; upper: number; fore: number; thigh: number; shin: number; armW: number; legW: number }

export interface HeroLook {
  name: string;
  skin: string;
  hair: string;
  coat: string; // signature colour
  coatKind: "puffy" | "parka" | "jacket";
  outfit?: Outfit; // falls back to coatKind
  hairStyle?: HairStyle; // visible when hat is none / cap
  age?: Age;
  glasses?: boolean;
  backpack?: boolean;
  trim: string;
  pants: string;
  boots: string;
  sole: string;
  gloves: string;
  hat: "beanie" | "trapper" | "cap" | "hood" | "helmet" | "hardhat" | "none";
  hatColor: string;
  hatBand: string;
  facial: "none" | "stubble" | "beard";
  picks?: boolean;
  dims: Dims;
}

export interface Rim { color: string; side: 1 | -1; w?: number }
type LocalRim = { color: string; side: number; w: number } | null;

export const PICK = { handle: "#F2EEE4", cap: "#3A3F4B", steel: "#C9D3DC", cord: "#2B2F3A" };
const MOUTH = "#5d1414";
const D2R = Math.PI / 180;

const torsoW = (v: View, W: number) => W * { front: 1, back: 1, three: 0.86, side: 0.68 }[v];
const faceX = (v: View, R: number) => ({ front: 0, back: 0, three: 0.34 * R, side: 0.6 * R })[v];
const shoulderXs = (v: View, W: number): [number, number] =>
  v === "three" ? [-0.31 * W, 0.37 * W] : v === "side" ? [6, -8] : [W / 2 - 14, -(W / 2 - 14)];
const hipXs = (v: View, W: number): [number, number] => (v === "three" ? [-0.12 * W, 0.14 * W] : v === "side" ? [4, -6] : [0.2 * W, -0.2 * W]);
const flat = (v: View) => v === "front" || v === "back";

const circleD = (r: number, cx = 0, cy = 0) => `M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`;

// Flat fill + clipped cel details + warm rim crescent + outline.
const Cel = ({ id, d, fill, rim, children, sw = 4 }: { id: string; d: string; fill: string; rim: LocalRim; children?: ReactNode; sw?: number }) => (
  <g>
    <defs>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
    </defs>
    <path d={d} fill={rim ? rim.color : fill} />
    <g clipPath={`url(#${id})`}>
      {rim && <path d={d} fill={fill} transform={`translate(${-rim.side * rim.w},${rim.w * 0.6})`} />}
      {children}
    </g>
    <path d={d} fill="none" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
  </g>
);

const Tube = ({ len, w, color, crease }: { len: number; w: number; color: string; crease?: string }) => (
  <g fill="none" strokeLinecap="round">
    <path d={`M0,0 L0,${len}`} stroke={OUT} strokeWidth={w + 8} />
    <path d={`M0,0 L0,${len}`} stroke={color} strokeWidth={w} />
    {crease && <path d={`M${-w / 2 + 6},${len * 0.55} q${w / 2 - 6},7 ${w - 12},0`} stroke={crease} strokeWidth={3} />}
  </g>
);

const HandEl = ({ kind, color, sign }: { kind: HandKind; color: string; sign: number }) => {
  if (kind === "pick")
    return (
      <g transform={`scale(${sign},1)`}>
        <rect x={-18} y={5} width={38} height={15} rx={7} fill={PICK.handle} stroke={OUT} strokeWidth={3} />
        <path d="M18,7.5 L46,12.5 L18,17.5 Z" fill={PICK.steel} stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={0} cy={12} r={15} fill={color} stroke={OUT} strokeWidth={4} />
        <path d="M-7,5 q7,4 14,0" stroke={shade(color, 0.35)} strokeWidth={3} fill="none" />
      </g>
    );
  if (kind === "point")
    return (
      <g transform={`scale(${sign},1)`}>
        <path d="M0,16 L0,42" stroke={OUT} strokeWidth={19} strokeLinecap="round" />
        <path d="M0,16 L0,42" stroke={color} strokeWidth={11} strokeLinecap="round" />
        <circle cx={0} cy={12} r={15} fill={color} stroke={OUT} strokeWidth={4} />
      </g>
    );
  return (
    <g transform={`scale(${sign},1)`}>
      <ellipse cx={0} cy={14} rx={15} ry={18} fill={color} stroke={OUT} strokeWidth={4} />
      <ellipse cx={12} cy={6} rx={7} ry={9} fill={color} stroke={OUT} strokeWidth={3} />
    </g>
  );
};

const Boot = ({ look, front, fz = 1, far, cuff = true, low = false }: { look: HeroLook; front: boolean; fz?: number; far: boolean; cuff?: boolean; low?: boolean }) => {
  const b = far ? shade(look.boots, 0.14) : look.boots;
  const bs = 1 - (1 - kOf(look)) * 0.35;
  return (
    <g transform={`scale(${fz * bs})`}>
      <rect x={-19} y={low ? -14 : -30} width={38} height={low ? 18 : 34} rx={8} fill={b} stroke={OUT} strokeWidth={4} />
      {front ? (
        <>
          <rect x={-25} y={-10} width={50} height={26} rx={13} fill={b} stroke={OUT} strokeWidth={4} />
          <rect x={-27} y={12} width={54} height={10} rx={5} fill={look.sole} stroke={OUT} strokeWidth={3} />
        </>
      ) : (
        <>
          <path d="M-21,-8 L-21,14 L44,14 Q50,14 49,6 Q47,-4 30,-6 L14,-10 Z" fill={b} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
          <rect x={-23} y={13} width={74} height={9} rx={4} fill={look.sole} stroke={OUT} strokeWidth={3} />
          <path d="M6,-4 L16,-4 M10,0 L22,0" stroke={shade(b, 0.4)} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
      {cuff && <rect x={-22} y={-38} width={44} height={14} rx={7} fill={look.trim} stroke={OUT} strokeWidth={3} />}
    </g>
  );
};

const LegEl = ({ leg, x, sign, look, view, far, legC, cuff, low }: { leg: Leg; x: number; sign: number; look: HeroLook; view: View; far: boolean; legC: string; cuff: boolean; low: boolean }) => {
  const d = look.dims;
  const fs = leg.fs ?? 1;
  const pants = far ? shade(legC, 0.14) : legC;
  return (
    <g transform={`translate(${x},0) rotate(${-sign * leg.hip})`}>
      <g transform={`translate(0,${d.thigh * fs}) rotate(${sign * leg.kn})`}>
        <Tube len={d.shin} w={d.legW - 2} color={pants} />
        <g transform={`translate(0,${d.shin}) rotate(${-sign * (leg.an ?? 0)})`}>
          <Boot look={look} front={flat(view)} fz={leg.fz} far={far} cuff={cuff} low={low} />
        </g>
      </g>
      <Tube len={d.thigh * fs} w={d.legW} color={pants} />
    </g>
  );
};

const ArmEl = ({ arm, at, sign, look, coat, hand, far, short = false, bare = false }: { arm: Arm; at: [number, number]; sign: number; look: HeroLook; coat: string; hand: HandKind; far: boolean; short?: boolean; bare?: boolean }) => {
  const d = look.dims;
  const c = far ? shade(coat, 0.14) : coat;
  const crease = outfitOf(look) === "puffy" ? shade(c, 0.28) : undefined;
  const fw = d.armW - 4;
  const skin = far ? shade(look.skin, 0.12) : look.skin;
  const handC = bare ? skin : far ? shade(look.gloves, 0.12) : look.gloves;
  const hk = kOf(look);
  return (
    <g transform={`translate(${at[0]},${at[1]}) rotate(${-sign * arm.sh})`}>
      {short && <Tube len={d.upper} w={d.armW - 6} color={skin} />}
      <Tube len={short ? d.upper * 0.5 : d.upper} w={d.armW} color={c} crease={crease} />
      <g transform={`translate(0,${d.upper}) rotate(${-sign * arm.el})`}>
        <Tube len={d.fore} w={short ? fw - 6 : fw} color={short ? skin : c} crease={short ? undefined : crease} />
        <path d={`M0,${d.fore - 2} L0,${d.fore + 6}`} stroke={short ? skin : shade(c, 0.3)} strokeWidth={short ? fw - 6 : fw} />
        <g transform={`translate(0,${d.fore + 6}) rotate(${-sign * (arm.wr ?? 0)}) scale(${(arm.az ?? 1) * hk})`}>
          <HandEl kind={hand} color={handC} sign={sign} />
        </g>
      </g>
    </g>
  );
};

// Hand centre in the torso frame (for the ice-pick cord).
const handPos = (arm: Arm, at: [number, number], s: number, d: Dims): [number, number] => {
  const a1 = s * arm.sh * D2R;
  const a2 = s * (arm.sh + arm.el) * D2R;
  const ex = at[0] + Math.sin(a1) * d.upper;
  const ey = at[1] + Math.cos(a1) * d.upper;
  return [ex + Math.sin(a2) * (d.fore + 18), ey + Math.cos(a2) * (d.fore + 18)];
};

const EXPR: Record<HeroExpr, { lift: number; tilt: number; eye: "dot" | "wide" | "lid" | "happy" | "shut"; mouth: "smile" | "o" | "flat" | "open" | "shout" | "rest" }> = {
  calm: { lift: 0, tilt: 0, eye: "dot", mouth: "smile" },
  scared: { lift: -9, tilt: 9, eye: "wide", mouth: "o" },
  focused: { lift: 4, tilt: -9, eye: "lid", mouth: "flat" },
  relieved: { lift: -5, tilt: 5, eye: "happy", mouth: "open" },
  shouting: { lift: -12, tilt: 6, eye: "wide", mouth: "shout" },
  closed: { lift: 1, tilt: 2, eye: "shut", mouth: "rest" },
};

type HeadProps = { look: HeroLook; view: View; expr: HeroExpr; blink: boolean; talk: boolean; frame: number; seed: number; uid: string; rim: LocalRim; breath: boolean };

// Head in its own frame: origin = head centre.
const HeadEl = ({ look, view, expr, blink, talk, frame, seed, uid, rim, breath }: HeadProps) => {
  const R = look.dims.R;
  const fx = faceX(view, R);
  const sk = look.skin;
  const shadeSide = rim ? -rim.side : 1;
  const e = EXPR[expr];
  const back = view === "back";
  const sx = view === "side" ? 0.8 : 1;
  const eyes: [number, number][] = view === "front" ? [[-22, 1], [22, 1]] : view === "three" ? [[fx - 20, 0.92], [fx + 17, 0.78]] : view === "side" ? [[fx + 6, 0.8]] : [];
  const browW = look.facial === "beard" ? 7.5 : 6;
  const mx = view === "side" ? fx + 14 : view === "three" ? fx + 4 : 0;
  const my = 30;
  const msx = view === "side" ? 0.6 : view === "three" ? 0.85 : 1;
  const eyeKind = blink && (e.eye === "dot" || e.eye === "wide" || e.eye === "lid") ? "shut" : e.eye;
  const headD = circleD(R);

  // Stubble pattern in face space, mapped per view.
  const stubble = Array.from({ length: 40 }, (_, i) => {
    const th = (12 + rand(i * 3.1 + 5) * 156) * D2R;
    const r = R * (0.5 + rand(i * 7.7 + 1) * 0.42);
    const x = Math.cos(th) * r;
    const y = 8 + Math.sin(th) * r * 0.9;
    if (Math.abs(x) < 20 && y > 18 && y < 44) return null;
    const X = view === "front" ? x : view === "three" ? fx * 0.9 + x * 0.8 : fx + x * 0.42;
    if (view === "side" && x < -R * 0.2) return null;
    return [X, y] as [number, number];
  }).filter((p): p is [number, number] => p !== null);

  const ear = (x: number, behind: boolean) => (
    <g key={x}>
      <ellipse cx={x} cy={8} rx={behind ? 13 : 11} ry={behind ? 15 : 14} fill={sk} stroke={OUT} strokeWidth={behind ? 4 : 3} />
      <path d={`M${x - 3},2 q5,6 0,12`} stroke={shade(sk, 0.3)} strokeWidth={3} fill="none" />
    </g>
  );

  const hatKind = look.hat;
  const showHair = hatKind === "none" || hatKind === "cap";
  const style: HairStyle = showHair ? look.hairStyle ?? "short" : "short";
  const noHair = showHair && (style === "bald" || style === "buzz");
  const elder = look.age === "elder";
  const trapper = hatKind === "trapper";
  const hood = hatKind === "hood";
  const beanie = hatKind === "beanie";
  const cap = hatKind === "cap";
  const bare = hatKind === "none";
  const flapped = trapper || hood;
  const hoodC = look.coat;
  const flap = (x: number, w = 34) =>
    hood ? (
      <g key={`flap${x}`}>
        <rect x={x - w / 2 - 6} y={-38} width={w + 12} height={96} rx={20} fill={hoodC} stroke={OUT} strokeWidth={4} />
        <rect x={x - w / 2 + 4} y={-30} width={w - 8} height={80} rx={14} fill={shade(hoodC, 0.16)} />
      </g>
    ) : (
      <g key={`flap${x}`}>
        <rect x={x - w / 2 - 3} y={-36} width={w + 6} height={78} rx={16} fill={look.hatBand} stroke={OUT} strokeWidth={4} />
        <rect x={x - w / 2 + 3} y={-32} width={w - 6} height={68} rx={13} fill={look.hatColor} stroke={OUT} strokeWidth={3} />
        <path d={`M${x},42 q-4,14 2,26`} stroke={OUT} strokeWidth={3} fill="none" />
      </g>
    );

  const beanieTilt = view === "side" ? -9 : view === "three" ? -4 : 0;
  const domeD = flapped
    ? `M${-R - 7},-32 C${-R - 9},${-R - 52} ${R + 9},${-R - 52} ${R + 7},-32 Z`
    : `M${-R - 4},-32 C${-R - 6},${-R - 44} ${R + 6},${-R - 44} ${R + 4},-32 Z`;
  const furBrim = (() => {
    const n = 9;
    let p = `M${-R - 9},-56 Q0,-68 ${R + 9},-56 L${R + 9},-32`;
    for (let i = n; i > 0; i--) {
      const x0 = -R - 9 + ((2 * R + 18) * i) / n;
      const x1 = -R - 9 + ((2 * R + 18) * (i - 1)) / n;
      p += ` Q${(x0 + x1) / 2},-21 ${x1},-32`;
    }
    return p + " Z";
  })();

  // Breath puffs (pure function of the frame), drifting up and forward.
  const puffs = breath
    ? [0, 1, 2].map((i) => {
        const t = ((frame + i * 17 + seed * 7) % 51) / 51;
        const dir = 1;
        return <circle key={i} cx={mx + dir * (40 + t * 60)} cy={my + 2 - t * 34} r={6 + t * 18} fill="#ffffff" opacity={0.5 * (1 - t) * Math.min(1, t * 6)} />;
      })
    : null;

  const mouthEl = (() => {
    const m = talk && e.mouth !== "shout" ? "talk" : e.mouth;
    const X = (v: number) => mx + v * msx;
    switch (m) {
      case "talk": {
        const open = 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.7));
        return <ellipse cx={mx} cy={my + 2} rx={9 * msx} ry={2 + 9 * open} fill={MOUTH} stroke={OUT} strokeWidth={3} />;
      }
      case "smile":
        return <path d={`M${X(-10)},${my} Q${mx},${my + 7} ${X(10)},${my - 1}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />;
      case "rest":
        return <path d={`M${X(-8)},${my + 1} Q${mx},${my + 4} ${X(8)},${my + 1}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />;
      case "flat":
        return <path d={`M${X(-10)},${my + 2} L${X(10)},${my}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />;
      case "o":
        return <ellipse cx={mx} cy={my + 2} rx={6.5 * msx} ry={8} fill={MOUTH} stroke={OUT} strokeWidth={3} />;
      case "open":
        return <path d={`M${X(-13)},${my - 2} Q${mx},${my + 18} ${X(13)},${my - 2} Z`} fill={MOUTH} stroke={OUT} strokeWidth={3} strokeLinejoin="round" />;
      case "shout":
        return (
          <g>
            <ellipse cx={mx} cy={my + 6} rx={15 * msx} ry={19} fill={MOUTH} stroke={OUT} strokeWidth={3.5} />
            <ellipse cx={mx} cy={my + 17} rx={9 * msx} ry={6} fill="#e07a7a" />
            <rect x={mx - 9 * msx} y={my - 11} width={18 * msx} height={6} rx={3} fill="#fff" />
          </g>
        );
    }
  })();

  // Bare head / under a cap: a hair mass with a scalloped fringe.
  const fringeD = (() => {
    const yb = -24;
    let p = `M${-R - 3},${yb} C${-R - 6},${-R - 34} ${R + 6},${-R - 34} ${R + 3},${yb}`;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x1 = R + 3 - ((2 * R + 6) * (i + 1)) / n;
      p += ` Q${x1 + (R + 3) / n},${yb + 14 - (i % 2) * 6} ${x1},${yb - (i % 2) * 5}`;
    }
    return p + " Z";
  })();
  const hairEl = (
    <Cel id={`${uid}hair`} d={fringeD} fill={look.hair} rim={rim}>
      <rect x={shadeSide > 0 ? R * 0.35 : -R * 3} y={-R * 2} width={R * 2.6} height={R * 2} fill={shade(look.hair, 0.16)} />
      <path d={`M${-R * 0.5},-40 Q${-R * 0.1},${-R - 8} ${R * 0.3},-44`} stroke={shade(look.hair, 0.25)} strokeWidth={3} fill="none" />
    </Cel>
  );
  const capD = `M${-R - 4},-30 C${-R - 5},${-R - 36} ${R + 5},${-R - 36} ${R + 4},-30 Z`;
  const bx = view === "side" ? R * 0.35 : view === "three" ? fx * 0.8 - R * 0.5 : -R * 0.82;
  const bw2 = view === "side" ? R * 0.95 : view === "three" ? R * 1.25 : R * 1.64;
  const capEl = (
    <g>
      <Cel id={`${uid}cap`} d={capD} fill={look.hatColor} rim={rim}>
        <rect x={shadeSide > 0 ? R * 0.35 : -R * 3} y={-R * 2} width={R * 2.6} height={R * 2} fill={shade(look.hatColor, 0.16)} />
        <path d={`M0,${-R - 36} L0,-30`} stroke={shade(look.hatColor, 0.22)} strokeWidth={2.5} />
        <rect x={-R - 6} y={-40} width={2 * R + 12} height={10} fill={look.hatBand} />
      </Cel>
      {!back && <path d={`M${bx},-34 Q${bx + bw2 / 2},${view === "side" ? 0 : 26} ${bx + bw2},-34 Z`} fill={shade(look.hatColor, 0.3)} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />}
    </g>
  );

  // ---- hair styles (hat none / cap) ----
  const hairShade = shade(look.hair, 0.18);
  const longBehind = showHair && style === "long" ? (
    <g>
      {flat(view)
        ? back
          ? null
          : [-1, 1].map((k) => <rect key={k} x={k > 0 ? R - 12 : -R - 18} y={-36} width={30} height={R + 88} rx={15} fill={look.hair} stroke={OUT} strokeWidth={4} />)
        : <rect x={-R - 24} y={-38} width={R * 1.05} height={R + 84} rx={18} fill={look.hair} stroke={OUT} strokeWidth={4} />}
    </g>
  ) : null;
  const longBack = showHair && style === "long" && back ? (
    <path d={`M${-R - 12},${R + 50} L${-R - 12},-20 C${-R - 12},${-R - 38} ${R + 12},${-R - 38} ${R + 12},-20 L${R + 12},${R + 50} Q0,${R + 66} ${-R - 12},${R + 50} Z`} fill={look.hair} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
  ) : null;
  const curlyEl = showHair && style === "curly" ? (() => {
    const dots: [number, number, number][] = [];
    for (let a = 188; a <= 352; a += 17) dots.push([Math.cos(a * D2R) * (R + 6), Math.sin(a * D2R) * (R + 8) - 4, 23]);
    for (let a = 222; a <= 318; a += 24) dots.push([Math.cos(a * D2R) * (R - 12), Math.sin(a * D2R) * (R - 12) - 6, 19]);
    if (back) dots.push([0, -R * 0.45, R * 0.82], [-R * 0.7, -4, 24], [R * 0.7, -4, 24], [0, 0, 26]);
    return (
      <g>
        {dots.map(([x, y, r], i) => <circle key={`o${i}`} cx={x} cy={y} r={r} fill={look.hair} stroke={OUT} strokeWidth={4} />)}
        {dots.map(([x, y, r], i) => <circle key={`f${i}`} cx={x} cy={y} r={r - 1.5} fill={look.hair} />)}
        {dots.filter((_, i) => i % 3 === 1).map(([x, y, r], i) => <path key={`h${i}`} d={`M${x - r * 0.4},${y - r * 0.2} q${r * 0.3},${-r * 0.4} ${r * 0.7},${-r * 0.1}`} stroke={hairShade} strokeWidth={2.5} fill="none" />)}
      </g>
    );
  })() : null;
  const bunX = view === "side" ? -R * 0.45 : view === "three" ? -R * 0.2 : 0;
  const bunEl = showHair && hatKind === "none" && style === "bun" ? (
    <g>
      <circle cx={bunX} cy={-R - 26} r={25} fill={look.hair} stroke={OUT} strokeWidth={4} />
      <path d={`M${bunX - 12},${-R - 30} q10,-8 22,0`} stroke={hairShade} strokeWidth={3} fill="none" />
    </g>
  ) : null;
  const buzzEl = showHair && hatKind === "none" && style === "buzz" ? (
    <path d={`M${-R - 2},-26 C${-R - 5},${-R - 28} ${R + 5},${-R - 28} ${R + 2},-26 C${R * 0.6},-38 ${-R * 0.6},-38 ${-R - 2},-26 Z`} fill={look.hair} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
  ) : null;
  const wrinkles = elder && !back ? (
    <g stroke={shade(sk, 0.38)} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.85}>
      {eyes.map(([ex, s], i) => <path key={i} d={`M${ex - 9 * s},${13} q${9 * s},6 ${18 * s},0`} />)}
      {view === "front" && [-1, 1].map((k) => <path key={`n${k}`} d={`M${k * 17},16 q${-k * 4},9 0,17`} />)}
      {view !== "front" && <path d={`M${fx + (view === "side" ? 2 : 0)},16 q-4,9 0,17`} />}
      <path d={`M${fx - 14},-21 q14,-5 28,0`} />
    </g>
  ) : null;
  const glassesEl = look.glasses && !back ? (
    <g fill="#bfe6ff" fillOpacity={0.28} stroke={OUT} strokeWidth={4}>
      {eyes.map(([ex, s], i) => <ellipse key={i} cx={ex} cy={1} rx={(view === "side" ? 15 : 17) * (view === "front" ? 1 : Math.max(0.75, s))} ry={15} />)}
      {view === "front" && <path d="M-6,0 Q0,-5 6,0" fill="none" />}
      {view === "three" && <path d={`M${eyes[0][0] + 15},-1 Q${(eyes[0][0] + eyes[1][0]) / 2},-6 ${eyes[1][0] - 13},-1`} fill="none" />}
      {view === "front" && <path d={`M${-39},-2 L${-R + 4},-6 M39,-2 L${R - 4},-6`} fill="none" />}
      {view === "three" && <path d={`M${eyes[0][0] - 16},-2 L${eyes[0][0] - 28},-6`} fill="none" />}
      {view === "side" && <path d={`M${eyes[0][0] - 15},-4 L${-R * 0.1},-6`} fill="none" />}
    </g>
  ) : null;
  const helmetEl = (
    <g>
      <Cel id={`${uid}hel`} d={`M${-R - 8},-24 C${-R - 12},${-R - 54} ${R + 12},${-R - 54} ${R + 8},-24 Z`} fill={look.hatColor} rim={rim}>
        <rect x={shadeSide > 0 ? R * 0.35 : -R * 3} y={-R * 2} width={R * 2.6} height={R * 2} fill={shade(look.hatColor, 0.16)} />
        <rect x={-R - 12} y={-44} width={2 * R + 24} height={11} fill={look.hatBand} />
        {[-1, 0, 1].map((k) => <ellipse key={k} cx={k * R * 0.42 + (view === "three" ? 6 : 0)} cy={-R - 22} rx={9} ry={15} fill={shade(look.hatColor, 0.45)} />)}
      </Cel>
      {!back && <path d={`M${-R - 6},-26 Q${R * 0.2},-14 ${R + 6},-26 L${R + 6},-20 Q${R * 0.2},-8 ${-R - 6},-20 Z`} fill={shade(look.hatColor, 0.25)} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />}
    </g>
  );
  const HARD = "#F5C21B";
  const hardEl = (
    <g>
      <Cel id={`${uid}hard`} d={`M${-R - 6},-26 C${-R - 8},${-R - 50} ${R + 8},${-R - 50} ${R + 6},-26 Z`} fill={HARD} rim={rim}>
        <rect x={shadeSide > 0 ? R * 0.35 : -R * 3} y={-R * 2} width={R * 2.6} height={R * 2} fill={shade(HARD, 0.16)} />
        <rect x={-10} y={-R - 52} width={20} height={R + 24} fill={shade(HARD, -0.15)} stroke={shade(HARD, 0.3)} strokeWidth={2} />
      </Cel>
      <rect x={-R - 14} y={-36} width={2 * R + 28} height={13} rx={6.5} fill={shade(HARD, 0.1)} stroke={OUT} strokeWidth={4} />
      {!back && view !== "front" && <path d={`M${R * 0.1},-32 L${R + 22},-30 Q${R + 26},-22 ${R + 16},-22 L${R * 0.1},-23 Z`} fill={shade(HARD, 0.1)} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />}
    </g>
  );

  return (
    <g>
      {longBehind}
      {flat(view) && [ear(-R + 1, true), ear(R - 1, true)]}
      {flapped && view === "three" && flap(R - 4, 28)}
      <Cel id={`${uid}h`} d={headD} fill={sk} rim={rim}>
        <circle cx={shadeSide * R * 1.32} cy={R * 0.12} r={R * 1.06} fill={shade(sk, 0.13)} />
        {/* hair under the hat */}
        {!noHair && view === "front" && [-1, 1].map((k) => <rect key={k} x={k > 0 ? R - 13 : -R - 3} y={-30} width={16} height={34} fill={look.hair} />)}
        {!noHair && (view === "side" || view === "three") && (
          <path d={`M${-R - 2},-30 L${view === "side" ? -R * 0.05 : -R * 0.42},-30 Q${view === "side" ? -R * 0.2 : -R * 0.5},${R * 0.28} ${-R * 0.55},${R * 0.6} L${-R - 2},${R * 0.6} Z`} fill={look.hair} />
        )}
        {showHair && style === "buzz" && <rect x={-R - 2} y={back ? -R - 2 : -R * 0.9} width={2 * R + 4} height={back ? R + 2 : R * 0.9 - 28} fill={look.hair} />}
        {!noHair && back && <path d={`M${-R - 2},-30 L${R + 2},-30 L${R + 2},${R * 0.55} Q0,${R * 0.75} ${-R - 2},${R * 0.55} Z`} fill={look.hair} />}
        {!back && look.facial === "stubble" && stubble.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.9} fill={shade(sk, 0.45)} opacity={0.8} />)}
        {!back && (
          <g fill="#ff7a6a" opacity={0.32}>
            {view === "front" && [-38, 38].map((x) => <ellipse key={x} cx={x} cy={18} rx={11} ry={8} />)}
            {view === "three" && <ellipse cx={fx - 34} cy={18} rx={10} ry={8} />}
            {view === "side" && <ellipse cx={fx - 8} cy={18} rx={10} ry={8} />}
          </g>
        )}
      </Cel>
      {(view === "three" || view === "side") && ear(view === "side" ? -R * 0.12 : -R * 0.6, false)}
      {!back && look.facial === "beard" && (
        <g transform={`translate(${view === "front" ? 0 : view === "three" ? fx * 0.75 : fx * 0.95},0) scale(${view === "front" ? 1 : view === "three" ? 0.86 : 0.55},1)`}>
          <path
            d={`M${-R + 4},-2 C${-R + 1},${R * 0.9} ${-R * 0.5},${R + 16} 0,${R + 16} C${R * 0.5},${R + 16} ${R - 1},${R * 0.9} ${R - 4},-2 C${R * 0.62},20 ${R * 0.3},14 0,18 C${-R * 0.3},14 ${-R * 0.62},20 ${-R + 4},-2 Z`}
            fill={look.hair}
            stroke={OUT}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </g>
      )}
      {!back && (
        <g>
          {/* eyes */}
          {eyes.map(([ex, s], i) => {
            const ey = 0;
            switch (eyeKind) {
              case "dot":
                return (
                  <g key={i}>
                    <ellipse cx={ex} cy={ey} rx={7.5 * s} ry={8.5} fill={OUT} />
                    <circle cx={ex + 2 * s} cy={ey - 3} r={2.4} fill="#fff" />
                  </g>
                );
              case "wide":
                return (
                  <g key={i}>
                    <ellipse cx={ex} cy={ey} rx={11 * s} ry={12.5} fill="#fff" stroke={OUT} strokeWidth={3} />
                    <ellipse cx={ex + 1} cy={ey + 1} rx={5 * s} ry={5.5} fill={OUT} />
                    <circle cx={ex + 3 * s} cy={ey - 3} r={1.8} fill="#fff" />
                  </g>
                );
              case "lid":
                return (
                  <g key={i}>
                    <ellipse cx={ex} cy={ey + 1} rx={7.5 * s} ry={8} fill={OUT} />
                    <circle cx={ex + 2 * s} cy={ey - 1} r={2.2} fill="#fff" />
                    <path d={`M${ex - 12 * s},${ey - 3} L${ex + 12 * s},${ey - 3}`} stroke={OUT} strokeWidth={5} strokeLinecap="round" />
                    <rect x={ex - 11 * s} y={ey - 14} width={22 * s} height={9} fill={sk} />
                  </g>
                );
              case "happy":
                return <path key={i} d={`M${ex - 8 * s},${ey + 3} Q${ex},${ey - 8} ${ex + 8 * s},${ey + 3}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />;
              default:
                return <path key={i} d={`M${ex - 8 * s},${ey} Q${ex},${ey + 6} ${ex + 8 * s},${ey}`} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />;
            }
          })}
          {/* brows: lift + inner tilt */}
          {eyes.map(([ex, s], i) => {
            const inner = view === "side" ? 1 : ex < fx ? 1 : -1;
            const by = -18 + e.lift;
            return (
              <path
                key={`b${i}`}
                d={`M${ex - inner * 13 * s},${by} Q${ex},${by - 4 - e.tilt * 0.4} ${ex + inner * 12 * s},${by - e.tilt}`}
                stroke={OUT}
                strokeWidth={browW}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
          {/* nose */}
          {view === "side" ? (
            <g>
              <path d={`M${R - 7},-4 Q${R + 13},6 ${R - 4},17 Z`} fill={sk} />
              <path d={`M${R - 4},-4 Q${R + 13},6 ${R - 4},17`} stroke={OUT} strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          ) : (
            <path d={`M${fx + (view === "three" ? 6 : 0) - 6},10 q6,8 12,0`} stroke={shade(sk, 0.4)} strokeWidth={4} fill="none" strokeLinecap="round" />
          )}
          {wrinkles}
          {mouthEl}
          {glassesEl}
          {expr === "scared" && <path d={`M${fx + 46},-34 q7,13 0,20 q-7,-7 0,-20Z`} fill="#bfe8ff" stroke={OUT} strokeWidth={2.5} />}
        </g>
      )}
      {/* hat */}
      <g transform={`rotate(${beanieTilt},0,-20)`}>
        {flapped && view === "side" && flap(-R * 0.12, 40)}
        {hatKind === "cap" ? <>{longBack}{capEl}</> : bare ? (
          style === "bald" ? null : style === "buzz" ? buzzEl : style === "curly" ? curlyEl : <>{longBack}{bunEl}{hairEl}</>
        ) : hatKind === "helmet" ? helmetEl : hatKind === "hardhat" ? hardEl : (
          <>
            <Cel id={`${uid}hat`} d={domeD} fill={hood ? hoodC : look.hatColor} rim={rim}>
              <rect x={shadeSide > 0 ? R * 0.35 : -R * 3} y={-R * 2} width={R * 2.6} height={R * 2} fill={shade(hood ? hoodC : look.hatColor, 0.16)} />
              {beanie && Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-R + 12 + i * 16},-40 Q${-R + 14 + i * 16},${-R * 0.95} ${(-R + 12 + i * 16) * 0.4},${-R - 20}`} stroke={shade(look.hatColor, 0.22)} strokeWidth={2.5} fill="none" />)}
            </Cel>
            {trapper ? (
              <path d={furBrim} fill={look.hatBand} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            ) : hood ? (
              <path d={`M${-R - 9},-34 Q0,-62 ${R + 9},-34 L${R + 9},-22 Q0,-46 ${-R - 9},-22 Z`} fill={look.hatBand} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            ) : (
              <g>
                <rect x={-R - 8} y={-52} width={2 * R + 16} height={26} rx={12} fill={look.hatBand} stroke={OUT} strokeWidth={4} />
                {Array.from({ length: 11 }, (_, i) => (
                  <path key={i} d={`M${-R + 2 + i * ((2 * R - 4) / 10)},-47 L${-R + 2 + i * ((2 * R - 4) / 10)},-31`} stroke={shade(look.hatBand, 0.14)} strokeWidth={3} />
                ))}
                <circle cx={view === "side" ? -10 : 0} cy={-R - 34} r={19} fill={look.hatBand} stroke={OUT} strokeWidth={4} />
                <path d={`M${view === "side" ? -18 : -8},${-R - 40} q4,-4 9,0 M${view === "side" ? -6 : 4},${-R - 30} q4,-4 8,0`} stroke={shade(look.hatBand, 0.2)} strokeWidth={2.5} fill="none" />
              </g>
            )}
          </>
        )}
        {flapped && flat(view) && [flap(-R - 2), flap(R + 2)]}
        {flapped && view === "three" && flap(-R + 2, 34)}
      </g>
      {puffs}
    </g>
  );
};

export interface HeroProps {
  look: HeroLook;
  x: number;
  y: number;
  frame: number;
  seed?: number;
  pose?: HeroPose;
  view?: View;
  skel?: Skel; // overrides pose
  expr?: HeroExpr;
  talk?: boolean;
  scale?: number;
  flip?: boolean;
  rim?: Rim | null;
  wet?: boolean;
  breath?: boolean;
  shadow?: boolean;
}

export const DEFAULT_RIM: Rim = { color: "#ffc98a", side: -1, w: 6 };

export const Hero = ({ look: lookIn, x, y, frame, seed = 0, pose = "stand", view, skel, expr = "calm", talk = false, scale = 1, flip = false, rim = DEFAULT_RIM, wet = false, breath = false, shadow = true }: HeroProps) => {
  const uid = `r${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const look = ageLook(lookIn);
  const sk0 = skel ?? heroPose(pose, frame, look, view);
  const v = sk0.view;
  const stoop = look.age === "elder";
  const sk: Skel = stoop ? { ...sk0, torso: (sk0.torso ?? 0) + (v === "side" || v === "three" ? 8 : 0), py: (sk0.py ?? 0) + (flat(v) ? 4 : 0), head: (sk0.head ?? 0) + (v === "side" || v === "three" ? 5 : 0) } : sk0;
  const d = look.dims;
  const H = pelvisHeight(d);
  const lying = Math.abs(sk.body ?? 0) > 45;
  const lr: LocalRim = rim ? { color: rim.color, side: rim.side * (flip ? -1 : 1), w: rim.w ?? 6 } : null;
  const shadeSide = lr ? -lr.side : 1;
  const period = 66 + Math.floor(rand(seed + 3) * 50);
  const blink = (frame + seed * 29) % period < 3;
  const breathe = lying ? 0 : -(1 + Math.sin((frame + seed * 11) / 14)) * 0.9;
  const jx = sk.shiver ? Math.sin(frame * 2.9 + seed) * 2.2 : 0;
  const outfit = outfitOf(look);
  const winter = WINTER.includes(outfit);
  const coat = wet ? shade(look.coat, 0.14) : look.coat;
  const sleeveC = outfit === "apron" ? (wet ? shade(look.trim, 0.14) : look.trim) : coat;
  const shortSleeve = outfit === "tshirt" || outfit === "scrubs" || outfit === "dress";
  const legC = outfit === "dress" ? look.skin : outfit === "scrubs" || outfit === "suit" || outfit === "uniform" ? look.coat : look.pants;
  const lowShoes = outfit === "dress" || outfit === "tshirt" || outfit === "scrubs";
  const HV = "#F58A1F";
  const SILVER = "#E6ECEF";
  const parka = outfit === "parka";
  const sgn = (which: "n" | "f") => (flat(v) && which === "f" ? -1 : 1);
  const [shN, shF] = shoulderXs(v, d.W);
  const [hipN, hipF] = hipXs(v, d.W);
  const shY = -d.T + 18;
  const atN: [number, number] = [shN, shY];
  const atF: [number, number] = [shF, shY];
  const hands = { n: sk.hand?.n ?? "mitt", f: sk.hand?.f ?? "mitt" };

  // torso geometry
  const w = torsoW(v, d.W);
  const hw = w / 2;
  const top = -d.T - 6;
  const jacket = outfit === "jacket";
  const SH: Record<string, [number, number]> = { puffy: [0, 0.95], parka: [0, 1.14], jacket: [-22, 0.84], tshirt: [-14, 0.86], scrubs: [-8, 0.88], hoodie: [0, 0.95], suit: [-6, 0.86], hivis: [-14, 0.88], uniform: [-10, 0.86], apron: [14, 0.88], dress: [0, 1.3] };
  const [botOff, bwK] = SH[outfit] ?? [0, 0.95];
  const bot = outfit === "dress" ? d.thigh - 2 : d.hem + botOff;
  const bw = hw * bwK;
  const front = v === "front" || v === "three";
  const ncx = v === "side" ? hw * 0.25 : v === "three" ? w * 0.2 * 0.55 : 0;
  const baseFill = outfit === "apron" ? sleeveC : coat;
  const skinC = look.skin;
  const packC = look.hatColor;
  const tD = `M${-hw + 20},${top} Q0,${top - 8} ${hw - 20},${top} Q${hw + 4},${top + 2} ${hw + 2},${top + 34} Q${hw + 6},${(top + bot) / 2} ${bw},${bot - 16} Q${bw + 1},${bot} ${bw - 16},${bot} L${-bw + 16},${bot} Q${-bw - 1},${bot} ${-bw},${bot - 16} Q${-hw - 6},${(top + bot) / 2} ${-hw - 2},${top + 34} Q${-hw - 4},${top + 2} ${-hw + 20},${top} Z`;
  const zx = v === "front" ? 0 : v === "three" ? 0.2 * w : v === "side" ? hw - 10 : null;
  const headX = v === "side" ? 4 : v === "three" ? 3 : 0;

  const legs = [
    { leg: sk.lF, x: hipF, s: sgn("f"), far: !flat(v) },
    { leg: sk.lN, x: hipN, s: sgn("n"), far: false },
  ];
  if (flat(v)) legs.sort((a, b) => (a.leg.fz ?? 1) - (b.leg.fz ?? 1));

  const arm = (which: "n" | "f") => (
    <ArmEl arm={which === "n" ? sk.aN : sk.aF} at={which === "n" ? atN : atF} sign={sgn(which)} look={look} coat={sleeveC} hand={hands[which]} far={which === "f" && !flat(v)} short={shortSleeve} bare={!winter} />
  );

  const sd = (c: string, a = 0.3) => shade(c, a);
  const outfitDetails = (() => {
    const U = (r: number, depth: number) => <path d={`M${ncx - r},${top - 2} Q${ncx},${top + depth} ${ncx + r},${top - 2} Z`} fill={skinC} stroke={OUT} strokeWidth={3} />;
    const Vn = (r: number, depth: number, c = skinC) => <path d={`M${ncx - r},${top - 2} L${ncx},${top + depth} L${ncx + r},${top - 2} Z`} fill={c} stroke={OUT} strokeWidth={3} strokeLinejoin="round" />;
    const hemY = bot - 12;
    switch (outfit) {
      case "tshirt":
        return (
          <g>
            {front && U(24, 32)}
            {front && <path d={`M${ncx - 24},${top - 2} Q${ncx},${top + 32} ${ncx + 24},${top - 2}`} stroke={look.trim} strokeWidth={5} fill="none" />}
            <rect x={-hw - 10} y={hemY} width={w + 20} height={16} fill={sd(baseFill, 0.22)} />
            <path d={`M${-hw - 6},${hemY - 6} L${hw + 6},${hemY - 6}`} stroke={look.trim} strokeWidth={4} />
            {front && <path d={`M${ncx - 12},${top + 64} q12,12 24,0`} stroke={sd(baseFill, 0.3)} strokeWidth={3} fill="none" />}
          </g>
        );
      case "scrubs":
        return (
          <g>
            {front && Vn(27, 42)}
            {front && <path d={`M${ncx - 27},${top - 2} L${ncx},${top + 42} L${ncx + 27},${top - 2}`} stroke={look.trim} strokeWidth={5} fill="none" strokeLinejoin="round" />}
            {front && <rect x={ncx + w * 0.16} y={top + 62} width={30} height={34} rx={5} fill={sd(baseFill, 0.1)} stroke={sd(baseFill, 0.45)} strokeWidth={3} />}
            {front && <path d={`M${ncx + w * 0.16 + 6},${top + 70} L${ncx + w * 0.16 + 24},${top + 70}`} stroke={look.trim} strokeWidth={4} strokeLinecap="round" />}
            <rect x={-hw - 10} y={hemY} width={w + 20} height={16} fill={sd(baseFill, 0.2)} />
          </g>
        );
      case "hoodie":
        return (
          <g>
            {front && U(20, 24)}
            {front && <path d={`M${ncx - 11},${top + 8} v50 M${ncx + 11},${top + 8} v44`} stroke={look.trim} strokeWidth={4.5} strokeLinecap="round" />}
            {front && <circle cx={ncx + 11} cy={top + 56} r={4} fill={look.trim} stroke={OUT} strokeWidth={2} />}
            {front ? <path d={`M${ncx - w * 0.36},${bot - 74} L${ncx + w * 0.36},${bot - 74} L${ncx + w * 0.44},${bot - 10} L${ncx - w * 0.44},${bot - 10} Z`} fill={sd(baseFill, 0.14)} stroke={sd(baseFill, 0.45)} strokeWidth={3.5} strokeLinejoin="round" /> : null}
            <rect x={-hw - 10} y={hemY} width={w + 20} height={16} fill={sd(baseFill, 0.26)} />
            {v === "side" && <path d={`M${hw * 0.1},${bot - 70} L${hw * 0.9},${bot - 70}`} stroke={sd(baseFill, 0.4)} strokeWidth={3.5} />}
          </g>
        );
      case "suit":
        return (
          <g>
            {front && Vn(24, 72, "#F4F2EC")}
            {front && <path d={`M${ncx - 24},${top - 2} L${ncx},${top + 72} L${ncx - 36},${top + 92} L${ncx - 46},${top + 8} Z M${ncx + 24},${top - 2} L${ncx},${top + 72} L${ncx + 36},${top + 92} L${ncx + 46},${top + 8} Z`} fill={sd(baseFill, 0.2)} stroke={OUT} strokeWidth={3} strokeLinejoin="round" />}
            {front && <path d={`M${ncx - 7},${top + 20} L${ncx + 7},${top + 20} L${ncx + 10},${top + 96} L${ncx},${top + 112} L${ncx - 10},${top + 96} Z`} fill={look.trim} stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />}
            {front && <path d={`M${ncx},${top + 72} L${ncx},${bot}`} stroke={sd(baseFill, 0.45)} strokeWidth={3.5} />}
            {front && [0, 1].map((i) => <circle key={i} cx={ncx + 9} cy={top + 124 + i * 36} r={3.5} fill={sd(baseFill, 0.5)} />)}
            {v === "back" && <path d={`M0,${top + 14} L0,${bot}`} stroke={sd(baseFill, 0.4)} strokeWidth={3.5} />}
            <path d={`M${-hw - 6},${hemY + 8} L${hw + 6},${hemY + 8}`} stroke={sd(baseFill, 0.35)} strokeWidth={3} />
          </g>
        );
      case "hivis": {
        const xs = v === "side" ? [ncx] : [ncx - w * 0.24, ncx + w * 0.24];
        const vest = front
          ? `M${-hw - 10},${top + 14} L${ncx - 27},${top + 14} L${ncx},${top + 54} L${ncx + 27},${top + 14} L${hw + 10},${top + 14} L${hw + 10},${bot + 4} L${-hw - 10},${bot + 4} Z`
          : `M${-hw - 10},${top + 14} L${hw + 10},${top + 14} L${hw + 10},${bot + 4} L${-hw - 10},${bot + 4} Z`;
        return (
          <g>
            <path d={vest} fill={HV} stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
            <rect x={shadeSide > 0 ? hw * 0.42 : -hw * 3.42} y={top + 14} width={hw * 3} height={bot - top} fill={shade(HV, 0.18)} opacity={0.55} />
            {xs.map((x, i) => <rect key={i} x={x - 7} y={top + (front ? 30 : 16)} width={14} height={bot - top - (front ? 26 : 12)} fill={SILVER} stroke={sd(SILVER, 0.4)} strokeWidth={1.5} />)}
            <rect x={-hw - 10} y={bot - 52} width={w + 20} height={14} fill={SILVER} stroke={sd(SILVER, 0.4)} strokeWidth={1.5} />
            {front && <rect x={ncx - w * 0.38} y={top + 70} width={26} height={22} rx={3} fill={sd(HV, 0.2)} stroke={OUT} strokeWidth={2.5} />}
          </g>
        );
      }
      case "uniform":
        return (
          <g>
            {front && Vn(17, 34, "#E8E6E0")}
            {front && <path d={`M${ncx - 5},${top + 8} L${ncx + 5},${top + 8} L${ncx + 7},${top + 70} L${ncx},${top + 80} L${ncx - 7},${top + 70} Z`} fill={sd(baseFill, 0.55)} stroke={OUT} strokeWidth={2} />}
            {front && <path d={`M${ncx - 17},${top - 2} L${ncx},${top + 34} L${ncx - 38},${top + 44} L${ncx - 40},${top + 6} Z M${ncx + 17},${top - 2} L${ncx},${top + 34} L${ncx + 38},${top + 44} L${ncx + 40},${top + 6} Z`} fill={sd(baseFill, 0.14)} stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />}
            {[-1, 1].map((k) => <rect key={k} x={k * (hw - 30) - 17} y={top + 3} width={34} height={11} rx={3} fill={look.trim} stroke={OUT} strokeWidth={2.5} />)}
            {front && <path d={`M${ncx + w * 0.2},${top + 52} l-13,3 v14 q13,12 26,0 v-14 Z`} fill={look.trim} stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />}
            <rect x={-hw - 10} y={bot - 46} width={w + 20} height={13} fill={sd(baseFill, 0.55)} stroke={OUT} strokeWidth={2.5} />
            {front && <rect x={ncx - 12} y={bot - 47} width={24} height={15} rx={3} fill={look.trim} stroke={OUT} strokeWidth={2.5} />}
            {front && [0, 1].map((i) => <circle key={i} cx={ncx + 12} cy={top + 90 + i * 28} r={3.5} fill={look.trim} stroke={OUT} strokeWidth={1.5} />)}
          </g>
        );
      case "apron": {
        const A = coat;
        const bib = front
          ? `M${ncx - w * 0.3},${top + 38} L${ncx + w * 0.3},${top + 38} L${ncx + w * 0.4},${bot + 14} L${ncx - w * 0.4},${bot + 14} Z`
          : v === "side"
            ? `M${hw - 30},${top + 38} L${hw + 4},${top + 38} L${hw + 6},${bot + 14} L${hw - 30},${bot + 14} Z`
            : `M${-hw},${bot - 56} L${hw},${bot - 56} L${hw},${bot - 36} L${-hw},${bot - 36} Z`;
        return (
          <g>
            {front && U(22, 30)}
            {!front && v === "back" && <path d={`M${-hw * 0.5},${top} L${hw * 0.5},${top + 80} M${hw * 0.5},${top} L${-hw * 0.5},${top + 80}`} stroke={A} strokeWidth={9} />}
            {front && [-1, 1].map((k) => <path key={k} d={`M${ncx + k * w * 0.3},${top + 40} L${ncx + k * w * 0.2},${top - 4}`} stroke={A} strokeWidth={9} strokeLinecap="round" />)}
            <path d={bib} fill={A} stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
            {front && <rect x={ncx - w * 0.2} y={bot - 62} width={w * 0.4} height={34} rx={5} fill={sd(A, 0.14)} stroke={OUT} strokeWidth={2.5} />}
            {front && <path d={`M${ncx - w * 0.2},${bot - 62} h${w * 0.4}`} stroke={look.trim} strokeWidth={4} />}
            <path d={`M${-hw - 6},${top + 112} L${hw + 6},${top + 112}`} stroke={sd(A, 0.35)} strokeWidth={4} opacity={front ? 0.9 : 0} />
          </g>
        );
      }
      case "dress":
        return (
          <g>
            {front && U(24, 32)}
            {front && <path d={`M${ncx - 24},${top - 2} Q${ncx},${top + 32} ${ncx + 24},${top - 2}`} stroke={look.trim} strokeWidth={5} fill="none" />}
            <rect x={-bw - 14} y={top + 100} width={2 * bw + 28} height={11} fill={look.trim} stroke={OUT} strokeWidth={2.5} />
            {[1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${-bw + (i * 2 * bw) / 6},${top + 112} L${-bw * 1.25 + (i * 2.5 * bw) / 6},${bot}`} stroke={sd(baseFill, 0.22)} strokeWidth={3} opacity={0.7} />)}
            <rect x={-bw - 14} y={bot - 14} width={2 * bw + 28} height={18} fill={look.trim} stroke={OUT} strokeWidth={2.5} />
          </g>
        );
    }
    return null;
  })();

  const torsoEl = (
    <Cel id={`${uid}t`} d={tD} fill={baseFill} rim={lr}>
      <rect x={shadeSide > 0 ? hw * 0.42 : -hw * 3.42} y={top - 20} width={hw * 3} height={bot - top + 40} fill={shade(baseFill, 0.18)} />
      {!winter ? outfitDetails : parka ? (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={`v${i}`} x={-bw - 4 + i * 30} y={top - 10} width={10} height={bot - top + 20} fill={shade(coat, 0.32)} opacity={0.45} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={`h${i}`} x={-bw - 10} y={top + 8 + i * 30} width={2 * bw + 20} height={9} fill={shade(coat, 0.32)} opacity={0.4} />
          ))}
          <path d={`M${-hw - 6},${top + 46} Q0,${top + 58} ${hw + 6},${top + 46}`} stroke={shade(coat, 0.4)} strokeWidth={4} fill="none" />
          {v !== "back" && v !== "side" && [-1, 1].map((k) => <rect key={k} x={k * w * 0.27 - 22 + (zx ?? 0) * 0.5} y={bot - 74} width={44} height={16} rx={5} fill={shade(coat, 0.25)} stroke={OUT} strokeWidth={3} />)}
          <rect x={-bw - 4} y={bot - 12} width={2 * bw + 8} height={16} fill={shade(coat, 0.25)} />
        </g>
      ) : jacket ? (
        <g>
          <path d={`M${-hw - 6},${top + 40} Q0,${top + 52} ${hw + 6},${top + 40}`} stroke={shade(coat, 0.3)} strokeWidth={3.5} fill="none" />
          {v !== "back" && v !== "side" && [-1, 1].map((k) => <rect key={k} x={k * w * 0.26 - 15 + (zx ?? 0) * 0.5} y={bot - 56} width={30} height={7} rx={3} fill={shade(coat, 0.3)} />)}
          <rect x={-bw - 6} y={bot - 12} width={2 * bw + 12} height={16} fill={look.trim} stroke={OUT} strokeWidth={2.5} />
        </g>
      ) : (
        <g>
          {[1, 2, 3].map((k) => {
            const yy = top + ((bot - top) * k) / 4;
            return <path key={k} d={`M${-hw - 10},${yy} Q0,${yy + 12} ${hw + 10},${yy}`} stroke={shade(coat, 0.3)} strokeWidth={4} fill="none" />;
          })}
          <rect x={-hw - 10} y={bot - 13} width={w + 20} height={20} fill={shade(coat, 0.24)} />
        </g>
      )}
      {zx !== null && winter && (
        <g>
          <path d={`M${zx},${top + 6} L${zx},${bot}`} stroke={shade(coat, 0.42)} strokeWidth={4} />
          {parka
            ? [0, 1, 2].map((i) => <rect key={i} x={zx - 9} y={top + 66 + i * 36} width={18} height={9} rx={4} fill={look.trim} stroke={OUT} strokeWidth={2.5} />)
            : <rect x={zx - 5} y={top + 22} width={10} height={18} rx={3} fill="#d9dfe6" stroke={OUT} strokeWidth={2.5} />}
        </g>
      )}
    </Cel>
  );

  // Fur ruff (parka) behind the head; stand-up collar (puffy) in front of the chin.
  const hoodPool = outfit === "hoodie" && look.hat !== "hood" ? (
    <ellipse cx={headX + (v === "side" ? -hw * 0.3 : v === "three" ? -w * 0.08 : 0)} cy={top + 14} rx={v === "side" ? w * 0.34 : w * 0.4} ry={22} fill={sd(baseFill, 0.1)} stroke={OUT} strokeWidth={4} />
  ) : null;
  const ruff = parka ? (
    <g>
      {Array.from({ length: 11 }, (_, i) => {
        const a = (200 + i * 14) * D2R;
        const rx = w * 0.42;
        return <circle key={i} cx={headX + Math.cos(a) * rx * -1} cy={top + 6 + Math.sin(a) * -22 - 8} r={17} fill={look.trim} stroke={OUT} strokeWidth={3.5} />;
      })}
    </g>
  ) : null;
  const cw = v === "side" ? w * 0.62 : w * 0.56;
  const cx = v === "side" ? hw * 0.25 : v === "three" ? (zx ?? 0) * 0.55 : 0;
  const collar = winter && !parka ? (
    <g>
      <rect x={cx - cw / 2} y={-d.T - 10} width={cw} height={30} rx={14} fill={coat} stroke={OUT} strokeWidth={4} />
      <path d={`M${cx - cw / 2 + 8},${-d.T + 4} Q${cx},${-d.T + 11} ${cx + cw / 2 - 8},${-d.T + 4}`} stroke={shade(coat, 0.3)} strokeWidth={3} fill="none" />
      {lr && <path d={`M${cx + lr.side * (cw / 2 - 5)},${-d.T - 3} L${cx + lr.side * (cw / 2 - 5)},${-d.T + 12}`} stroke={lr.color} strokeWidth={lr.w * 0.8} strokeLinecap="round" />}
    </g>
  ) : null;

  // Ice picks on a cord around the neck (or in the fists, cord trailing to the hands).
  const picks = look.picks && v !== "back" ? (() => {
    const px0 = (zx ?? 0) + (v === "side" ? 6 : 0);
    const ky = -d.T + 58;
    const held = { 1: hands.n === "pick", [-1]: hands.f === "pick" } as Record<number, boolean>;
    const cord = (hx: number, hy: number) => `M${px0},${ky} Q${(px0 + hx) / 2},${Math.max(ky, hy) + 46} ${hx},${hy}`;
    const hN = handPos(sk.aN, atN, sgn("n"), d);
    const hF = handPos(sk.aF, atF, sgn("f"), d);
    return (
      <g>
        {v === "side" ? (
          <path d={`M${px0 - 34},${-d.T - 4} Q${px0 - 6},${ky - 30} ${px0},${ky} M${px0 - 18},${-d.T - 6} Q${px0 - 2},${ky - 34} ${px0},${ky}`} stroke={PICK.cord} strokeWidth={4} fill="none" />
        ) : (
          <path d={`M${px0 - 20},${-d.T - 4} Q${px0 - 14},${ky - 24} ${px0},${ky} Q${px0 + 14},${ky - 24} ${px0 + 20},${-d.T - 4}`} stroke={PICK.cord} strokeWidth={4} fill="none" />
        )}
        {held[1] && <path d={cord(hN[0], hN[1])} stroke={PICK.cord} strokeWidth={3.5} fill="none" />}
        {held[-1] && <path d={cord(hF[0], hF[1])} stroke={PICK.cord} strokeWidth={3.5} fill="none" />}
        {[-1, 1].filter((k) => !held[k]).map((k) => (
          <g key={k} transform={`translate(${px0 + k * 7},${ky}) rotate(${k * 16})`}>
            <rect x={-7} y={0} width={14} height={34} rx={7} fill={PICK.handle} stroke={OUT} strokeWidth={3} />
            <rect x={-8} y={26} width={16} height={14} rx={5} fill={PICK.cap} stroke={OUT} strokeWidth={3} />
          </g>
        ))}
      </g>
    );
  })() : null;

  const shiverLines = sk.shiver ? (
    <g stroke="#ffffff" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.55 + 0.45 * Math.sin(frame * 0.9)}>
      <path d={`M${hw + 18},${-d.T * 0.75} q8,10 0,20 M${hw + 30},${-d.T * 0.8} q8,14 0,28`} />
      <path d={`M${-hw - 18},${-d.T * 0.75} q-8,10 0,20 M${-hw - 30},${-d.T * 0.8} q-8,14 0,28`} />
    </g>
  ) : null;

  // Backpack: behind the torso (front / 3/4 / profile) or over it (back view).
  const strapC = shade(packC, 0.28);
  const bpH = bot - top - 44;
  const packBack = look.backpack && v !== "back" ? (
    <g>
      {v === "side" ? (
        <g>
          <rect x={-hw - 36} y={top + 22} width={50} height={bpH} rx={16} fill={packC} stroke={OUT} strokeWidth={4} />
          <rect x={-hw - 30} y={top + 22 + bpH * 0.52} width={30} height={bpH * 0.36} rx={8} fill={shade(packC, 0.16)} stroke={OUT} strokeWidth={3} />
        </g>
      ) : (
        <rect x={-hw - (v === "three" ? hw * 0.42 : hw * 0.22)} y={top + 20} width={w + (v === "three" ? hw * 0.42 : hw * 0.44)} height={bpH} rx={18} fill={packC} stroke={OUT} strokeWidth={4} />
      )}
    </g>
  ) : null;
  const packFront = look.backpack ? (
    v === "back" ? (
      <g>
        <rect x={-hw * 0.88} y={top + 10} width={hw * 1.76} height={bpH + 14} rx={20} fill={packC} stroke={OUT} strokeWidth={4} />
        <rect x={-hw * 0.6} y={top + 10 + (bpH + 14) * 0.5} width={hw * 1.2} height={(bpH + 14) * 0.38} rx={10} fill={shade(packC, 0.16)} stroke={OUT} strokeWidth={3} />
        <path d={`M${-hw * 0.88},${top + 10 + (bpH + 14) * 0.3} L${hw * 0.88},${top + 10 + (bpH + 14) * 0.3}`} stroke={shade(packC, 0.35)} strokeWidth={3.5} />
      </g>
    ) : (
      <g fill={strapC} stroke={OUT} strokeWidth={3}>
        {v === "side" ? (
          <rect x={ncx - 8} y={top + 2} width={15} height={bpH - 30} rx={6} />
        ) : (
          [-1, 1].map((k) => <rect key={k} x={ncx + k * w * 0.27 - 7.5} y={top + 2} width={15} height={bpH - 24} rx={6} />)
        )}
      </g>
    )
  ) : null;

  const torsoRot = `rotate(${sk.torso ?? 0}) translate(0,${breathe})`;
  const farBehind = !flat(v);
  const py = sk.py ?? 0;

  const drips = wet
    ? Array.from({ length: 7 }, (_, i) => {
        const dx = lying ? -170 + rand(seed * 13 + i) * 360 : (rand(seed * 13 + i) - 0.5) * w;
        const srcY = lying ? -12 : -H + py + d.hem;
        const t = ((frame + rand(i + 7) * 40) % 26) / 26;
        const cy = srcY + t * t * 70;
        return <path key={i} d={`M${dx},${cy - 9} Q${dx + 6},${cy} ${dx},${cy + 3} Q${dx - 6},${cy} ${dx},${cy - 9} Z`} fill="#a9dcf5" stroke={OUT} strokeWidth={2} opacity={1 - t} />;
      })
    : null;

  return (
    <g transform={`translate(${x + jx},${y}) scale(${flip ? -scale : scale},${scale})`}>
      {shadow && <ellipse cx={(sk.px ?? 0) + (lying ? (sk.body! > 0 ? 110 : -110) : 0)} cy={0} rx={lying ? 250 : 80} ry={lying ? 22 : 13} fill="#0b1020" opacity={0.22} />}
      <g transform={`translate(${sk.px ?? 0},${-H + py}) scale(1,${sk.squash ?? 1}) rotate(${sk.body ?? 0})`}>
        {farBehind && <g transform={torsoRot}>{arm("f")}</g>}
        {legs.map((l, i) => (
          <LegEl key={i} leg={l.leg} x={l.x} sign={l.s} look={look} view={v} far={l.far} legC={legC} cuff={winter} low={lowShoes} />
        ))}
        <g transform={torsoRot}>
          {packBack}
          {torsoEl}
          {ruff}
          {hoodPool}
          {packFront}
          <g transform={`translate(${headX},${-d.T}) rotate(${sk.head ?? 0}) translate(0,${-d.R})`}>
            <HeadEl look={look} view={v} expr={expr} blink={blink} talk={talk} frame={frame} seed={seed} uid={uid} rim={lr} breath={breath} />
          </g>
          {collar}
          {picks}
          {shiverLines}
          {!farBehind && arm("f")}
          {arm("n")}
        </g>
      </g>
      {drips}
    </g>
  );
};

// Head only (expression sheets, close-ups). Origin = head centre.
export const HeroHead = ({ look: lookIn, x, y, frame, view = "front", expr = "calm", talk = false, scale = 1, seed = 0, rim = DEFAULT_RIM, breath = false }: { look: HeroLook; x: number; y: number; frame: number; view?: View; expr?: HeroExpr; talk?: boolean; scale?: number; seed?: number; rim?: Rim | null; breath?: boolean }) => {
  const uid = `r${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const look = ageLook(lookIn);
  const lr: LocalRim = rim ? { color: rim.color, side: rim.side, w: rim.w ?? 6 } : null;
  const period = 66 + Math.floor(rand(seed + 3) * 50);
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <HeadEl look={look} view={view} expr={expr} blink={(frame + seed * 29) % period < 3} talk={talk} frame={frame} seed={seed} uid={uid} rim={lr} breath={breath} />
    </g>
  );
};
