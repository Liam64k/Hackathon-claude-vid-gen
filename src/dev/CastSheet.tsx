import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEROES } from "../art/heroes";
import { Hero, HeroHead, type Age, type HairStyle, type HeroExpr, type HeroLook, type HeroProps, type Outfit, type View } from "../art/Rig";
import { UI_FONT } from "../art/fonts";
import { castLook } from "../cast";

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
  const eli = { ...HEROES.eli, ...castLook("eli", HEROES.eli) };
  const bro = { ...HEROES.brother, ...castLook("brother", HEROES.brother) };
  const E = (p: Omit<HeroProps, "look" | "frame"> & { frame?: number }) => <Hero look={eli} frame={frame} {...p} />;
  const B = (p: Omit<HeroProps, "look" | "frame"> & { frame?: number }) => <Hero look={bro} frame={frame} {...p} />;
  const s1 = 0.95;
  const s2 = 0.85;

  return (
    <AbsoluteFill style={{ background: "#cdd7e2" }}>
      <svg viewBox="0 0 2160 1920" width={2160} height={1920}>
        <rect x={1080} width={1080} height={1920} fill="#c3cfdc" />
        {/* ---------------- ELI ---------------- */}
        <Label x={540} y={86} size={54}>{`${eli.name.toUpperCase()} · LEAD`}</Label>
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
        <Label x={1620} y={86} size={54}>{`${bro.name.toUpperCase()} · SECOND`}</Label>
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

        {/* expressions of the second character (right panel), 4 per row */}
        {EXPRS.map((e, i) => {
          const cx = 1080 + 135 + (i % 4) * 270;
          const cy = 1262 + Math.floor(i / 4) * 222;
          return (
            <g key={i}>
              <HeroHead look={bro} x={cx} y={cy + 92} frame={frame} expr={e} view={i % 2 === 0 ? "front" : "three"} scale={0.82} seed={i} />
              <Label x={cx} y={cy + 206} size={34}>{e.toUpperCase()}</Label>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---- Wardrobe sheet: every outfit x ages / views / hair / hats. Dev-only review sheet. 2520x2480. ----
const OUTFITS: Outfit[] = ["puffy", "parka", "jacket", "tshirt", "hoodie", "scrubs", "suit", "hivis", "uniform", "apron", "dress"];
const HAIRS: HairStyle[] = ["short", "long", "bun", "curly", "buzz", "bald"];
const PAL: Record<Outfit, { coat: string; trim: string; pants: string; boots: string; hatColor: string; hatBand: string; hat: HeroLook["hat"] }> = {
  puffy: { coat: "#D63B34", trim: "#F1E7D3", pants: "#2E3546", boots: "#4A3426", hatColor: "#2B2F3A", hatBand: "#F1E7D3", hat: "beanie" },
  parka: { coat: "#2F7D4F", trim: "#E3D5B8", pants: "#4A4A55", boots: "#3B2B22", hatColor: "#6A4A33", hatBand: "#E3D5B8", hat: "trapper" },
  jacket: { coat: "#27407A", trim: "#F2C14E", pants: "#5B5E66", boots: "#6B4A32", hatColor: "#F2C14E", hatBand: "#27407A", hat: "cap" },
  tshirt: { coat: "#E3A72F", trim: "#3A2E26", pants: "#3A3F4B", boots: "#F4F2EC", hatColor: "#1F2A44", hatBand: "#E3A72F", hat: "none" },
  hoodie: { coat: "#7B4BB0", trim: "#F4D35E", pants: "#2B2A38", boots: "#3B2B22", hatColor: "#F4D35E", hatBand: "#7B4BB0", hat: "none" },
  scrubs: { coat: "#1F8A84", trim: "#F6E3B4", pants: "#1F8A84", boots: "#F4F2EC", hatColor: "#E86A3A", hatBand: "#F6E3B4", hat: "none" },
  suit: { coat: "#2A2A30", trim: "#C2342A", pants: "#2A2A30", boots: "#1E1C1C", hatColor: "#2A2A30", hatBand: "#E8463A", hat: "none" },
  hivis: { coat: "#4E7BB5", trim: "#E9E2D0", pants: "#3A3530", boots: "#5A3E2B", hatColor: "#F5C21B", hatBand: "#E9E2D0", hat: "hardhat" },
  uniform: { coat: "#27407A", trim: "#E3B94A", pants: "#27407A", boots: "#1E1C1C", hatColor: "#27407A", hatBand: "#E3B94A", hat: "cap" },
  apron: { coat: "#B8432F", trim: "#EFE2C4", pants: "#3E4A5C", boots: "#5A3E2B", hatColor: "#EFE2C4", hatBand: "#B8432F", hat: "none" },
  dress: { coat: "#E66FA0", trim: "#FFF0F4", pants: "#35324A", boots: "#35324A", hatColor: "#35324A", hatBand: "#FFF0F4", hat: "none" },
};
const COLS: { label: string; age: Age; view: View; build?: "short" | "broad"; opts: (i: number) => Partial<HeroLook> }[] = [
  { label: "KID + helmet + pack", age: "kid", view: "front", opts: () => ({ hat: "helmet", backpack: true }) },
  { label: "TEEN glasses", age: "teen", view: "front", opts: (i) => ({ hat: "none", hairStyle: HAIRS[(i + 1) % 6], glasses: true }) },
  { label: "ADULT front", age: "adult", view: "front", opts: (i) => ({ hairStyle: HAIRS[i % 6] }) },
  { label: "ADULT 3/4 + pack", age: "adult", view: "three", opts: (i) => ({ hairStyle: HAIRS[(i + 2) % 6], backpack: true, hat: i % 3 === 0 ? PAL[OUTFITS[i]].hat : "none" }) },
  { label: "ADULT profile", age: "adult", view: "side", opts: (i) => ({ hairStyle: HAIRS[(i + 3) % 6], glasses: i % 2 === 0, hat: i % 2 ? "cap" : "none" }) },
  { label: "ADULT back", age: "adult", view: "back", opts: (i) => ({ hairStyle: HAIRS[(i + 1) % 6], backpack: true, hat: i % 2 ? "none" : PAL[OUTFITS[i]].hat }) },
  { label: "ELDER", age: "elder", view: "three", opts: (i) => ({ hat: "none", hair: "#E4E1DA", hairStyle: HAIRS[(i + 4) % 6 === 5 ? 0 : (i + 4) % 6], glasses: i % 2 === 1, facial: i % 3 === 0 ? "beard" : "none" }) },
];

export const WardrobeSheet = () => {
  const frame = useCurrentFrame();
  const rowH = 222;
  const colW = 330;
  const x0 = 190;
  return (
    <AbsoluteFill style={{ background: "#cdd7e2" }}>
      <svg viewBox="0 0 2520 2640" width={2520} height={2640}>
        {COLS.map((c, ci) => (
          <Label key={ci} x={x0 + ci * colW + colW / 2} y={50} size={30}>{c.label}</Label>
        ))}
        {OUTFITS.map((o, i) => {
          const y = 110 + i * rowH + 190;
          const skins = ["#E9B48E", "#D9A27C", "#87532F", "#F6D7C3", "#C68E62", "#A86F48"];
          return (
            <g key={o}>
              <rect x={0} y={y - 196} width={2520} height={i % 2 ? 0 : rowH} fill="#c3cfdc" />
              <text x={14} y={y - 80} fontSize={34} fontWeight={900} fontFamily={UI_FONT} fill={INK}>{o.toUpperCase()}</text>
              <line x1={x0} x2={2520} y1={y} y2={y} stroke="#9fb0c4" strokeWidth={3} />
              {COLS.map((c, ci) => {
                const base = HEROES.eli;
                const look: HeroLook = { ...base, ...PAL[o], outfit: o, coatKind: o as HeroLook["coatKind"], age: c.age, skin: skins[(i + ci) % 6], hair: ["#3B2619", "#1E1A1A", "#7A3424", "#D9B26A", "#5A3A26"][(i + ci) % 5], facial: "none", picks: false, ...c.opts(i) };
                return <Hero key={ci} look={look} x={x0 + ci * colW + colW / 2} y={y} frame={frame} view={c.view} scale={0.5} seed={i * 7 + ci} />;
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
