import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { camAt } from "./camAt";
import { CamContext, cameraTransform, shakeAt } from "./camera";
import { Lake } from "./art/Lake";
import { LakePrint, LakeTop } from "./art/LakeTop";
import { FigureEl, GhostDefs } from "./art/Figures";
import { ladder, mix, palette } from "./art/color";
import { castTheme } from "./cast";
import type { Rim } from "./art/Rig";
import { Events } from "./overlay/Events";
import { Foreground } from "./overlay/Foreground";
import { Hud } from "./overlay/Hud";
import { Light } from "./overlay/Light";
import { Particles } from "./overlay/Particles";
import { Captions } from "./overlay/Text";
import { TIMED_LINES, hasVoice, shotAt, worldAt } from "./timeline";

// Freeze look: blue monochrome via a screen-space colour matrix (k = 0..1). Ghosts are drawn outside it so they stay red.
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
};
const freezeMatrix = (k: number, theme: ReturnType<typeof castTheme>, dusk: number) => {
  const w = [0.3, 0.59, 0.11];
  // winter: blue monochrome; other themes: monochrome in the scene's own ice colour
  const tc = theme === "winter" ? null : rgb(mix(palette(dusk, theme).iceTop, "#ffffff", 0.35));
  const tint = tc ?? [0.55, 0.78, 1.0];
  const off = tc ? tc.map((v) => v * 0.12) : [0.02, 0.05, 0.16];
  const rows = [0, 1, 2].map((r) => {
    const id = [0, 1, 2].map((c) => (c === r ? 1 - k : 0) + k * tint[r] * w[c]);
    return [...id, 0, k * off[r]].map((v) => v.toFixed(4)).join(" ");
  });
  return `${rows.join("  ")}  0 0 0 1 0`;
};

export const Episode = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  const local = frame - s.start;
  const cam = camAt(frame);
  const { dx, dy } = shakeAt(local, s.shake ?? 0);
  const world = worldAt(frame);
  const theme = castTheme();
  const whipBlur = s.whip && local < 8 ? Math.sin(((local + 1) / 9) * Math.PI) * 46 : 0;
  const rim: Rim = {
    color: theme === "winter" ? ladder<string>([[0, "#ffb86b"], [0.5, "#ff9a6b"], [0.78, "#8fa8e8"], [1, "#6f7fd0"]], world.dusk) : mix(palette(world.dusk, theme).skyLow, "#ffffff", 0.3),
    side: 1,
    w: ladder<number>([[0, 9], [0.5, 8], [0.78, 5], [1, 4]], world.dusk),
  };
  const figures = s.figures ?? [];
  const ghosts = figures.filter((f) => f.ghost);
  const props = s.props ?? {};
  const inLake = s.scene === "lakeSide" || s.scene === "lakeCut";

  return (
    <AbsoluteFill style={{ background: "#0b0d12" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <GhostDefs />
        <defs>
          <filter id="whip" x="0" y="0" width="1080" height="1920" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation={`${whipBlur} ${whipBlur * 0.15}`} />
          </filter>
          <filter id="freezeFx" x="0" y="0" width="1080" height="1920" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={freezeMatrix(world.freeze, theme, world.dusk)} />
          </filter>
        </defs>
        <g filter={whipBlur > 0.5 ? "url(#whip)" : undefined}>
          <g filter={world.freeze > 0.01 ? "url(#freezeFx)" : undefined}>
            <CamContext.Provider value={{ cam, home: { x: s.from.x, y: s.from.y } }}>
              <g transform={cameraTransform(cam, dx, dy)}>
                {inLake && <Lake frame={frame} local={local} len={s.len} world={world} figures={figures} props={props} rim={rim} />}
                {s.scene === "lakeTop" && <LakeTop frame={frame} local={local} len={s.len} world={world} props={props} />}
                {s.scene === "lakePrint" && <LakePrint frame={frame} local={local} len={s.len} world={world} props={props} />}
              </g>
            </CamContext.Provider>
          </g>
          {ghosts.length > 0 && inLake && (
            <g transform={cameraTransform(cam, dx, dy)}>
              {ghosts.map((f, i) => (
                <FigureEl key={i} f={f} local={local} len={s.len} id={`g${i}`} />
              ))}
            </g>
          )}
        </g>
      </svg>
      <Foreground />
      <Particles />
      <Light />
      <Events />
      <Hud />
      <Captions />
      {TIMED_LINES.map((l) =>
        hasVoice(l.index) ? (
          <Sequence key={l.index} from={l.from} durationInFrames={l.dur}>
            <Audio src={staticFile(`voice/line-${l.index}.mp3`)} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
