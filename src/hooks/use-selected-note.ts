import { useState } from 'react';
import type { SelectedNote } from '@/types/notes';

export type { SelectedNote };

/**
 * Simple hook to manage the state of the currently selected/active note.
 * Used for orchestration between the NotesPanel and the NoteViewer (Chat note, Quiz, etc.).
 */
export function useSelectedNote() {
  const [selectedNote, setSelectedNote] = useState<SelectedNote | null>(null);
  /** Helper to check if a valid note is currently being viewed. */
  const isNoteSelected = !!selectedNote;

  return { selectedNote, setSelectedNote, isNoteSelected };
}
