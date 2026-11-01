'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      toast.success('Password reset successfully!');
      router.push('/sign-in');
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="font-serif text-[42px] sm:text-5xl lg:text-[58px] font-bold tracking-tight text-foreground leading-[1.04]">
            Invalid link
          </h1>
          <p className="mt-2.5 text-base text-muted-foreground max-w-md">
            The password reset link is invalid or has expired.
          </p>
        </div>

        <section className="w-full max-w-[490px] rounded-xl border border-border/80 bg-card p-7 sm:p-8 shadow-[0_24px_48px_-28px_rgba(27,31,59,0.22)]">
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              This security link is no longer valid. If you need to access your account, please sign
              in directly with Google.
            </p>
          </div>

          <Button asChild className="w-full h-11">
            <Link href="/sign-in">Return to Sign In</Link>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-serif text-[42px] sm:text-5xl lg:text-[58px] font-bold tracking-tight text-foreground leading-[1.04]">
          Choose a new password
        </h1>
        <p className="mt-2.5 text-base text-muted-foreground max-w-md">
          Please enter your updated security password below.
        </p>
      </div>

      <section className="w-full max-w-[490px] rounded-xl border border-border/80 bg-card p-7 sm:p-8 shadow-[0_24px_48px_-28px_rgba(27,31,59,0.22),0_2px_6px_-3px_rgba(27,31,59,0.08)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.6)] backdrop-blur-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="h-10"
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/70">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
