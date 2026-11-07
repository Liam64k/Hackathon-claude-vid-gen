// Shared drawing helpers for the flat 2D style (see .claude/skills/survival-short/references/art-bible.md).

export const OUT = "#1d1a24";

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

// Darken (amt > 0) or lighten (amt < 0) a hex colour, nudging shadows toward blue.
export const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const k = 1 - amt;
  const blue = amt > 0 ? amt * 18 : 0;
  return `#${[clamp(r * k), clamp(g * k), clamp(b * k + blue)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

// Deterministic pseudo-random in [0, 1) so every render is identical.
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type RectProps = { x: number; y: number; w: number; h: number; fill: string; r?: number; stroke?: number; opacity?: number };

// Outlined rectangle with a cel-shade strip on the right side.
export const Block = ({ x, y, w, h, fill, r = 6, stroke = 3, opacity = 1 }: RectProps) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={OUT} strokeWidth={stroke} />
    <rect x={x + w * 0.72} y={y + stroke / 2} width={w * 0.28 - stroke / 2} height={h - stroke} rx={Math.max(0, r - 2)} fill={shade(fill, 0.16)} />
  </g>
);

export const Shadow = ({ x, y, w, opacity = 0.25 }: { x: number; y: number; w: number; opacity?: number }) => (
  <ellipse cx={x} cy={y} rx={w / 2} ry={w * 0.12} fill="#000" opacity={opacity} />
);

// Bold outlined sign text.
export const SignText = ({ x, y, size, children, fill = "#fff", anchor = "middle", stroke = 0 }: { x: number; y: number; size: number; children: React.ReactNode; fill?: string; anchor?: "middle" | "start" | "end"; stroke?: number }) => (
  <text x={x} y={y} fontSize={size} fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontWeight={900} textAnchor={anchor} fill={fill} stroke={stroke ? OUT : undefined} strokeWidth={stroke} paintOrder="stroke">
    {children}
  </text>
);

export const Gradient = ({ id, stops, vertical = true }: { id: string; stops: [number, string, number?][]; vertical?: boolean }) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
    {stops.map(([o, c, a = 1]) => (
      <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
    ))}
  </linearGradient>
);
