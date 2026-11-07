# Scene planning: one world, camera as editor

## Measured pacing of strong reference videos

- Hard cuts are rare: one every 4.5-7.5 s on median, some single shots last 20-30 s.
- But the frame is almost never still: ~70-90 % of frames have camera or element motion.
- Fast "whip" transitions (motion-blurred zoom/pan, 6-12 frames) replace most cuts.
- New information arrives every 2-3 s through the UI layer, not through cuts.

So: plan **locations as one big world** and plan **camera paths through it**, not a list of
unrelated shots.

## 1. Design the persistent world

Draw each location as one large canvas the camera can travel across:

- **Cross-section world** (bunkers, houses, mines, pipes): sky band → surface with house/trees/
  fence → soil layers (getting darker with depth, speckled stones) → rooms as lit rectangles.
  Width 2-3x the frame, height 2-4x. Rooms are added over time ("planned" as dashed blue
  blueprint outlines, then "built" as lit rooms).
- **Street/lot world** (business stories): one long street side-view with the hero's place and
  the rival opposite, sky with drifting clouds, parked cars, crowd that changes with the plot.
- **Interior chain** (character stories): bus → office → street → café → courtyard, each a
  side-view set with foreground objects, joined by a short whip or match cut.

The world must change state over the story (time of day, built modules, damage, crowd density,
signs, prices). Keep the state in data (see project-structure.md) so any frame can be rendered.

## 2. Beat board (the plan you show the user)

One row per narration beat (1-3 sentences):

| # | Narration | World state | Camera (from → to, move) | UI events (at %) | SFX |
|---|---|---|---|---|---|
| 01 | "In six months — nuclear war." | dusk, cloud glow | EWS push-in 1.0→1.15 | title card 0 %, counters fade in 80 % | low boom |
| 02 | "Your bunker is full — and the neighbour saw everything." | bunker lit | whip-zoom into bunker, then drift right | stamp `BUNKER FULL ✓` 30 %, callout `NEIGHBOUR` 70 % | whoosh, tick |

Rules:
- Each beat has exactly one primary camera action and 1-3 UI events.
- Alternate scale: wide (show the whole world) → medium (a room/person) → insert (a document,
  a glass of water, a phone) → wide again. Never three inserts in a row.
- Every 20-30 s return to a wide that shows the whole world so viewers see progress.

## 3. Camera vocabulary (2D)

| Move | Use | Typical numbers |
|---|---|---|
| Drift | Keep life in holds | 10-30 px/s pan + zoom ×1.00→1.04 over the beat |
| Push-in | Tension, focus, realisation | ×1.15-1.4 over 2-4 s, ease-in-out |
| Pull-out reveal | Show the result / scale | ×0.6-0.8 over 2-3 s, ease-out |
| Truck (side track) | Walking, crowds, interiors | constant x speed; foreground moves 1.4x |
| Whip-zoom | Change location inside the world | 8-12 frames, zoom + translate, directional blur 30-60 px |
| Whip-pan | Change set | 6-8 frames horizontal, blur, land with 2-frame overshoot |
| Rack/defocus | Shift attention between depth layers | blur 0↔8 px over 10 frames |
| Insert (PiP card) | Close-up of an object or memory | card scales from 0.9→1 + fade, background dims to 50 % |
| Shake | Impacts, bad news | amplitude 6-40 px, exponential decay 0.3-0.5 s |

## 4. Transition toolbox (timing)

- **Whip-zoom with light flash**: overexpose to white-ish 20-40 % for 3-4 frames at the fastest
  point; hides the jump between parts of the world.
- **Match cut**: shape to shape (glass → bubbles → bokeh, window → reflection).
- **Dip through dark**: night/time skip, 8-12 frames, with a time label ("THREE MONTHS LATER").
- **Card wipe**: a document fills the frame, slides away to reveal the new location.
- **Hard cut on a word**: cut exactly on the stressed word of the narration.

## 5. Time compression

When days/months pass, show it in three layers at once: the counter rolls, the sky/light changes,
and a dated label pops ("DAY 3", "AFTER 3 MONTHS"). Never just cut.
