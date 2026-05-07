import { Composition } from "remotion";
import { HeroLoop } from "./HeroLoop/HeroLoop";

const FPS = 30;
const DURATION_SECONDS = 8;

export const Root: React.FC = () => {
  return (
    <>
      {/* 16:9 — for the homepage hero */}
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* 1:1 — for LinkedIn / X / IG feed */}
      <Composition
        id="HeroLoopSquare"
        component={HeroLoop}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1080}
        height={1080}
      />
      {/* 9:16 — for stories / Reels / TikTok */}
      <Composition
        id="HeroLoopVertical"
        component={HeroLoop}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
