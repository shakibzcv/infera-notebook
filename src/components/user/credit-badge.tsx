'use client';

import { useEffect } from 'react';
import { useNotebookStore } from '@/hooks/use-notebook-store';
import { cn } from '@/lib/utils';

export function CreditBadge({ className }: { className?: string }) {
  const { credits, fetchCredits } = useNotebookStore();

  useEffect(() => {
    fetchCredits();

    // Refresh credits on focus
    const handleFocus = () => fetchCredits();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchCredits]);

  return (
    <span
      className={cn(
        'text-[11px] font-medium text-muted-foreground transition-all duration-300',
        className
      )}
    >
      {credits}&nbsp;&nbsp; <span className="opacity-70 text-[10px]">Credits remaining</span>
    </span>
  );
}
