import React from 'react';
import {Composition} from 'remotion';
import {DURATION, FPS} from './brand';
import {IzavenSting} from './IzavenSting';

const formats = [
  {id: 'Sting', width: 1920, height: 1080, showWordmark: true},
  {id: 'StingVertical', width: 1080, height: 1920, showWordmark: true},
  {id: 'StingSquare', width: 1080, height: 1080, showWordmark: true},
  // Hero background loop: the wordmark already sits in the theme header, so
  // the mark carries this one on its own.
  {id: 'StingHeroLoop', width: 1920, height: 1080, showWordmark: false},
];

export const RemotionRoot: React.FC = () => (
  <>
    {formats.map(({id, width, height, showWordmark}) => (
      <Composition
        key={id}
        id={id}
        component={IzavenSting}
        durationInFrames={DURATION}
        fps={FPS}
        width={width}
        height={height}
        defaultProps={{showWordmark}}
      />
    ))}
  </>
);
