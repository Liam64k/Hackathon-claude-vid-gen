import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Basement } from "./art/Basement";
import { Clipping, MathCard, PhoneScene } from "./art/Cards";
import { Cross, Fallout } from "./art/Outside";
import { Street44 } from "./art/Street44";
import { TimesSquare } from "./art/TimesSquare";
import { CamContext, camBetween, cameraTransform, shakeAt } from "./camera";
import { Hud } from "./overlay/Hud";
import { Light } from "./overlay/Light";
import { Particles } from "./overlay/Particles";
import { Bubble, Captions, Stamp } from "./overlay/Text";
import { TIMED_LINES, hasVoice, shotAt, type TimedShot } from "./timeline";
import type { Actor } from "./types";

const castAt = (s: TimedShot, t: number): Actor[] | undefined =>
  s.cast?.map((a) => (a.walkTo === undefined ? a : { ...a, x: a.x + (a.walkTo - a.x) * t }));

const SceneView = ({ s, frame, local }: { s: TimedShot; frame: number; local: number }) => {
  const t = Math.min(1, local / Math.max(1, s.len - 1));
  const p = s.props ?? {};
  const cast = castAt(s, t);
  switch (s.scene) {
    case "phone":
      return <PhoneScene frame={frame} ending={Boolean(p.ending)} />;
    case "square":
      return <TimesSquare frame={frame} alert={Boolean(p.alert)} cast={cast} mood={p.mood === "laugh" ? "laugh" : "calm"} />;
    case "clipping":
      return <Clipping frame={frame} />;
    case "street44":
      return <Street44 frame={frame} cast={cast} />;
    case "math":
      return <MathCard frame={local} />;
    case "cross":
      return <Cross frame={frame} cast={cast} burst={p.burst ? Math.min(1, local / 25) : 0} after={Boolean(p.burst) && local > 10} />;
    case "fallout":
      return <Fallout frame={frame} cast={cast} />;
    case "basement": {
      const candles = typeof p.candlesFrom === "number" ? (p.candlesFrom as number) + (((p.candlesTo as number) ?? 0) - (p.candlesFrom as number)) * t : ((p.candles as number) ?? 0);
      return (
        <Basement
          frame={frame}
          cast={cast}
          cans={(p.cans as number) ?? 38}
          counted={p.counting ? Math.min(38, t * 44) : 0}
          bulb={p.bulb !== false}
          candles={candles}
          doorShake={(p.doorShake as number) ?? 0}
          wrapper={Boolean(p.wrapper)}
          dustCoat={Boolean(p.dustCoat)}
          radioOn={Boolean(p.radioOn)}
        />
      );
    }
    case "black":
      return null;
  }
};

export const Episode = () => {
  const frame = useCurrentFrame();
  const s = shotAt(frame);
  const local = frame - s.start;
  const cam = camBetween(s.from, s.to ?? s.from, local / Math.max(1, s.len - 1));
  const { dx, dy } = shakeAt(local, s.shake ?? 0);
  const whipBlur = s.whip && local < 7 ? (7 - local) * 9 : 0;

  return (
    <AbsoluteFill style={{ background: "#0b0d12" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="whip" x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${whipBlur} 0`} />
          </filter>
        </defs>
        <CamContext.Provider value={{ cam, home: { x: s.from.x, y: s.from.y } }}>
          <g transform={cameraTransform(cam, dx, dy)} filter={whipBlur ? "url(#whip)" : undefined}>
            <SceneView s={s} frame={frame} local={local} />
          </g>
        </CamContext.Provider>
      </svg>
      <Particles />
      <Light />
      <Hud />
      <Stamp />
      <Bubble />
      <Captions />
      {TIMED_LINES.map((l) =>
        hasVoice(l.index) ? (
          <Sequence key={l.index} from={l.from} durationInFrames={l.dur}>
            <Audio src={staticFile(`voice/line-${l.index}.mp3`)} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
