import { AllowedNoteType } from '@/generated/prisma/enums';
import type { InngestStep, NoteHandlerResult, NoteHandler } from '@/lib/notes/types';

import { generateFaq } from '@/lib/notes/faq';
import { generateMindmap } from '@/lib/notes/mindmap';
import { generateTimeline } from '@/lib/notes/timeline';
import { generateBriefing } from '@/lib/notes/briefing';
import { generateQuiz } from '@/lib/notes/quiz';
import { generateFlashCards } from '@/lib/notes/flash-cards';
import { generateInfographic } from '@/lib/notes/infographic';
import { generateSlideDeck } from '@/lib/notes/slide-deck';
import { generateAudioOverview } from '@/lib/notes/audio-overview';
import { generateVideoOverview } from '@/lib/notes/video-overview';

/**
 * Note Handler Registry
 * Maps each 'AllowedNoteType' to its corresponding generator function.
 */

export const noteRegistry: Record<AllowedNoteType, NoteHandler> = {
  [AllowedNoteType.FAQ]: generateFaq,
  [AllowedNoteType.MIND_MAP]: generateMindmap,
  [AllowedNoteType.TIMELINE]: generateTimeline,
  [AllowedNoteType.BRIEFING_DOC]: generateBriefing,
  [AllowedNoteType.QUIZ]: generateQuiz,
  [AllowedNoteType.FLASH_CARDS]: generateFlashCards,
  [AllowedNoteType.INFOGRAPHIC]: generateInfographic,
  [AllowedNoteType.SLIDE_DECK]: generateSlideDeck,
  [AllowedNoteType.AUDIO_OVERVIEW]: generateAudioOverview,
  [AllowedNoteType.VIDEO_OVERVIEW]: generateVideoOverview,
  [AllowedNoteType.CHAT_NOTE]: async () => false,
  [AllowedNoteType.EDITABLE_NOTE]: async () => false,
};

export type { InngestStep, NoteHandlerResult };
