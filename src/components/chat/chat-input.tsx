'use client';

import * as React from 'react';
import { useLayoutEffect, useRef, useState, createContext, useContext } from 'react';
import { ArrowUp, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FluxASR } from '@/components/asr/flux-asr';
import { CHAT_INPUT_MAX_HEIGHT } from '@/lib/constants';

/* -------------------------------------------------------------------------- */
/* Context */
/* -------------------------------------------------------------------------- */

type ChatInputContextType = {
  value: string;
  setValue: (v: string) => void;
  isLoading: boolean;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  infoMessage?: string;
  onStop?: () => void;
};

const ChatInputContext = createContext<ChatInputContextType | null>(null);

function useChatInput() {
  const ctx = useContext(ChatInputContext);
  if (!ctx) {
    throw new Error('ChatInput components must be used inside <ChatInput />');
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* ChatInput */
/* -------------------------------------------------------------------------- */

export type ChatInputProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  maxHeight?: number | string;
  disabled?: boolean;
  submitDisabled?: boolean;
  className?: string;
  infoMessage?: string;
  onStop?: () => void;
};

export function ChatInput({
  value,
  onValueChange,
  onSubmit,
  isLoading = false,
  maxHeight = CHAT_INPUT_MAX_HEIGHT,
  disabled = false,
  submitDisabled,
  className,
  infoMessage,
  onStop,
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState(value ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resolvedValue = value ?? internalValue;

  const setValue = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  const handleContainerClick = () => {
    if (!disabled) textareaRef.current?.focus();
  };

  const isSubmitDisabled = !isLoading && (submitDisabled ?? disabled ?? !resolvedValue.trim());

  return (
    <TooltipProvider>
      <ChatInputContext.Provider
        value={{
          value: resolvedValue,
          setValue,
          isLoading,
          maxHeight,
          onSubmit,
          disabled,
          submitDisabled: isSubmitDisabled,
          textareaRef,
          infoMessage,
          onStop,
        }}
      >
        <div
          onClick={handleContainerClick}
          className={cn(
            'border-input !bg-transparent dark:!bg-transparent cursor-text rounded-3xl border p-2 shadow-xs',
            disabled && 'cursor-not-allowed opacity-60',
            className
          )}
        >
          <ChatInputTextarea />
          <ChatInputActions />
        </div>
      </ChatInputContext.Provider>
    </TooltipProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* Textarea */
/* -------------------------------------------------------------------------- */

function ChatInputTextarea() {
  const { value, setValue, maxHeight, onSubmit, disabled, textareaRef } = useChatInput();

  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;

    el.style.height = 'auto';
    if (typeof maxHeight === 'number') {
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`;
    }
  };

  useLayoutEffect(() => {
    adjustHeight(textareaRef.current);
  }, [value, maxHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(e.target);
    setValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      rows={1}
      disabled={disabled}
      placeholder="Ask me anything from selected sources..."
      className="text-primary min-h-11 w-full resize-none border-none !bg-transparent dark:!bg-transparent !shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Actions */
/* -------------------------------------------------------------------------- */

function ChatInputActions() {
  const { isLoading, onSubmit, onStop, submitDisabled, infoMessage, value, setValue, disabled } =
    useChatInput();

  const handleButtonClick = () => {
    if (isLoading) {
      onStop?.();
    } else {
      onSubmit?.();
    }
  };

  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex-1 px-2 min-w-0">
        {infoMessage && (
          <p className="text-xs text-muted-foreground truncate animate-fade-in-up">{infoMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <FluxASR
          onTranscript={(text) => {
            setValue(value ? `${value} ${text}` : text);
          }}
          disabled={disabled || isLoading}
        />
        <Tooltip>
          <TooltipTrigger asChild disabled={submitDisabled} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-full shrink-0 transition-all duration-300',
                isLoading
                  ? 'bg-destructive shadow-[0_0_12px_-2px_var(--destructive)] animate-pulse-red hover:bg-destructive/90 text-white'
                  : 'bg-primary hover:shadow-md'
              )}
              onClick={handleButtonClick}
              disabled={submitDisabled}
            >
              <div className="relative size-5 flex items-center justify-center">
                <ArrowUp
                  className={cn(
                    'size-5 absolute transition-all duration-300 transform',
                    isLoading ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
                  )}
                />
                <Square
                  className={cn(
                    'size-4 absolute transition-all duration-300 transform fill-current',
                    isLoading ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
                  )}
                />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isLoading ? 'Stop generation' : 'Send message'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
