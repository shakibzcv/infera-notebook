/**
 * Quiz Note View Component
 * Renders an interactive-style preview of quiz questions.
 * Highlights correct answers to show the educational intent of the note.
 */

import React, { useState } from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Lightbulb,
  Info,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/hooks/use-chat-store';

type QuizOption = {
  option: string;
  isCorrect: boolean;
  explanation?: string;
};

type QuizQuestion = {
  question: string;
  options: QuizOption[];
  hint?: string;
};

export const QuizNoteView: React.FC<{ note: SelectedNote }> = ({ note }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});

  let questions: QuizQuestion[] = [];

  // 1. Data Parsing
  try {
    const parsed = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
    if (Array.isArray(parsed)) {
      questions = parsed as QuizQuestion[];
    } else if (parsed && Array.isArray((parsed as any).content)) {
      questions = (parsed as any).content as QuizQuestion[];
    }
  } catch {
    // Fail silently
  }

  if (!questions.length) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        No quiz questions available yet.
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const selectedIdx = answers[currentIndex] ?? null;
  const isAnswered = selectedIdx !== null;
  const showHint = showHints[currentIndex] ?? false;

  const score = Object.entries(answers).reduce((acc, [idx, ansIdx]) => {
    const qIdx = parseInt(idx);
    if (questions[qIdx]?.options[ansIdx]?.isCorrect) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const handleSelect = (idx: number) => {
    if (isAnswered) return;

    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: idx,
    }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev: number) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
    setShowHints({});
  };

  const handleExplain = () => {
    if (selectedIdx === null) return;

    const userOption = currentQuestion.options[selectedIdx].option;
    const correctIdx = currentQuestion.options.findIndex((o) => o.isCorrect);
    const correctOption = currentQuestion.options[correctIdx].option;
    const isActuallyCorrect = selectedIdx === correctIdx;

    const message = `I am taking a quiz on this material and was given this question: '${currentQuestion.question}'
I chose this as the answer: '${userOption}'
That answer was ${isActuallyCorrect ? 'correct' : 'incorrect'}. The correct answer is '${correctOption}'
Help me understand why my answer was ${isActuallyCorrect ? 'correct' : 'incorrect'}.`;

    useChatStore.getState().setPendingMessage(message);
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev: number) => prev - 1);
    }
  };

  if (showResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center p-6 gap-6"
      >
        <div className="flex flex-col gap-2">
          <h2
            className={cn(
              'text-2xl font-bold tracking-tight',
              isDark ? 'text-white' : 'text-slate-900'
            )}
          >
            Quiz complete
          </h2>
          <p className="text-sm text-muted-foreground">
            You scored {score} out of {questions.length}
          </p>
        </div>

        <Button
          onClick={restartQuiz}
          variant="outline"
          className="rounded-full px-8 gap-2 font-medium transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  const correctIdx = currentQuestion.options.findIndex((o) => o.isCorrect);

  return (
    <div className="relative flex flex-col h-full w-full max-w-2xl mx-auto px-2 py-4 md:px-4 md:py-6 animate-in fade-in duration-300">
      {/* Minimal Header */}
      <div className="flex items-center mb-6 opacity-60">
        <div className="text-[10px] font-bold tracking-widest text-muted-foreground tabular-nums">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-start justify-between gap-6 mb-8">
              <h2
                className={cn(
                  'text-lg md:text-xl font-bold tracking-tight leading-tight',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedIdx === i;
                const isCorrect = i === correctIdx;
                const showSuccess = isAnswered && isCorrect;
                const showError = isAnswered && isSelected && !isCorrect;

                return (
                  <motion.button
                    layout
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={isAnswered}
                    className={cn(
                      'group flex flex-col rounded-xl border p-4 text-left transition-all duration-300',
                      !isAnswered &&
                        (isDark
                          ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                          : 'bg-slate-50 border-black/5 hover:bg-slate-100'),
                      showSuccess &&
                        (isDark
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-emerald-50 border-emerald-200'),
                      showError &&
                        (isDark
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : 'bg-rose-50 border-rose-200'),
                      isAnswered && !showSuccess && !showError && 'opacity-30'
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black transition-all',
                          !isAnswered &&
                            (isDark
                              ? 'border-white/10 text-white/40'
                              : 'border-slate-200 text-slate-400'),
                          showSuccess && 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400',
                          showError && 'border-rose-500/40 bg-rose-500/20 text-rose-400'
                        )}
                      >
                        {showSuccess ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : showError ? (
                          <X className="w-3 h-3 stroke-[3]" />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>

                      <span
                        className={cn(
                          'flex-1 text-sm font-medium',
                          isDark ? 'text-white/80' : 'text-slate-800'
                        )}
                      >
                        {opt.option}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isAnswered && (isCorrect || isSelected) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-current/10 w-full"
                        >
                          <div
                            className={cn(
                              'text-[10px] font-bold tracking-wider mb-1',
                              isCorrect ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {isCorrect ? "That's right" : 'Not quite'}
                          </div>
                          <p
                            className={cn(
                              'text-xs leading-relaxed opacity-80',
                              isDark ? 'text-white' : 'text-slate-900'
                            )}
                          >
                            {opt.explanation ||
                              (isCorrect ? 'Correct answer.' : 'Try again next time.')}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {!isAnswered ? (
            currentQuestion.hint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHints((prev) => ({ ...prev, [currentIndex]: !showHint }))}
                className={cn(
                  'rounded-full px-4 gap-2 text-xs font-bold transition-all',
                  showHint
                    ? isDark
                      ? 'text-white bg-white/10'
                      : 'text-slate-900 bg-slate-900/5'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Lightbulb className={cn('w-3.5 h-3.5', showHint && 'fill-current')} />
                {showHint ? 'Hide Hint' : 'Hint'}
              </Button>
            )
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExplain}
              className="rounded-full px-4 gap-2 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explain
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="rounded-full px-4 text-xs font-bold"
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={nextQuestion}
            disabled={!isAnswered}
            className="rounded-full px-6 h-9 text-xs font-bold transition-all active:scale-95"
          >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showHint && !isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-6"
          >
            <div
              className={cn(
                'p-5 rounded-2xl border text-sm leading-relaxed',
                isDark
                  ? 'bg-white/[0.03] border-white/10 text-white/80'
                  : 'bg-slate-50 border-black/5 text-slate-700'
              )}
            >
              <div className="flex items-start gap-3">
                <Lightbulb
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    isDark ? 'text-white/40' : 'text-slate-400'
                  )}
                />
                <p className="italic">{currentQuestion.hint}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
