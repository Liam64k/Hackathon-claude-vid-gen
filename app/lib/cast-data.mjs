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

// ---- themes (mirror of src/themes.ts for the server; a test keeps them in sync) -----------------
export const THEME_LIST = [
  { id: "winter", label: "Winter dusk", particles: "snow", sky: ["#7D6FB0", "#F4A6B8", "#FFD6A0"], swatch: "#F1CDD4" },
  { id: "summer", label: "Summer evening", particles: "none", sky: ["#5E8FC4", "#F6B98A", "#FFE2A8"], swatch: "#6FA44A" },
  { id: "nightCity", label: "Night city", particles: "none", sky: ["#0F1838", "#22305E", "#4A3A5A"], swatch: "#FF9A3A" },
  { id: "wildfire", label: "Wildfire haze", particles: "ash", sky: ["#6A3A2A", "#C2622E", "#F2A04A"], swatch: "#C2622E" },
  { id: "storm", label: "Storm flood", particles: "rain", sky: ["#3A4250", "#5E6878", "#8A929E"], swatch: "#5E6878" },
  { id: "fallout", label: "Fallout grey", particles: "ash", sky: ["#6E6E68", "#A4A296", "#D2CEB8"], swatch: "#A4A296" },
  { id: "blackout", label: "Blackout night", particles: "none", sky: ["#06070F", "#0E1020", "#1A1C30"], swatch: "#0E1020" },
  { id: "desert", label: "Desert heat", particles: "none", sky: ["#5E9AD0", "#C8DCE8", "#FFF6E0"], swatch: "#E2B878" },
];
export const THEME_IDS = THEME_LIST.map((t) => t.id);
export const PARTICLES = ["snow", "rain", "ash", "none"];
export const CAST_MODES = ["random", "manual", "claude"];

// Theme for a topic when the user left it on "auto".
const THEME_KEYWORDS = [
  ["fallout", /nuclear|fallout|radiation|atomic/i],
  ["nightCity", /zombie|outbreak|pandemic|riot|city/i],
  ["wildfire", /fire|wildfire|smoke|burn/i],
  ["storm", /flood|storm|rain|hurricane|tsunami|cyclone/i],
  ["blackout", /blackout|power|grid|outage/i],
  ["desert", /heat|desert|drought|sun/i],
  ["winter", /snow|ice|winter|blizzard|frozen|cold|avalanche/i],
];
export const pickTheme = (text) => THEME_KEYWORDS.find(([, re]) => re.test(String(text ?? "")))?.[0] ?? "summer";
export const themeParticles = (id) => THEME_LIST.find((t) => t.id === id)?.particles ?? "none";

const HEX = /^#[0-9a-f]{6}$/i;
const byIdOrHex = (list, key, v) => {
  const s = String(v ?? "");
  return list.find((x) => x.id === s || x[key].toLowerCase() === s.toLowerCase());
};
const OPT_COLORS = ["trim", "pants", "boots", "gloves", "hatColor", "hatBand"];

// Validate one look. Skin/hair/coat accept an id or a hex from the lists; coat fills trim/pants/etc. from
// the coat's preset unless given as valid hex. Returns { look, errors }.
export function normalizeLook(raw) {
  const errors = [];
  const r = raw && typeof raw === "object" ? raw : {};
  const skin = byIdOrHex(SKIN, "hex", r.skin);
  const hair = byIdOrHex(HAIR, "hex", r.hair);
  const coat = COATS.find((c) => c.id === r.coat || c.coat.toLowerCase() === String(r.coat ?? "").toLowerCase());
  if (!skin) errors.push("skin must be one of the listed skin tones");
  if (!hair) errors.push("hair must be one of the listed hair colours");
  if (!coat) errors.push("coat must be one of the listed coat colours");
  const enumOf = (key, list) => { if (!list.includes(r[key])) errors.push(`${key} must be one of ${list.join(", ")}`); };
  enumOf("hat", HATS); enumOf("facial", FACIAL); enumOf("coatKind", COAT_KINDS); enumOf("build", BUILDS);
  const look = { skin: skin?.hex, hair: hair?.hex, coat: coat?.coat };
  for (const k of OPT_COLORS) {
    if (r[k] != null && !HEX.test(r[k])) errors.push(`${k} must be a #RRGGBB colour`);
    look[k] = HEX.test(r[k] ?? "") ? r[k] : coat?.[k];
  }
  Object.assign(look, { coatKind: r.coatKind, hat: r.hat, facial: r.facial, build: r.build });
  return { look, errors };
}

// Validate a whole cast {lead,second,theme?,particles?}. names: 1-20 letters. Returns { cast, errors }.
export function normalizeCast(raw, safety = () => []) {
  const errors = [];
  const r = raw && typeof raw === "object" ? raw : {};
  const member = (key) => {
    const m = r[key];
    const name = String(m?.name ?? "").trim();
    if (!/^[A-Za-z][A-Za-z '-]{0,19}$/.test(name) || name.replace(/[^A-Za-z]/g, "").length < 1) errors.push(`${key}: name must be 1-20 letters`);
    else if (safety(name).length) errors.push(`${key}: name is not allowed`);
    const { look, errors: le } = normalizeLook(m?.look);
    for (const e of le) errors.push(`${key}: ${e}`);
    return { name, look };
  };
  const lead = member("lead");
  const second = member("second");
  const theme = r.theme == null || r.theme === "auto" ? "auto" : THEME_IDS.includes(r.theme) ? r.theme : (errors.push(`theme must be auto or one of ${THEME_IDS.join(", ")}`), "auto");
  const particles = r.particles == null || r.particles === "auto" ? "auto" : PARTICLES.includes(r.particles) ? r.particles : (errors.push(`particles must be auto or one of ${PARTICLES.join(", ")}`), "auto");
  return { cast: { lead, second, theme, particles }, errors };
}

// Everything the UI needs to build the Cast screen.
export const castData = () => ({
  skin: SKIN, hair: HAIR, coats: COATS, hats: HATS, facial: FACIAL, coatKinds: COAT_KINDS, builds: BUILDS, names: NAMES,
  themes: THEME_LIST.map(({ id, label, swatch, sky, particles }) => ({ id, label, swatch, sky, particles })),
});
