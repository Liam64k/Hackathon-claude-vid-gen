# Studio: bigger text, guided screens, more creativity, own script, frame + timecode editing

> Built with superpowers: subagent-driven-development (one Sonnet 5.5 subagent per task, high effort for
> building; Opus 5.5 only for writing the Spark word lists), test-driven-development for server/timing
> code, verification-before-completion before each commit. Copy of this plan saved to
> `docs/plans/2026-11-07-creative-studio.md` at the start of the build.

## Context

At the moment the New video setup is squeezed into one screen with small 11–13 px text. Claude writes every script and you can't
change the storyboard frames or the timing. You asked for bigger text and more than one screen. You also asked for more creative tools, a choice to have
the script generated or to write it yourself, and the ability to edit frames and type your own timecodes.

What exists today (reuse):
- The script lines are `episodes/<slug>/lines.json` (`[{text, highlight[]}]`). Editing them inline already works in
  `scriptView()` (`app/ui/app.js:612`) via `POST /api/projects/:slug/lines` → `script.saveLines()`
  (`app/stages/script.mjs:~97`). Lines are checked by `validateLines` and `safetyIssues` (`app/lib/validate.mjs`).
- The shots live as TypeScript in `build/shots.ts` (copied into `src/shots.ts` by `app/lib/workspace.mjs`). `validateShots`
  checks them, and `storyboard()` (`app/lib/remotion-tasks.mjs:49`) renders `storyboard/shot-NN.png`.
- Timing is set in `src/timeline.ts`. A line lasts its voice clip length (`audio.json.voice[i]`) plus a 0.3 s gap, and its
  shots split that by `weight`. Nothing can override this today.

## Tasks (in order; each ends with tests + screenshots + a commit)

### 1. Bigger text and room to breathe (`app/ui/styles.css`)
- The type scale becomes 13 / 14 / 15 / 17 / 22 / 28 px. Body text goes 13→15, labels 12→14, small notes 11→13, step tabs 14.
- Buttons become 44 px tall and inputs 48 px. Spacing stays on the 4 px scale.

### 2. New video becomes a guided flow of five screens (`app/ui/app.js`, `styles.css`)
- The routes are `#/new/idea`, `#/new/look`, `#/new/shape`, `#/new/story` and `#/new/review`. The left rail shows the five steps, and each
  screen has Back / Next.
  1. **Idea:** a big text box saying "Write your idea", plus starter chips (zombie outbreak, nuclear war, blackout, flood) and an
     "Open Spark" link. Two clear choices sit at the bottom: **Generate script with Claude** and **Write it myself**.
  2. **Look:** the five style cards at full size, next to the large looping preview.
  3. **Shape:** the presets as cards that show the real frame shape, plus Custom W×H.
  4. **Story:** the format cards with a one-line example each, plus the length slider.
  5. **Review:** a summary where every item is editable, then the button chosen on screen 1.
- The `S.ui` setup state stays the same, so nothing on the server changes for this task.

### 3. Write it myself: your own script (server + UI)
- The project choices become `entry: "generate" | "own"` on `POST /api/projects` (`app/server.mjs`, `app/lib/store.mjs`).
  - **generate:** keeps today's flow.
  - **own:** writes `ideas.json` with one idea built from your text. It marks Ideas approved with pick 0, writes an empty
    `lines.json` plus simple `script.md` / `shotlist.md` from a template, and puts Script in `review`. Claude makes no call.
- `saveLines` already takes the whole array, so add / delete / move / split work in the same endpoint.
- The script editor gets **Add line**, **Split here**, delete, move up/down, a live word count against the length target, and
  red/green/purple word chips. It is also used after "Generate", so you can rewrite Claude's draft.
- Tests (TDD): an own-entry project starts at Script/review. Saving a 12-line array works, and unsafe text is refused.

### 4. Edit frames (storyboard)
- New file `src/edits.ts` reads `src/edits.json` (null = no edits). It holds an ordered list
  `shots: [{ base, line?, scene?, zoom?, text?, sec? }]`, where `base` is the index of a shot from `shots.ts`.
  `SHOTS` becomes `applyEdits(RAW, EDITS)`.
  - Changing a field overrides it.
  - Duplicating adds a second entry with the same `base`.
  - Deleting removes the entry.
  - Reordering moves it, and shots are kept in line order.
- `workspace.mjs` checks `build/edits.json` in and out the same way it does for `shots.ts`.
- The new endpoint is `POST /api/projects/:slug/shots/edits`. It validates the edits with `validateShots` (on the result) and
  `safetyIssues` (on text), saves them, then re-renders the stills with `storyboard()` in the background and reports progress on the event bus.
- In the Storyboard screen, clicking a frame opens it large with an editor beside it:
  - scene (from `app/pack-catalog.json`)
  - camera (wide / medium / close, which sets `zoom`)
  - on-screen text (a stamp event)
  - which line it belongs to
  - duplicate / delete / move left-right
  - **Update frames** re-renders the stills.
- Tests: for `applyEdits` (duplicate, delete, override, ordering) and for the endpoint refusing a bad scene.

### 5. Your own timecodes
- `src/timeline.ts`: a shot with `sec` gets that exact length, and the line's other shots share what is left by `weight`.
  `edits.json` also takes `lines: { [i]: { sec } }` to set a whole line's length. Voice length is still the default.
- `app/lib/timing.mjs` is a JS mirror of that same math. The UI uses it to show start–end for every line and shot, and a test checks
  that it matches `timeline.ts` on the example episode.
- A **Timing** tab sits on Storyboard and Voice. It is a table of lines and shots with start / end you can type (`0:04.2`).
  It has a total-length bar and a warning when a line is set shorter than its voice clip (the voice would be cut off).
  Saving goes through the same edits endpoint.
- Tests: timing with no edits stays identical to today, and `sec` overrides add up to the typed timecodes.

### 6. Spark screen (`#/spark`, no Claude calls)
- What-if dice roll a **scenario + person + place + twist** (about 20 safe options each, written by an Opus 5.5 subagent and
  stored in `app/ui/spark-words.js`). You can lock any part and roll again, and keep a "Kept sparks" list.
- **Use this idea** fills the Idea screen.

### 7. Inspiration boards upgrade (`app/lib/boards.mjs`, `app/stages/weave.mjs`, UI)
- **Must use** pin on fragments, so the weave prompt has to use the pinned ones. **Remix** weaves the same fragments again
  with a new angle (sends `angle`). Bigger fragment cards.
- Tests: the pin is saved, and remix sends a different angle. Replay mode returns its recorded result.

### 8. Hook lab (Ideas + Script screens)
- **Try 3 hooks** on the picked idea or on line 1 makes one small Claude call (Sonnet 5.5, low effort, `--json-schema`, budget 0.10 USD).
  Choosing a hook replaces line 1. Replay mode has a recorded answer.

## Verify (end to end)
- `npm test` (only the known "files … Range suffixes" failure allowed) and `npm run typecheck`.
- In replay mode at 1440, 1280, 1000 and 390 px:
  1. Walk the five New video screens, then **Write it myself**: write 8 lines, approve, run Storyboard.
  2. Change a frame's scene and text, duplicate one, then **Update frames** and check the new still.
  3. Set a line to 6.0 s in Timing, then check the start–end values and the rendered storyboard timing.
  4. Spark: roll, lock, roll again, then use it.
  5. Board: pin a fragment, then remix.
- After each task: commit. At the end: push to main and restart the live Studio on 4317.

## Not in this build
- Drawing new art per frame (frames reuse the Winter Lake scenes) and dragging on a visual timeline (Timing is a table).
