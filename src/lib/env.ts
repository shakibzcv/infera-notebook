import { z } from 'zod';

/**
 * Centralized environment variable access and validation.
 * This file serves as the single point of truth for server-side environment configurations,
 * allowing for easier validation and management of sensitive API keys and URLs.
 */

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required').optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX: z.string().min(1).optional(),
  AWS_S3_BUCKET_NAME: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
});

/**
 * Diagnostic helper to check if essential environment variables are set.
 * Returns true if valid or logs formatted warnings if any keys are missing.
 */
export function checkRequiredEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) missing.push('GEMINI_API_KEY');
  if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY');
  if (!process.env.PINECONE_INDEX) missing.push('PINECONE_INDEX');
  if (!process.env.AWS_S3_BUCKET_NAME) missing.push('AWS_S3_BUCKET_NAME');

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(`[ENV] Warning: Missing critical environment variables: ${missing.join(', ')}`);
  }
  return { valid: missing.length === 0, missing };
}

// --- CORE AI SERVICES ---
/** Gemini API Key for Gemini models */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
export const GOOGLE_API_KEY = GEMINI_API_KEY;
/** Nebius API Key for Llama/Qwen models via OpenAI-compatible SDK */
export const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY || '';
/** AssemblyAI Key for STT (Speech-to-Text) transcription */
export const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY || '';
/** Deepgram API Key for STT (Speech-to-Text) transcription */
export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
/** Base URL for the public-facing application frontend */
export const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

// --- INTERACTIVE VOICE (VAPI) ---
export const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || '';
export const VAPI_PUBLIC_KEY = process.env.VAPI_PUBLIC_KEY || '';

// --- VECTOR STORE (PINECONE) ---
export const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
export const PINECONE_INDEX = process.env.PINECONE_INDEX || '';

// --- MEDIA STORAGE (AWS S3 / CLOUDFLARE R2) ---
export const AWS_REGION = process.env.AWS_REGION || '';
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const AWS_ENDPOINT_URL_S3 =
  process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT || '';
export const AWS_ENDPOINT = AWS_ENDPOINT_URL_S3;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';
export const AWS_FORCE_PATH_STYLE =
  process.env.AWS_FORCE_PATH_STYLE === 'true' ||
  (process.env.AWS_FORCE_PATH_STYLE !== 'false' && Boolean(AWS_ENDPOINT_URL_S3));

// --- CLOUDFLARE AI GATEWAY ---
// Removed gateway configuration

// --- SEARCH TOOLS & SCRAPERS ---
/** Tavily search API key for web-aware AI capabilities */
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
/** Firecrawl API key for scraping websites into markdown */
export const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

// --- AUTH ---
export const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'dummy_secret_for_build_that_is_long_enough_12345678';
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret';
export const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_dummy_key';
