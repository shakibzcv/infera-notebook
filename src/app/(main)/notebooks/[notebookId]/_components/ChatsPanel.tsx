'use client';

import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/chat/chat-input';
import {
  MessageSquare,
  CopyIcon,
  Check,
  ImageIcon,
  Sparkles,
  Search,
  Save,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useNotebookStore } from '@/hooks/use-notebook-store';
import { useChatStore } from '@/hooks/use-chat-store';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
  MessageAttachments,
  MessageAttachment,
} from '@/components/ai-elements/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';
import { Source } from '@/components/ai-elements/sources';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { cn } from '@/lib/utils';
import { AllowedNoteType, Status } from '@/generated/prisma/enums';

interface ChatsPanelProps {
  className?: string;
  notebookId?: string;
}

// Helper component for Source with trigger and content
const SourceTrigger = ({
  showFavicon,
  ...props
}: { showFavicon?: boolean } & React.ComponentProps<'div'>) => {
  return (
    <div className="flex items-center gap-2 shrink-0" {...props}>
      {showFavicon && (
        <div className="h-4 w-4 rounded bg-muted flex items-center justify-center">
          <span className="text-[8px]">🔗</span>
        </div>
      )}
    </div>
  );
};

const SourceContent = ({
  title,
  description,
  ...props
}: { title?: string; description?: string } & React.ComponentProps<'div'>) => {
  return (
    <div className="flex flex-col gap-1 min-w-0" {...props}>
      {title && <span className="text-sm font-medium truncate">{title}</span>}
      {description && (
        <span className="text-xs text-muted-foreground line-clamp-2">{description}</span>
      )}
    </div>
  );
};

// Loading component with shimmer text and icon
const LoadingWithShimmer = ({
  text,
  icon: Icon,
}: {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="inline-flex items-center gap-2 text-xs">
    {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
    <TextShimmer className="text-muted-foreground">{text}</TextShimmer>
  </div>
);

// WebSearchLoading component
const WebSearchLoading = ({ loadingText }: { loadingText: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
    <span>{loadingText}</span>
  </div>
);

// ChatSkeleton component
const ChatSkeleton = () => (
  <>
    <Message from="user">
      <MessageContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-2 w-16 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </MessageContent>
    </Message>
    <Message from="assistant">
      <MessageContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-2 w-20 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-4 w-56 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        </div>
      </MessageContent>
    </Message>
  </>
);

/**
 * ChatsPanel component.
 * Manages the interactive chat interface within a notebook.
 * Features:
 * - Real-time AI streaming responses (managed manually with fetch & SSE).
 * - Tool invocation support (Vector search, Web search).
 * - "Stop" generation capability.
 * - Ability to save assistant messages as notes.
 * - Persistent chat history.
 */
export function ChatsPanel({ className = '', notebookId }: ChatsPanelProps) {
  const {
    selectedSourceIds,
    sources,
    fetchCredits,
    credits,
    currentNotebook,
    addNote: addStoreNote,
    updateNote: updateStoreNote,
    removeNote: removeStoreNote,
  } = useNotebookStore();
  const {
    messages,
    status,
    sendMessage,
    handleStop,
    inputValue,
    setInputValue,
    isLoadingHistory,
    fetchMessages,
    chats,
    activeChatId,
    fetchChats,
    startNewChat,
    createNewChat,
    deleteChat,
    selectChat,
    pendingMessage,
    setPendingMessage,
  } = useChatStore();

  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null);
  const [isDeletingChatId, setIsDeletingChatId] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Get selected source objects
  const selectedSources = sources.filter((s) => selectedSourceIds.includes(s.id));

  // Get notebookId from prop or currentNotebook
  const activeNotebookId = notebookId || currentNotebook?.id;

  // Fetch chats and active messages on mount
  useEffect(() => {
    if (activeNotebookId) {
      fetchChats(activeNotebookId);
    }
  }, [activeNotebookId, fetchChats]);

  // Active chat metadata
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activeChatDisplayTitle = activeChatId
    ? activeChat?.title?.trim() || 'Untitled chat'
    : 'New chat';

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      // If no sources are selected, use all available sources for this notebook
      const finalSourceIds =
        selectedSourceIds.length > 0 ? selectedSourceIds : sources.map((s) => s.id);

      sendMessage(
        {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        {
          body: {
            sourceIds: finalSourceIds,
            notebookId: activeNotebookId,
          },
        }
      );

      setInputValue('');
    },
    [selectedSourceIds, sources, sendMessage, activeNotebookId]
  );

  // Listen for external message requests (e.g. from Quiz or other note components)
  useEffect(() => {
    if (pendingMessage) {
      handleSendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [pendingMessage, handleSendMessage, setPendingMessage]);

  const handleCopy = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  }, []);

  /**
   * Saves the content of an AI message as a new note in the current notebook.
   * Directly updates the global Zustand store for reactive UI updates across panels.
   *
   * @param messageContent - The markdown/text content to save
   */
  const handleSaveAsNote = useCallback(
    async (messageContent: string) => {
      if (credits <= 0) {
        toast.error('Credits exhausted. Please wait for the daily reset.');
        return;
      }

      const noteId = crypto.randomUUID();
      const placeholderTitle = 'Saving note...';
      setSavingNoteId(noteId);

      // Optimistically add note to Zustand store
      const optimisticNote = {
        id: noteId,
        noteTitle: placeholderTitle,
        type: AllowedNoteType.CHAT_NOTE,
        status: Status.PROCESSING,
        createdAt: new Date(),
        content: '',
      };
      addStoreNote(optimisticNote);

      try {
        // Create note
        const response = await fetch(`/api/notebooks/${activeNotebookId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId,
            type: AllowedNoteType.CHAT_NOTE,
            title: placeholderTitle,
            content: messageContent,
            sourceIds: selectedSourceIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save note');
        }

        const data = await response.json();
        const createdNote = data.note;

        // Refresh credits after successful note creation
        fetchCredits();

        const updatedData = {
          id: noteId,
          noteTitle: createdNote.noteTitle ?? placeholderTitle,
          status: createdNote.status as Status,
          createdAt: new Date(createdNote.createdAt || createdNote.updatedAt),
          content: createdNote.content ?? messageContent,
        };

        // Update note in Zustand store
        updateStoreNote(noteId, updatedData);
        toast.success('Note saved successfully');
      } catch (error) {
        console.error('[ChatsPanel] Failed to save note:', error);
        toast.error('Failed to save note');

        // Remove failed note from store
        removeStoreNote(noteId);
      } finally {
        setSavingNoteId(null);
      }
    },
    [
      activeNotebookId,
      selectedSourceIds,
      credits,
      fetchCredits,
      addStoreNote,
      updateStoreNote,
      removeStoreNote,
    ]
  );

  // Disable chat input if no sources are selected
  const hasSelectedSources = selectedSourceIds.length > 0;
  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-background px-2 py-4 text-sm text-muted-foreground xl:px-6',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2 shrink-0">
        {/* Unboxed, borderless chat title selector (No heavy container/box) */}
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDeleteChatId(null);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer outline-none select-none max-w-[220px] sm:max-w-[320px] text-left"
              title={`Active chat: ${activeChatDisplayTitle}`}
            >
              <span className="truncate">{activeChatDisplayTitle}</span>
              <ChevronDown className="size-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[300px] p-1.5 rounded-xl border border-border bg-popover shadow-xl z-50"
          >
            {/* Start new chat inside dropdown */}
            <DropdownMenuItem
              onClick={() => {
                startNewChat();
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
            >
              <Plus className="size-4 shrink-0" />
              <span>Start new chat</span>
            </DropdownMenuItem>

            {chats.length > 0 && <DropdownMenuSeparator className="my-1 bg-border/60" />}

            {chats.length > 0 && (
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Chats ({chats.length})
              </div>
            )}

            {/* Scrollable chat list with selection and delete actions */}
            <div className="max-h-[240px] overflow-y-auto space-y-0.5 pr-0.5">
              {chats.map((chat, idx) => {
                const isActive = chat.id === activeChatId;
                const titleText = chat.title?.trim() || 'Untitled chat';
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      if (confirmDeleteChatId === chat.id) return;
                      if (activeNotebookId) {
                        selectChat(activeNotebookId, chat.id);
                      }
                    }}
                    className={cn(
                      'group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-foreground hover:bg-accent/60'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isActive ? (
                        <Check className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <MessageSquare className="size-3.5 text-muted-foreground/60 shrink-0" />
                      )}
                      <span className="truncate">{titleText}</span>
                    </div>

                    {/* Delete chat action: if confirmation active, show Confirm (Yes) & Cancel buttons */}
                    {confirmDeleteChatId === chat.id ? (
                      <div
                        className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          title="Confirm delete"
                          disabled={isDeletingChatId === chat.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (activeNotebookId) {
                              try {
                                setIsDeletingChatId(chat.id);
                                await deleteChat(activeNotebookId, chat.id);
                              } finally {
                                setIsDeletingChatId(null);
                                setConfirmDeleteChatId(null);
                              }
                            }
                          }}
                          className="size-6 flex items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isDeletingChatId === chat.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          disabled={isDeletingChatId === chat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteChatId(null);
                          }}
                          className="size-6 flex items-center justify-center rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Delete chat"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteChatId(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100 size-6 flex items-center justify-center rounded-md hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-all shrink-0 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Icon-only button for new chat */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="New chat"
          onClick={() => {
            startNewChat();
          }}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="min-h-0 flex-1 pb-4 xl:px-2">
          <Conversation className="h-full">
            <ConversationContent>
              {isLoadingHistory ? (
                <ChatSkeleton />
              ) : messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<MessageSquare className="size-12" />}
                  title="Start a conversation"
                  description="Type a message below to begin chatting"
                />
              ) : (
                <>
                  {messages.map((message, messageIndex) => {
                    const parts = Array.isArray(message.parts) ? message.parts : [];

                    // Debug: log message structure for assistant messages
                    if (message.role === 'assistant' && status === 'streaming') {
                      console.log('[ChatsPanel] Assistant message parts:', {
                        messageId: message.id,
                        partsCount: parts.length,
                        parts: parts.map((p: any) => ({
                          type: p.type,
                          state: p.state,
                          toolCallId: p.toolCallId,
                        })),
                      });
                    }

                    const isLastAssistant = (() => {
                      for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'assistant') {
                          return messageIndex === i;
                        }
                      }
                      return false;
                    })();

                    // Extract files from message (check both files property and parts)
                    const messageFiles = (message as any).files || [];
                    const fileParts =
                      parts.filter(
                        (part: any) => part.type === 'file' || part.type === 'attachment'
                      ) || [];

                    // Combine files from both sources
                    const allFiles = [
                      ...messageFiles,
                      ...fileParts.map((part: any) => ({
                        id: part.id,
                        url: part.url,
                        name: part.name || part.filename,
                        mediaType: part.mediaType || part.type,
                      })),
                    ];

                    return (
                      <Message from={message.role} key={message.id}>
                        {/* Display file attachments if present */}
                        {allFiles.length > 0 && (
                          <MessageAttachments className="mb-2">
                            {allFiles.map((file: any) => (
                              <MessageAttachment
                                key={file.id || file.url}
                                data={{
                                  type: 'file',
                                  url: file.url,
                                  mediaType:
                                    file.mediaType || file.type || 'application/octet-stream',
                                  filename: file.name || file.filename,
                                }}
                              />
                            ))}
                          </MessageAttachments>
                        )}

                        <MessageContent>
                          {(() => {
                            // Check if this is a streaming assistant message with no text yet
                            const textParts = parts.filter(
                              (part: any) =>
                                part.type === 'text' && (part.text?.trim() || part.content?.trim())
                            );
                            const hasTextParts = textParts.length > 0;
                            const isStreamingAssistant =
                              message.role === 'assistant' &&
                              isLastAssistant &&
                              status === 'streaming';

                            // Check if there are any active tool calls (loading states)
                            const hasActiveToolCalls = parts.some((part: any) => {
                              if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                                const toolCall = part;
                                // Vector search tool
                                if (toolCall.type === 'tool-searchInVectorStore') {
                                  const isLoading =
                                    (toolCall.state === 'input-streaming' ||
                                      toolCall.state === 'input-available') &&
                                    !(toolCall.state === 'output-available' && toolCall.output);
                                  return isLoading;
                                }
                                // Other tool calls in loading state
                                return toolCall.state === 'input-streaming';
                              }
                              return false;
                            });

                            const hasReasoningParts = parts.some(
                              (part: any) =>
                                part.type === 'reasoning' &&
                                (part.reasoning?.trim() || part.text?.trim())
                            );

                            if (
                              isStreamingAssistant &&
                              !hasTextParts &&
                              !hasActiveToolCalls &&
                              !hasReasoningParts
                            ) {
                              return (
                                <div className="flex items-center gap-1.5 py-1 text-muted-foreground/70">
                                  <span className="size-2 rounded-full bg-primary/60 animate-pulse" />
                                  <span className="size-2 rounded-full bg-primary/60 animate-pulse [animation-delay:200ms]" />
                                  <span className="size-2 rounded-full bg-primary/60 animate-pulse [animation-delay:400ms]" />
                                </div>
                              );
                            }

                            return null;
                          })()}
                          {parts
                            .filter(
                              (part: any) => part.type !== 'file' && part.type !== 'attachment'
                            )
                            .map((part: any, i: number) => {
                              const key = `${message.id}-${i}`;

                              if (part.type === 'text') {
                                const text = part.text ?? part.content ?? '';
                                if (!text) return null;

                                return (
                                  <div key={key} className="flex flex-col gap-1">
                                    <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5">
                                      {text}
                                    </MessageResponse>
                                    {(message as any).version && (
                                      <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        Version {(message as any).version}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              if (part.type === 'reasoning') {
                                const reasoningText =
                                  part.reasoning ?? part.text ?? part.content ?? '';
                                const isStreaming = Boolean(part.isStreaming);
                                if (!reasoningText) return null;

                                return (
                                  <Reasoning key={key} className="w-full" isStreaming={isStreaming}>
                                    <ReasoningTrigger />
                                    <ReasoningContent>{reasoningText}</ReasoningContent>
                                  </Reasoning>
                                );
                              }

                              // Inline sources (if model emits a dedicated sources part)
                              if (part.type === 'sources') {
                                const sourcesList = part.sources ?? [];
                                if (!sourcesList.length) return null;

                                return (
                                  <div
                                    key={key}
                                    className="mb-3 flex flex-wrap justify-start gap-2"
                                  >
                                    {sourcesList.map((source: any) => {
                                      const href = source.file?.path ?? source.url ?? source.href;
                                      if (!href) return null;

                                      const title =
                                        source.title ??
                                        source.name ??
                                        source.file?.path ??
                                        source.url ??
                                        href;

                                      return (
                                        <div
                                          key={href}
                                          className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors"
                                        >
                                          <SourceTrigger showFavicon />
                                          <Source
                                            href={href}
                                            title={title}
                                            className="flex items-center gap-2"
                                          >
                                            <SourceContent
                                              title={title}
                                              description={source.description}
                                            />
                                          </Source>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              // Inline tool calls (loading + results)
                              if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                                const toolCall = part;

                                // Search in vector store tool
                                if (toolCall.type === 'tool-searchInVectorStore') {
                                  // Debug logging
                                  console.log('[ChatsPanel] Tool call:', {
                                    type: toolCall.type,
                                    state: toolCall.state,
                                    hasInput: !!toolCall.input,
                                    hasOutput: !!toolCall.output,
                                    toolCallId: toolCall.toolCallId,
                                  });

                                  const isLoading =
                                    toolCall.state === 'input-streaming' ||
                                    toolCall.state === 'input-available';
                                  const hasOutput =
                                    toolCall.state === 'output-available' && toolCall.output;

                                  // Show loading indicator while tool is being called (input streaming or available, but not output yet)
                                  if (isLoading && !hasOutput) {
                                    console.log('[ChatsPanel] Showing loading indicator');
                                    return (
                                      <div key={key} className="my-2">
                                        <LoadingWithShimmer
                                          text="Exploring your materials"
                                          icon={Search}
                                        />
                                      </div>
                                    );
                                  }

                                  // Don't render anything when output is available, let the text response handle it
                                  if (hasOutput) {
                                    console.log('[ChatsPanel] Tool output available, hiding UI');
                                    return null;
                                  }

                                  // If state is undefined or unknown, don't render
                                  console.log('[ChatsPanel] Tool state unknown:', toolCall.state);
                                  return null;
                                }

                                // Web search tool
                                if (toolCall.type === 'tool-webSearch') {
                                  const input = toolCall.input as { query?: string } | undefined;
                                  const output = toolCall.output as
                                    | {
                                        answer?: string;
                                        results?: {
                                          title?: string;
                                          url?: string;
                                          content?: string;
                                          favicon?: string | null;
                                        }[];
                                      }
                                    | undefined;

                                  const isLoading = toolCall.state === 'input-streaming';
                                  const hasOutput = toolCall.state === 'output-available' && output;

                                  const results = output?.results ?? [];

                                  if (isLoading) {
                                    const text =
                                      input?.query && input.query.trim().length > 0
                                        ? `Searching web for "${input.query}"..`
                                        : 'Searching web..';

                                    return (
                                      <div key={key} className="my-2">
                                        <WebSearchLoading loadingText={text} />
                                      </div>
                                    );
                                  }

                                  if (hasOutput && results.length > 0) {
                                    return (
                                      <div key={key} className="mt-2 flex flex-wrap gap-2">
                                        {results.map((item, index) => {
                                          if (!item.url) return null;

                                          return (
                                            <div
                                              key={item.url ?? index}
                                              className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors"
                                            >
                                              <SourceTrigger showFavicon />
                                              <Source
                                                href={item.url}
                                                title={item.title || item.url}
                                                className="flex items-center gap-2"
                                              >
                                                <SourceContent
                                                  title={item.title || item.url}
                                                  description={item.content}
                                                />
                                              </Source>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  return null;
                                }

                                // Extract web URL tool
                                if (toolCall.type === 'tool-extractWebUrl') {
                                  const input = toolCall.input as { urls?: string[] } | undefined;
                                  const output = toolCall.output as
                                    | {
                                        success?: boolean;
                                        urls?: string[];
                                        results?: {
                                          url?: string;
                                          content?: string;
                                          favicon?: string | null;
                                        }[];
                                        response_time?: number;
                                        error?: string;
                                        message?: string;
                                      }
                                    | undefined;

                                  const isLoading = toolCall.state === 'input-streaming';
                                  const hasOutput = toolCall.state === 'output-available' && output;

                                  const results = output?.results ?? [];
                                  const urls = input?.urls ?? output?.urls ?? [];

                                  if (isLoading) {
                                    const text =
                                      urls.length > 0
                                        ? `Extracting content from ${
                                            urls.length
                                          } URL${urls.length > 1 ? 's' : ''}..`
                                        : 'Extracting content..';

                                    return (
                                      <div key={key} className="my-2">
                                        <WebSearchLoading loadingText={text} />
                                      </div>
                                    );
                                  }

                                  if (hasOutput && results.length > 0) {
                                    return (
                                      <div key={key} className="mt-2 flex flex-wrap gap-2">
                                        {results.map((item, index) => {
                                          if (!item.url) return null;

                                          return (
                                            <div
                                              key={item.url ?? index}
                                              className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors"
                                            >
                                              <SourceTrigger showFavicon />
                                              <Source
                                                href={item.url}
                                                title={item.url}
                                                className="flex items-center gap-2"
                                              >
                                                <SourceContent
                                                  title={item.url}
                                                  description={item.content}
                                                />
                                              </Source>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  return null;
                                }

                                // Image-to-image generation tool
                                if (toolCall.type === 'tool-imageToImage') {
                                  const input = toolCall.input as
                                    | {
                                        imageUrl?: string;
                                        prompt?: string;
                                        mimeType?: string;
                                      }
                                    | undefined;
                                  const output = toolCall.output as
                                    | {
                                        success?: boolean;
                                        image?: string; // Cloudinary URL
                                        publicId?: string;
                                        prompt?: string;
                                        error?: string;
                                      }
                                    | undefined;

                                  const isLoading = toolCall.state === 'input-streaming';
                                  const hasOutput = toolCall.state === 'output-available' && output;

                                  if (isLoading) {
                                    return (
                                      <div key={key} className="my-2">
                                        <WebSearchLoading loadingText="Generating image from your image.." />
                                      </div>
                                    );
                                  }

                                  if (hasOutput && output.success && output.image) {
                                    const imageSrc = output.image;

                                    return (
                                      <div
                                        key={key}
                                        className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                      >
                                        <div className="p-3 bg-muted/50 border-b border-border/40">
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ImageIcon className="h-4 w-4" />
                                            <span className="font-medium">
                                              Generated Image (from your image)
                                            </span>
                                          </div>
                                          {input?.prompt && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Prompt: &quot;{input.prompt}&quot;
                                            </p>
                                          )}
                                        </div>
                                        <div className="p-4 flex justify-center bg-background">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={imageSrc}
                                            alt={input?.prompt || 'Generated image'}
                                            className="max-w-full h-auto rounded-md shadow-sm"
                                            style={{
                                              maxWidth: '100%',
                                              height: 'auto',
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (hasOutput && !output.success) {
                                    return (
                                      <div
                                        key={key}
                                        className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                      >
                                        <p className="font-medium">Image generation failed</p>
                                        <p className="text-xs mt-1">
                                          {output.error || 'Unknown error occurred'}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return null;
                                }

                                // Image generation tool
                                if (toolCall.type === 'tool-generateImage') {
                                  const input = toolCall.input as
                                    | {
                                        prompt?: string;
                                        width?: number;
                                        height?: number;
                                      }
                                    | undefined;
                                  const output = toolCall.output as
                                    | {
                                        success?: boolean;
                                        image?: string;
                                        prompt?: string;
                                        width?: number;
                                        height?: number;
                                        error?: string;
                                        path?: string;
                                      }
                                    | undefined;

                                  const isLoading = toolCall.state === 'input-streaming';
                                  const hasOutput = toolCall.state === 'output-available' && output;

                                  if (isLoading) {
                                    return (
                                      <div key={key} className="my-2">
                                        <WebSearchLoading loadingText="Generating image.." />
                                      </div>
                                    );
                                  }

                                  if (hasOutput && output.success && output.image) {
                                    const imageSrc = output.image;

                                    return (
                                      <div
                                        key={key}
                                        className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                      >
                                        <div className="p-3 bg-muted/50 border-b border-border/40">
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ImageIcon className="h-4 w-4" />
                                            <span className="font-medium">Generated Image</span>
                                          </div>
                                          {input?.prompt && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Prompt: &quot;{input.prompt}&quot;
                                            </p>
                                          )}
                                        </div>
                                        <div className="p-4 flex justify-center bg-background">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={imageSrc}
                                            alt={input?.prompt || 'Generated image'}
                                            className="max-w-full h-auto rounded-md shadow-sm"
                                            style={{
                                              maxWidth: '100%',
                                              height: 'auto',
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (hasOutput && !output.success) {
                                    return (
                                      <div
                                        key={key}
                                        className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                      >
                                        <p className="font-medium">Image generation failed</p>
                                        <p className="text-xs mt-1">
                                          {output.error || 'Unknown error occurred'}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return null;
                                }

                                // Text-to-Speech tool
                                if (toolCall.type === 'tool-textToSpeech') {
                                  const input = toolCall.input as
                                    | {
                                        text?: string;
                                      }
                                    | undefined;
                                  const output = toolCall.output as
                                    | {
                                        success?: boolean;
                                        audioUrl?: string;
                                        text?: string;
                                        error?: string;
                                        path?: string;
                                      }
                                    | undefined;

                                  const isLoading = toolCall.state === 'input-streaming';
                                  const hasOutput = toolCall.state === 'output-available' && output;

                                  if (isLoading) {
                                    return (
                                      <div key={key} className="my-2">
                                        <WebSearchLoading loadingText="Generating speech..." />
                                      </div>
                                    );
                                  }

                                  if (hasOutput && output.success && output.audioUrl) {
                                    return (
                                      <div
                                        key={key}
                                        className="my-3 rounded-lg border border-border/40 overflow-hidden bg-muted/30"
                                      >
                                        <div className="p-3 bg-muted/50 border-b border-border/40">
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="font-medium">Generated Audio</span>
                                          </div>
                                          {input?.text && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                              &quot;{input.text}&quot;
                                            </p>
                                          )}
                                        </div>
                                        <div className="p-4 flex justify-center bg-background">
                                          <audio
                                            controls
                                            src={output.audioUrl}
                                            className="w-full"
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (hasOutput && !output.success) {
                                    return (
                                      <div
                                        key={key}
                                        className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                                      >
                                        <p className="font-medium">Speech generation failed</p>
                                        <p className="text-xs mt-1">
                                          {output.error || 'Unknown error occurred'}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return null;
                                }

                                // Other tools – no custom UI yet
                                return null;
                              }

                              return null;
                            })}
                        </MessageContent>

                        {message.role === 'assistant' && (
                          <>
                            {status !== 'streaming' && (
                              <MessageActions className="mt-1">
                                {(() => {
                                  const textPart = Array.isArray(message.parts)
                                    ? (message.parts as any[]).find(
                                        (p) => p.type === 'text' && (p.text || p.content)
                                      )
                                    : null;
                                  const textToCopy = textPart?.text ?? textPart?.content ?? '';
                                  if (!textToCopy) return null;

                                  return (
                                    <>
                                      <MessageAction
                                        label={copiedMessageId === message.id ? 'Copied' : 'Copy'}
                                        onClick={() => handleCopy(textToCopy, message.id)}
                                        tooltip={
                                          copiedMessageId === message.id
                                            ? 'Copied!'
                                            : 'Copy this response'
                                        }
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check className="size-4 text-green-500" />
                                        ) : (
                                          <CopyIcon className="size-4" />
                                        )}
                                      </MessageAction>
                                      <MessageAction
                                        label="Save as Note"
                                        onClick={() => handleSaveAsNote(textToCopy)}
                                        tooltip="Save this message as a note"
                                        disabled={savingNoteId !== null}
                                      >
                                        {savingNoteId ? (
                                          <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                          <Save className="size-4" />
                                        )}
                                      </MessageAction>
                                    </>
                                  );
                                })()}
                              </MessageActions>
                            )}
                          </>
                        )}

                        {message.role === 'user' && (
                          <MessageActions className="mt-1 flex justify-end">
                            {(() => {
                              const textPart = Array.isArray(message.parts)
                                ? (message.parts as any[]).find(
                                    (p) => p.type === 'text' && (p.text || p.content)
                                  )
                                : null;
                              const textToCopy = textPart?.text ?? textPart?.content ?? '';
                              if (!textToCopy) return null;

                              return (
                                <MessageAction
                                  label={copiedMessageId === message.id ? 'Copied' : 'Copy'}
                                  onClick={() => handleCopy(textToCopy, message.id)}
                                  tooltip={
                                    copiedMessageId === message.id ? 'Copied!' : 'Copy your message'
                                  }
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="size-4 text-green-500" />
                                  ) : (
                                    <CopyIcon className="size-4" />
                                  )}
                                </MessageAction>
                              );
                            })()}
                          </MessageActions>
                        )}
                      </Message>
                    );
                  })}
                </>
              )}

              <div ref={listEndRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="shrink-0 px-2 pb-4 xl:px-2">
          <ChatInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={() => handleSendMessage(inputValue)}
            onStop={handleStop}
            isLoading={isLoading}
            disabled={status === 'submitted'} // Only disable while INITIAL submission is in flight (before stream starts)
            submitDisabled={!inputValue.trim()}
            maxHeight={100}
            infoMessage={!hasSelectedSources ? 'Chatting using all sources by default' : undefined}
          />
        </div>
      </div>
    </div>
  );
}
