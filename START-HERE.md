# Start here

This folder is a complete, ready-to-run studio for making narrated 2D animated videos with
Claude Code. It contains the skills, the rules, the prompts, the tools and a working example
episode ("14 Minutes", a nuclear-war survival short).

## What you need

| Need | Why | Check |
|---|---|---|
| Mac (Apple Silicon or Intel) | The storyboard and video-analysis tools use Swift/AppKit; rendering works anywhere | — |
| Node.js 20+ | Remotion | `node -v` |
| Xcode Command Line Tools | `swift` for contact sheets | `swift --version` (install: `xcode-select --install`) |
| Claude Code with a Claude plan | The agent that builds everything | — |
| ElevenLabs account | Voice (web app is enough; API key optional) | — |
| ~2 GB free disk | node_modules + Remotion's headless Chrome (downloaded on first render) | — |

Licensing: Remotion is free for individuals and companies with up to 3 people (company license
from 4). Fonts and skills in this folder are open-source. Use only licensed music.

## First session (once)

1. Open Claude Code in THIS folder (`ai 2d instructions`).
2. Paste `prompts/01-setup.md`. Claude installs packages, checks the tools, renders a test still
   and says "Studio ready".

## Every new video

1. Paste `prompts/02-new-episode.md` and fill in the 4 input lines.
2. Approve: idea → script + beat board → (channel style, first time only) → storyboard.
3. Claude gives you the narration as one block. Paste it into ElevenLabs, download the MP3, send
   the file path back.
4. Claude splits the voice, renders, checks and delivers the MP4 (+ a phone copy under 30 MB),
   cover, thumbnail and titles.

## Which model to use (saves tokens)

| Stage | Pick in the model picker | Effort |
|---|---|---|
| Idea, script, beat board | Opus 5.5 | high |
| Building and fixing the video | Sonnet 5.5 (new session) | high / medium |
| Small fixes after review | Sonnet 5.5 | medium |
| Renders, voice split, checks | handled automatically by the `render-runner` subagent (Sonnet 5.5) | low |

Never use Fable or Haiku. Effort: **high** for real creative and building work, **medium** for small fixes,
research and titles, **low** only for mechanical runs; **xhigh** only if high failed twice; never **max**.

Full guide: `docs/models-and-tokens.md`. Six subagents in `.claude/agents/` already pin the right
model for each job.

## Other prompts

- `prompts/03-study-references.md` — send reference MP4s; Claude analyses them and improves the
  skill (techniques only, never copying).
- `prompts/04-fix-a-video.md` — "it looks bad" review and fix loop.

## What's inside

```
CLAUDE.md                     project memory (loaded every session)
.claude/agents/               6 subagents pinned to the right model + effort
START-HERE.md                 this file
prompts/                      copy-paste prompts
docs/Claude-Code-2D-Rules.md  everything in one readable file (prompts + skill + references)
docs/skills-audit.md          where each skill came from and its security review
docs/example-episode.md       how the example episode is put together
docs/models-and-tokens.md     which model/effort for which job, token-saving rules
.claude/skills/               27 skills (auto-loaded by Claude Code in this folder)
src/ scripts/ public/         the Remotion studio + example episode
episodes/                     per-episode notes (empty)
```
