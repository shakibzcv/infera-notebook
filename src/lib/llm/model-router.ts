/**
 * Single AI Model Architecture (Gemini 3.5 Flash Lite).
 * Multi-model routing and fallback chains have been removed.
 * All generation and reasoning tasks use gemini-3.5-flash-lite directly.
 */

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/**
 * Primary Core Gemini Model supporting native Tool Calling and JSON Schema
 */
export const GEMINI_CORE_MODELS = [DEFAULT_MODEL] as const;
export type GeminiCoreModel = (typeof GEMINI_CORE_MODELS)[number];

/**
 * Chat Model
 */
export const CHAT_ROUTER_MODELS = [DEFAULT_MODEL] as const;
export type ChatRouterModel = (typeof CHAT_ROUTER_MODELS)[number];

/**
 * Reasoning & Synthesis Model
 */
export const REASONING_ROUTER_MODELS = [DEFAULT_MODEL] as const;
export type ReasoningRouterModel = (typeof REASONING_ROUTER_MODELS)[number];

/**
 * Title Generation Model
 */
export const TITLE_ROUTER_MODELS = [DEFAULT_MODEL] as const;
export type TitleRouterModel = (typeof TITLE_ROUTER_MODELS)[number];

/**
 * Text-to-Speech (TTS) Models
 */
export const TTS_ROUTER_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
] as const;
export type TTSRouterModel = (typeof TTS_ROUTER_MODELS)[number];

/**
 * Gemini Live API Models
 */
export const LIVE_ROUTER_MODELS = [
  'gemini-3.8-live',
] as const;
export type LiveRouterModel = (typeof LIVE_ROUTER_MODELS)[number];

/**
 * Embedding Models
 */
export const EMBEDDING_ROUTER_MODELS = [
  'gemini-embedding-2',
] as const;
export type EmbeddingRouterModel = (typeof EMBEDDING_ROUTER_MODELS)[number];

// ============================================================================
// TASK CLASSIFIER HELPERS
// ============================================================================

const MAX_SCAN_CHARS = 4000;

const CODE_SYNTAX_MARKERS: readonly RegExp[] = [
  /```/,
  /^[ \t]*\$[ \t]+[a-z][\w./-]*(?=[ \t]|$)/m,
  /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,
  /\b(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*\s*\(/,
  /\b(?:func|fn)\s+[A-Za-z_$][\w$]*\s*\(.*?\)/,
  /^[ \t]*(?:async\s+)?def\s+[A-Za-z_]\w*\s*\(/m,
  /^[ \t]*class\s+[A-Za-z_$][\w$]*\s*[({:]/m,
  /\bclass\s+[A-Za-z_$][\w$]*\s+extends\s+[A-Za-z_$][\w$]*/,
  /\bimport\s*\{/,
  /\bimport\s[^\n;]{0,200}?\bfrom\s*['"][^'"\n]+['"]/,
  /^[ \t]*from\s+[A-Za-z_.][\w.]*\s+import\s+\S/m,
  /\brequire\s*\(\s*['"]/,
  /^[ \t]*#\s*include\s*[<"]/m,
  /\b[\w./-]+\.(?:[jt]sx?|mjs|cjs|py|rb|go|rs|java|kt|swift|php|cs|cpp|cc|hpp|sh|sql|css|scss|html|vue|svelte|ya?ml|json|toml)\s*:\s*\d+/,
  /\b[A-Za-z_][\w./-]*\.[ch]\s*:\s*\d+/,
  /^\s*at\s+\S.*\(.*:\d+:\d+\)/m,
  /^\s*File\s+"[^"\n]+",\s*line\s+\d+/m,
  /\bTraceback\s+\(most recent call last\)/,
  /\b(?:SELECT\s+.*?\s+FROM|INSERT\s+INTO\s+.*?\s+VALUES|UPDATE\s+.*?\s+SET|DELETE\s+FROM)\b/i,
];

export function isCodePrompt(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, MAX_SCAN_CHARS);
  return CODE_SYNTAX_MARKERS.some((regex) => regex.test(sample));
}

export function isAnalyticalPrompt(text: string): boolean {
  if (!text) return false;
  if (isCodePrompt(text)) return true;

  const lower = text.slice(0, MAX_SCAN_CHARS).toLowerCase();
  const triggers = [
    'compare and contrast',
    'comprehensive analysis',
    'detailed breakdown',
    'deep dive',
    'step-by-step proof',
    'architectural review',
    'in-depth explanation',
    'synthesize the following',
    'study guide',
    'curriculum',
    'write an essay',
    'debug the following',
    'explain this error',
    'fix this bug',
    'find the issue in',
  ];
  return triggers.some((t) => lower.includes(t));
}

// ============================================================================
// COOLDOWN ENGINE HELPERS (PASS-THROUGH / SINGLE-MODEL)
// ============================================================================

export function recordModelSuccess(_model: string): void {}
export function recordModelFailure(_model: string, _error: unknown): void {}
export function isModelOnCooldown(_model: string): boolean {
  return false;
}
export function getModelCooldownRemainingMs(_model: string): number {
  return 0;
}
export function orderChainByHealth(chain: readonly string[]): string[] {
  return [...chain];
}
export function clearAllCooldowns(): void {}

// ============================================================================
// ERROR CLASSIFIER
// ============================================================================

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

export function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const status = typeof (err as any)?.status === 'number' ? (err as any).status : 0;
  return (
    status === 401 ||
    msg.includes('401') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('unauthenticated')
  );
}

export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const status = typeof (err as any)?.status === 'number' ? (err as any).status : 0;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

export function isServerOverloadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const status = typeof (err as any)?.status === 'number' ? (err as any).status : 0;
  return (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

export function isRetryableModelError(err: unknown): boolean {
  if (!err) return false;
  if (isAbortError(err) || isAuthError(err)) return false;
  return isRateLimitError(err) || isServerOverloadError(err);
}

// ============================================================================
// SINGLE MODEL RESOLUTION
// ============================================================================

export interface SmartRoutingContext {
  task?: 'title' | 'complex' | 'chat' | 'structured_note';
  hasTools?: boolean;
  requiresJson?: boolean;
  messageLength?: number;
  content?: string;
  prioritizeHealthy?: boolean;
}

/**
 * Returns the single standard Gemini model (gemini-3.5-flash-lite).
 * Dynamic routing has been removed in favor of single-model predictability.
 */
export function resolveModelChain(_context: SmartRoutingContext = {}): readonly string[] {
  return [DEFAULT_MODEL];
}

/**
 * Check if a model belongs to the Gemini 3 or newer family
 */
export function isGemini3OrNewer(model: string): boolean {
  return model.startsWith('gemini-3') || model.startsWith('gemini-4');
}
