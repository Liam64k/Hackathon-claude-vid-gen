# Review, debug, improve

## Storyboard review (do this yourself before showing the user)

Render `npm run storyboard`, open `out/storyboard.png`, then check each frame:

- [ ] Is the subject obvious in 1 second? (one focal point, brightest/most saturated)
- [ ] Is any caption covering a face, a key number or the HUD?
- [ ] More than 2 text blocks at once? Remove or delay one.
- [ ] Is the frame mostly empty or mostly black without intent? Move the camera or add world.
- [ ] Do consecutive frames differ in scale or location? (no near-duplicates in a row)
- [ ] Does every number the narration says appear on screen?
- [ ] Is the HUD state plausible (counter direction, deltas add up)?
- [ ] Bottom 30 % dark enough for captions? Top 14 % clear for HUD?
- [ ] Are characters cut by the frame edge at the neck/ankles? Re-frame.

Then render 2-4 single frames at full size around tricky moments (`npx remotion still … --frame=N`)
and look at them at 100 %.

## Pre-publish checklist (tick each in `notes.md`)

- [ ] No black, empty or meaningless blurry frames — especially at scene joins.
- [ ] Frame by frame: nothing flickers or jitters (usually plate borders over blur or CSS anims).
- [ ] No objects passing through each other (plate through laptop, roof through wall, paw
      through table).
- [ ] Nothing cut off by the frame edge unless intended (cards, plates, a dog at the edge).
- [ ] No plate, arrow or card enters the caption band (56-74 % height).
- [ ] Plate text centred; all text ≥ 34 px.
- [ ] Captions in sync, never overlapping, max one coloured word.
- [ ] Every noun said appears on screen on time ("the dog" → dog in frame; "map" → map that second).
- [ ] Hero (and companion) alive in every scene: breathing, blinking; walking without foot sliding.
- [ ] ~75 % 2D, ≤ 25 % 3D.
- [ ] Ranges appear whole, not rolling through random values.
- [ ] Voice −14 LUFS, true peak ≤ −1 dBTP, music doesn't fight the voice.
- [ ] No text baked into images; all text is code.
- [ ] Advice is safe; doubtful points flagged in notes.
- [ ] Draft at 720p + contact sheet at 1 frame/second; find and fix the 5 weakest spots yourself
      before showing the user.

## Final video checks

- `npx remotion ffprobe out/x.mp4`: 1080×1920 (or 1920×1080), 30 fps, audio stream present,
  duration > 60 s when monetising.
- Extract 4-6 frames at known narration moments and confirm the picture matches the words.
- Listen points you can't hear: tell the user exactly which timestamps to check.

## Symptoms → fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Looks cheap / "PowerPoint" | No lighting stack | Add bottom gradient, vignette, glow on emitters, grain, atmospheric tint |
| Feels slow | Static holds > 3 s with no UI event | Add drift + a callout/delta/tick every 2-3 s |
| Feels chaotic | Too many simultaneous elements, cuts every second | One message at a time; replace cuts with drifts and one whip per 5-8 s |
| Viewer lost in the world | No wides | Return to an EWS every 20-30 s; add location tags |
| Text unreadable | Small/thin text, busy background | ≥ 28 px UI at 1080 width, dark pill behind, bottom gradient |
| Characters look stiff | No idle | Blink, breathe, mouth flap on lines, eyebrow changes |
| Numbers feel fake | Instant jumps, round numbers only | Roll counters; use exact-looking numbers ($1,472,000 → $981,860) with reasons |
| Jitter on render | Non-deterministic code | Remove Math.random/Date; seed everything; pure functions of frame |
| All storyboard frames identical | `<Freeze>` frame beyond composition length | Storyboard composition duration = TOTAL_FRAMES |
| Blank three.js layer | Canvas not transparent or GL backend | `gl={{ alpha: true }}`, `Config.setChromiumOpenGlRenderer("angle")` |
| Hair/skin peeking out | Shape layering order | Draw back hair → body → head → face → front hair (scaled 1.1) → hands-over-face last |
| Voice cut in wrong place | Paragraph pauses too short | Check DP cut vs expected; ask user to regenerate with longer pauses |

## Common mistakes to avoid

- Copying a reference scene by scene. Extract the technique, invent the world and story.
- Starting with the art before the premise and beat board are approved.
- Writing narration that describes what is on screen instead of adding information.
- Using more than one caption style or more than 5 accent colours.
- Long single sentences in captions (> 2 lines).
- Real brands, logos or recognisable private people.
- Forgetting the cliffhanger and the series tag in serial content.
- Delivering a file > 30 MB to a phone-only user (make the compressed copy).
