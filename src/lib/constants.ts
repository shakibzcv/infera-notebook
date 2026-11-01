import { AllowedSourceType, AllowedNoteType } from '@/generated/prisma/enums';

// --- AI Model Identifiers ---
export const EMBEDDING_MODEL_ID = 'gemini-embedding-2';
export const GEMINI_EMBEDDING_DIMENSIONALITY = 768;
export const TTS_MODEL_ID = 'aura-2-en';
export const TRANSCRIPTION_MODEL_ID = 'nova-3';
export const IMAGE_MODEL_ID = 'gemini-2.5-flash-image';
export const CHAT_MODEL_ID = 'gemini-3.5-flash-lite';
export const DEFAULT_MODEL_ID = 'gemini-3.5-flash-lite';

// --- Vector Store Processing ---
// Defines limits for batch operations in Pinecone/Embeddings to avoid API limits.
export const GEMINI_EMBEDDING_BATCH_SIZE = 10;

// --- User Credit System ---
// Configuration for the daily usage limits and per-action costs.
export const DEFAULT_CREDITS = 20;
export const DEFAULT_CREDIT_DEDUCTION = 1;

// --- Source Material Management ---
// Limits for metadata and default storage location for user-provided materials.
export const MAX_LINK_TITLE_LENGTH = 100;
export const MAX_PASTE_TITLE_LENGTH = 100;

// --- Interactive Agent (Audio Mode) ---
// Defaults for voice narrators and context injection for the interactive audio experience.
export const VOICE_CONTEXT_MAX_CHARS = 30000;
export const DEFAULT_SPEAKER_NAME = 'David';
export const DEFAULT_SPEAKER_VOICE = 'Puck';

// --- UI Layout Constants ---
export const CHAT_INPUT_MAX_HEIGHT = 240;

// --- External Services Tuning ---
export const INNGEST_DEFAULT_RETRIES = 3;

// --- Type Safety Helpers ---
export const allowedSourceTypes = Object.values(AllowedSourceType) as AllowedSourceType[];

/**
 * Checks if a provided string matches one of the AllowedSourceType enum values.
 */
export const isAllowedSourceType = (
  value: string | null | undefined
): value is AllowedSourceType => {
  return !!value && allowedSourceTypes.includes(value as AllowedSourceType);
};

// --- Display Mappings ---
/**
 * Human-readable labels for the machine-readable AllowedNoteType enum.
 */
export const NOTE_TYPE_LABELS: Record<AllowedNoteType, string> = {
  [AllowedNoteType.MIND_MAP]: 'Mind Map',
  [AllowedNoteType.AUDIO_OVERVIEW]: 'Audio Overview',
  [AllowedNoteType.VIDEO_OVERVIEW]: 'Video Overview',
  [AllowedNoteType.FAQ]: 'FAQ',
  [AllowedNoteType.TIMELINE]: 'Timeline',
  [AllowedNoteType.BRIEFING_DOC]: 'Briefing Doc',
  [AllowedNoteType.SLIDE_DECK]: 'Slide Deck',
  [AllowedNoteType.INFOGRAPHIC]: 'Infographic',
  [AllowedNoteType.QUIZ]: 'Quiz',
  [AllowedNoteType.FLASH_CARDS]: 'Flash Cards',
  [AllowedNoteType.EDITABLE_NOTE]: 'Editable Note',
  [AllowedNoteType.CHAT_NOTE]: 'Chat Note',
};
