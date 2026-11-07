# AGENTS.md

Guide for AI coding agents (Claude Code, Codex, Cursor, …) working **on the Studio app** in this repo.

> **Running as a Studio stage?** If your prompt starts with "The app handles approvals", you are one
> of Studio's own Claude runs, not a developer. Ignore this file and follow your stage prompt.

## What this app is

**Studio** turns a topic into a finished, narrated, vertical (9:16) 2D video. It is a local app: a
zero-dependency Node server plus a vanilla-JS browser UI. It drives:

- the user's **own signed-in Claude Code** (`claude -p --output-format stream-json`) for the creative
  and coding work,
- **ElevenLabs** for the voice (or a labelled OS-speech placeholder when there is no key),
- **Remotion** (React + SVG) for the render.

The user only decides and approves. There are five gated stages, and each writes into
`episodes/<slug>/`:

| # | Stage | Engine | Output |
|---|---|---|---|
| 1 | Ideas | Claude Opus, `--json-schema` | `ideas.json` (5 ideas, streamed as cards) |
| 2 | Script | Claude Opus, Read/Write | `script.md`, `lines.json` `[{text, highlight[]}]`, `shotlist.md` |
| 3 | Storyboard | Claude Sonnet edits `src/shots.ts`; the server typechecks and renders the stills | `storyboard.png`, `storyboard/shot-NN.png`, `shots.json` |
| 4 | Voice | Server → ElevenLabs, one clip per line | `voice/line-N.mp3`, `audio.json` (+ `src/audio.json`) |
| 5 | Render | Remotion; Claude Sonnet writes the titles | `episode.mp4`, `episode-phone.mp4`, `cover.png`, `titles.json` |

The only art pack is **Winter Lake** (a frozen lake, Eli and his brother), so topics are
winter / cold-water survival. Stage 3 may only use values from `app/pack-catalog.json`.

**Replay mode** (`npm run demo`) plays recorded runs plus the cached "Ten Minutes Under" episode, with
zero Claude calls. It must always be labelled Replay.

## Commands

```bash
npm ci --ignore-scripts          # install (never run install scripts)
npx remotion browser ensure      # one-time headless Chrome for Remotion
npm start                        # live Studio (opens the browser with a private ?t= token link)
npm run demo                     # replay mode
npm run doctor                   # environment pass/fail table
npm test                         # node --test app/  (must stay green)
npm run typecheck                # tsc for the Remotion project
```

On Windows, `Start Studio.cmd` and `Start Demo (Replay).cmd` call Node by its full path.

## Layout

```
app/
  server.mjs          HTTP API + SSE + /files (127.0.0.1 only, token, Host/Origin checks)
  jobs.mjs            one job at a time; stage state machine; ctx.claude(); cancel/pause; usage; recording
  doctor.mjs          environment checks (also used for the Claude pill)
  engine/claude.mjs   builds and spawns `claude -p …`; auth status; `claude auth login`
  engine/parse.mjs    stream-json → app events (written against app/fixtures/*.ndjson)
  engine/replay.mjs   replay provider + STUDIO_RECORD=1 recorder (app/replays/<stage>.ndjson)
  stages/*.mjs        ideas, script, shots, voice, render, extras (titles, verify facts), prompts
  lib/                paths, env (child env + finding claude), proc (spawn/kill), store (state.json),
                      workspace (checkout of src/), validate, png (contact sheet), remotion-tasks,
                      secrets (in-memory ElevenLabs key), usage, bus (SSE)
  ui/                 index.html, app.js (screens + SSE), lib.js (h(), api, md()), styles.css
  scripts/            screenshots.mjs (CDP screenshots), prepare-replay.mjs
  test/               parser, guardrails, validate, replay end-to-end
  pack-catalog.json   every legal scene/prop/pose/card/HUD value for stage 3
src/                  the Remotion project (one episode at a time)
episodes/<slug>/      per-project state.json + outputs; episodes/<slug>/build/ = its src/ snapshot
.claude/skills, .claude/agents   the creative rules Studio's Claude runs use (not app code)
```

## Hard rules (enforced in code and tests; do not weaken)

1. **Claude credentials:** never read, copy, log or forward them. Never call `claude setup-token`,
   never use `CLAUDE_CODE_OAUTH_TOKEN`, never open `~/.claude/.credentials.json` or the keychain.
2. **Never pass `--bare` or `--dangerously-skip-permissions`** (see `FORBIDDEN_ARGS` in
   `engine/claude.mjs`). Every stage gets an explicit `--allowedTools`, `--max-budget-usd` and a timeout.
3. `childEnv()` strips `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` and
   `ELEVENLABS_API_KEY` from every child process. Spawn through `lib/proc.mjs` and never use `shell: true`
   (prompts would pass through cmd.exe).
4. The server binds **127.0.0.1 only**. Every `/api` and `/files` request needs the token. `/files` is
   limited to `episodes/`, `out/` and `public/`.
5. **No secrets in files.** The ElevenLabs key comes from the env or lives in memory (`lib/secrets.mjs`).
   `.env*` is git-ignored.
6. **Safety:** survival topics only, with widely known safe advice. No chemistry, weapons, medicine
   doses, live electricity or gore (`safetyIssues()` in `lib/validate.mjs`). English, US audience,
   metric units.
7. Replay must never pretend to be live. Live and replay projects can't run in the other mode.
8. Install no new dependency without auditing it first (read it, report the risks, pin an exact
   version, `--ignore-scripts`). The only runtime dependency added for the app is
   `@elevenlabs/elevenlabs-js` (pinned).

## Conventions and gotchas

- **Don't rewrite the kit's studio code** (`src/shots.ts` structure, `src/types.ts`, `timeline.ts`,
  `Episode.tsx`, `src/art/*`, `src/overlay/*`, `scripts/*`). Studio drives it; stage 3 edits only
  `src/shots.ts` data.
- **The workspace is shared.** `src/shots.ts`, `src/audio.json` and `public/voice/` belong to one
  project at a time. Always go through `checkout(slug)` / `saveCurrent()` in `lib/workspace.mjs`. The
  example's originals live in `episodes/ten-minutes-under/build/`. Leave `src/` holding the example
  when you're done (`checkout("ten-minutes-under")`).
- **The stream-json parser** must be written against real captured output. Add new event shapes as
  fixtures in `app/fixtures/` (capture with `claude -p … --output-format stream-json --verbose`); don't
  guess field names.
- **Stage prompts** start with `PREAMBLE` ("The app handles approvals…") because the studio
  `CLAUDE.md` tells Claude to stop for approval. Keep prompts naming the exact skill files to read
  (cheap runs).
- **Failure paths:** stages must restore or clean state on failure (shots restore the previous
  `shots.ts`; voice clips are cached per line so a re-run doesn't re-bill; render and script clear
  stale outputs). Classify errors into the codes the UI understands (`rate_limit`, `budget`,
  `signed_out`, `denied`, `typecheck`, `render`, …).
- **Costs shown in the UI** are Claude's API-equivalent estimates. On a subscription they count
  toward plan limits, not money. Label them as "not billed".
- **UI:** `h()` builds the DOM. Only `md()` output (escaped first) may reach `innerHTML`. Don't
  re-render the script editor while a field is focused. Guard user actions with `once()`.
- **Windows:** this was built and tested on Windows 11. In Git Bash, prefix commands that pass
  `#/p/...` routes with `MSYS_NO_PATHCONV=1`. `claude` may exist only inside the VS Code extension;
  `findClaude()` handles that (and npm `.cmd` shims).
- **Recordings:** run live with `STUDIO_RECORD=1` to refresh `app/replays/<stage>.ndjson`. Only clean
  first runs are saved.

## Before you finish

- `npm test` and `npm run typecheck` pass. Add a test for every bug you fix.
- For UI changes: run the app (`npm run demo` is free) and look at screenshots
  (`node app/scripts/screenshots.mjs <outDir> <port> <token> name=#/route[@WxH]`) at desktop and
  390 px phone width.
- Never commit `node_modules/`, `out/`, `app/.runtime/`, `.env*` or full-resolution `episode.mp4` renders.
