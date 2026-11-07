# Project structure (this repo: Remotion 4 + React + SVG + three.js)

## Layout

```
src/
  index.ts            registerRoot
  Root.tsx            <Composition id="Episode"> (+ Storyboard, CastSheet dev comps)
  Episode.tsx         renders: world (SVG + camera) → particles → light → HUD → UI → captions → audio
  shots.ts            EPISODE DATA: LINES (narration + highlight words) and SHOTS (beat board)
  timeline.ts         line/shot timing from audio.json; hudAt(), shotAt(), wordTimes()
  camera.tsx          Cam type, camBetween, cameraTransform, shakeAt, Layer (parallax)
  types.ts            Shot, Actor, Hud, SceneId, LightMode
  audio.json          { voice: { "<line>": seconds }, sfx: { … } }
  art/                kit.tsx (OUT colour, shade, rand, Block, SignText, Gradient),
                      Character.tsx (rig + CAST), one file per world/scene
  overlay/            Hud.tsx, Text.tsx (Captions, Stamp, Bubble), Light.tsx, Particles.tsx
  dev/                Storyboard.tsx (Freeze one frame per shot), CastSheet.tsx
public/voice/line-N.mp3
scripts/storyboard.sh, scripts/contact.swift, scripts/video-analyze.swift
```

### Channel assets vs episodes
Channel identity is built once and reused: style notes (palettes, fonts), the hero/companion rigs
and their pose sheet (front, profile, 3/4; sitting, walking, crouching, phone, looking over the
shoulder, pointing, writing, holding a flashlight), walk cycles, one day and one night test frame,
a 5-second karaoke test. Keep them in `src/art/` (rigs) and `.claude/skills/story-explainer-2d/`
(style notes). Per episode keep `episodes/<slug>/script.md` (with phrase → screen table),
`shotlist.md`, `notes.md`, `words.json` (if whisper is available) next to the code data.
Character rigs: separate groups with pivots for head, torso, upper arm, forearm, hand, thigh,
shin, foot; eyes, brows and mouth as separate elements. Walk cycle 8-12 frames, feet planted (move
the body by exactly the stride length per cycle so feet don't slide).

Keep episode content in data (`shots.ts`) and drawing in components. A new episode should mostly
mean a new `shots.ts`, one or two new world components, and new cast entries.

## Data model

```ts
interface Shot {
  line: number;              // narration line index
  weight?: number;           // share of that line's duration
  scene: SceneId;            // which world component
  from: Cam; to?: Cam;       // camera keyframes
  cast?: Actor[];            // who is where, expression, pose, walkTo
  light?: LightMode;         // day | red | candle | dark | flashlight …
  flash?: "white" | "fade" | "alert";
  shake?: number; whip?: boolean;
  stamp?: { text; color; at };   // at = fraction of the shot
  bubble?: { text; x; y };
  hud?: Partial<Hud>;        // values at the END of the shot (interpolated from previous)
  particles?: "snow" | "dust" | "debris";
  props?: Record<string, number | boolean | string>;  // world state for this shot
}
```

For the richer UI in this skill, extend `Shot` with arrays rather than more single fields:
`events?: { at: number; kind: "callout" | "card" | "delta" | "tick" | "tag" | "thought"; … }[]`
and render them in one `overlay/Events.tsx` that switches on `kind`. Keep world state changes
(`built: ["module1"]`, `time: "night"`) in `props`.

## Timing

- Narration is split into lines (beats). Each line's length comes from `audio.json.voice[i]`
  (seconds of real audio) or an estimate of words / 2.7 until the voice exists. A 0.3 s gap is
  added after each line.
- Shots inside a line share its frames by `weight`.
- `TOTAL_FRAMES` drives the composition duration, so swapping the voice re-times everything.

## Voice from ElevenLabs (user pastes one block, sends one MP3)

1. Give the narration as ONE block, blank line between beats.
2. Detect silences:
   `npx remotion ffmpeg -i in.mp3 -af silencedetect=noise=-40dB:d=0.18 -f null -`
   (Remotion's bundled ffmpeg has no `null` encoder for video but works for this audio filter;
   it lacks `tile`, `rawvideo` and `showinfo`, so use the Swift tools below for video analysis.)
3. Choose the N-1 boundaries by dynamic programming: cost = |silence midpoint − expected time
   (cumulative character share × total duration)| − 3 × silence length. Check every cut is within
   ~1.5 s of expected; if not, ask the user to regenerate with longer pauses.
4. Cut with `-ss start -to end` into `public/voice/line-N.mp3`, write durations to `audio.json`.

## Rendering

- Final: `npx remotion render src/index.ts Episode out/<slug>.mp4` (run in background, ~2-3 min
  per minute of video at concurrency 4).
- Phone copy < 30 MB: `npx remotion ffmpeg -i out/x.mp4 -c:v libx264 -crf 26 -preset medium
  -c:a aac -b:a 128k -movflags +faststart out/x-phone.mp4`.
- Storyboard: `npm run storyboard` → `out/storyboard.png`. The Storyboard composition must have
  `durationInFrames = TOTAL_FRAMES`, because `<Freeze frame>` is clamped to the composition length.

## Analysing reference videos (when the user sends MP4s)

AVFoundation tool at `scripts/video-analyze.swift`. Compile once into the scratchpad:
`swiftc -O scripts/video-analyze.swift -o <scratchpad>/vtool`, then:
- `vtool cuts <video> > v.diff` — read every frame, average 48×48 grey grid, print per-frame mean abs difference →
  cuts are spikes > max(14, 5 × median); motion share = frames with diff > 1.5.
- `vtool frames <video> <outdir> <t1,t2,…> <width>` — export PNGs at given timestamps (AVAssetImageGenerator, zero tolerance).
- Tile them with `swift scripts/contact.swift <dir> <out.png> <cols>`.
Look at: every 5 s for structure, 0.25 s bursts around cuts for transition technique.
