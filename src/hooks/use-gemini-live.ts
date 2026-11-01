'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GeminiLiveAPIClient,
  MultimodalLiveResponseType,
  LiveResponse,
} from '@/lib/llm/live-api-client';
import { AudioStreamer, AudioPlayer } from '@/lib/llm/media-utils';
import { LIVE_ROUTER_MODELS } from '@/lib/llm/model-router';

export type GeminiLiveState = 'idle' | 'connecting' | 'connected' | 'error';

export interface GeminiLiveCallbacks {
  onAudioData?: (base64Audio: string) => void;
  onOutputTranscription?: (text: string) => void;
  onInputTranscription?: (text: string) => void;
  onInterrupted?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: string) => void;
  onSetupComplete?: () => void;
}

export interface UseGeminiLiveOptions {
  systemInstruction?: string;
  voice?: string;
  isMuted?: boolean;
  callbacks?: GeminiLiveCallbacks;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const { systemInstruction, voice, isMuted: initialIsMuted = false, callbacks } = options;

  const [state, setState] = useState<GeminiLiveState>('idle');
  const [activeModel, setActiveModel] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(initialIsMuted);
  const [volume, setVolumeState] = useState(1.0);

  const clientRef = useRef<GeminiLiveAPIClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const disconnect = useCallback(() => {
    if (streamerRef.current) {
      streamerRef.current.destroy();
      streamerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setState('idle');
    setActiveModel('');
    setStream(null);
    setInputTranscript('');
    setOutputTranscript('');
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    playerRef.current?.setVolume(value);
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current) return;

    setState('connecting');
    setInputTranscript('');
    setOutputTranscript('');

    try {
      // 1. Get ephemeral token & model list
      const res = await fetch('/api/live/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      const token = data.token;
      const candidateModels: string[] =
        Array.isArray(data.models) && data.models.length > 0
          ? data.models
          : [...LIVE_ROUTER_MODELS];

      const attemptConnect = async (index: number) => {
        if (index >= candidateModels.length) {
          console.error('[GeminiLive Router] All Live API fallback models failed.');
          setState('error');
          callbacksRef.current?.onError?.('All Gemini Live models failed to connect.');
          disconnect();
          return;
        }

        const model = candidateModels[index];
        console.log(
          `[GeminiLive Router] Attempting connection with model: "${model}" (index ${index})`
        );

        let setupFinished = false;
        let setupTimer: NodeJS.Timeout | null = null;

        // Clean up previous client if needed
        if (clientRef.current) {
          clientRef.current.disconnect();
          clientRef.current = null;
        }

        const client = new GeminiLiveAPIClient(token, model, {
          systemInstructions: systemInstruction,
          voiceName: voice,
        });

        const nextFallback = (reason: string) => {
          if (setupFinished) return;
          setupFinished = true;
          if (setupTimer) clearTimeout(setupTimer);
          console.warn(
            `[GeminiLive Router] Model "${model}" failed before setup (${reason}). Routing to fallback...`
          );
          client.disconnect();
          attemptConnect(index + 1);
        };

        client.onOpen = () => {
          console.log(
            `[GeminiLive Router] WebSocket opened for model "${model}", waiting for setup complete...`
          );
          callbacksRef.current?.onOpen?.();
        };

        client.onClose = () => {
          if (!setupFinished) {
            nextFallback('WebSocket closed');
          } else {
            disconnect();
            callbacksRef.current?.onClose?.();
          }
        };

        client.onError = (err) => {
          if (!setupFinished) {
            nextFallback(err || 'WebSocket error');
          } else {
            setState('error');
            callbacksRef.current?.onError?.(err);
          }
        };

        client.onReceiveResponse = (response: LiveResponse) => {
          switch (response.type) {
            case MultimodalLiveResponseType.SETUP_COMPLETE:
              setupFinished = true;
              if (setupTimer) clearTimeout(setupTimer);
              console.log(`[GeminiLive Router] Setup complete using model "${model}"!`);
              setActiveModel(model);
              setState('connected');
              callbacksRef.current?.onSetupComplete?.();
              break;

            case MultimodalLiveResponseType.AUDIO:
              playerRef.current?.play(response.data);
              callbacksRef.current?.onAudioData?.(response.data);
              break;

            case MultimodalLiveResponseType.INPUT_TRANSCRIPTION:
              const userText = response.data.text || '';
              setInputTranscript(userText);
              setOutputTranscript('');
              callbacksRef.current?.onInputTranscription?.(userText);
              break;

            case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION:
              const aiText = response.data.text || '';
              setOutputTranscript((prev) => prev + aiText);
              callbacksRef.current?.onOutputTranscription?.(aiText);
              break;

            case MultimodalLiveResponseType.INTERRUPTED:
              playerRef.current?.interrupt();
              setOutputTranscript('');
              callbacksRef.current?.onInterrupted?.();
              break;

            case MultimodalLiveResponseType.ERROR:
              if (!setupFinished) {
                nextFallback(response.data?.message || 'Model error');
              } else {
                console.error('[GeminiLive Router] Model error:', response.data);
                callbacksRef.current?.onError?.(response.data?.message || 'Model error');
              }
              break;
          }
        };

        if (!playerRef.current) {
          playerRef.current = new AudioPlayer();
          await playerRef.current.init();
        }

        if (!streamerRef.current) {
          streamerRef.current = new AudioStreamer(client);
        } else {
          streamerRef.current.setClient(client);
        }

        clientRef.current = client;
        client.connect();

        // 8-second setup timeout per model
        setupTimer = setTimeout(() => {
          if (!setupFinished && clientRef.current === client) {
            nextFallback('Setup timed out after 8s');
          }
        }, 8000);
      };

      await attemptConnect(0);
    } catch (error) {
      console.error('[GeminiLive Router] Initial connection setup failed:', error);
      setState('error');
      disconnect();
    }
  }, [systemInstruction, voice, disconnect]);

  const sendText = useCallback((text: string) => {
    if (clientRef.current) {
      clientRef.current.sendTextMessage(text);
    }
  }, []);

  // Control mic state based on isMuted prop
  useEffect(() => {
    if (streamerRef.current) {
      if (isMuted) {
        streamerRef.current.stop();
        setStream(null);
      } else if (state === 'connected') {
        streamerRef.current.start().then(() => {
          setStream(streamerRef.current?.getStream() || null);
        });
      }
    }
  }, [isMuted, state]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendText,
    state,
    activeModel,
    inputTranscript,
    outputTranscript,
    setInputTranscript,
    setOutputTranscript,
    stream,
    isMuted,
    setIsMuted,
    setVolume,
    volume,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
  };
}
