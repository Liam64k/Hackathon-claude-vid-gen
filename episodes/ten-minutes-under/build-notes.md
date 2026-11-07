# Ten Minutes Under: build + storyboard notes (stages 4-5)

Typecheck passes. Storyboard: `out/storyboard.png` (39 tiles; `npm run storyboard`). Full video NOT rendered. `src/audio.json` still empty (2.6 words/s estimate, ~107.5 s).

## Files
- Preserved: `episodes/_example-14-minutes/` (old shots.ts + full `src-snapshot/`). Old worlds/Character.tsx left in `src/art/` (unused, still compile).
- New: `src/art/Lake.tsx` (side view + ice cross-section in one world: dusk->dark, cracks, hole, 6 cm slab, current, shack row, trail, ruler, trapped air, chips, 3 m dimension), `LakeTop.tsx` (plan map + boot-print plate, top-down Eli roll, brother runner, arrows, red dashed path), `Figures.tsx` (figure runner, water clip, custom rescue skeletons, red dashed ghost Eli with X and shatter), `Diagrams.tsx` (title, DNR ladder, 1-10-1 card, 911 insert, angle meter, Part 2, swatch chip), `color.ts`, `src/camAt.ts`.
- Rewritten: `src/shots.ts` (16 exact LINES, 39 SHOTS), `types.ts` (World, Figure, Hud, Ev), `timeline.ts` (world + HUD carry-forward, snow clock, phrases), `Episode.tsx`, `overlay/Hud.tsx`, `Text.tsx` (captions), `Events.tsx`, `Foreground.tsx`, `Light.tsx`, `Particles.tsx` (snow only), `scripts/storyboard.sh` (39 shots).

## Fixed after the first contact sheet (qa.md symptoms)
1. Captions cramped / overflowing: char-balanced two-row phrases, 64 px, wider gaps.
2. Ghost Eli read as a pink blob: now the real rig at 42 % + red dashed ring.
3. Wide shots mostly dark void: horizon moved to ~45 % height, narrower ice tongue, lighter bottom gradient, bubbles in the water.
4. TOP map empty/unreadable: bigger prints, fishing holes, tracks, narrower creek, hole kept above the caption band.
5. Eli cropped off-frame in 14a/15 and invisible print in 16b: Eli moved to x=1760, camera reframed, print plate brightened.

## Deviations from the approved shotlist
- The shotlist says 38 shots; the table has 39 rows. All 39 built.
- Weights re-tuned to estimated word times: 4a 3.8 s (card build), 5a 1.5/5b 3.4, 6a 2.7/6c 3.8, 11a 3.3/11b 1.5/11c 2.0, 16a 3.7/16b 1.6. A few shots exceed 3.5 s (all have a move).
- 12b trucks RIGHT (toward the shack) so the slide matches the geography; shotlist said left.
- 14a: Eli lies flat (not sitting). 11b waterline lowered so the picks stay above water.
- Ladder shows cm bold; inches only on the 10 CM rung (`4 IN`). Vehicle rungs grey/small.

## Known weaknesses
- Lower third of most frames is dark (cut-away water + caption gradient).
- Ghost and TOP-view people are map-symbol quality; footprints are small at TOP WS.
- Not built: rod case, frost on brows, hand pulling the picks apart, water splash on ghost.
- Only 4 stills inspected full size (10a, 6b, 14a, 13b); face-vs-caption overlap judged from the contact sheet only.
- Word timing is an estimate; callout/stamp times will need a pass after the ElevenLabs split.
- Fonts come from Google Fonts at render time (Arial Black fallback offline).
- 14a/14b/15 use a "dusk" ladder value of 0.8-1.0; stars/blue hour not checked at full size.
