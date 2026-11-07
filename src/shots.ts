// "Ten Minutes Under": narration lines + the 38-shot beat board. Single source of truth for the episode.
// Keep runtime-import free (types only) so scripts can load it directly.
// World coordinates: see src/art/Lake.tsx (side + cut, horizon y=760, ice line y=1560, hole at x=1000,y=1330)
// and src/art/LakeTop.tsx (plan view, hole at 540,1150, 15 px per metre).
import type { Cam } from "./camera";
import type { Figure, Shot } from "./types";

export const TITLE = "ten-minutes-under";

// highlight: ONE coloured word per caption phrase (the last match wins). ":r" = red, ":g" = green, default gold.
export const LINES: { text: string; highlight: string[] }[] = [
  { text: "When the ice broke under me, I had ten minutes. Not seconds.", highlight: ["ten", "seconds:r"] },
  { text: "December, sunset, a frozen Minnesota lake. I was walking back from my brother's fishing shack.", highlight: ["december", "brother's"] },
  { text: "I cut past the creek and never checked the ice. Over moving water, it was six centimeters.", highlight: ["never:r", "six"] },
  { text: "The Minnesota DNR says under ten centimeters of new clear ice, stay off. White ice? About half as strong.", highlight: ["ten", "off:r", "half"] },
  { text: "One crack. Then black water, near zero degrees, up to my chest.", highlight: ["crack:r", "zero"] },
  { text: "Most people think they have seconds, so they panic and thrash. Or they think a heavy jacket drags you down, and tear it off.", highlight: ["seconds:r", "jacket"] },
  { text: "Both mistakes burn your time. Rescue experts call it one, ten, one. One minute: get your breathing under control.", highlight: ["ten", "breathing"] },
  { text: "Then about ten minutes of strength to get out. And about one hour before you pass out. That hour is not a rest.", highlight: ["ten", "hour", "rest:r"] },
  { text: "So for one minute, I only breathed. My jacket stayed on. Trapped air held me up.", highlight: ["breathed", "air"] },
  { text: "Which way? Step one: turn back the way you came. That ice already held you.", highlight: ["one", "back", "held:g"] },
  { text: "Step two: arms on the unbroken ice. I had ice picks around my neck for exactly this.", highlight: ["two", "picks"] },
  { text: "Step three: kick until you're flat, dig in the picks, and slide forward on your stomach.", highlight: ["three", "kick", "stomach"] },
  { text: "Step four: don't stand up. Roll away from the hole, arms and legs spread wide.", highlight: ["four", "stand", "roll"] },
  { text: "Minute four. Soaked, shaking, out. Step five: get somewhere warm and call nine-one-one.", highlight: ["four", "out", "nine-one-one"] },
  { text: 'Then I heard my name. "Eli!" My brother saw it all from the shack. He was running straight at the hole.', highlight: ["eli", "running:r"] },
  { text: "The first rule of helping someone? Never rush to the hole. Part two.", highlight: ["rush:r", "two"] },
];

// ---- helpers --------------------------------------------------------------------------------------
// Camera that puts world point (wx, wy) at screen (sx, sy).
const v = (wx: number, wy: number, zoom: number, sy = 900, sx = 540): Cam => ({ x: wx - (sx - 540) / zoom, y: wy - (sy - 960) / zoom, zoom });

const HX = 1000;
const HY = 1330;
const WL = HY + 14; // waterline in the plane view
const CUT_WL = 1620; // waterline in the cross-section
const ELI_S = 1.2; // Eli's scale in the hole (plane view)
const CUT_S = 0.9; // and in the cross-section

const eli = (o: Partial<Figure>): Figure => ({ id: "eli", x: 0, y: 0, ...o });
const brother = (o: Partial<Figure>): Figure => ({ id: "brother", x: 0, y: 0, ...o });
// Eli chest-deep in the hole, plane view (feet 226 units below the waterline) / cross-section.
const inHole = (o: Partial<Figure> = {}): Figure => eli({ x: HX, y: WL + 226 * ELI_S, scale: ELI_S, pose: "water", expr: "calm", sub: { y: WL }, ...o });
const inCut = (o: Partial<Figure> = {}): Figure => eli({ x: HX, y: CUT_WL + 226 * CUT_S, scale: CUT_S, pose: "water", expr: "calm", sub: { y: CUT_WL, tint: true }, ...o });
const FROZEN = { speed: 0 };

const RED = "#E53935";
const GOLD = "#F5C518";
const GREEN = "#2FD27A";
const BLUE = "#4DA3FF";
const ELI_C = "#F26B2A";

const RAW: Shot[] = [
  // ============================ 1  HOOK (4.9 s) ============================
  {
    id: "1a", line: 0, weight: 2.2, scene: "lakePrint",
    from: v(540, 980, 1.0, 960), to: v(540, 980, 1.2, 960),
    props: { who: "eli" }, world: { dusk: 0.02, crack: 0.95 }, worldT: 0.7,
    events: [{ at: 0.12, kind: "card", card: "title" }],
  },
  {
    id: "1b", line: 0, weight: 2.7, scene: "lakeSide",
    from: v(1130, 1050, 1.25, 800), to: v(1130, 1050, 1.4, 800),
    figures: [eli({ x: HX, y: HY, scale: 1.2, flip: true, pose: "walk", expr: "calm", speed: 0, seed: 1 })],
    world: { dusk: 0.02, crack: 0.95 }, fg: "pine",
    events: [{ at: 0, kind: "card", card: "title", opts: { cont: true }, dur: 2.5 }],
  },
  // ============================ 2  SETUP (6.1 s) ============================
  {
    id: "2a", line: 1, weight: 3.0, scene: "lakeSide",
    from: v(1580, 1082, 0.62, 1080), to: v(1640, 1082, 0.64, 1080),
    figures: [eli({ x: 2350, y: 905, scale: 0.42, flip: true, pose: "walk", walk: true, expr: "calm" })],
    world: { dusk: 0, crack: 0 }, worldT: 0.05, hud: { ghost: false },
    events: [
      { at: 0.1, kind: "tick", pill: "clock" },
      { at: 0.55, kind: "callout", text: "MINNESOTA", color: BLUE, pos: [330, 470], target: [900, 735] },
    ],
    fg: "pineR",
  },
  {
    id: "2b", line: 1, weight: 3.07, scene: "lakeSide",
    from: v(2380, 1000, 1.35, 840), to: v(2380, 1000, 1.4, 840), linear: true, follow: true,
    figures: [eli({ x: 2380, y: 1215, to: { y: 1282 }, scale: 0.85, flip: true, pose: "walk", walk: true, expr: "calm", breath: true })],
    hud: { ice: null },
    events: [
      { at: 0.04, kind: "callout", text: "ELI", color: ELI_C, pos: [430, 480], target: [2300, 940], dur: 1.2 },
      { at: 0.46, kind: "callout", text: "MY BROTHER'S SHACK", color: "#ff6b5e", pos: [640, 470], target: [2400, 760], dur: 1.6 },
    ],
  },
  // ============================ 3  THE MISTAKE (6.8 s) ============================
  {
    id: "3a", line: 2, weight: 2.6, scene: "lakeSide",
    from: v(1450, 1210, 0.62, 1080), to: v(1450, 1000, 0.62, 1080),
    figures: [eli({ x: 1900, y: 1262, to: { y: 1330 }, scale: 0.9, flip: true, pose: "walk", walk: true, expr: "calm" })],
    world: { dusk: 0.08 }, worldT: 1, fg: "pine",
    events: [
      { at: 0.15, kind: "callout", text: "CREEK", color: BLUE, pos: [560, 400], target: [1000, 700], dur: 1.4 },
      { at: 0.62, kind: "callout", text: "?", mark: true, color: GOLD, pos: [0, 0], target: [1000, 1170], dur: 1.2 },
    ],
  },
  {
    id: "3b", line: 2, weight: 2.2, scene: "lakeCut",
    from: v(1000, 1520, 0.95, 900), to: v(1000, 1880, 0.95, 900),
    props: { current: 1 },
    events: [{ at: 0.38, kind: "callout", text: "MOVING WATER", color: "#6fb3ff", pos: [540, 520], dur: 1.4 }],
  },
  {
    id: "3c", line: 2, weight: 2.04, scene: "lakeCut",
    from: v(1215, 1600, 3.0, 800), to: v(1215, 1600, 3.6, 800),
    props: { current: 0.4, ruler: 1 }, hud: { ice: 6 },
    events: [
      { at: 0.1, kind: "tick", pill: "ice" },
      { at: 0.12, kind: "stamp", text: "6 CM", color: "#d99a00", pos: [540, 470], dur: 1.5 },
    ],
  },
  // ============================ 4  THE DNR LADDER (7.6 s) ============================
  {
    id: "4a", line: 3, weight: 3.8, scene: "lakeSide",
    from: v(1450, 1082, 0.62, 1080), to: v(1450, 1082, 0.71, 1080),
    figures: [eli({ x: 1010, y: 1330, scale: 0.9, flip: true, pose: "stand", view: "side", expr: "calm", breath: true })],
    world: { dusk: 0.14 }, worldT: 1,
    events: [{ at: 0.02, kind: "card", card: "ladder", dim: 0.55 }],
  },
  {
    id: "4b", line: 3, weight: 2.3, scene: "lakeSide",
    from: v(1175, 1255, 2.3, 860), to: v(1150, 1255, 2.3, 860),
    figures: [eli({ x: 1185, y: 1290, scale: 1.3, flip: true, pose: "stand", view: "side", expr: "calm", breath: true })],
    world: { dusk: 0.2 }, worldT: 1,
    events: [{ at: 0.42, kind: "card", card: "swatch", opts: { x: 540, y: 560, text: "WHITE ICE ≈ ½ AS STRONG" } }],
  },
  {
    id: "4c", line: 3, weight: 1.51, scene: "lakeSide",
    from: v(1050, 1230, 0.95, 900), to: v(1050, 1230, 1.0, 900),
    figures: [eli({ x: 1060, y: 1312, scale: 1.0, flip: true, pose: "stand", view: "side", expr: "calm", breath: true })],
    world: { dusk: 0.3 }, worldT: 1, hud: { clock: 981 }, fg: "pine",
    events: [{ at: 0.1, kind: "tick", pill: "clock" }],
  },
  // ============================ 5  THE FALL (4.9 s) ============================
  {
    id: "5a", line: 4, weight: 1.5, scene: "lakeSide",
    from: v(1000, 1275, 2.2, 880), shake: 30,
    figures: [eli({ x: HX, y: HY, to: { y: WL + 226 * ELI_S }, scale: ELI_S, pose: "water", expr: "scared", sub: { y: WL } })],
    world: { dusk: 0.34, crack: 1, hole: 1 }, worldT: 0.6,
  },
  {
    id: "5b", line: 4, weight: 3.42, scene: "lakeCut",
    from: v(1000, 1515, 1.7, 650), to: v(1000, 1515, 1.95, 650),
    figures: [inCut({ expr: "scared", seed: 2 })],
    world: { dusk: 0.4 }, worldT: 1, hudT: 0.1, hud: { mode: "water", timer: 0, water: true, phase: "breathe" },
    props: { current: 0.6 }, fg: "chunks",
    events: [
      { at: 0.0, kind: "tick", pill: "clock" },
      { at: 0.17, kind: "tick", pill: "water" },
      { at: 0.7, kind: "callout", text: "CHEST", color: "#5cc8ff", pos: [830, 560], target: [1075, CUT_WL], dur: 1.6 },
    ],
  },
  // ============================ 6  TWO MISTAKES (9.5 s, world frozen) ============================
  {
    id: "6a", line: 5, weight: 2.7, scene: "lakeSide",
    from: v(1100, 1150, 0.95, 880), light: "freeze",
    figures: [inHole({ ...FROZEN, seed: 4 }), eli({ ghost: true, x: 1060, y: WL + 226 * ELI_S, to: { x: 1250 }, scale: ELI_S, pose: "panic", expr: "scared", sub: { y: WL }, rise: 0.4, seed: 5 })],
    world: { dusk: 0.42, freeze: 1 }, worldT: 0.12, hudT: 0.1, hud: { mode: "paused", timer: 4 },
    events: [{ at: 0.05, kind: "tick", pill: "clock" }],
  },
  {
    id: "6b", line: 5, weight: 3.0, scene: "lakeSide",
    from: v(1250, 1215, 2.0, 760), to: v(1240, 1215, 2.08, 760), light: "freeze",
    figures: [inHole({ ...FROZEN, seed: 4 }), eli({ ghost: true, x: 1250, y: WL + 226 * ELI_S, scale: ELI_S, pose: "panic", expr: "scared", sub: { y: WL }, seed: 5 })],
    events: [{ at: 0.05, kind: "callout", text: "MISTAKE 1 · PANIC", color: RED, pos: [540, 420], target: [1250, 1150], dur: 2.6 }],
  },
  {
    id: "6c", line: 5, weight: 3.83, scene: "lakeCut",
    from: v(1090, 1560, 1.2, 720), to: v(1090, 1560, 1.42, 720), light: "freeze",
    figures: [inCut({ ...FROZEN, seed: 4 }), eli({ ghost: true, x: 1190, y: CUT_WL + 226 * CUT_S, scale: CUT_S, pose: "zipper", expr: "scared", sub: { y: CUT_WL }, seed: 6 })],
    props: { current: 0.5, dArrow: 1 }, fg: "chunks",
    events: [
      { at: 0.1, kind: "callout", text: "?", mark: true, color: GOLD, pos: [0, 0], target: [1350, 1530], dur: 1.6 },
      { at: 0.56, kind: "callout", text: "MISTAKE 2 · JACKET OFF", color: RED, pos: [540, 440], target: [1190, 1560], dur: 2.6 },
    ],
  },
  // ============================ 7  1-10-1 (7.6 s) ============================
  {
    id: "7a", line: 6, weight: 1.9, scene: "lakeSide",
    from: v(1000, 1150, 0.95, 880), light: "freeze",
    figures: [
      inHole({ ...FROZEN, seed: 4 }),
      eli({ ghost: true, x: 1250, y: WL + 226 * ELI_S, scale: ELI_S, pose: "panic", expr: "scared", sub: { y: WL }, cross: 0.08, shatter: 0.38, seed: 5 }),
      eli({ ghost: true, x: 760, y: WL + 226 * ELI_S, scale: ELI_S, pose: "zipper", expr: "scared", sub: { y: WL }, cross: 0.12, shatter: 0.42, seed: 6 }),
    ],
  },
  {
    id: "7b", line: 6, weight: 2.7, scene: "lakeSide",
    from: v(1000, 1180, 0.9, 880), to: v(1000, 1180, 0.95, 880), light: "freeze",
    figures: [inHole({ ...FROZEN, seed: 4 })],
    events: [{ at: 0.0, kind: "card", card: "oneTenOne", dim: 0.62, opts: { chip: true, push: 0.06 } }],
  },
  {
    id: "7c", line: 6, weight: 3.0, scene: "lakeSide",
    from: v(1000, 1215, 2.4, 780), to: v(1000, 1215, 3.0, 780), light: "freeze",
    figures: [inHole({ expr: "closed", breath: true, speed: 0.4, seed: 4 })],
    hud: { strip: true },
    events: [{ at: 0.08, kind: "tick", pill: "strip" }],
  },
  // ============================ 8  ONE HOUR, NOT A REST (9.2 s) ============================
  {
    id: "8a", line: 7, weight: 3.5, scene: "lakeSide",
    from: v(1000, 1180, 0.95, 880), light: "freeze",
    figures: [inHole({ ...FROZEN, seed: 4 })],
    world: { dusk: 0.44 },
    events: [{ at: 0.0, kind: "card", card: "oneTenOne", dim: 0.66, opts: { s1: 1, f2a: 0, f2b: 1, meter: true, chip: false, pan: 40 } }],
  },
  {
    id: "8b", line: 7, weight: 3.1, scene: "lakeSide",
    from: v(1200, 1082, 0.62, 1080), to: v(1150, 1082, 0.62, 1080), light: "freeze",
    figures: [inHole({ ...FROZEN, scale: 1.2, seed: 4 })],
    world: { dusk: 0.46 }, fg: "chunks",
    events: [{ at: 0.3, kind: "tick", pill: "strip" }],
  },
  {
    id: "8c", line: 7, weight: 2.55, scene: "lakeSide",
    from: v(1000, 1215, 2.4, 780), to: v(1000, 1215, 3.1, 780), light: "freeze",
    figures: [inHole({ expr: "closed", breath: true, speed: 0.4, seed: 4 })],
    events: [{ at: 0.55, kind: "stamp", text: "NOT A REST", color: RED, pos: [540, 450], dur: 1.4 }],
  },
  // ============================ 9  ONE MINUTE (6.5 s) ============================
  {
    id: "9a", line: 8, weight: 2.8, scene: "lakeSide",
    from: v(1000, 1150, 0.95, 880),
    figures: [inHole({ breath: true, seed: 4 })],
    world: { dusk: 0.6, freeze: 0 }, worldT: 0.9, hudT: 0.8, hud: { mode: "water", timer: 60 },
    events: [{ at: 0.85, kind: "tick", pill: "strip" }],
  },
  {
    id: "9b", line: 8, weight: 3.65, scene: "lakeCut",
    from: v(1000, 1500, 1.25, 640), to: v(1000, 1470, 1.25, 640),
    figures: [inCut({ to: { y: CUT_WL + 226 * CUT_S - 20 }, breath: true, seed: 4 })],
    props: { current: 0.5, air: 1 }, hud: { phase: "getout" },
    events: [
      { at: 0.4, kind: "callout", text: "TRAPPED AIR", color: "#bfe8ff", pos: [790, 470], target: [1050, 1700], dur: 2.0 },
      { at: 0.92, kind: "tick", pill: "phase" },
    ],
  },
  // ============================ 10  STEP 1 (6.1 s) ============================
  {
    id: "10a", line: 9, weight: 3.1, scene: "lakeTop",
    from: v(540, 1150, 0.4, 1040, 330), to: v(540, 1150, 0.9, 1040, 330), snap: 8, whip: true, flash: "white",
    props: { arrowsAt: 0.04, keepAt: 0.5, trailGlowAt: 0.62 }, world: { dusk: 0.64 }, worldT: 0.3, hud: { timer: 100 },
    events: [
      { at: 0.28, kind: "stamp", text: "STEP 1", color: RED, pos: [540, 460], dur: 1.3 },
      { at: 0.66, kind: "callout", text: "TURN BACK", color: GREEN, pos: [780, 1010], target: [640, 972], dur: 1.6 },
    ],
  },
  {
    id: "10b", line: 9, weight: 2.97, scene: "lakeSide",
    from: v(1010, 1210, 1.9, 780), to: v(1010, 1210, 2.18, 780),
    figures: [inHole({ pose: "waterThree", expr: "focused", seed: 4, breath: true })],
    props: { trailGlow: 1 },
    events: [{ at: 0.22, kind: "callout", text: "HELD YOU ✓", color: GREEN, pos: [540, 460], dur: 1.8 }],
  },
  // ============================ 11  STEP 2 (6.8 s) ============================
  {
    id: "11a", line: 10, weight: 3.3, scene: "lakeSide",
    from: v(1150, 1180, 0.95, 880), world: { dusk: 0.66 },
    figures: [eli({ x: HX + 110, y: WL + 198 * ELI_S, scale: ELI_S, pose: "onIce", expr: "focused", sub: { y: WL }, breath: true, seed: 4 })],
    props: { edgeLip: 1 },
    events: [{ at: 0.04, kind: "stamp", text: "STEP 2", color: RED, pos: [540, 460], dur: 1.4 }],
  },
  {
    id: "11b", line: 10, weight: 1.5, scene: "lakeSide",
    from: v(1000, 1285, 4.4, 800),
    figures: [inHole({ y: WL + 176 * ELI_S, pose: "waterThree", expr: "focused", seed: 4 })],
    events: [{ at: 0.12, kind: "callout", text: "ICE PICKS", color: "#e9eef7", pos: [790, 520], dur: 1.3 }],
  },
  {
    id: "11c", line: 10, weight: 2.04, scene: "lakeSide",
    from: v(1050, 1180, 1.4, 760), to: v(1050, 1180, 1.6, 760),
    figures: [inHole({ pose: "waterPicks", expr: "focused", seed: 4 })],
    hud: { timer: 150 }, fg: "pineR", props: { edgeLip: 1 },
  },
  // ============================ 12  STEP 3 (6.5 s) ============================
  {
    id: "12a", line: 11, weight: 3.3, scene: "lakeCut",
    from: v(1040, 1590, 1.0, 880), world: { dusk: 0.68 },
    figures: [eli({ x: 1000, y: 1768, to: { x: 1075, y: 1650 }, scale: 0.75, pose: "kickMorph", expr: "focused", sub: { y: CUT_WL, tint: true }, seed: 4 })],
    props: { current: 0.5 },
    events: [
      { at: 0.04, kind: "stamp", text: "STEP 3", color: RED, pos: [540, 460], dur: 1.3 },
      { at: 0.46, kind: "card", card: "angle", opts: { a0: 70, a1: 0 } },
    ],
  },
  {
    id: "12b", line: 11, weight: 3.15, scene: "lakeSide",
    from: v(960, 1300, 1.7, 800), to: v(960, 1300, 1.7, 800), linear: true, follow: true,
    figures: [eli({ x: 830, y: 1372, to: { x: 1520 }, scale: 0.8, pose: "slide", wet: true, expr: "focused", sub: { y: WL, x: 1190 }, seed: 4 })],
    props: { chips: 1 }, hud: { timer: 210 }, world: { dusk: 0.7 }, fg: "ridge",
  },
  // ============================ 13  STEP 4 (6.1 s) ============================
  {
    id: "13a", line: 12, weight: 2.5, scene: "lakeSide",
    from: v(1500, 1230, 0.95, 880), world: { wet: 0.35 }, worldT: 0.8,
    figures: [
      eli({ x: 1420, y: 1392, scale: 0.9, pose: "lie", wet: true, expr: "focused", speed: 0.5, seed: 4 }),
      eli({ ghost: true, x: 1760, y: 1372, scale: 1.2, pose: "stand", view: "three", flip: true, cross: 0.4, seed: 7 }),
    ],
    fg: "chunks",
    events: [{ at: 0.04, kind: "stamp", text: "STEP 4", color: RED, pos: [540, 450], dur: 1.3 }],
  },
  {
    id: "13b", line: 12, weight: 3.57, scene: "lakeTop",
    from: v(556, 1127, 6, 800), to: v(566, 1112, 6, 800), linear: true, world: { wet: 1, dusk: 0.74 }, worldT: 0.3,
    props: { eli: true, roll0: 0, roll1: 1, spread: 1 }, hud: { timer: 240 },
  },
  // ============================ 14  OUT (5.3 s) ============================
  {
    id: "14a", line: 13, weight: 2.3, scene: "lakeSide", light: "bluehour",
    from: v(1500, 1200, 0.9, 860), to: v(1500, 1200, 0.82, 860),
    figures: [eli({ x: 1760, y: 1392, scale: 0.9, pose: "lie", wet: true, expr: "relieved", seed: 4 })],
    world: { dusk: 0.8, wet: 1 }, worldT: 1, hudT: 0.2, hud: { mode: "out", timer: 250, phase: "out" }, props: { dim: 1 },
    events: [
      { at: 0.05, kind: "delta", text: "MINUTE 4", color: GREEN, dur: 1.5 },
      { at: 0.4, kind: "callout", text: "3 M", color: "#ffffff", pos: [1300 - 760, 560], target: [1480, 1440], dur: 1.6 },
    ],
  },
  {
    id: "14b", line: 13, weight: 3.0, scene: "lakeSide", light: "bluehour",
    from: v(1500, 1200, 0.82, 860), to: v(1500, 1200, 0.88, 860),
    figures: [eli({ x: 1760, y: 1392, scale: 0.9, pose: "lie", wet: true, expr: "relieved", seed: 4 })],
    hud: { strip: false }, props: { dim: 1 },
    events: [
      { at: 0.03, kind: "stamp", text: "STEP 5", color: RED, pos: [540, 450], dur: 1.2 },
      { at: 0.3, kind: "card", card: "phone911", dim: 0.5 },
    ],
  },
  // ============================ 15  HIS BROTHER (8.4 s) ============================
  {
    id: "15a", line: 14, weight: 2.6, scene: "lakeSide", light: "night",
    from: v(1990, 1320, 2.0, 780),
    figures: [eli({ x: 1760, y: 1392, scale: 0.9, pose: "lie", wet: true, expr: "shouting", speed: 0.3, seed: 4 })],
    world: { dusk: 0.9 }, worldT: 1, hud: { mode: "clock", clock: 987, phase: "none" },
    events: [
      { at: 0.05, kind: "tick", pill: "clock" },
      { at: 0.6, kind: "bubble", text: "ELI!", pos: [800, 540], side: "right", dur: 1.1 },
    ],
  },
  {
    id: "15b", line: 14, weight: 2.9, scene: "lakeSide", light: "night",
    from: v(1850, 1082, 0.62, 1080), to: v(2030, 1082, 0.62, 1080), snap: 6,
    figures: [
      eli({ x: 1760, y: 1392, scale: 0.9, pose: "lie", wet: true, expr: "focused", speed: 0.3, seed: 4 }),
      brother({ x: 2370, y: 1020, to: { x: 2210, y: 1210, scale: 0.6 }, scale: 0.3, pose: "run", expr: "shouting", seed: 8 }),
    ],
    world: { dusk: 1 }, worldT: 1, props: { door: 1 }, hud: { brother: 60 }, hudT: 0.3, fg: "ridge",
    events: [{ at: 0.2, kind: "callout", text: "MY BROTHER", color: "#6bd49a", pos: [620, 560], target: [2330, 1060], dur: 1.8 }],
  },
  {
    id: "15c", line: 14, weight: 2.88, scene: "lakeTop", light: "night",
    from: v(540, 1150, 0.4, 1040, 330), to: v(540, 1150, 0.9, 1040, 330), snap: 8, whip: true, flash: "white",
    props: { broPath: 1, bro0: 0, bro1: 0.34, broShow: 1, door: 1 }, world: { dusk: 1 }, hud: { brother: 40 }, hudT: 0.9,
    events: [{ at: 0.1, kind: "tick", pill: "brother" }],
  },
  // ============================ 16  PART 2 (5.3 s) ============================
  {
    id: "16a", line: 15, weight: 3.7, scene: "lakeSide", light: "night",
    from: v(1090, 1000, 1.2, 780), to: v(1090, 1000, 1.36, 780),
    figures: [brother({ x: 1170, y: 1130, to: { x: 1060, y: 1420, scale: 1.5 }, scale: 0.55, hold: 0.52, pose: "run", expr: "shouting", seed: 8 })],
    world: { dusk: 1 }, fg: "pineR",
    events: [{ at: 0.64, kind: "stamp", text: "NEVER RUSH TO THE HOLE", color: RED, pos: [540, 450], dur: 1.4 }],
  },
  {
    id: "16b", line: 15, weight: 1.6, scene: "lakePrint", light: "night",
    from: v(540, 980, 1.0, 960), to: v(540, 980, 1.1, 960),
    props: { who: "brother" }, world: { dusk: 1, crack: 0 }, worldT: 0.01, hud: { brother: null },
    events: [{ at: 0.0, kind: "card", card: "part2", dim: 0.28 }],
  },
];

export const SHOTS: Shot[] = RAW.map((s) => ({ particles: "snow", ...s }));
