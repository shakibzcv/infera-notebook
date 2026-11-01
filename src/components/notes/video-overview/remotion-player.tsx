/**
 * Remotion Player Component
 * Wraps the Remotion Player to provide a web-based interface for playing back
 * dynamic video compositions.
 */

'use client';
import { Player } from '@remotion/player';
import RemotionComposition from './remotion-composition';

type Props = {
  videoData: any; // The manifest containing captions, audio, and images
};

function RemotionPlayer({ videoData }: Props) {
  // Debug log to ensure manifest logic is reaching the player
  console.log('[RemotionPlayer] Initializing with manifest:', videoData);

  // Calculate video duration based on the timestamp of the last caption word
  // Default to 1 if no captions (though manifest generation should prevent this)
  const lastCaptionEnd = videoData.captions[videoData.captions.length - 1]?.end || 0;

  return (
    <Player
      component={RemotionComposition} // The actual visual/audio layout logic
      durationInFrames={Math.max(1, Number((lastCaptionEnd * 30).toFixed(0)))} // Convert seconds to frames (at 30fps)
      compositionWidth={1280} // 720p resolution
      compositionHeight={720}
      fps={30}
      controls // Show play/pause/scrub UI
      style={{
        width: '100%',
        borderRadius: '8px',
      }}
      // Props passed down to the Composition component
      inputProps={{
        videoData: videoData,
      }}
    />
  );
}

export default RemotionPlayer;
