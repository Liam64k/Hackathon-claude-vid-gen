// Pose library for the channel heroes (Eli, his brother). Pure functions of the frame.
// Angle conventions (degrees), shared with Rig.tsx:
//   limbs  : 0 = hanging straight down; + = swing toward the facing direction (side/3/4 views)
//            or outward (front/back views). el = forearm flex forward, kn = shin flex backward,
//            an = toes up. body/torso: + = pitch forward (clockwise when facing right).
//   head   : + = nod forward/down.
import type { Dims, HeroLook, Skel, View } from "./Rig";

export type HeroPose = "stand" | "walk" | "run" | "water" | "onIce" | "kick" | "slide" | "roll" | "picks" | "shiver" | "point";

export const ANKLE = 22; // ankle height above the ground (boot sole to ankle pivot)
export const pelvisHeight = (d: Dims) => d.thigh + d.shin + ANKLE;

// Walk cycle: 12 frames. During stance a foot moves back relative to the pelvis by WALK_STEP;
// the caller moves the character forward by WALK_SPEED per frame so planted feet stay still.
export const WALK_FRAMES = 12;
export const WALK_STEP = 84;
export const WALK_SPEED = (2 * WALK_STEP) / WALK_FRAMES; // 14 units per frame at scale 1
export const WALK_STRIDE = 2 * WALK_STEP; // body travel per full cycle
export const RUN_FRAMES = 10;

// x of a walking character: start + exact stride per frame (flip = walking left).
export const walkX = (x0: number, frame: number, scale = 1, flip = false) => x0 + (flip ? -1 : 1) * WALK_SPEED * scale * frame;

const D2R = Math.PI / 180;

// Two-bone IK in a limb's parent frame (dx toward facing, dy down). Returns the first bone's
// angle and the joint flex in this file's conventions.
export const ik2 = (dx: number, dy: number, L1: number, L2: number, jointForward = true) => {
  const d = Math.min(L1 + L2 - 0.01, Math.max(Math.abs(L1 - L2) + 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dx, dy);
  const a = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const b = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
  return { a1: (base + (jointForward ? a : -a)) / D2R, flex: (Math.PI - b) / D2R };
};

// Ankle angle that keeps the boot sole level with the ground.
export const levelFoot = (hip: number, kn: number, body = 0) => -(hip - kn - body);

const cyc = (frame: number, n: number) => (((frame % n) + n) % n) / n;
const TAU = Math.PI * 2;

const stand = (view: View, frame: number): Skel => {
  const sway = Math.sin(frame / 40) * 1.5;
  if (view === "side")
    return { view, aN: { sh: 3 + sway, el: 12 }, aF: { sh: -4 - sway, el: 10 }, lN: { hip: 2, kn: 0, an: -2 }, lF: { hip: -3, kn: 0, an: 3 } };
  if (view === "three")
    return { view, aN: { sh: -2 + sway, el: 14 }, aF: { sh: 6 - sway, el: 12 }, lN: { hip: -3, kn: 0, an: 3 }, lF: { hip: 4, kn: 0, an: -4 } };
  return { view, aN: { sh: 9 + sway, el: 10 }, aF: { sh: 9 + sway, el: 10 }, lN: { hip: 3, kn: 0, an: -3 }, lF: { hip: 3, kn: 0, an: -3 } };
};

const walk = (frame: number, d: Dims): Skel => {
  const p = cyc(frame, WALK_FRAMES);
  const py = 8 - 5 * Math.sin(TAU * p) ** 2; // lowest at double support, highest at passing
  const leg = (ph: number, hipX: number) => {
    let fx: number;
    let lift = 0;
    let toe = 0;
    if (ph < 0.5) {
      fx = WALK_STEP / 2 - WALK_STEP * (ph / 0.5); // planted: linear, matches WALK_SPEED
    } else {
      const t = (ph - 0.5) / 0.5;
      fx = -WALK_STEP / 2 + WALK_STEP * (0.5 - 0.5 * Math.cos(Math.PI * t));
      lift = 26 * Math.sin(Math.PI * t);
      toe = -12 * Math.sin(Math.PI * t);
    }
    const { a1, flex } = ik2(fx - hipX, d.thigh + d.shin - py - lift, d.thigh, d.shin, true);
    return { hip: a1, kn: flex, an: levelFoot(a1, flex) + toe };
  };
  const swing = Math.cos(TAU * p);
  return {
    view: "side",
    py,
    torso: 4,
    head: -2 + Math.sin(TAU * 2 * p) * 1.5,
    aN: { sh: -20 * swing, el: 20 + 8 * Math.max(0, swing) },
    aF: { sh: 20 * swing, el: 20 + 8 * Math.max(0, -swing) },
    lN: leg(p, 4),
    lF: leg((p + 0.5) % 1, -6),
  };
};

// Running toward camera (front view): the lifted leg is foreshortened and drawn bigger.
const run = (frame: number): Skel => {
  const s = Math.sin(TAU * cyc(frame, RUN_FRAMES));
  const up = (k: number) => Math.max(0, k);
  const leg = (lift: number) => ({ hip: 5, kn: 0, an: -5, fs: 1 - 0.5 * lift, fz: 1 + 0.22 * lift });
  const arm = (fwd: number) => ({ sh: 16 + 10 * (1 - fwd), el: -(35 + 85 * fwd), az: 1 + 0.15 * fwd });
  return { view: "front", py: 2 - 12 * Math.abs(s), head: 0, aN: arm(up(-s)), aF: arm(up(s)), lN: leg(up(s)), lF: leg(up(-s)) };
};

const pose = (id: HeroPose, frame: number, look: HeroLook, view?: View): Skel => {
  const d = look.dims;
  const H = pelvisHeight(d);
  switch (id) {
    case "stand":
      return stand(view ?? "front", frame);
    case "walk":
      return walk(frame, d);
    case "run":
      return run(frame);
    case "water": {
      // Broke through, chest-deep: arms out on the surface, legs treading below.
      const k = Math.sin(frame / 8);
      return {
        view: "front",
        aN: { sh: 50 + 6 * k, el: 24 },
        aF: { sh: 50 - 6 * k, el: 24 },
        lN: { hip: 10 + 6 * Math.sin(frame / 7), kn: -16 },
        lF: { hip: 10 - 6 * Math.sin(frame / 7), kn: -16 },
      };
    }
    case "onIce": {
      // Upright in the water, forearms flat on the unbroken edge (forearm world angle 90).
      const k = Math.sin(frame / 5);
      return {
        view: "side",
        torso: 12,
        head: -10,
        aN: { sh: 62, el: 40, wr: 10 },
        aF: { sh: 68, el: 34, wr: 10 },
        lN: { hip: 16 + 12 * k, kn: 30 },
        lF: { hip: -4 - 12 * k, kn: 26 },
      };
    }
    case "kick": {
      // Kicking until flat: body pitched toward horizontal, flutter kick, arms out on the ice.
      const k = Math.sin(frame * 0.9);
      const body = 70;
      return {
        view: "side",
        body,
        head: -48,
        aN: { sh: 124, el: 40, wr: 10 },
        aF: { sh: 130, el: 34, wr: 10 },
        lN: { hip: 4 + 16 * k, kn: 14 + 12 * Math.max(0, Math.sin(frame * 0.9 + 1)), an: -50 },
        lF: { hip: 4 - 16 * k, kn: 14 + 12 * Math.max(0, Math.sin(frame * 0.9 + 1 + Math.PI)), an: -50 },
      };
    }
    case "slide": {
      // On the stomach, picks biting the ice ahead, legs straight back.
      const dig = 0.5 + 0.5 * Math.sin(frame / 6);
      const body = 86;
      return {
        view: "side",
        body,
        py: H - 44,
        head: -58,
        aN: { sh: 150 + 8 * dig, el: 18 + 26 * (1 - dig), wr: 180 },
        aF: { sh: 158 - 8 * dig, el: 18 + 26 * dig, wr: 180 },
        lN: { hip: -2, kn: 4, an: -64 },
        lF: { hip: 3, kn: 8, an: -64 },
        hand: { n: "pick", f: "pick" },
      };
    }
    case "roll": {
      // Top-down log roll, arms and legs spread wide; alternates front/back with a squash.
      const ph = frame / 16;
      const k = ph - Math.floor(ph);
      const faceUp = Math.floor(ph) % 2 === 0;
      return {
        view: faceUp ? "front" : "back",
        body: 90,
        py: H - 70,
        squash: 0.5 + 0.5 * Math.abs(Math.cos(Math.PI * k)),
        head: 0,
        aN: { sh: 148, el: 8 },
        aF: { sh: 148, el: 8 },
        lN: { hip: 22, kn: 0, an: -22 },
        lF: { hip: 22, kn: 0, an: -22 },
      };
    }
    case "picks": {
      // Ice picks off the cord, one in each fist, raised and ready.
      const v = view ?? "three";
      const k = Math.sin(frame / 20) * 3;
      return {
        ...stand(v, frame),
        aN: { sh: 28 + k, el: 96, wr: 180 },
        aF: { sh: 36 - k, el: 88, wr: 180 },
        hand: { n: "pick", f: "pick" },
      };
    }
    case "shiver": {
      // Sitting on the ice, knees up, arms around the shins, shaking.
      const py = H - 30;
      const hipX = 4;
      const L = ik2(100 - hipX, 8, d.thigh, d.shin, true);
      const L2 = ik2(92 - hipX + 10, 8, d.thigh, d.shin, true);
      return {
        view: "side",
        py,
        torso: 16,
        head: 10,
        aN: { sh: 52, el: 64 },
        aF: { sh: 46, el: 70 },
        lN: { hip: L.a1, kn: L.flex, an: levelFoot(L.a1, L.flex) },
        lF: { hip: L2.a1, kn: L2.flex, an: levelFoot(L2.a1, L2.flex) },
        shiver: true,
      };
    }
    case "point": {
      const v = view ?? "three";
      return { ...stand(v, frame), view: v, aN: { sh: 84, el: 4 }, hand: { n: "point" } };
    }
  }
};

export const heroPose = pose;
