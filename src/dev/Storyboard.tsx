import { Freeze, useCurrentFrame } from "remotion";
import { Episode } from "../Episode";
import { TIMED_SHOTS } from "../timeline";

// One frame per shot (at 70% of the shot) for the storyboard contact sheet.
export const Storyboard = () => {
  const s = TIMED_SHOTS[Math.min(useCurrentFrame(), TIMED_SHOTS.length - 1)];
  return (
    <Freeze frame={s.start + Math.floor(s.len * 0.7)}>
      <Episode />
    </Freeze>
  );
};
