import ResetPassword from '@/components/auth/reset-password';
import { Suspense } from 'react';

/**
 * ResetPassword page component.
 * Renders the password reset form within a Suspense boundary to handle potential async initialization.
 */
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPassword />
    </Suspense>
  );
}
