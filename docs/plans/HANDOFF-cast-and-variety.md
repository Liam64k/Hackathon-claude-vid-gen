# Handoff prompt: finish "different characters and places + skip ElevenLabs"

Paste the section below into a new Claude Code session opened in this repo.

---

You are continuing work in /Users/hliebmarchuk/redshifted/Hackathon-claude-vid-gen (AI 2D Studio: Node server in app/,
vanilla-JS UI in app/ui, Remotion video in src/). Read CLAUDE.md first. Use Sonnet 5.5 subagents for code and Opus 5.5
only for creative or prompt text. Keep prompts compact.

## Goal
1. Users can skip ElevenLabs. This is DONE.
2. Every video gets a different cast (names, looks) and a different place look (colour theme and weather). The user can
   pick these by hand, randomize them, or let Claude choose. The prompts stop producing the same story, place and
   characters every time.

## Already done
Two commits are on local main and NOT pushed: 63fdec5 and 1a613e4.
- **Voice:** provider "elevenlabs" | "placeholder" (Mac voice) | "none" (captions only). It is chosen on the Review and Voice screens.
- **Cast data:**
  - `app/lib/cast-data.mjs` has SKIN, HAIR, COATS, HATS, FACIAL, COAT_KINDS, BUILDS and NAMES, plus `randomCast(seed)` and `describeLook()`.
  - `src/themes.ts` has 8 themes: winter, summer, nightCity, wildfire, storm, fallout, blackout, desert.
- **Rendering:**
  - Rig.tsx gained the cap, hood and no-hat options, `facial: "none"` and the jacket coat.
  - `src/cast.json` (default `null`) and `src/cast.ts`: `Figures.tsx` merges the cast over HEROES, where id eli = lead and brother = second.
  - `palette(d, theme)` recolours Lake and LakeTop.
  - Rain and ash particles.
  - `app/lib/workspace.mjs` checks `build/cast.json` in and out.
  - `app/scripts/cast-preview.mjs` renders test stills.

## Uncommitted, half-finished
Two agents were stopped mid-work, so REVIEW these diffs first (`git diff`), then keep or fix them:
- **Server cast work (stopped early):**
  - modified: `app/lib/cast-data.mjs`, `app/lib/store.mjs`, `app/lib/workspace.mjs`, `app/server.mjs`, `src/dev/CastSheet.tsx`
  - new: `app/lib/castfile.mjs`, `app/stages/cast.mjs`
- **Opus prompt rewrite (stopped while editing the pack catalog):**
  - `app/stages/prompts.mjs`, `ideas.mjs`, `script.mjs`, `shots.mjs`, `app/pack-catalog.json`, `app/lib/validate.mjs`
  - `.claude/skills/story-explainer-2d/SKILL.md`, plus the new `references/cast-and-theme.md`
- Run `npm test` and `npm run typecheck` to see what's broken. The test "files: … Range suffixes" was already failing
  before this work, so ignore it.

## Still TO DO
1. **Server cast storage** (finish or redo `store.mjs`/`server.mjs`):
   - **state.cast:**
     - New projects get `randomCast(seed)`, theme "auto" and `castMode` "random" | "manual" | "claude".
     - Old projects get `cast: null`, which keeps the old look.
     - POST /api/projects accepts `cast` and `castMode`. Validate them against the cast-data enums and `safetyIssues()` for names.
   - **Cast route:** PUT/POST /api/projects/:slug/cast {cast}.
     - It writes `state.cast` and `episodes/<slug>/build/cast.json`.
     - It resolves theme "auto" from keywords in the topic:
       - nuclear → fallout
       - zombie → nightCity
       - fire → wildfire
       - flood or storm → storm
       - blackout → blackout
       - heat → desert
       - snow or ice → winter
       - anything else → summer
   - **Options:** `/api/options` returns castData (lists plus themes with id, label, swatch, sky and particles). Add GET /api/cast/random?seed=.
   - **"Let Claude cast it"** (`app/stages/cast.mjs`):
     - One small Claude CLI run: Sonnet 5.5, low effort, `--json-schema` with the enums, budget 0.10 USD. Copy the pattern from `app/stages/hooks.mjs`.
     - Input: topic, picked idea and lines.
     - Output: `{lead, second, theme, particles}`. If the output is invalid, fall back to `randomCast`.
     - Replay mode returns a recorded answer.
     - It runs automatically when ideas is approved and `castMode` is "claude", and must never block the pipeline. Also add POST /api/projects/:slug/cast/claude.
   - `projectDetail` includes `cast` and `castMode`.
   - Fix `src/dev/CastSheet.tsx`: the second character's expression faces wrongly use the lead's look.
2. **Prompt engineering** (finish the Opus pass):
   - Remove "orange-jacket", "Eli", "his brother" and "angler" from prompts, `pack-catalog.json` and `server.mjs` pack meta (~line 208).
   - Add `castText(state)` and `placeText(state)` in `prompts.mjs` and inject them into the ideas, script and shots prompts:
     - Narration uses the cast names.
     - Frames use lead and second consistently and pick particles that fit the theme.
   - The 5 ideas must each have a different protagonist (age, job, situation) and setting, and never repeat `pastIdeas`. Add a random "setting dice" hint from `app/ui/spark-words.js`.
   - Keep all safety rules.
3. **Cast screen UI** (`app/ui/app.js`, `styles.css`):
   - The New video flow becomes Idea → Look → **Cast** → Shape → Story → Review.
   - Two character cards, each with:
     - a name
     - swatches for skin, hair and coat
     - chips for hat, facial hair, coat type and build
     - Randomize
   - Also on the Cast screen: "Randomize both" and a "Let Claude cast it" toggle (`castMode`).
   - Add a simple SVG figure preview, and a summary row on Review.
   - The Look screen gets a "Place look" row of 8 theme swatches plus Auto.
   - Must fit at 1280×800 and work at 390 px.
4. **Verify:**
   - `npm test` and `npm run typecheck`.
   - Run `node app/scripts/cast-preview.mjs` for 3 seeds and themes and look at the PNGs.
   - Take screenshots with `node app/scripts/screenshots.mjs <outDir> <port> <token> name=#/route@WxH`, using a replay server: `STUDIO_PORT=4391 STUDIO_TOKEN_FOR_TESTS=shots STUDIO_NO_OPEN=1 node app/server.mjs --replay`.
   - After testing, run `git checkout -- public/voice src/audio.json src/edits.json` and set `src/cast.json` back to `null`.
   - Do NOT commit the `episodes/*` folders. Those are the user's own projects.
5. **Ship:**
   - Commit, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - `git push origin main`.
   - Restart Studio with `pkill -f "node app/server.mjs"; nohup npm start &`.
   - Give the user the new "Open:" link printed in the log; the old link stops working after a restart.
