---
name: story-explainer-2d
description: >-
  Make narrated 2D story-explainer videos for TikTok / Shorts / YouTube in code (Remotion + React +
  SVG, three.js for particles/3D accents): "what if" scenarios, build-it-from-zero series, survival
  and resource stories, superpower premises, business sagas. Covers concept and hook writing,
  persistent-world scene planning, camera-as-editor transitions, flat-illustration art direction,
  the UI layer that carries the story (counters, callouts, cards, thought/speech bubbles, karaoke
  captions), animation patterns, project structure, voice alignment, rendering and QA. Use whenever
  the user wants a new animated video, episode, series, scenario, script, storyboard, scene, visual
  upgrade or review of such a video in this project.
---

# Story explainer 2D

These videos win on three things working together, in this order:

1. **A premise the viewer can't stop thinking about** ("6 months until nuclear war — you have a
   bunker and a budget", "you can hear everyone's thoughts and can't switch it off", "a car wash
   from zero vs a chain across the street").
2. **Numbers and labels that keep changing on screen.** The UI layer tells half the story: a
   countdown, a budget with deltas, a checklist that gets ticked, a meter, callouts naming things.
   Something new appears every 2-3 s even when the camera barely moves.
3. **One living world the camera travels through.** Few hard cuts; the camera drifts, pushes,
   whips and zooms through a single persistent set that visibly changes (gets built, gets darker,
   gets crowded) as the story advances.

The art itself is simple (flat shapes, round-headed characters). Quality comes from lighting,
depth, motion and the information design, not from drawing detail. Never chase realism; chase
clarity, glow and constant change.

## Workflow (follow in order; two approval gates)

1. **Concept** — pick an archetype and write the premise + stakes + measurable resource.
   `references/concepts-and-hooks.md`. For "what to do if…" survival videos use
   `references/survival-format.md` (five-part skeleton, disaster × place generator from
   `references/premise-lists.md`, hook formulas, safety rules); propose the best 3 pairs.
2. **Research** — 4-8 true facts, numbers, real cases (a 1962 cave experiment, a statute, a
   price) that become reveals. Keep sources in the plan; never invent statistics.
3. **Script** — first-person or second-person narration, 300-450 words for 2-3 min (long-form
   series) or 220-280 words for ~90 s. Write it as beats with an open loop every 10-15 s.
4. **World + beat board** — design the persistent world(s), list every beat with: narration
   line, camera move, UI events (counter deltas, callouts, cards, stamps), SFX.
   `references/scene-planning.md`
   Characters and place per episode: `references/cast-and-theme.md`.
5. **GATE 1** — show the user premise, script and beat board. Wait for approval.
6. **Build** — art per `references/visual-style.md`, motion per `references/animation.md`, code
   layout per `references/project-structure.md`. Reuse components in `src/art`, `src/overlay`.
   Look / visual style: see references/styles.md (read only the chosen look's section).
7. **Storyboard** — `npm run storyboard` (one frame per shot into `out/storyboard.png`). Look at
   every frame yourself and fix it before showing anyone. `references/qa.md`
8. **GATE 2** — user approves the storyboard. Then give them the narration as ONE block with a
   blank line between beats for ElevenLabs.
9. **Voice** — split their MP3 at pauses (DP alignment, see project-structure.md), write
   `src/audio.json`, re-render the storyboard if timing shifted a lot.
10. **Render + QA** — 720p draft + 1 fps contact sheet, fix the 5 weakest spots, final render,
    ffprobe, spot-check frames against narration, compress a <30 MB copy for phones.
11. **Deliver** — MP4, cover + thumbnail, 3 titles, description, notes.md.
    `references/audio-and-delivery.md` (voice processing, loudness, music, cover, titles,
    platform and monetisation rules).

## Non-negotiables

- **English only.** All narration, captions, on-screen text, titles and prompts are in English for a US audience (dollars, US places; metric units: kilometers, meters, kilograms, liters, °C). Never produce Russian or other-language versions.

- 9:16 1080x1920 by default (16:9 only for YouTube long-form). Safe zones: top 14 % HUD, bottom
  20 % platform UI, captions at 60-68 % height in a clear band (56-74 %).
- At least one UI element changes every 3 s. At least one camera move or cut every 6 s.
- Every number the narrator says appears on screen at the moment it is said.
- Narration words appear as karaoke captions: whole phrase visible, spoken word bright, upcoming
  words grey, key words coloured.
- Never more than 2 text blocks competing at once (caption + one card/callout/bubble).
- Original premise, script, world and shots every episode. No real brands/logos, no real private
  people, no copied scripts, no stock music beds.
- Over 60 s if the target is TikTok Creator Rewards. Series episodes end on a cliffhanger.
- Keys (ElevenLabs etc.) stay in the user's shell, never in files.
- Safe advice only: no chemistry, weapons, medicines/doses or live electricity; no gore. Calm
  instructor tone, never fear for its own sake.
- Every noun the narrator says is on screen within ±0.3 s. ≥ 3 explanatory diagrams per video.
- All on-screen text is code (never baked into images); min 34 px; max one coloured caption word.
- Remotion rules in `references/animation.md` §0 (no backdrop-filter, no CSS animation, seeded
  randomness, whole-pixel plates).

## When something looks bad

Read `references/qa.md` "Symptoms → fixes" first. Most "it looks cheap" problems are: flat
lighting (add bottom gradient, glow, vignette), static camera (add drift), dead UI (add deltas
and callouts), or text clutter (one message at a time).
