/**
 * AI Service Specific Types & Interfaces
 */

export interface StreamTextOptions {
  messages: any[];
  context?: ToolContext;
  onFinish?: (result: {
    content: string;
    reasoning?: string;
    toolInvocations: any[];
  }) => Promise<void>;
  abortSignal?: AbortSignal;
  model?: string;
}

export interface GenerateTextOptions {
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  notebookId?: string;
  model?: string;
}

export interface GenerateObjectOptions {
  messages: any[];
  outputSchema: any;
  temperature?: number;
  notebookId?: string;
  objectName?: string;
  model?: string;
}

import { z } from 'zod';

export interface ToolContext {
  notebookId: string;
  sourceIds?: string[];
  userId: string;
}

export interface InferaTool {
  name: string;
  description: string;
  schema: z.ZodType<any>;
  execute: (args: any) => Promise<any>;
}

export type GenerateImageMode = 'text-to-image' | 'image-to-image' | 'blend' | 'inpaint';

export interface GenerateImageOptions {
  mode?: GenerateImageMode;
  prompt: string;
  images?: (Blob | Buffer | File | string)[];
  mask?: Blob | Buffer | File | string;
  strength?: number;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  guidance?: number;
  aspectRatio?:
    | '1:1'
    | '1:4'
    | '1:8'
    | '2:3'
    | '3:2'
    | '3:4'
    | '4:1'
    | '4:3'
    | '4:5'
    | '5:4'
    | '8:1'
    | '9:16'
    | '16:9'
    | '21:9';
  imageSize?: '512' | '1K' | '2K' | '4K';
  thinkingLevel?: 'Minimal' | 'High';
  includeThoughts?: boolean;
}

export interface GenerateImageResult {
  success: boolean;
  image?: string;
  path?: string;
  prompt: string;
  width?: number;
  height?: number;
  model: string;
  error?: string;
}

export interface GenerateAudioOptions {
  text: string;
  voice?: string;
}

export interface GenerateAudioResult {
  success: boolean;
  buffer?: Buffer;
  text: string;
  error?: string;
}
