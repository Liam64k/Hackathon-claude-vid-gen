import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture } from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame } from "remotion";
import { shotAt, snowTime, worldAt } from "../timeline";
import { ladder } from "../art/color";
import { rand } from "../art/kit";
import { CAST } from "../cast";
import { THEMES } from "../themes";

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

// Rain: slanted streaks falling fast; wraps every pass of the (frozen-aware) clock.
const RAIN = 220;
const Rain = ({ t, color }: { t: number; color: string }) => {
  const geom = useMemo(() => {
    const pos = new Float32Array(RAIN * 6);
    for (let i = 0; i < RAIN; i++) {
      const sp = 0.8 + rand(i + 11) * 0.6;
      const len = 34 + rand(i + 5) * 40;
      const x = rand(i) * (W + 300) - 150;
      const y = (rand(i + 3) * (H + 120) + t * 22 * sp) % (H + 120);
      const sx = x - W / 2 - y * 0.18;
      const sy = H / 2 - y;
      pos.set([sx, sy, 0, sx - len * 0.18, sy + len, 0], i * 6);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, [t]);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} />
    </lineSegments>
  );
};

// Ash: heavy grey flakes tumbling down slowly, with a few orange embers rising.
const ASH = 120;
const Ash = ({ t }: { t: number }) => {
  const dot = useDot();
  const mk = (n: number, off: number, rise: boolean, speed: number) => {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const sp = 0.4 + rand(i + off + 7) * 0.9;
      const x = rand(i + off) * W + Math.sin((t + i * 17) / 38) * 44;
      const yy = (rand(i + off + 3) * H + t * speed * sp) % (H + 40);
      pos[i * 3] = x - W / 2;
      pos[i * 3 + 1] = rise ? yy - H / 2 : H / 2 - yy;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  };
  const flakes = useMemo(() => mk(ASH, 100, false, 1.2), [t]);
  const embers = useMemo(() => mk(30, 400, true, 1.6), [t]);
  return (
    <>
      <points geometry={flakes}>
        <pointsMaterial map={dot} color="#cbbfb2" size={11} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} />
      </points>
      <points geometry={embers}>
        <pointsMaterial map={dot} color="#ff9a3c" size={6} sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} />
      </points>
    </>
  );
};

// three.js overlay: snow / rain / ash (<= 25 % of the picture is 3D). cast.particles (or the cast theme's
// own weather) replaces the default "snow" of a shot; shots that set their own particles keep them.
export const particlesAt = (shotParticles: string | undefined): string => {
  if (shotParticles && shotParticles !== "snow") return shotParticles;
  return CAST?.particles ?? (CAST?.theme ? THEMES[CAST.theme].particles : "snow");
};

export const Particles = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  const kind = particlesAt(s.particles);
  if (kind === "none") return null;
  const w = worldAt(frame);
  const color = kind === "rain" ? "#c8d8ee" : ladder<string>([[0, "#fff1f4"], [0.6, "#e6ecff"], [1, "#c6d2ff"]], w.dusk);
  return (
    <ThreeCanvas orthographic width={W} height={H} style={{ position: "absolute", inset: 0 }} camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }} gl={{ alpha: true }}>
      {kind === "rain" ? <Rain t={snowTime(frame)} color={color} /> : kind === "ash" ? <Ash t={snowTime(frame)} /> : <Snow t={snowTime(frame)} color={color} />}
    </ThreeCanvas>
  );
};
