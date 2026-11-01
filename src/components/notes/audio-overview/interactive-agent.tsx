'use client';

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useGeminiLive, type GeminiLiveCallbacks } from '@/hooks/use-gemini-live';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, X, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Orb, type AgentState as OrbState } from '@/components/ui/orb';
import { BarVisualizer, type AgentState as BarState } from '@/components/ui/bar-visualizer';
import { useNotebookStore } from '@/hooks/use-notebook-store';
import {
  VOICE_CONTEXT_MAX_CHARS,
  DEFAULT_SPEAKER_NAME,
  DEFAULT_SPEAKER_VOICE,
} from '@/lib/constants';

interface InteractiveAgentProps {
  noteId: string;
  notebookId: string;
  noteTitle: string;
  noteContent: string;
  onClose?: () => void;
}

export function InteractiveAgent({
  noteId,
  notebookId,
  noteTitle,
  noteContent,
  onClose,
}: InteractiveAgentProps) {
  const { fetchCredits } = useNotebookStore();
  const [isOutputMuted, setIsOutputMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Parse all participants once
  const participants = useMemo(() => {
    try {
      const parsed = typeof noteContent === 'string' ? JSON.parse(noteContent) : noteContent;
      return Array.isArray(parsed?.participants) ? parsed.participants : [];
    } catch (e) {
      return [];
    }
  }, [noteContent]);

  // 2. Build the system instruction with podcast context
  const systemInstruction = useMemo(() => {
    const participantsList =
      participants.length > 0
        ? participants.map((p: any) => `- ${p.name}: ${p.specialization}`).join('\n')
        : 'No specific participants defined.';

    const contextSnippet = noteContent.slice(0, VOICE_CONTEXT_MAX_CHARS);

    return `You are helping a user discuss an "Audio Overview" podcast titled "${noteTitle}".

The following participants are available to speak:
${participantsList}

INSTRUCTIONS:
1. You are a conversational AI speaking directly to the user via voice.
2. SELECT THE BEST SPEAKER: Look at the user's query and the participants' specializations. Respond as the most qualified participant.
3. If the query is general or a greeting, respond as the "Host".
4. SPEAK DIRECTLY: Speak as the chosen character. Use "I" and "me".
5. CONCISE: Keep answers to 1-3 short sentences. This is a spoken conversation.
6. Be warm, engaging, and natural. Use conversational language.
7. When greeting the user for the first time, say something like "Look who's here! Do you have any questions about the topic we're discussing today?"

Context from the overview:
"${contextSnippet}"`;
  }, [noteTitle, noteContent, participants]);

  // 3. Track whose turn it is
  const [currentPersona, setCurrentPersona] = useState(() => {
    const host = participants.find((p: any) => p.specialization?.toLowerCase().includes('host'));
    return (
      host ||
      participants[0] || {
        name: DEFAULT_SPEAKER_NAME,
        specialization: 'Host',
        voice: DEFAULT_SPEAKER_VOICE,
      }
    );
  });

  const checkInitialCredits = useCallback(async () => {
    try {
      await fetchCredits();
      const res = await fetch('/api/user/credits');
      if (!res.ok) return false;
      const data = await res.json();
      if (data.credits <= 0) {
        toast.error("You don't have enough credits to use the interactive agent.");
        onClose?.();
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to check credits:', e);
      return false;
    }
  }, [onClose, fetchCredits]);

  const hasInitialized = useRef(false);
  const hasSentGreeting = useRef(false);

  // 4. Set up Gemini Live callbacks
  const geminiCallbacks = useMemo<GeminiLiveCallbacks>(
    () => ({
      onAudioData: () => {
        setIsSpeaking(true);
      },
      onOutputTranscription: (text) => {
        // Output is now handled by the hook's outputTranscript
      },
      onInputTranscription: (text) => {
        // Input is now handled by the hook's inputTranscript
      },
      onInterrupted: () => {
        setIsSpeaking(false);
      },
      onOpen: () => {
        console.log('[InteractiveAgent] WebSocket opened');
      },
      onSetupComplete: () => {
        console.log('[InteractiveAgent] Gemini Live setup complete');
        // Send initial greeting prompt once connected
        if (!hasSentGreeting.current) {
          hasSentGreeting.current = true;
          // Small delay to let the UI settle
          setTimeout(() => {
            sendTextRef.current?.(
              `Greet the user warmly. You are the host of the podcast. Say something like "Look who's here! Do you have any questions about the topic we're discussing today?"`
            );
            // UNMUTE automatically so user can speak immediately after
            setIsMutedRef.current?.(false);
          }, 800);
        }
      },
      onClose: () => {
        console.log('[InteractiveAgent] Gemini Live session closed');
        setIsSpeaking(false);
      },
      onError: (error) => {
        toast.error(error || 'Connection error');
      },
    }),
    []
  );

  // 5. Initialize the Gemini Live hook
  const {
    connect,
    disconnect,
    sendText,
    state,
    inputTranscript,
    outputTranscript,
    setInputTranscript,
    setOutputTranscript,
    stream,
    isConnected,
    isConnecting,
    isMuted,
    setIsMuted,
    setVolume,
  } = useGeminiLive({
    systemInstruction,
    isMuted: true, // Start muted for initial connection
    callbacks: geminiCallbacks,
  });

  // Use a ref for sendText and setIsMuted to avoid stale closure issues in callbacks
  const sendTextRef = useRef(sendText);
  const setIsMutedRef = useRef(setIsMuted);
  useEffect(() => {
    sendTextRef.current = sendText;
    setIsMutedRef.current = setIsMuted;
  }, [sendText, setIsMuted]);

  // 5.5 Handle mute button (Volume control)
  useEffect(() => {
    setVolume(isOutputMuted ? 0 : 1);
  }, [isOutputMuted, setVolume]);

  // 5.6 Auto-clear transcripts for "live" feel
  useEffect(() => {
    if (!isSpeaking && outputTranscript) {
      const timer = setTimeout(() => {
        setOutputTranscript('');
      }, 6000); // Clear AI transcript after 6 seconds of silence
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, outputTranscript, setOutputTranscript]);

  useEffect(() => {
    if (inputTranscript && !isSpeaking) {
      const timer = setTimeout(() => {
        setInputTranscript('');
      }, 4000); // Clear user transcript after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [inputTranscript, isSpeaking, setInputTranscript]);

  // 6. Initial connection
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const canProceed = await checkInitialCredits();
      if (!canProceed) return;

      // Connect to Gemini Live AUTOMATICALLY
      await connect();
    };
    init();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, checkInitialCredits]);

  // Removed local aiResponseText clear effect

  // 5.7 Auto-scroll transcript container
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [inputTranscript, outputTranscript]);

  const handleClose = useCallback(() => {
    disconnect();
    onClose?.();
  }, [disconnect, onClose]);

  // Determine the overall state for visual components
  const orbState = useMemo((): OrbState => {
    if (isConnecting) return 'thinking';
    if (isSpeaking) return 'talking';
    if (isConnected && !isMuted) return 'listening';
    return null;
  }, [isConnecting, isConnected, isSpeaking, isMuted]);

  const barState = useMemo((): BarState => {
    if (isConnecting) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isConnected && !isMuted) return 'listening';
    return 'listening'; // Idle state
  }, [isConnecting, isConnected, isSpeaking, isMuted]);

  return (
    <div className="relative flex h-full flex-col items-center justify-between bg-background p-6 text-foreground transition-colors duration-300">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      {/* Main Content Areas */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full max-w-2xl gap-8">
        {/* 3D Orb Section */}
        <div className="relative h-[300px] w-[300px] md:h-[400px] md:w-[400px] flex items-center justify-center">
          <Orb
            agentState={orbState}
            className="w-full h-full"
            colors={['#3b82f6', '#818cf8']}
            volumeMode="auto"
          />
        </div>

        <div className="flex flex-col items-center gap-4 text-center px-4 w-full">
          <div
            ref={scrollRef}
            className="h-[5rem] w-full max-w-lg overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {outputTranscript ? (
                <motion.div
                  key="ai-response"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-1 w-full"
                >
                  <p className="text-[11px] font-bold text-primary/70">{currentPersona.name}</p>
                  <p className="text-[11px] text-muted-foreground/60 h-4">
                    {currentPersona.specialization}
                  </p>
                  <p className="text-lg font-medium text-primary leading-tight max-w-lg mx-auto">
                    {outputTranscript}
                  </p>
                </motion.div>
              ) : inputTranscript && isConnected ? (
                <motion.div
                  key="partial"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, filter: 'blur(10px)', scale: 0.9 }}
                  className="space-y-1 w-full"
                >
                  <p className="text-[11px] font-bold text-foreground/50">You</p>
                  <p className="text-[11px] text-muted-foreground/0 h-4"></p>
                  <p className="text-lg font-medium text-foreground/90 leading-tight max-w-lg mx-auto">
                    {inputTranscript}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="space-y-1 w-full"
                >
                  <p className="text-[11px] font-bold opacity-0">Status</p>
                  <p className="text-[11px] opacity-0 h-4"></p>
                  <p className="text-muted-foreground/60 text-sm italic">
                    {isConnecting
                      ? 'Establishing connection...'
                      : isSpeaking
                        ? 'Speaking...'
                        : isConnected
                          ? "I'm listening..."
                          : 'Ask me anything about this overview...'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Visualizer Section */}
        <div className="w-full max-w-sm px-4">
          <BarVisualizer
            state={barState}
            mediaStream={isMuted ? null : stream}
            barCount={40}
            className="h-12 bg-transparent gap-0.5"
            centerAlign={true}
            minHeight={10}
            maxHeight={100}
          />
        </div>
      </div>

      {/* Footer Controls */}
      <div className="relative z-10 flex items-center gap-8 pb-4">
        {/* Output Mute Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={() => setIsOutputMuted(!isOutputMuted)}
        >
          {isOutputMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>

        {/* The RED button is now the CLOSE button as requested */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleClose}
            disabled={isConnecting}
            className={cn(
              'h-14 w-14 rounded-full shadow-lg transition-all flex items-center justify-center group bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20 text-white'
            )}
          >
            <Power className="h-6 w-6" />
          </Button>
        </motion.div>

        {/* Microphone Toggle (Optional, can keep it or remove it. 
            User said "no extra close button", implying they want it simple.
            I'll replace this with a subtle mic status indicator or just remove it.
            Actually, let's keep a small mic toggle if they want to mute manually without closing.)
        */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full border-border bg-muted/50 transition-colors',
            isMuted ? 'text-muted-foreground' : 'text-primary border-primary/30 bg-primary/5'
          )}
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
