/**
 * Note UI Registry
 * This file manages the client-side representation and rendering of different note types.
 * it defines the icons, labels, and React components used to display notes in the UI.
 */

'use client';

import React from 'react';
// Import icons for different note types
import {
  BarChart3,
  Brain,
  Clock,
  Edit,
  File,
  FileAudio,
  HelpCircle,
  Layers3,
  Presentation,
  Sparkles,
  Video,
} from 'lucide-react';

import { AllowedNoteType } from '@/generated/prisma/enums';
import type { SelectedNote } from '@/hooks/use-selected-note';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ViewLoading = () => (
  <div className="flex flex-col gap-3 p-4 w-full">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

// Dynamically import view components to avoid bundling heavy libraries (ReactFlow, Wavesurfer, BlockNote, Remotion) on initial load
const FaqNoteView = dynamic(
  () => import('@/components/notes/faq/faq-note-view').then((m) => m.FaqNoteView),
  { loading: ViewLoading, ssr: false }
);
const MindmapNoteView = dynamic(
  () => import('@/components/notes/mindmap/mindmap-note-view').then((m) => m.MindmapNoteView),
  { loading: ViewLoading, ssr: false }
);
const TimelineNoteView = dynamic(
  () => import('@/components/notes/timeline/timeline-note-view').then((m) => m.TimelineNoteView),
  { loading: ViewLoading, ssr: false }
);
const BriefingNoteView = dynamic(
  () => import('@/components/notes/briefing/briefing-note-view').then((m) => m.BriefingNoteView),
  { loading: ViewLoading, ssr: false }
);
const QuizNoteView = dynamic(
  () => import('@/components/notes/quiz/quiz-note-view').then((m) => m.QuizNoteView),
  { loading: ViewLoading, ssr: false }
);
const FlashCardsNoteView = dynamic(
  () =>
    import('@/components/notes/flash-cards/flash-cards-note-view').then(
      (m) => m.FlashCardsNoteView
    ),
  { loading: ViewLoading, ssr: false }
);
const InfographicNoteView = dynamic(
  () =>
    import('@/components/notes/infographic/infographic-note-view').then(
      (m) => m.InfographicNoteView
    ),
  { loading: ViewLoading, ssr: false }
);
const SlideDeckNoteView = dynamic(
  () =>
    import('@/components/notes/slide-deck/slide-deck-note-view').then((m) => m.SlideDeckNoteView),
  { loading: ViewLoading, ssr: false }
);
const AudioOverviewNoteView = dynamic(
  () =>
    import('@/components/notes/audio-overview/audio-overview-note-view').then(
      (m) => m.AudioOverviewNoteView
    ),
  { loading: ViewLoading, ssr: false }
);
const VideoOverviewNoteView = dynamic(
  () =>
    import('@/components/notes/video-overview/video-overview-note-view').then(
      (m) => m.VideoOverviewNoteView
    ),
  { loading: ViewLoading, ssr: false }
);
const EditableNoteView = dynamic(
  () =>
    import('@/components/notes/editable-note/editable-note-view').then((m) => m.EditableNoteView),
  { loading: ViewLoading, ssr: false }
);
const ChatNoteView = dynamic(
  () => import('@/components/notes/chat-note/chat-note-view').then((m) => m.ChatNoteView),
  { loading: ViewLoading, ssr: false }
);

// Alias for SelectedNote type used throughout the UI
export type Note = SelectedNote;

/**
 * Definition for a note type option in the UI (e.g., in the 'Create Note' menu)
 */
export type NoteTypeOption = {
  type: AllowedNoteType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  beta?: boolean;
  disabled?: boolean;
};

/**
 * List of available note types displayed in the application with their respective UI metadata
 */
export const noteNodes: NoteTypeOption[] = [
  {
    type: AllowedNoteType.AUDIO_OVERVIEW,
    label: 'Audio Overview',
    description: 'Generate an audio summary from your sources.',
    icon: FileAudio,
  },
  {
    type: AllowedNoteType.VIDEO_OVERVIEW,
    label: 'Video Overview',
    description: 'Create a short video-style overview of the content.',
    icon: Video,
  },
  {
    type: AllowedNoteType.MIND_MAP,
    label: 'Mindmap',
    description: 'Visual mindmap of the key ideas.',
    icon: Brain,
  },
  {
    type: AllowedNoteType.FAQ,
    label: 'FAQ',
    description: 'Common questions and answers.',
    icon: HelpCircle,
  },
  {
    type: AllowedNoteType.TIMELINE,
    label: 'Timeline',
    description: 'Chronological breakdown of events.',
    icon: Clock,
  },
  {
    type: AllowedNoteType.BRIEFING_DOC,
    label: 'Briefing Doc',
    description: 'Concise written briefing.',
    icon: File,
  },
  {
    type: AllowedNoteType.SLIDE_DECK,
    label: 'Slide Deck',
    description: 'Slide-style summary of the material.',
    icon: Presentation,
    beta: true,
    disabled: true,
  },
  {
    type: AllowedNoteType.INFOGRAPHIC,
    label: 'Infographic',
    description: 'Visual infographic of key points.',
    icon: BarChart3,
    beta: true,
    disabled: true,
  },
  {
    type: AllowedNoteType.QUIZ,
    label: 'Quiz',
    description: 'Questions to test understanding.',
    icon: Sparkles,
  },
  {
    type: AllowedNoteType.FLASH_CARDS,
    label: 'Flash Cards',
    description: 'Flash cards for spaced repetition.',
    icon: Layers3,
  },
  {
    type: AllowedNoteType.EDITABLE_NOTE,
    label: 'Note',
    description: 'Simple editable note.',
    icon: Edit,
  },
];

/**
 * Common prop structure for all Note View components
 */
export type NoteContentComponent = React.ComponentType<{
  note: Note;
  notebookId?: string;
  onClose?: () => void;
  onInteractiveMode?: () => void;
}>;

/**
 * Default fallback view if a specific component is not found or content is missing
 */
export const DefaultNoteView: NoteContentComponent = ({ note, notebookId }) => (
  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
    {note.content || 'No content available yet.'}
  </div>
);

/**
 * Utility to wrap note view components and ensure they follow the standard prop signature
 * @param Component - The React component to wrap
 */
const wrapNoteView = (
  Component: React.ComponentType<{ note: SelectedNote; [key: string]: any }>
): NoteContentComponent => {
  return ({ note, notebookId, onClose, onInteractiveMode }) => (
    <Component
      note={note}
      notebookId={notebookId}
      onClose={onClose}
      onInteractiveMode={onInteractiveMode}
    />
  );
};

/**
 * Note Content Registry
 * Maps each 'AllowedNoteType' to its corresponding React component for rendering.
 * Used by the NoteDetail component to switch between different visualization styles.
 */
export const noteContentRegistry: Record<AllowedNoteType, NoteContentComponent> = {
  [AllowedNoteType.FAQ]: wrapNoteView(FaqNoteView),
  [AllowedNoteType.MIND_MAP]: wrapNoteView(MindmapNoteView),
  [AllowedNoteType.CHAT_NOTE]: ChatNoteView,
  [AllowedNoteType.EDITABLE_NOTE]: EditableNoteView,
  [AllowedNoteType.AUDIO_OVERVIEW]: wrapNoteView(AudioOverviewNoteView),
  [AllowedNoteType.VIDEO_OVERVIEW]: wrapNoteView(VideoOverviewNoteView),
  [AllowedNoteType.TIMELINE]: wrapNoteView(TimelineNoteView),
  [AllowedNoteType.BRIEFING_DOC]: wrapNoteView(BriefingNoteView),
  [AllowedNoteType.SLIDE_DECK]: wrapNoteView(SlideDeckNoteView),
  [AllowedNoteType.INFOGRAPHIC]: wrapNoteView(InfographicNoteView),
  [AllowedNoteType.QUIZ]: wrapNoteView(QuizNoteView),
  [AllowedNoteType.FLASH_CARDS]: wrapNoteView(FlashCardsNoteView),
};
