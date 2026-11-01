import Link from 'next/link';
import { LogoIcon } from '@/components/layout/logo';
import { AuthArtPanel } from '@/components/auth/auth-art-panel';

/**
 * AuthLayout implements a fluid, responsive editorial split-stage layout:
 * - Fluid mobile responsiveness: centered card flow on phones and tablets.
 * - Expansive desktop layout: split stage on desktop (1024px+) through ultrawide displays.
 * - Minimal, distraction-free branding with Infera logo and name.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="stage relative min-h-screen w-full overflow-x-hidden isolate bg-[#f5f2ef] dark:bg-background text-foreground transition-colors duration-200 flex flex-col justify-between">
      {/* Decorative right-hand art panel (desktop & large screens) */}
      <AuthArtPanel />

      <div className="relative z-10 flex-1 flex flex-col justify-between">
        {/* Topbar: Clean Brand Identity only */}
        <header className="pt-6 sm:pt-8 md:pt-10 px-5 sm:px-8 md:px-12 lg:pl-20 xl:pl-28 2xl:pl-36">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
            aria-label="Infera home"
          >
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-[#1b1f3b] text-white shadow-xs dark:bg-primary dark:text-primary-foreground">
              <LogoIcon className="size-4 sm:size-4.5" />
            </div>
            <span className="font-serif text-[22px] sm:text-[24px] font-bold tracking-tight text-foreground">
              Infera
            </span>
          </Link>
        </header>

        {/* Main Content Area */}
        <div className="content relative z-10 w-full flex-1 flex items-center px-5 sm:px-8 md:px-12 lg:pl-20 xl:pl-28 2xl:pl-36 lg:pr-12 py-8 sm:py-10 md:py-14 lg:py-16">
          <div className="w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] mx-auto lg:mx-0">
            {children}
          </div>
        </div>

        {/* Bottom subtle spacer to balance layout */}
        <div className="h-4 sm:h-6 pointer-events-none" />
      </div>
    </main>
  );
}
