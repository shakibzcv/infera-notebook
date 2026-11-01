/**
 * Remotion Video Composition
 * Defines the visual and audio timeline for the overview video.
 * Features: Ken Burns image effect, dynamic word-level captions, and background audio.
 */

'use client';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  videoData: any; // The note manifest
};

function RemotionComposition({ videoData }: Props) {
  const captions = videoData?.captions;
  const imageList = videoData?.images || [];
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // 1. Calculate the total duration in frames
  const duration = captions && captions.length > 0 ? captions[captions.length - 1]?.end * fps : 0;

  /**
   * Identifies the word that corresponds to the exact current playback frame.
   * Leverages word-level timestamp data from AssemblyAI/Deepgram.
   */
  const getCurrentCaption = () => {
    const currentTime = frame / fps;
    const currentCaption = captions?.find(
      (item: any) => currentTime >= item?.start && currentTime <= item?.end
    );

    return currentCaption ? currentCaption?.word : '';
  };

  // 2. Normalize image list: Ensure only valid string URLs are passed to <Img />
  const imageUrls = imageList
    .map((item: any) => (typeof item === 'string' ? item : item?.url || ''))
    .filter((url: string) => url !== '');

  return (
    <div className="bg-slate-900 w-full h-full">
      {/* Visual Asset Layer */}
      <AbsoluteFill>
        {imageUrls.map((imageUrl: string, index: number) => {
          // Equally distribute images across the total video duration
          const startTime = (index * duration) / imageUrls.length;

          /**
           * Interpolation for "Ken Burns" zoom effect.
           * Scales from 1x to 1.1x then back to 1x to keep the scene active.
           */
          const scale = interpolate(
            frame,
            [startTime, startTime + duration / 2, startTime + duration],
            [1, 1.1, 1], // Subtle zoom
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <Sequence key={index} from={startTime} durationInFrames={duration}>
              <AbsoluteFill>
                <Img
                  src={imageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${scale})`,
                  }}
                />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* Captions Layer */}
      <AbsoluteFill
        style={{
          color: 'white',
          justifyContent: 'flex-end', // Position at the bottom
          paddingBottom: '40px',
          textAlign: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          textShadow: '0 4px 10px rgba(0,0,0,0.8)', // High contrast for visibility over images
        }}
      >
        <div className="px-10 py-4 bg-black/40 backdrop-blur-sm self-center rounded-2xl mx-auto border border-white/10">
          {getCurrentCaption()}
        </div>
      </AbsoluteFill>

      {/* Background Audio Layer */}
      {videoData.audioUrl && <Audio src={videoData.audioUrl} />}
    </div>
  );
}

export default RemotionComposition;
