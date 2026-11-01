'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BarVisualizer } from '@/components/ui/bar-visualizer';
import { toast } from 'sonner';

interface FluxASRProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function FluxASR({ onTranscript, disabled }: FluxASRProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(audioStream);
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await handleTranscribe(audioBlob);
        }

        // Cleanup stream
        audioStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      if (data.transcript && data.transcript.trim()) {
        onTranscript(data.transcript.trim());
      } else {
        toast.info('No speech detected');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.div
            initial={{ opacity: 0, width: 0, scale: 0.95 }}
            animate={{ opacity: 1, width: 'auto', scale: 1 }}
            exit={{ opacity: 0, width: 0, scale: 0.95 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-1 bg-muted/40 backdrop-blur-sm rounded-full border border-border/40 min-w-[120px] max-w-[240px] transition-colors',
                isTranscribing && 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="w-12 h-6 flex items-center shrink-0">
                <BarVisualizer
                  state={isTranscribing ? 'thinking' : 'listening'}
                  mediaStream={stream}
                  barCount={8}
                  className="h-full w-full bg-transparent p-0 gap-0.5"
                  centerAlign={true}
                  minHeight={20}
                  maxHeight={80}
                  demo={isTranscribing} // Show demo animation while transcribing
                />
              </div>
              <p className="text-[11px] text-muted-foreground truncate italic font-medium">
                {isTranscribing ? 'Transcribing...' : 'Listening...'}
              </p>
              {!isTranscribing && (
                <button
                  type="button"
                  className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full transition-all group relative',
          isRecording
            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
            : isTranscribing
              ? 'text-primary bg-primary/10 animate-pulse'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
        onClick={(e) => {
          e.stopPropagation();
          toggleRecording();
        }}
        disabled={disabled || isTranscribing}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4 group-hover:scale-110 transition-transform" />
        )}
      </Button>
    </div>
  );
}
