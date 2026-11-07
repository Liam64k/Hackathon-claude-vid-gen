import { AbsoluteFill } from "remotion";
import { HEROES } from "../art/heroes";
import { UI_FONT } from "../art/fonts";
import { WALK_FRAMES, WALK_STEP, walkX } from "../art/heroPoses";
import { Hero } from "../art/Rig";

// Dev-only: Eli's 12-frame walk cycle, one cell per frame. The body advances by WALK_SPEED per
// frame; coloured ticks mark where each boot is planted (ankle x), so sliding feet show up as a
// boot drifting off its tick between cells.
const S = 0.75;
const CELL = 320;

export const WalkStrip = () => {
  const eli = HEROES.eli;
  const plants = [
    { x: WALK_STEP / 2, c: "#F26B2A" }, // near boot, frames 0-5
    { x: WALK_STEP / 2 + WALK_STEP, c: "#5b6b86" }, // far boot, frames 6-11
  ];
  return (
    <AbsoluteFill style={{ background: "#cdd7e2" }}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <text x={960} y={66} fontSize={44} fontFamily={UI_FONT} fontWeight={900} textAnchor="middle" fill="#1d2433">
          ELI · WALK CYCLE · 12 FRAMES · STRIDE {WALK_STEP * 2}
        </text>
        {Array.from({ length: WALK_FRAMES }, (_, i) => {
          const cx = (i % 6) * CELL;
          const gy = 470 + Math.floor(i / 6) * 440;
          const x0 = cx + 90;
          return (
            <g key={i}>
              <rect x={cx + 6} y={gy - 370} width={CELL - 12} height={430} rx={18} fill="#dbe3ec" />
              <line x1={cx + 10} x2={cx + CELL - 10} y1={gy} y2={gy} stroke="#9fb0c4" strokeWidth={4} />
              {plants.map((p) => (
                <rect key={p.x} x={x0 + p.x * S - 3} y={gy + 2} width={6} height={18} fill={p.c} />
              ))}
              <Hero look={eli} x={walkX(x0, i, S)} y={gy} frame={i} pose="walk" scale={S} seed={1} />
              <text x={cx + CELL / 2} y={gy + 44} fontSize={34} fontFamily={UI_FONT} fontWeight={900} textAnchor="middle" fill="#1d2433">
                F{i}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
