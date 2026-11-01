/**
 * Media Utilities for Gemini Live API
 * Optimized for performance and robustness.
 */

import { GeminiLiveAPIClient } from './live-api-client';

export class AudioStreamer {
  private client: GeminiLiveAPIClient;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isStreaming: boolean = false;
  private sampleRate: number = 16000;
  private workletLoaded: boolean = false;

  constructor(client: GeminiLiveAPIClient) {
    this.client = client;
  }

  public setClient(client: GeminiLiveAPIClient) {
    this.client = client;
  }

  async start(deviceId: string | null = null) {
    if (this.isStreaming) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.sampleRate,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.sampleRate,
        });
      }

      if (!this.workletLoaded) {
        await this.audioContext.audioWorklet.addModule('/audio-processors/capture.worklet.js');
        this.workletLoaded = true;
      }

      if (!this.audioWorklet) {
        this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');
        this.audioWorklet.port.onmessage = (event) => {
          if (!this.isStreaming) return;
          if (event.data.type === 'audio') {
            const inputData = event.data.data;
            const pcmData = this.convertToPCM16(inputData);
            const base64Audio = this.arrayBufferToBase64(pcmData);
            if (this.client.isConnected()) {
              this.client.sendAudioMessage(base64Audio);
            }
          }
        };
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.audioWorklet);

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isStreaming = true;
      return true;
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      throw error;
    }
  }

  stop() {
    this.isStreaming = false;
    // We keep the worklet and context alive but stop the media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    // Disconnect worklet from source but don't destroy it to avoid lag on restart
    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
    }
  }

  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return int16Array.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  public getStream() {
    return this.mediaStream;
  }

  public destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioWorklet = null;
    this.workletLoaded = false;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized: boolean = false;
  private volume: number = 1.0;
  private sampleRate: number = 24000;

  async init() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      await this.audioContext.audioWorklet.addModule('/audio-processors/playback.worklet.js');

      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      this.workletNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
      throw error;
    }
  }

  async play(base64Audio: string) {
    if (!this.isInitialized) await this.init();
    if (!this.audioContext || !this.workletNode) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const inputArray = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(inputArray.length);
      for (let i = 0; i < inputArray.length; i++) {
        float32Data[i] = inputArray[i] / 32768;
      }

      this.workletNode.port.postMessage(float32Data);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  }

  interrupt() {
    if (this.workletNode) {
      this.workletNode.port.postMessage('interrupt');
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.workletNode = null;
  }
}
