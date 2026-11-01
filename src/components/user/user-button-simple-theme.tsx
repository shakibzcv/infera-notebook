'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, LayoutDashboard, CreditCard } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user/user-avatar';

interface UserButtonSimpleThemeProps {
  afterSignOutUrl?: string;
  appearance?: any; // Kept for compatibility
}

export function UserButtonSimpleTheme({
  afterSignOutUrl = '/sign-in',
}: UserButtonSimpleThemeProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const user = session?.data?.user;

  if (!user) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push(afterSignOutUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="outline-none">
          <UserAvatar
            user={user}
            className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notebooks" className="flex cursor-pointer items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Notebooks</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex cursor-pointer items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Account settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/billing" className="flex cursor-pointer items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
