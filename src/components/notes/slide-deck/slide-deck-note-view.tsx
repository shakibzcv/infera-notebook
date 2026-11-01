/**
 * Slide Deck Note View Component
 * Renders a sequence of AI-generated slides (images) in a scrollable list.
 */

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useSignedUrls } from '@/hooks/use-signed-urls';
import { Loader2 } from 'lucide-react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import type { SLIDE_DECK_NOTE_TYPE } from '@/types/notes';

type Slide = SLIDE_DECK_NOTE_TYPE['content'][number];

export function SlideDeckNoteView({ note }: { note: SelectedNote }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rawContent = note?.content;

  let slides: Slide[] = [];

  // Parse content
  if (typeof rawContent === 'string') {
    try {
      const parsed = JSON.parse(rawContent) as
        | {
            content?: Slide[];
            slides?: Slide[];
          }
        | Slide[];

      if (Array.isArray(parsed)) {
        slides = parsed;
      } else if (parsed && Array.isArray(parsed.content)) {
        slides = parsed.content;
      } else if (parsed && Array.isArray(parsed.slides)) {
        slides = parsed.slides;
      }
    } catch {
      slides = [];
    }
  } else if (rawContent && typeof rawContent === 'object') {
    // Same logic for already-parsed objects
    const obj = rawContent as {
      content?: Slide[];
      slides?: Slide[];
    };
    if (Array.isArray(obj.content)) {
      slides = obj.content;
    } else if (Array.isArray(obj.slides)) {
      slides = obj.slides;
    }
  }

  // State to track if image resolution is complete
  const slidePaths = useMemo(() => slides.map((s: Slide) => s.path), [slides]);
  const {
    urls: resolvedUrls,
    loading: isResolving,
    error: resolveError,
  } = useSignedUrls(slidePaths);

  // 2. Guard: Handle missing content or error
  if (resolveError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive text-center">
        Failed to resolve slide images: {resolveError}
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground text-center">
        No slide deck available yet.
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="size-8 animate-spin text-primary/50" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Preparing your slides...
        </p>
      </div>
    );
  }

  // 3. Render: Display slides as stacked widescreen cards
  return (
    <div className="mt-4 flex flex-col items-center gap-8 w-full">
      {slides.map((slide: Slide, index: number) => (
        <div
          key={index}
          className={cn(
            'w-full max-w-3xl rounded-xl border overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]',
            isDark ? 'border-white/10 bg-black/40' : 'border-black/5 bg-slate-100'
          )}
        >
          {/* Slide Visual Area */}
          <div className="w-full bg-black relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedUrls[slide.path] || ''}
              alt={slide.title || `Slide ${index + 1}`}
              className="w-full h-auto aspect-video object-contain bg-black"
              loading="lazy"
            />

            {/* Slide Index Badge */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white/60">
              {String(index + 1).padStart(2, '0')}
            </div>
          </div>

          {/* Optional: Title overlay or footer if needed in future */}
        </div>
      ))}
    </div>
  );
}
