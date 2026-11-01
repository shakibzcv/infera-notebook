'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserButtonSimpleTheme } from '@/components/user/user-button-simple-theme';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { CustomTextLogo } from '@/components/layout/logo';
import { UserAvatar } from '@/components/user/user-avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Camera, Ban, Smartphone, Monitor, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { CreditBadge } from '@/components/user/credit-badge';

/**
 * AccountPage component.
 * Allows users to manage their profile (name, image), view active login sessions,
 * and see connected social accounts.
 */
export default function AccountPage() {
  const session = authClient.useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const user = session?.data?.user;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setImage(user.image || '');
    }
  }, [user]);

  /**
   * Fetches the list of active sessions for the current user.
   */
  const fetchSessions = async () => {
    try {
      const { data, error } = await authClient.listSessions();
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  /**
   * Fetches the list of connected social accounts (e.g., Google, Microsoft).
   */
  const fetchAccounts = async () => {
    try {
      const { data, error } = await authClient.listAccounts();
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAccounts();
  }, []);

  if (session.isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setIsUpdating(true);
      await authClient.updateUser({
        name: name.trim(),
        image: image,
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handles profile image selection and upload to Cloudinary.
   * Also updates the user's profile with the new image URL.
   *
   * @param e - React change event from the file input
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);

      // 1. Get presigned upload URL and path
      const response = await fetch('/api/s3/presigned-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: file.type,
          folder: 'profile-images',
          customPath: `profile-images/${user.id}-${Date.now()}.${file.name.split('.').pop()}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, path } = await response.json();

      // 2. Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text().catch(() => '');
        console.error('Avatar upload failed:', uploadRes.status, uploadRes.statusText, errorText);
        throw new Error(`Failed to upload file to S3 (${uploadRes.status})`);
      }

      // 3. Update local state and user record with the path
      setImage(path);

      await authClient.updateUser({
        image: path,
      });

      toast.success('Profile image updated');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRevokeSession = async (token: string) => {
    try {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw error;

      toast.success('Session revoked');
      // Re-fetch sessions to guarantee UI consistency with server state
      await fetchSessions();
    } catch (error) {
      console.error('Revoke session error:', error);
      toast.error('Failed to revoke session');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full bg-background/50 backdrop-blur-md px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex items-center justify-between">
          <CustomTextLogo />
          <div className="flex items-center gap-4">
            <CreditBadge className="hidden sm:flex" />
            <ModeToggle />
            <UserButtonSimpleTheme afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your profile, email, and active sessions.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Sidebar-like labels */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Your public information and avatar.</p>
            </div>

            {/* Profile Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
                <CardDescription>Update your display name and portrait.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="relative">
                    <UserAvatar
                      user={{ name: user.name, image: image }}
                      className="h-24 w-24 ring-2 ring-border ring-offset-2 ring-offset-background"
                      fallbackClassName="text-2xl"
                    />
                    <label
                      htmlFor="image-upload"
                      className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-medium text-lg">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, GIF or PNG. Max size 5MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="grid gap-2 opacity-60">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground italic">
                      Email address cannot be changed for security.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border px-6 py-4">
                <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-3 pt-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <p className="text-sm text-muted-foreground">
                Devices and browsers currently logged in.
              </p>
            </div>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <CardDescription>
                  Review and revoke active sessions on other devices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm italic">
                    No active sessions found.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {sessions.map((sess) => (
                      <div
                        key={sess.token}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {sess.userAgent?.toLowerCase().includes('mobile') ? (
                              <Smartphone className="h-5 w-5" />
                            ) : (
                              <Monitor className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {sess.userAgent?.split(')')[0]?.split('(')[1] || 'Desktop Device'}
                              </p>
                              {sess.id === session.data?.session.id && (
                                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {sess.ipAddress} • {new Date(sess.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {sess.id !== session.data?.session.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 font-semibold text-[11px]"
                              >
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke this session? This device will be
                                  signed out immediately and will lose access to your notebooks
                                  until you sign in again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleRevokeSession(sess.token)}
                                >
                                  Revoke Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-3 pt-4 pb-12">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Connected Accounts</h2>
              <p className="text-sm text-muted-foreground">
                Manage accounts used for social sign-in.
              </p>
            </div>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Social Connections</CardTitle>
                <CardDescription>
                  Link social accounts to your profile for faster logins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Google */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-border">
                        <svg viewBox="0 0 24 24" className="h-5 w-5">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Google</p>
                        {isLoadingAccounts ? (
                          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                        ) : accounts.find((a) => a.providerId === 'google') ? (
                          <p className="text-xs text-green-500 font-medium">Connected</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not connected</p>
                        )}
                      </div>
                    </div>
                    {!isLoadingAccounts && accounts.find((a) => a.providerId === 'google') ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-4 text-xs font-semibold"
                        disabled={isLoadingAccounts}
                      >
                        Link Account
                      </Button>
                    )}
                  </div>

                  {/* Microsoft */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-border overflow-hidden">
                        <svg viewBox="0 0 23 23" className="h-5 w-5">
                          <path d="M1 1h10v10H1z" fill="#f25022" />
                          <path d="M12 1h10v10H12z" fill="#7fbb00" />
                          <path d="M1 12h10v10H1z" fill="#00a1f1" />
                          <path d="M12 12h10v10H12z" fill="#ffb900" />
                        </svg>
                      </div>
                      <div className="opacity-50">
                        <p className="text-sm font-semibold">Microsoft</p>
                        <p className="text-xs text-muted-foreground">Not available right now</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-muted-foreground animate-pulse" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-50">
                        Locked
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
