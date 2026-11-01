'use client';

import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  /**
   * Preserved Email sign-in handler in codebase for future re-enabling.
   */
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || 'Failed to sign in');
        return;
      }

      toast.success('Signed in successfully!');
      router.push('/notebooks');
      router.refresh();
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Primary Social sign-in handler (Google OAuth).
   */
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/notebooks',
      });
    } catch (error) {
      toast.error('Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] lg:max-w-[480px]">
      {/* Editorial Headline */}
      <h1 className="font-serif text-[34px] sm:text-[46px] md:text-[56px] lg:text-[64px] xl:text-[70px] font-bold tracking-tight text-foreground leading-[1.04] mb-3.5 sm:mb-4 lg:mb-5">
        Welcome back!
      </h1>

      {/* Relevant Description Text */}
      <p className="text-[15px] sm:text-[16px] xl:text-[17px] text-muted-foreground leading-relaxed mb-6 sm:mb-8 lg:mb-9">
        Your intelligent research workspace. Seamlessly synthesize complex documents, explore
        vector-grounded notes, and listen to AI-generated audio overviews.
      </p>

      {/* Primary Action: Borderless Minimal Google Sign-In Button */}
      <div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="flex w-full items-center justify-center gap-3 h-[48px] rounded-[8px] bg-white hover:bg-[#faf8f5] active:bg-[#f2efe9] text-[#1b1f3b] font-medium text-[15px] tracking-[-0.01em] shadow-[0_2px_8px_-2px_rgba(27,31,59,0.12),0_1px_3px_rgba(27,31,59,0.06)] hover:shadow-[0_4px_12px_-2px_rgba(27,31,59,0.18)] transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed dark:bg-card dark:text-foreground dark:hover:bg-accent/80 dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
        >
          {isGoogleLoading ? (
            <Loader2 className="size-4.5 animate-spin text-muted-foreground" />
          ) : (
            <svg
              className="size-[19px] shrink-0"
              viewBox="0 0 256 262"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#4285f4"
                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              />
              <path
                fill="#34a853"
                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              />
              <path
                fill="#fbbc05"
                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
              />
              <path
                fill="#eb4335"
                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              />
            </svg>
          )}
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
}
