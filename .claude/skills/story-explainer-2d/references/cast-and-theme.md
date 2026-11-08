# Cast and theme (per episode)

The art pack has two puppets: figure id `eli` = **the lead**, `brother` = **the second**.
The ids are code names only. Each project stores `state.cast` = `{lead:{name,look}, second:{name,look}, theme, particles}`.

- Names: always use the cast names in narration, callouts and stamps. Never call anyone "Eli" or "his brother".
- Look: clothes/hair/hat come from the cast (`describeLook`), not a fixed orange jacket.
- Theme recolours the same scenes (winter, summer, nightCity, wildfire, storm, fallout, blackout, desert);
  write the place to match (e.g. nightCity: open ground = city square, shacks = kiosks, pines = skyline).
- Places: pick scenes for the topic (city/street/crossroad for outbreaks, blackouts, crowds; bunker for
  shelter/nuclear/storm; fallout for aftermath; lake scenes only for ice). Mix 2-3 places; vary cast per video.
- Keep each person on the same figure id in every shot; pick particles that fit the theme.
- `cast: null` = legacy project: puppets are named per story.

## Casting (who and what they wear)
- Two people, two jobs in the story: the lead is followed; the second is helped, warned, followed or argued with.
- Role first, then name: "Ray, the building's janitor". A role is age + job or relation, and it is said early.
- Identity by colour and silhouette (visual-style.md §1): one signature coat colour each, clearly different
  hues; different build and different hat (or none). Never two near-identical figures.
- Clothes fit the place, the weather and the job: no puffy coat and trapper hat on a summer evening.
- Names fit the people and the place; varied, never stereotyped, never real or famous people.
- Place look and particles follow the setting (a flood is storm + rain, a fallout story is fallout + ash).
