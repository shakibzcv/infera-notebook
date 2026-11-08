/**
 * AI Model Identifiers and Helpers
 * Direct single-model execution without dynamic routing or fallback chains.
 */

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const DEFAULT_LIVE_MODEL = 'gemini-3.8-live';
export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';

/**
 * Check if an error is an abort error from an AbortController.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (
    err instanceof Error &&
    (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted'))
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a model belongs to the Gemini 3 or newer family
 */
export function isGemini3OrNewer(model: string): boolean {
  return model.startsWith('gemini-3') || model.startsWith('gemini-4');
}
