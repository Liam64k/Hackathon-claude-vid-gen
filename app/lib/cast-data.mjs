// Curated cast lists + deterministic random cast generator.
export const SKIN = [
  { id: "porcelain", label: "Porcelain", hex: "#F6D7C3" },
  { id: "fair", label: "Fair", hex: "#EFC3A4" },
  { id: "light", label: "Light", hex: "#E9B48E" },
  { id: "warm", label: "Warm", hex: "#D9A27C" },
  { id: "olive", label: "Olive", hex: "#C68E62" },
  { id: "tan", label: "Tan", hex: "#A86F48" },
  { id: "brown", label: "Brown", hex: "#87532F" },
  { id: "deep", label: "Deep", hex: "#5E3A22" },
];
export const HAIR = [
  { id: "black", label: "Black", hex: "#1E1A1A" },
  { id: "darkbrown", label: "Dark brown", hex: "#3B2619" },
  { id: "brown", label: "Brown", hex: "#5A3A26" },
  { id: "auburn", label: "Auburn", hex: "#7A3424" },
  { id: "ginger", label: "Ginger", hex: "#C2602E" },
  { id: "blonde", label: "Blonde", hex: "#D9B26A" },
  { id: "platinum", label: "Platinum", hex: "#EDE3C8" },
  { id: "grey", label: "Grey", hex: "#9A9A9E" },
  { id: "white", label: "White", hex: "#F1EFEA" },
  { id: "teal", label: "Teal (dyed)", hex: "#2A8C8A" },
];
export const COATS = [
  { id: "red", label: "red", coat: "#D63B34", trim: "#F1E7D3", pants: "#2E3546", boots: "#4A3426", gloves: "#2B2F3A", hatColor: "#2B2F3A", hatBand: "#F1E7D3" },
  { id: "mustard", label: "mustard", coat: "#E3A72F", trim: "#3A2E26", pants: "#3A3F4B", boots: "#5A3E2B", gloves: "#3A2E26", hatColor: "#1F2A44", hatBand: "#E3A72F" },
  { id: "forest", label: "forest green", coat: "#2F7D4F", trim: "#E3D5B8", pants: "#4A4A55", boots: "#3B2B22", gloves: "#B58A5A", hatColor: "#6A4A33", hatBand: "#E3D5B8" },
  { id: "navy", label: "navy", coat: "#27407A", trim: "#F2C14E", pants: "#5B5E66", boots: "#6B4A32", gloves: "#F2C14E", hatColor: "#F2C14E", hatBand: "#27407A" },
  { id: "cream", label: "cream", coat: "#EFE2C4", trim: "#8A5A3A", pants: "#3E4A5C", boots: "#5A3E2B", gloves: "#8A5A3A", hatColor: "#B8432F", hatBand: "#EFE2C4" },
  { id: "olive", label: "olive", coat: "#7A7F3A", trim: "#E8D9A8", pants: "#3B3530", boots: "#2E2621", gloves: "#3B3530", hatColor: "#D9772E", hatBand: "#E8D9A8" },
  { id: "coral", label: "coral", coat: "#F2785C", trim: "#FFF1E0", pants: "#2F3B52", boots: "#4A3426", gloves: "#2F3B52", hatColor: "#2F6F7A", hatBand: "#FFF1E0" },
  { id: "purple", label: "purple", coat: "#7B4BB0", trim: "#F4D35E", pants: "#2B2A38", boots: "#3B2B22", gloves: "#F4D35E", hatColor: "#F4D35E", hatBand: "#7B4BB0" },
  { id: "denim", label: "denim", coat: "#4E7BB5", trim: "#E9E2D0", pants: "#3A3530", boots: "#7A5236", gloves: "#7A5236", hatColor: "#C4442F", hatBand: "#E9E2D0" },
  { id: "black", label: "black", coat: "#2A2A30", trim: "#E8463A", pants: "#4A4E58", boots: "#1E1C1C", gloves: "#E8463A", hatColor: "#E8463A", hatBand: "#2A2A30" },
  { id: "white", label: "white", coat: "#F4F2EC", trim: "#2E5C8A", pants: "#2E3546", boots: "#3B2B22", gloves: "#2E5C8A", hatColor: "#2E5C8A", hatBand: "#F4F2EC" },
  { id: "orange", label: "ember orange", coat: "#F26B2A", trim: "#EFE6D2", pants: "#2E3546", boots: "#6B4A32", gloves: "#3A3F4B", hatColor: "#1E6F78", hatBand: "#EFE6D2" },
  { id: "teal", label: "teal", coat: "#1F8A84", trim: "#F6E3B4", pants: "#3A3530", boots: "#5A3E2B", gloves: "#F6E3B4", hatColor: "#E86A3A", hatBand: "#F6E3B4" },
  { id: "pink", label: "pink", coat: "#E66FA0", trim: "#FFF0F4", pants: "#35324A", boots: "#3B2B22", gloves: "#35324A", hatColor: "#35324A", hatBand: "#FFF0F4" },
];
export const HATS = ["beanie", "trapper", "cap", "hood", "none"];
export const FACIAL = ["none", "stubble", "beard"];
export const COAT_KINDS = ["puffy", "parka", "jacket"];
export const BUILDS = ["short", "average", "tall", "broad"];
export const NAMES = [
  "Sam", "Maya", "Jake", "Rosa", "Theo", "Nina", "Omar", "Lucy", "Ben", "Ava",
  "Marco", "Jade", "Luis", "Tess", "Dev", "Kira", "Ray", "Zoe", "Abe", "Ines",
  "Cole", "Lena", "Hank", "Priya", "Jon", "Mei", "Gus", "Ruth", "Kai", "Nora",
  "Dante", "Ivy", "Wes", "Tia", "Max", "June", "Andre", "Kim", "Leo", "Dana",
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedNum = (s) => {
  if (typeof s === "number") return s >>> 0;
  let h = 2166136261;
  for (const c of String(s ?? "")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const hexLum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const hexHue = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.08) return -1;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
};
const contrasts = (a, b) => {
  const ha = hexHue(a), hb = hexHue(b);
  const dl = Math.abs(hexLum(a) - hexLum(b));
  if (ha < 0 || hb < 0) return dl > 0.3 || ha !== hb;
  const dh = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb));
  return dh > 60 || dl > 0.35;
};

function makeLook(rnd, coat) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const r = rnd();
  return {
    skin: pick(SKIN).hex,
    hair: pick(HAIR).hex,
    coat: coat.coat, trim: coat.trim, pants: coat.pants, boots: coat.boots,
    gloves: coat.gloves, hatColor: coat.hatColor, hatBand: coat.hatBand,
    coatKind: pick(COAT_KINDS),
    hat: pick(HATS),
    facial: r < 0.6 ? "none" : r < 0.82 ? "stubble" : "beard",
    build: pick(BUILDS),
  };
}

export function randomCast(seed) {
  const rnd = mulberry32(seedNum(seed));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const c1 = pick(COATS);
  const ok = COATS.filter((c) => c.id !== c1.id && contrasts(c.coat, c1.coat));
  const c2 = pick(ok.length ? ok : COATS.filter((c) => c.id !== c1.id));
  const n1 = pick(NAMES);
  const names2 = NAMES.filter((n) => n !== n1 && n[0] !== n1[0]);
  const n2 = pick(names2);
  const lead = { name: n1, look: makeLook(rnd, c1) };
  const second = { name: n2, look: makeLook(rnd, c2) };
  // Make silhouettes differ: avoid same build and same hat.
  if (second.look.build === lead.look.build) second.look.build = BUILDS[(BUILDS.indexOf(lead.look.build) + 2) % BUILDS.length];
  if (second.look.hat === lead.look.hat) second.look.hat = HATS[(HATS.indexOf(lead.look.hat) + 1) % HATS.length];
  return { lead, second };
}

const nameOf = (list, hex) => (list.find((x) => x.hex.toLowerCase() === String(hex).toLowerCase())?.label ?? "").toLowerCase();
const coatName = (hex) => COATS.find((c) => c.coat.toLowerCase() === String(hex).toLowerCase())?.label ?? "coloured";
const colorWord = (hex) => {
  const c = COATS.find((x) => x.coat.toLowerCase() === String(hex).toLowerCase());
  if (c) return c.label;
  const l = hexLum(hex), h = hexHue(hex);
  if (h < 0) return l < 0.25 ? "black" : l > 0.8 ? "white" : "grey";
  const names = [[20, "red"], [45, "orange"], [70, "yellow"], [160, "green"], [200, "teal"], [260, "blue"], [300, "purple"], [345, "pink"], [360, "red"]];
  return (l < 0.3 ? "dark " : "") + names.find(([m]) => h <= m)[1];
};

export function describeLook(look) {
  const parts = [`${coatName(look.coat)} ${look.coatKind ?? "coat"}`];
  if (look.hat && look.hat !== "none") parts.push(`${colorWord(look.hatColor)} ${look.hat}`);
  const hair = nameOf(HAIR, look.hair);
  if (hair) parts.push(`${look.hat && look.hat !== "none" ? "short " : ""}${hair} hair`);
  if (look.facial && look.facial !== "none") parts.push(look.facial);
  if (look.build) parts.push(look.build);
  return parts.join(", ");
}
