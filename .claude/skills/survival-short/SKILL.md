---
name: survival-short
description: >-
  Write, storyboard and build faceless 2D "what if / survival" shorts (9:16, 61-120 s) in this
  Remotion project: nuclear war, bunkers, disasters, "Rule #1..." survival stories with live HUD
  counters, karaoke captions, stamps and a running joke. Use when the user asks for a new episode,
  a scenario, a script for ElevenLabs, a shot list, new scenes or art, or to fix how a video looks
  or reads. Pairs with the cinematic-director skill for shot planning and the remotion-* skills for
  implementation.
---

# Survival short

For the general craft (persistent-world camera, UI storytelling layer, lighting stack, animation
code patterns, QA) follow the `story-explainer-2d` skill; this skill adds the survival-genre rules.

A survival short is a story, not a list. Every line of narration either raises the stakes, answers
an old question while opening a new one, or pays off a joke. Every 2-3 seconds the picture changes.

## Workflow (do these in order, show the user at the two gates)

1. **Premise.** One sentence a ten-year-old gets, set somewhere bright, busy and famous in the US.
   Run the one-line test: a friend must ask "wait, then what?". See `references/story.md`.
2. **Facts.** Research 4-6 real, checkable facts (official guidance, real events, real numbers) and
   turn each into a plot beat or a "Rule #N". Keep sources in the plan. Never invent statistics.
3. **Script.** Write 230-280 words of first-person narration for ~90 s, in lines of 1-4 sentences.
   One blank line between lines (the user pastes it into ElevenLabs as one block and we split on
   pauses). Spine and pacing rules in `references/story.md`.
4. **Shot list.** For each line, 2-4 shots: size, frame content, camera move, HUD change, caption,
   stamp, SFX. Use the 2D shot grammar in `references/shots.md`; use cinematic-director's
   shot-plan fields when a shot is complex.
5. **GATE 1: user approves premise + script + shot list.**
6. **Art.** Build or reuse SVG components in `src/art/` following `references/art-bible.md`.
   Particles (snow, ash, dust, debris) go in the three.js overlay.
7. **Storyboard.** Render one still per shot (`scripts/storyboard.mjs`) into a contact sheet,
   look at every frame yourself, fix clutter / legibility / caption overlap.
8. **GATE 2: user approves the storyboard.**
9. **Voice.** User sends the ElevenLabs MP3. Split on pauses into `public/voice/line-N.mp3`,
   write durations into `src/audio.json`. Check the number of cuts equals the number of lines.
10. **Render** `npx remotion render src/index.ts Episode out/<slug>.mp4`, ffprobe it
    (1080x1920, 30 fps, >= 61 s, audio stream present).

## Hard rules

- 61 s minimum (TikTok Creator Rewards pays only above 60 s). Target 85-95 s.
- No stock music beds, no real brand logos, no copied scripts, no reused opening shot or location
  from a previous episode (originality flags; see story.md).
- Captions are word-by-word and must never cover a face or the HUD. Max 3 lines, 6 words per line.
- Every shot holds 1.5-3.5 s. A shot longer than 4 s must have a camera move or a state change.
- Never write API keys into files. ElevenLabs keys stay in the user's shell.
- Real people, real companies and real brands never appear. Real places and real public events may.
