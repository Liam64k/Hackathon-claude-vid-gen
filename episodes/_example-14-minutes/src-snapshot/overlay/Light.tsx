import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { shotAt } from "../timeline";

// Screen-space lighting per shot: red emergency, candle, darkness, flashlight cone, flashes.
export const Light = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  const local = frame - s.start;
  const t = local / Math.max(1, s.len);
  const layers: React.ReactNode[] = [];

  if (s.light === "red") {
    const flicker = local < 20 && local % 6 < 3 ? 0.55 : 0.32;
    layers.push(<AbsoluteFill key="red" style={{ background: `rgba(190,20,20,${flicker})`, mixBlendMode: "multiply" }} />);
    layers.push(<AbsoluteFill key="redv" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 40%, rgba(20,0,0,0.75) 100%)" }} />);
  }
  if (s.light === "candle") {
    layers.push(<AbsoluteFill key="c" style={{ background: "rgba(255,140,40,0.18)", mixBlendMode: "multiply" }} />);
    layers.push(<AbsoluteFill key="cv" style={{ background: "radial-gradient(ellipse at 50% 70%, rgba(0,0,0,0) 25%, rgba(10,5,0,0.82) 95%)" }} />);
  }
  if (s.light === "dark") {
    layers.push(<AbsoluteFill key="d" style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(5,8,15,0.55) 10%, rgba(3,4,8,0.95) 70%)" }} />);
  }
  if (s.light === "flashlight") {
    const fixed = s.props?.beam === "center";
    const cx = fixed ? 50 : 50 + Math.sin(t * Math.PI * 1.6) * 18;
    const cy = fixed ? 58 : 52 + Math.cos(t * Math.PI) * 4;
    layers.push(
      <AbsoluteFill key="f" style={{ background: `radial-gradient(circle at ${cx}% ${cy}%, rgba(255,245,200,0.05) 0, rgba(255,245,200,0.0) 18%, rgba(4,5,10,0.93) 34%)` }} />,
    );
  }
  if (s.flash === "white") {
    const o = interpolate(local, [0, 3, s.len - 4, s.len], [0, 1, 1, 0.95], { extrapolateRight: "clamp" });
    layers.push(<AbsoluteFill key="w" style={{ background: "#fffdf2", opacity: o }} />);
  }
  if (s.flash === "fade") {
    layers.push(<AbsoluteFill key="wf" style={{ background: "#fffdf2", opacity: interpolate(local, [0, 24], [0.95, 0], { extrapolateRight: "clamp" }) }} />);
  }
  if (s.flash === "alert") {
    const p = 0.25 + 0.25 * Math.abs(Math.sin(local / 6));
    layers.push(<AbsoluteFill key="a" style={{ boxShadow: `inset 0 0 220px rgba(255,0,30,${p})` }} />);
  }
  if (s.scene === "black") layers.push(<AbsoluteFill key="b" style={{ background: "#000" }} />);
  // gentle film vignette everywhere
  layers.push(<AbsoluteFill key="v" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.28) 100%)" }} />);
  return <>{layers}</>;
};
