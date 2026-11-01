/**
 * Video Overview Note View Component
 * Main container for the interactive AI video overview.
 * Combines an SVG/Remotion-based video player with a scrollable script transcript.
 */

'use client';

import RemotionPlayer from './remotion-player';
import { useSignedUrls } from '@/hooks/use-signed-urls';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';

type Props = {
  note: SelectedNote; // The note object containing URLs and script data
};

export function VideoOverviewNoteView({ note }: Props) {
  const rawContent = note?.content;

  const parsed = useMemo(() => {
    if (!rawContent) return null;
    try {
      const json = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

      // Structural validation check
      if (json && typeof json === 'object' && 'path' in json) {
        return {
          path: (json as any).path,
          captions: Array.isArray((json as any).captions) ? (json as any).captions : [],
          // Normalize the images array to always contain objects with paths
          images: Array.isArray((json as any).images)
            ? (json as any).images.map((img: { path?: string; sceneContent?: string }) =>
                typeof img === 'string'
                  ? { path: img }
                  : { path: img.path || (img as any), sceneContent: img.sceneContent }
              )
            : [],
          videoScript: (json as any).videoScript || '',
        };
      }
    } catch (error) {
      console.error('[VideoOverviewNoteView] Failed to parse content', error);
    }
    return null;
  }, [rawContent]);

  // Collect all paths to resolve (audio + images)
  const allPaths = useMemo(() => {
    if (!parsed) return [];
    return [parsed.path, ...parsed.images.map((img: { path: string }) => img.path)].filter(Boolean);
  }, [parsed]);

  const { urls: resolvedUrls, loading: isResolving, error: resolveError } = useSignedUrls(allPaths);

  // Prepare data for RemotionPlayer with resolved URLs
  const videoData = useMemo(() => {
    if (!parsed || isResolving) return null;
    return {
      audioUrl: resolvedUrls[parsed.path] || '',
      captions: parsed.captions,
      images: (parsed.images as { path: string; sceneContent?: string }[]).map((img) => ({
        url: resolvedUrls[img.path] || '',
        sceneContent: img.sceneContent,
      })),
      videoScript: parsed.videoScript,
    };
  }, [parsed, resolvedUrls, isResolving]);

  // 2. Guard: Handle missing or incomplete content
  if (resolveError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive text-center">
        Failed to resolve video assets: {resolveError}
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0b12] p-4 text-xs text-white/60">
        No video overview content available yet.
      </div>
    );
  }

  if (isResolving || !videoData) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="size-8 animate-spin text-primary/50" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Assembling your video...
        </p>
      </div>
    );
  }

  // 3. Render: Simplified layout (Video only)
  return (
    <div className="h-full flex flex-col py-4 overflow-x-hidden">
      {/* Remotion Player Section */}
      <div className="rounded-xl overflow-hidden shadow-2xl border border-white/5">
        <RemotionPlayer videoData={videoData} />
      </div>
    </div>
  );
}
