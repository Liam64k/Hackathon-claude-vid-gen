// "Hour Twenty-Four": narration lines + the 11-shot beat board. Single source of truth for the episode.
// Keep runtime-import free (types only) so scripts can load it directly.
// World coordinates: see src/art/Lake.tsx (side + cut, horizon y=760, ice line y=1560, hole at x=1000,y=1330)
// and src/art/LakeTop.tsx (plan view, hole at 540,1150, 15 px per metre).
import type { Cam } from "./camera";
import type { Figure, Shot } from "./types";

export const TITLE = "the-nuclear-war-is-in-2611072209";

// highlight: ONE coloured word per caption phrase (the last match wins). ":r" = red, ":g" = green, default gold.
export const LINES: { text: string; highlight: string[] }[] = [
  { text: "Hour twenty-four. All clear. I nearly didn't last one minute.", highlight: ["twenty-four", "clear:g", "minute:r"] },
  { text: "Minute one. The fallout warning. I grabbed my keys. My family was across the lake.", highlight: ["fallout:r", "keys:r", "family"] },
  { text: "Sam blocked the door. A car is not a shelter.", highlight: ["door:g", "car:r"] },
  { text: "Get inside, stay inside, stay tuned. Sturdiest building, the middle, away from windows.", highlight: ["inside:g", "tuned:g", "middle:g"] },
  { text: "At least twenty-four hours, unless officials say otherwise. I sat back down.", highlight: ["twenty-four", "officials", "down:g"] },
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

// Neighbour Sam (the brother rig) and Eli at the red shack door (door ~x2330, y872; feet y905 -> scale ~0.42).
const SHACK_ELI = { x: 2300, y: 905, scale: 0.42, view: "three" as const, expr: "calm" as const };
const SHACK_SAM = { x: 2365, y: 905, scale: 0.46, view: "three" as const, expr: "calm" as const };

const RAW: Shot[] = [
  // ============================ 1  HOOK (3.8 s) ============================
  {
    id: "1a", line: 0, weight: 1.9, scene: "lakeSide",
    from: v(2330, 930, 1.2, 900), to: v(2330, 930, 1.4, 900),
    figures: [
      eli({ ...SHACK_ELI, pose: "stand", flip: true, breath: true, seed: 3 }),
      brother({ ...SHACK_SAM, pose: "stand", flip: true, breath: true }),
    ],
    world: { dusk: 1 }, worldT: 0.01, hudT: 0.01, hud: { clock: 1030 }, props: { door: 1 },
    events: [
      { at: 0.02, kind: "callout", text: "HOUR 24", color: GREEN, pos: [330, 430], target: [2330, 860], dur: 1.2 },
      { at: 0.45, kind: "bubble", text: "ALL CLEAR", pos: [560, 560], side: "right", dur: 1.3 },
    ],
  },
  {
    id: "1b", line: 0, weight: 1.9, scene: "lakeSide",
    from: v(1900, 1040, 0.8, 1080), snap: 8, whip: true, flash: "white",
    figures: [
      eli({ ...SHACK_ELI, pose: "stand", flip: true, ...FROZEN }),
      brother({ ...SHACK_SAM, pose: "stand", flip: true, ...FROZEN }),
    ],
    world: { dusk: 1, freeze: 1 }, worldT: 0.2, props: { door: 1 },
    events: [
      { at: 0.1, kind: "tick", pill: "clock" },
      { at: 0.55, kind: "callout", text: "1 MINUTE", color: RED, pos: [540, 430], target: [2330, 860], dur: 1.3 },
    ],
  },
  // ============================ 2  MINUTE ONE (6.1 s) ============================
  {
    id: "2a", line: 1, weight: 2.1, scene: "lakeSide",
    from: v(1900, 1040, 0.8, 1080), to: v(1960, 1040, 0.85, 1080), shake: 20, flash: "white",
    figures: [
      eli({ ...SHACK_ELI, pose: "stand", flip: true, breath: true, expr: "scared" }),
      brother({ ...SHACK_SAM, pose: "stand", flip: true, breath: true }),
    ],
    world: { dusk: 0.1, freeze: 0 }, worldT: 0.05, hudT: 0.01, hud: { ghost: false, clock: 1030 }, fg: "pine",
    events: [
      { at: 0.04, kind: "callout", text: "MINUTE 1", color: GOLD, pos: [330, 430], target: [2330, 860], dur: 1.1 },
      { at: 0.5, kind: "bubble", text: "FALLOUT WARNING", pos: [540, 560], side: "right", dur: 1.4 },
    ],
  },
  {
    id: "2b", line: 1, weight: 1.7, scene: "lakeSide",
    from: v(2330, 860, 2.6, 900), to: v(2330, 860, 3.0, 900),
    figures: [eli({ x: 2325, y: 905, scale: 0.46, pose: "stand", view: "front", expr: "scared", breath: true })],
    props: { door: 1 },
    events: [{ at: 0.15, kind: "callout", text: "KEYS", color: RED, pos: [330, 440], target: [2318, 878], dur: 1.4 }],
  },
  {
    id: "2c", line: 1, weight: 2.3, scene: "lakeTop",
    from: v(540, 1150, 0.9, 1040, 330), to: v(540, 1150, 0.4, 1040, 330),
    props: { arrowsAt: 0.2, eli: true, roll0: 0 },
    events: [
      { at: 0.1, kind: "callout", text: "MY FAMILY", color: GOLD, pos: [540, 520], target: [250, 1350], dur: 1.6 },
      { at: 0.55, kind: "tag", text: "ACROSS THE LAKE", pos: [540, 330], dur: 1.4 },
    ],
  },
  // ============================ 3  SAM BLOCKS (3.8 s) ============================
  {
    id: "3a", line: 2, weight: 1.9, scene: "lakeSide",
    from: v(2300, 880, 1.8, 900), to: v(2300, 880, 1.9, 900), shake: 22,
    figures: [
      eli({ x: 2270, y: 905, scale: 0.42, pose: "stand", view: "three", flip: true, expr: "shouting", breath: true }),
      eli({ ghost: true, x: 2270, y: 905, to: { x: 2050 }, scale: 0.42, pose: "run", view: "three", flip: true, expr: "scared", rise: 0.5, seed: 5 }),
      brother({ x: 2335, y: 905, scale: 0.46, pose: "stand", view: "front", flip: true, expr: "focused", breath: true }),
    ],
    props: { door: 0.6 },
    events: [
      { at: 0.1, kind: "callout", text: "SAM · NEIGHBOR", color: GREEN, pos: [330, 430], target: [2335, 760], dur: 1.6 },
    ],
  },
  {
    id: "3b", line: 2, weight: 1.85, scene: "lakeTop",
    from: v(540, 1150, 0.55, 1040, 330), to: v(540, 1150, 0.7, 1040, 330),
    props: { arrows: 1, keepAt: 0.55, trailGlowAt: 0.65 },
    events: [
      { at: 0.05, kind: "stamp", text: "NOT A SHELTER", color: RED, pos: [540, 380], dur: 1.3 },
      { at: 0.6, kind: "callout", text: "BACK TO SHACK", color: GREEN, pos: [740, 780], target: [952, 428], dur: 1.1 },
    ],
  },
  // ============================ 4  THE RULE (4.9 s) ============================
  {
    id: "4a", line: 3, weight: 2.4, scene: "lakeSide",
    from: v(2150, 950, 1.35, 900), linear: true, follow: true,
    figures: [
      eli({ x: 1900, y: 905, scale: 0.42, pose: "walk", view: "three", walk: true, expr: "focused", breath: true }),
      brother({ x: 1870, y: 905, scale: 0.46, pose: "walk", view: "three", walk: true, expr: "calm", seed: 8 }),
    ],
    props: { door: 1 },
    events: [
      { at: 0.03, kind: "stamp", text: "STEP 1 · GET INSIDE", color: RED, pos: [540, 420], size: 60, dur: 0.85 },
      { at: 0.33, kind: "stamp", text: "STEP 2 · STAY INSIDE", color: RED, pos: [540, 420], size: 60, dur: 0.85 },
      { at: 0.65, kind: "stamp", text: "STEP 3 · STAY TUNED", color: GREEN, pos: [540, 420], size: 60, dur: 0.95 },
    ],
  },
  {
    id: "4b", line: 3, weight: 2.5, scene: "lakeTop",
    from: v(860, 400, 1.1, 820), to: v(860, 400, 1.3, 820),
    events: [
      { at: 0.02, kind: "callout", text: "STURDY BUILDING", color: GREEN, pos: [330, 430], dur: 1.0 },
      { at: 0.3, kind: "callout", text: "THIN WOOD: NOT IDEAL", color: GOLD, pos: [620, 560], target: [952, 380], dur: 1.1 },
      { at: 0.62, kind: "tag", text: "AWAY FROM WINDOWS", pos: [540, 340], dur: 1.3 },
    ],
  },
  // ============================ 5  HOUR TWENTY-FOUR (4.5 s) ============================
  {
    id: "5a", line: 4, weight: 2.9, scene: "lakeSide",
    from: v(1900, 1040, 0.8, 1080), to: v(2000, 1040, 0.9, 1080),
    figures: [
      eli({ ...SHACK_ELI, pose: "stand", flip: true, breath: true }),
      brother({ ...SHACK_SAM, pose: "stand", flip: true, breath: true }),
    ],
    world: { dusk: 1 }, worldT: 1, props: { door: 1 }, fg: "pine",
    events: [
      { at: 0.08, kind: "callout", text: "AT LEAST 24 HOURS", color: GOLD, pos: [330, 430], target: [2330, 860], dur: 1.6 },
      { at: 0.1, kind: "tick", pill: "clock" },
      { at: 0.55, kind: "tag", text: "UNLESS OFFICIALS SAY", pos: [540, 560], dur: 1.6 },
    ],
  },
  {
    id: "5b", line: 4, weight: 1.6, scene: "lakeSide",
    from: v(2200, 960, 1.0, 900), to: v(2330, 930, 1.2, 900),
    figures: [
      eli({ ...SHACK_ELI, pose: "stand", flip: true, breath: true }),
      eli({ ghost: true, x: 2240, y: 905, scale: 0.42, pose: "run", view: "three", flip: true, expr: "scared", shatter: 0.5, seed: 5 }),
      brother({ ...SHACK_SAM, pose: "stand", flip: true, breath: true }),
    ],
    props: { door: 1 },
    events: [
      { at: 0.1, kind: "delta", text: "HOUR 24", color: GREEN, dur: 1.4 },
      { at: 0.6, kind: "bubble", text: "ALL CLEAR", pos: [560, 560], side: "right", dur: 1.0 },
    ],
  },
];

export const SHOTS: Shot[] = RAW.map((s) => ({ particles: "snow", ...s }));
