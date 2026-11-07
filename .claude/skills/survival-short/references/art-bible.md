# Art bible: detailed flat 2D

Not realistic, but rich: every frame should reward a second look.

## Line and shading

- Dark outline `#1d1a24`, 4 px on characters and props, 3 px on background objects, none on sky.
- Cel shading: one flat base, one shadow shape (base darkened ~18%, same hue shifted to blue) on
  the side away from the key light, one small highlight. No gradients on characters.
- Gradients only for sky, light pools, glow and haze.
- Soft drop shadow under characters and props (ellipse, 25% black).

## Palette

- City noon: sky `#5fb4f2 -> #bfe6ff`, sun `#fff3b0`, brick `#b5523b`, asphalt `#4a4e5a`,
  taxi `#f6c21c`, billboard accents `#ff4d8d #29d3ff #ffd23f`.
- After blast: sky `#e0703a -> #5a3020`, haze `#c9a27a` at 35%.
- Shelter: walls `#5b6670`, concrete `#7c838a`, red light `#ff3b3b` overlay 25%,
  candle `#ffb347`, darkness `#0b0d12`.
- UI: red `#e53935`, gold `#f5b301`, green `#2fbf71`, purple `#7c4dff`, text white with black stroke.

## Characters

- Proportions: head 0.9 of torso width, about 3.2 heads tall (stylised, readable at small size).
- Construction: head circle + jaw, hair as a separate silhouette (each cast member unique),
  ears, eyebrows (the main emotion driver), eyes with white + pupil + highlight, nose stroke,
  mouth shape per expression, neck, torso with clothing detail (collar, zipper, tie, apron, vest
  stripe), arms with hands, legs, shoes.
- Expressions: calm, shock (brows up, round mouth), fear (brows up-inner, small mouth, sweat),
  angry (brows down-inner), sly (one brow up, half smile), sleep (closed lids).
- Idle life: blink every 2-4 s, breathing bob 1-2 px, head tilt on talk.

## Cast for "14 Minutes"

| Who | Silhouette | Colours |
|---|---|---|
| Hero (narrator) | hoodie, backpack, messy hair | hoodie `#3f6fd8`, jeans |
| Ray, janitor, 60s | grey moustache, cap, work apron, keys | apron `#5a7d5a` |
| Maria, mom | ponytail, cardigan, tote bag | cardigan `#d9577a` |
| Leo, kid, 7 | big head, dinosaur T-shirt, sneakers | shirt `#ffb703` |
| Dev, delivery rider | helmet, insulated backpack | jacket `#ff7a1a` |
| Grant, suit | slick hair, tie, briefcase | suit `#2b2f3a`, tie `#c1121f` |
| Stranger (hour two) | covered in grey dust | everything desaturated |

## Detail checklist per background (at least 15 items)

Signage with text, windows with frames and reflections, textures (brick rows, tile grid, concrete
specks), cables/pipes, small props (cans, papers, cups, keys), at least one moving element
(steam, flicker, screen, pigeons, dust), foreground occluder, and light pools.

## Never

Real logos or brand names, text smaller than 28 px, more than 3 saturated accents in one area,
pure black backgrounds without texture.
