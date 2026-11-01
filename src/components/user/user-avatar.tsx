'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePresignedUrl } from '@/hooks/use-presigned-url';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: {
    name?: string | null;
    image?: string | null;
  };
  className?: string;
  fallbackClassName?: string;
}

/**
 * Enhanced Avatar component that handles S3 path resolution.
 * Automatically context-switches between full URLs and object keys.
 */
export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
  const { url, isLoading } = usePresignedUrl(user.image);

  return (
    <Avatar className={cn('relative', className)}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-full animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground opacity-40" />
        </div>
      ) : (
        <AvatarImage src={url || ''} alt={user.name || 'User'} className="object-cover" />
      )}
      <AvatarFallback className={cn('bg-muted text-muted-foreground', fallbackClassName)}>
        {user.name?.charAt(0).toUpperCase() || 'U'}
      </AvatarFallback>
    </Avatar>
  );
}
