import { useId } from "react";
import { rand } from "../art/kit";

// SVG lighting stack (visual-style.md §3), drawn on top of a 1080x1920 scene:
// emitter glow → full-frame tint → bottom gradient → vignette → drifting specks → grain.
export const LightStack = ({
  frame,
  w = 1080,
  h = 1920,
  glow,
  tint,
  bottom = 0.85,
  vignette = 0.32,
  grain = 0.06,
  specks = 0,
}: {
  frame: number;
  w?: number;
  h?: number;
  glow?: { x: number; y: number; r: number; color: string; a?: number };
  tint?: { color: string; a: number };
  bottom?: number;
  vignette?: number;
  grain?: number;
  specks?: number;
}) => {
  const id = `l${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <g pointerEvents="none">
      <defs>
        {glow && (
          <radialGradient id={`${id}g`}>
            <stop offset={0} stopColor={glow.color} stopOpacity={glow.a ?? 0.55} />
            <stop offset={0.4} stopColor={glow.color} stopOpacity={(glow.a ?? 0.55) * 0.4} />
            <stop offset={1} stopColor={glow.color} stopOpacity={0} />
          </radialGradient>
        )}
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset={0} stopColor="#0a0c12" stopOpacity={0} />
          <stop offset={0.4} stopColor="#0a0c12" stopOpacity={bottom * 0.45} />
          <stop offset={1} stopColor="#0a0c12" stopOpacity={bottom} />
        </linearGradient>
        <radialGradient id={`${id}v`} cx="0.5" cy="0.45" r="0.78">
          <stop offset={0.55} stopColor="#000" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={vignette} />
        </radialGradient>
        <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 8} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      {glow && <circle cx={glow.x} cy={glow.y} r={glow.r} fill={`url(#${id}g)`} style={{ mixBlendMode: "screen" }} />}
      {tint && <rect width={w} height={h} fill={tint.color} opacity={tint.a} />}
      <rect y={h * 0.58} width={w} height={h * 0.42} fill={`url(#${id}b)`} />
      <rect width={w} height={h} fill={`url(#${id}v)`} />
      {Array.from({ length: specks }, (_, i) => {
        const sx = (rand(i * 3.7) * w + Math.sin((frame + i * 40) / 60) * 18) % w;
        const sy = (rand(i * 9.1) * h + frame * (0.6 + rand(i) * 0.8)) % h;
        return <circle key={i} cx={sx} cy={sy} r={1.5 + rand(i * 5.3) * 2.5} fill="#fff" opacity={0.25 + rand(i * 2.2) * 0.35} />;
      })}
      <rect width={w} height={h} filter={`url(#${id}n)`} opacity={grain} />
    </g>
  );
};
