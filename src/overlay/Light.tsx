import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ladder } from "../art/color";
import { LightStack } from "./LightStack";
import { shotAt, worldAt } from "../timeline";

// Light modes: dusk (warm tint), freeze (blue monochrome handled by the world filter + a cold wash here),
// bluehour, night. Plus the lighting stack: tint, bottom gradient for captions, vignette, grain, white flash.
export const Light = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  const local = frame - s.start;
  const w = worldAt(frame);
  const tintColor = ladder<string>([[0, "#F08A5D"], [0.5, "#B0507A"], [0.78, "#4B5D8F"], [1, "#2A2552"]], w.dusk);
  const tintA = ladder<number>([[0, 0.08], [0.5, 0.1], [0.78, 0.16], [1, 0.22]], w.dusk);
  const flash = s.flash === "white" ? interpolate(local, [0, 3, 7, 11], [0, 0.4, 0.4, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <LightStack frame={frame} tint={{ color: w.freeze > 0.01 ? "#5a8cff" : tintColor, a: w.freeze > 0.01 ? 0.06 + 0.06 * w.freeze : tintA }} bottom={0.58} vignette={0.3} grain={0.05 + 0.03 * w.freeze} />
      </svg>
      {w.freeze > 0.01 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(8,16,48,${0.45 * w.freeze}) 100%)` }} />}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff8e8", opacity: flash }} />}
    </>
  );
};
