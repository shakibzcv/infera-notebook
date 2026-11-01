import { create } from 'zustand';
import { useNotebookStore } from './use-notebook-store';
import { toast } from 'sonner';

/**
 * Zustand store for managing chat state globally.
 * Implements lazy chat session creation:
 * - Clicking "New Chat" enters a draft state with 0 database rows created.
 * - The chat record is only created when the user sends their first message.
 */

export type ChatStatus = 'idle' | 'streaming' | 'submitted';

export interface ChatSession {
  id: string;
  notebookId: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    messages: number;
  };
}

export interface ChatStore {
  chats: ChatSession[];
  activeChatId: string | null;
  isLoadingChats: boolean;
  messages: any[];
  inputValue: string;
  status: ChatStatus;
  isLoadingHistory: boolean;
  pendingMessage: string | null;

  // Setters
  setChats: (chats: ChatSession[]) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  setInputValue: (value: string) => void;
  setStatus: (status: ChatStatus) => void;
  setIsLoadingHistory: (loading: boolean) => void;
  setPendingMessage: (message: string | null) => void;

  // Actions
  fetchChats: (notebookId: string) => Promise<ChatSession[]>;
  startNewChat: () => void;
  createNewChat: (notebookId: string, title?: string) => Promise<ChatSession | null>;
  deleteChat: (notebookId: string, chatId: string) => Promise<void>;
  deleteAllChats: (notebookId: string) => Promise<void>;
  selectChat: (notebookId: string, chatId: string) => Promise<void>;
  fetchMessages: (notebookId: string, chatId?: string) => Promise<void>;
  sendMessage: (userMessage: any, options: { body: any }) => Promise<void>;
  handleStop: () => void;
  clearMessages: () => void;
}

let abortController: AbortController | null = null;

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoadingChats: false,
  messages: [],
  inputValue: '',
  status: 'idle',
  isLoadingHistory: false,
  pendingMessage: null,

  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setMessages: (messages) => {
    if (typeof messages === 'function') {
      set((state) => ({ messages: messages(state.messages) }));
    } else {
      set({ messages });
    }
  },
  setInputValue: (inputValue) => set({ inputValue }),
  setStatus: (status) => set({ status }),
  setIsLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),
  setPendingMessage: (pendingMessage) => set({ pendingMessage }),

  fetchChats: async (notebookId: string) => {
    if (!notebookId) return [];

    try {
      set({ isLoadingChats: true });
      const response = await fetch(`/api/notebooks/${notebookId}/chats`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      const chats: ChatSession[] = data.chats || [];
      set({ chats });

      // If activeChatId is set and valid, keep it; otherwise select the latest chat if available
      const currentActiveId = get().activeChatId;
      if (chats.length > 0) {
        const exists = chats.some((c) => c.id === currentActiveId);
        if (!currentActiveId || !exists) {
          const nextActive = chats[chats.length - 1]?.id || chats[0].id;
          set({ activeChatId: nextActive });
          get().fetchMessages(notebookId, nextActive);
        }
      } else {
        // No chats exist -> remain in draft state
        set({ activeChatId: null, messages: [] });
      }

      return chats;
    } catch (error) {
      console.error('[ChatStore] Failed to fetch chats:', error);
      return [];
    } finally {
      set({ isLoadingChats: false });
    }
  },

  /**
   * Enter draft new chat state without creating anything in the database yet.
   */
  startNewChat: () => {
    set({
      activeChatId: null,
      messages: [],
      inputValue: '',
      status: 'idle',
    });
  },

  createNewChat: async (notebookId: string, title?: string) => {
    if (!notebookId) return null;

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Failed to create new chat');
      const data = await response.json();
      const newChat: ChatSession = data.chat;

      set((state) => ({
        chats: [...state.chats, newChat],
        activeChatId: newChat.id,
        messages: [],
      }));

      return newChat;
    } catch (error) {
      console.error('[ChatStore] Failed to create new chat:', error);
      toast.error('Failed to start new chat');
      return null;
    }
  },

  deleteChat: async (notebookId: string, chatId: string) => {
    if (!notebookId || !chatId) return;

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/chats?chatId=${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      const remainingChats = get().chats.filter((c) => c.id !== chatId);
      set({ chats: remainingChats });

      // If we deleted the active chat, switch to the latest remaining or draft
      if (get().activeChatId === chatId) {
        if (remainingChats.length > 0) {
          const nextChat = remainingChats[remainingChats.length - 1];
          set({ activeChatId: nextChat.id });
          get().fetchMessages(notebookId, nextChat.id);
        } else {
          // No chats left -> stay in clean draft state
          set({ activeChatId: null, messages: [] });
        }
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('[ChatStore] Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  },

  deleteAllChats: async (notebookId: string) => {
    if (!notebookId) return;

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/chats`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete all chats');

      // Reset to clean draft state (zero database rows)
      set({ chats: [], activeChatId: null, messages: [] });
    } catch (error) {
      console.error('[ChatStore] Failed to delete all chats:', error);
      throw error;
    }
  },

  selectChat: async (notebookId: string, chatId: string) => {
    if (!chatId || get().activeChatId === chatId) return;
    set({ activeChatId: chatId, messages: [] });
    await get().fetchMessages(notebookId, chatId);
  },

  fetchMessages: async (notebookId: string, chatId?: string) => {
    if (!notebookId) return;
    const targetChatId = chatId || get().activeChatId;

    if (!targetChatId) {
      // In draft state, no messages to fetch
      set({ messages: [] });
      return;
    }

    try {
      set({ isLoadingHistory: true });
      const url = `/api/notebooks/${notebookId}/messages?chatId=${targetChatId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      set({ messages: data.messages || [] });
    } catch (error) {
      console.error('[ChatStore] Failed to fetch messages:', error);
      set({ messages: [] });
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  handleStop: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    set((state) => {
      const messages = state.messages;
      if (messages.length === 0) return { status: 'idle' };

      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== 'assistant' || !Array.isArray(lastMsg.parts)) return { status: 'idle' };

      const updatedParts = lastMsg.parts.map((part: any) => {
        if (part.type === 'reasoning' && (part.isStreaming || part.state === 'input-streaming')) {
          return {
            ...part,
            isStreaming: false,
            state: part.state === 'input-streaming' ? 'input-available' : part.state,
          };
        }
        return part;
      });

      return {
        messages: [...messages.slice(0, -1), { ...lastMsg, parts: updatedParts }],
        status: 'idle',
      };
    });
  },

  sendMessage: async (userMessage, options) => {
    const { status, messages } = get();
    if (status !== 'idle') return;

    const notebookId = options?.body?.notebookId;
    let targetChatId = get().activeChatId;

    // LAZY CHAT CREATION:
    // If in draft state, create the chat record now upon sending the first message!
    if (!targetChatId && notebookId) {
      const firstText =
        (typeof userMessage.content === 'string' && userMessage.content) ||
        (Array.isArray(userMessage.parts) &&
          userMessage.parts.find((p: any) => p.type === 'text')?.text) ||
        '';
      const title = firstText.trim().slice(0, 32) || 'Untitled chat';

      try {
        const chatRes = await fetch(`/api/notebooks/${notebookId}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled chat' }),
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const createdChat: ChatSession = {
            ...chatData.chat,
            title, // Optimistic preview in UI
          };
          targetChatId = createdChat.id;
          set((state) => ({
            chats: [...state.chats, createdChat],
            activeChatId: targetChatId,
          }));
        }
      } catch (err) {
        console.error('[ChatStore] Lazy chat creation error:', err);
      }
    }

    // Abort old request if any
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    // 1. Add user message optimistically
    const newUserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: userMessage.parts,
      createdAt: new Date(),
    };

    const updatedMessages = [...messages, newUserMessage];
    set({ messages: updatedMessages, status: 'submitted' });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: Array.isArray(m.parts)
              ? m.parts.find((p: any) => p.type === 'text')?.text || ''
              : '',
            parts: m.parts,
            toolInvocations: m.toolInvocations || [],
          })),
          chatId: targetChatId,
          ...options.body,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('Credits exhausted')) {
          toast.error('Credits exhausted. Please wait for the daily reset.');
        } else {
          toast.error(errorData.error || 'Internal Server Error');
        }
        set({ status: 'idle' });
        return;
      }

      set({ status: 'streaming' });
      useNotebookStore.getState().fetchCredits();

      // 2. Prepare assistant message
      const assistantMessageId = crypto.randomUUID();
      const initialAssistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        parts: [],
        createdAt: new Date(),
      };
      set((state) => ({ messages: [...state.messages, initialAssistantMessage] }));

      // 3. Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '').trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'error') {
                toast.error(data.message || 'AI streaming error');
                continue;
              }

              set((state) => {
                const targetIdx = state.messages.findIndex((m) => m.id === assistantMessageId);
                if (targetIdx === -1) return state;

                const currentAssistant = state.messages[targetIdx];
                const newParts = [...(currentAssistant.parts || [])];

                const isText =
                  data.type === 'text' ||
                  data.type === 'chunk' ||
                  (data.text !== undefined &&
                    data.type !== 'reasoning' &&
                    data.type !== 'thought' &&
                    data.type !== 'tool_call' &&
                    data.type !== 'tool-call' &&
                    data.type !== 'tool_result' &&
                    data.type !== 'tool-result' &&
                    data.type !== 'error');
                const isReasoning = data.type === 'reasoning' || data.type === 'thought';
                const isToolCall = data.type === 'tool_call' || data.type === 'tool-call';
                const isToolResult = data.type === 'tool_result' || data.type === 'tool-result';

                // Close reasoning stream state as soon as text or tool starts
                if (isText || isToolCall) {
                  const rIdx = newParts.findIndex((p: any) => p.type === 'reasoning');
                  if (rIdx !== -1 && newParts[rIdx].isStreaming) {
                    newParts[rIdx] = {
                      ...newParts[rIdx],
                      isStreaming: false,
                      state: 'output-available',
                    };
                  }
                }

                if (isReasoning) {
                  const reasoningChunk = data.content ?? data.reasoning ?? data.text ?? '';
                  if (reasoningChunk) {
                    const rIdx = newParts.findIndex((p: any) => p.type === 'reasoning');
                    if (rIdx === -1) {
                      newParts.push({
                        type: 'reasoning',
                        reasoning: reasoningChunk,
                        text: reasoningChunk,
                        isStreaming: true,
                        state: 'input-streaming',
                      });
                    } else {
                      const prevReasoning = newParts[rIdx].reasoning ?? newParts[rIdx].text ?? '';
                      newParts[rIdx] = {
                        ...newParts[rIdx],
                        reasoning: prevReasoning + reasoningChunk,
                        text: prevReasoning + reasoningChunk,
                        isStreaming: true,
                        state: 'input-streaming',
                      };
                    }
                  }
                } else if (isText) {
                  const textChunk = data.content ?? data.text ?? '';
                  if (textChunk) {
                    const tIdx = newParts.findIndex((p: any) => p.type === 'text');
                    if (tIdx === -1) {
                      newParts.push({
                        type: 'text',
                        text: textChunk,
                      });
                    } else {
                      newParts[tIdx] = {
                        ...newParts[tIdx],
                        text: (newParts[tIdx].text || '') + textChunk,
                      };
                    }
                  }
                } else if (isToolCall) {
                  const toolCallId = data.id || data.toolCallId;
                  const toolName = data.name || data.toolName;
                  const tcIdx = newParts.findIndex(
                    (p: any) =>
                      (toolCallId && p.toolCallId === toolCallId) || p.type === `tool-${toolName}`
                  );
                  if (tcIdx === -1) {
                    newParts.push({
                      type: `tool-${toolName}`,
                      toolCallId,
                      args: data.args,
                      input: data.args,
                      state: 'input-streaming',
                    });
                  } else {
                    newParts[tcIdx] = {
                      ...newParts[tcIdx],
                      args: data.args,
                      input: data.args,
                      state: 'input-streaming',
                    };
                  }
                } else if (isToolResult) {
                  const toolCallId = data.id || data.toolCallId;
                  const output = data.result ?? data.output;
                  const toolName = data.name || data.toolName;
                  const tcIdx = newParts.findIndex(
                    (p: any) =>
                      (toolCallId && p.toolCallId === toolCallId) ||
                      (toolName && p.type === `tool-${toolName}`)
                  );
                  if (tcIdx !== -1) {
                    newParts[tcIdx] = {
                      ...newParts[tcIdx],
                      output,
                      state: 'output-available',
                    };
                  }
                }

                const updatedMessages = [...state.messages];
                updatedMessages[targetIdx] = {
                  ...currentAssistant,
                  parts: newParts,
                };

                return { messages: updatedMessages };
              });
            } catch (e) {
              console.error('[ChatStore] Error parsing SSE message:', e);
            }
          }
        }
      }

      set((state) => {
        const messages = state.messages;
        if (messages.length === 0) return { status: 'idle' };

        const targetIdx = messages.findIndex((m) => m.id === assistantMessageId);
        if (targetIdx === -1) return { status: 'idle' };

        const lastMsg = messages[targetIdx];
        if (lastMsg.role !== 'assistant' || !Array.isArray(lastMsg.parts))
          return { status: 'idle' };

        const updatedParts = lastMsg.parts.map((part: any) => {
          if (part.type === 'reasoning' && part.isStreaming) {
            return { ...part, isStreaming: false, state: 'output-available' };
          }
          return part;
        });

        const updatedMessages = [...messages];
        updatedMessages[targetIdx] = { ...lastMsg, parts: updatedParts };

        return {
          messages: updatedMessages,
          status: 'idle',
        };
      });
      abortController = null;

      // Refresh chats in background to capture any auto-generated titles
      if (options?.body?.notebookId) {
        get().fetchChats(options.body.notebookId);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('[ChatStore] Streaming Error:', error);
      toast.error('Internal Server Error');
      if (abortController?.signal === signal) {
        abortController = null;
      }

      set((state) => {
        const messages = state.messages;
        if (messages.length === 0) return { status: 'idle' };

        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role !== 'assistant' || !Array.isArray(lastMsg.parts))
          return { status: 'idle' };

        const updatedParts = lastMsg.parts.map((part: any) => {
          if (part.type === 'reasoning' && part.isStreaming) {
            return { ...part, isStreaming: false };
          }
          return part;
        });

        return {
          messages: [...messages.slice(0, -1), { ...lastMsg, parts: updatedParts }],
          status: 'idle',
        };
      });

      if (abortController?.signal === signal) {
        abortController = null;
      }
    }
  },
  clearMessages: () => set({ messages: [] }),
}));
