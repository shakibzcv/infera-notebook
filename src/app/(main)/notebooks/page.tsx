'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomTextLogo } from '@/components/layout/logo';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserButtonSimpleTheme } from '@/components/user/user-button-simple-theme';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { Notebook, useNotebookStore } from '@/hooks/use-notebook-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ArrowRight,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

import { CreditBadge } from '@/components/user/credit-badge';

/**
 * NotebooksPage component.
 * The primary dashboard for users to view, search, create, and manage their notebooks.
 * Supports pagination, debounced searching, and CRUD operations for notebook metadata.
 */
function NotebooksPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setNotebooks } = useNotebookStore();

  // From URL
  const pageFromUrl = parseInt(searchParams.get('page') || '1');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serverNotebooks, setServerNotebooks] = useState<Notebook[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [notebookToRename, setNotebookToRename] = useState<Notebook | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 1000);

    return () => clearTimeout(timer);
  }, [localSearch]);

  /**
   * Fetches the user's notebooks from the API with pagination and search.
   *
   * @param page - The current page number to fetch
   * @param query - The search query string
   */
  const fetchNotebooks = useCallback(
    async (page: number, query: string) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/notebooks?page=${page}&q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to load notebooks');
        const data = await res.json();

        const normalized: Notebook[] = (data.notebooks ?? []).map((nb: any) => ({
          ...nb,
          id: nb.id ?? randomId(),
          createdAt: nb.createdAt ? new Date(nb.createdAt) : new Date(),
          updatedAt: nb.updatedAt ? new Date(nb.updatedAt) : new Date(),
          content: nb.content ?? '',
          title: nb.title ?? 'Untitled Notebook',
        }));

        setServerNotebooks(normalized);
        setNotebooks(normalized); // Keep store in sync with current view
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setNotebooks]
  );

  // Handle Fetch triggering
  useEffect(() => {
    fetchNotebooks(pageFromUrl, debouncedSearch);
  }, [pageFromUrl, debouncedSearch, fetchNotebooks]);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    // Reset to page 1 when searching
    if (pageFromUrl !== 1) {
      updateUrl({ page: '1' });
    }
  };

  /**
   * Sends a POST request to create a new notebook.
   * Redirects user to the newly created notebook upon success.
   */
  const createNotebook = async () => {
    try {
      setCreating(true);
      const title = newNotebookName.trim() || `Notebook ${new Date().toLocaleString()}`;
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      const data = await res.json();

      setCreateDialogOpen(false);
      setNewNotebookName('');
      toast.success('Notebook created successfully');

      if (data?.notebook?.id) {
        router.push(`/notebooks/${data.notebook.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create notebook');
    } finally {
      setCreating(false);
    }
  };

  const renameNotebook = async () => {
    if (!notebookToRename) return;
    try {
      setRenaming(true);
      const res = await fetch(`/api/notebooks/${notebookToRename.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename notebook');

      setRenameDialogOpen(false);
      fetchNotebooks(pageFromUrl, debouncedSearch);
      toast.success('Notebook renamed successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to rename notebook');
    } finally {
      setRenaming(false);
    }
  };

  const deleteNotebook = async () => {
    if (!notebookToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/notebooks/${notebookToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete notebook');

      setDeleteAlertOpen(false);
      fetchNotebooks(pageFromUrl, debouncedSearch);
      toast.success('Notebook deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete notebook');
    } finally {
      setDeleting(false);
    }
  };

  const limit = 10;
  const startIndex = (pageFromUrl - 1) * limit + 1;
  const endIndex = Math.min(pageFromUrl * limit, totalCount);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 bg-background/50 backdrop-blur-md sticky top-0 z-50 sm:px-10 lg:px-16">
        <div className="flex items-center gap-3">
          <CustomTextLogo />
        </div>
        <div className="flex items-center gap-4">
          <CreditBadge className="hidden sm:flex" />
          <ModeToggle />
          <UserButtonSimpleTheme afterSignOutUrl="/sign-in" />
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={creating}
                className="h-8 rounded-full bg-primary px-4 text-[11px] font-semibold"
              >
                New Notebook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create notebook</DialogTitle>
                <DialogDescription>Give your notebook a name.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createNotebook();
                }}
                className="space-y-4 pt-4"
              >
                <Input
                  autoFocus
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  placeholder="e.g. Research Project"
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newNotebookName.trim()}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 sm:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Your Notebooks</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage your notebooks and continue where you left off.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notebooks, notes, or chat history..."
              className="pl-10 h-10 border-border bg-muted/30 focus:bg-background transition-all"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="rounded-none bg-transparent overflow-hidden">
            <Table>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i} className="border-0 group">
                      <TableCell className="py-6 pl-6 border-x-0">
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell className="py-6 border-x-0">
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell className="py-6 pr-6 text-right border-x-0">
                        <Skeleton className="ml-auto h-8 w-24 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : serverNotebooks.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell className="py-20 text-center text-muted-foreground text-sm">
                      {debouncedSearch ? (
                        'No matches found for your search.'
                      ) : (
                        <button
                          onClick={() => setCreateDialogOpen(true)}
                          className="group/btn inline-flex items-center gap-2 text-primary hover:underline font-medium transition-all"
                        >
                          Create your first notebook
                          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  serverNotebooks.map((nb) => (
                    <TableRow
                      key={nb.id}
                      className="group hover:bg-muted/30 transition-colors border-0"
                    >
                      <TableCell className="py-5 pl-6 font-medium border-x-0">
                        <Link
                          href={`/notebooks/${nb.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {nb.title}
                        </Link>
                      </TableCell>
                      <TableCell className="py-5 text-muted-foreground text-xs border-x-0">
                        {formatDistanceToNow(new Date(nb.updatedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="py-5 pr-6 text-right border-x-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/notebooks/${nb.id}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>Open</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => {
                                setNotebookToRename(nb);
                                setRenameTitle(nb.title);
                                setRenameDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => {
                                setNotebookToDelete(nb);
                                setDeleteAlertOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? (
                <>
                  Showing <span className="font-medium text-foreground">{startIndex}</span> to{' '}
                  <span className="font-medium text-foreground">{endIndex}</span> of{' '}
                  <span className="font-medium text-foreground">{totalCount}</span> results
                </>
              ) : (
                '0 results'
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={pageFromUrl <= 1}
                onClick={() => updateUrl({ page: (pageFromUrl - 1).toString() })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={pageFromUrl === i + 1 ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-lg text-xs"
                    onClick={() => updateUrl({ page: (i + 1).toString() })}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={pageFromUrl >= totalPages}
                onClick={() => updateUrl({ page: (pageFromUrl + 1).toString() })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename notebook</DialogTitle>
            <DialogDescription>Enter a new name for your notebook.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameNotebook();
            }}
            className="space-y-4 pt-4"
          >
            <Input
              autoFocus
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="e.g. Research Project"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renaming || !renameTitle.trim()}>
                {renaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">"{notebookToDelete?.title}"</span> and
              all its notes, chat history, and sources. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteNotebook();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Notebook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function NotebooksPage() {
  return (
    <Suspense fallback={null}>
      <NotebooksPageContent />
    </Suspense>
  );
}
