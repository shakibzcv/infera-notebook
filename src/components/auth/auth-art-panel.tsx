'use client';

import React from 'react';
import Image from 'next/image';

/**
 * AuthArtPanel renders the decorative right-hand artistic panel.
 * - Fluidly responsive across desktop (1024px) up to 4K / ultrawide displays.
 * - Organic layered fluid curved shapes following Infera's brand theme:
 *   - Light mode: Warm signature clay gradient (#d47559 -> #bf5b45 -> #9e432f) with soft translucent rim.
 *   - Dark mode: Deep ember terracotta & warm mahogany clay (#8c3b28 -> #5c2316 -> #38130c) - NO INDIGO.
 * - Themed Research Paper illustration centered cleanly over the fluid backdrop.
 * - Understated editorial text in the bottom right corner.
 */
export function AuthArtPanel() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[46%] lg:w-[48%] xl:w-[50%] 2xl:w-[52%] max-w-[1280px] select-none lg:flex flex-col justify-between overflow-hidden p-8 lg:p-10 xl:p-14 2xl:p-16"
      aria-hidden="true"
    >
      {/* Background Layered Fluid Curved Organic Shape */}
      <svg
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        viewBox="0 0 700 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* Light Mode Gradients: Warm Infera Clay */}
          <linearGradient id="clayFadeLight" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#d97a5e" />
            <stop offset="45%" stopColor="#cb684e" />
            <stop offset="100%" stopColor="#ab4a34" />
          </linearGradient>
          <linearGradient id="clayAuraLight" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#e59079" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d47559" stopOpacity="0.15" />
          </linearGradient>

          {/* Dark Mode Gradients: Deep Ember Terracotta (Pure Infera Clay Theme - No Indigo) */}
          <linearGradient id="clayFadeDark" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#8c3b28" />
            <stop offset="50%" stopColor="#5e2417" />
            <stop offset="100%" stopColor="#38130c" />
          </linearGradient>
          <linearGradient id="clayAuraDark" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#b8573f" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#69281a" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* LIGHT MODE: Secondary Translucent Outer Rim */}
        <path
          className="dark:hidden"
          d="M210 0 C120 140, 140 300, 200 420 C255 540, 225 680, 130 800 C95 840, 105 875, 125 900 L700 900 L700 0 Z"
          fill="url(#clayAuraLight)"
        />
        {/* LIGHT MODE: Main Fluid Curved Organic Shape */}
        <path
          className="dark:hidden"
          d="M260 0 C170 120, 190 280, 245 400 C295 520, 265 660, 175 780 C145 820, 155 865, 175 900 L700 900 L700 0 Z"
          fill="url(#clayFadeLight)"
        />

        {/* DARK MODE: Secondary Translucent Outer Rim (Deep Clay Ember) */}
        <path
          className="hidden dark:block"
          d="M210 0 C120 140, 140 300, 200 420 C255 540, 225 680, 130 800 C95 840, 105 875, 125 900 L700 900 L700 0 Z"
          fill="url(#clayAuraDark)"
        />
        {/* DARK MODE: Main Fluid Curved Organic Shape (Deep Terracotta - No Indigo) */}
        <path
          className="hidden dark:block"
          d="M260 0 C170 120, 190 280, 245 400 C295 520, 265 660, 175 780 C145 820, 155 865, 175 900 L700 900 L700 0 Z"
          fill="url(#clayFadeDark)"
        />
      </svg>

      {/* Top spacer to balance vertical layout */}
      <div className="h-4 pointer-events-none" />

      {/* Floating Centered Themed Research Paper Illustration */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4">
        <div className="relative w-full max-w-[440px] xl:max-w-[500px] 2xl:max-w-[560px] aspect-square transition-transform duration-700 hover:scale-[1.02] p-2">
          <Image
            src="/research-paper-amico.svg"
            alt="Infera Research Workspace"
            width={560}
            height={560}
            priority
            className="h-full w-full object-contain drop-shadow-[0_24px_48px_rgba(27,31,59,0.20)] dark:drop-shadow-[0_24px_48px_rgba(0,0,0,0.65)] filter select-none pointer-events-none"
          />
        </div>
      </div>

      {/* Simple Understated Editorial Text in Bottom Right Corner */}
      <div className="relative z-10 self-end text-right max-w-[340px] xl:max-w-[380px] pb-1">
        <p className="font-serif text-[17px] xl:text-[19px] 2xl:text-[21px] leading-snug text-white dark:text-stone-100 font-medium">
          Turn complex papers into clear insights.
        </p>
        <p className="mt-1 text-[13px] xl:text-[14px] text-white/80 dark:text-stone-300 font-normal">
          Vector-grounded notes & audio overviews
        </p>
      </div>
    </div>
  );
}
