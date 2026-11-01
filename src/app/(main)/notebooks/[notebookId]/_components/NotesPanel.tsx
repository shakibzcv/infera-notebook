/* UI-only scaffold for notes panel */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  BarChart3,
  Brain,
  Calendar,
  Clock,
  Edit,
  File,
  FileAudio,
  FileText,
  Headphones,
  HelpCircle,
  Layers3,
  Loader2,
  Map,
  MessageSquare,
  Plus,
  Presentation,
  Sparkles,
  StickyNote,
  Trash,
  Video,
  X,
  ChevronDown,
} from 'lucide-react';
import { AllowedNoteType, Status } from '@/generated/prisma/enums';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useNotebookStore } from '@/hooks/use-notebook-store';
import { useSelectedNote, type SelectedNote } from '@/hooks/use-selected-note';
import { FAQ_NOTE_TYPE } from '@/types/notes';
import { DefaultNoteView, noteContentRegistry, noteNodes } from '@/lib/notes/ui-registry';
import { useInngestSubscription } from '@inngest/realtime/hooks';
import { fetchNotebookRealtimeSubscriptionToken } from '@/inngest/realtime';
import { InteractiveAgent } from '@/components/notes/audio-overview/interactive-agent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NOTE_TYPE_LABELS } from '@/lib/constants';

type Note = SelectedNote;

export type NoteTypeOption = {
  type: AllowedNoteType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

interface NotesPanelProps {
  className?: string;
  notebookId?: string | string[];
}

import { formatDistanceToNow } from 'date-fns';

const formatRelative = (date: Date) => {
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return 'Just now';
  }
};

const typeIcon = (type: AllowedNoteType) => {
  switch (type) {
    case 'MIND_MAP':
      return <Icon icon="mdi:sitemap" className="h-4 w-4" />;
    case 'AUDIO_OVERVIEW':
      return <Icon icon="mdi:headphones" className="h-4 w-4" />;
    case 'VIDEO_OVERVIEW':
      return <Icon icon="mdi:video-outline" className="h-4 w-4" />;
    case 'FAQ':
      return <Icon icon="mdi:help-circle-outline" className="h-4 w-4" />;
    case 'TIMELINE':
      return <Icon icon="mdi:calendar-clock" className="h-4 w-4" />;
    case 'BRIEFING_DOC':
      return <Icon icon="mdi:file-certificate-outline" className="h-4 w-4" />;
    case AllowedNoteType.SLIDE_DECK:
      return <Icon icon="mdi:presentation" className="h-4 w-4" />;
    case 'INFOGRAPHIC':
      return <Icon icon="mdi:chart-bar" className="h-4 w-4" />;
    case 'QUIZ':
      return <Icon icon="mdi:auto-fix" className="h-4 w-4" />;
    case 'FLASH_CARDS':
      return <Icon icon="mdi:cards-outline" className="h-4 w-4" />;
    case 'EDITABLE_NOTE':
      return <Icon icon="mdi:pencil-outline" className="h-4 w-4" />;
    case 'CHAT_NOTE':
      return <Icon icon="mdi:message-text-outline" className="h-4 w-4" />;
    default:
      return <Icon icon="mdi:note-outline" className="h-4 w-4" />;
  }
};

/**
 * NotesPanel component.
 * Manages the generation, display, and organization of various note types (Mind Maps, Audio Overviews, Quizzes, etc.).
 * Features:
 * - Real-time status updates via Inngest (SSE).
 * - Optimistic note creation and deletion.
 * - Integration with global notebook and credit stores.
 * - Multi-view support for different note types.
 */
export function NotesPanel({ className = '', notebookId }: NotesPanelProps) {
  const {
    selectedSourceIds,
    fetchCredits,
    notes,
    setNotes,
    addNote: addStoreNote,
    updateNote: updateStoreNote,
    removeNote: removeStoreNote,
    clearNotes,
  } = useNotebookStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNoteDetailLoading, setIsNoteDetailLoading] = useState(false);
  const hasSelectedSources = selectedSourceIds.length > 0;
  const { selectedNote, setSelectedNote, isNoteSelected } = useSelectedNote();
  const [selectedFaq, setSelectedFaq] = useState<any[] | null>(null);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const currentNoteConfig = useMemo(
    () => noteNodes.find((n) => n.type === selectedNote?.type),
    [selectedNote?.type]
  );
  const params = useParams<{ notebookId: string }>();
  const router = useRouter();
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const resolvedNotebookId = useMemo(
    () => (typeof notebookId === 'string' ? notebookId : params.notebookId || ''),
    [notebookId, params.notebookId]
  );

  useEffect(() => {
    const noteId = searchParams.get('noteId');
    const mode = searchParams.get('mode');

    if (noteId && notes.length > 0) {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        handleSelectNote(note);
        if (mode === 'interactive') {
          setIsInteractiveMode(true);
        }
      }
    }
  }, [notes.length]);

  // Realtime subscription for note status updates
  const { latestData: latestNoteStatus } = useInngestSubscription({
    refreshToken: async () => {
      if (!resolvedNotebookId) {
        throw new Error('No notebook selected');
      }
      return await fetchNotebookRealtimeSubscriptionToken(resolvedNotebookId);
    },
  });

  // Apply latest realtime status/title updates to notes list
  useEffect(() => {
    if (!latestNoteStatus) return;

    const messages = (
      Array.isArray(latestNoteStatus) ? latestNoteStatus : [latestNoteStatus]
    ) as any[];

    const lastMessage = messages[messages.length - 1] as any;
    if (!lastMessage || lastMessage.topic !== 'note-status') return;

    const { noteId, status, noteTitle } = lastMessage.data as {
      noteId?: string;
      status?: Status;
      noteTitle?: string;
    };
    if (!noteId || !status) return;

    updateStoreNote(noteId, {
      status,
      noteTitle: noteTitle ?? undefined,
    });

    // Keep currently selected note in sync as well
    setSelectedNote((prev) =>
      prev && prev.id === noteId
        ? {
            ...prev,
            status,
            noteTitle: noteTitle ?? prev.noteTitle,
          }
        : prev
    );
  }, [latestNoteStatus]);

  /**
   * Fetches the list of notes for the current notebook from the API.
   * Only fetches basic metadata (id, title, type, status); full content is fetched lazily.
   */
  const fetchNotes = useCallback(async () => {
    if (!resolvedNotebookId) {
      setNotes([]);
      setError('No notebook selected.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/notebooks/${resolvedNotebookId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to load notes');
      }
      const data = await response.json();
      const normalized: Note[] = Array.isArray(data.notes)
        ? data.notes.map((n: any) => {
            return {
              id: n.id ?? '',
              noteTitle: n.noteTitle ?? 'Untitled Note',
              type: (n.type as AllowedNoteType) || AllowedNoteType.EDITABLE_NOTE,
              status: (n.status as Status) ?? Status.PROCESSING,
              createdAt: n.updatedAt ? new Date(n.updatedAt) : new Date(),
              // Do not hydrate content in list view; fetched lazily when opening a note
              content: '',
            } as Note;
          })
        : [];
      setNotes(normalized);
    } catch (err) {
      console.error(err);
      setError('Unable to load notes right now.');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedNotebookId, setNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Keep selectedNote synchronized with notes store (e.g. if note is deleted or all notes cleared)
  useEffect(() => {
    if (selectedNote && !notes.some((n) => n.id === selectedNote.id)) {
      setSelectedNote(null);
    }
  }, [notes, selectedNote, setSelectedNote]);

  const anyProcessing = useMemo(() => notes.some((n) => n.status === Status.PROCESSING), [notes]);

  const addNote = (
    id: string,
    type: AllowedNoteType,
    title: string,
    status: Status = Status.PROCESSING,
    sources: { id: string }[] = []
  ) => {
    const now = new Date();
    const newNote: Note = {
      id,
      noteTitle: title,
      type,
      status,
      createdAt: now,
      content: '',
      sources,
    };
    addStoreNote(newNote);
  };

  /**
   * Orchestrates the creation of a new note.
   * 1. Generates a local UUID.
   * 2. Adds the note to the UI state immediately with Status.PROCESSING.
   * 3. Makes the API call to start background generation.
   * 4. Updates the note status/data when the API returns.
   */
  const optimisticallyCreateNoteAndPersist = async (
    type: AllowedNoteType,
    title: string,
    requireSources: boolean = true
  ) => {
    const id = crypto.randomUUID();

    // For editable notes, mark as SUCCESS immediately (no processing needed)
    const isEditableNote = type === AllowedNoteType.EDITABLE_NOTE;
    const initialStatus = isEditableNote ? Status.SUCCESS : Status.PROCESSING;

    // For editable notes, allow creation without sources
    const sourceIds = requireSources ? selectedSourceIds : [];
    const sources = sourceIds.map((sid) => ({ id: sid }));

    // Optimistic UI update
    addNote(id, type, title, initialStatus, sources);

    try {
      const response = await fetch(`/api/notebooks/${resolvedNotebookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: id,
          type,
          title,
          sourceIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const createdNote = data.note;

        // Refresh credits after successful note creation
        fetchCredits();

        // Update the note with the actual data from the server
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status: createdNote.status as Status,
                  noteTitle: createdNote.noteTitle ?? title,
                  createdAt: new Date(createdNote.createdAt || createdNote.updatedAt),
                }
              : n
          )
        );

        // If editable note and it's successful, automatically select it and fetch full content
        if (isEditableNote && createdNote.status === Status.SUCCESS) {
          // Fetch the full note content
          try {
            const detailResponse = await fetch(`/api/notebooks/${resolvedNotebookId}/notes/${id}`);
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const fullNote = detailData.note;
              const updatedNote: Note = {
                id,
                noteTitle: fullNote.noteTitle ?? title,
                type,
                status: Status.SUCCESS,
                createdAt: new Date(fullNote.createdAt || fullNote.updatedAt),
                content: fullNote.content ?? '',
                sources: fullNote.sources ?? [],
              };
              setSelectedNote(updatedNote);
              // Also update in notes list
              setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
            }
          } catch (error) {
            console.error('[NotesPanel] Failed to fetch note details', error);
            // Still select it with basic info
            const updatedNote: Note = {
              id,
              noteTitle: createdNote.noteTitle ?? title,
              type,
              status: Status.SUCCESS,
              createdAt: new Date(createdNote.createdAt || createdNote.updatedAt),
              content: createdNote.content ?? '',
              sources: createdNote.sources ?? [],
            };
            setSelectedNote(updatedNote);
          }
        }
      } else if (response.status === 403) {
        toast.error('Credits exhausted. Please wait for the daily reset.');
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } else {
        throw new Error('Failed to persist note');
      }
    } catch (error) {
      // Mark as failed if there's an error
      console.error('[NotesPanel] Failed to persist note:', error);
      toast.error('Internal Server Error');
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: Status.FAILED } : n)));
    }
  };

  const handleCancelProcessing = async (note: Note) => {
    // Optimistically remove the note from UI
    setNotes((prev) => prev.filter((n) => n.id !== note.id));

    if (!resolvedNotebookId) return;

    try {
      await fetch(`/api/notebooks/${resolvedNotebookId}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id }),
      });
    } catch (error) {
      console.error('[NotesPanel] Failed to cancel note creation:', error);
    }
  };

  const createEditable = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.EDITABLE_NOTE, 'Untitled Note', false);
  const createAudio = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.AUDIO_OVERVIEW, 'Audio Overview');
  const createVideo = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.VIDEO_OVERVIEW, 'Video Overview');
  const createMindMap = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.MIND_MAP, 'Mind Map');
  const createFAQ = () => optimisticallyCreateNoteAndPersist(AllowedNoteType.FAQ, 'FAQ');
  const createTimeline = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.TIMELINE, 'Timeline');
  const createBriefing = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.BRIEFING_DOC, 'Briefing Doc');
  const createSlideDeck = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.SLIDE_DECK, 'Slide Deck');
  const createInfographic = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.INFOGRAPHIC, 'Infographic');
  const createQuiz = () => optimisticallyCreateNoteAndPersist(AllowedNoteType.QUIZ, 'Quiz');
  const createFlashCards = () =>
    optimisticallyCreateNoteAndPersist(AllowedNoteType.FLASH_CARDS, 'Flash Cards');

  const handleRetry = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: Status.PROCESSING } : n)));
  };

  const handleDelete = async (id: string) => {
    if (!resolvedNotebookId) {
      return;
    }

    setDeletingId(id);

    // Optimistically remove the note from UI immediately
    const noteToDelete = notes.find((n) => n.id === id) || null;
    removeStoreNote(id);

    try {
      await fetch(`/api/notebooks/${resolvedNotebookId}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      });
    } catch (error) {
      console.error('[NotesPanel] Failed to delete note:', error);
      // Optional rollback on error
      if (noteToDelete) {
        addStoreNote(noteToDelete);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setSelectedFaq(null);
    setIsInteractiveMode(false);

    // Lazy-fetch full note (including content) when a note is opened
    if (!resolvedNotebookId) return;

    (async () => {
      try {
        setIsNoteDetailLoading(true);
        const response = await fetch(`/api/notebooks/${resolvedNotebookId}/notes/${note.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch note content');
        }
        const data = await response.json();
        const fullNote = data.note as {
          id: string;
          noteTitle: string;
          type: AllowedNoteType;
          status: Status;
          createdAt: string;
          content: string;
        };

        const updated: Note = {
          id: fullNote.id,
          noteTitle: fullNote.noteTitle ?? note.noteTitle,
          type: fullNote.type as AllowedNoteType,
          status: fullNote.status as Status,
          createdAt: new Date(fullNote.createdAt),
          content: fullNote.content ?? '',
          sources: (fullNote as any).sources ?? [],
        };

        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        setSelectedNote(updated);

        if (updated.type === AllowedNoteType.FAQ && updated.status === Status.SUCCESS) {
          try {
            const parsed = updated.content ? JSON.parse(updated.content) : [];
            setSelectedFaq(Array.isArray(parsed) ? parsed : []);
          } catch (error) {
            console.error('[NotesPanel] Failed to parse FAQ content', error);
            setSelectedFaq(null);
          }
        }
      } catch (error) {
        console.error('[NotesPanel] Failed to fetch note details', error);
      } finally {
        setIsNoteDetailLoading(false);
      }
    })();
  };

  const handleBackToList = () => {
    setSelectedNote(null);
    setSelectedFaq(null);
  };

  const renderSelectedNoteContent = (note: Note) => {
    if (isInteractiveMode && note.type === AllowedNoteType.AUDIO_OVERVIEW) {
      return (
        <InteractiveAgent
          noteId={note.id}
          notebookId={resolvedNotebookId}
          noteTitle={note.noteTitle || 'this topic'}
          noteContent={note.content || ''}
          onClose={() => setIsInteractiveMode(false)}
        />
      );
    }
    const Component = noteContentRegistry[note.type] ?? DefaultNoteView;
    return (
      <Component
        note={note}
        notebookId={resolvedNotebookId}
        onClose={handleBackToList}
        onInteractiveMode={() => setIsInteractiveMode(true)}
      />
    );
  };

  return (
    <div className={cn('flex pb-2 flex-col h-full text-foreground relative', className)}>
      {isNoteSelected && selectedNote ? (
        <>
          <div className="shrink-0 mb-4">
            <Breadcrumb>
              <BreadcrumbList className="text-muted-foreground">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="text-xs font-medium hover:text-foreground"
                    >
                      Notes
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage
                    className="text-xs font-semibold text-foreground truncate max-w-[200px] md:max-w-[300px]"
                    title={selectedNote.noteTitle || ''}
                  >
                    {selectedNote.noteTitle || 'Note'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {isNoteDetailLoading ? (
            <div className="flex-1 min-h-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </div>
            </div>
          ) : selectedNote.type === AllowedNoteType.MIND_MAP ||
            selectedNote.type === AllowedNoteType.FLASH_CARDS ||
            selectedNote.type === AllowedNoteType.AUDIO_OVERVIEW ? (
            <div className="flex-1 min-h-0 -mx-4 -mb-4 overflow-hidden flex flex-col">
              {renderSelectedNoteContent(selectedNote)}
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              {currentNoteConfig?.beta && (
                <div className="mb-6 p-4 rounded-xl border border-primary/10 bg-primary/5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Beta Mode
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    We're currently refining this generation. Quality may vary as we continue to
                    work on improving the output.
                  </p>
                </div>
              )}
              {renderSelectedNoteContent(selectedNote)}
            </ScrollArea>
          )}
        </>
      ) : (
        <>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 pr-3">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {noteNodes
                  .filter(
                    (n) =>
                      !(
                        [
                          AllowedNoteType.EDITABLE_NOTE,
                          AllowedNoteType.FAQ,
                          AllowedNoteType.TIMELINE,
                          AllowedNoteType.BRIEFING_DOC,
                          AllowedNoteType.SLIDE_DECK,
                          AllowedNoteType.INFOGRAPHIC,
                        ] as AllowedNoteType[]
                      ).includes(n.type)
                  )
                  .map((config) => {
                    const Icon = config.icon;
                    const handleClick =
                      config.type === AllowedNoteType.AUDIO_OVERVIEW
                        ? createAudio
                        : config.type === AllowedNoteType.VIDEO_OVERVIEW
                          ? createVideo
                          : config.type === AllowedNoteType.MIND_MAP
                            ? createMindMap
                            : config.type === AllowedNoteType.QUIZ
                              ? createQuiz
                              : createFlashCards;

                    return (
                      <Button
                        key={config.type}
                        variant="outline"
                        className="w-full justify-start relative group px-3 py-2 h-auto text-xs"
                        onClick={handleClick}
                        disabled={!hasSelectedSources}
                      >
                        <Icon className="mr-2 h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
                        <span className="truncate flex-1 text-left">{config.label}</span>
                        {config.beta && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary border border-primary/20 tracking-wider shrink-0">
                            BETA
                          </span>
                        )}
                      </Button>
                    );
                  })}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start relative group px-3 py-2 h-auto text-xs"
                      disabled={!hasSelectedSources}
                    >
                      <FileText className="mr-2 h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
                      <span className="truncate flex-1 text-left">Report</span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-56 bg-zinc-950 border-white/10 text-white"
                  >
                    {[
                      noteNodes.find((n) => n.type === AllowedNoteType.FAQ),
                      noteNodes.find((n) => n.type === AllowedNoteType.TIMELINE),
                      noteNodes.find((n) => n.type === AllowedNoteType.BRIEFING_DOC),
                      noteNodes.find((n) => n.type === AllowedNoteType.SLIDE_DECK),
                      noteNodes.find((n) => n.type === AllowedNoteType.INFOGRAPHIC),
                    ]
                      .filter(Boolean)
                      .map((config) => {
                        if (!config) return null;
                        const Icon = config.icon;
                        const isDisabled =
                          Boolean(config.disabled) ||
                          config.type === AllowedNoteType.SLIDE_DECK ||
                          config.type === AllowedNoteType.INFOGRAPHIC;

                        const handleClick = isDisabled
                          ? undefined
                          : config.type === AllowedNoteType.FAQ
                            ? createFAQ
                            : config.type === AllowedNoteType.TIMELINE
                              ? createTimeline
                              : config.type === AllowedNoteType.BRIEFING_DOC
                                ? createBriefing
                                : config.type === AllowedNoteType.SLIDE_DECK
                                  ? createSlideDeck
                                  : createInfographic;

                        return (
                          <DropdownMenuItem
                            key={config.type}
                            disabled={isDisabled}
                            onClick={handleClick}
                            className={cn(
                              'flex items-center gap-2',
                              isDisabled
                                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                                : 'cursor-pointer hover:bg-white/5 focus:bg-white/5'
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="text-xs flex-1 truncate">{config.label}</span>
                            {isDisabled ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8px] font-medium text-white/50 border border-white/10 tracking-wider">
                                DISABLED
                              </span>
                            ) : config.beta ? (
                              <span className="px-1 py-0.5 rounded-full bg-primary/10 text-[8px] font-bold text-primary border border-primary/20 tracking-wider">
                                BETA
                              </span>
                            ) : null}
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {selectedFaq && selectedFaq.length > 0 ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0b12] p-4 text-xs text-white/80">
                  <div className="space-y-4">
                    {selectedFaq.map((item, idx) => (
                      <div key={idx}>
                        {item.question}
                        {item.answer}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {error ? <div className="px-4 py-2 text-xs text-red-300">{error}</div> : null}
              <div className="grid gap-4 pb-12">
                {loading ? (
                  <>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-3 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    ))}
                  </>
                ) : notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                    <Icon
                      icon="mdi:note-outline"
                      className="h-12 w-12 text-muted-foreground/60 mb-4"
                    />
                    <p className="text-sm font-medium text-muted-foreground">No notes here yet.</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-[180px]">
                      Your generated summaries and briefings will appear here.
                    </p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id}>
                      {note.status === Status.PROCESSING ? (
                        <div className="grid grid-cols-[auto_1fr_auto] items-center p-4 bg-muted/50 rounded-lg relative overflow-hidden">
                          <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/20 to-transparent animate-shimmer"></div>
                          <div className="animate-spin relative z-10 mr-3">
                            <Loader2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 relative z-10 pr-4">
                            <p
                              className="text-sm font-medium text-foreground truncate px-1"
                              title={note.noteTitle || ''}
                            >
                              {(() => {
                                const baseText = note.noteTitle?.toLowerCase().includes('saving')
                                  ? note.noteTitle
                                  : `Generating ${note.noteTitle || NOTE_TYPE_LABELS[note.type]}`;
                                return baseText;
                              })()}
                            </p>
                            <p className="text-xs text-muted-foreground px-1 truncate">
                              Come back in a few minutes
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="relative z-10 shrink-0"
                            disabled={loading}
                            onClick={() => handleCancelProcessing(note)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : note.status === Status.FAILED ? (
                        <div className="grid grid-cols-[auto_1fr_auto] items-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="rounded-full bg-destructive/20 p-2 mr-3 shrink-0">
                            <X className="h-4 w-4 text-destructive" />
                          </div>
                          <div className="min-w-0 pr-4">
                            <p
                              className="text-sm font-medium text-destructive px-1 truncate"
                              title={note.noteTitle || ''}
                            >
                              {`Failed to generate ${note.noteTitle || NOTE_TYPE_LABELS[note.type]}`}
                            </p>
                            <p className="text-xs text-destructive/70 px-1 truncate">
                              This note could not be generated due to an error
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={deletingId === note.id}
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  {deletingId === note.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Failed Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this failed note? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[1fr_auto] items-center p-4 bg-muted/50 rounded-lg">
                          <div className="min-w-0 pr-4">
                            <button
                              type="button"
                              onClick={() => handleSelectNote(note)}
                              className="flex items-center gap-2 text-left w-full min-w-0"
                            >
                              <div className="shrink-0">{typeIcon(note.type)}</div>
                              <p
                                className="text-sm font-medium text-foreground px-1 truncate flex-1 min-w-0"
                                title={note.noteTitle || ''}
                              >
                                {note.noteTitle || 'Note'}
                              </p>
                            </button>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 px-1 truncate">
                              <span className="capitalize shrink-0">
                                {NOTE_TYPE_LABELS[note.type]}
                              </span>
                              <span className="shrink-0">•</span>
                              <span className="truncate">{formatRelative(note.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={deletingId === note.id}
                                >
                                  {deletingId === note.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this note? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Floating Action Button (FAB) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <Button
              onClick={createEditable}
              className="rounded-full shadow-xl px-5 h-11 pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 border border-white/5 transition-all active:scale-95"
            >
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">Add Note</span>
            </Button>
          </div>
        </>
      )}
      {anyProcessing && !selectedNote ? (
        <div className="mt-3 text-[11px] text-white/60">
          Processing notes may take a few seconds or minutes.
        </div>
      ) : null}
    </div>
  );
}
