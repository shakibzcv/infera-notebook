/**
 * Infographic Note View Component
 * Displays the AI-generated infographic image with proper scaling and fallback.
 */

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useSignedUrls } from '@/hooks/use-signed-urls';
import { Loader2 } from 'lucide-react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import type { InfographicImageNoteType } from '@/types/notes';

export function InfographicNoteView({ note }: { note: SelectedNote }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const rawContent = note?.content;

  let path: string | null = null;

  // ... (parsing logic)
  if (typeof rawContent === 'string') {
    try {
      const parsed = JSON.parse(rawContent) as Partial<InfographicImageNoteType>;
      if (parsed && typeof parsed === 'object' && parsed.path) {
        path = parsed.path;
      } else {
        // Fallback for older notes or raw path strings
        path = rawContent;
      }
    } catch {
      // Fallback for older notes or raw path strings
      path = rawContent;
    }
  } else if (rawContent && typeof rawContent === 'object') {
    const obj = rawContent as Partial<InfographicImageNoteType>;
    path = obj.path || null;
  }

  const { getUrl, loading: isResolving, error: resolveError } = useSignedUrls(path || '');
  const imageUrl = path ? getUrl(path) : null;

  // 2. Guard: Handle missing image data or error
  if (resolveError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive text-center">
        Failed to resolve infographic image: {resolveError}
      </div>
    );
  }

  if (!path) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground text-center">
        No infographic image available yet.
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="size-8 animate-spin text-primary/50" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Generating your visual...
        </p>
      </div>
    );
  }

  // 3. Render the visual asset
  return (
    <div className="mt-4 flex w-full justify-center">
      <img
        src={imageUrl || ''}
        alt={note?.noteTitle ?? 'Infographic'}
        // Scale to a maximum height to prevent excessive scrolling while maintaining aspect ratio
        className={cn(
          'max-h-[720px] w-auto rounded-xl border object-contain shadow-2xl',
          isDark ? 'border-white/10' : 'border-black/5'
        )}
        loading="lazy"
      />
    </div>
  );
}
