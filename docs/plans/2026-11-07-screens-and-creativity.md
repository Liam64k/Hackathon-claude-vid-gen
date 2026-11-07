# Bigger text, more screens, more creativity: short plan

## 1. Bigger text (whole app)

- Body text 13 → 15 px, labels 12 → 14 px, small notes 11 → 13 px, toolbar steps 13 → 14 px.
- Headings up a step (screen titles 28 px). Mono figures stay mono, one size up.
- Controls grow with the text: buttons 44 px tall, inputs 48 px.

## 2. Split "New video" into screens (one job per screen)

The setup moves from one crowded panel to a short guided flow, using the same left sidebar and top steps.
Each screen has Back / Next, and you can jump back to any screen you've already done.

1. **Idea**: a big topic box, starter chips (zombie outbreak, nuclear war, blackout, flood) and a link to Spark.
2. **Look**: the five style buttons as large cards with a big looping preview beside them.
3. **Shape**: posting presets (TikTok, Shorts, YouTube…) as cards showing the real frame shape, plus Custom W×H.
4. **Story**: format (Story / What would you do? / Myth vs fact) as cards with one-line examples, and the length slider.
5. **Review**: a summary card of everything above (each part editable) → **Write 5 ideas**.

After that, Ideas → Script → Storyboard → Voice → Render work as they do now.

## 3. More creativity: a "Spark" area with three tools

- **Spark (new screen)**: the What-if dice. One roll gives a random scenario, a person, a place and a twist,
  for example "A zombie outbreak, a night-shift nurse, a subway car, the radio is lying". You can lock any
  part and roll again. **Use this** sends the result to the Idea screen. No Claude calls.
- **Inspiration boards (upgrade)**: bigger fragment cards you can drag to reorder. Each fragment can be
  pinned as a must-use item. Adds a **Remix** button that weaves the same fragments again with a new angle.
- **Hook lab (inside Ideas)**: for the idea you pick, Claude gives 3 alternative opening lines and you choose one.
  It is one small Sonnet call, and Replay mode has a recorded answer.

## 4. Build and check

- UI work on Sonnet 5.5 subagents; Spark word lists written by Opus 5.5 (safe, no gore or how-to).
- Screenshots at 1440, 1280, 1000 and 390 px; `npm test`; then push to main and restart Studio.
