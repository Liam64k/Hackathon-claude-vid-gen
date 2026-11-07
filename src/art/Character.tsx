import { OUT, rand, shade } from "./kit";

export type Expression = "calm" | "shock" | "fear" | "angry" | "sly" | "sleep" | "laugh" | "pain";
export type Pose = "stand" | "phone" | "run" | "eyes" | "door" | "point" | "hug" | "flashlight" | "hands" | "sit" | "coat";

export interface Look {
  skin: string;
  hair: string;
  top: string;
  pants: string;
  shoes: string;
  hairStyle: "messy" | "cap" | "ponytail" | "kid" | "helmet" | "slick" | "bun" | "bald" | "curly";
  extra?: ("moustache" | "apron" | "tie" | "backpack" | "deliverybox" | "hoodie" | "dino" | "tote" | "keys" | "glasses" | "dust" | "beard")[];
  kid?: boolean;
}

export const CAST: Record<string, Look> = {
  hero: { skin: "#f0c39b", hair: "#3b2a20", top: "#3f6fd8", pants: "#2f3b55", shoes: "#e9e9e9", hairStyle: "messy", extra: ["hoodie", "backpack"] },
  ray: { skin: "#c98d63", hair: "#9a9a9a", top: "#6b7d8f", pants: "#3c4048", shoes: "#3a2a20", hairStyle: "cap", extra: ["moustache", "apron", "keys"] },
  maria: { skin: "#d9a07a", hair: "#2a1a14", top: "#d9577a", pants: "#3a3f6b", shoes: "#5a2a35", hairStyle: "ponytail", extra: ["tote"] },
  leo: { skin: "#e8b58e", hair: "#4a2c1c", top: "#ffb703", pants: "#3b5bdb", shoes: "#ff5d5d", hairStyle: "kid", extra: ["dino"], kid: true },
  dev: { skin: "#8d5a3b", hair: "#111111", top: "#ff7a1a", pants: "#2a2a2a", shoes: "#f2f2f2", hairStyle: "helmet", extra: ["deliverybox", "beard"] },
  grant: { skin: "#f2c9a8", hair: "#c9a25a", top: "#2b2f3a", pants: "#2b2f3a", shoes: "#141414", hairStyle: "slick", extra: ["tie", "glasses"] },
  stranger: { skin: "#a9a9a9", hair: "#6f6f6f", top: "#7d7d7d", pants: "#5f5f5f", shoes: "#4a4a4a", hairStyle: "curly", extra: ["dust"] },
};

const CROWD_TOPS = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#8e44ad", "#e9c46a", "#ff7096", "#4cc9f0", "#90be6d", "#f8f9fa", "#264653"];
const CROWD_SKIN = ["#f0c39b", "#d9a07a", "#8d5a3b", "#c98d63", "#5c3a24", "#f2d0b5"];
const CROWD_HAIR = ["#111", "#3b2a20", "#6b4226", "#c9a25a", "#a33", "#555"];
const STYLES: Look["hairStyle"][] = ["messy", "bun", "bald", "curly", "slick", "ponytail", "cap"];

export const crowdLook = (seed: number): Look => ({
  skin: CROWD_SKIN[Math.floor(rand(seed) * CROWD_SKIN.length)],
  hair: CROWD_HAIR[Math.floor(rand(seed + 1) * CROWD_HAIR.length)],
  top: CROWD_TOPS[Math.floor(rand(seed + 2) * CROWD_TOPS.length)],
  pants: ["#2f3b55", "#3c4048", "#5a4632", "#1f2a44"][Math.floor(rand(seed + 3) * 4)],
  shoes: ["#e9e9e9", "#222", "#7a4a2a"][Math.floor(rand(seed + 4) * 3)],
  hairStyle: STYLES[Math.floor(rand(seed + 5) * STYLES.length)],
  extra: rand(seed + 6) > 0.7 ? ["glasses"] : [],
});

// Outlined limb: a dark stroke under a coloured stroke.
const Limb = ({ d, color, w = 26 }: { d: string; color: string; w?: number }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={OUT} strokeWidth={w + 8} />
    <path d={d} stroke={color} strokeWidth={w} />
  </g>
);
const Hand = ({ x, y, skin }: { x: number; y: number; skin: string }) => <circle cx={x} cy={y} r={15} fill={skin} stroke={OUT} strokeWidth={4} />;

const Hair = ({ look, back }: { look: Look; back?: boolean }) => {
  const c = look.hair;
  const s = { fill: c, stroke: OUT, strokeWidth: 4 };
  switch (look.hairStyle) {
    case "messy":
      return back ? null : <path {...s} d="M-62,-318 C-70,-380 -20,-405 10,-395 C30,-410 70,-392 66,-352 C78,-340 70,-320 62,-318 C50,-345 30,-350 18,-338 C10,-352 -10,-350 -20,-336 C-35,-350 -55,-340 -62,-318 Z" />;
    case "cap":
      return back ? null : (
        <g>
          <path {...s} fill="#2d4a7a" d="M-60,-330 C-60,-392 60,-392 60,-330 Z" />
          <path {...s} fill="#2d4a7a" d="M20,-334 L96,-326 C96,-318 60,-316 20,-318 Z" />
          <circle cx={0} cy={-388} r={6} fill="#2d4a7a" stroke={OUT} strokeWidth={3} />
        </g>
      );
    case "ponytail":
      return back ? <path {...s} d="M-50,-350 C-110,-330 -110,-250 -80,-220 C-75,-270 -60,-300 -45,-320 Z" /> : <path {...s} d="M-62,-322 C-66,-390 62,-396 64,-330 C40,-360 -20,-366 -62,-322 Z" />;
    case "kid":
      return back ? null : <path {...s} d="M-64,-320 C-72,-392 66,-400 66,-326 C52,-350 30,-358 20,-344 C6,-360 -24,-360 -34,-342 C-46,-350 -60,-338 -64,-320 Z" />;
    case "helmet":
      return back ? null : (
        <g>
          <path {...s} fill="#ff7a1a" d="M-66,-322 C-70,-405 70,-405 68,-322 L60,-316 L-60,-316 Z" />
          <path d="M-40,-380 C-10,-396 20,-396 44,-380" stroke="#ffd0a8" strokeWidth={8} fill="none" strokeLinecap="round" />
          <rect x={-66} y={-326} width={134} height={12} rx={5} fill="#333" stroke={OUT} strokeWidth={3} />
        </g>
      );
    case "slick":
      return back ? null : <path {...s} d="M-60,-320 C-64,-384 40,-404 64,-344 C30,-372 -10,-366 -40,-344 C-50,-338 -56,-330 -60,-320 Z" />;
    case "bun":
      return back ? <circle cx={0} cy={-396} r={26} fill={c} stroke={OUT} strokeWidth={4} /> : <path {...s} d="M-62,-322 C-66,-388 62,-392 64,-326 C40,-356 -30,-360 -62,-322 Z" />;
    case "curly":
      return back ? null : (
        <g {...s}>
          {[-48, -24, 0, 24, 48].map((x, i) => (
            <circle key={x} cx={x} cy={-366 - (i % 2) * 14} r={26} />
          ))}
        </g>
      );
    case "bald":
      return back ? null : <path d="M-58,-330 C-50,-340 -40,-342 -36,-336 M58,-330 C50,-340 40,-342 36,-336" stroke={c} strokeWidth={10} fill="none" />;
  }
};

const Face = ({ expr, blink, look, frame }: { expr: Expression; blink: boolean; look: Look; frame: number }) => {
  const eyeY = -326;
  const closed = blink || expr === "sleep" || expr === "pain";
  const brow = {
    calm: [-6, 0], shock: [-16, 0], fear: [-12, 10], angry: [4, -12], sly: [-14, 6], sleep: [2, 0], laugh: [-10, 0], pain: [2, -10],
  }[expr];
  const mouth = {
    calm: "M-14,-292 Q0,-284 14,-292",
    shock: "",
    fear: "M-12,-288 Q0,-298 12,-288",
    angry: "M-16,-286 Q0,-296 16,-286",
    sly: "M-14,-292 Q6,-284 18,-296",
    sleep: "M-8,-290 Q0,-286 8,-290",
    laugh: "",
    pain: "M-16,-288 L16,-288",
  }[expr];
  return (
    <g>
      {closed ? (
        <g stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round">
          <path d={`M-34,${eyeY} q10,6 20,0`} />
          <path d={`M14,${eyeY} q10,6 20,0`} />
        </g>
      ) : (
        <g>
          {[-24, 24].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={eyeY} rx={expr === "shock" || expr === "fear" ? 13 : 11} ry={expr === "shock" || expr === "fear" ? 15 : 12} fill="#fff" stroke={OUT} strokeWidth={3} />
              <circle cx={x + (expr === "sly" ? 4 : 1)} cy={eyeY + 1} r={expr === "shock" ? 5 : 7} fill={OUT} />
              <circle cx={x + 3} cy={eyeY - 3} r={2.5} fill="#fff" />
            </g>
          ))}
        </g>
      )}
      {/* brows: [lift, inner tilt] */}
      <g stroke={look.hair === "#9a9a9a" ? "#7a7a7a" : OUT} strokeWidth={6} strokeLinecap="round">
        <line x1={-38} y1={eyeY - 22 + brow[0]} x2={-12} y2={eyeY - 22 + brow[0] - brow[1]} />
        <line x1={38} y1={eyeY - 22 + brow[0] + (expr === "sly" ? 10 : 0)} x2={12} y2={eyeY - 22 + brow[0] - brow[1] + (expr === "sly" ? 10 : 0)} />
      </g>
      <path d="M0,-318 q-6,14 4,16" stroke={shade(look.skin, 0.35)} strokeWidth={4} fill="none" strokeLinecap="round" />
      {expr === "shock" || expr === "laugh" ? (
        <ellipse cx={0} cy={-288} rx={expr === "laugh" ? 16 : 11} ry={expr === "laugh" ? 10 : 14 + Math.sin(frame / 3) * 1} fill="#5d1414" stroke={OUT} strokeWidth={3} />
      ) : (
        <path d={mouth} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" />
      )}
      {(expr === "fear" || expr === "pain") && <path d="M44,-352 q6,12 0,18 q-6,-6 0,-18Z" fill="#9fe0ff" stroke={OUT} strokeWidth={2} />}
      {expr !== "sleep" && <g fill="#ff8a8a" opacity={0.35}><circle cx={-36} cy={-300} r={9} /><circle cx={36} cy={-300} r={9} /></g>}
    </g>
  );
};

type Props = {
  look: Look;
  x: number;
  y: number;
  frame: number;
  seed?: number;
  expr?: Expression;
  pose?: Pose;
  scale?: number;
  flip?: boolean;
  glow?: boolean; // phone screen lit
};

// Flat cel-shaded character. Origin at the feet; about 420 units tall at scale 1.
export const Character = ({ look, x, y, frame, seed = 0, expr = "calm", pose = "stand", scale = 1, flip = false, glow = true }: Props) => {
  const s = scale * (look.kid ? 0.72 : 1);
  const blink = expr !== "sleep" && (frame + seed * 37) % (80 + (seed % 5) * 13) < 4;
  const breathe = Math.sin((frame + seed * 11) / 14) * 2;
  const run = pose === "run" ? Math.sin(frame / 3 + seed) : 0;
  const shake = expr === "fear" ? Math.sin(frame * 2.1 + seed) * 2 : 0;
  const ex = look.extra ?? [];
  const top = look.top;
  const sk = look.skin;

  // Arms: [left, right] paths from shoulders (-56,-236) and (56,-236)
  const arms: Record<Pose, { l: string; r: string; lh: [number, number]; rh: [number, number] }> = {
    stand: { l: "M-56,-236 Q-74,-180 -66,-130", r: "M56,-236 Q74,-180 66,-130", lh: [-66, -126], rh: [66, -126] },
    phone: { l: "M-56,-236 Q-74,-180 -66,-130", r: "M56,-236 Q96,-200 70,-284", lh: [-66, -126], rh: [70, -288] },
    run: { l: `M-56,-236 Q${-80 - run * 30},-190 ${-60 - run * 50},-150`, r: `M56,-236 Q${80 + run * 30},-190 ${60 + run * 50},-150`, lh: [-60 - run * 50, -146], rh: [60 + run * 50, -146] },
    eyes: { l: "M-56,-236 Q-80,-280 -26,-326", r: "M56,-236 Q80,-280 26,-326", lh: [-24, -326], rh: [24, -326] },
    door: { l: "M-56,-236 Q-74,-180 -66,-130", r: "M56,-236 Q120,-260 136,-330", lh: [-66, -126], rh: [136, -334] },
    point: { l: "M-56,-236 Q-74,-180 -66,-130", r: "M56,-236 Q110,-250 160,-262", lh: [-66, -126], rh: [164, -262] },
    hug: { l: "M-56,-236 Q-10,-170 60,-170", r: "M56,-236 Q110,-200 90,-160", lh: [62, -170], rh: [90, -156] },
    flashlight: { l: "M-56,-236 Q-74,-180 -66,-130", r: "M56,-236 Q100,-230 140,-226", lh: [-66, -126], rh: [144, -226] },
    hands: { l: "M-56,-236 Q-100,-280 -110,-330", r: "M56,-236 Q100,-280 110,-330", lh: [-110, -334], rh: [110, -334] },
    sit: { l: "M-56,-236 Q-70,-190 -40,-160", r: "M56,-236 Q70,-190 40,-160", lh: [-40, -156], rh: [40, -156] },
    coat: { l: "M-56,-236 Q-110,-260 -130,-300", r: "M56,-236 Q74,-180 66,-130", lh: [-132, -304], rh: [66, -126] },
  };
  const a = arms[pose];
  const sitting = pose === "sit";
  const armsEl = (
    <g>
      <Limb d={a.l} color={top} />
      <Limb d={a.r} color={top} />
      <Hand x={a.lh[0]} y={a.lh[1]} skin={sk} />
      <Hand x={a.rh[0]} y={a.rh[1]} skin={sk} />
    </g>
  );

  return (
    <g transform={`translate(${x + shake},${y}) scale(${flip ? -s : s},${s})`}>
      <ellipse cx={0} cy={0} rx={70} ry={12} fill="#000" opacity={0.22} />
      <g transform={`translate(0,${sitting ? 60 : 0})`}>
        {/* legs */}
        {sitting ? (
          <g>
            <Limb d="M-26,-120 L-80,-120 L-86,-64" color={look.pants} w={34} />
            <Limb d="M26,-120 L80,-120 L86,-64" color={look.pants} w={34} />
          </g>
        ) : (
          <g>
            <Limb d={`M-24,-122 L${-26 - run * 26},-14`} color={look.pants} w={36} />
            <Limb d={`M24,-122 L${26 + run * 26},-14`} color={look.pants} w={36} />
            <ellipse cx={-30 - run * 26} cy={-8} rx={30} ry={14} fill={look.shoes} stroke={OUT} strokeWidth={4} />
            <ellipse cx={30 + run * 26} cy={-8} rx={30} ry={14} fill={look.shoes} stroke={OUT} strokeWidth={4} />
          </g>
        )}
        <g transform={`translate(0,${breathe})`}>
          <Hair look={look} back />
          {ex.includes("backpack") && <rect x={-74} y={-246} width={40} height={110} rx={14} fill="#26324a" stroke={OUT} strokeWidth={4} />}
          {ex.includes("deliverybox") && (
            <g>
              <rect x={-120} y={-300} width={90} height={150} rx={10} fill="#2fbf71" stroke={OUT} strokeWidth={4} />
              <rect x={-112} y={-260} width={74} height={18} fill="#fff" opacity={0.85} />
            </g>
          )}
          {/* torso */}
          <path d="M-60,-250 Q0,-266 60,-250 L56,-120 Q0,-108 -56,-120 Z" fill={top} stroke={OUT} strokeWidth={4} />
          <path d="M28,-256 Q46,-254 60,-250 L56,-120 Q44,-116 30,-114 Z" fill={shade(top, 0.18)} />
          {ex.includes("hoodie") && (
            <g>
              <path d="M-40,-150 L40,-150 L36,-122 L-36,-122 Z" fill={shade(top, 0.1)} stroke={OUT} strokeWidth={3} />
              <path d="M-14,-250 L-16,-200 M14,-250 L16,-200" stroke="#fff" strokeWidth={4} />
            </g>
          )}
          {ex.includes("apron") && <path d="M-40,-230 L40,-230 L44,-110 L-44,-110 Z" fill="#5a7d5a" stroke={OUT} strokeWidth={3} />}
          {ex.includes("apron") && <rect x={-20} y={-190} width={40} height={30} rx={4} fill={shade("#5a7d5a", 0.2)} stroke={OUT} strokeWidth={2} />}
          {ex.includes("tie") && (
            <g>
              <path d="M-26,-254 L0,-210 L26,-254" fill="#f4f4f4" stroke={OUT} strokeWidth={3} />
              <path d="M0,-246 L-10,-226 L0,-160 L10,-226 Z" fill="#c1121f" stroke={OUT} strokeWidth={3} />
            </g>
          )}
          {ex.includes("dino") && (
            <path d="M-26,-170 q10,-30 30,-26 q10,-14 24,-4 q-4,8 -12,8 l2,22 l-8,0 l-2,-12 l-14,0 l0,12 l-8,0 Z" fill="#2fbf71" stroke={OUT} strokeWidth={3} />
          )}
          {ex.includes("dust") && (
            <g fill="#d9d9d9" opacity={0.7}>
              {Array.from({ length: 14 }, (_, k) => (
                <circle key={k} cx={-50 + rand(k + 3) * 100} cy={-250 + rand(k + 9) * 130} r={3 + rand(k) * 4} />
              ))}
            </g>
          )}
          {ex.includes("keys") && <g stroke="#e0c050" strokeWidth={3} fill="none"><circle cx={-48} cy={-128} r={8} /><path d="M-48,-120 l0,14 M-44,-120 l6,12" /></g>}
          {ex.includes("tote") && <path d="M-66,-230 L-84,-130 L-30,-130 Z" fill="#f1e3c8" stroke={OUT} strokeWidth={4} />}
          {pose !== "eyes" && armsEl}
          {pose === "phone" && (
            <g transform={`translate(${a.rh[0] - 16},${a.rh[1] - 52})`}>
              <rect width={34} height={60} rx={6} fill="#222" stroke={OUT} strokeWidth={3} />
              <rect x={4} y={5} width={26} height={48} rx={3} fill={glow ? "#ff3b3b" : "#3a6ea5"} />
              {glow && <rect x={4} y={5} width={26} height={48} rx={3} fill="#fff" opacity={((frame + seed) % 20) < 10 ? 0.35 : 0} />}
            </g>
          )}
          {pose === "flashlight" && (
            <g transform={`translate(${a.rh[0]},${a.rh[1]})`}>
              <rect x={-6} y={-12} width={50} height={24} rx={6} fill="#444" stroke={OUT} strokeWidth={3} />
              <rect x={38} y={-16} width={12} height={32} rx={3} fill="#ffe9a8" stroke={OUT} strokeWidth={3} />
            </g>
          )}
          {/* neck + head */}
          <rect x={-16} y={-276} width={32} height={30} fill={shade(sk, 0.12)} stroke={OUT} strokeWidth={3} />
          <circle cx={-60} cy={-322} r={13} fill={sk} stroke={OUT} strokeWidth={4} />
          <circle cx={60} cy={-322} r={13} fill={sk} stroke={OUT} strokeWidth={4} />
          <ellipse cx={0} cy={-322} rx={62} ry={64} fill={sk} stroke={OUT} strokeWidth={4} />
          <path d="M30,-376 Q62,-350 58,-300 Q44,-270 22,-262 Q52,-300 30,-376 Z" fill={shade(sk, 0.12)} />
          <Face expr={expr} blink={blink} look={look} frame={frame} />
          {ex.includes("moustache") && <path d="M-30,-300 Q-14,-312 0,-302 Q14,-312 30,-300 Q14,-292 0,-298 Q-14,-292 -30,-300 Z" fill="#8a8a8a" stroke={OUT} strokeWidth={3} />}
          {ex.includes("beard") && <path d="M-56,-310 Q-50,-258 0,-252 Q50,-258 56,-310 Q40,-280 0,-276 Q-40,-280 -56,-310 Z" fill="#111" opacity={0.9} />}
          {ex.includes("glasses") && (
            <g fill="none" stroke={OUT} strokeWidth={4}>
              <rect x={-44} y={-340} width={36} height={28} rx={8} />
              <rect x={8} y={-340} width={36} height={28} rx={8} />
              <path d="M-8,-328 L8,-328" />
            </g>
          )}
          {/* front hair is scaled up a little so it always covers the top of the head */}
          <g transform="translate(0,-330) scale(1.12) translate(0,330)">
            <Hair look={look} />
          </g>
          {pose === "eyes" && armsEl}
        </g>
      </g>
    </g>
  );
};
