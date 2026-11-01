/**
 * Mindmap Note View Component
 * Renders an interactive, zoomable mindmap from a hierarchical tree structure.
 * Includes robust normalization logic to handle varying AI output shapes.
 */

import React from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import MindmapCanvas, { MindmapNode } from '@/components/mindmap/mindmap-canvas';

type MindmapPayload = {
  title: string;
  content: MindmapNode;
};

function normalizeMindmapNode(node: any, fallbackTitle: string, depth = 0): MindmapNode {
  // Extract or generate a label
  const label =
    typeof node?.label === 'string' ? node.label : typeof node === 'string' ? node : fallbackTitle;

  // Ensure every node has a unique ID for React keys and Canvas mapping
  const idBase =
    typeof node?.id === 'string'
      ? node.id
      : label.toLowerCase().replace(/\s+/g, '-').slice(0, 40) || 'node';

  // Recursively process children
  const childrenRaw = Array.isArray(node?.children) ? node.children : [];
  const children: MindmapNode[] = childrenRaw.map((child: any, index: number) => {
    // Handle string-only children by wrapping them in a node object
    if (typeof child === 'string') {
      const childLabel = child;
      const childId =
        `${idBase}-${index}` || childLabel.toLowerCase().replace(/\s+/g, '-').slice(0, 40);

      return {
        id: childId,
        label: childLabel,
        expanded: false,
        children: [],
      };
    }
    // Deeply normalize nested objects
    return normalizeMindmapNode(child, fallbackTitle, depth + 1);
  });

  return {
    id: idBase,
    label,
    expanded: depth === 0, // Root expanded, children collapsed
    children,
  };
}

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Minimize2, Loader2, Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function MindmapNoteView({ note, onClose }: { note: SelectedNote; onClose?: () => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isExpanded, setIsExpanded] = React.useState(true); // Default to expanded dialog
  const [isDownloading, setIsDownloading] = React.useState(false);
  const mindmapRef = React.useRef<{ handleDownload: (title: string) => Promise<void> }>(null);
  const rawContent = note?.content;

  const handleDownload = async () => {
    if (!mindmapRef.current || isDownloading) return;

    try {
      setIsDownloading(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await mindmapRef.current.handleDownload(parsed?.title || 'mindmap');
    } catch (err) {
      console.error('[MindmapNoteView] Download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1. Data Parsing & Shape Normalization
  const parsed = React.useMemo(() => {
    if (!rawContent) return null;
    let payload: MindmapPayload | null = null;

    if (typeof rawContent === 'string') {
      try {
        const json = JSON.parse(rawContent);
        if (json && typeof json === 'object') {
          if ('title' in json && 'content' in json) {
            payload = {
              title:
                typeof (json as any).title === 'string'
                  ? (json as any).title
                  : (note?.noteTitle ?? ''),
              content: normalizeMindmapNode((json as any).content, note?.noteTitle ?? ''),
            };
          } else if ('id' in json && 'label' in json) {
            payload = {
              title: note?.noteTitle ?? '',
              content: normalizeMindmapNode(json, note?.noteTitle ?? ''),
            };
          }
        }
      } catch (error) {
        console.error('[MindmapNoteView] Failed to parse mindmap content', error);
      }
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      if ('title' in rawContent && 'content' in rawContent) {
        payload = {
          title:
            typeof (rawContent as any).title === 'string'
              ? (rawContent as any).title
              : (note?.noteTitle ?? ''),
          content: normalizeMindmapNode((rawContent as any).content, note?.noteTitle ?? ''),
        };
      } else if ('id' in rawContent && 'label' in rawContent) {
        payload = {
          title: note?.noteTitle ?? '',
          content: normalizeMindmapNode(rawContent, note?.noteTitle ?? ''),
        };
      }
    }
    return payload;
  }, [rawContent, note?.noteTitle]);

  // 2. Guard: Handle empty state
  if (!parsed || !parsed.content) {
    return (
      <div
        className={cn(
          'mt-4 rounded-xl border p-4 text-xs transition-colors',
          isDark
            ? 'border-white/10 bg-[#0b0b12] text-white/60'
            : 'border-black/5 bg-slate-50 text-slate-500'
        )}
      >
        No mindmap content available yet.
      </div>
    );
  }

  // 3. Render: Dual-mode View (Inline or Dialog)

  // Compact / Inline View (Rendered inside NotesPanel detail area)
  if (!isExpanded) {
    return (
      <div className="w-full h-full bg-transparent relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300 min-h-[500px]">
        {/* Floating Header Info */}
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-0.5 pointer-events-none text-left">
          <h2
            className={cn(
              'text-sm font-bold tracking-tight',
              isDark ? 'text-white/50' : 'text-slate-900/50'
            )}
          >
            {parsed.title}
          </h2>
          <div
            className={cn(
              'text-[10px] font-medium ml-0.5',
              isDark ? 'text-white/20' : 'text-slate-900/20'
            )}
          >
            Based on {note?.sources?.length || 0}{' '}
            {(note?.sources?.length || 0) === 1 ? 'source' : 'sources'}
          </div>
        </div>

        {/* Floating Inline Actions (Larger Icons, No Bg) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={() => setIsExpanded(true)}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all group outline-none',
              isDark
                ? 'text-white/40 hover:text-white hover:bg-white/5'
                : 'text-slate-900/40 hover:text-slate-900 hover:bg-black/5'
            )}
            title="Expand to Full Screen"
          >
            <Maximize2 className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed outline-none',
              isDark
                ? 'text-white/40 hover:text-white hover:bg-white/5'
                : 'text-slate-900/40 hover:text-slate-900 hover:bg-black/5'
            )}
            title="Download PNG"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 transition-transform group-hover:scale-110" />
            )}
          </button>
        </div>

        {/* Mindmap Canvas fills the container absolute-wise or via flex */}
        <div className="w-full h-full">
          <MindmapCanvas ref={mindmapRef} root={parsed.content} />
        </div>
      </div>
    );
  }

  // Expanded / Dialog View
  return (
    <DialogPrimitive.Root
      open={isExpanded}
      onOpenChange={(open: boolean) => !open && setIsExpanded(false)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[98vw] h-[95vh] -translate-x-1/2 -translate-y-1/2 rounded-3xl border shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 transition-colors',
            isDark ? 'bg-[#1f2125] border-white/5' : 'bg-white border-black/5'
          )}
        >
          <div className="w-full h-full relative overflow-hidden rounded-[inherit]">
            {/* Header Info */}
            <div className="absolute top-6 left-8 z-50 flex flex-col gap-1">
              <h2
                className={cn(
                  'text-xl font-bold tracking-tight',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                {parsed.title}
              </h2>
              <div
                className={cn(
                  'text-xs font-medium ml-0.5',
                  isDark ? 'text-white/40' : 'text-slate-900/40'
                )}
              >
                Based on {note?.sources?.length || 0}{' '}
                {(note?.sources?.length || 0) === 1 ? 'source' : 'sources'}
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="absolute top-6 right-8 z-50 flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all group',
                  isDark
                    ? 'text-white/40 hover:text-white hover:bg-white/5'
                    : 'text-slate-900/40 hover:text-slate-900 hover:bg-black/5'
                )}
                title="Collapse to View"
              >
                <Minimize2 className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                  isDark
                    ? 'text-white/40 hover:text-white hover:bg-white/5'
                    : 'text-slate-900/40 hover:text-slate-900 hover:bg-black/5'
                )}
                title="Download PNG"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 transition-transform group-hover:scale-110" />
                )}
              </button>
            </div>

            <MindmapCanvas ref={mindmapRef} root={parsed.content} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
