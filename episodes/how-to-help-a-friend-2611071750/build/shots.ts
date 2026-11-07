// "Don't Run to Him": narration lines + the 40-shot beat board. Single source of truth for the episode.
// Keep runtime-import free (types only) so scripts can load it directly.
// World coordinates: see src/art/Lake.tsx (side + cut, horizon y=760, ice line y=1560, hole at x=1000,y=1330)
// and src/art/LakeTop.tsx (plan view, hole at 540,1150, 15 px per metre).
import type { Cam } from "./camera";
import type { Figure, Shot } from "./types";

export const TITLE = "how-to-help-a-friend-2611071750";

// highlight: ONE coloured word per caption phrase (the last match wins). ":r" = red, ":g" = green, default gold.
export const LINES: { text: string; highlight: string[] }[] = [
  { text: "If your brother falls through the ice, don't run to him.", highlight: ["brother", "run:r"] },
  { text: "December sunset, a Minnesota lake. My brother cut past the creek mouth to his red shack.", highlight: ["december", "creek:r", "red"] },
  { text: "One crack, and he was in. I was forty meters back, with my phone and my ice picks.", highlight: ["crack:r", "forty", "picks"] },
  { text: "Every part of me wanted to sprint out and grab him.", highlight: ["sprint:r", "grab:r"] },
  { text: "But a sprint puts all your weight on two boot prints, on ice that just broke.", highlight: ["weight", "two", "broke:r"] },
  { text: "One more crack, and there are two of you in the water.", highlight: ["crack:r", "two:r"] },
  { text: "So I stopped. Cold water runs on one, ten, one.", highlight: ["stopped:g", "ten"] },
  { text: "About one minute of gasping. About ten minutes of useful strength. Up to one hour before passing out.", highlight: ["minute", "ten", "hour"] },
  { text: "Enough time to do it right. Not enough to do it twice.", highlight: ["right:g", "twice:r"] },
  { text: "Step one: call. Nine-one-one, three things: the lake's name, the red shack, person in the water.", highlight: ["call:g", "three", "shack"] },
  { text: "Step two: reach or throw. I got down flat on my stomach to spread my weight out.", highlight: ["reach:g", "throw:g", "flat:g"] },
  { text: "I inched along his footprints, stopped short of the hole, and pushed my ice picks across to him on their cord.", highlight: ["footprints:g", "hole:r", "picks:g"] },
  { text: "Step three: don't go in after him. My job was to talk him out.", highlight: ["go:r", "talk:g"] },
  { text: "Arms on the ice. Kick your legs up flat. Dig in the picks and pull.", highlight: ["arms:g", "kick:g", "pull:g"] },
  { text: "He slid out on his stomach. Don't stand, I said. Roll the way you came.", highlight: ["stand:r", "roll:g"] },
  { text: "We rolled away along his footprints as blue hour fell. Soaked, shaking, but out.", highlight: ["footprints:g", "blue", "out:g"] },
  { text: "Out of the water isn't out of the cold. Part two: the hour after.", highlight: ["cold:r", "two"] },
];

// ---- helpers --------------------------------------------------------------------------------------
// Camera that puts world point (wx, wy) at screen (sx, sy).
const v = (wx: number, wy: number, zoom: number, sy = 900, sx = 540): Cam => ({ x: wx - (sx - 540) / zoom, y: wy - (sy - 960) / zoom, zoom });

const HX = 1000;
const HY = 1330;
const WL = HY + 14; // waterline in the plane view
const CUT_WL = 1620; // waterline in the cross-section
const ELI_S = 1.2; // figure scale in the hole (plane view)
const CUT_S = 0.9; // and in the cross-section

const eli = (o: Partial<Figure>): Figure => ({ id: "eli", x: 0, y: 0, ...o });
const brother = (o: Partial<Figure>): Figure => ({ id: "brother", x: 0, y: 0, ...o });
// Chest-deep in the hole, plane view (feet 226 units below the waterline) / cross-section.
const inHole = (o: Partial<Figure> = {}): Figure => eli({ x: HX, y: WL + 226 * ELI_S, scale: ELI_S, pose: "water", expr: "calm", sub: { y: WL }, ...o });
const inCut = (o: Partial<Figure> = {}): Figure => eli({ x: HX, y: CUT_WL + 226 * CUT_S, scale: CUT_S, pose: "water", expr: "calm", sub: { y: CUT_WL, tint: true }, ...o });
// The brother in the same spots (he is the one who falls in).
const broHole = (o: Partial<Figure> = {}): Figure => brother({ x: HX, y: WL + 226 * ELI_S, scale: ELI_S, pose: "water", expr: "scared", sub: { y: WL }, seed: 8, ...o });
const broCut = (o: Partial<Figure> = {}): Figure => brother({ x: HX, y: CUT_WL + 226 * CUT_S, scale: CUT_S, pose: "water", expr: "scared", sub: { y: CUT_WL, tint: true }, seed: 8, ...o });
// Eli on the ice, forty meters back from the hole, facing it / lying flat near it.
const onShore = (o: Partial<Figure> = {}): Figure => eli({ x: 1700, y: 1400, scale: 1.1, flip: true, pose: "stand", view: "side", expr: "calm", breath: true, ...o });
const lying = (o: Partial<Figure> = {}): Figure => eli({ x: 1290, y: 1345, scale: 0.96, flip: true, pose: "lie", expr: "focused", ...o });
const FROZEN = { speed: 0 };

const RED = "#E53935";
const GOLD = "#F5C518";
const GREEN = "#2FD27A";
const BLUE = "#4DA3FF";
const ELI_C = "#F26B2A";

const RAW: Shot[] = [
  // ============================ 1  HOOK (4.5 s) ============================
  {
    id: "1a", line: 0, weight: 2.2, scene: "lakeSide",
    from: v(1000, 1215, 2.4, 780), to: v(1000, 1215, 3.0, 780),
    figures: [broHole({ view: "back", seed: 8 })],
    world: { dusk: 0.02, crack: 1, hole: 1 }, worldT: 0.3, hud: { clock: 991 },
    events: [
      { at: 0.1, kind: "tag", text: "CREEK MOUTH", pos: [540, 420], color: "#ffffff" },
      { at: 0.5, kind: "tick", pill: "clock" },
    ],
  },
  {
    id: "1b", line: 0, weight: 2.3, scene: "lakeSide", cap: "high",
    from: v(1500, 1082, 0.62, 1080), to: v(1560, 1082, 0.64, 1080),
    figures: [
      broHole({ seed: 8 }),
      onShore({ expr: "scared", seed: 3 }),
      eli({ ghost: true, x: 1700, y: 1400, to: { x: 1380 }, scale: 1.1, flip: true, pose: "run", expr: "scared", rise: 0.25, seed: 5 }),
    ],
    events: [{ at: 0.5, kind: "stamp", text: "DON'T RUN", color: RED, pos: [540, 640], dur: 1.5 }],
  },
  // ============================ 2  SETUP (6.5 s) ============================
  {
    id: "2a", line: 1, weight: 3.2, scene: "lakeSide",
    from: v(1580, 1082, 0.62, 1080), to: v(1640, 1082, 0.64, 1080),
    figures: [
      brother({ x: 2300, y: 905, scale: 0.42, flip: true, pose: "walk", walk: true, expr: "calm", seed: 8 }),
      eli({ x: 2420, y: 905, scale: 0.42, flip: true, pose: "walk", walk: true, expr: "calm" }),
    ],
    world: { dusk: 0, crack: 0, hole: 0 }, worldT: 0.05, hud: { ghost: false, clock: 978 },
    events: [
      { at: 0.08, kind: "tick", pill: "clock" },
      { at: 0.12, kind: "callout", text: "DECEMBER SUNSET", color: GOLD, pos: [540, 470], dur: 1.5 },
      { at: 0.58, kind: "callout", text: "CREEK MOUTH", color: BLUE, pos: [330, 470], target: [1000, 700], dur: 1.6 },
    ],
    fg: "pineR",
  },
  {
    id: "2b", line: 1, weight: 3.3, scene: "lakeSide",
    from: v(2380, 1000, 1.35, 840), to: v(2380, 1000, 1.4, 840), linear: true, follow: true,
    figures: [brother({ x: 2380, y: 1215, to: { y: 1282 }, scale: 0.85, flip: true, pose: "walk", walk: true, expr: "calm", breath: true, seed: 8 })],
    props: { door: 1 },
    events: [
      { at: 0.06, kind: "callout", text: "MINNESOTA", color: BLUE, pos: [330, 470], dur: 1.2 },
      { at: 0.46, kind: "callout", text: "HIS RED SHACK", color: "#ff6b5e", pos: [640, 470], target: [2400, 760], dur: 1.8 },
    ],
  },
  // ============================ 3  THE FALL (7.2 s) ============================
  {
    id: "3a", line: 2, weight: 2.2, scene: "lakeSide",
    from: v(1000, 1275, 2.2, 880), shake: 30,
    figures: [broHole({ y: HY, to: { y: WL + 226 * ELI_S } })],
    world: { dusk: 0.06, crack: 1, hole: 1 }, worldT: 0.6, hudT: 0.1,
    hud: { clock: 991, mode: "water", timer: 0, water: true, phase: "breathe" },
    events: [
      { at: 0.05, kind: "stamp", text: "CRACK", color: RED, pos: [540, 430], dur: 1.2 },
      { at: 0.3, kind: "tick", pill: "water" },
    ],
  },
  {
    id: "3b", line: 2, weight: 2.4, scene: "lakeCut",
    from: v(1000, 1520, 0.95, 900), to: v(1000, 1880, 0.95, 900),
    figures: [broCut({ breath: true })],
    props: { current: 1 }, hud: { timer: 3 },
    events: [{ at: 0.35, kind: "callout", text: "MOVING WATER", color: "#6fb3ff", pos: [540, 520], dur: 1.5 }],
  },
  {
    id: "3c", line: 2, weight: 2.6, scene: "lakeSide",
    from: v(1700, 1250, 1.6, 800), to: v(1700, 1250, 1.8, 800),
    figures: [onShore({ expr: "scared", seed: 3 })],
    world: { dusk: 0.08 }, hud: { timer: 8, brother: 40 }, hudT: 0.4,
    events: [
      { at: 0.1, kind: "tick", pill: "brother" },
      { at: 0.3, kind: "callout", text: "PHONE", color: "#ffffff", pos: [380, 480], target: [1650, 1300], dur: 1.4 },
      { at: 0.65, kind: "callout", text: "ICE PICKS", color: "#e9eef7", pos: [720, 480], target: [1700, 1250], dur: 1.5 },
    ],
  },
  // ============================ 4  THE INSTINCT (4.5 s) ============================
  {
    id: "4a", line: 3, weight: 2.2, scene: "lakeSide",
    from: v(1700, 1250, 1.8, 800), to: v(1700, 1160, 3.4, 760), snap: 8, whip: true,
    figures: [onShore({ expr: "shouting", seed: 3 })],
    world: { dusk: 0.1 }, hud: { timer: 11 },
    events: [{ at: 0.1, kind: "tag", text: "INSTINCT", pos: [540, 420], color: RED }],
  },
  {
    id: "4b", line: 3, weight: 2.3, scene: "lakeTop",
    from: v(540, 1150, 0.4, 1040, 330), to: v(540, 1150, 0.9, 1040, 330), snap: 8, whip: true, flash: "white",
    props: { broPath: 1, bro0: 0.33, bro1: 0.7, broShow: 1 }, hud: { timer: 13, brother: 28 }, hudT: 0.9,
    events: [
      { at: 0.12, kind: "callout", text: "SPRINT", color: RED, pos: [760, 600], target: [746, 789], dur: 1.6 },
      { at: 0.5, kind: "tick", pill: "brother" },
    ],
  },
  // ============================ 5  WHY IT FAILS (6.5 s, world frozen) ============================
  {
    id: "5a", line: 4, weight: 3.2, scene: "lakeSide", light: "freeze", cap: "high",
    from: v(1500, 1130, 0.9, 900), to: v(1480, 1130, 1.0, 900),
    figures: [
      onShore({ ...FROZEN, seed: 3 }),
      broHole({ ...FROZEN }),
      eli({ ghost: true, x: 1640, y: 1385, to: { x: 1420 }, scale: 1.08, flip: true, pose: "run", expr: "scared", seed: 5 }),
    ],
    world: { dusk: 0.1, freeze: 1 }, worldT: 0.12, hudT: 0.1, hud: { mode: "paused", timer: 13 },
    events: [{ at: 0.45, kind: "callout", text: "ALL YOUR WEIGHT", color: RED, pos: [540, 620], target: [1500, 1300], dur: 1.8 }],
  },
  {
    id: "5b", line: 4, weight: 3.3, scene: "lakePrint", light: "freeze",
    from: v(540, 980, 1.0, 960), to: v(540, 980, 1.2, 960),
    props: { who: "eli" },
    events: [
      { at: 0.3, kind: "callout", text: "2 BOOT PRINTS", color: RED, pos: [540, 430], dur: 1.8 },
      { at: 0.65, kind: "tag", text: "SAME ICE THAT BROKE", pos: [540, 640], color: RED },
    ],
  },
  // ============================ 6  TWO IN THE WATER (4.9 s) ============================
  {
    id: "6a", line: 5, weight: 2.4, scene: "lakeCut", light: "freeze",
    from: v(1000, 1515, 1.25, 700), to: v(1000, 1515, 1.35, 700), shake: 14,
    figures: [
      broCut({ ...FROZEN }),
      eli({ ghost: true, x: 1210, y: CUT_WL + 226 * CUT_S, scale: CUT_S, pose: "water", expr: "scared", sub: { y: CUT_WL }, rise: 0.3, seed: 5 }),
    ],
    props: { current: 0.5 },
    events: [{ at: 0.4, kind: "tag", text: "2 IN THE WATER", pos: [540, 420], color: RED }],
  },
  {
    id: "6b", line: 5, weight: 2.5, scene: "lakeSide", light: "freeze",
    from: v(1120, 1150, 0.95, 880), to: v(1110, 1150, 1.0, 880),
    figures: [
      broHole({ ...FROZEN }),
      eli({ ghost: true, x: 1240, y: WL + 226 * ELI_S, scale: ELI_S, pose: "panic", expr: "scared", sub: { y: WL }, cross: 0.5, shatter: 0.7, seed: 5 }),
    ],
    events: [{ at: 0.15, kind: "stamp", text: "MISTAKE", color: RED, pos: [540, 450], dur: 1.5 }],
  },
  // ============================ 7  1-10-1 (4.1 s) ============================
  {
    id: "7a", line: 6, weight: 2.0, scene: "lakeSide", cap: "high",
    from: v(1450, 1082, 0.62, 1080), to: v(1450, 1082, 0.66, 1080), flash: "white",
    figures: [onShore({ seed: 3 }), broHole({ breath: true, expr: "scared" })],
    world: { dusk: 0.12, freeze: 0 }, worldT: 0.2, hudT: 0.3, hud: { mode: "water", timer: 14, brother: 40 },
    events: [
      { at: 0.2, kind: "stamp", text: "STOP", color: GREEN, pos: [540, 640], dur: 1.3 },
      { at: 0.5, kind: "tick", pill: "brother" },
    ],
  },
  {
    id: "7b", line: 6, weight: 2.1, scene: "lakeCut",
    from: v(1000, 1515, 1.7, 650), to: v(1000, 1515, 1.95, 650),
    figures: [broCut({ breath: true })],
    props: { current: 0.6 },
    events: [{ at: 0.0, kind: "card", card: "oneTenOne", dim: 0.62, opts: { chip: false, push: 0.06 } }],
  },
  // ============================ 8  THE NUMBERS (6.8 s) ============================
  {
    id: "8a", line: 7, weight: 2.2, scene: "lakeCut",
    from: v(1000, 1500, 1.25, 640), to: v(1000, 1470, 1.25, 640),
    figures: [broCut({ breath: true, expr: "scared" })],
    props: { current: 0.5 }, hudT: 0.3, hud: { strip: true, timer: 20 },
    events: [
      { at: 0.05, kind: "tick", pill: "strip" },
      { at: 0.3, kind: "callout", text: "1 MIN · GASPING", color: RED, pos: [540, 430], dur: 1.6 },
    ],
  },
  {
    id: "8b", line: 7, weight: 2.3, scene: "lakeCut",
    from: v(1060, 1560, 2.4, 760), to: v(1060, 1560, 2.8, 760),
    figures: [broCut({ expr: "focused", breath: true })],
    props: { current: 0.5 },
    events: [
      { at: 0.1, kind: "tick", pill: "strip" },
      { at: 0.2, kind: "callout", text: "10 MIN OF STRENGTH", color: GOLD, pos: [540, 430], dur: 1.8 },
    ],
  },
  {
    id: "8c", line: 7, weight: 2.3, scene: "lakeCut",
    from: v(1000, 1600, 0.95, 900), to: v(1000, 1750, 0.95, 900),
    figures: [broCut({ expr: "closed", breath: true })],
    props: { current: 0.7 },
    events: [
      { at: 0.1, kind: "tick", pill: "strip" },
      { at: 0.3, kind: "callout", text: "1 HR · PASS OUT", color: RED, pos: [540, 430], dur: 1.8 },
    ],
  },
  // ============================ 9  THE STAKE (4.9 s) ============================
  {
    id: "9a", line: 8, weight: 2.4, scene: "lakeSide",
    from: v(1700, 1180, 2.0, 800), to: v(1700, 1180, 2.3, 800),
    figures: [onShore({ expr: "focused", seed: 3 })],
    world: { dusk: 0.16 }, hudT: 0.4, hud: { timer: 70, phase: "getout" },
    events: [
      { at: 0.1, kind: "tick", pill: "phase" },
      { at: 0.2, kind: "tag", text: "DO IT RIGHT", pos: [540, 420], color: GREEN },
    ],
  },
  {
    id: "9b", line: 8, weight: 2.5, scene: "lakeTop",
    from: v(540, 1150, 0.7, 1040, 330), to: v(540, 1150, 0.8, 1040, 330),
    props: { broPath: 1 }, hud: { brother: 40 },
    events: [
      { at: 0.1, kind: "callout", text: "SPRINT PATH", color: RED, pos: [760, 600], target: [746, 789], dur: 1.6 },
      { at: 0.6, kind: "stamp", text: "ONLY ONCE", color: RED, pos: [540, 460], dur: 1.4 },
    ],
  },
  // ============================ 10  STEP 1: CALL (6.8 s) ============================
  {
    id: "10a", line: 9, weight: 2.0, scene: "lakeSide",
    from: v(1650, 1230, 1.3, 900), to: v(1650, 1230, 1.45, 900),
    figures: [onShore({ expr: "focused", talk: true, seed: 3 })],
    world: { dusk: 0.2 }, hud: { timer: 80 },
    events: [
      { at: 0.05, kind: "stamp", text: "STEP 1", color: GREEN, pos: [540, 450], dur: 1.3 },
      { at: 0.55, kind: "callout", text: "CALL FIRST", color: GREEN, pos: [540, 560], dur: 1.2 },
    ],
  },
  {
    id: "10b", line: 9, weight: 2.4, scene: "lakeTop",
    from: v(540, 1150, 0.8, 1040, 330), to: v(540, 1150, 0.85, 1040, 330),
    props: { door: 1 },
    events: [
      { at: 0.0, kind: "stamp", text: "911", color: RED, pos: [760, 380], dur: 1.2 },
      { at: 0.3, kind: "callout", text: "1 LAKE NAME", color: "#ffffff", pos: [380, 520], target: [540, 1150], dur: 1.5 },
      { at: 0.55, kind: "callout", text: "2 RED SHACK", color: "#ff6b5e", pos: [380, 620], target: [952, 428], dur: 1.5 },
      { at: 0.8, kind: "callout", text: "3 PERSON IN WATER", color: BLUE, pos: [380, 720], target: [540, 1150], dur: 1.5 },
    ],
  },
  // ============================ 11  STEP 2: REACH OR THROW (6.8 s) ============================
  {
    id: "11a", line: 10, weight: 2.2, scene: "lakeSide",
    from: v(1550, 1200, 0.9, 860), to: v(1550, 1200, 1.0, 860),
    figures: [lying({ x: 1700, y: 1400, scale: 1.1 }), broHole({ breath: true })],
    world: { dusk: 0.24 }, hud: { timer: 100 },
    events: [
      { at: 0.05, kind: "stamp", text: "STEP 2", color: GREEN, pos: [540, 450], dur: 1.3 },
      { at: 0.55, kind: "callout", text: "REACH OR THROW", color: GREEN, pos: [540, 560], dur: 1.2 },
    ],
  },
  {
    id: "11b", line: 10, weight: 2.3, scene: "lakeSide",
    from: v(1700, 1320, 2.0, 820), to: v(1700, 1320, 2.2, 820),
    figures: [lying({ x: 1700, y: 1400, scale: 1.1, expr: "calm", breath: true })],
    events: [
      { at: 0.1, kind: "tag", text: "FLAT ON YOUR STOMACH", pos: [540, 330], color: GREEN },
      { at: 0.55, kind: "callout", text: "WEIGHT SPREAD OUT", color: GREEN, pos: [540, 480], target: [1700, 1390], dur: 1.5 },
    ],
  },
  {
    id: "11c", line: 10, weight: 2.3, scene: "lakeTop",
    from: v(556, 1127, 6, 800), to: v(560, 1120, 6, 800), linear: true,
    props: { eli: true, roll0: 0, roll1: 0, spread: 1 }, hud: { timer: 110 },
    events: [{ at: 0.2, kind: "callout", text: "WEIGHT SPREAD OUT", color: GREEN, pos: [540, 430], dur: 1.8 }],
  },
  // ============================ 12  THE SLIDE AND THE PICKS (8.4 s) ============================
  {
    id: "12a", line: 11, weight: 2.8, scene: "lakeSide",
    from: v(1700, 1250, 1.2, 860), to: v(1700, 1250, 1.2, 860), linear: true, follow: true,
    figures: [lying({ x: 1700, y: 1400, to: { x: 1400, y: 1330 }, scale: 1.0, pose: "slide", seed: 4 }), broHole({ breath: true })],
    props: { trailGlow: 1 }, world: { dusk: 0.28 }, hud: { timer: 150, brother: 20 }, hudT: 0.9,
    events: [
      { at: 0.1, kind: "tag", text: "HIS FOOTPRINTS", pos: [540, 330], color: GREEN },
      { at: 0.6, kind: "callout", text: "ICE THAT HELD", color: GREEN, pos: [540, 470], dur: 1.6 },
    ],
  },
  {
    id: "12b", line: 11, weight: 2.8, scene: "lakeSide",
    from: v(1150, 1250, 1.5, 800), to: v(1150, 1250, 1.6, 800),
    figures: [lying({ x: 1290, y: 1345, seed: 4 }), broHole({ breath: true })],
    props: { trailGlow: 1 }, hud: { timer: 200, brother: 6 }, hudT: 0.9,
    events: [
      { at: 0.1, kind: "tick", pill: "brother" },
      { at: 0.3, kind: "callout", text: "STOP SHORT OF HOLE", color: RED, pos: [540, 450], target: [1000, 1330], dur: 1.8 },
    ],
  },
  {
    id: "12c", line: 11, weight: 2.8, scene: "lakeSide",
    from: v(1130, 1270, 2.2, 800), to: v(1130, 1270, 2.5, 800),
    figures: [lying({ x: 1290, y: 1345, seed: 4 }), broHole({ pose: "waterThree", expr: "focused", y: WL + 176 * ELI_S })],
    props: { chips: 0 }, hud: { timer: 215 },
    events: [{ at: 0.3, kind: "callout", text: "ICE PICKS ON CORD", color: "#e9eef7", pos: [540, 450], target: [1150, 1310], dur: 2.0 }],
  },
  // ============================ 13  STEP 3: DON'T GO IN (5.7 s) ============================
  {
    id: "13a", line: 12, weight: 2.8, scene: "lakeSide",
    from: v(1250, 1180, 1.1, 880), to: v(1250, 1180, 1.2, 880),
    figures: [
      lying({ seed: 4 }),
      broHole({ breath: true, pose: "waterThree", expr: "focused", y: WL + 176 * ELI_S }),
      eli({ ghost: true, x: 1290, y: 1345, to: { x: 1060 }, scale: 0.96, flip: true, pose: "slide", rise: 0.2, cross: 0.6, seed: 5 }),
    ],
    world: { dusk: 0.34 }, hud: { timer: 240 },
    events: [
      { at: 0.05, kind: "stamp", text: "STEP 3", color: GREEN, pos: [540, 450], dur: 1.3 },
      { at: 0.5, kind: "callout", text: "DON'T GO IN", color: RED, pos: [540, 560], dur: 1.5 },
    ],
  },
  {
    id: "13b", line: 12, weight: 2.9, scene: "lakeSide",
    from: v(1300, 1290, 2.2, 800), to: v(1300, 1290, 2.5, 800),
    figures: [lying({ expr: "shouting", talk: true, seed: 4 })],
    hud: { timer: 270 },
    events: [{ at: 0.2, kind: "bubble", text: "I'LL TALK YOU OUT.", pos: [540, 520], side: "right", dur: 2.0 }],
  },
  // ============================ 14  SELF-RESCUE (5.7 s) ============================
  {
    id: "14a", line: 13, weight: 1.9, scene: "lakeCut",
    from: v(1000, 1515, 1.7, 650), to: v(1000, 1515, 1.95, 650),
    figures: [broCut({ pose: "waterThree", expr: "focused", y: CUT_WL + 176 * CUT_S })],
    world: { dusk: 0.38 }, props: { current: 0.5 }, hud: { timer: 300 },
    events: [{ at: 0.1, kind: "callout", text: "ARMS ON THE ICE", color: GREEN, pos: [540, 430], dur: 1.6 }],
  },
  {
    id: "14b", line: 13, weight: 1.9, scene: "lakeCut",
    from: v(1040, 1590, 1.0, 880),
    figures: [brother({ x: 1000, y: 1768, to: { x: 1075, y: 1650 }, scale: 0.75, pose: "kickMorph", expr: "focused", sub: { y: CUT_WL, tint: true }, seed: 8 })],
    props: { current: 0.5 }, hud: { timer: 330 },
    events: [
      { at: 0.1, kind: "callout", text: "LEGS UP FLAT", color: GREEN, pos: [540, 440], dur: 1.5 },
      { at: 0.2, kind: "card", card: "angle", opts: { a0: 70, a1: 0 } },
    ],
  },
  {
    id: "14c", line: 13, weight: 1.9, scene: "lakeSide",
    from: v(1100, 1290, 3.0, 800), to: v(1100, 1290, 3.3, 800),
    figures: [brother({ x: HX + 110, y: WL + 198 * ELI_S, scale: ELI_S, pose: "picks", expr: "focused", sub: { y: WL }, seed: 8 })],
    props: { edgeLip: 1 }, hud: { timer: 350 }, fg: "chunks",
    events: [{ at: 0.1, kind: "callout", text: "DIG IN · PULL", color: GREEN, pos: [540, 440], dur: 1.6 }],
  },
  // ============================ 15  OUT AND ROLL (6.1 s) ============================
  {
    id: "15a", line: 14, weight: 2.0, scene: "lakeSide",
    from: v(960, 1300, 1.7, 800), to: v(960, 1300, 1.7, 800), linear: true, follow: true,
    figures: [brother({ x: 830, y: 1372, to: { x: 1520 }, scale: 0.8, pose: "slide", wet: true, expr: "focused", sub: { y: WL, x: 1190 }, seed: 8 })],
    world: { dusk: 0.44, wet: 0.35 }, worldT: 0.8, props: { chips: 0 }, fg: "ridge",
    hudT: 0.3, hud: { mode: "out", timer: 400, phase: "out", water: false, strip: false, brother: null },
    events: [{ at: 0.2, kind: "delta", text: "HE'S OUT OF THE WATER", color: GREEN, dur: 1.8 }],
  },
  {
    id: "15b", line: 14, weight: 2.0, scene: "lakeSide",
    from: v(1300, 1300, 2.2, 820), to: v(1300, 1300, 2.4, 820),
    figures: [lying({ expr: "shouting", talk: true, seed: 4 })],
    world: { dusk: 0.5, wet: 0.6 },
    events: [
      { at: 0.05, kind: "bubble", text: "DON'T STAND!", pos: [540, 620], side: "right", dur: 1.6 },
      { at: 0.4, kind: "stamp", text: "DON'T STAND", color: RED, pos: [540, 430], dur: 1.3 },
    ],
  },
  {
    id: "15c", line: 14, weight: 2.1, scene: "lakeTop",
    from: v(556, 1127, 6, 800), to: v(566, 1112, 6, 800), linear: true,
    props: { eli: true, roll0: 0, roll1: 1, spread: 1 }, world: { wet: 1, dusk: 0.56 }, worldT: 0.3,
    events: [{ at: 0.15, kind: "callout", text: "ROLL BACK · SAME PATH", color: GREEN, pos: [540, 430], dur: 1.8 }],
  },
  // ============================ 16  AWAY AT BLUE HOUR (5.7 s) ============================
  {
    id: "16a", line: 15, weight: 2.8, scene: "lakeSide", cap: "high",
    from: v(1620, 1082, 0.7, 1080), to: v(1580, 1082, 0.62, 1080),
    figures: [
      brother({ x: 1500, y: 1300, to: { x: 1760 }, scale: 0.95, pose: "roll", wet: true, expr: "relieved", seed: 8 }),
      eli({ x: 1640, y: 1330, to: { x: 1900 }, scale: 0.97, pose: "roll", wet: true, expr: "relieved", seed: 4 }),
    ],
    world: { dusk: 0.78, wet: 1 }, worldT: 0.9, hud: { mode: "clock", clock: 996 }, hudT: 0.5,
    events: [
      { at: 0.1, kind: "tick", pill: "clock" },
      { at: 0.55, kind: "callout", text: "HIS FOOTPRINTS", color: GREEN, pos: [540, 640], target: [1800, 1250], dur: 1.8 },
    ],
  },
  {
    id: "16b", line: 15, weight: 2.9, scene: "lakeTop",
    from: v(572, 1095, 1.4, 860), to: v(572, 1095, 1.5, 860),
    props: { eli: true, roll0: 1, roll1: 1, trailGlow: 1 }, world: { dusk: 0.82 },
    events: [{ at: 0.25, kind: "tag", text: "SOAKED · SHAKING · OUT", pos: [540, 420], color: GREEN }],
  },
  // ============================ 17  PART 2 (5.3 s) ============================
  {
    id: "17a", line: 16, weight: 2.6, scene: "lakeSide",
    from: v(2000, 1150, 1.2, 860), to: v(2000, 1150, 1.35, 860),
    figures: [
      brother({ x: 2060, y: 1290, scale: 0.95, pose: "shiver", wet: true, expr: "closed", seed: 8 }),
      eli({ x: 1930, y: 1290, scale: 0.95, pose: "onIce", expr: "focused", seed: 4 }),
    ],
    world: { dusk: 0.84 }, hudT: 0.3, hud: { strip: true },
    events: [
      { at: 0.1, kind: "tick", pill: "strip" },
      { at: 0.45, kind: "tag", text: "STILL COLD", pos: [540, 420], color: RED },
    ],
  },
  {
    id: "17b", line: 16, weight: 2.7, scene: "lakeSide", light: "night",
    from: v(1580, 1082, 0.62, 1080),
    figures: [
      brother({ x: 2060, y: 1010, scale: 0.55, pose: "shiver", wet: true, expr: "closed", seed: 8 }),
      eli({ x: 1960, y: 1010, scale: 0.55, pose: "onIce", expr: "focused", seed: 4 }),
    ],
    world: { dusk: 0.97 }, worldT: 1, fg: "pineR",
    events: [{ at: 0.1, kind: "card", card: "part2", dim: 0.28 }],
  },
];

export const SHOTS: Shot[] = RAW.map((s) => ({ particles: "snow", ...s }));
