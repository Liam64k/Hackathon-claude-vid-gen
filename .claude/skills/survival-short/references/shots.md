# 2D shot grammar (9:16)

Every shot in `src/shots.ts` names a **scene** (a drawn SVG world, 1080 wide), a **size**, and a
**camera move** between two keyframes. The camera (`src/camera.ts`) is x, y (world centre),
zoom, rotation and shake; layers move by depth for parallax.

## Size ladder (vertical)

| Size | Zoom guide | Use for | Rule |
|---|---|---|---|
| EWS | 0.6-0.8 | Whole city / whole cross-section | Once per act, to re-establish geography |
| WS | 0.9-1.1 | Room or street with all characters | After every location change |
| MS | 1.4-1.8 | 1-3 people, waist up | Dialogue, reactions |
| CU | 2.2-3.0 | One face or one object (radio, sign) | Emotion, clues |
| ECU | 3.5-5 | Eyes, phone screen, a single can | Max 1.5 s; never two in a row |

Adjacent shots differ by at least two sizes or change location (avoids jump cuts).
In 9:16, keep the subject in the middle third vertically; the top 15% is HUD, the band at
62-78% height is captions.

## Moves (pick exactly one per shot)

- **Push-in** (zoom x1.15-1.35 over the shot): tension, realisation, a rule being stated.
- **Pull-out** (reverse): reveal scale or isolation ("six of us").
- **Truck / track** (x moves, zoom fixed): running, crowds, scanning shelves.
- **Tilt** (y moves): sign to stairwell, sky to street.
- **Whip pan** (x jumps 600-900 px in 5-6 frames with motion blur streaks): location change.
- **Locked + shake**: impacts. Shake amplitude decays exponentially over 20-30 frames.
- **Time-lapse**: locked camera, light changes (candles shorten, window colour shifts), counters jump.
- **POV flashlight**: darkness mask with a soft circular cone; the cone moves, the camera doesn't.

## Transitions

- Hard cut by default, on a word or on an action's last frame.
- White flash (2-4 frames full white, 15-frame fade) for the bomb and for big reveals.
- Black (0.5-0.8 s silence) right after the flash: silence is a beat.
- Match cut on shape (phone screen to window, flashlight circle to moon) when possible.

## Depth and parallax

- Each scene has 3-5 layers: sky / far buildings (depth 0.2), mid buildings (0.5), set (1.0),
  characters (1.0), foreground occluders (1.4: lamp posts, door frames, pipes, crowd heads).
- A foreground occluder in at least a third of the shots sells depth.

## Light as storytelling

| Act | Light |
|---|---|
| Hook / city | Warm noon sun, saturated sky, crisp shadows |
| Flash | Everything white, then overexposed cream for 10 frames |
| After blast | Orange-brown sky, dust haze, desaturated street |
| Shelter | Red emergency light, then candle warm pools, then flashlight cone |
| Hope | Slight warm lift, meter green |
