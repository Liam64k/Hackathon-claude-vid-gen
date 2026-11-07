# Prompt 1 — set up the studio (paste once in a new Claude Code session opened in this folder)

```
Set up this folder as my 2D video studio. Read CLAUDE.md and START-HERE.md first.

1. Check tools: node -v (need 20+), swift --version (Xcode Command Line Tools). If something is
   missing, tell me the exact command to run myself; never ask for my password.
2. Install packages exactly as locked: npm install --ignore-scripts. Report any package that needs
   install scripts instead of running them.
3. Run npm run typecheck. Fix nothing silently: if it fails, explain and fix.
4. Render one still of the example episode at frame 1500:
   npx remotion still src/index.ts Episode out/test.png --frame=1500 --scale=0.5
   (the first render downloads Remotion's headless browser; that's expected). Look at the image
   and tell me what you see.
5. Run npm run storyboard and show me out/storyboard.png.
6. List the skills in .claude/skills and confirm story-explainer-2d, survival-short,
   cinematic-director, the remotion-*, threejs-* and elevenlabs-* skills are present.
7. Optional, ask me first: faster-whisper (word timestamps for perfect caption sync) and fonts
   (Inter, Montserrat, JetBrains Mono from Google Fonts / rsms/inter / JetBrains only).

When everything passes, write "Studio ready".
Rules: English only. Never write API keys into files. Before downloading anything new, read it and
report risks.
```
