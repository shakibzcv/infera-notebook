/**
 * Chat Note View Component
 * Renders a note that originated from a chat interaction.
 * Focuses on maintaining the conversational flow and style.
 */

'use client';

import React from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import { MessageResponse } from '@/components/ai-elements/message';

type Props = {
  note: SelectedNote; // The specific note being viewed
  notebookId?: string; // Optional context for the notebook
};

export function ChatNoteView({ note }: Props) {
  // Use note content directly as text/markdown
  const content = note?.content || '';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Prose-invert wrapper with specific overrides for chat readability */}
        <div className="prose prose-invert max-w-none">
          <MessageResponse className="[&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto">
            {content}
          </MessageResponse>
        </div>
      </div>
    </div>
  );
}
