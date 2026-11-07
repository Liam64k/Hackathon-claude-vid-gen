# Studio: 3-minute demo script

**Before you go on stage:** `npm run doctor` shows no FAIL lines. The Claude pill is green. Decide
**live** (`npm start`) or **Replay** (`npm run demo`, under 2 minutes, zero Claude calls). For a live
demo, run one project up to the storyboard beforehand: Opus takes 1-4 minutes per creative step, so
on stage you show that project's later steps and start a fresh one in the background.

| Time | Do | Say |
|---|---|---|
| 0:00 | Studio is open. Point at the top bar. | "This is Studio. It turns a topic into a finished, narrated vertical video. It runs on my laptop and uses my own Claude Code. The green pill means I'm signed in with Anthropic's own login. Studio never touches my credentials." |
| 0:15 | Press **✦ Surprise me** (or type *How to help a friend who fell through the ice*). | "One click. Studio picks the right skills and models for me. Opus does the creative work." |
| 0:25 | The Ideas screen. Point at the activity feed on the right. | "On the right you see what Claude reads and writes, live: the survival-format and story skills." |
| 0:40 | Five idea cards stream in. Point at a score, a hook and the *Verify* line. | "Each idea has a hook, a twist, the real fact behind it and what to fact-check. I pick one." Press **Use this idea**. |
| 0:55 | The Script screen. Click a line, edit a word, tab out. | "The narration is 230 to 280 words with numbers spelled out for the voice. I can edit any line, and the coloured words become the caption highlights." Press **Approve script**. |
| 1:20 | The Storyboard screen: the stills grid. Click one still. | "Sonnet turned the beat board into shot data for our Winter Lake art pack. Studio typechecked it and rendered one frame per shot from the real scene code." Press **Approve storyboard**. |
| 1:45 | The Voice screen. Pick *George*. Press **Generate voice**, then play line 1. | "ElevenLabs voices one clip per line, stitched to its neighbours, and the video re-times itself to the real voice. With no key you get a labelled placeholder voice." Press **Accept voice**. |
| 2:10 | The Render screen: the progress bar. | "Remotion renders 1080 by 1920 at 30 frames per second. Then a phone copy, a cover frame and three titles." |
| 2:35 | Play the MP4. Point at Download and Titles. | "Here's the finished video. The titles carry the elevenlabs.io credit the free plan requires." |
| 2:50 | **Library → Skills** | "Everything that makes it good is built in: 27 skills, the art pack and the guardrails. The user only decides and approves." |

**If something goes wrong:** usage limit → "the job pauses and keeps its state" (show the banner),
then switch to `npm run demo`. Render failure → show the last log lines and press **Retry**.
