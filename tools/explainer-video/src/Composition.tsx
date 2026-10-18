import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { EASE } from "./ui";
import { Cart, Catalog, End, Home, Intro, Pledge, Product } from "./Scenes";

const t = linearTiming({ durationInFrames: 12, easing: EASE });

// Scene lengths sum to 1272; six 12-frame transitions overlap -> 1200 frames = 40s @30fps.
export const IzavenExplainer: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={132}>
      <Intro />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={t} />
    <TransitionSeries.Sequence durationInFrames={222}>
      <Home />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t} />
    <TransitionSeries.Sequence durationInFrames={222}>
      <Catalog />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t} />
    <TransitionSeries.Sequence durationInFrames={240}>
      <Product />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={t} />
    <TransitionSeries.Sequence durationInFrames={180}>
      <Cart />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={t} />
    <TransitionSeries.Sequence durationInFrames={156}>
      <Pledge />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={t} />
    <TransitionSeries.Sequence durationInFrames={120}>
      <End />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
