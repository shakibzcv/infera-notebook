import React from 'react';
import { Composition } from 'remotion';
import { MyComposition } from './Composition';

/**
 * The entry point for Remotion video rendering.
 * Defines the available compositions and their default properties.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Empty"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
