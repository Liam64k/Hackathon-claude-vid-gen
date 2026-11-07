import { Composition } from "remotion";
import { CastSheet } from "./dev/CastSheet";
import { IceTest } from "./dev/IceTest";
import { Storyboard } from "./dev/Storyboard";
import { WalkStrip } from "./dev/WalkStrip";
import { Framed } from "./Framed";
import format from "./format.json";
import { FPS, TIMED_SHOTS, TOTAL_FRAMES } from "./timeline";

// TikTok Creator Rewards only pays for videos over 60 seconds; the 14 Minutes script runs ~90 s.
export const Root = () => (
  <>
    <Composition id="Episode" component={Framed} width={format.width} height={format.height} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition id="Storyboard" component={Storyboard} width={1080} height={1920} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition id="CastSheet" component={CastSheet} width={2160} height={1920} fps={30} durationInFrames={120} />
    <Composition id="WalkStrip" component={WalkStrip} width={1920} height={1080} fps={30} durationInFrames={150} />
    <Composition id="EliDay" component={IceTest} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ mode: "day" as const }} />
    <Composition id="EliDusk" component={IceTest} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ mode: "dusk" as const }} />
  </>
);
