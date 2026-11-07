# Prompt 2 — make one video end to end (paste for every new video)

```
Make one narrated vertical 2D animated video from idea to final MP4, following the
story-explainer-2d skill (and survival-short for survival topics). English only, US audience,
metric units (kilometers, meters, liters, °C).

INPUTS
- Format: [survival "what to do if…" / countdown build / from zero vs a giant / impossible ability / how it's built]
- Premise: [e.g. month-long blackout × 20th-floor apartment] — or "pick from the premise lists"
- Voice: [ElevenLabs web app — I send the MP3 / I record it / ElevenLabs API, key already in my shell]
- Length: [65-90 s] (over 60 s for TikTok Creator Rewards)

Models: run stages 1-3 on Opus 5.5 (effort high) or delegate them to the scriptwriter subagent;
build with the scene-coder subagent (Sonnet 5.5); run storyboard/render/voice split through the
render-runner subagent (Sonnet 5.5, effort low); review frames with the frame-reviewer subagent. Keep the main
context small: short reports from subagents, contact sheets instead of many stills.

Work in stages and STOP for my "ok" after stages 1, 2, 3 and 5. Keep notes in episodes/<slug>/.
The current src/shots.ts and world components are the example episode "14 Minutes": reuse the
kit, rig, camera, HUD, captions and lighting; replace the episode content and build new worlds.

1. IDEA — if no premise, score 10 disaster × place pairs (clear in 1 s? non-obvious twist?
   showable with 3-4 diagrams?) and propose 3. Write 5 hooks (≤ 12 words), pick the best.
2. SCRIPT + BEAT BOARD — five-part skeleton (or the archetype's structure), 2.4-2.7 words/s,
   named hero on a visible clock, calm tone, safe advice only. One persistent world; per phrase:
   what's on screen, camera move, UI events, sound. Every noun said appears on screen. Save
   episodes/<slug>/script.md and shotlist.md.
3. CHANNEL STYLE — only if the channel has no hero yet: hero rig + pose sheet + walk cycle, day and
   night test frames. Original characters only.
4. BUILD — new src/shots.ts and world components in src/art/. Follow the Remotion rules (frame-
   driven motion, no backdrop-filter, seeded randomness, whole-pixel plates, text ≥ 34 px).
5. STORYBOARD — npm run storyboard; review every frame yourself, fix the 5 weakest spots, show me.
   After my ok give me the narration as ONE block with a blank line between lines, for ElevenLabs.
6. VOICE + RENDER — node scripts/split-voice.mjs <my mp3>; check the worst cut is < 1.5 s off;
   npm run render (background); ffprobe; check frames at 5 narration moments; pre-publish
   checklist in notes.md; npm run phone for a < 30 MB copy.
7. DELIVER — final MP4 + phone copy, cover.png 1080×1920, thumb.jpg 1280×720, 3 titles ≤ 60
   characters, description, notes.md (what didn't work).
```
