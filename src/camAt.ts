import { camBetween, type Cam } from "./camera";
import { figureStart } from "./art/Figures";
import { shotAt } from "./timeline";

// The camera for any frame: keyframes (eased or linear), optional follow of the first moving figure, whip snap,
// plus a very small always-on drift so locked shots stay alive.
export const camAt = (frame: number): Cam => {
  const s = shotAt(frame);
  const local = frame - s.start;
  const span = Math.max(1, s.len - 1);
  const t = s.snap ? Math.min(1, local / s.snap) : local / span;
  const c = camBetween(s.from, s.to ?? s.from, t, s.linear);
  let x = c.x;
  let y = c.y;
  if (s.follow) {
    const f = s.figures?.find((g) => !g.ghost && (g.walk || g.to));
    if (f) {
      const a = figureStart(f, local, s.len);
      const b = figureStart(f, 0, s.len);
      x += a.x - b.x;
      y += a.y - b.y;
    }
  }
  return { x: x + Math.sin(frame / 90) * 5, y: y + Math.cos(frame / 110) * 3, zoom: c.zoom * (1 + 0.006 * Math.sin(frame / 120)), rot: c.rot };
};
