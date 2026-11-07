import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture } from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame } from "remotion";
import { shotAt } from "../timeline";
import { rand } from "../art/kit";

const W = 1080;
const H = 1920;

const CONFIG = {
  snow: { count: 420, color: "#d8d8d8", size: 16, fall: 2.2, drift: 1.2, opacity: 0.9 },
  dust: { count: 260, color: "#cdbfa8", size: 9, fall: 3.5, drift: 0.4, opacity: 0.8 },
  debris: { count: 160, color: "#6b5a48", size: 14, fall: 9, drift: 3, opacity: 1 },
};

// Soft round sprite so points read as flakes, not squares.
const useDot = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.6, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  }, []);

const Points = ({ kind, local }: { kind: keyof typeof CONFIG; local: number }) => {
  const cfg = CONFIG[kind];
  const dot = useDot();
  const geom = useMemo(() => {
    const pos = new Float32Array(cfg.count * 3);
    for (let i = 0; i < cfg.count; i++) {
      const speed = 0.6 + rand(i + 7) * 0.8;
      const x = rand(i) * W + Math.sin(local / 20 + i) * cfg.drift * 20;
      const y = (rand(i + 3) * H + local * cfg.fall * speed * (kind === "debris" ? 1 + local / 20 : 1)) % (H + 40);
      pos[i * 3] = x - W / 2;
      pos[i * 3 + 1] = H / 2 - y;
      pos[i * 3 + 2] = 0;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, [cfg, kind, local]);
  return (
    <points geometry={geom}>
      <pointsMaterial map={dot} color={cfg.color} size={cfg.size} sizeAttenuation={false} transparent opacity={cfg.opacity} depthWrite={false} />
    </points>
  );
};

// three.js overlay for fallout snow, ceiling dust and blast debris.
export const Particles = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  if (!s.particles) return null;
  return (
    <ThreeCanvas orthographic width={W} height={H} style={{ position: "absolute", inset: 0 }} camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }} gl={{ alpha: true }}>
      <Points kind={s.particles} local={frame - s.start} />
    </ThreeCanvas>
  );
};
