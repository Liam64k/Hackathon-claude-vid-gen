// Place looks: each theme overrides the winter dusk palette (empty = today's look).
import { ladder, type Pal } from "./art/color";

type L = [number, string][];
const s = (stops: L, d: number) => ladder<string>(stops, d);

export type ThemeId = "winter" | "summer" | "nightCity" | "wildfire" | "storm" | "fallout" | "blackout" | "desert";

export interface Theme {
  label: string;
  particles: "snow" | "rain" | "ash" | "none";
  sky: [string, string, string];
  swatch: string;
  over: (d: number) => Partial<Pal>;
}

export const THEMES: Record<ThemeId, Theme> = {
  winter: { label: "Winter dusk", particles: "snow", sky: ["#7D6FB0", "#F4A6B8", "#FFD6A0"], swatch: "#F1CDD4", over: () => ({}) },
  summer: {
    label: "Summer evening", particles: "none", sky: ["#5E8FC4", "#F6B98A", "#FFE2A8"], swatch: "#6FA44A",
    over: (d) => ({
      skyTop: s([[0, "#5E8FC4"], [0.6, "#3F5E9A"], [1, "#1E2A55"]], d),
      skyMid: s([[0, "#F6B98A"], [0.6, "#D98872"], [1, "#4A3E6E"]], d),
      skyLow: s([[0, "#FFE2A8"], [0.6, "#FFB870"], [1, "#7A5A70"]], d),
      pines: s([[0, "#2E5A2A"], [1, "#16301E"]], d),
      pinesFar: s([[0, "#7FA070"], [1, "#3A5048"]], d),
      iceTop: s([[0, "#8CC25A"], [1, "#4A6E3A"]], d),
      iceBot: s([[0, "#4E8A3A"], [1, "#2A4A2A"]], d),
      drift: s([[0, "#A8D46E"], [1, "#5E8048"]], d),
      print: s([[0, "#3E7030"], [1, "#24401E"]], d),
      shadow: s([[0, "#3A5A34"], [1, "#1E3020"]], d),
      sun: "#FFE6A8", window: "#FFD27A",
      stars: ladder<number>([[0, 0], [0.7, 0], [1, 0.6]], d),
    }),
  },
  nightCity: {
    label: "Night city", particles: "none", sky: ["#0F1838", "#22305E", "#4A3A5A"], swatch: "#FF9A3A",
    over: (d) => ({
      skyTop: s([[0, "#1A2650"], [1, "#0B1230"]], d),
      skyMid: s([[0, "#2C3C6E"], [1, "#1A2550"]], d),
      skyLow: s([[0, "#6A4A5E"], [1, "#3E3050"]], d),
      pines: "#121A30", pinesFar: s([[0, "#2E3A62"], [1, "#222C50"]], d),
      iceTop: s([[0, "#4A5680"], [1, "#363F66"]], d),
      iceBot: s([[0, "#2A3358"], [1, "#1C2444"]], d),
      drift: s([[0, "#5E6890"], [1, "#454E78"]], d),
      print: "#262E52", shadow: "#141A36",
      sun: "#FFB060", sunA: 0, window: "#FF9A3A", winGlow: 0.95,
      stars: 0.25,
    }),
  },
  wildfire: {
    label: "Wildfire haze", particles: "ash", sky: ["#6A3A2A", "#C2622E", "#F2A04A"], swatch: "#C2622E",
    over: (d) => ({
      skyTop: s([[0, "#6A3A2A"], [1, "#2E1A18"]], d),
      skyMid: s([[0, "#C2622E"], [1, "#6A2E1E"]], d),
      skyLow: s([[0, "#F2A04A"], [1, "#B2482A"]], d),
      pines: s([[0, "#2A1E18"], [1, "#160E0C"]], d),
      pinesFar: s([[0, "#7A4A34"], [1, "#4A2A22"]], d),
      iceTop: s([[0, "#B08A6A"], [1, "#6A4A3A"]], d),
      iceBot: s([[0, "#6A4A3A"], [1, "#3A2620"]], d),
      drift: s([[0, "#C8A080"], [1, "#7E5A46"]], d),
      print: "#5A3A2E", shadow: s([[0, "#5A3426"], [1, "#2A1814"]], d),
      sun: "#FF5A2A", sunA: 1, window: "#FFB050", stars: 0,
    }),
  },
  storm: {
    label: "Storm flood", particles: "rain", sky: ["#3A4250", "#5E6878", "#8A929E"], swatch: "#5E6878",
    over: (d) => ({
      skyTop: s([[0, "#3A4250"], [1, "#1A2028"]], d),
      skyMid: s([[0, "#5E6878"], [1, "#2E3642"]], d),
      skyLow: s([[0, "#8A929E"], [1, "#46505C"]], d),
      pines: s([[0, "#1E2A2A"], [1, "#121A1C"]], d),
      pinesFar: s([[0, "#56626A"], [1, "#343E46"]], d),
      iceTop: s([[0, "#6E7E8A"], [1, "#3E4A56"]], d),
      iceBot: s([[0, "#3E4C58"], [1, "#222C36"]], d),
      drift: s([[0, "#8A98A2"], [1, "#56646E"]], d),
      print: "#3A4652", shadow: "#262E38",
      sun: "#D8DEE4", sunA: 0, window: "#F2D08A", stars: 0,
    }),
  },
  fallout: {
    label: "Fallout grey", particles: "ash", sky: ["#6E6E68", "#A4A296", "#D2CEB8"], swatch: "#A4A296",
    over: (d) => ({
      skyTop: s([[0, "#6E6E68"], [1, "#34342F"]], d),
      skyMid: s([[0, "#A4A296"], [1, "#5A5A50"]], d),
      skyLow: s([[0, "#D2CEB8"], [1, "#82806E"]], d),
      pines: s([[0, "#34352E"], [1, "#1E1F1A"]], d),
      pinesFar: s([[0, "#7E7E72"], [1, "#4E4E46"]], d),
      iceTop: s([[0, "#BCB8A6"], [1, "#7A776A"]], d),
      iceBot: s([[0, "#7E7C70"], [1, "#4A4942"]], d),
      drift: s([[0, "#D0CCBA"], [1, "#8E8B7C"]], d),
      print: "#6A685E", shadow: "#4E4D46",
      sun: "#F2F0DC", window: "#D8C88A", stars: 0,
    }),
  },
  blackout: {
    label: "Blackout night", particles: "none", sky: ["#06070F", "#0E1020", "#1A1C30"], swatch: "#0E1020",
    over: (d) => ({
      skyTop: "#06070F", skyMid: s([[0, "#121428"], [1, "#0B0C1A"]], d), skyLow: s([[0, "#22243A"], [1, "#161828"]], d),
      pines: "#05060A", pinesFar: "#141626",
      iceTop: s([[0, "#3A3E58"], [1, "#2A2E44"]], d),
      iceBot: "#161A2C", drift: s([[0, "#4A4E68"], [1, "#363A52"]], d),
      print: "#1C2034", shadow: "#0A0C16",
      sun: "#E8ECF4", sunA: 0, window: "#3A3020", winGlow: 0.05, stars: 1,
    }),
  },
  desert: {
    label: "Desert heat", particles: "none", sky: ["#5E9AD0", "#C8DCE8", "#FFF6E0"], swatch: "#E2B878",
    over: (d) => ({
      skyTop: s([[0, "#5E9AD0"], [1, "#3A3A6E"]], d),
      skyMid: s([[0, "#C8DCE8"], [1, "#C07A6A"]], d),
      skyLow: s([[0, "#FFF6E0"], [1, "#F2A060"]], d),
      pines: s([[0, "#6A5A3A"], [1, "#3A2E22"]], d),
      pinesFar: s([[0, "#C89A6A"], [1, "#8A5E4A"]], d),
      iceTop: s([[0, "#EAC88E"], [1, "#B88A5E"]], d),
      iceBot: s([[0, "#C8965E"], [1, "#8A5E3E"]], d),
      drift: s([[0, "#F4DCA8"], [1, "#C8A070"]], d),
      print: "#A87A4A", shadow: s([[0, "#A07450"], [1, "#6A4632"]], d),
      sun: "#FFFFF2", window: "#FFD27A", stars: 0,
    }),
  },
};
