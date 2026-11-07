import { createContext, useContext } from "react";
import { Easing } from "remotion";

export interface Cam {
  x: number;
  y: number;
  zoom: number;
  rot?: number;
}

export const W = 1080;
export const H = 1920;

const ease = Easing.inOut(Easing.cubic);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const camBetween = (from: Cam, to: Cam, t: number, linear = false): Cam => {
  const k = linear ? t : ease(Math.min(1, Math.max(0, t)));
  return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), zoom: lerp(from.zoom, to.zoom, k), rot: lerp(from.rot ?? 0, to.rot ?? 0, k) };
};

// Decaying camera shake for impacts.
export const shakeAt = (local: number, amp: number, fps = 30) => {
  if (!amp) return { dx: 0, dy: 0 };
  const decay = Math.exp(-local / (fps * 0.45));
  return { dx: Math.sin(local * 1.9) * amp * decay, dy: Math.cos(local * 2.7) * amp * decay * 0.8 };
};

export const cameraTransform = (c: Cam, dx = 0, dy = 0) =>
  `translate(${W / 2 + dx},${H / 2 + dy}) rotate(${c.rot ?? 0}) scale(${c.zoom}) translate(${-c.x},${-c.y})`;

// Scene layers read the camera to add parallax: depth < 1 moves less (far), > 1 more (foreground).
export const CamContext = createContext<{ cam: Cam; home: { x: number; y: number } }>({ cam: { x: 540, y: 960, zoom: 1 }, home: { x: 540, y: 960 } });

export const Layer = ({ depth, children }: { depth: number; children: React.ReactNode }) => {
  const { cam, home } = useContext(CamContext);
  const dx = (cam.x - home.x) * (1 - depth);
  const dy = (cam.y - home.y) * (1 - depth) * 0.6;
  return <g transform={`translate(${dx},${dy})`}>{children}</g>;
};
