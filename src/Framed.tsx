import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Episode } from "./Episode";

// The art is drawn for 9:16 (1080x1920). For any other output size the 9:16 scene is scaled to fit and centered
// over a calm gradient in the scene's night colours. Captions/HUD belong to Episode, so they stay inside the
// 9:16 area. (A blurred second copy of Episode would play every voice line twice, so it is not used.)
const W = 1080;
const H = 1920;

export const fitScale = (outW: number, outH: number) => Math.min(outW / W, outH / H);

export const Framed = () => {
  const { width, height } = useVideoConfig();
  const k = fitScale(width, height);
  const exact = Math.abs(width / height - W / H) < 0.001;
  if (exact && width === W) return <Episode />;
  return (
    <AbsoluteFill style={{ background: "#0b0d12" }}>
      {!exact && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1b2742 0%, #101726 55%, #070910 100%)" }} />
      )}
      <div
        style={{
          position: "absolute",
          left: (width - W * k) / 2,
          top: (height - H * k) / 2,
          width: W,
          height: H,
          transform: `scale(${k})`,
          transformOrigin: "0 0",
          overflow: "hidden",
        }}
      >
        <Episode />
      </div>
    </AbsoluteFill>
  );
};
