/**
 * Flash Cards Note View Component
 * Provides an interactive study interface where users can flip through
 * AI-generated question/answer pairs.
 */

import React, { useState } from 'react';
import type { Note } from '@/lib/notes/ui-registry';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FlashCard = {
  front: string;
  back: string;
};

import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Rotate3d } from 'lucide-react';
import { useTheme } from 'next-themes';

const CARD_COLORS_DARK = [
  '#4A4D61', // Muted Slate Blue
  '#41464C', // Charcoal
  '#354341', // Deep Emerald Slate
  '#413A38', // Warm Umber
  '#3B3641', // Dark Plum
  '#343A3E', // Steel
  '#353B34', // Forest Slate
];

const CARD_COLORS_LIGHT = [
  '#F1F5F9', // Slate 100
  '#F8FAFC', // Slate 50
  '#E2E8F0', // Slate 200
  '#F0F4FF', // Blue tint
  '#F5F3FF', // Purple tint
  '#F0FDFA', // Teal tint
  '#FEFCE8', // Yellow tint
];

export const FlashCardsNoteView: React.FC<{ note: Note }> = ({ note }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  let cards: FlashCard[] = [];

  // 1. Data Ingestion
  try {
    const parsed = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
    if (Array.isArray(parsed)) {
      cards = parsed as FlashCard[];
    } else if (parsed && Array.isArray((parsed as any).content)) {
      cards = (parsed as any).content as FlashCard[];
    }
  } catch {
    // Parsing fallback
  }

  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards.length) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        No flash cards available yet.
      </div>
    );
  }

  const current = cards[Math.min(index, cards.length - 1)];
  const cardColor = isDark
    ? CARD_COLORS_DARK[index % CARD_COLORS_DARK.length]
    : CARD_COLORS_LIGHT[index % CARD_COLORS_LIGHT.length];

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full p-6 animate-in fade-in duration-500 overflow-hidden bg-transparent">
      {/* 3D Flip Card Container */}
      <div
        className="relative w-full max-w-[420px] h-[480px] md:h-[540px] [perspective:1200px] group cursor-pointer flex-shrink-0"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="relative w-full h-full [transform-style:preserve-3d]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            mass: 1,
          }}
        >
          {/* Front Side */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full border rounded-[40px] p-8 flex flex-col items-center justify-center text-center shadow-2xl [backface-visibility:hidden] transition-all duration-500',
              isDark ? 'border-white/5' : 'border-black/5 shadow-black/5'
            )}
            style={{ backgroundColor: cardColor }}
          >
            <div className="absolute top-10 left-0 right-0 flex justify-center">
              <span
                className={cn(
                  'text-[11px] font-bold tracking-[2px]',
                  isDark ? 'text-white/40' : 'text-black/40'
                )}
              >
                Question
              </span>
            </div>

            <p
              className={cn(
                'text-xl md:text-2xl font-bold leading-tight tracking-tight px-6',
                isDark ? 'text-white' : 'text-slate-900'
              )}
            >
              {current.front}
            </p>

            <div
              className={cn(
                'absolute bottom-10 flex items-center gap-2 text-[10px] font-bold tracking-wider transition-colors',
                isDark
                  ? 'text-white/30 group-hover:text-white/60'
                  : 'text-black/30 group-hover:text-black/60'
              )}
            >
              <Rotate3d className="w-4 h-4" />
              Click to flip
            </div>
          </div>

          {/* Back Side */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full border rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] transition-all duration-500',
              isDark ? 'border-white/10' : 'border-black/10 shadow-black/5'
            )}
            style={{ backgroundColor: cardColor }}
          >
            <div className="absolute top-10 left-0 right-0 flex justify-center">
              <span
                className={cn(
                  'text-[11px] font-bold tracking-[2px]',
                  isDark ? 'text-primary/80 brightness-150' : 'text-primary/80'
                )}
              >
                Answer
              </span>
            </div>

            <div className="max-h-[60%] overflow-y-auto w-full pr-2 custom-scrollbar">
              <p
                className={cn(
                  'text-lg md:text-xl font-medium leading-relaxed tracking-tight',
                  isDark ? 'text-white/90' : 'text-slate-800'
                )}
              >
                {current.back}
              </p>
            </div>

            <div className="absolute bottom-10 w-full flex justify-center pointer-events-none">
              <span
                className={cn(
                  'text-[11px] font-bold tracking-[1px]',
                  isDark ? 'text-white/20' : 'text-black/20'
                )}
              >
                {index + 1} / {cards.length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Navigation Controls */}
      <div className="mt-10 flex items-center gap-12 shrink-0">
        <button
          onClick={goPrev}
          className={cn(
            'w-14 h-14 rounded-full border flex items-center justify-center transition-all group active:scale-95 shadow-lg',
            isDark
              ? 'border-white/5 bg-white/5 hover:bg-white/10'
              : 'border-black/5 bg-black/5 hover:bg-black/10'
          )}
        >
          <ChevronLeft
            className={cn(
              'w-6 h-6 transition-colors',
              isDark
                ? 'text-white/40 group-hover:text-white'
                : 'text-black/40 group-hover:text-black'
            )}
          />
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-2xl font-black tracking-tighter tabular-nums',
                isDark ? 'text-white' : 'text-slate-900'
              )}
            >
              {index + 1}
            </span>
            <span className={cn('text-sm font-bold', isDark ? 'text-white/20' : 'text-black/20')}>
              /
            </span>
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                isDark ? 'text-white/40' : 'text-black/40'
              )}
            >
              {cards.length}
            </span>
          </div>
          <div
            className={cn(
              'w-32 h-1.5 rounded-full overflow-hidden shadow-inner',
              isDark ? 'bg-white/5' : 'bg-black/5'
            )}
          >
            <motion.div
              className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${((index + 1) / cards.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <button
          onClick={goNext}
          className={cn(
            'w-14 h-14 rounded-full border flex items-center justify-center transition-all group active:scale-95 shadow-lg',
            isDark
              ? 'border-white/5 bg-white/5 hover:bg-white/10'
              : 'border-black/5 bg-black/5 hover:bg-black/10'
          )}
        >
          <ChevronRight
            className={cn(
              'w-6 h-6 transition-colors',
              isDark
                ? 'text-white/40 group-hover:text-white'
                : 'text-black/40 group-hover:text-black'
            )}
          />
        </button>
      </div>
    </div>
  );
};
