# Voice, sound, delivery, cover, titles and platform rules

## Voice options

- **A — user records it** (phone/mic). Most alive; platforms favour it.
- **B — ElevenLabs.** Web app (user pastes the narration as one block, sends the MP3) or API with
  `ELEVENLABS_API_KEY` set in the user's shell. Calm voice, no music.
- **C — Piper**, local and free (`pip install piper-tts` + a voice model). Simpler sound.

## Voice edit and processing (when tools are available)

1. Edit: remove slips and retakes (keep the last take); shorten pauses > 0.5 s to 0.25-0.35 s;
   cut only inside pauses with 10-30 ms crossfades; keep breaths before phrases.
2. Chain, in order: noise reduction (DeepFilterNet, moderate — no "underwater" sound) → high-pass
   80 Hz → −2-3 dB at 250-350 Hz if boomy → de-esser → compressor 2:1, attack 10-20 ms →
   two-pass loudnorm to **−14 LUFS, true peak −1 dBTP**, LRA 4-6 LU (don't over-squash).
3. Word timestamps: run faster-whisper (or mlx-whisper on Apple Silicon) with word timestamps →
   `words.json`. Captions and "noun appears when said" timing are built from it. Without it,
   fall back to pause-split lines + character-proportional word timing (project-structure.md).

## Music and SFX

- Licensed music only (e.g. YouTube Audio Library). Quiet, dark, no vocals.
- Under the voice at −24…−26 LUFS, sidechain-ducked 6-8 dB, cut 250-500 Hz on the music bed.
- At the twist, let the music almost disappear — silence works.
- Max ~4 sound effects per video, on the moments that matter (impact, stamp, alarm, reveal).
  No "whoosh" on every cut.

## Final delivery

- `final.mp4`: 1080×1920, H.264 high, 12-16 Mbit/s, AAC 320 kbit/s, −14 LUFS.
  Phone-share copy < 30 MB (crf 26). Draft renders at 720p for review.
- Horizontal version (if asked): re-compose scenes for 16:9, never crop the vertical.
- `cover.png` 1080×1920 (a cover frame) and `thumb.jpg` 1280×720.
- 3 title options ≤ 60 characters + a description.
- `notes.md`: what didn't work and why; doubtful advice flagged.

## Cover / thumbnail

People see it for under a second: show the hero in trouble and pose a question.
- Hero large on the left half; background is the same scene, blurred and darkened on the right.
- Text on the right, Inter Display Black / Montserrat Black, tight: 1-2 white lines, the key word
  red `#FF3B30` with a soft glow, below it a yellow `#FFD43B` label with black text tilted 2-3°.
- Max 6-8 words total. Keep the bottom-right corner empty (YouTube timestamp).
- No money amounts, no earnings promises.

## Titles

Formulas: "If [disaster] catches you [place]", "Why you must never [action] [in place]",
"You have [N] minutes before [X runs out]", "[N] rules if this starts today".
≤ 60 characters; complement the cover, don't repeat it word for word. No "SHOCK", no all-caps
titles, no money promises.

## Platform rules (to keep monetisation and the account)

- **Mass-produced templates don't monetise.** YouTube's non-original/repetitive content rule:
  each video needs its own story, voice and scenes.
- **Don't scare for the sake of fear** — shock-driven content gets demonetised. Calm instructor.
- **AI label:** cartoon animation doesn't need the "altered content" label; realistic AI footage
  that looks like real filming does.
- No re-uploads with other platforms' watermarks (reach gets cut).
- Don't copy others' characters or shots. Copy style and structure; characters and scenes are
  yours.
- Don't change the account country to get into a payout programme — it breaks the terms.

## Money, without fairy tales (open data, Oct 2026; platforms change rates often)

| Platform | Pays per view | Conditions |
|---|---|---|
| TikTok | ≈ $0.4-1 per 1,000 qualified views | Creator Rewards: videos > 1 min, 10k followers, 100k views in 30 days; not available in every country |
| YouTube Shorts | ≈ $0.03-0.07 per 1,000 | Partner Programme: 1,000 subscribers + 10M Shorts views in 90 days |
| Instagram Reels | no per-view pay | bonuses closed for new creators |
| Direct sponsorship | main income | priced on the average views of recent videos, not one viral hit |

Don't promise the user income; present these as rough, changing reference numbers.
