// Neutral starting template: city / street / bunker scenes, lead + second figures. Copy to src/shots.ts and edit the DATA.
// Keep runtime-import free (types only) so scripts can load it directly.
// Ground lines (figure feet y): city street 1450-1600 (sidewalk top 1240), street sidewalk 1560 / door landing 2490,
// bunker floor 1600, crossroad road 940 / shelter floor 1850, fallout road 1500-1560.
import type { Cam } from "./camera";
import type { Figure, Shot } from "./types";

export const TITLE = "template";

// highlight: ONE coloured word per caption phrase (the last match wins). ":r" = red, ":g" = green, default gold.
export const LINES: { text: string; highlight: string[] }[] = [
  { text: "It was a normal afternoon in the city until the alert came.", highlight: ["normal", "alert:r"] },
  { text: "We ran for the nearest stairwell and found the shelter door.", highlight: ["stairwell", "shelter:g"] },
  { text: "Inside it was quiet. We counted our supplies and waited.", highlight: ["quiet:g", "waited"] },
];

// ---- helpers --------------------------------------------------------------------------------------
// Camera that puts world point (wx, wy) at screen (sx, sy).
const v = (wx: number, wy: number, zoom: number, sy = 900, sx = 540): Cam => ({ x: wx - (sx - 540) / zoom, y: wy - (sy - 960) / zoom, zoom });

// "eli" is the LEAD, "brother" is the SECOND (look + name come from src/cast.json).
const eli = (o: Partial<Figure>): Figure => ({ id: "eli", x: 0, y: 0, ...o });
const brother = (o: Partial<Figure>): Figure => ({ id: "brother", x: 0, y: 0, ...o });

const RED = "#E53935";
const GOLD = "#F5C518";
const GREEN = "#2FD27A";

// Ground lines
const CITY_Y = 1500;
const STREET_Y = 1560;
const BUNKER_Y = 1600;

const RAW: Shot[] = [
  {
    id: "1a", line: 0, weight: 2.6, scene: "city",
    from: v(540, 1300, 0.9, 1000), to: v(600, 1300, 1.0, 1000),
    figures: [
      eli({ x: 380, y: CITY_Y, scale: 0.8, pose: "stand", view: "three", expr: "calm", breath: true }),
      brother({ x: 700, y: CITY_Y + 40, scale: 0.85, pose: "stand", view: "three", flip: true, expr: "calm", breath: true }),
    ],
    hud: { ghost: false },
    events: [{ at: 0.2, kind: "tag", text: "AN ORDINARY DAY", dur: 1.6 }],
  },
  {
    id: "1b", line: 0, weight: 2.4, scene: "city",
    from: v(540, 1250, 1.2, 1000), shake: 14, flash: "white",
    figures: [
      eli({ x: 380, y: CITY_Y, scale: 0.8, pose: "stand", view: "front", expr: "scared" }),
      brother({ x: 700, y: CITY_Y + 40, scale: 0.85, pose: "stand", view: "front", expr: "scared" }),
    ],
    props: { alert: 1 },
    events: [{ at: 0.1, kind: "stamp", text: "ALERT", color: RED }],
  },
  {
    id: "2a", line: 1, weight: 2.6, scene: "street",
    from: v(540, 1500, 0.8, 1000), to: v(540, 1500, 0.9, 1000),
    figures: [
      eli({ x: 160, y: STREET_Y, scale: 0.8, pose: "run", view: "side", expr: "scared", walk: true }),
      brother({ x: 40, y: STREET_Y, scale: 0.85, pose: "run", view: "side", expr: "scared", walk: true }),
    ],
    props: { panic: 1 },
    events: [{ at: 0.3, kind: "callout", text: "SHELTER", color: GREEN, pos: [400, 430], target: [300, 1180], dur: 1.5 }],
  },
  {
    id: "2b", line: 1, weight: 2.2, scene: "street",
    from: v(790, 2350, 1.0, 1000), to: v(790, 2350, 1.2, 1000),
    figures: [
      eli({ x: 600, y: 2490, scale: 0.8, pose: "stand", view: "three", expr: "focused" }),
      brother({ x: 520, y: 2490, scale: 0.85, pose: "stand", view: "three", expr: "scared" }),
    ],
  },
  {
    id: "3a", line: 2, weight: 2.6, scene: "bunker",
    from: v(540, 1400, 0.9, 1000), to: v(540, 1400, 1.0, 1000),
    figures: [
      eli({ x: 400, y: BUNKER_Y, scale: 0.9, pose: "stand", view: "three", expr: "calm", breath: true, talk: true }),
      brother({ x: 740, y: BUNKER_Y, scale: 0.95, pose: "stand", view: "three", flip: true, expr: "relieved", breath: true }),
    ],
    world: { dusk: 0.4 }, worldT: 0.5,
    events: [{ at: 0.3, kind: "delta", text: "SAFE", color: GREEN }],
  },
  {
    id: "3b", line: 2, weight: 2.0, scene: "bunker",
    from: v(540, 1400, 1.5, 1000), to: v(540, 1400, 1.7, 1000),
    figures: [
      eli({ x: 540, y: BUNKER_Y, scale: 0.9, pose: "stand", view: "front", expr: "calm", breath: true }),
    ],
    props: { counted: 20 },
    events: [{ at: 0.3, kind: "bubble", text: "38 CANS", pos: [560, 560], side: "right", dur: 1.4 }],
  },
];

void GOLD;
export const SHOTS: Shot[] = RAW.map((s) => ({ particles: "none", ...s }));
