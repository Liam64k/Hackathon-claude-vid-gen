import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture } from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame } from "remotion";
import { shotAt, snowTime, worldAt } from "../timeline";
import { ladder } from "../art/color";
import { rand } from "../art/kit";

const W = 1080;
const H = 1920;

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

const COUNT = 170;

// Light snow drift (seeded; the clock stops while the world is frozen so flakes hang in mid-air).
const Snow = ({ t, color }: { t: number; color: string }) => {
  const dot = useDot();
  const geom = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const sp = 0.5 + rand(i + 7) * 1.0;
      const x = rand(i) * W + Math.sin((t + i * 13) / 46) * 26;
      const y = (rand(i + 3) * H + t * 1.7 * sp) % (H + 40);
      pos[i * 3] = x - W / 2;
      pos[i * 3 + 1] = H / 2 - y;
      pos[i * 3 + 2] = 0;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, [t]);
  return (
    <points geometry={geom}>
      <pointsMaterial map={dot} color={color} size={12} sizeAttenuation={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  );
};

// three.js overlay: snow only (<= 25 % of the picture is 3D).
export const Particles = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  if (s.particles === "none") return null;
  const w = worldAt(frame);
  const color = ladder<string>([[0, "#fff1f4"], [0.6, "#e6ecff"], [1, "#c6d2ff"]], w.dusk);
  return (
    <ThreeCanvas orthographic width={W} height={H} style={{ position: "absolute", inset: 0 }} camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }} gl={{ alpha: true }}>
      <Snow t={snowTime(frame)} color={color} />
    </ThreeCanvas>
  );
};
