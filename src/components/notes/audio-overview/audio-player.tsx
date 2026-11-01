/**
 * Audio Player Component
 * An interactive waveform-based audio player using WaveSurfer.js.
 * Supports multiple tracks, real-time waveform rendering, and intuitive seek/playback.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface AudioFile {
  id: string; // Unique identifier for the track
  name: string; // Display name
  file: string; // The URL to the audio file
  type: string; // MIME type (e.g. audio/mpeg)
  peaks?: number[]; // Pre-calculated waveform data
}

interface AudioPlayerProps {
  audioFiles: AudioFile[];
  onTimeUpdate?: (time: number) => void;
}

/**
 * Individual Waveform Item
 * Encapsulates the WaveSurfer instance and its UI for a single track.
 */
const WaveformItem = ({
  audio,
  isActive,
  onPlay,
  onTimeUpdate,
}: {
  audio: AudioFile;
  isActive: boolean;
  onPlay: (id: string | null) => void;
  onTimeUpdate?: (time: number) => void;
}) => {
  const { resolvedTheme } = useTheme();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // 1. Theme-aware color configuration
  const isDark = resolvedTheme === 'dark';

  // Refined monochromatic look with varied opacities
  const activeColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';

  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)';

  const cursorColor = isDark ? '#ffffff' : '#000000';

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: inactiveColor,
      progressColor: activeColor,
      url: audio.file,
      peaks: audio.peaks ? [audio.peaks] : undefined,
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 60,
      normalize: true,
      cursorColor,
      cursorWidth: 2,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
    });

    // Sync current time UI
    ws.on('timeupdate', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => onPlay(null));

    return () => {
      ws.destroy();
    };
  }, [audio.file, onPlay]); // Do not restart on theme change

  // 2. Dynamically update colors when theme changes WITHOUT re-initializing player
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setOptions({
        waveColor: inactiveColor,
        progressColor: activeColor,
        cursorColor,
      });
    }
  }, [resolvedTheme]);

  // Sync play/pause state from parent
  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (!isActive) {
      wavesurferRef.current.pause();
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    if (isPlaying) {
      wavesurferRef.current.pause();
      onPlay(null);
    } else {
      wavesurferRef.current.play();
      onPlay(audio.id);
    }
  };

  const toggleMute = () => {
    if (!wavesurferRef.current) return;
    const newMute = !isMuted;
    wavesurferRef.current.setMuted(newMute);
    setIsMuted(newMute);
  };

  const skip = (seconds: number) => {
    if (!wavesurferRef.current) return;
    const time = wavesurferRef.current.getCurrentTime();
    wavesurferRef.current.setTime(time + seconds);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-4 py-4 overflow-hidden relative">
      {/* Waveform Section */}
      <div className="w-full space-y-1.5 px-0.5">
        <div
          ref={waveformRef}
          className="waveform-container w-full cursor-pointer overflow-hidden"
        />

        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground/40 tabular-nums">
          <span className="flex-shrink-0">{formatTime(currentTime)}</span>
          <span className="flex-shrink-0">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 w-full px-2 relative">
        {/* Left Side: Mute */}
        <div className="flex items-center w-12 sm:w-16">
          <button
            onClick={toggleMute}
            className="flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-all outline-none bg-transparent hover:bg-transparent"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Center Control Group: Skip Back, Play, Skip Forward */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-1">
          {/* Skip Back */}
          <button
            onClick={() => skip(-10)}
            className="flex flex-col items-center justify-center group text-muted-foreground hover:text-foreground transition-all outline-none bg-transparent hover:bg-transparent"
            title="Backward 10s"
          >
            <RotateCcw className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold leading-none mt-1">10</span>
          </button>

          {/* Play/Pause */}
          <Button
            variant={isActive && isPlaying ? 'secondary' : 'default'}
            size="icon"
            onClick={togglePlay}
            className="h-10 w-10 rounded-full shadow transition-all active:scale-95 outline-none flex-shrink-0"
          >
            {isPlaying && isActive ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>

          {/* Skip Forward */}
          <button
            onClick={() => skip(10)}
            className="flex flex-col items-center justify-center group text-muted-foreground hover:text-foreground transition-all outline-none bg-transparent hover:bg-transparent"
            title="Forward 10s"
          >
            <RotateCw className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold leading-none mt-1">10</span>
          </button>
        </div>

        {/* Right Side: Spacer for balancing the centered group */}
        <div className="flex w-12 sm:w-16" />
      </div>
    </div>
  );
};

export const AudioPlayer = ({ audioFiles, onTimeUpdate }: AudioPlayerProps) => {
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  return (
    <div className="w-full flex flex-col gap-10">
      {audioFiles.map((audio: AudioFile) => (
        <WaveformItem
          key={audio.id}
          audio={audio}
          isActive={activeAudioId === audio.id}
          onPlay={setActiveAudioId}
          onTimeUpdate={onTimeUpdate}
        />
      ))}
    </div>
  );
};
