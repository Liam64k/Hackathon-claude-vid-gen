// Per-episode cast, theme and particles (src/cast.json, null = the channel defaults).
import cast from "./cast.json";
import type { Dims, HeroLook } from "./art/Rig";
import type { ThemeId } from "./themes";

export type Build = "short" | "average" | "tall" | "broad";
export type CastLook = Partial<Omit<HeroLook, "dims">> & { build?: Build };
export interface CastMember { name?: string; look?: CastLook }
export type Particles = "snow" | "rain" | "ash" | "none";
export type Cast = { lead?: CastMember; second?: CastMember; theme?: ThemeId; particles?: Particles } | null;

export const CAST = cast as Cast;

// Multipliers on the base dims.
const BUILD: Record<Build, Partial<Record<keyof Dims, number>>> = {
  short: { T: 0.9, thigh: 0.9, shin: 0.9, upper: 0.94, fore: 0.94 },
  average: {},
  tall: { T: 1.1, thigh: 1.12, shin: 1.12, upper: 1.06, fore: 1.06 },
  broad: { W: 1.16, armW: 1.12, legW: 1.1, hem: 1.1, R: 1.04 },
};
export const applyBuild = (d: Dims, b?: Build): Dims => {
  const m = b ? BUILD[b] : undefined;
  if (!m) return d;
  const o = { ...d };
  for (const k of Object.keys(m) as (keyof Dims)[]) o[k] = Math.round(d[k] * (m[k] ?? 1));
  return o;
};

const SLOT: Record<string, "lead" | "second"> = { eli: "lead", brother: "second" };

// Overrides for a hero id from the cast file; `base` supplies the dims the build scales.
export const castLook = (id: string, base?: HeroLook): Partial<HeroLook> => {
  const m = CAST?.[SLOT[id]];
  if (!m) return {};
  const { build, ...look } = m.look ?? {};
  const out: Partial<HeroLook> = { ...look };
  if (m.name) out.name = m.name;
  if (build && base) out.dims = applyBuild(base.dims, build);
  return out;
};

export const castTheme = (): ThemeId => CAST?.theme ?? "winter";
