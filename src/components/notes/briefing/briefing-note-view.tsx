/**
 * Briefing Note View Component
 * Renders a briefing document using a clean, prose-focused layout.
 * Optimized for reading long-form assistant responses.
 */

import React from 'react';
import type { Note } from '@/lib/notes/ui-registry';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/**
 * Renders the markdown content of a briefing note.
 * Handles the edge case where content might be a double-encoded JSON string.
 */
export const BriefingNoteView: React.FC<{ note: Note }> = ({ note }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const raw = typeof note.content === 'string' ? note.content : String(note.content ?? '');

  // 1. Sanitize/Normalize content
  // Sometimes AI output or database storage results in a JSON-encoded string (e.g., "\"# Title\\n...\"")
  let markdown = raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      markdown = parsed;
    }
  } catch {
    // If not valid JSON, we assume it's already raw markdown and use as-is
  }

  // 2. Render using the standard AI Message UI components with prose styling
  return (
    <div className="flex w-full justify-center">
      <Message from="assistant" className="w-full max-w-3xl">
        <MessageContent className="bg-transparent px-0 py-0">
          <MessageResponse
            className={cn(
              'prose max-w-none transition-colors',
              isDark ? 'prose-invert' : 'prose-slate'
            )}
          >
            {markdown}
          </MessageResponse>
        </MessageContent>
      </Message>
    </div>
  );
};
