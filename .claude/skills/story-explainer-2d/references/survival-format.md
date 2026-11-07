# The "what to do if…" survival format

A vertical 60-90 s video built from ONE scenario: **disaster × place** ("a month-long blackout,
and you're on the 20th floor"). A named hero moves through the story in time; a calm voice
explains what to do. Source: a production manual for this exact format, merged with what the
reference videos showed.

## Why people watch

- **Simple picture** — the brain doesn't tire of looking, all attention goes to the story.
- **"Would I survive?"** — everyone mentally puts themselves in the situation.
- **A non-obvious twist** — "everyone runs downstairs, but you should stay." People finish the
  video for it.
- **Something changes every ~2 s** — diagram, close-up, label. The thumb has no time to swipe.
- **Time on screen** — "DAY 1 — 18:04", "NIGHT", "DAY 3" makes it feel like a series.

## The five-part skeleton (65-90 s)

| Part | Time | Content |
|---|---|---|
| Hook | 0-5 s | "If a blackout catches you on the 20th floor — don't take the stairs." |
| Everyone's mistake | 5-20 s | What most people will do and why it's a trap. |
| What really happens | 20-45 s | Numbers and time: "you have 4 minutes while the pipes still have pressure." |
| What to do | 45-75 s | 3-5 concrete steps, each with its own picture. |
| Twist | last 5-10 s | A new threat, or a question for the comments: "what would you take?" |

Pace 2.4-2.7 words per second: ~180-200 words for 75 s. Over 60 s because TikTok pays only for
videos longer than a minute (and longer videos are easier to sell to advertisers).

## Generating a premise from two lists

Use `premise-lists.md` (50 disasters × 50 places). For each candidate pair:
1. What becomes an unexpected problem *here*? That answer is the twist.
2. **Clear in 1 second?** "Tsunami, and you're in a tent on the beach" — yes.
3. **Showable with 3-4 diagrams?** Cutaway, gauge, timer, top-down view.
Score 10 pairs on those three questions and propose the best 3 to the user.
Threats the viewer can imagine at home work best.

**Hook formulas** (write 5, keep the best; ≤ 12 words):
- "If [disaster] catches you [place] — don't [the obvious thing]."
- "Why you must never [obvious action] [in place] if [disaster]."
- "You have [N] minutes before [something runs out]."
- "[N] rules if this starts today."

**Worked example — blackout × 20th-floor flat.** Hook: "If the power is out for a month and you're
on the 20th floor — don't go down." Everyone's mistake: a crowd on the dark stairwell. Reality: the
pumps stop; you have about 4 minutes of pressure left in the pipes — fill the bath. Steps: water,
light, heat, the smell of food travelling through the ventilation shaft. Twist: "At night, yours
is the only lit window in the whole district."

## Script rules

- The hero has a name; their story runs on a clock: "DAY 1 — 18:04" → "NIGHT" → "DAY 3".
- Living language: short sentences, "you", varied sentence length. No filler clichés ("let's
  break it down", "imagine this", "and here's where it gets interesting").
- Calm instructor tone. Don't scare for the sake of fear (platforms demonetise shock content).
- Save `script.md` with a table: phrase → what is on screen at that moment.

## Safety (hard rule)

Only well-known, safe advice. Never give instructions that could cause harm: chemistry, weapons,
medicines and doses, working with live electricity. Flag anything doubtful to the user in
`notes.md`. Kids and teens watch this genre. Zombies = silhouettes and atmosphere, no blood or
wounds.

## Diagrams are the main device

Every idea is shown as an explanatory picture, not as on-screen text:
- building cutaway with floors, the hero visible on theirs;
- zigzag stairwell with red dots (people) running down it;
- a water gauge dropping, next to a red-framed timer "04:29 LEFT";
- range circles "1 KM / 2 KM / 4 KM" from a glowing window;
- a chain "GRID → HOUSE → PUMP → WATER" whose links go dark one by one;
- top-down view with resource callouts;
- a ventilation shaft with a smell creeping up it.
Minimum 3 diagrams per video. Every noun the narrator says appears on screen within ±0.3 s.

## Recurring cast (channel identity)

One hero (round head ≈ 1/3 of height, dot eyes, brows, short mouth, light stubble dots; cap,
hoodie, jeans, boots; own colour + one signature detail; warm rim light; always doing something
with hands) and optionally an animal companion (always alive: breathing, tail, blinking). They
must be YOUR originals — never copy another channel's characters. Build them once, store them in
the project (see project-structure.md "channel assets") and reuse every episode.

## 2D vs 3D

~75 % 2D illustration, ≤ 25 % 3D, used only where a camera fly-through helps (top-down, building
cutaway, flying over a farm). 3D must look like a continuation of the drawing: matte (roughness
0.8-1, no metal), depth fog, depth of field, warm directional light, soft coloured shadows,
no "game" spiky grass. Options in this repo: three.js scenes inside Remotion; or Blender via a
Blender MCP if the user installs it (render transparent layers, fly-throughs as whole clips).
