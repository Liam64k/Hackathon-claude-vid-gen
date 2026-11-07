// Colour helpers for the lake world: hex mixing and the dusk -> night palette ladder.
const h2r = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const r2h = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = h2r(a);
  const [r2, g2, b2] = h2r(b);
  return r2h(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
};

// Piecewise-linear ladder: stops are [position, value].
export const ladder = <T extends string | number>(stops: [number, T][], t: number): T => {
  const x = clamp01(t);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, v0] = stops[i];
    const [p1, v1] = stops[i + 1];
    if (x <= p1) {
      const k = (x - p0) / (p1 - p0 || 1);
      return (typeof v0 === "number" ? lerp(v0 as number, v1 as number, k) : mix(v0 as string, v1 as string, k)) as T;
    }
  }
  return stops[stops.length - 1][1];
};

// World time of day: dusk 0 (16:18, low pink sun) -> 0.3 sun touches pines -> 0.5 orange line + violet
// -> 0.78 blue hour -> 1 deep violet with stars.
export const palette = (d: number) => ({
  skyTop: ladder<string>([[0, "#7D6FB0"], [0.3, "#6A5EA3"], [0.5, "#3D3678"], [0.78, "#26325E"], [1, "#14153A"]], d),
  skyMid: ladder<string>([[0, "#F4A6B8"], [0.3, "#E896A8"], [0.5, "#7B5B97"], [0.78, "#4B5D8F"], [1, "#2A2552"]], d),
  skyLow: ladder<string>([[0, "#FFD6A0"], [0.3, "#FFC089"], [0.5, "#F08A5D"], [0.78, "#8C7FA6"], [1, "#4A3D6E"]], d),
  pines: ladder<string>([[0, "#24453A"], [0.5, "#1B3430"], [0.78, "#16282D"], [1, "#101A24"]], d),
  pinesFar: ladder<string>([[0, "#6F8A7C"], [0.5, "#53607A"], [0.78, "#3B4A70"], [1, "#2A3158"]], d),
  iceTop: ladder<string>([[0, "#F1CDD4"], [0.5, "#C9A9C3"], [0.78, "#8E9CC4"], [1, "#5C6590"]], d),
  iceBot: ladder<string>([[0, "#8E8FB8"], [0.5, "#6C6E9E"], [0.78, "#4B5D8F"], [1, "#2F3A64"]], d),
  drift: ladder<string>([[0, "#F6DDE2"], [0.5, "#DDBFD0"], [0.78, "#A9B6D8"], [1, "#6D78A6"]], d),
  print: ladder<string>([[0, "#7F7FAE"], [0.5, "#6B6C9C"], [0.78, "#4A5A8C"], [1, "#2F3A64"]], d),
  shadow: ladder<string>([[0, "#5D5A92"], [0.5, "#4A4A80"], [1, "#222A52"]], d),
  sun: "#FFD6A0",
  sunY: ladder<number>([[0, 586], [0.3, 724], [0.5, 806], [1, 840]], d),
  sunA: ladder<number>([[0, 1], [0.46, 1], [0.58, 0], [1, 0]], d),
  window: ladder<string>([[0, "#E8B466"], [0.5, "#FFC56B"], [1, "#FFD98A"]], d),
  winGlow: ladder<number>([[0, 0.25], [0.5, 0.5], [1, 0.9]], d),
  stars: ladder<number>([[0, 0], [0.5, 0], [0.62, 0.35], [1, 1]], d),
});
