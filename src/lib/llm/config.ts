import * as env from '@/lib/env';
import { GoogleGenAI } from '@google/genai';

export const GEMINI_API_KEY = env.GEMINI_API_KEY || '';
export const GOOGLE_API_KEY = GEMINI_API_KEY;
export const DEEPGRAM_API_KEY = env.DEEPGRAM_API_KEY || '';

export const aiConfig = {
  apiKey: GEMINI_API_KEY,
  deepgramKey: DEEPGRAM_API_KEY,
};

export const googleConfig = {
  apiKey: GEMINI_API_KEY,
};

export const geminiConfig = googleConfig;
