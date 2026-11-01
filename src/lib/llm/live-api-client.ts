/**
 * Gemini Live API Client
 * Ported from the vanilla JS example in gemini-live-api-examples-main
 * and enhanced for TypeScript/Next.js environment.
 */

export enum MultimodalLiveResponseType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  SETUP_COMPLETE = 'SETUP COMPLETE',
  INTERRUPTED = 'INTERRUPTED',
  TURN_COMPLETE = 'TURN COMPLETE',
  TOOL_CALL = 'TOOL_CALL',
  ERROR = 'ERROR',
  INPUT_TRANSCRIPTION = 'INPUT_TRANSCRIPTION',
  OUTPUT_TRANSCRIPTION = 'OUTPUT_TRANSCRIPTION',
}

export interface LiveResponse {
  type: MultimodalLiveResponseType;
  data: any;
  endOfTurn: boolean;
}

export interface GeminiLiveConfig {
  systemInstructions?: string;
  voiceName?: string;
  responseModalities?: string[];
  inputAudioTranscription?: boolean;
  outputAudioTranscription?: boolean;
  temperature?: number;
  automaticActivityDetection?: {
    disabled?: boolean;
    silenceDurationMs?: number;
    prefixPaddingMs?: number;
  };
}

export class GeminiLiveAPIClient {
  private token: string;
  private model: string;
  private modelUri: string;
  private webSocket: WebSocket | null = null;
  private connected: boolean = false;
  private serviceUrl: string;

  // Callbacks
  public onReceiveResponse: (response: LiveResponse) => void = () => {};
  public onOpen: () => void = () => {};
  public onClose: () => void = () => {};
  public onError: (error: string) => void = () => {};

  // Config
  private config: GeminiLiveConfig;

  constructor(token: string, model: string, config: GeminiLiveConfig = {}) {
    this.token = token;
    this.model = model;
    this.modelUri = `models/${this.model}`;
    this.config = {
      voiceName: 'Puck',
      responseModalities: ['AUDIO'],
      temperature: 1.0,
      inputAudioTranscription: true,
      outputAudioTranscription: true,
      ...config,
    };

    // Use v1alpha endpoint as recommended in the latest examples
    this.serviceUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;
  }

  public connect() {
    console.log('[GeminiLive] Connecting to:', this.serviceUrl);
    this.webSocket = new WebSocket(this.serviceUrl);

    this.webSocket.onopen = (event) => {
      console.log('[GeminiLive] WebSocket opened');
      this.connected = true;
      this.sendInitialSetup();
      this.onOpen();
    };

    this.webSocket.onmessage = async (event) => {
      let jsonData: string;
      if (event.data instanceof Blob) {
        jsonData = await event.data.text();
      } else {
        jsonData = event.data;
      }

      try {
        const messageData = JSON.parse(jsonData);
        const responses = this.parseResponseMessages(messageData);
        for (const response of responses) {
          this.onReceiveResponse(response);
        }
      } catch (err) {
        console.error('[GeminiLive] Error parsing message:', err, jsonData);
      }
    };

    this.webSocket.onclose = (event) => {
      console.log('[GeminiLive] WebSocket closed', event);
      this.connected = false;
      this.onClose();
    };

    this.webSocket.onerror = (event) => {
      console.error('[GeminiLive] WebSocket error', event);
      this.connected = false;
      this.onError('WebSocket connection error');
    };
  }

  public disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
      this.connected = false;
    }
  }

  public isConnected() {
    return this.connected;
  }

  public sendTextMessage(text: string) {
    this.sendMessage({
      realtimeInput: {
        text: text,
      },
    });
  }

  public sendAudioMessage(base64PCM: string) {
    this.sendMessage({
      realtimeInput: {
        audio: {
          data: base64PCM,
          mimeType: 'audio/pcm;rate=16000',
        },
      },
    });
  }

  private sendMessage(message: any) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  private sendInitialSetup() {
    const setupMessage: any = {
      setup: {
        model: this.modelUri,
        generationConfig: {
          responseModalities: this.config.responseModalities || ['AUDIO'],
          temperature: this.config.temperature,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || 'Puck',
              },
            },
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: this.config.automaticActivityDetection?.disabled ?? false,
            silenceDurationMs: this.config.automaticActivityDetection?.silenceDurationMs ?? 2000,
            prefixPaddingMs: this.config.automaticActivityDetection?.prefixPaddingMs ?? 500,
          },
          turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
        },
      },
    };

    if (this.config.systemInstructions) {
      setupMessage.setup.systemInstruction = {
        parts: [{ text: this.config.systemInstructions }],
      };
    }

    if (this.config.inputAudioTranscription) {
      setupMessage.setup.inputAudioTranscription = {};
    }
    if (this.config.outputAudioTranscription) {
      setupMessage.setup.outputAudioTranscription = {};
    }

    this.sendMessage(setupMessage);
  }

  private parseResponseMessages(data: any): LiveResponse[] {
    const responses: LiveResponse[] = [];
    const serverContent = data?.serverContent;
    const parts = serverContent?.modelTurn?.parts;

    try {
      if (data?.setupComplete) {
        responses.push({
          type: MultimodalLiveResponseType.SETUP_COMPLETE,
          data: '',
          endOfTurn: false,
        });
        return responses;
      }

      if (parts?.length) {
        for (const part of parts) {
          if (part.inlineData) {
            responses.push({
              type: MultimodalLiveResponseType.AUDIO,
              data: part.inlineData.data,
              endOfTurn: false,
            });
          } else if (part.text) {
            responses.push({
              type: MultimodalLiveResponseType.TEXT,
              data: part.text,
              endOfTurn: false,
            });
          }
        }
      }

      if (serverContent?.inputTranscription) {
        responses.push({
          type: MultimodalLiveResponseType.INPUT_TRANSCRIPTION,
          data: serverContent.inputTranscription,
          endOfTurn: false,
        });
      }

      if (serverContent?.outputTranscription) {
        responses.push({
          type: MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION,
          data: serverContent.outputTranscription,
          endOfTurn: false,
        });
      }

      if (serverContent?.interrupted) {
        responses.push({
          type: MultimodalLiveResponseType.INTERRUPTED,
          data: '',
          endOfTurn: false,
        });
      }

      if (serverContent?.turnComplete) {
        responses.push({
          type: MultimodalLiveResponseType.TURN_COMPLETE,
          data: '',
          endOfTurn: true,
        });
      }
    } catch (err) {
      console.error('[GeminiLive] Error parsing response data:', err, data);
    }

    return responses;
  }
}
