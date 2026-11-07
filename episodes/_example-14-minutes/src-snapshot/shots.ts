// "14 Minutes": narration lines and the shot list. Single source of truth for the episode.
// Keep runtime-import free so scripts can load it directly.
import type { Shot } from "./types";

export const TITLE = "14-minutes";

export const LINES: { text: string; highlight: string[] }[] = [
  { text: "At 12:46, every phone in Times Square screamed at the same time. Ballistic missile inbound. Seek immediate shelter. This is not a drill.", highlight: ["12:46,", "Ballistic", "missile", "not", "drill."] },
  { text: "Nobody ran. In 2018, Hawaii got this exact alert, and it was fake. So everyone pulled out their phones and started filming. I started running.", highlight: ["Nobody", "2018,", "fake.", "running."] },
  { text: "My grandpa told me about the old yellow signs. Fallout shelter. Basements under old buildings with thick concrete walls. There was still one on 44th Street that nobody ever took down.", highlight: ["yellow", "Fallout", "shelter.", "44th"] },
  { text: "Ray, the building's janitor, was holding the door. A mom and her little boy. A delivery guy. A man in a suit. Six of us. Three minutes left.", highlight: ["Ray,", "Six", "Three", "minutes"] },
  { text: "Rule number one: don't look at the light. The man in the suit looked. For one second, the whole city turned white. Then it was completely silent.", highlight: ["one:", "light.", "looked.", "white.", "silent."] },
  { text: "Thirty seconds later, the blast wave hit. Every window on the street exploded. The lights died.", highlight: ["Thirty", "blast", "exploded.", "died."] },
  { text: "Then it started snowing. Grey snow. People outside were catching it in their hands. Ray locked the door. That's fallout. Nobody opens this door.", highlight: ["snowing.", "Grey", "fallout.", "Nobody"] },
  { text: "Rule number two: count all the food. Thirty-eight cans. Two jugs of water. One vending machine. Six people. That's four days. We needed fourteen.", highlight: ["two:", "food.", "Thirty-eight", "four", "fourteen."] },
  { text: "Hour two, someone started pounding on the door, covered in grey dust. Ray let him in, on one condition. Rule number three: strip at the door. Your clothes carry ninety percent of the fallout.", highlight: ["pounding", "three:", "strip", "ninety", "percent"] },
  { text: "The radio said: every seven hours, the radiation drops ten times. By hour forty-nine, it was down ninety-nine percent. We were going to make it.", highlight: ["seven", "ten", "forty-nine,", "ninety-nine", "make"] },
  { text: "Then, on day three, I counted again. Three cans were missing. Someone in this room was eating at night.", highlight: ["three,", "missing.", "Someone"] },
  { text: "So I pretended to sleep. At 3 AM, the shelf creaked. I turned on my flashlight, and yes. Somebody ate the emergency chocolate. Part two?", highlight: ["3", "AM,", "flashlight,", "chocolate.", "two?"] },
];

// Cast positions in the basement (floor y = 1600).
const IN = {
  hero: { id: "hero", x: 640, y: 1600 },
  ray: { id: "ray", x: 380, y: 1600 },
  maria: { id: "maria", x: 120, y: 1600 },
  leo: { id: "leo", x: 230, y: 1600 },
  dev: { id: "dev", x: 900, y: 1600 },
  grant: { id: "grant", x: 1080, y: 1600 },
};
const all = (expr: "calm" | "fear" | "sly" | "sleep" | "angry" | "shock" = "calm") =>
  Object.values(IN).map((a) => ({ ...a, expr }));

export const SHOTS: Shot[] = [
  // 1 Hook
  { line: 0, weight: 1.2, scene: "phone", from: { x: 540, y: 960, zoom: 1.05 }, to: { x: 540, y: 900, zoom: 1.15 }, flash: "alert", hud: { phase: "countdown", impact: 14 * 60, people: 1 }, stamp: { text: "THIS IS NOT A DRILL", color: "#d90429", at: 0.55 } },
  { line: 0, weight: 1, scene: "square", from: { x: 1080, y: 900, zoom: 0.62 }, to: { x: 1000, y: 980, zoom: 0.78 }, props: { alert: true }, hud: { impact: 13 * 60 + 52 } },
  // 2 Nobody ran
  { line: 1, weight: 1, scene: "square", from: { x: 700, y: 1250, zoom: 1.5 }, to: { x: 760, y: 1250, zoom: 1.65 }, props: { alert: true, mood: "laugh" }, bubble: { text: "It's a drill, bro 😂", x: 540, y: 520 }, hud: { impact: 13 * 60 + 40 } },
  { line: 1, weight: 1, scene: "clipping", from: { x: 540, y: 900, zoom: 1.0 }, to: { x: 540, y: 860, zoom: 1.12 }, stamp: { text: "HAWAII 2018: FAKE", color: "#f5b301", at: 0.3 }, hud: { impact: 13 * 60 + 30 } },
  { line: 1, weight: 1.1, scene: "square", from: { x: 400, y: 1180, zoom: 1.0 }, to: { x: 1300, y: 1180, zoom: 1.0 }, props: { alert: true }, cast: [{ id: "hero", x: 400, y: 1500, pose: "run", expr: "fear", scale: 0.75, walkTo: 1300 }], hud: { impact: 13 * 60 + 5 } },
  // 3 Grandpa's signs
  { line: 2, weight: 0.8, scene: "street44", whip: true, from: { x: 300, y: 1300, zoom: 0.8 }, to: { x: 540, y: 1250, zoom: 0.8 }, cast: [{ id: "hero", x: 120, y: 1560, pose: "run", expr: "fear", scale: 0.5, walkTo: 380 }], hud: { impact: 9 * 60 + 40 } },
  { line: 2, weight: 1.3, scene: "street44", from: { x: 400, y: 1150, zoom: 1.1 }, to: { x: 310, y: 1170, zoom: 2.3 }, stamp: { text: "FALLOUT SHELTER", color: "#f1c40f", at: 0.5 }, hud: { impact: 7 * 60 } },
  { line: 2, weight: 1, scene: "street44", from: { x: 560, y: 1500, zoom: 0.85 }, to: { x: 640, y: 2050, zoom: 0.95 }, cast: [{ id: "hero", x: 500, y: 1980, pose: "run", expr: "fear", scale: 0.7, walkTo: 640 }], hud: { impact: 4 * 60 + 30 } },
  // 4 Six of us
  { line: 3, weight: 1, scene: "street44", from: { x: 860, y: 2250, zoom: 1.8 }, to: { x: 860, y: 2230, zoom: 2.0 }, cast: [{ id: "ray", x: 880, y: 2500, pose: "door", expr: "angry", scale: 0.85 }], bubble: { text: "IN. NOW.", x: 540, y: 560 }, hud: { impact: 3 * 60 + 40 } },
  { line: 3, weight: 1.4, scene: "basement", from: { x: 300, y: 1300, zoom: 1.7 }, to: { x: 900, y: 1300, zoom: 1.7 }, cast: [{ ...IN.maria, expr: "fear", pose: "hug" }, { ...IN.leo, expr: "shock" }, { ...IN.dev, x: 760, expr: "calm" }, { ...IN.grant, x: 1000, expr: "sly", pose: "phone" }], props: { bulb: true }, hud: { impact: 3 * 60 + 15, people: 6 } },
  { line: 3, weight: 1, scene: "basement", from: { x: 540, y: 1100, zoom: 0.85 }, to: { x: 540, y: 1150, zoom: 0.72 }, cast: all("fear"), props: { bulb: true }, stamp: { text: "6 PEOPLE · 3:00 LEFT", color: "#7c4dff", at: 0.25 }, hud: { impact: 3 * 60, people: 6 } },
  // 5 Rule #1
  { line: 4, weight: 1.2, scene: "basement", from: { x: 160, y: 680, zoom: 1.5 }, to: { x: 110, y: 620, zoom: 1.8 }, cast: [{ id: "grant", x: 40, y: 760, expr: "sly", pose: "stand", scale: 0.8 }, { ...IN.ray, x: 330, expr: "angry", pose: "point" }], props: { bulb: true }, stamp: { text: "RULE #1: DON'T LOOK AT THE LIGHT", color: "#d90429", at: 0.15 }, hud: { impact: 4 } },
  { line: 4, weight: 0.7, scene: "basement", from: { x: 110, y: 620, zoom: 1.8 }, flash: "white", cast: [{ id: "grant", x: 40, y: 760, expr: "shock", scale: 0.8 }], props: { bulb: true }, hud: { impact: 0 } },
  { line: 4, weight: 0.9, scene: "basement", from: { x: 60, y: 600, zoom: 3.0 }, to: { x: 60, y: 590, zoom: 3.3 }, cast: [{ id: "grant", x: 40, y: 760, expr: "pain", pose: "eyes", scale: 0.8 }], props: { bulb: true }, flash: "fade", hud: { phase: "shelter", hour: 0, food: 0, people: 6, rad: 100 } },
  { line: 4, weight: 0.8, scene: "black", from: { x: 540, y: 960, zoom: 1 } },
  // 6 Blast
  { line: 5, weight: 1.2, scene: "cross", from: { x: 540, y: 820, zoom: 0.9 }, to: { x: 540, y: 900, zoom: 0.82 }, shake: 45, props: { burst: true }, cast: all("shock"), particles: "debris", hud: { hour: 0 } },
  { line: 5, weight: 1, scene: "basement", from: { x: 540, y: 1100, zoom: 0.9 }, to: { x: 540, y: 1120, zoom: 1.0 }, shake: 18, light: "red", props: { bulb: false }, cast: all("fear"), particles: "dust" },
  // 7 Grey snow
  { line: 6, weight: 1.4, scene: "fallout", from: { x: 700, y: 900, zoom: 0.7 }, to: { x: 760, y: 1000, zoom: 0.85 }, particles: "snow", stamp: { text: "FALLOUT", color: "#7d7d7d", at: 0.45 }, hud: { hour: 0, rad: 100 } },
  { line: 6, weight: 1, scene: "basement", from: { x: 0, y: 500, zoom: 1.9 }, to: { x: 20, y: 520, zoom: 2.2 }, light: "red", props: { bulb: false }, cast: [{ id: "ray", x: 140, y: 760, expr: "angry", pose: "door", scale: 0.8, flip: true }], bubble: { text: "Nobody opens this door.", x: 540, y: 560 } },
  // 8 Rule #2
  { line: 7, weight: 1.2, scene: "basement", from: { x: 820, y: 1100, zoom: 1.6 }, to: { x: 1080, y: 1200, zoom: 1.6 }, light: "flashlight", props: { bulb: false, counting: true }, cast: [{ ...IN.hero, x: 640, pose: "flashlight", expr: "calm" }], stamp: { text: "RULE #2: COUNT ALL THE FOOD", color: "#d90429", at: 0.1 }, hud: { hour: 1, food: 38 } },
  { line: 7, weight: 1, scene: "math", from: { x: 540, y: 900, zoom: 1 }, to: { x: 540, y: 900, zoom: 1.06 }, hud: { food: 38 } },
  { line: 7, weight: 1, scene: "basement", from: { x: 540, y: 1250, zoom: 1.2 }, to: { x: 540, y: 1280, zoom: 1.5 }, light: "red", props: { bulb: false }, cast: all("fear"), stamp: { text: "4 DAYS · NEED 14", color: "#f5b301", at: 0.2 } },
  // 9 Rule #3
  { line: 8, weight: 1, scene: "basement", from: { x: 0, y: 560, zoom: 2.0 }, to: { x: 0, y: 540, zoom: 2.3 }, shake: 6, light: "red", props: { bulb: false, doorShake: 8 }, hud: { hour: 2 } },
  { line: 8, weight: 0.9, scene: "basement", from: { x: 260, y: 1180, zoom: 2.0 }, light: "red", props: { bulb: false }, cast: [{ ...IN.maria, pose: "hug", expr: "fear" }, { ...IN.leo, expr: "fear" }, { ...IN.grant, x: 420, expr: "angry", pose: "point" }] },
  { line: 8, weight: 1.3, scene: "basement", from: { x: 330, y: 1150, zoom: 1.35 }, to: { x: 360, y: 1180, zoom: 1.5 }, light: "red", props: { bulb: false, dustCoat: true }, cast: [{ id: "stranger", x: 260, y: 1600, pose: "coat", expr: "fear" }, { ...IN.ray, x: 560, expr: "angry", pose: "point", flip: true }], stamp: { text: "RULE #3: STRIP AT THE DOOR (−90%)", color: "#d90429", at: 0.25 }, hud: { people: 7 } },
  // 10 7-10 rule
  { line: 9, weight: 1, scene: "basement", from: { x: 345, y: 1450, zoom: 2.6 }, to: { x: 345, y: 1450, zoom: 2.9 }, light: "candle", props: { bulb: false, candles: 1, radioOn: true }, hud: { hour: 3 } },
  { line: 9, weight: 1.5, scene: "basement", from: { x: 540, y: 1150, zoom: 0.8 }, light: "candle", props: { bulb: false, candlesFrom: 1, candlesTo: 0.2, radioOn: true }, cast: [{ ...IN.maria, pose: "sit", expr: "sleep" }, { ...IN.leo, pose: "sit", expr: "sleep" }, { ...IN.dev, pose: "sit" }, { ...IN.ray, pose: "sit" }, { ...IN.grant, pose: "sit", expr: "sly" }, { ...IN.hero, pose: "sit" }, { id: "stranger", x: 1180, y: 1600, pose: "sit", expr: "calm" }], stamp: { text: "HOUR 49: −99%", color: "#2fbf71", at: 0.6 }, hud: { hour: 49, rad: 1, food: 34 } },
  // 11 Missing cans
  { line: 10, weight: 1.2, scene: "basement", from: { x: 1000, y: 1150, zoom: 1.7 }, to: { x: 1000, y: 1120, zoom: 2.0 }, light: "flashlight", props: { bulb: false, cans: 31 }, stamp: { text: "3 CANS MISSING", color: "#7c4dff", at: 0.4 }, hud: { hour: 72, food: 31 } },
  { line: 10, weight: 1.4, scene: "basement", from: { x: 100, y: 1280, zoom: 2.0 }, to: { x: 1050, y: 1280, zoom: 2.0 }, light: "candle", props: { bulb: false, candles: 0.5, cans: 31 }, cast: [{ ...IN.maria, expr: "sly" }, { ...IN.leo, expr: "shock" }, { ...IN.ray, expr: "angry" }, { ...IN.hero, expr: "fear" }, { ...IN.dev, expr: "sly" }, { ...IN.grant, expr: "angry" }, { id: "stranger", x: 1220, y: 1600, expr: "sly" }] },
  // 12 Ending
  { line: 11, weight: 1, scene: "basement", from: { x: 540, y: 1450, zoom: 2.4 }, light: "dark", props: { bulb: false, cans: 31 }, cast: [{ ...IN.hero, x: 540, pose: "sit", expr: "sly" }] },
  { line: 11, weight: 1.2, scene: "basement", from: { x: 1000, y: 1250, zoom: 1.6 }, to: { x: 1040, y: 1420, zoom: 2.3 }, light: "flashlight", props: { bulb: false, cans: 30, wrapper: true, beam: "center" }, cast: [{ id: "leo", x: 1100, y: 1600, expr: "shock", pose: "stand", flip: true }], stamp: { text: "PART 2?", color: "#3a86ff", at: 0.65 }, hud: { hour: 75, food: 30 } },
  { line: 11, weight: 0.6, scene: "phone", from: { x: 540, y: 960, zoom: 1.05 }, props: { ending: true } },
];
