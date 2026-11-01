/**
 * Timeline Note View Component
 * Renders a chronological list of events with a vertical indicator line.
 */

import React from 'react';
import type { Note } from '@/lib/notes/ui-registry';
import { cn } from '@/lib/utils';

type TimelineItem = {
  time: string;
  content: string;
};

import { useTheme } from 'next-themes';

export const TimelineNoteView: React.FC<{ note: Note }> = ({ note }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  let items: TimelineItem[] = [];

  // 1. Data Ingestion
  // Parse the hierarchical content which can be a direct array or wrapped in an object
  try {
    const parsed = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
    if (Array.isArray(parsed)) {
      items = parsed as TimelineItem[];
    } else if (parsed && Array.isArray((parsed as any).content)) {
      // In case the raw object was saved instead of just content array
      items = (parsed as any).content as TimelineItem[];
    }
  } catch {
    // If parsing fails, fall back to an empty list
  }

  // 2. Guard: Handle empty state
  if (!items.length) {
    return (
      <div className="text-sm text-muted-foreground whitespace-pre-wrap py-4">
        No timeline entries available yet.
      </div>
    );
  }

  // 3. Render: Vertical timeline layout
  return (
    <div className="space-y-4 py-2">
      <div className="text-sm font-semibold text-primary/80 tracking-wider">Chronology</div>

      {/* Ordered list with a custom left border acting as the timeline stem */}
      <ol className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-8">
        {items.map((item, index) => (
          <li key={index} className="relative mb-6">
            {/* The dot indicator on the timeline line */}
            <div className="absolute -left-[31px] mt-1 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-[0_0_0_2px_rgba(var(--primary),0.1)]" />

            {/* Time/Date Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary mb-2">
              {item.time || `Event ${index + 1}`}
            </div>

            {/* Event Description */}
            <p className={cn('text-sm text-foreground/90 leading-relaxed max-w-2xl')}>
              {item.content}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
};
