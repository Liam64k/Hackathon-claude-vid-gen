# Models and token economy

Which Claude model and effort level to use for each part of the video pipeline, and how to keep
token usage low without losing quality. Latest models only.

## The current lineup (Anthropic API prices per 1M tokens, Oct 2026)

| Model | ID / Claude Code alias | Input | Output | Best at | Effort default |
|---|---|---|---|---|---|
| **Claude Opus 5.5** | `claude-opus-5-5` / `opus` | $4 | $20 | Creative judgment, story, planning, hard debugging, visual critique | **medium** (set it explicitly) |
| **Claude Sonnet 5.5** | `claude-sonnet-5-5` / `sonnet` | $2 | $10 | Everyday coding, building components, agents, reviews | high (levels recalibrated) |

All have a 1M context window and 128K output. On a Claude subscription you pay in plan usage, not
dollars, but the ratios are the same: **one Opus token ≈ 2 Sonnet tokens**. **Never use Fable or Haiku** in this studio: only Opus 5.5 and Sonnet 5.5.

**Effort** (`low` / `medium` / `high` / `xhigh` / `max`) controls how much the model thinks and how
many tool calls it makes. It is the first lever to pull: the newest models at lower effort often
match older models at high effort. Use `low` for mechanical subagents, `medium` for routine work,
`high` for creative or intelligence-sensitive work, `xhigh` for long agentic coding sessions, and
`max` only when a measured result at `xhigh` still isn't good enough.

## Effort cheat sheet (set it in the app next to the model picker, or let the subagents pin it)

| Effort | Use it for |
|---|---|
| **low** | Mechanical work only: running renders, splitting voice, ffprobe, compressing, renaming |
| **medium** | Small fixes (framing, colours, numbers), fact research, security audits, titles |
| **high** | DEFAULT for real work: premise, script, beat board, building scenes, frame review, hard bugs |
| **xhigh** | Only when `high` produced a weak result twice (a script that won't land, a stubborn bug) |
| **max** | Don't use: costs far more for little gain on this kind of work |

## Routing table for this studio

| Stage / task | Model | Effort | Why |
|---|---|---|---|
| Premise, hooks, scoring disaster × place pairs | **Opus 5.5** | high | Creativity and taste decide views; output is short, so cost is small |
| Script (narration) and twists | **Opus 5.5** | high | Same; if a script isn't landing, raise Opus to xhigh before anything else |
| Beat board / shot list | **Opus 5.5** | medium | Structured creative planning |
| Fact research with sources | **Sonnet 5.5** | medium | Web search + summarising; doesn't need Opus |
| Channel style, hero rig design (first time) | **Opus 5.5** | high | Visual identity is decided once and reused for months |
| Building SVG worlds, characters, overlays, shots.ts | **Sonnet 5.5** | high | Bulk of the tokens; Sonnet codes well at half the price |
| Small fixes (framing, colours, timing numbers) | **Sonnet 5.5** | medium | Targeted edits |
| Hard bugs (blank renders, timing logic, WebGL) | **Opus 5.5** | high | One expensive correct fix beats many cheap wrong ones |
| Storyboard / frame review | **Sonnet 5.5** | high | Good vision at half the cost; escalate to Opus when the user says "it looks bad" |
| Art-director pass ("make it look premium") | **Opus 5.5** | high | Taste |
| Running storyboard/render/voice split/ffprobe/compress | **Sonnet 5.5** | low (medium if a step fails) | Pure mechanics; keeps long logs out of the main context |
| Security audit of new skills/packages | **Sonnet 5.5** | medium | grep + reading; escalate anything suspicious to Opus |
| Studying reference videos (frames, cut stats) | **Sonnet 5.5** | high | Lots of images; Opus only for the final synthesis into the skill |
| Titles, description, cover text | **Sonnet 5.5** | medium | Short, formula-driven |

Subagents in `.claude/agents/` pin these choices (model + effort in their frontmatter), so the main
session can delegate without you switching models by hand.

## How to run a session economically

1. **One stage, one model.** Pick the main model in the desktop app's model picker at the start of a
   stage and keep it: Opus 5.5 for idea → script → beat board, then a **new session** on Sonnet 5.5
   for building. Switching models mid-conversation throws away the prompt cache (caches are
   per-model), so switch at stage boundaries, not every few messages.
2. **Delegate the noisy work.** Renders, voice splitting, log reading and frame-by-frame checks go
   to the Sonnet `render-runner` (effort low) and the Sonnet `frame-reviewer`. Their tool output stays in their own
   context; only a short report comes back.
3. **Images are expensive.** Review the storyboard contact sheet (one image, 0.25 scale) instead of
   dozens of full-size stills; open full-size stills only for the 2-4 frames in question.
4. **Don't re-read, don't re-render.** Make targeted edits; render the storyboard (seconds) before
   the full video (minutes); render the final once, in the background; read only the last lines of
   render logs.
5. **Keep always-loaded context small.** CLAUDE.md is short; the big rules live in skills, which load
   only when a request matches, and their reference files load only when needed.
6. **Data, not code.** A new episode should mostly be a new `src/shots.ts` plus one or two world
   components; reusing the kit, rig, camera, HUD and captions saves the most tokens of all.
7. **Start fresh per episode.** A new session (or `/clear`) per episode; long sessions carry old
   context you pay for on every turn.
8. **Give the full spec up front.** One detailed request at the start of a stage costs less than ten
   corrections. The prompts in `prompts/` are written for this.
9. **Lower effort before changing model.** If a stage costs too much, first try the same model one
   effort level lower on a sample task; judge by cost per finished result, not per message.

## Rough cost picture per episode (relative)

Script + beat board on Opus is a few percent of the episode's tokens. The build (Sonnet) is the bulk.
Mechanical runs on Sonnet at low effort are cheap. Image reviews are the hidden cost: keep them on contact
sheets.

Sources: Anthropic model and pricing reference (claude-api skill, cached 2026-10-06); Claude Code
subagent frontmatter (`model`, `effort`; `CLAUDE_CODE_SUBAGENT_MODEL` overrides every subagent's
model) — see [subagent frontmatter test](https://dev.to/rulestack/three-claude-code-subagent-files-three-models-in-frontmatter-what-each-launch-cost-and-the-field-257k),
[custom subagents](https://claudify.tech/blog/claude-code-custom-subagents),
[model routing](https://medium.com/@roanmonteiro/claude-code-subagent-model-routing-stop-paying-for-opus-on-haiku-work-ee76dc32cb88).
Prices and defaults change; re-check before relying on exact numbers.
