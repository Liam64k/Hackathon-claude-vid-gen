# Cast and theme (per episode)

The Winter Lake art has two puppets: figure id `eli` = **the lead**, `brother` = **the second**.
The ids are code names only. Each project stores `state.cast` = `{lead:{name,look}, second:{name,look}, theme, particles}`.

- Names: always use the cast names in narration, callouts and stamps. Never call anyone "Eli" or "his brother".
- Look: clothes/hair/hat come from the cast (`describeLook`), not a fixed orange jacket.
- Theme recolours the same scenes (winter, summer, nightCity, wildfire, storm, fallout, blackout, desert);
  write the place to match (e.g. nightCity: open ground = city square, shacks = kiosks, pines = skyline).
- Keep each person on the same figure id in every shot; pick particles that fit the theme.
- `cast: null` = legacy project: puppets are named per story.
