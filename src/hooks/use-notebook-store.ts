import { create } from 'zustand';
import { Status } from '@/generated/prisma/enums';
import type { Source, Note, Notebook } from '@/types/notes';

export type SourceStatus = Status;
export type { Source, Note, Notebook };

type StateUpdater<T> = T | ((prev: T) => T);

/**
 * Zustand store for managing the application's global notebook state.
 * Orchestrates notebooks, sources, notes, selection state, and user credits.
 */
export interface NotebookStore {
  /** Array of all notebooks available to the user */
  notebooks: Notebook[];
  setNotebooks: (notebooks: StateUpdater<Notebook[]>) => void;
  /** Array of sources associated with the active notebook */
  sources: Source[];
  setSources: (sources: StateUpdater<Source[]>) => void;
  addSource: (source: Source) => void;
  updateSource: (sourceId: string, updates: Partial<Source>) => void;
  removeSource: (sourceId: string) => void;
  /** Array of notes associated with the active notebook */
  notes: Note[];
  setNotes: (notes: StateUpdater<Note[]>) => void;
  addNote: (note: Note) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  removeNote: (noteId: string) => void;
  clearNotes: () => void;
  /** List of UUIDs for sources currently selected in the sidebar */
  selectedSourceIds: string[];
  setSelectedSourceIds: (ids: string[]) => void;
  toggleSourceSelection: (sourceId: string, checked: boolean) => void;
  selectAllSources: (checked: boolean) => void;
  /** The currently active notebook object */
  currentNotebook: Notebook | null;
  setCurrentNotebook: (notebook: Notebook | null) => void;
  /** User's available credits for AI operations */
  credits: number;
  setCredits: (credits: number) => void;
  /** Async action to refresh the user's credit balance from the server */
  fetchCredits: () => Promise<void>;
}

export const useNotebookStore = create<NotebookStore>((set) => ({
  notebooks: [],
  setNotebooks: (updater) =>
    set((state) => ({
      notebooks: typeof updater === 'function' ? updater(state.notebooks) : updater,
    })),
  sources: [],
  setSources: (updater) =>
    set((state) => ({
      sources: typeof updater === 'function' ? updater(state.sources) : updater,
    })),
  addSource: (source) => set((state) => ({ sources: [source, ...state.sources] })),
  updateSource: (sourceId, updates) =>
    set((state) => ({
      sources: state.sources.map((s) => (s.id === sourceId ? { ...s, ...updates } : s)),
    })),
  removeSource: (sourceId) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== sourceId),
      selectedSourceIds: state.selectedSourceIds.filter((id) => id !== sourceId),
    })),
  notes: [],
  setNotes: (updater) =>
    set((state) => ({
      notes: typeof updater === 'function' ? updater(state.notes) : updater,
    })),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (noteId, updates) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
    })),
  removeNote: (noteId) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== noteId),
    })),
  clearNotes: () => set({ notes: [] }),
  selectedSourceIds: [],
  setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),
  toggleSourceSelection: (sourceId, checked) =>
    set((state) => ({
      selectedSourceIds: checked
        ? [...state.selectedSourceIds, sourceId]
        : state.selectedSourceIds.filter((id) => id !== sourceId),
    })),
  selectAllSources: (checked) =>
    set((state) => ({
      selectedSourceIds: checked ? state.sources.map((s) => s.id) : [],
    })),
  currentNotebook: null,
  setCurrentNotebook: (notebook) => set({ currentNotebook: notebook }),
  credits: 0,
  setCredits: (credits) => set({ credits }),
  fetchCredits: async () => {
    try {
      const res = await fetch('/api/user/credits');
      const data = await res.json();
      if (typeof data.credits === 'number') {
        set({ credits: data.credits });
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  },
}));
