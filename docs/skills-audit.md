# Skills: sources and security review

All skills were downloaded with shallow `git clone` (hooks disabled), read, and scanned for install
scripts, `curl | sh`, `eval`/`child_process` misuse, base64 blobs, access to ~/.ssh / ~/.aws /
keychains, unknown network hosts and prompt-injection text before being copied here.

| Skill(s) | Source | License | Verdict |
|---|---|---|---|
| remotion-best-practices, -create, -captions, -multimedia, -render, -studio, -docs, -interactivity | github.com/remotion-dev/skills (official, ~6k stars) | see repo | Clean. No install hooks; only optional map API keys read from env. |
| threejs-* (13) | github.com/cloudai-x/threejs-skills (~3.9k stars) | MIT | Clean. Markdown only. |
| elevenlabs-text-to-speech, -speech-to-text, -sound-effects | github.com/elevenlabs/skills (official) | MIT | Clean. Docs mention the ElevenLabs CLI installer (`curl … | sh`) — never run it without asking. |
| cinematic-director | github.com/wuwangzhang1216/DirectorSKILL (~300 stars) | MIT | Clean. Markdown only. |
| story-explainer-2d, survival-short | written for this studio | — | Own content. |

Not installed after review: theunisdk/video-studio (clean but 2 stars, large codebase — ideas
borrowed instead), Azure12355/weilanx-claude-videos (clean, but a full project for a different
style), unverified registry-only skills.

Licensing reminders: Remotion is free for individuals and companies of up to 3 people (company
license from 4). Use only licensed music. No real brands or logos in videos.
