import type { Expression, Pose } from "./art/Character";
import type { Cam } from "./camera";

export type SceneId = "phone" | "square" | "clipping" | "street44" | "basement" | "cross" | "fallout" | "math" | "black";
export type LightMode = "day" | "bulb" | "red" | "candle" | "dark" | "flashlight";

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

export interface Hud {
  phase: "countdown" | "shelter";
  impact?: number; // seconds left before impact
  hour?: number; // story hours since impact (>= 48 shows as DAY)
  food?: number;
  people?: number;
  rad?: number; // remaining radiation, 100 = peak
}

export interface Shot {
  line: number; // narration line index
  weight?: number; // share of the line's duration
  scene: SceneId;
  from: Cam;
  to?: Cam;
  cast?: Actor[];
  light?: LightMode;
  flash?: "white" | "fade" | "alert";
  shake?: number;
  whip?: boolean;
  stamp?: { text: string; color: string; at?: number };
  bubble?: { text: string; x: number; y: number };
  hud?: Partial<Hud>;
  particles?: "snow" | "dust" | "debris";
  props?: Record<string, number | boolean | string>;
}
