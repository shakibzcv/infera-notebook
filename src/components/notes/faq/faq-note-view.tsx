/**
 * FAQ Note View Component
 * Renders Frequently Asked Questions in a clean, interactive accordion interface.
 */

import React from 'react';
import type { SelectedNote } from '@/hooks/use-selected-note';
import { FAQ_NOTE_TYPE } from '@/types/notes';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FaqContent = FAQ_NOTE_TYPE['content'];

export function FaqNoteView({ note }: { note: SelectedNote }) {
  let items: FaqContent = [];
  const rawContent = note?.content;

  // 1. Parse FAQ content from database
  // The content might be a direct array or a JSON-encoded object with a 'content' field.
  if (Array.isArray(rawContent)) {
    items = rawContent as FaqContent;
  } else if (typeof rawContent === 'string' && rawContent.trim()) {
    try {
      const parsed = JSON.parse(rawContent);

      if (Array.isArray(parsed)) {
        items = parsed as FaqContent;
      } else if (parsed && Array.isArray(parsed.content)) {
        // AI generation often returns { title, content: [...] }
        items = parsed.content as FaqContent;
      }
    } catch (error) {
      console.error('[FaqNoteView] Failed to parse FAQ content', error);
    }
  }

  // 2. Fallback UI if no items are found
  if (!items.length) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground">
        No FAQ content available yet.
      </div>
    );
  }

  // 3. Render interactive accordion
  return (
    <div className="mt-4 text-xs text-foreground/80">
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger className="text-left py-4 px-0 transition-all">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="px-0 pt-2 pb-4 text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
