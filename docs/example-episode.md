# Example episode: "14 Minutes"

A 2-minute nuclear-war survival short already built in `src/`. Use it as a working reference.

- Premise: a missile alert hits Times Square, everyone thinks it's a drill (Hawaii 2018), the
  hero finds an old fallout-shelter basement with 5 strangers. Rule #1 don't look at the light,
  Rule #2 count all the food, Rule #3 strip at the door (−90 % contamination). 7-10 rule hope,
  3 cans missing, the kid ate the emergency chocolate → "Part 2?".
- Data: `src/shots.ts` (12 narration LINES, 32 SHOTS with camera, cast, light, HUD, stamps).
- Worlds: `src/art/TimesSquare.tsx`, `Street44.tsx` (shelter sign + stairwell), `Basement.tsx`,
  `Outside.tsx` (blast cross-section, fallout street), `Cards.tsx` (phone alert, newspaper, math).
- Cast: `src/art/Character.tsx` (rig with expressions and poses; hero, Ray, Maria, Leo, Dev,
  Grant, a stranger; seeded crowd).
- Overlays: two-phase HUD (IMPACT IN countdown → HOUR/FOOD/PEOPLE/RADIATION), karaoke captions,
  stamps, bubbles, lighting modes (red, candle, dark, flashlight, white flash), three.js snow/
  dust/debris.
- Voice: not included (it was the user's ElevenLabs recording). `src/audio.json` is empty, so
  timing uses the words-per-second estimate until a new MP3 is split in.

Known gaps to improve next time: captions colour several words per phrase (the skill now says
max one); no SFX; no recurring channel hero yet; diagrams are few.
