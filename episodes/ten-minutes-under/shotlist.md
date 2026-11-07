# Ten Minutes Under: world, beat board and shot list (stage 2, for GATE 1)

Timings are estimates at 2.6 words/s plus ~0.3 s pause per line (total ~107 s). They get
re-weighted from the real ElevenLabs clip lengths after the voice split. No code yet: the
"Implementation notes" at the end list what the scene-coder will need.

## 1. The persistent world: one frozen Minnesota lake

One lake, three views of the same geography (the camera moves between them with tilts and
whip-zooms, never a cut to an unrelated place):

- **SIDE (horizon view)**, canvas ~3240 x 3840. Layers (depth): sky band, dusk gradient
  `#f4a6b8 → #7d6fb0` (0.1) · low sun `#ffd6a0` sinking behind the pine shoreline `#24453a`
  (0.2) · far shack row, three shacks, the brother's is red `#b8322a` with a lit window `#ffc56b`
  and stovepipe smoke (0.4) · lake surface: white snow-ice `#e9eef5` with blue shadows `#b7c3d9`,
  a trail of boot prints from the red shack toward the left, the **creek mouth** (a channel
  through the pines) and a **dark clear-ice patch** `#2b3a52` where it meets the lake (1.0) ·
  foreground occluders: pine branch tips, snow ridge, ice chunks at the hole (1.4).
- **CUT (cross-section)**, directly under the SIDE ice line, same x coordinates: ice slab (thick
  on the left, thinning to 6 cm over the creek mouth), water `#0f1b2b` with soft current arrows
  coming from the creek, lake bed far below in dark teal. The camera tilts down through the ice
  line to get here. Used for the slab thickness, Eli in the hole (head and shoulders always above
  water), the trapped-air jacket and the kick-flat-slide diagram.
- **TOP (map view)**, same geography from above: shoreline, creek, shack row, footprint trail,
  the hole. Used for "turn back", the roll-away and the brother's path. Reached by whip-zoom up.

### World states (data, so any frame can be rendered)

| State | Lines | Sky / light | Surface | Hole | People |
|---|---|---|---|---|---|
| S0 DUSK | 1-4 | pink, sun a hand above the pines, long blue shadows | footprints, no cracks (except the hook flash-forward in shot 1a/1b) | none | Eli walking; shack window lit |
| S1 CRACK | 4c-5a | sun touching the treeline | crack star under Eli | none | Eli mid-step |
| S2 HOLE | 5-9, 10-12 | orange line on the horizon, violet above; first star | broken plates, open water | 1.5 m, plates bobbing | Eli chest-deep |
| S2F FREEZE | 6-8 | whole frame blue monochrome, grain, snow particles stop in the air | same | same | Eli frozen + red dashed "ghost Eli" |
| S3 OUT | 13-14 | sun gone, blue hour `#4b5d8f`, shack window brighter | wet drag trail from the hole along the footprints | open | Eli flat, 3 m from the hole |
| S4 BROTHER | 15-16 | deep violet, first stars | brother's fresh prints on the trail | open | shack door open, brother running |

## 2. Diagrams (5, all code-drawn, min text 34 px)

1. **D1 Ice-thickness ladder** (card, shot 4a). Header `NEW CLEAR ICE · MINNESOTA DNR`. A
   vertical ruler, rungs build bottom-up: red band `UNDER 10 CM · STAY OFF` with a blinking
   marker `6 CM · ELI`; `10 CM` boot icon; small grey icon rungs above it: `13-18` snowmobile /
   small ATV, `18-20` side-by-side, `23-25` small car / SUV, `28-30` medium SUV / small truck,
   `33` medium truck, `40-43` heavy-duty truck. Vehicle rungs stay small and grey (we are not
   teaching driving on ice); only the red band and the 10 cm rung are bright. Footer chip:
   `NO ICE IS 100% SAFE · THICKNESS VARIES ACROSS A LAKE`. Figures = current DNR table only.
2. **D2 Cross-section of the ice** (CUT plate, shots 3b, 3c, 5b, 6c, 9b). Slab thinning over
   moving water, current arrows, ruler `6 CM`; later the water line at Eli's chest, the jacket's
   air pockets (`TRAPPED AIR`, up arrows).
3. **D3 1-10-1 timer** (card 7b/8a, then pinned as a thin strip under the HUD from 8b until 14a).
   Three segments: `1 MIN · BREATHE` (green when done), `≈10 MIN · GET OUT` (amber, fills with
   the story timer), `≈1 HR · PASS OUT` (dim purple, never fills; stamp `NOT A REST`). Source
   chip `1-10-1 PRINCIPLE · CITED BY MN DNR`.
4. **D4 Step-by-step self-rescue** (CUT + SIDE, shots 10a-13b). Each step gets a numbered stamp
   and a pose: 1 turn back (arrow along footprints), 2 forearms on unbroken ice + picks, 3 kick,
   body-angle meter 70° → 0°, slide on stomach, 4 no standing (red X ghost), roll with
   spread-weight circles, 5 get warm + 911. Optional recap strip of the five poses on the
   end card of Part 2 (not in this episode, to keep text under two blocks).
5. **D5 Top-down map** (TOP plate, shots 10a, 13b, 15c, 16b): footprints, `TURN BACK` arrow,
   `HELD YOU ✓`, roll path, brother's red dashed path and a distance counter.

## 3. HUD (top 14 %)

Compact pills in one row (new "ice" HUD phase):

| Pill | Values over time |
|---|---|
| CLOCK / TIMER | `DEC · 16:18` (L2) → `16:21` (L4c) → `IN WATER 00:00` (L5) → `PAUSED 00:04` (L6-8, blue) → time-lapse to `01:00` (L9) → `01:40` (L10) → `02:30` (L11) → `03:30` (L12) → `04:00` (L13) → stops `04:10` (L14) → `16:27` (L15-16) |
| ICE | `ICE -- cm` (L2) → `6 cm` red with flash (L3) |
| WATER | appears at L5: `≈0 °C` |
| PHASE (1-10-1) | `MIN 1 · BREATHE` (L5-9) → `MIN 10 · GET OUT` (L10-13) → `OUT ✓` green (L14) → hidden; replaced by `BROTHER 60 M → 40 M` red (L15-16) |

Counters ease over ~0.5 s and flash on jumps. Captions at 66-70 % height; move to 22 % in shots
where Eli's face is low in frame (5b, 9b, 12a).

## 4. SFX (4 sounds only, no music bed)

| ID | Sound | Where |
|---|---|---|
| S1 | Wind over open ice, low bed | whole episode; drops to near-silence during the freeze (L6-8), returns at 9a |
| S2 | Ice crack (one asset, three intensities) | 1a soft hairline, 4c low creak, 5a full crack |
| S3 | Plunge + water slosh | 5a→5b only |
| S4 | Clock tick | HUD timer starts 5b, time-lapse 9a, step stamps 10a/11a/12a/13a/14b, timer stop 14a, final stamp 16a |

## 5. Beat board (one row per narration line)

| # | Narration line | World state | Camera move | UI events (at %) | SFX |
|---|---|---|---|---|---|
| 01 | "When the ice broke under me, I had ten minutes. Not seconds." | S1 flash-forward: crack under Eli's boots, pink dusk | TOP CU push-in ×1.0→1.2 on the last boot print, hard cut to SIDE MS slow push ×1.0→1.12 | title card `10 MINUTES / NOT SECONDS` 5 %; crack grows 20-60 %; card dissolves 95 % | S1 in, S2 soft |
| 02 | "December, sunset, a frozen Minnesota lake. I was walking back from my brother's fishing shack." | S0 DUSK (rewind: no crack) | SIDE EWS drift right 20 px/s ×1.00→1.04, cut to MS truck left with Eli | clock `DEC · 16:18` 10 %; callout `MINNESOTA` 25 %; callout `ELI` 55 %; callout `MY BROTHER'S SHACK` 80 %; `ICE -- cm` pill 90 % | S1 |
| 03 | "I cut past the creek and never checked the ice. Over moving water, it was six centimeters." | S0, Eli turns off the trail toward the dark patch | SIDE EWS tilt toward creek → tilt down through the ice line into CUT WS → CUT CU push on ruler | callout `CREEK` 15 %; `?` over patch 40 %; current arrows 60 %; stamp `6 CM` (gold) 85 %; ICE pill → `6 cm` red 88 % | S1 |
| 04 | "The Minnesota DNR says under ten centimeters of new clear ice, stay off. White ice? About half as strong." | S0 → S1 (sun touches pines) | ladder card slides in over dimmed EWS (bg 50 %), push ×1.0→1.15 on the red band; cut to SIDE CU boots on clear vs white ice; cut to SIDE WS | D1 header 5 %; red band `UNDER 10 CM · STAY OFF` 30 %; marker `6 CM · ELI` blinks 40 %; card out 48 %; chip `WHITE ICE ≈ ½ AS STRONG` 60 %; clock `16:21` 90 % | S2 low creak at 90 % |
| 05 | "One crack. Then black water, near zero degrees, up to my chest." | S1 → S2 HOLE | SIDE CU locked + shake (30 px, decay 0.4 s) → CUT MS slow push ×1.0→1.15 | crack snaps 5 %; HUD clock → `IN WATER 00:00` 35 %; `WATER ≈0 °C` 55 %; dashed chest line + callout `CHEST` 85 %; phase `MIN 1 · BREATHE` 90 % | S2 full, S3, S4 starts |
| 06 | "Most people think they have seconds, so they panic and thrash. Or they think a heavy jacket drags you down, and tear it off." | S2F FREEZE | SIDE WS locked (snow stops) → SIDE CU drift on ghost → CUT MS push ×1.0→1.2 | freeze + `PAUSED 00:04` 3 %; ghost Eli 15 %; callout `MISTAKE 1 · PANIC` 35 %; jacket down-arrow `?` 60 %; callout `MISTAKE 2 · JACKET OFF` 85 % | S1 fades to near silence |
| 07 | "Both mistakes burn your time. Rescue experts call it one, ten, one. One minute: get your breathing under control." | S2F | SIDE WS (ghosts shatter) → D3 card insert (bg dim) → SIDE CU push on Eli's face ×1.0→1.25 | red X on both ghosts 8 %, shatter 20 %; card `1 · 10 · 1` + source chip 30 %; segment 1 `1 MIN · BREATHE` lights 75 %; breath puffs slow 85 % | S4 on card in |
| 08 | "Then about ten minutes of strength to get out. And about one hour before you pass out. That hour is not a rest." | S2F; sun lower behind the freeze | D3 card push along the bar → SIDE EWS (bar pinned under HUD) → SIDE CU push ×1.0→1.3 | segment 2 `≈10 MIN · GET OUT` fills 15 %, arm-strength meter drains 25 %; segment 3 `≈1 HR · PASS OUT` dim purple 50 %; stamp `NOT A REST` (red) 80 % | none (silence is the beat) |
| 09 | "So for one minute, I only breathed. My jacket stayed on. Trapped air held me up." | S2F → S2 (colour returns) | SIDE WS time-lapse (locked, light shifts, breath puffs) → tilt down to CUT MS drift | unfreeze 5 %; timer `00:04 → 01:00` 10-45 %; segment 1 ✓ 45 %; air pockets + callout `TRAPPED AIR` 65 %; phase → `MIN 10 · GET OUT` 95 % | S1 back, S4 fast ticks during time-lapse |
| 10 | "Which way? Step one: turn back the way you came. That ice already held you." | S2 | whip-zoom up to TOP WS (8 frames, light flash) → SIDE CU slow push as Eli turns | four faint arrows 5 %; stamp `STEP 1` 25 %; three arrows fade, green `TURN BACK` arrow 40 %; footprints glow + `HELD YOU ✓` 75 %; timer `01:40` 90 % | S4 on stamp |
| 11 | "Step two: arms on the unbroken ice. I had ice picks around my neck for exactly this." | S2 | SIDE WS locked → ECU picks (1.5 s) → SIDE MS push ×1.0→1.15 | stamp `STEP 2` 5 %; forearms land 20 %; callout `ICE PICKS` 45 %; picks into fists 80 %; timer `02:30` 90 % | S4 on stamp |
| 12 | "Step three: kick until you're flat, dig in the picks, and slide forward on your stomach." | S2 | CUT WS locked (diagram) → SIDE CU truck left with the slide | stamp `STEP 3` 5 %; body-angle meter 70° → 0° 15-45 %; pick tips bite + ice chips 60 %; chest, then hips onto ice 75-95 %; timer `03:30` 95 % | S4 on stamp |
| 13 | "Step four: don't stand up. Roll away from the hole, arms and legs spread wide." | S2 → S3 OUT | SIDE WS locked → whip-zoom up to TOP, camera follows the roll | stamp `STEP 4` 5 %; red dashed standing ghost + red X 20 %; roll path along footprints 50 %; spread-weight circles 65 %; timer `04:00` 95 % | S4 on stamp |
| 14 | "Minute four. Soaked, shaking, out. Step five: get somewhere warm and call nine-one-one." | S3 OUT, blue hour | SIDE WS slow pull-out ×1.1→0.95 → card insert (phone, bg dim) | timer stops `04:10` 5 %; phase `OUT ✓` green 15 %; callout `3 M` 35 %; stamp `STEP 5` 50 %; phone in zip bag `911` + `GET WARM` window icon 60 %; D3 strip hides 95 % | S4 timer stop + stamp |
| 15 | "Then I heard my name. 'Eli!' My brother saw it all from the shack. He was running straight at the hole." | S4 BROTHER | SIDE CU (Eli's head turns) → whip-pan right to EWS of the shack row → whip-zoom up to TOP | bubble `ELI!` 12 %; clock `16:27` 20 %; callout `MY BROTHER` 45 %; red dashed path 75 %; pill `BROTHER 60 M → 40 M` 80-100 % | S1 |
| 16 | "The first rule of helping someone? Never rush to the hole. Part two." | S4 | SIDE MS (brother runs at camera) push ×1.0→1.2, freeze frame → TOP CU on his boot print (rhymes with shot 1a) | brother boots mid-stride 10 %; freeze 45 %; stamp `NEVER RUSH TO THE HOLE` (red) 50 %; end card `PART 2` 80 % over the dimmed print | S4 on stamp, S1 out |

## 6. Shot list (38 shots, each 1.5-3.5 s)

Plates: SIDE / CUT / TOP / CARD. Sizes per `survival-short/references/shots.md`. Adjacent shots
always differ by two sizes or change plate. Exactly one camera move per shot.

| Shot | Line | Dur (s) | Plate · size | Move | Frame content | HUD / UI | Stamp / callout | SFX |
|---|---|---|---|---|---|---|---|---|
| 1a | 1 | 2.2 | TOP · CU | push ×1.0→1.2 | Last boot print in pink-lit snow, Eli's boots stepping into it, hairline crack star spreading | title card `10 MINUTES / NOT SECONDS` | — | S1 in, S2 soft |
| 1b | 1 | 2.7 | SIDE · MS | push ×1.0→1.12 | Eli frozen mid-step, cracks around his boots, sun low behind him, pine branch occluder | title card holds, dissolves at end | — | S1 |
| 2a | 2 | 3.0 | SIDE · EWS | drift right 20 px/s | Whole lake: pink sky, sun above the pines, shack row, footprint trail, tiny Eli | clock `DEC · 16:18` | callout `MINNESOTA` | S1 |
| 2b | 2 | 3.1 | SIDE · MS | truck left | Eli walking, breath puffs, rod case in hand, ice picks on a cord at his chest; red shack far behind | `ICE -- cm` | callouts `ELI`, then `MY BROTHER'S SHACK` | S1 |
| 3a | 3 | 2.4 | SIDE · EWS | tilt toward creek | Creek channel through the pines, dark patch at its mouth, Eli leaving the trail toward it | — | callout `CREEK`, `?` over patch | S1 |
| 3b | 3 | 2.4 | CUT · WS | tilt down through the ice line | Slab thinning left→right over current arrows from the creek | — | label `MOVING WATER` | S1 |
| 3c | 3 | 2.0 | CUT · CU | push ×1.0→1.2 | Ruler on the thin edge of the slab | ICE → `6 cm` red flash | stamp `6 CM` (gold) | S1 |
| 4a | 4 | 3.4 | CARD (D1) over dim EWS | push ×1.0→1.15 | Ice-thickness ladder building; red band; Eli marker | — | `UNDER 10 CM · STAY OFF`, `6 CM · ELI`, footer chip | S1 |
| 4b | 4 | 2.2 | SIDE · CU | drift 15 px/s | Eli's boot at the seam between white snow-ice and clear black ice | — | chip `WHITE ICE ≈ ½ AS STRONG` | S1 |
| 4c | 4 | 2.0 | SIDE · WS | locked, slight push ×1.0→1.05 | Eli alone on the dark patch, sun touching the pines | clock `16:21` | — | S2 low creak |
| 5a | 5 | 1.6 | SIDE · CU | locked + shake 30 px | Crack star snaps open under the boots | — | — | S2 full, S3 |
| 5b | 5 | 3.3 | CUT · MS | push ×1.0→1.15 | Eli in the hole, water at his chest, head and shoulders above, plates bobbing | `IN WATER 00:00`, `WATER ≈0 °C`, phase `MIN 1 · BREATHE` | dashed chest line + `CHEST` | S4 starts |
| 6a | 6 | 3.0 | SIDE · WS | locked (snow freezes mid-air) | Whole hole area turns blue monochrome; red dashed ghost Eli rises out of real Eli | `PAUSED 00:04` | callout `MISTAKE 1 · PANIC` | S1 fades |
| 6b | 6 | 3.0 | SIDE · CU | drift 10 px/s | Ghost Eli splashing, wide eyes (no real distress on the real Eli, who stays still) | — | — | — |
| 6c | 6 | 3.5 | CUT · MS | push ×1.0→1.2 | Ghost tugging the jacket zipper; down arrow with `?` on the jacket | — | callout `MISTAKE 2 · JACKET OFF` | — |
| 7a | 7 | 2.0 | SIDE · WS | locked | Red X on both ghosts, they shatter like thin ice and vanish | — | — | — |
| 7b | 7 | 3.0 | CARD (D3) | push ×1.0→1.08 | Big `1 · 10 · 1`, three-segment bar | — | source chip `1-10-1 PRINCIPLE · CITED BY MN DNR` | S4 |
| 7c | 7 | 2.6 | SIDE · CU | push ×1.0→1.25 | Eli's face, eyes closed, slow breath puffs | segment 1 lights green | — | — |
| 8a | 8 | 3.0 | CARD (D3) | truck right along the bar | Segment 2 fills; arm-strength meter drains | — | `≈10 MIN · GET OUT` | — |
| 8b | 8 | 3.0 | SIDE · EWS | drift left 15 px/s | Frozen blue lake, tiny dark hole, the D3 strip now pinned under the HUD | segment 3 dim purple | `≈1 HR · PASS OUT` | — |
| 8c | 8 | 3.1 | SIDE · CU | push ×1.0→1.3 | Eli's face, calm, frost on his eyebrows | — | stamp `NOT A REST` (red) | — |
| 9a | 9 | 3.3 | SIDE · WS | time-lapse (locked) | Colour returns, sun slides into the pines, breath puffs slow | timer `00:04 → 01:00`, segment 1 ✓ | — | S1 back, S4 fast |
| 9b | 9 | 3.2 | CUT · MS | drift up 10 px/s | Jacket cutaway: pale air pockets, up arrows, Eli floating high | phase `MIN 10 · GET OUT` | callout `TRAPPED AIR` | — |
| 10a | 10 | 3.0 | TOP · WS | whip-zoom in (8 f, flash) then locked | Hole, footprint trail to the shack; four faint arrows, three fade | timer `01:40` | stamp `STEP 1`, arrow `TURN BACK` | S4 |
| 10b | 10 | 3.1 | SIDE · CU | push ×1.0→1.15 | Eli turning in the water to face his own footprints on the near edge | — | green callout `HELD YOU ✓` | — |
| 11a | 11 | 2.3 | SIDE · WS | locked | Eli's forearms land flat on the unbroken edge | — | stamp `STEP 2` | S4 |
| 11b | 11 | 1.5 | SIDE · ECU | locked | Two ice picks on a cord, guards on, hand pulling them apart | — | callout `ICE PICKS` | — |
| 11c | 11 | 3.0 | SIDE · MS | push ×1.0→1.15 | Picks in both fists, raised over the ice | timer `02:30` | — | — |
| 12a | 12 | 3.3 | CUT · WS | locked (diagram) | Legs kicking, body rotates from upright to flat | angle meter 70° → 0° | stamp `STEP 3` | S4 |
| 12b | 12 | 3.2 | SIDE · CU | truck left with the slide | Pick tips bite, ice chips; chest then hips slide onto the ice, water sheets off the jacket | timer `03:30` | — | — |
| 13a | 13 | 2.6 | SIDE · WS | locked | Eli flat on the ice; red dashed standing ghost with red X beside him | — | stamp `STEP 4` | S4 |
| 13b | 13 | 3.5 | TOP · MS | follow the roll (truck) | Eli rolling along the footprints, spread-weight circles under arms and legs, wet trail | timer `04:00` | — | — |
| 14a | 14 | 2.5 | SIDE · WS | pull-out ×1.1→0.95 | Blue hour; Eli lying flat 3 m from the hole, drips, shiver lines | timer stops `04:10`, phase `OUT ✓` | callout `3 M` | S4 stop |
| 14b | 14 | 2.8 | CARD (insert) over dim WS | scale 0.9→1 + fade | Phone in a zip bag showing `911`; lit shack window icon | D3 strip hides | stamp `STEP 5`, label `GET WARM` | S4 |
| 15a | 15 | 2.4 | SIDE · CU | locked, head turn | Eli lifts his head toward the shacks | clock `16:27` | bubble `ELI!` from off-screen right | — |
| 15b | 15 | 3.0 | SIDE · EWS | whip-pan right (6 f) then drift | Shack row, red door open, light spill, brother running down the trail | — | callout `MY BROTHER` | S1 |
| 15c | 15 | 3.0 | TOP · WS | whip-zoom up, locked | Brother's red dashed path aimed straight at the hole | pill `BROTHER 60 M → 40 M` | — | — |
| 16a | 16 | 2.8 | SIDE · MS | push ×1.0→1.2, freeze at 45 % | Brother running toward camera, boots mid-stride, freeze | pill `40 M` | stamp `NEVER RUSH TO THE HOLE` (red) | S4 |
| 16b | 16 | 2.5 | TOP · CU | slow push ×1.0→1.1 | His boot print in the snow (rhymes with 1a), no crack; frame dims | — | end card `PART 2` | S1 out |

Checks: 38 shots, 1.5-3.5 s each, ECU once (1.5 s). Wide/EWS re-establish at 5, 11, 23, 30,
51, 57, 70, 85 and 97 s. No three inserts in a row. Foreground occluders (pine tips, ice chunks,
snow ridge) in 1b, 2a, 3a, 4c, 5b, 8b, 13a, 15b and 16a. Every 3 s a UI element changes; a cut
or move at least every 3.5 s.

## 7. Implementation notes for the scene-coder (do not build before GATE 1)

- New SceneIds: `lakeSide`, `lakeCut`, `lakeTop`, plus cards `ladder`, `oneTenOne`, `phone911`.
- New LightModes: `dusk`, `freeze` (blue monochrome + particle stop), `bluehour`.
- New HUD phase `ice`: pills CLOCK/TIMER, ICE, WATER, PHASE, and a thin 1-10-1 strip.
- New cast: Eli (orange-red parka `#e8572a`, knit hat with pompom as signature, ice picks on a
  cord, insulated boots) and his brother (green plaid jacket `#2f7d4f`, earflap hat). Final look
  at the channel-style gate.
- Ghost Eli = same rig, red dashed outline, 40 % opacity.
- Particles: light snow drift (three.js), ice chips; breath puffs as SVG.
- Nothing from "14 Minutes": no phone opening, no city, no basement, no crowd.
