# Animation: patterns and code

All animation is a pure function of the frame number (Remotion). No `setTimeout`, no CSS
transitions, no `requestAnimationFrame`, no `Math.random()` at render time — use the seeded
`rand(seed)` from `src/art/kit.tsx`. This keeps every render identical and every frame
renderable on its own (needed for storyboards).

## 0. Remotion rules that prevent most breakage

- All motion via `useCurrentFrame()` + `interpolate()` / `spring()`. No CSS transitions/animations,
  no `setTimeout`.
- **No `backdrop-filter: blur()`** — it flickers in renders. Use a pre-blurred copy of the
  background layer instead.
- Round plate/frame positions to whole pixels (`Math.round`) to avoid shimmering borders.
- Randomness only seeded (`random('seed')` from remotion, or `rand(seed)` in `src/art/kit.tsx`).
- One component for all plates/pills: flex, centred on both axes, `line-height: 1`. Check on a
  still that text (including descenders) sits exactly centred.
- No linear motion: ease-out `cubic-bezier(0.16, 1, 0.3, 1)` (`Easing.bezier(0.16, 1, 0.3, 1)`)
  or springs with damping 14-20. Grouped elements cascade with 2-4 frames (60-120 ms) delay.
- Camera always slightly alive: push 2-5 % per scene, parallax in 2-3 layers.
- In transitions, old labels fully leave before new ones appear.
- Number **ranges** ("12-24 days") appear whole. Rolling digits only for a single number.
- Never repeat the same transition twice in a row (cut on action, size change, shape match cut,
  mask wipe, "lights go out" — max 3 times per video).

## 1. Easing and springs

```ts
import { Easing, interpolate, spring } from "remotion";

// Camera and big moves: ease in-out cubic.
const t = interpolate(local, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

// UI pop-ins: spring with slight overshoot.
const pop = spring({ frame: local - startAt, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
// style: transform: `scale(${0.85 + 0.15 * pop}) translateY(${(1 - pop) * 30}px)`, opacity: pop

// Stamps: slam. Scale 1.4 -> 1 in 5 frames + a 6-frame shake.
const slam = interpolate(local, [0, 5], [1.4, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
```

Durations that feel right at 30 fps: UI pop 8-12 frames, card slide 12-16, stamp slam 5,
whip 8-12, push-in 60-120, drift = whole beat.

## 2. Camera (2D)

Use one camera per frame `{x, y, zoom, rot}` applied to the world `<g>`:

```ts
const transform = `translate(${W / 2 + shakeX},${H / 2 + shakeY}) rotate(${rot}) scale(${zoom}) translate(${-x},${-y})`;
```

- Keyframe per beat (`from`/`to`), interpolate with ease-in-out. Add an always-on drift:
  `x += Math.sin(frame / 90) * 6; zoom *= 1 + 0.01 * Math.sin(frame / 120)`.
- Parallax: each world layer has a `depth`; offset it by `(cam.x - home.x) * (1 - depth)`.
  Sky 0.1-0.2, far city 0.3-0.5, set 1.0, foreground 1.3-1.5.
- Shake: `amp * Math.exp(-local / (fps * 0.4)) * Math.sin(local * 1.9)` for x, `cos(local*2.7)` for y.

### Whip-zoom with motion blur and light flash

```tsx
const W8 = 10; // frames
const k = Math.min(1, local / W8);
const speed = Math.sin(k * Math.PI); // 0 -> 1 -> 0
const cam = camBetween(prevCam, nextCam, Easing.inOut(Easing.cubic)(k));
<filter id="mb"><feGaussianBlur stdDeviation={`${speed * 40} ${speed * 10}`} /></filter>   // direction of travel
<g filter={speed > 0.05 ? "url(#mb)" : undefined} transform={cameraTransform(cam)}>…</g>
<AbsoluteFill style={{ background: "#fff8e8", opacity: speed * 0.35 }} />                  // flash at peak speed
```

For directional blur along a diagonal, rotate the world group, blur in x, rotate back, or use a
CSS `filter: blur()` on a wrapper with `transform: scaleX(1.05)` streak trick.

## 3. Numbers

```ts
// Rolling counter: interpolate, then format. Never jump numbers instantly.
const v = interpolate(local, [0, 18], [from, to], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const text = `$${Math.round(v).toLocaleString("en-US")}`;
```
- During a change, flash the pill border brighter for 6 frames and drop a delta badge below:
  red `≈ −$20,000` + reason in small caps; fade out after 60-90 frames.
- Strike-through edits: draw a red line across the old value over 6 frames, then the new value
  slides in from the right.
- Count-up rows in cards: stagger 6-8 frames per row.

## 4. Text

- Karaoke: precompute word times inside each narration line (proportional to characters, +pause
  weight after punctuation) or from real alignment if available. Current word index from frame.
- Typewriter for chat/phone messages: `text.slice(0, Math.floor((local - start) / 1.5))` +
  blinking caret, then a "sent" bounce.
- Handwriting (notebook math): reveal each line with a clipPath rect growing left→right over
  `chars * 1.2` frames; a pencil/hand sprite follows the reveal edge.
- Leader line draw-on: SVG `strokeDasharray={len}` `strokeDashoffset={len * (1 - p)}`.

## 5. Characters

- Idle: breathing bob 1-2 px (`sin(frame/14)`), blink 3-4 frames every 2-4 s (seeded per char).
- Talk: mouth height `0.3 + 0.7 * |sin(frame * 0.7)|` while their line is spoken.
- Walk cycle (side view): legs rotate ±25° with `sin(frame / 4)`, arms opposite ±20°, body bobs
  2-3 px at double frequency; translate x at 4-7 px/frame.
- Emotion: change eyebrow angle + mouth; add sweat drop, "..." dots, or a small coloured glyph.
- Crowds: duplicates with seeded variety (colour, hair, height ±10 %), offset phases. For
  "overwhelm" moments draw 2-3 ghost copies at 30 % opacity trailing behind (echo/motion trail).

## 6. World building animation

- **Planned → built**: dashed blueprint rect fades in; on "build", fill wipes up (clipPath rising
  over 20 frames), interior props pop in staggered 3 frames apart, lights flicker on (opacity
  0→1→0.5→1 over 8 frames), then the light pool fades in.
- **Excavation**: dark hole rectangle grows; a digger arm rotates on a pivot; dirt particles.
- **Time of day**: interpolate sky gradient stops and a full-frame tint; switch window lights on
  one by one (seeded order).
- **Liquids**: tank fill level rect with a 2-px lighter surface line and slow sine wobble.
- **Bubbles/sparks/dust/snow**: particles with deterministic positions
  `y = (seedY * H + local * speed) % H`; use three.js `points` in an overlay when there are more
  than ~150, SVG circles otherwise.

## 7. Depth, glow and grain (code)

```tsx
// Bloom: blurred duplicate behind an emitter.
<g filter="url(#glow)"><rect … fill="#ffc83d" /></g>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>

// Grain: once per frame, cheap.
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 8} /><feColorMatrix type="saturate" values="0" /></filter>
<rect width="100%" height="100%" filter="url(#grain)" opacity={0.05} />

// Depth of field: blur background layers only.
<g style={{ filter: `blur(${dofPx}px)` }}>…far layers…</g>
```

## 8. three.js / shaders (accents only)

Use three.js (via `@remotion/three` `<ThreeCanvas>`) for: dense particles, volumetric-looking
glows (additive sprites), 3D objects in an otherwise 2D world (a rotating globe, a mushroom
cloud of sprites), or shader effects (heat haze, water caustics). Rules:
- Orthographic camera, transparent background, drive everything from `useCurrentFrame()`.
- `pointsMaterial` with a radial-gradient `CanvasTexture`, `sizeAttenuation={false}`,
  `depthWrite={false}`, `blending={AdditiveBlending}` for glow.
- A custom `shaderMaterial` takes `uTime = frame / fps` as a uniform; never use the clock.
- Render with `chromiumOptions: { gl: "angle" }` (already set in remotion.config.ts).

## 9. Sound sync hints (for the user's SFX pass)

Stamp = hit; counter change = soft tick; whip = whoosh; card = paper slide; build = clunk +
electric hum; bad news = low boom. Place SFX on the exact frame of the visual event.
