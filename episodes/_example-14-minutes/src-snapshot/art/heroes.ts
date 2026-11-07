// Channel heroes (recurring across episodes). Original characters, no brands.
import type { HeroLook } from "./Rig";

export const HEROES = {
  // Eli: adult ice angler. Signature colour: ember-orange puffy jacket (used nowhere else in a
  // frame). Signature detail: teal beanie with a cream pompom. Plot prop: ice picks on a cord.
  eli: {
    name: "Eli",
    skin: "#E9B48E",
    hair: "#5A3A26",
    coat: "#F26B2A",
    coatKind: "puffy",
    trim: "#EFE6D2",
    pants: "#2E3546",
    boots: "#6B4A32",
    sole: "#2A2626",
    gloves: "#3A3F4B",
    hat: "beanie",
    hatColor: "#1E6F78",
    hatBand: "#EFE6D2",
    facial: "stubble",
    picks: true,
    dims: { R: 64, T: 118, W: 124, hem: 22, upper: 60, fore: 56, thigh: 72, shin: 66, armW: 32, legW: 36 },
  },
  // His brother: taller and broader, long green plaid parka with a fur ruff, trapper hat with
  // ear flaps, full beard. Silhouette reads as a tall A-line block with a wide boxy head.
  brother: {
    name: "Brother",
    skin: "#D9A27C",
    hair: "#4A2E1E",
    coat: "#2F7D4F",
    coatKind: "parka",
    trim: "#E3D5B8",
    pants: "#4A4A55",
    boots: "#3B2B22",
    sole: "#1F1C1C",
    gloves: "#B58A5A",
    hat: "trapper",
    hatColor: "#6A4A33",
    hatBand: "#E3D5B8",
    facial: "beard",
    dims: { R: 62, T: 134, W: 140, hem: 70, upper: 66, fore: 60, thigh: 80, shin: 74, armW: 36, legW: 38 },
  },
} satisfies Record<string, HeroLook>;

export type HeroId = keyof typeof HEROES;
