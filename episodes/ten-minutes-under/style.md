# Ten Minutes Under: channel style (stage 3, for GATE "channel style")

Renders: `out/style/cast-sheet.png`, `out/style/walk-strip.png`, `out/style/eli-day.png`,
`out/style/eli-dusk.png` (compositions `CastSheet`, `WalkStrip`, `EliDay`, `EliDusk`).

## Look

Thin-outline cel style (art bible): outline `#1d1a24` 4 px on characters, one flat shadow shape on
the side away from the key light, a warm rim crescent on the lit side, no gradients on characters.
Gradients only for sky, sun halo, haze, light pools.

## Heroes (code: `src/art/heroes.ts`, rig `src/art/Rig.tsx`, poses `src/art/heroPoses.ts`)

| | Eli (hero) | Brother |
|---|---|---|
| Silhouette | compact; round head ~1/3 of height; puffy quilted jacket to the hip | taller and broader; long A-line parka to mid-thigh; wide boxy head (ear flaps) |
| Signature colour | ember-orange puffy `#F26B2A` (reserved: nothing else in the frame is this orange) | forest-green plaid parka `#2F7D4F` (plaid `shade 32%`) |
| Signature detail | teal beanie `#1E6F78` with cream band and big pompom `#EFE6D2` | trapper hat `#6A4A33` with cream fur brim, ear flaps and fur ruff `#E3D5B8`; full beard `#4A2E1E` |
| Plot prop | two ice picks on a dark cord around the neck: handles `#F2EEE4`, guards `#3A3F4B`, steel `#C9D3DC`, cord `#2B2F3A` | none |
| Face | dot eyes, one-stroke brows, short mouth, stubble dots, cold-pink cheeks | same + beard |
| Skin / hair | `#E9B48E` / `#5A3A26` | `#D9A27C` / `#4A2E1E` |
| Pants / boots / gloves | `#2E3546` / `#6B4A32` + cream cuff, sole `#2A2626` / `#3A3F4B` | `#4A4A55` / `#3B2B22` / `#B58A5A` |

Rim light: dusk `#FFB86B` (10 px at scale 1.6), day `#FFF1D6` (4 px), default `#FFC98A`.
Expressions: calm, scared, focused, relieved, shouting, closed (+ `talk`, blink every 2.2-3.9 s,
breathing bob, breath puffs). Views: front, 3/4, profile, back.
Poses: stand, walk (12 f, stride 168 units, `WALK_SPEED` 14 units/frame keeps feet planted),
run toward camera (10 f), water (chest-deep), onIce (forearms on the edge), kick (body 70°),
slide (stomach, picks biting), roll (top view, spread wide), picks (in fists), shiver (sitting,
wet drips), point.

## Palettes

- **Day lake**: sky `#7FB6E6 → #B9D9F1 → #D9ECF7`, sun `#FFF3B0`, far pines `#3E5F57` + 35 % sky
  haze, snow-ice `#EEF3F9 → #C9D6E6`, drifts `#F8FAFD`, prints `#AEBDD3`, cast shadow `#7D8FB3`.
- **Dusk lake**: sky `#7D6FB0 → #F4A6B8 → #FFD6A0`, low sun `#FFD6A0` sinking into pines
  `#24453A`, horizon glint `#FFD6A0`, ice `#F1CDD4 → #8E8FB8`, drifts `#F6DDE2`, prints `#7F7FAE`,
  long shadow `#5D5A92`, full-frame tint `#F08A5D` 8 %.
- Episode set colours from the shot list stay: shack red `#B8322A`, lit window `#FFC56B`, water
  `#0F1B2B`/`#16263A`, clear-ice patch `#2B3A52`.
- UI accents: danger `#E53935`, gold `#F5C518`, OK `#2FD27A`, info `#4DA3FF`, thought `#A98BFF`;
  dark plate `rgba(15,18,28,0.85)`.

## Lighting stack (`src/overlay/LightStack.tsx`)

Sun/emitter glow (radial, screen blend) → tint 8-15 % → bottom gradient from 58 % height to
`rgba(10,12,18,0.85)` → vignette 26-34 % → slow snow specks (seeded) → feTurbulence grain 5 %.

## Fonts (`src/art/fonts.ts`, Google Fonts via `@remotion/google-fonts`)

- Montserrat 900/800: captions, callouts, stamps, cards (fallback Arial Black).
- JetBrains Mono 700: system labels / clock tags (`DEC · 16:18`).
- Min text 34 px at 1080 width; callout pill 46 px, clock tag 40 px.

## Notes for the build stage

- Ghost Eli (red dashed, 40 %) isn't built yet; add a `ghost` prop to `Hero` when the freeze
  scenes are coded.
- Water occlusion is per scene: the rig draws the full body; the lake CUT/SIDE plates draw the
  water over it (see the cast sheet's water/onIce/kick cells for the reference heights).
- The old `Character.tsx` / CAST (14 Minutes) is untouched and still used by the old episode.
