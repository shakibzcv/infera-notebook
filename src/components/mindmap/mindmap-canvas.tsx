'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

/* =======================
   TYPES
   ======================= */

export type MindmapNode = {
  id: string;
  label: string;
  expanded: boolean;
  children: MindmapNode[];
};

type Point = { x: number; y: number };

/* =======================
   CONSTANTS
   ======================= */

const NODE_MIN_WIDTH = 260;
const BASE_H_GAP = 450;
const BASE_V_GAP = 48;
const PORT_INSET = 2;
const CURVE_STRENGTH = 0.45;
const ANIM_DURATION = 450;
const CANVAS_SIZE = 20000;
const CANVAS_OFFSET = CANVAS_SIZE / 2;

const DEPTH_COLORS_DARK = [
  '#4A4D61',
  '#41464C',
  '#354341',
  '#413A38',
  '#3B3641',
  '#343A3E',
  '#353B34',
];

const DEPTH_COLORS_LIGHT = [
  '#E0F2FE', // Blue 100
  '#F0F9FF', // Sky 50
  '#DCFCE7', // Green 100
  '#FDF2F8', // Pink 50
  '#F5F3FF', // Purple 50
  '#FEFCE8', // Yellow 50
  '#F0FDFA', // Teal 50
];

const STROKE_COLORS_DARK = DEPTH_COLORS_DARK;

const STROKE_COLORS_LIGHT = [
  '#7DD3FC', // Blue 300
  '#BAE6FD', // Sky 200
  '#86EFAC', // Green 300
  '#F9A8D4', // Pink 300
  '#C4B5FD', // Purple 300
  '#FDE68A', // Yellow 300
  '#5EEAD4', // Teal 300
];

/* =======================
   UTILITIES
   ======================= */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* =======================
   DYNAMIC SPACING
   ======================= */

const verticalGapForDepth = (depth: number) => BASE_V_GAP + depth * 14;

/* =======================
   TREE LAYOUT
   ======================= */

function subtreeHeight(node: MindmapNode, depth = 0): number {
  if (!node.expanded || node.children.length === 0) {
    return 40;
  }

  const vGap = verticalGapForDepth(depth);

  return (
    node.children.reduce((sum, child) => sum + subtreeHeight(child, depth + 1) + vGap, -vGap) || 40
  );
}

function layoutTree(
  node: MindmapNode,
  x: number,
  y: number,
  depth: number,
  result: Record<string, Point & { depth: number }> = {}
) {
  result[node.id] = { x, y, depth };
  if (!node.expanded) return result;

  const vGap = verticalGapForDepth(depth);
  let currentY = y - subtreeHeight(node, depth) / 2;

  for (const child of node.children) {
    const h = subtreeHeight(child, depth + 1);
    const cy = currentY + h / 2;
    layoutTree(child, x + BASE_H_GAP, cy, depth + 1, result);
    currentY += h + vGap;
  }

  return result;
}

/* =======================
   COLLAPSE LOGIC
   ======================= */

function collapseAll(node: MindmapNode): MindmapNode {
  return {
    ...node,
    expanded: false,
    children: node.children.map(collapseAll),
  };
}

function toggleNode(id: string, node: MindmapNode): MindmapNode {
  if (node.id === id) {
    // If collapsing → collapse entire subtree
    if (node.expanded) {
      return collapseAll(node);
    }
    // If expanding → only expand this node
    return { ...node, expanded: true };
  }

  return {
    ...node,
    children: node.children.map((c) => toggleNode(id, c)),
  };
}

/* =======================
   CHECK IF NODE IS VISIBLE
   ======================= */

function isNodeVisible(nodeId: string, tree: MindmapNode): boolean {
  // Root is always visible
  if (nodeId === tree.id) return true;

  // Recursive helper to check if all ancestors are expanded
  function checkPath(node: MindmapNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    if (!node.expanded) return false;

    for (const child of node.children) {
      if (checkPath(child, targetId)) return true;
    }

    return false;
  }

  return checkPath(tree, nodeId);
}

/* =======================
   MAIN COMPONENT
   ======================= */

type MindmapCanvasProps = {
  root: MindmapNode;
};

import { toPng } from 'html-to-image';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export const MindmapCanvas = React.forwardRef<
  { handleDownload: (title: string) => Promise<void> },
  MindmapCanvasProps
>(({ root }, ref) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const depthColors = isDark ? DEPTH_COLORS_DARK : DEPTH_COLORS_LIGHT;
  const strokeColors = isDark ? STROKE_COLORS_DARK : STROKE_COLORS_LIGHT;

  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Use useImperativeHandle to expose the download function
  React.useImperativeHandle(ref, () => ({
    handleDownload: async (title: string) => {
      if (!captureRef.current) return;

      // 1. Calculate the bounding box of all VISIBLE nodes
      const visibleNodes = Object.entries(currLayout.current).filter(([id]) =>
        isNodeVisible(id, tree)
      );

      if (visibleNodes.length === 0) return;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      visibleNodes.forEach(([id, pos]) => {
        const size = nodeSizes[id] || { w: 260, h: 60 };
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + size.w + 40); // +40 for toggle button
        maxY = Math.max(maxY, pos.y + size.h);
      });

      // Add padding
      const padding = 60;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      try {
        const dataUrl = await toPng(captureRef.current, {
          backgroundColor: isDark ? '#1b1d21' : '#f8fafc',
          width: width,
          height: height,
          style: {
            // Shift the capture area so the content starts at (padding, padding)
            transform: `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`,
            transformOrigin: '0 0',
            width: `${width}px`,
            height: `${height}px`,
          },
        });

        const link = document.createElement('a');
        link.download = `${title}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('[MindmapCanvas] PNG capture failed', err);
        throw err;
      }
    },
  }));

  /* -------- Pan / Zoom -------- */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  /* -------- Tree -------- */
  const [tree, setTree] = useState<MindmapNode>(root);

  // Keep internal tree in sync with prop changes
  useEffect(() => {
    setTree(root);
  }, [root]);

  /* -------- Animation -------- */
  const [t, setT] = useState(1);
  const prevLayout = useRef<Record<string, Point & { depth: number }>>({});
  const currLayout = useRef<Record<string, Point & { depth: number }>>({});
  const raf = useRef<number | null>(null);

  /* -------- Node measurement -------- */
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [nodeSizes, setNodeSizes] = useState<Record<string, { w: number; h: number }>>({});

  useLayoutEffect(() => {
    const sizes: typeof nodeSizes = {};
    for (const id in nodeRefs.current) {
      const el = nodeRefs.current[id];
      if (el) {
        sizes[id] = { w: Math.max(el.offsetWidth, NODE_MIN_WIDTH), h: el.offsetHeight };
      }
    }
    setNodeSizes(sizes);
  }, [tree, t]);

  useEffect(() => {
    const nextLayout = layoutTree(tree, 0, 0, 0);
    prevLayout.current = currLayout.current;
    currLayout.current = nextLayout;

    const start = performance.now();
    setT(0);

    const animate = (now: number) => {
      const p = Math.min((now - start) / ANIM_DURATION, 1);
      const eased = p * (2 - p);
      setT(eased);
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [tree]);

  /* -------- Auto-Center on initial load -------- */
  const hasCentered = useRef(false);
  useLayoutEffect(() => {
    if (hasCentered.current) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Wait for valid dimensions

    const rootPos = currLayout.current[tree.id];
    if (rootPos) {
      setPan({
        x: rect.width / 2 - 100,
        y: rect.height / 2,
      });
      hasCentered.current = true;
    }
  }, [tree.id, t]); // Re-run when layout animation starts or tree changes

  /* -------- Helpers -------- */

  const findNode = (node: MindmapNode, id: string): MindmapNode | null => {
    if (node.id === id) return node;
    for (const c of node.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
    return null;
  };

  const findParent = (node: MindmapNode, id: string): MindmapNode | null => {
    for (const c of node.children) {
      if (c.id === id) return node;
      const p = findParent(c, id);
      if (p) return p;
    }
    return null;
  };

  const findCollapseOrigin = (id: string): string | null => {
    const node = findNode(tree, id);
    if (!node) return null;

    let currentId: string | null = id;
    while (currentId) {
      if (currLayout.current[currentId]) return currentId;
      const parent = findParent(tree, currentId);
      currentId = parent?.id || null;
    }

    return null;
  };

  const getPos = (id: string) => {
    const from = prevLayout.current[id];
    const to = currLayout.current[id];

    if (from && to) {
      return {
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t),
        depth: to.depth,
      };
    }

    if (from && !to) {
      const originId = findCollapseOrigin(id);
      const target = originId ? currLayout.current[originId] : from;
      return {
        x: lerp(from.x, target.x, t),
        y: lerp(from.y, target.y, t),
        depth: from.depth,
      };
    }

    if (!from && to) {
      const parent = findParent(tree, id);
      const origin =
        (parent && prevLayout.current[parent.id]) ||
        (parent && currLayout.current[parent.id]) ||
        to;

      return {
        x: lerp(origin.x, to.x, t),
        y: lerp(origin.y, to.y, t),
        depth: to.depth,
      };
    }

    return { x: 0, y: 0, depth: 0 };
  };

  const allIds = new Set([...Object.keys(prevLayout.current), ...Object.keys(currLayout.current)]);

  /* -------- Expand/Collapse All -------- */

  const expandAll = (node: MindmapNode): MindmapNode => ({
    ...node,
    expanded: true,
    children: node.children.map(expandAll),
  });

  const isAllExpanded = (node: MindmapNode): boolean => {
    if (node.children.length === 0) return true;
    return node.expanded && node.children.every(isAllExpanded);
  };

  const handleExpandCollapseAll = () => {
    setTree((tTree) => (isAllExpanded(tTree) ? collapseAll(tTree) : expandAll(tTree)));
  };

  /* -------- Center-Relative Zoom -------- */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(0.1, zoom + delta), 4);

      if (newZoom === zoom) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const pointX = (mouseX - pan.x) / zoom;
      const pointY = (mouseY - pan.y) / zoom;

      const nextPanX = mouseX - pointX * newZoom;
      const nextPanY = mouseY - pointY * newZoom;

      setZoom(newZoom);
      setPan({ x: nextPanX, y: nextPanY });
    },
    [zoom, pan]
  );

  /* =======================
     RENDER
     ======================= */

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent overflow-hidden relative cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={(e) => {
        setIsPanning(true);
        panStart.current = {
          x: e.clientX - pan.x,
          y: e.clientY - pan.y,
        };
      }}
      onMouseMove={(e) => {
        if (!isPanning) return;
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
      }}
      onMouseUp={() => setIsPanning(false)}
      onMouseLeave={() => setIsPanning(false)}
    >
      {/* Control Buttons (Vertical Group) */}
      <div className="absolute bottom-6 right-8 flex flex-col gap-3 z-50">
        <button
          onClick={handleExpandCollapseAll}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xl border group',
            isDark
              ? 'bg-white/5 hover:bg-white/10 border-white/10 backdrop-blur-xl'
              : 'bg-black/5 hover:bg-black/10 border-black/5 backdrop-blur-md'
          )}
          title={isAllExpanded(tree) ? 'Collapse All' : 'Expand All'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDark ? 'white' : '#1e293b'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:scale-110"
          >
            {isAllExpanded(tree) ? (
              <>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            ) : (
              <>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            )}
          </svg>
        </button>

        {/* Zoom Pill */}
        <div
          className={cn(
            'flex flex-col rounded-full border shadow-xl overflow-hidden',
            isDark
              ? 'bg-white/5 border-white/10 backdrop-blur-xl'
              : 'bg-black/5 border-black/5 backdrop-blur-md'
          )}
        >
          <button
            onClick={() => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const pointX = (centerX - pan.x) / zoom;
              const pointY = (centerY - pan.y) / zoom;
              const newZoom = Math.min(zoom + 0.3, 4);
              setPan({ x: centerX - pointX * newZoom, y: centerY - pointY * newZoom });
              setZoom(newZoom);
            }}
            className={cn(
              'w-10 h-10 flex items-center justify-center transition-all border-b group',
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white border-white/5'
                : 'hover:bg-black/10 text-black/70 hover:text-black border-black/5'
            )}
            title="Zoom In"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:scale-110"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const pointX = (centerX - pan.x) / zoom;
              const pointY = (centerY - pan.y) / zoom;
              const newZoom = Math.max(zoom - 0.3, 0.1);
              setPan({ x: centerX - pointX * newZoom, y: centerY - pointY * newZoom });
              setZoom(newZoom);
            }}
            className={cn(
              'w-10 h-10 flex items-center justify-center transition-all group',
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-black/10 text-black/70 hover:text-black'
            )}
            title="Zoom Out"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:scale-110"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={captureRef}
        className="relative w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* EDGES */}
        <svg
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            position: 'absolute',
            left: -CANVAS_OFFSET,
            top: -CANVAS_OFFSET,
            pointerEvents: 'none',
          }}
        >
          {[...allIds].map((id) => {
            const parent = findParent(tree, id);
            if (!parent) return null;

            const p = getPos(parent.id);
            const c = getPos(id);

            const parentSize = nodeSizes[parent.id];
            const childSize = nodeSizes[id];
            if (!parentSize || !childSize) return null;

            // Start from the toggle button center (right of card + 12px gap + 14px button half-width)
            const startX = p.x + parentSize.w + 26;
            const startY = p.y + parentSize.h / 2;
            const endX = c.x;
            const endY = c.y + childSize.h / 2;
            const dx = (endX - startX) * CURVE_STRENGTH;

            const isAnimating = t < 1;
            const parentVisible = isNodeVisible(parent.id, tree);
            const childVisible = isNodeVisible(id, tree);
            const shouldShowEdge = parentVisible && childVisible;

            let opacity = 0.7;
            if (isAnimating) {
              const childInPrev = prevLayout.current[id] !== undefined;
              const childInCurr = currLayout.current[id] !== undefined;
              if (childInPrev && !childInCurr) opacity = 0.7 * (1 - t);
              else if (!childInPrev && childInCurr) opacity = 0.7 * t;
            } else {
              opacity = shouldShowEdge ? 0.7 : 0;
            }

            if (opacity === 0 && !isAnimating) return null;

            const currentNode = findNode(tree, parent.id);
            const isStraight = currentNode ? currentNode.children.length === 1 : false;

            const pathData = isStraight
              ? `M ${startX + CANVAS_OFFSET} ${startY + CANVAS_OFFSET} L ${endX + CANVAS_OFFSET} ${endY + CANVAS_OFFSET}`
              : `M ${startX + CANVAS_OFFSET} ${startY + CANVAS_OFFSET}
                C ${startX + dx + CANVAS_OFFSET} ${startY + CANVAS_OFFSET},
                  ${endX - dx + CANVAS_OFFSET} ${endY + CANVAS_OFFSET},
                  ${endX + CANVAS_OFFSET} ${endY + CANVAS_OFFSET}`;

            return (
              <path
                key={id}
                d={pathData}
                stroke={strokeColors[p.depth % strokeColors.length]}
                strokeWidth={2}
                fill="none"
                opacity={opacity}
              />
            );
          })}
        </svg>

        {/* NODES */}
        {[...allIds].map((id) => {
          const node = findNode(tree, id);
          if (!node) return null;

          const pos = getPos(id);
          const isAnimating = t < 1;
          const isVisible = isNodeVisible(id, tree);
          const shouldRender = isAnimating || isVisible;
          if (!shouldRender) return null;

          const inPrevLayout = prevLayout.current[id] !== undefined;
          const inCurrLayout = currLayout.current[id] !== undefined;

          let opacity = 1;
          if (isAnimating) {
            if (inPrevLayout && !inCurrLayout) opacity = 1 - t;
            else if (!inPrevLayout && inCurrLayout) opacity = t;
          }

          return (
            <div
              key={id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: 20 - pos.depth * 2,
                opacity,
              }}
            >
              <div className="relative flex items-center">
                {/* Visual Card */}
                <div
                  ref={(el) => {
                    nodeRefs.current[id] = el;
                  }}
                  className={cn(
                    'min-w-[260px] max-w-[380px] backdrop-blur-md rounded-lg px-5 py-3 flex items-center gap-3 border shadow-lg hover:brightness-110 transition-all group',
                    isDark ? 'text-white/90 border-white/10' : 'text-slate-900 border-black/5'
                  )}
                  style={{
                    backgroundColor: depthColors[pos.depth % depthColors.length],
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  }}
                >
                  <div className="flex-1 break-words leading-snug font-medium pr-4">
                    {node.label}
                  </div>
                </div>

                {/* Outside Toggle Button - Robust dynamic positioning */}
                {node.children.length > 0 && (
                  <button
                    onClick={() => setTree((tTree) => toggleNode(id, tTree))}
                    className="absolute ml-3 left-full top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-20 border border-white/20 hover:brightness-125 hover:scale-110"
                    style={{
                      backgroundColor: depthColors[pos.depth % depthColors.length],
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDark ? 'white' : '#1e293b'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {node.expanded ? (
                        <polyline points="15 18 9 12 15 6" /> // Left Arrow
                      ) : (
                        <polyline points="9 18 15 12 9 6" /> // Right Arrow
                      )}
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

MindmapCanvas.displayName = 'MindmapCanvas';

export default MindmapCanvas;
