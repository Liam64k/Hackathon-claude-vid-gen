# Captions, stamps and HUD

## Karaoke captions

- Source: the narration line in `src/shots.ts`. Word timings are estimated inside each line's
  voice clip, proportional to character count plus a pause after punctuation.
- Show a window of 2-6 words; the spoken word scales up 8% and turns gold `#ffd23f`; words in the
  `highlight` list stay coloured once spoken.
- Font: heavy rounded sans, 76-84 px, white with 12 px black stroke and soft shadow.
- Position: centred at 70% height. Move to 22% if the shot puts a face low in frame.

## Stamps

- One per rule or big number, rotated -4 to -6 deg, springs in with overshoot, solid colour,
  6 px white border, 64-80 px text, held at least 1.2 s.
- Colours: rules red, numbers gold, good news green, mystery purple.

## Speech bubbles

- Only for short in-world lines (<= 6 words). White, 5 px dark border, tail pointing at speaker.

## HUD

- Phase "countdown" (before impact): one large centred pill `IMPACT IN mm:ss`, red, ticking each
  second (scale pulse on tick), plus a small PEOPLE pill.
- Phase "shelter" (after impact): four compact pills in a row:
  `HOUR`/`DAY`, `FOOD`, `PEOPLE`, `RADIATION` (meter red -> amber -> green with % label).
- Counter changes ease over ~0.5 s and flash the pill when they jump.
