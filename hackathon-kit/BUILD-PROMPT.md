# Studio: product build prompt (everything in one file)

## How to use

1. Unzip `studio-kit.zip`. The folder is the whole studio: skills in `.claude/skills/`, agents in
   `.claude/agents/`, the Remotion project in `src/`, the finished example episode "Ten Minutes Under"
   in `episodes/ten-minutes-under/`, and cached renders in `out/` for replay mode.
2. `cd` into it and run `npm ci --ignore-scripts` then `npx remotion browser ensure` once.
3. Open Claude Code **in that folder**. Model: **Sonnet 5.5, effort high**, new session.
4. Paste everything under "THE PROMPT". Do not add skills; the existing ones are enough.

---

# THE PROMPT

You are a senior full-stack engineer and product designer. Build **Studio**: a local app that turns
a topic into a finished, narrated vertical 2D video. This is the **product itself**, not a marketing
website. It runs on the user's machine, opens in the browser from one command, and uses the user's
**own Claude Code** (already installed and signed in) as its AI, ElevenLabs for the voice, and Remotion
for the render. It is a non-commercial hackathon project; judges will run it or watch it live.

## 1. Product definition

The user never sees a terminal prompt, a skill file or a setting. Their whole journey:

1. Run `npm start`; the browser opens Studio.
2. **Connect Claude** with one click (Anthropic's own sign-in opens if needed).
3. Type a topic or press **Surprise me**; pick a format and length.
4. Studio shows 5 ideas, then a script, then a storyboard. The user approves each with one click.
5. Studio generates the voice with ElevenLabs (the app calls the API) and matches the video to it.
6. Studio renders. The user gets the MP4, a phone copy, a cover and 3 titles.

Everything that makes the video good (skills, prompts, rules, the cast and world kit, the model
routing) is built in and invisible. The user only decides and approves.

**Non-goals (do not build):** a landing or marketing site, installers, hosting, accounts or login of
our own, payments, Windows support, new world art or characters, a chat box for free prompting.

## 2. Definition of done

- [ ] `npm start` opens a polished UI; the Claude pill turns green for a signed-in user.
- [ ] A user can go from a topic to a finished MP4 without touching a terminal, in live mode, on the
      Winter Lake pack (section 6).
- [ ] `npm run demo` (replay mode) completes the whole flow with zero Claude calls and shows the
      cached "Ten Minutes Under" outputs, clearly labelled **Replay**.
- [ ] `npm run doctor` gives a clear pass/fail table with the fix for each failure.
- [ ] All guardrails in section 3 are enforced in code and covered by tests.
- [ ] README lets a stranger run it in 5 minutes; every screen has been screenshotted and reviewed.

**The 3-minute judge demo it must support:** open Studio (connected pill) → Surprise me → five idea
cards stream in → approve script → storyboard appears → generate voice → render progress → play the
MP4. In replay mode the same path takes under 2 minutes with realistic timing.

## 3. Legal and safety guardrails (hard rules, enforce in code, test them)

1. The AI is the user's own `claude` program run locally. Never read, copy, log, store or forward
   Claude credentials or tokens. Never call `claude setup-token`, never use `CLAUDE_CODE_OAUTH_TOKEN`,
   never open `~/.claude/.credentials.json` or the keychain.
2. Connecting means Anthropic's own flow: check `claude auth status`; if signed out, run
   `claude auth login` and let the user finish in the browser window it opens.
3. Never use `--bare` (it ignores the subscription login). Never modify the `claude` binary.
4. Remove `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` and `CLAUDE_CODE_OAUTH_TOKEN` from the child
   environment so the subscription login is the credential in use; doctor warns if any is set.
5. The server binds to `127.0.0.1` only and requires a private random token (printed and opened in the
   URL, like Sellbird's dashboard). Never expose it to the network or host it on one person's login.
6. No secrets in files. `ELEVENLABS_API_KEY` comes from the environment, or is typed in the UI and kept
   in memory only. Add `.env*` to `.gitignore`.
7. Survival topics: safe, widely known advice only (no chemistry, weapons, medicine doses, live
   electricity), no gore, calm tone. English, US audience, metric units.
8. README states: local and non-commercial; bring your own Claude Code login and ElevenLabs key;
   ElevenLabs' free plan is non-commercial and published videos must credit "elevenlabs.io" in the
   title; not affiliated with Anthropic or ElevenLabs. Do not use their names or logos as the product name.
9. Before installing any new package, read it and report risks; install with `--ignore-scripts`.

## 4. Read first (all on disk, read in this order; open references only when needed)

1. `CLAUDE.md`, `START-HERE.md`, `docs/models-and-tokens.md`, `docs/example-episode.md`.
2. Skills: `.claude/skills/story-explainer-2d/` and `survival-short/` (the creative rules, stage 1-3
   prompts), `cinematic-director/` (shot planning), `remotion-best-practices/`, `remotion-render/`,
   `remotion-studio/`, `remotion-captions/`, `elevenlabs-text-to-speech/` (voice stage),
   `elevenlabs-sound-effects/` (optional). The `threejs-*` skills only if you touch particles.
3. Agents: `.claude/agents/*.md`.
4. The finished example, your contract reference: `episodes/ten-minutes-under/` (`script.md`,
   `shotlist.md`, `notes.md`, `style.md`, `build-notes.md`), `src/audio.json`, `public/voice/line-*.mp3`,
   and renders `out/episode-phone.mp4`, `out/storyboard.png`, `out/style/cast-sheet.png`.
5. Code you drive but must not rewrite: `src/shots.ts`, `src/types.ts`, `src/timeline.ts`,
   `src/Episode.tsx`, `src/art/*`, `src/overlay/*`, `scripts/*`, `package.json`.

## 5. Architecture

```
Browser UI  (vanilla ES modules, no build step, no framework)
   | HTTP + Server-Sent Events, 127.0.0.1, token
Node server  app/server.mjs   (Node 20+, built-in http, zero dependencies)
   |- engine    app/engine/claude.mjs     spawn `claude -p` per stage, parse stream-json
   |- replay    app/engine/replay.mjs     recorded events + cached artifacts (STUDIO_MODE=replay)
   |- stages    app/stages/{ideas,script,shots,voice,render,extras}.mjs
   |- doctor    app/doctor.mjs            environment checks (npm run doctor)
   '- state     episodes/<slug>/state.json   status, approvals, session ids, cost per stage
cwd of every claude run = the studio folder, so CLAUDE.md, skills and agents load automatically
```

The only new dependency is `@elevenlabs/elevenlabs-js` (the ElevenLabs skill says use `@elevenlabs/*`
packages only). `package.json` scripts: `start`/`app` -> `node app/server.mjs`, `doctor`,
`demo` -> `STUDIO_MODE=replay node app/server.mjs`, `test` -> `node --test app/`.

### Engine contract (`app/engine/claude.mjs`)

```
claude -p --output-format stream-json --verbose --include-partial-messages
       --model <opus|sonnet> --permission-mode acceptEdits --permission-prompts none
       --allowedTools "<per stage>" --max-budget-usd <per stage> --append-system-prompt "<stage rules>"
```

- Prompt on **stdin**. `cwd` = studio root. One job at a time; cancel with SIGINT; pause button; a daily
  usage meter from reported cost; resume a stage session with `--resume <session_id>` for "revise".
- In `-p` mode anything not in `--allowedTools` is denied, so list exactly what each stage needs, for
  example `Read,Write,Edit,Bash(npm run typecheck),Bash(npm run storyboard)`. Surface
  `permission_denials` from the final result as a clear error, never a silent hang.
- **Capture a real sample first:** `claude -p "say hi" --output-format stream-json --verbose >
  app/fixtures/sample.ndjson`. Write the parser against it, keep it as a test fixture, never guess field
  names. Map events to UI activity ("Reading skills", "Editing src/shots.ts", "Running typecheck"),
  and the final `result` to cost, session id, duration and errors.
- Because the studio `CLAUDE.md` says "stop for approval", every stage prompt must start: "The app
  handles approvals. Do only this stage, write the files named, then stop."
- Provider interface `{ run(stage, prompt, opts) -> async events }` with `claude-cli` (default) and
  `replay`; an `anthropic-api-key` provider is documented as a stub, not built.
- Friendly errors for: not installed, signed out, rate limit or quota, budget hit, tool denied, timeout.

## 6. The six stages (stage prompts come from the skills; inject the user's choices)

| # | Stage | Runs | Model, tools | Output in `episodes/<slug>/` | Gate |
|---|---|---|---|---|---|
| 0 | Connect | server | none | doctor report | green pill |
| 1 | Ideas | Claude | opus, `Read,Write`, `--json-schema` | `ideas.json`: 5 ideas with title, hook, twist, world, diagrams, fact, risk, score | pick one |
| 2 | Script + beat board | Claude | opus, `Read,Write` | `script.md`, `lines.json` `[{text, highlight[]}]`, `shotlist.md` | approve or edit |
| 3 | Shots + storyboard | Claude | sonnet, `Read,Write,Edit,Bash(npm run typecheck),Bash(npm run storyboard)` | edited `src/shots.ts`, `out/storyboard.png` | approve |
| 4 | Voice | server | ElevenLabs API | `public/voice/line-N.mp3`, `src/audio.json` | listen, accept |
| 5 | Render | server + Claude (titles) | Remotion; sonnet no tools | `out/episode.mp4`, `episode-phone.mp4`, `cover.png`, `titles.json` | download |

- **The Winter Lake pack (MVP scope).** Stage 3 may only edit `src/shots.ts` data using what the kit
  supports: scenes `lakeSide/lakeCut/lakeTop/lakePrint/black`, figures Eli and brother, their poses,
  light modes, event kinds and the diagrams in `src/art/Diagrams.tsx`. First generate
  `app/pack-catalog.json` by reading `src/types.ts`, `src/shots.ts` and the art files, and inject it into
  the stage-3 prompt. Topics are therefore winter and cold-water survival. Say this in the UI as
  "Pack: Winter Lake"; other packs are future work. Do not draw new worlds.
- Stage 1-2 follow `story-explainer-2d` and `survival-short`: premise formula, hook formulas, five-part
  skeleton, 2.4-2.7 words/s, 230-280 words, one blank line between lines, numbers spelled out.
  No web research by default (speed); facts are flagged "verify". An optional **Verify facts** button
  runs a researcher with WebSearch.
- **Voice:** read `.claude/skills/elevenlabs-text-to-speech/SKILL.md`. One call per line of
  `lines.json` with `previous_text` / `next_text` stitching, model `eleven_v4` (fall back to
  `eleven_multilingual_v2` on a model error), stability 0.5, similarity 0.75, `mp3_44100_128`. Voice picker
  with the skill's voice IDs plus a custom voice-ID field. Measure clips with `npx remotion ffprobe` and
  write `src/audio.json` as `{ "voice": { "0": 4.31, ... }, "sfx": {} }` (existing format; the timeline
  re-times from it). With **no key**, fall back to macOS `say` converted via `npx remotion ffmpeg`,
  labelled "placeholder voice", so the demo still runs. Show the credit reminder for free plans.
- **Render:** spawn `npm run render`, parse `Rendered x/y` into a progress bar, then `npm run phone`,
  extract `cover.png` at 3 s, and write `titles.json` (3 titles <= 60 chars + a description).

## 7. Replay mode (demo insurance, build it before the live voice and render stages)

`STUDIO_MODE=replay` replays recorded runs with realistic timing and copies cached artifacts from the
finished episode (`episodes/ten-minutes-under/*`, `src/audio.json`, `public/voice/*`,
`out/episode-phone.mp4`, `out/storyboard.png`, `cover.png`). `STUDIO_RECORD=1` saves the events of a
live run to `app/replays/<stage>.ndjson`. The UI always shows a visible **Live / Replay** pill; replay
must never pretend to be live.

## 8. Server API (JSON, token required)

`GET /api/status` (doctor, mode, usage) · `POST /api/connect` · `GET/POST /api/projects` ·
`GET /api/projects/:slug` · `POST /api/projects/:slug/stages/:stage/run|approve|cancel` ·
`GET /api/events` (SSE: `stage`, `activity`, `log`, `cost`, `artifact`, `progress`, `gate`, `error`) ·
`GET /api/skills` (names + descriptions from `.claude/skills`) · `GET /api/assets` ·
`GET /files/...` (read-only, restricted to `episodes/`, `out/`, `public/`). Stages are idempotent and
resumable from `state.json`; reloading the page restores the run.

## 9. UI (this is what judges see; make it excellent)

Single page, dark, calm, confident, big type, one clear action per screen. Left: stage rail with
status dots. Top: Claude pill, Live/Replay pill, usage meter. Centre: the current stage. Right: a live
activity feed ("Claude is editing shots.ts") with cost. Screens: **Home** (topic, format chips, Surprise
me, recent projects) · **Ideas** (5 cards, pick one) · **Script** (editable lines, word count, estimated
seconds) · **Storyboard** (image and shot list) · **Voice** (picker, key field, per-line players) ·
**Render** (progress, player, downloads, titles) · **Library** (projects with covers, the skills list with
descriptions and a SKILL.md preview, assets: cast sheet, voice clips). Quality bar: value clear within
5 seconds of opening; Connect in at most 2 clicks; no terminal commands inside the flow; empty,
loading and error states everywhere; keyboard focus and contrast fine; phone width does not break.
Use the `frontend-design` or `impeccable` skill if available.

## 10. Failure modes you must handle

| Failure | Behaviour |
|---|---|
| `claude` missing | Doctor fails with the official install command; the UI shows it, does not run it silently |
| Signed out or expired | Pill red, one-click Connect (`claude auth login`) |
| Quota or rate limit | Pause the job, show the reset hint, keep state, offer Replay |
| Budget cap hit | Stop the stage, keep partial files, explain |
| Tool denied | Show which tool and which stage, never hang |
| Bad JSON or invalid `shots.ts` | Typecheck fails: one automatic repair pass via `--resume`, then show the error |
| No ElevenLabs key | `say` placeholder voice, clearly labelled |
| Render fails | Show the last log lines and a Retry button |

## 11. Build protocol

Work in this order and stop to show me after each checkpoint:
1. Doctor, server shell, token, SSE, UI frame, Connect pill.
2. Engine plus Ideas stage live (small budget); parser tested on the captured fixture.
3. Script stage, gates, project state, Library and Skills screens.
4. **Replay mode, end to end for all stages.**
5. Shots stage live with the pack catalog; storyboard viewer.
6. Voice and Render stages, titles, downloads.
7. README (judge quick start: `npm ci --ignore-scripts`, `npx remotion browser ensure`, `npm run doctor`,
   `npm start` or `npm run demo`), screenshots, a one-page demo script.

Use the pinned subagents where they fit (frame-reviewer for the storyboard step). Keep changes
targeted; do not rewrite existing studio code. Ask before touching anything outside this folder.

## 12. Acceptance tests (run them and show me the output)

- `npm run typecheck` and `npm test` pass; the parser test uses the real captured fixture.
- `npm run doctor` prints the pass/fail table.
- `npm run demo` completes all six stages with zero Claude calls and the cached MP4 plays.
- Live: connect, ideas (5 valid cards), script (`lines.json` valid, 230-280 words), and one shots plus
  storyboard run on a winter topic that typechecks.
- The server rejects requests without the token and listens only on 127.0.0.1.
- A grep proves no secrets are written to files and the child env has no API-key variables.
- Screenshots of every screen at desktop and phone width, reviewed by you.

## 13. Cut list (cut in this order if time runs out)

Library assets tab, titles, phone copy, cover, per-line players, Verify facts, usage meter, mobile
polish. **Never cut:** doctor, the Connect pill, replay mode, the legal guardrails.

## 14. Final report (max 300 words)

What works live, what only works in replay, how to run it, files created, known gaps, and anything you
could not verify.
