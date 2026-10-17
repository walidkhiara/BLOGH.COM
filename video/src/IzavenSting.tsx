import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {BEATS, BONE, INK} from './brand';
import {PATH as Z_PATH, VIEW_BOX as Z_VIEW_BOX} from './zmark-path';
import {PATH as WORD_PATH, VIEW_BOX as WORD_VIEW_BOX} from './wordmark-path';

// Quiet ease. The storefront runs with transitions and hover effects
// switched off, so the motion here stays slow and settles rather than
// snapping. Symmetric in and out, so the ink neither lurches at the start
// nor crawls at the end.
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Width of the soft edge on the reveal, as a fraction of the sweep. Wide
// enough that the mark reads as ink arriving, not as a wipe passing over.
const FEATHER = 0.26;

export type StingProps = {
  showWordmark: boolean;
};

export const IzavenSting: React.FC<StingProps> = ({showWordmark}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();

  const draw = ease(
    interpolate(frame, [BEATS.drawIn, BEATS.drawOut], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // The gradient travels from before the mark to past it, so the stops stay
  // off-canvas at rest and the first/last frames are genuinely empty.
  const head = interpolate(draw, [0, 1], [-FEATHER, 1 + FEATHER]);

  const word = showWordmark
    ? ease(
        interpolate(frame, [BEATS.wordIn, BEATS.wordOut], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      )
    : 0;

  const exit = interpolate(frame, [BEATS.fadeIn, BEATS.fadeOut], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // A hair of overshoot that settles, so the lockup lands rather than stops.
  const settle = interpolate(draw, [0, 1], [1.015, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: BONE}}>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: height * 0.042,
          opacity: exit,
          transform: `scale(${settle})`,
        }}
      >
        <svg
          viewBox={Z_VIEW_BOX}
          // The mark's dense mass sits right of its bounding-box centre, so it
          // needs a nudge to look centred next to the wordmark.
          style={{
            height: height * 0.4,
            overflow: 'visible',
            transform: `translateX(${-height * 0.016}px)`,
          }}
          aria-label="IZAVEN"
        >
          <defs>
            {/* Mostly top-to-bottom with a gentle left lead, following the
                order the Z is actually written in. */}
            <linearGradient id="sweep" x1="0.35" y1="0" x2="0.65" y2="1">
              <stop offset={Math.max(0, head - FEATHER)} stopColor="#fff" />
              <stop offset={Math.min(1, Math.max(0, head))} stopColor="#000" />
            </linearGradient>
            <mask id="reveal" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
              <rect x="0" y="0" width="1" height="1" fill="url(#sweep)" />
            </mask>
          </defs>
          <path d={Z_PATH} fill={INK} mask="url(#reveal)" />
        </svg>

        {showWordmark ? (
          <svg
            viewBox={WORD_VIEW_BOX}
            style={{
              height: height * 0.13,
              opacity: word,
              transform: `translateY(${(1 - word) * height * 0.018}px)`,
            }}
          >
            <path d={WORD_PATH} fill={INK} />
          </svg>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
