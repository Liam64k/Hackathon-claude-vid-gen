import type { Expression, Pose } from "./art/Character"; // legacy "14 Minutes" cast, kept so the old worlds still compile
import type { HeroExpr, View } from "./art/Rig";
import type { HeroPose } from "./art/heroPoses";
import type { Cam } from "./camera";

// ---- legacy (14 Minutes), unused by the current episode --------------------------------------
export interface Actor {
  id: string; // key into CAST
  x: number;
  y: number;
  expr?: Expression;
  pose?: Pose;
  flip?: boolean;
  scale?: number;
  walkTo?: number; // x at the end of the shot
}

// ---- scenes ---------------------------------------------------------------------------------
// lakeSide + lakeCut are the SAME world component (the cross-section sits directly under the side
// view's ice line); lakeTop is the plan view; lakePrint is the close-up boot-print plate.
export type SceneId = "lakeSide" | "lakeCut" | "lakeTop" | "lakePrint" | "city" | "street" | "bunker" | "crossroad" | "fallout" | "black";
export type LightMode = "dusk" | "freeze" | "bluehour" | "night";
export type HeroId = "eli" | "brother";

// Persistent world state (data, so any frame renders on its own). Values are the state at the END
// of the shot; the timeline interpolates from the previous shot.
export interface World {
  dusk: number; // 0 = 16:18 low pink sun ... 1 = deep violet with stars
  crack: number; // 0..1 crack star grown under Eli
  hole: number; // 0..1 the hole opening
  freeze: number; // 0..1 blue monochrome + snow stops
  wet: number; // 0..1 wet drag trail along the footprints
}

// A person in the scene. Position is world coordinates of the feet (origin between the boots).
export interface Figure {
  id: HeroId;
  x: number;
  y: number;
  scale?: number;
  pose?: HeroPose | "waterThree" | "panic" | "zipper" | "waterPicks" | "kickMorph" | "lie";
  view?: View;
  expr?: HeroExpr;
  flip?: boolean;
  wet?: boolean;
  breath?: boolean;
  talk?: boolean;
  ghost?: boolean; // red dashed double
  to?: { x?: number; y?: number; scale?: number }; // end of shot
  walk?: boolean; // feet planted: x advances WALK_SPEED * scale per frame
  hold?: number; // 0..1: after this fraction of the shot, motion and animation freeze
  speed?: number; // animation speed multiplier (0 = still)
  sub?: { y: number; x?: number; tint?: boolean }; // water line (world coords); x = region right of it stays dry
  head?: number; // extra head tilt
  cross?: number; // fraction of the shot at which a red X lands on the figure (ghosts)
  shatter?: number; // fraction at which the ghost shatters like thin ice
  morph?: [number, number]; // kickMorph: body meter from..to over the shot (deg above flat)
  seed?: number;
  rise?: number; // 0..1 fraction at which a ghost has risen out of the real figure (fade/offset in)
}

// ---- HUD ------------------------------------------------------------------------------------
export interface Hud {
  mode?: "clock" | "water" | "paused" | "out"; // what the first pill says
  clock?: number; // minutes since midnight (16:18 = 978)
  timer?: number; // seconds since the fall
  ice?: number | null; // cm, null = "--"
  water?: boolean;
  phase?: "none" | "breathe" | "getout" | "out";
  strip?: boolean; // pinned 1-10-1 bar under the HUD
  brother?: number | null; // metres to the hole
  ghost?: boolean; // clock pill at 35 % (hook shots)
}

// ---- events (the UI layer) ------------------------------------------------------------------
interface EvBase {
  at: number; // fraction of the shot (0..1)
  dur?: number; // seconds on screen (default per kind)
}
export type Ev =
  | (EvBase & { kind: "callout"; text: string; sub?: string; color?: string; pos: [number, number]; target?: [number, number]; mark?: boolean })
  | (EvBase & { kind: "stamp"; text: string; color: string; pos?: [number, number]; size?: number })
  | (EvBase & { kind: "tag"; text: string; pos?: [number, number]; color?: string })
  | (EvBase & { kind: "delta"; text: string; color?: string })
  | (EvBase & { kind: "tick"; pill: "clock" | "ice" | "water" | "phase" | "strip" | "brother" })
  | (EvBase & { kind: "bubble"; text: string; pos: [number, number]; side?: "left" | "right" })
  | (EvBase & {
      kind: "card";
      card: "title" | "ladder" | "oneTenOne" | "phone911" | "angle" | "part2" | "swatch";
      dim?: number; // how much the world behind dims (0..1)
      opts?: Record<string, number | string | boolean>;
    });

export interface Shot {
  line: number; // narration line index
  id?: string; // shotlist id ("1a")
  weight?: number; // share of the line's duration (seconds from the shotlist)
  sec?: number; // user-fixed length in seconds (edits.json); overrides weight
  scene: SceneId;
  from: Cam;
  to?: Cam;
  linear?: boolean; // linear camera interpolation (trucks)
  snap?: number; // frames in which the camera move completes (whip-zoom), then it stays locked
  follow?: boolean; // camera x follows the first walking / moving figure
  figures?: Figure[];
  light?: LightMode;
  flash?: "white";
  shake?: number;
  whip?: boolean;
  events?: Ev[];
  hud?: Hud;
  hudT?: number; // fraction of the shot over which HUD values ease (default 0.6)
  world?: Partial<World>;
  worldT?: number; // fraction of the shot over which world values ease (default 0.55)
  particles?: "snow" | "none";
  fg?: "pine" | "ridge" | "chunks" | "pineR"; // screen-space foreground occluder
  cap?: "mid" | "high"; // caption band: 64 % (default) or 22 %
  props?: Record<string, number | boolean | string>;
}
