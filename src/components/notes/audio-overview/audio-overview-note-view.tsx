/**
 * Audio Overview Note View Component
 * Renders the UI for a note containing an AI-generated audio summary.
 * Displays an audio player and the dialogue segments of the podcast/overview.
 */

'use client';

import React from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Mic, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSignedUrls } from '@/hooks/use-signed-urls';
import { AudioPlayer } from './audio-player';
import { Transcription, TranscriptionSegment } from '@/components/ai-elements/transcription';

type Props = {
  note: SelectedNote; // The note object containing raw JSON content
  onInteractiveMode?: () => void; // Optional callback for immersive reading mode
};

export function AudioOverviewNoteView({ note, onInteractiveMode }: Props) {
  const rawContent = note?.content;
  const [currentTime, setCurrentTime] = React.useState(0);

  // 1. Parse the raw note content which is stored as a JSON string or object in DB
  const parsed = React.useMemo(() => {
    if (!rawContent) return null;
    try {
      // Handle both string and pre-parsed objects
      const json = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

      // Basic validation of the expected structure
      if (json && typeof json === 'object' && 'path' in json) {
        return {
          path: (json as any).path,
          waveform: Array.isArray((json as any).waveform) ? (json as any).waveform : undefined,
          transcript: Array.isArray((json as any).transcript)
            ? (json as any).transcript
            : undefined,
          participants: Array.isArray((json as any).participants) ? (json as any).participants : [],
          segments: Array.isArray((json as any).segments) ? (json as any).segments : [],
        };
      }
    } catch (error) {
      console.error('[AudioOverviewNoteView] Failed to parse content', error);
    }
    return null;
  }, [rawContent]);

  // 2. Calculate timestamps for transcription sync
  const segmentsWithTime = React.useMemo(() => {
    if (!parsed?.segments) return [];

    // If we have a real transcript from Deepgram, use it to align segments
    if (parsed.transcript && parsed.transcript.length > 0) {
      const words = parsed.transcript;
      let wordIdx = 0;
      const lastWordEnd = words[words.length - 1]?.end ?? 0;

      return parsed.segments.map((s: any) => {
        const start = words[wordIdx]?.start ?? lastWordEnd;

        // Accumulate characters from the transcript words until we reach the approximate length of this segment
        let accumulatedChars = 0;
        // Strip punctuation and spaces to get a rough character count for matching
        const cleanSegmentText = s.content.replace(/[^\w]/g, '');
        const targetLen = cleanSegmentText.length;

        while (wordIdx < words.length && accumulatedChars < targetLen) {
          // Add the length of the word (stripping punctuation just in case)
          accumulatedChars += words[wordIdx].word.replace(/[^\w]/g, '').length;
          wordIdx++;
        }

        // If we overshot, wordIdx points to the next segment's first word.
        // The end time is the end of the previous word.
        const endWordIdx = Math.max(0, Math.min(wordIdx - 1, words.length - 1));
        const end = words[endWordIdx]?.end ?? Math.max(start + 1, lastWordEnd);

        return {
          text: s.content,
          startSecond: start,
          endSecond: end,
          voice: s.voice,
        };
      });
    }

    // Fallback: Estimate timestamps for older notes
    let currentSecond = 0;
    const CHARS_PER_SECOND = 15;

    return parsed.segments.map((s: any) => {
      const duration = Math.max(s.content.length / CHARS_PER_SECOND, 1);
      const segment = {
        text: s.content,
        startSecond: currentSecond,
        endSecond: currentSecond + duration,
        voice: s.voice,
      };
      currentSecond += duration;
      return segment;
    });
  }, [parsed?.segments, parsed?.transcript]);

  const { getUrl, loading: isResolving, error: resolveError } = useSignedUrls(parsed?.path || '');
  const audioUrl = parsed?.path ? getUrl(parsed.path) : null;

  // 2. Prepare audio files array for the player
  const audioFiles = React.useMemo(() => {
    if (!parsed || !audioUrl) return [];
    return [
      {
        id: 'audioOverview',
        name: note.noteTitle ?? 'Audio Overview',
        file: audioUrl,
        type: 'audio/mpeg',
        peaks: parsed.waveform,
      },
    ];
  }, [parsed, audioUrl, note.noteTitle]);

  // 2. Fallback UI if content is missing or unparseable
  if (resolveError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive text-center">
        Failed to resolve audio: {resolveError}
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0b12] p-4 text-xs text-white/60">
        No audio overview content available yet.
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="size-8 animate-spin text-primary/50" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Getting your audio ready...
        </p>
      </div>
    );
  }

  // 3. Render the main view
  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full">
      <ScrollArea className="flex-1 w-full h-full">
        <div className="flex flex-col space-y-8 pb-32 px-4 md:px-6 max-w-4xl mx-auto">
          {/* Central Audio Player Component */}
          <div className="pt-6">
            <AudioPlayer audioFiles={audioFiles} onTimeUpdate={setCurrentTime} />
          </div>

          {/* Hosts / Participants Section */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-white/90">
              <Users className="size-4 text-primary/60" />
              <h3 className="text-sm font-bold tracking-tight">Hosts</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              {parsed.participants.map((participant: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {participant.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white/90">{participant.name}</span>
                    <span className="text-[10px] text-white/40 capitalize tracking-wide font-bold">
                      {participant.specialization || participant.description || 'Host'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Script Section with Sync */}
          <div className="space-y-6 pt-4 border-t border-white/5">
            <Transcription
              segments={segmentsWithTime}
              currentTime={currentTime}
              className="flex flex-col gap-6"
            >
              {(segment, idx) => {
                const speaker = parsed.participants.find(
                  (p: any) => p.voice === (segment as any).voice
                );
                const speakerName = speaker?.name || 'Speaker';

                return (
                  <div key={idx} className="group relative leading-relaxed">
                    <span className="text-base font-bold text-primary/80 mr-2">{speakerName}:</span>
                    <TranscriptionSegment
                      segment={segment}
                      index={idx}
                      className="text-base transition-all duration-500 inline"
                    />
                  </div>
                );
              }}
            </Transcription>
          </div>
        </div>
      </ScrollArea>

      {/* Floating Action Button for Voice Agent (Interactive Mode) */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        >
          <Button
            onClick={onInteractiveMode}
            className="rounded-full shadow-2xl size-14 p-0 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center border border-white/10 group overflow-hidden relative"
            title="Voice Agent"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Mic className="h-6 w-6 group-hover:animate-pulse" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
