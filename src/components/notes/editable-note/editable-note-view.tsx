/**
 * Editable Note View Component
 * A full-featured rich text editor using BlockNote (ProseMirror-based).
 * Supports real-time auto-save for both title and content, with debouncing
 * to minimize API pressure.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import { useTheme } from 'next-themes';
import '@blocknote/core/fonts/inter.css';
import { useCreateBlockNote, useEditorChange } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';

type Props = {
  note: SelectedNote; // The note object from state/DB
  notebookId?: string; // Required for making API updates
};

/**
 * Custom debounce hook to prevent excessive API calls during typing.
 * @param callback - Function to execute after delay
 * @param delay - Milliseconds to wait
 */
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

export function EditableNoteView({ note, notebookId }: Props) {
  const { resolvedTheme } = useTheme(); // Respect global app theme (dark/light)

  // 1. Component State
  const [title, setTitle] = useState(note?.noteTitle || ''); // Syncs with <input>
  const [isUpdating, setIsUpdating] = useState(false); // Shows a saving spinner

  // Sync title when the note prop is updated externally (e.g. from the list)
  useEffect(() => {
    setTitle(note?.noteTitle || '');
  }, [note?.noteTitle]);

  /**
   * 2. Content Initialization
   * BlockNote requires a specific JSON schema. We either parse existing JSON
   * or wrap raw string content into a paragraph block.
   */
  const getInitialContent = () => {
    if (!note?.content) {
      return [{ type: 'paragraph', content: '' }];
    }

    try {
      const parsed = JSON.parse(note.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      // Logic for converting legacy plain-text notes to the editor format
      if (typeof note.content === 'string' && note.content.trim()) {
        return [{ type: 'paragraph', content: note.content }];
      }
    }

    return [{ type: 'paragraph', content: '' }];
  };

  // 3. Editor Instance
  const editor = useCreateBlockNote({
    initialContent: getInitialContent(),
  });

  /**
   * 4. External Syncing
   * If the note ID or content changes from outside (e.g. navigation),
   * we must update the editor state while avoiding infinite loops.
   */
  useEffect(() => {
    if (!note?.id) return;

    const currentContent = JSON.stringify(editor.document);
    if (currentContent === note.content) return;

    if (!note.content || note.content.trim() === '') {
      editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: '' }]);
      return;
    }

    try {
      const parsed = JSON.parse(note.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        editor.replaceBlocks(editor.document, parsed);
      }
    } catch (error) {
      if (typeof note.content === 'string' && note.content.trim()) {
        editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: note.content }]);
      }
    }
  }, [note?.id, note?.content]);

  /**
   * 5. Persistence Logic: Title
   * Saves the note title to the backend after 1 second of inactivity.
   */
  const debouncedSaveTitle = useDebounce(async (newTitle: string) => {
    if (!note?.id || !notebookId || newTitle === note?.noteTitle) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/notebooks/${notebookId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error('Failed to update note title');
    } catch (error) {
      console.error('Failed to update note title:', error);
    } finally {
      setIsUpdating(false);
    }
  }, 1000);

  /**
   * 6. Persistence Logic: Content
   * Saves the editor document (as JSON) to the backend after 3 seconds of inactivity.
   */
  const debouncedSaveContent = useDebounce(async (newContent: string) => {
    if (!note?.id || !notebookId || newContent === note?.content) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/notebooks/${notebookId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) throw new Error('Failed to update note content');
    } catch (error) {
      console.error('Failed to update note content:', error);
    } finally {
      setIsUpdating(false);
    }
  }, 3000);

  // 7. Event Listeners
  useEditorChange(async (editor) => {
    const content = JSON.stringify(editor.document);
    debouncedSaveContent(content);
  }, editor);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navigate from title to editor content on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      editor.focus();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section: Title Input & Save Status */}
      <div className="shrink-0 mb-6">
        <div className="flex items-center gap-2 mb-2 ml-10">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            className="w-full px-3 py-2 bg-transparent focus:outline-none dark:text-white font-bold text-2xl"
            placeholder="Note title..."
          />
          {isUpdating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>
      </div>

      {/* Main Interaction Area: Block Editor */}
      <div className="flex-1 min-h-0">
        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          className="bg-transparent bn-small-text"
        />
      </div>
    </div>
  );
}
