# Visual style: flat illustration, cinematic light, information design

## 1. Shapes and characters

- **Flat vector, no or thin outlines.** Pick one per series:
  - *Soft flat* (no outlines): solid fills, a single darker shade on one side, rounded corners
    8-20 px. Works with glow-heavy night scenes.
  - *Thin line* (1.5-2.5 px dark outline at 1080 px wide): pastel daytime, office/street stories.
- **Characters are simple and readable at 120 px tall.** Round or oval head, dot or almond eyes
  with a highlight, one-stroke eyebrows (the main emotion driver), small mouth, simple hair
  silhouette, block torso, tube limbs, shoes. 2.5-3 heads tall for "cute" sim stories, 6-7 heads
  tall side-view for character dramas.
- **Identity by colour and silhouette**, not detail: every main character gets one signature
  colour (purple hoodie, green jacket, pink cardigan) used nowhere else in the frame.
- Side-view characters walk in profile; front-view characters stand in a row for "family" shots.
- Props are built from 2-4 primitives each (toilet = 2 rounded rects + ellipse). Repeat props
  in rows to suggest abundance (40 identical cans, stacked toilet rolls, server racks).

## 2. Colour

**Two-palette system (survival/disaster channels).** Day for calm parts (meeting the hero,
preparation); night for the disaster and anything with many numbers (they read better on dark).
- Day / farm: sky `#DFDEC6` + `#ADC0C2`, field `#788856`, grass `#505D36`, olive `#3B3D24`,
  barn red `#A8322A`, paper `#F6F2E7`.
- Night / blackout: background `#0B0F1A`→`#121A2B`, diagram lines `#3B8EEA`, warm window
  `#FFB84D`, danger `#E53935`, OK `#3DDC84`.

General palette guidance:

- Base palette is **desaturated**; saturation is reserved for things that matter (the counters,
  the hero, the glowing tank, the warning). Background buildings: grey-blue, 30-50 % saturation.
- Day: sky `#7fb6e6 → #d9ecf7`, ground `#5a4a3a`, soil deeper `#2a2622`.
- Dusk/threat: sky `#3b3550 → #8a6a6a → #f0b070` with an orange glow source.
- Night interior: walls `#3a4250`, floor `#2b2f38`, warm lamps `#ffd27a`, cool screens `#7fd0ff`.
- UI accents: danger `#ff4d4d`, money/gold `#ffc83d`, success `#2fd27a`, info `#4da3ff`,
  thought `#a98bff`.
- Big scenes pick ONE dominant hue (warm brown café, blue bus, dusk purple) and push everything
  toward it with a full-frame tint at 8-15 %.

## 3. Lighting stack (what makes flat art look premium)

Apply in this order, every scene:

1. **Sky/backdrop gradient** with a soft sun or glow disc (radial gradient, 40 % alpha halo).
2. **Atmospheric depth**: far layers lighter and bluer (add 20-40 % sky colour on top).
3. **Light pools**: ceiling lamps throw a trapezoid/radial gradient onto walls and floor
   (`#ffd27a` at 25 % → 0). Screens and tanks emit their colour with a blurred duplicate behind
   them (bloom).
4. **Bottom gradient**: the lower 35-45 % of the frame fades to near-black (`rgba(10,12,18,0.85)`).
   This grounds the scene AND gives captions a clean area.
5. **Vignette**: radial, 25-35 % at corners.
6. **Grain/specks**: 1-2 % noise (SVG feTurbulence) or sparse floating dust dots drifting slowly.
7. **Depth of field** (character dramas): background layer blurred 4-10 px, bokeh circles from
   lamps (blurred discs at 30 % alpha), foreground sharp.

### Glow with meaning only
Glow is allowed on emitters (lamps, screens, fire, the danger counter) and on UI borders whose
colour carries meaning (green good / yellow resource / red danger). Never decorative: no purple
neon, no "glass" panels, no gradient-only backgrounds, no sparkle particles for beauty.

## 4. Textures

- Soil: dark gradient + 30-80 small rounded pebbles in slightly lighter tone, random sizes.
- Brick: rows of rounded rects with 2-tone variation; only where the camera is close.
- Concrete: flat colour + faint speckle dots + panel seams.
- Glass: light blue at 60 % + one diagonal white highlight stripe at 20 %.
- Blueprint (planned, not built): dashed 3-4 px stroke in `#4da3ff`, inner fill `#4da3ff` 12 %,
  outer glow, a small label tag "MODULE 2 · APARTMENT B".

## 5. The UI layer (half of the storytelling)

All UI shares one design system: rounded 14-24 px, 3-5 px coloured border, dark translucent
fill `rgba(15,18,28,0.85)` OR white card `#fbfaf6` with soft shadow, bold geometric sans
(Montserrat/Inter Black/Arial Black), ALL CAPS for labels, sentence case for card bodies.

| Element | Look | Behaviour |
|---|---|---|
| **HUD counters** | Two corner pills: red "DAYS LEFT" left, gold "BUDGET" right; dark fill, glowing border | Digits roll on change; a red/green delta badge drops in under it with the reason (`≈ −$20,000 KITCHEN`) and fades after 2-3 s |
| **Status chip** | Small icon + red text "CAN'T GO OUTSIDE · 730 DAYS" under the HUD | Static context reminder |
| **Checklist clipboard** | Mini clipboard pinned at the left edge, 7 lines | Item gets a green ✓ when the story solves it |
| **Callout label** | Dark pill with coloured border + tiny subtitle; thin leader line to the target | Pops with overshoot; leader line draws in |
| **Stage-direction tag** | Small white or coloured flat label ("NODS", "SILENCE", "FIRST SMILE") | Appears above the subject for 1.5 s |
| **Location/time tag** | Tiny dark chip top-left ("MORNING · BUS 47", "CAFÉ · ALMOST EMPTY") | On every location change |
| **Info card** | White card, slight rotation (−3°…3°), drop shadow, title in colour, rows with values | Slides up 40 px + fades in; rows appear one by one; numbers count up |
| **Document/prop card** | Notebook, contract, insurance policy, phone UI, bank app, clipboard | Can carry a magnifier circling a key line, a red pen strike-through |
| **Chart card** | Bar chart, bars grow from 0 with stagger, dashed target line labelled | Bars colour red below target, green above |
| **Summary card** | Two columns: SPENT / LEFT + a line under | End of act |
| **Speech bubble** | White rounded box, dark text, tail to speaker, tag above ("ALOUD · BOSS" yellow) | Scale from 0.9 + fade |
| **Thought bubble** | (the one sanctioned purple: it means "thought") Dark purple box, dashed glowing border, italic white text, 3 dots trailing to the head, tag ("THOUGHT · GIRL") | Gentle bob; faint ghost thoughts float around crowds at 40 % |
| **Meter** | Segmented bar (10 segments) with label ("VOICES") | Segments light up/down with intensity |
| **Stamp** | Big rotated word in a bordered box ("NO", "REMOVED ✓") or comic SFX text ("CLANG!") | Slams in from 1.4 scale to 1 in 5 frames with a small shake |
| **Inset (PiP)** | Rounded frame showing another scene (memory, fact, CCTV) | Enters with scale 0.92→1, background dims |
| **Annotation** | Red hand-drawn ellipse around a clue | Stroke draws on over 12 frames |
| **HUD plate** | Small card: icon, CAPS title, smaller subtitle ("ARMORED DOOR / 1 entrance", "VIEW 15 KM / height 110 m"), thin glowing border in the meaning colour, dashed leader to the object | Pops in; one component for all plates (flex, centred both axes, line-height 1) |
| **System label** | Monospace (JetBrains Mono): "DAY 1 — 18:04", "PLAN: DOWN → OUTSIDE" | Types on or cuts in with the scene |
| **Paper card** | Notebook page / supplies list with icons and bar gauges ("Water — 12 days") | Slides in, bars fill |
| **Accent ribbon** | Red diagonal tape across the frame with a phrase ("STAIRS = TRAP") | 1-2 times per video only |
| **Object close-up** | Lock, key, flashlight, pressure gauge, phone with an alarming notification | Rhythm breaker between diagrams |

**No text inside images or 3D renders.** All text is drawn by code in the overlay so it stays
sharp, translatable and editable.

## 6. Captions (karaoke)

Inter Display Black / Montserrat Black, white CAPS,
2 lines × 2-4 words, centred, at 60-68 % of frame height; shadow `0 3px 14px rgba(0,0,0,.7)` +
thin dark outline. The whole phrase appears at once (scale 0.94→1 over 4-5 frames), unspoken
words white 50 %, each word turns white exactly when spoken (±2 frames, from `words.json`).
**Max ONE coloured word per phrase**: yellow `#F5C518` important, red `#E53935` danger. The old
phrase disappears instantly; two phrases never coexist. Keep the caption band (56-74 % height)
free of plates, arrows and cards. Minimum text size anywhere: 34 px at 1080×1920.
- Size 64-84 px at 1080 width; the dark bottom gradient keeps them readable. Never over a face.
- Story-specific colours are allowed for the ONE coloured word when they carry meaning: green
  good news, purple for a character's thought (matching the thought bubbles).
- Landscape (16:9) variant: small white text in a dark pill at the bottom centre.

## 7. Looks like an AI template → redo it

Centred text on a gradient background; purple neon, glass, glowing particles; everything sliding
up from the bottom at once; constant zoom-pulse and shake; stick figures on an empty background;
glossy plastic 3D, spiky grass; letters inside generated images; a hero who looks different from
scene to scene; a "whoosh" on every cut; any static frame longer than 3 s.

## 8. Composition

- Rule of thirds for characters; key UI in the top band and centre-left.
- Leave the top 14 % for HUD and the area between 70 % and 100 % mostly dark.
- Wide shots: horizon at 35-45 % height in cross-sections so both surface and underground read.
- Use foreground occluders (poles, door frames, chair backs) in 1 of 3 shots for depth.
