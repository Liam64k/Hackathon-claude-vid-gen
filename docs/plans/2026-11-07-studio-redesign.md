# Studio redesign: build plan

Approved design: https://claude.ai/artifact/9NSVhLMYm5LKCzqXvZ5u5q (New video workspace, Inspiration,
style button states). Product context: `PRODUCT.md`.

**Goal:** ship the one-window workspace (sidebar, steps toolbar, live preview, settings panel), the style
picker, the posting-format picker and the Inspiration page, and open topics beyond winter survival
(nuclear war, zombie outbreak, disasters) while keeping the safety rules.

**Honest limits, said up front**

- Only the Winter Lake art pack can draw scenes. Other looks (Cartoon, Paper, Comic, Chalk) and other
  topics change the writing, captions, colors and fonts, but the scenes stay the Winter Lake drawings
  until new art packs exist. The UI says "Art pack coming" for those looks.
- The art is drawn for 9:16. Other shapes render as the 9:16 scene centered on a blurred, filled
  background (pillarbox) in v1. True landscape framing is a later art task (step 9).

**Agents and models (CLAUDE.md):** UI and server building run on Sonnet 5.5 (scene-coder style work, high
effort). The style notes in the skill (step 7) are writing, so Opus 5.5. Review on Sonnet.

---

## Step 1. Data model: style, format, scenario

Files: `app/lib/store.mjs`, `app/server.mjs`, `app/test/validate.test.mjs`

- `STYLES = { flat, cartoon, paper, comic, chalk }` with `{ name, ready }` (only `flat` ready).
- `FORMATS_OUT` presets: tiktok, shorts, reels (1080×1920), youtube (1920×1080), feed (1080×1350),
  square (1080×1080); ratios 9:16, 16:9, 16:10, 1:1, 4:5; custom W×H clamped to 480-3840, even numbers.
- `createProject` stores `style`, `output: { preset|ratio, width, height }`. Old projects default to
  `flat` + TikTok.
- Tests: clamping, unknown style falls back to `flat`, custom sizes rounded to even.

## Step 2. Open topics beyond winter, keep safety

Files: `app/stages/prompts.mjs`, `app/stages/ideas.mjs`, `app/lib/validate.mjs`, tests

- `PACK_BRIEF` becomes topic-neutral: survival and disaster scenarios (nuclear war / fallout shelter,
  zombie outbreak as fiction, blackout, flood, wildfire, winter). Scenes still come from the Winter Lake
  pack, so prompts tell Claude to reuse its views and HUD as story devices.
- Safety: allow scenario phrases like "nuclear war", "nuclear bomb goes off", "fallout", "zombies" as
  topics; still block how-to explosives, weapons, chemistry, doses, gore. Add tests for both sides
  ("what to do if a nuclear bomb goes off" passes, "how to build a bomb" fails, "zombie gore" fails).
- `ANGLES` gains bunker, fallout-shelter, outbreak and blackout angles.

## Step 3. Style notes for Claude (short, not overwhelming)

Files: `.claude/skills/story-explainer-2d/references/styles.md` (new, about 60 lines), one line in
`SKILL.md` pointing to it, `app/stages/script.mjs` + `shots.mjs` prompts name the chosen style's section.

- One short section per look: palette, line, motion, caption font, what stamps/cards look like, one
  "avoid". The script and storyboard stages read only the chosen style's section.

## Step 4. App shell: one window

Files: `app/ui/index.html`, `app/ui/styles.css`, `app/ui/app.js`

- Layout: 56 px toolbar (logo, six-step stepper, usage, Claude status), inset sidebar 220 px (New video,
  Inspiration, Library, Recent), center stage, right settings panel 340 px with a pinned action footer.
  Fits 1280×800 without page scroll; panels scroll inside.
- Light, soft-violet tokens from the canvas (`#f3f2fa` ground, `#5a4fd6` primary, `#1f1b24` ink),
  system font, Geist Mono for figures. Replace the current dark theme.
- Activity feed moves into a collapsible drawer in the stage (toolbar toggle), so it no longer eats a
  column.
- Under 900 px: sidebar becomes a top tab row, settings panel becomes a bottom sheet.

## Step 5. New video screen

Files: `app/ui/app.js` (home view), `app/ui/styles.css`

- Topic field on top of the stage, live preview frame in the middle, summary line under it.
- Settings panel: Look (5 style buttons in their own design; hover/focus previews in the big frame,
  reduced motion shows a still), Posting to (6 presets) + Shape segmented control + Custom W×H
  revealed only for Custom, Length slider 20-180 s.
- Footer: Write 5 ideas, Surprise me, From fragments.
- Preview scenes are small inline SVGs per style (no image files).

## Step 6. Stage screens in the new shell

Files: `app/ui/app.js`, `app/ui/styles.css`

- Ideas, Script, Storyboard, Voice, Render keep their logic; they move into the stage area and use the
  settings panel for the step's actions (approve, redo, voice pick, downloads). The stepper shows
  done / current / locked.

## Step 7. Inspiration page

Files: `app/ui/app.js`, `app/server.mjs`, `app/stages/weave.mjs` (new), `app/lib/store.mjs`, tests

- Boards stored in `episodes/_boards/<id>.json` (`{ title, fragments: [{ kind, text }] }`).
- API: list/create boards, add/remove fragment, `POST /api/boards/:id/weave`.
- Weave = one small Claude run (Sonnet, low effort, `--json-schema`, budget 0.3 USD) returning
  `{ title, logline, beats: [{ part, text, uses: [n] }] }`. Safety check on fragments and output.
- "Make this video" creates a project with the woven story as the topic, skips nothing (Ideas still
  runs, seeded with the story).
- Replay mode: weave returns a recorded result and says Replay.

## Step 8. Render to the chosen size

Files: `src/Root.tsx`, `src/format.json` (new, written by the app), `app/stages/render.mjs`,
`app/lib/remotion-tasks.mjs`

- Root reads width/height from `src/format.json` (default 1080×1920).
- Non-9:16: wrap `Episode` in a frame component that draws the 9:16 scene centered on a blurred copy
  (pillarbox / letterbox). Captions and HUD stay inside the 9:16 area.
- Phone copy and cover follow the chosen size. Typecheck + a 2-second test render at 16:9.

## Step 9. Later (not in this build)

- True landscape framing for the Winter Lake art (camera and safe areas per ratio).
- Art packs for Cartoon, Paper, Comic, Chalk, and new worlds (bunker, city).

## Verify (each step)

- `npm test` and `npm run typecheck` green; new tests per step.
- Replay demo screenshots at 1440×900, 1280×800 and 390 px phone
  (`node app/scripts/screenshots.mjs`), checked against the canvas.
- One live run: zombie-outbreak topic, Comic look, YouTube 16:9, 60 s, through to render.
